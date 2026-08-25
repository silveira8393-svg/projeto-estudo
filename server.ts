import 'dotenv/config';
import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { parsePdfBuffer, parseDocxBuffer, parsePlainText } from './server/parsers.js';
import { extractStructureFromText, generateActivities } from './server/ai.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // 1. Extração de texto de arquivo ou texto colado
  app.post('/api/materials/extract', upload.single('file'), async (req, res) => {
    try {
      const { textInput, title } = req.body;

      if (req.file) {
        const mime = req.file.mimetype;
        const originalName = req.file.originalname;
        let extracted;

        if (mime === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
          extracted = await parsePdfBuffer(req.file.buffer);
        } else if (
          mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          originalName.toLowerCase().endsWith('.docx')
        ) {
          extracted = await parseDocxBuffer(req.file.buffer);
        } else {
          // Arquivo de texto puro / TXT / MD
          const raw = req.file.buffer.toString('utf-8');
          extracted = parsePlainText(raw);
        }

        return res.json({
          success: true,
          title: title || originalName.replace(/\.[^/.]+$/, ''),
          fileType: originalName.split('.').pop() || 'file',
          ...extracted,
        });
      }

      if (textInput && typeof textInput === 'string' && textInput.trim().length > 0) {
        const extracted = parsePlainText(textInput);
        return res.json({
          success: true,
          title: title || 'Texto Fornecido',
          fileType: 'text_paste',
          ...extracted,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo ou texto foi enviado para processamento.',
      });
    } catch (error: any) {
      console.error('[Extract Error]:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Falha ao extrair texto do material.',
      });
    }
  });

  // 2. Identificação de estrutura e tópicos com IA
  app.post('/api/ai/structure', async (req, res) => {
    try {
      const { materialTitle, rawText } = req.body;
      if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 20) {
        return res.status(400).json({
          success: false,
          error: 'O texto fornecido é muito curto para estruturação.',
        });
      }

      const result = await extractStructureFromText(materialTitle || 'Material de Estudo', rawText);
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[Structure Error]:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Falha ao identificar estrutura do material com IA.',
      });
    }
  });

  // 3. Geração de Flashcards e Questões fiéis ao material
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const {
        materialTitle,
        combinedContent,
        selectedTopics,
        mode = 'faithful',
        difficulty = 'auto',
        flashcardCount = 0,
        multipleChoiceCount = 0,
        trueFalseCount = 0,
      } = req.body;

      if (!combinedContent || combinedContent.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Conteúdo de estudo não selecionado.',
        });
      }

      const result = await generateActivities({
        materialTitle: materialTitle || 'Material de Estudo',
        combinedContent,
        selectedTopics: selectedTopics || [],
        mode,
        difficulty,
        flashcardCount: Number(flashcardCount) || 0,
        multipleChoiceCount: Number(multipleChoiceCount) || 0,
        trueFalseCount: Number(trueFalseCount) || 0,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[Generate Activities Error]:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Falha ao gerar atividades com a IA.',
      });
    }
  });

  // API 404 catch-all: Garante que nenhuma rota /api/* caia no Vite SPA fallback com HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Endpoint de API não encontrado: ${req.method} ${req.originalUrl}`,
    });
  });

  // API Error handler para capturar erros de upload/body parsing no prefixo /api
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Global Middleware Error]:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Erro interno no servidor ao processar requisição.',
      code: err.code,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor Estudo Ativo] rodando em http://localhost:${PORT}`);
  });
}

startServer();
