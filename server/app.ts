import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { extractStructureFromText, generateActivities, logUnobservedAIError, mapAIErrorToHttp } from './ai.js';
import { parseDocxBuffer, parsePdfBuffer, parsePlainText } from './parsers.js';

export const PILOT_LIMITS = {
  uploadBytes: 3 * 1024 * 1024,
  extractedTextCharacters: 500_000,
  generationContentCharacters: 100_000,
  titleCharacters: 200,
  flashcards: 10,
  multipleChoice: 10,
  trueFalse: 10,
  totalActivities: 20,
} as const;

type UploadedKind = 'pdf' | 'docx' | 'txt';

class PublicRequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'PublicRequestError';
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: PILOT_LIMITS.uploadBytes, fields: 2, fieldSize: 8 * 1024 },
});
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(name: string, maximum: number, windowMs = 10 * 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${name}:${req.ip || 'unknown'}`;
    const current = rateBuckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(maximum));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maximum - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > maximum) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, code: 'RATE_LIMITED', error: 'Muitas solicitacoes foram realizadas. Aguarde alguns minutos e tente novamente.' });
    }
    if (rateBuckets.size > 1_000) {
      for (const [bucketKey, value] of rateBuckets) if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }
    next();
  };
}

function basicSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

function getUploadedKind(file: Express.Multer.File): UploadedKind {
  const extension = path.extname(file.originalname).toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  const allowedMimes: Record<UploadedKind, Set<string>> = {
    pdf: new Set(['application/pdf', 'application/octet-stream']),
    docx: new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream']),
    txt: new Set(['text/plain', 'application/octet-stream']),
  };
  const kind = extension === '.pdf' ? 'pdf' : extension === '.docx' ? 'docx' : extension === '.txt' ? 'txt' : null;
  if (!kind || !allowedMimes[kind].has(mime)) throw new PublicRequestError(415, 'UNSUPPORTED_FILE_TYPE', 'Envie somente um arquivo PDF, DOCX ou TXT valido.');
  if (kind === 'pdf' && file.buffer.subarray(0, 1_024).indexOf(Buffer.from('%PDF-')) < 0) {
    throw new PublicRequestError(415, 'INVALID_FILE_SIGNATURE', 'O arquivo enviado nao possui uma assinatura PDF valida.');
  }
  if (kind === 'docx') {
    const signature = file.buffer.subarray(0, 4);
    const isZip = signature[0] === 0x50 && signature[1] === 0x4b && [0x03, 0x05, 0x07].includes(signature[2]);
    const hasDocumentEntries = file.buffer.includes(Buffer.from('[Content_Types].xml')) && file.buffer.includes(Buffer.from('word/'));
    if (!isZip || !hasDocumentEntries) throw new PublicRequestError(415, 'INVALID_FILE_SIGNATURE', 'O arquivo enviado nao possui uma estrutura DOCX valida.');
  }
  if (kind === 'txt') {
    const decoded = file.buffer.toString('utf8');
    if (decoded.includes('\0') || decoded.includes('\uFFFD')) throw new PublicRequestError(415, 'INVALID_TEXT_FILE', 'O arquivo TXT deve conter texto UTF-8 valido.');
  }
  return kind;
}

function ensureTextLimit(text: unknown, maximum: number, label: string): asserts text is string {
  if (typeof text !== 'string') throw new PublicRequestError(400, 'INVALID_TEXT', `${label} deve ser texto valido.`);
  if (text.length > maximum) throw new PublicRequestError(413, 'TEXT_TOO_LARGE', `${label} excede o limite seguro deste piloto. Use um material menor.`);
}

function parseActivityCount(value: unknown, maximum: number, label: string): number {
  const parsed = Number(value ?? 0);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > maximum) throw new PublicRequestError(400, 'INVALID_ACTIVITY_COUNT', `${label} deve ser um numero inteiro entre 0 e ${maximum}.`);
  return parsed;
}

function safeErrorDiagnostics(error: unknown) {
  const candidate = error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown };
  return { name: String(candidate?.name || 'Error'), code: String(candidate?.code || 'UNKNOWN'), status: Number(candidate?.status || candidate?.statusCode) || undefined };
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(basicSecurityHeaders);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.post('/api/materials/extract', rateLimit('extract', 15), upload.single('file'), async (req, res, next) => {
    try {
      const { textInput, title } = req.body;
      if (typeof title === 'string' && title.length > PILOT_LIMITS.titleCharacters) throw new PublicRequestError(400, 'TITLE_TOO_LONG', 'O titulo do material e muito longo.');
      if (req.file) {
        const kind = getUploadedKind(req.file);
        const extracted = kind === 'pdf' ? await parsePdfBuffer(req.file.buffer) : kind === 'docx' ? await parseDocxBuffer(req.file.buffer) : parsePlainText(req.file.buffer.toString('utf8'));
        ensureTextLimit(extracted.text, PILOT_LIMITS.extractedTextCharacters, 'O texto extraido');
        return res.json({ success: true, title: title || req.file.originalname.replace(/\.[^/.]+$/, ''), fileType: kind, ...extracted });
      }
      if (typeof textInput === 'string' && textInput.trim().length > 0) {
        ensureTextLimit(textInput, PILOT_LIMITS.extractedTextCharacters, 'O texto fornecido');
        return res.json({ success: true, title: title || 'Texto Fornecido', fileType: 'text_paste', ...parsePlainText(textInput) });
      }
      throw new PublicRequestError(400, 'MATERIAL_REQUIRED', 'Nenhum arquivo ou texto foi enviado para processamento.');
    } catch (error) { next(error); }
  });

  app.post('/api/ai/structure', rateLimit('structure', 10), async (req, res) => {
    try {
      const { materialTitle, rawText } = req.body;
      ensureTextLimit(rawText, PILOT_LIMITS.extractedTextCharacters, 'O texto fornecido');
      if (rawText.trim().length < 20) throw new PublicRequestError(400, 'TEXT_TOO_SHORT', 'O texto fornecido e muito curto para estruturacao.');
      if (typeof materialTitle === 'string' && materialTitle.length > PILOT_LIMITS.titleCharacters) throw new PublicRequestError(400, 'TITLE_TOO_LONG', 'O titulo do material e muito longo.');
      const result = await extractStructureFromText(materialTitle || 'Material de Estudo', rawText);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof PublicRequestError) return res.status(error.status).json({ success: false, error: error.message, code: error.code });
      logUnobservedAIError(error, 'structure');
      const publicError = mapAIErrorToHttp(error);
      res.status(publicError.status).json({ success: false, error: publicError.message, code: publicError.code });
    }
  });

  app.post('/api/ai/generate', rateLimit('generate', 10), async (req, res) => {
    try {
      const { materialTitle, combinedContent, selectedTopics = [], mode = 'faithful', difficulty = 'auto', flashcardCount, multipleChoiceCount, trueFalseCount } = req.body;
      ensureTextLimit(combinedContent, PILOT_LIMITS.generationContentCharacters, 'O conteudo selecionado');
      if (combinedContent.trim().length === 0) throw new PublicRequestError(400, 'CONTENT_REQUIRED', 'Conteudo de estudo nao selecionado.');
      if (typeof materialTitle === 'string' && materialTitle.length > PILOT_LIMITS.titleCharacters) throw new PublicRequestError(400, 'TITLE_TOO_LONG', 'O titulo do material e muito longo.');
      if (!['faithful', 'complementary'].includes(mode)) throw new PublicRequestError(400, 'INVALID_MODE', 'O modo de estudo informado e invalido.');
      if (!['basic', 'intermediate', 'advanced', 'auto', 'mixed'].includes(difficulty)) throw new PublicRequestError(400, 'INVALID_DIFFICULTY', 'A dificuldade informada e invalida.');
      if (!Array.isArray(selectedTopics) || selectedTopics.length > 8) throw new PublicRequestError(400, 'INVALID_TOPICS', 'Selecione no maximo 8 topicos validos.');
      const counts = {
        flashcardCount: parseActivityCount(flashcardCount, PILOT_LIMITS.flashcards, 'A quantidade de flashcards'),
        multipleChoiceCount: parseActivityCount(multipleChoiceCount, PILOT_LIMITS.multipleChoice, 'A quantidade de questoes de multipla escolha'),
        trueFalseCount: parseActivityCount(trueFalseCount, PILOT_LIMITS.trueFalse, 'A quantidade de questoes de verdadeiro ou falso'),
      };
      if (counts.flashcardCount + counts.multipleChoiceCount + counts.trueFalseCount > PILOT_LIMITS.totalActivities) throw new PublicRequestError(400, 'TOO_MANY_ACTIVITIES', `Solicite no maximo ${PILOT_LIMITS.totalActivities} atividades por sessao.`);
      const safeTopics = selectedTopics.map((topic: unknown) => {
        const candidate = topic as { title?: unknown; summary?: unknown };
        if (typeof candidate?.title !== 'string' || candidate.title.length > 200 || typeof candidate?.summary !== 'string' || candidate.summary.length > 2_000) throw new PublicRequestError(400, 'INVALID_TOPICS', 'Os topicos selecionados possuem formato invalido.');
        return { title: candidate.title, summary: candidate.summary };
      });
      const result = await generateActivities({ materialTitle: materialTitle || 'Material de Estudo', combinedContent, selectedTopics: safeTopics, mode, difficulty, ...counts });
      res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof PublicRequestError) return res.status(error.status).json({ success: false, error: error.message, code: error.code });
      logUnobservedAIError(error, 'generate');
      const publicError = mapAIErrorToHttp(error);
      res.status(publicError.status).json({ success: false, error: publicError.message, code: publicError.code });
    }
  });

  app.all('/api/*', (req, res) => res.status(404).json({ success: false, error: `Endpoint de API nao encontrado: ${req.method} ${req.originalUrl}` }));
  app.use('/api', (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof PublicRequestError) return res.status(error.status).json({ success: false, error: error.message, code: error.code });
    if (error instanceof multer.MulterError) {
      console.warn('[Upload Rejected]:', safeErrorDiagnostics(error));
      const isSizeError = error.code === 'LIMIT_FILE_SIZE';
      return res.status(isSizeError ? 413 : 400).json({ success: false, code: isSizeError ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD', error: isSizeError ? 'O arquivo excede o limite de 3 MB deste piloto.' : 'Nao foi possivel receber o arquivo enviado. Verifique o formato e tente novamente.' });
    }
    console.error('[API Error]:', safeErrorDiagnostics(error));
    const status = (error as { type?: unknown })?.type === 'entity.too.large' ? 413 : 500;
    res.status(status).json({ success: false, code: status === 413 ? 'REQUEST_TOO_LARGE' : 'INTERNAL_ERROR', error: status === 413 ? 'O conteudo enviado excede o limite seguro deste piloto.' : 'Nao foi possivel processar a solicitacao.' });
  });
  return app;
}
