import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { MaterialTopic, Flashcard, MultipleChoiceQuestion, TrueFalseQuestion, ActivityGenerationResult, StudyMode, StudyDifficulty } from '../src/types.js';

// Centralized AI configuration with dynamic defaults (no hardcoded quota/RPM assumptions)
export const AI_CONFIG = {
  getModel: () => process.env.AI_MODEL || 'gemini-3.7-flash',
  getRequestTimeoutMs: () => readPositiveInteger(process.env.AI_REQUEST_TIMEOUT_MS, 60_000),
  getMaxAttempts: () => readPositiveInteger(process.env.AI_MAX_ATTEMPTS, 3),
  getInitialBackoffMs: () => readPositiveInteger(process.env.AI_RETRY_INITIAL_BACKOFF_MS, 1_200),
};

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class AIRequestTimeoutError extends Error {
  readonly code = 'AI_REQUEST_TIMEOUT';

  constructor(timeoutMs: number) {
    super(`A IA demorou mais de ${Math.ceil(timeoutMs / 1000)} segundos para responder. Tente novamente.`);
    this.name = 'AIRequestTimeoutError';
  }
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não foi configurada nas variáveis de ambiente.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
    });
  }
  return aiClient;
}

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
const TEMPORARY_NETWORK_ERROR_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETDOWN', 'ENETUNREACH']);

function getErrorStatus(error: any): number | undefined {
  const rawStatus = error?.status ?? error?.statusCode ?? error?.response?.status;
  const status = Number(rawStatus);
  return Number.isInteger(status) ? status : undefined;
}

function isAttemptTimeout(error: any): boolean {
  if (error instanceof AIRequestTimeoutError) return true;
  if (getErrorStatus(error) !== undefined) return false;
  const name = String(error?.name || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return name.includes('timeout') || code === 'ETIMEDOUT' || message.includes('timed out') || message.includes('timeout');
}

function isRetryableError(error: any): boolean {
  if (isAttemptTimeout(error)) return false;

  const status = getErrorStatus(error);
  if (status !== undefined) return RETRYABLE_HTTP_STATUSES.has(status);

  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  if (TEMPORARY_NETWORK_ERROR_CODES.has(code)) return true;

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('socket hang up') ||
    message.includes('connection reset') ||
    message.includes('temporary failure')
  );
}

async function executeAttemptWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new AIRequestTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } catch (error: any) {
    if (controller.signal.aborted && !(error instanceof AIRequestTimeoutError)) {
      throw new AIRequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

// Retries only explicit transient HTTP statuses and temporary network failures.
export async function executeWithRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  attempts = AI_CONFIG.getMaxAttempts(),
): Promise<T> {
  const maxAttempts = Math.max(1, attempts);
  const timeoutMs = AI_CONFIG.getRequestTimeoutMs();
  let lastError: any = null;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await executeAttemptWithTimeout(operation, timeoutMs);
    } catch (error: any) {
      lastError = error;
      if (isRetryableError(error) && i < maxAttempts - 1) {
        const delay = AI_CONFIG.getInitialBackoffMs() * Math.pow(2, i) + Math.random() * 400;
        console.warn(`[AI Engine] Erro transitório. Nova tentativa ${i + 2}/${maxAttempts} em ${Math.round(delay)}ms.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Identifica a estrutura básica e tópicos de um documento
 */
export async function extractStructureFromText(
  materialTitle: string,
  rawText: string
): Promise<{ title: string; topics: MaterialTopic[] }> {
  const ai = getAiClient();
  const model = AI_CONFIG.getModel();

  // Limita o preview de texto se for gigantesco para indexação inicial
  const textSample = rawText.length > 50000 ? rawText.substring(0, 50000) + '\n\n[...Texto adicional truncado para indexação inicial...]' : rawText;

  const systemInstruction = `Você é um analista pedagógico neutro e preciso.
Sua função é analisar o texto fornecido pelo usuário e identificar a estrutura real de tópicos e subtópicos existentes no material.
Regras:
1. Seja fiel à organização do texto. Não invente temas ou disciplinas que não existam no conteúdo.
2. Extraia entre 2 a 8 tópicos/seções principais mais representativas.
3. Para cada tópico, forneça:
   - title: título claro do tópico/seção
   - sectionType: 'chapter', 'section', 'topic' ou 'subtopic'
   - summary: breve resumo descritivo de 1 a 2 parágrafos
   - keyConcepts: lista de termos, conceitos, definições ou fórmulas fundamentais presentes nesse trecho
   - excerptContent: um trecho literal ou síntese direta do conteúdo correspondente a esse tópico (para ser usado como base de estudo posterior)
4. Mantenha os nomes e conceitos originais usados pelo autor.`;

  return await executeWithRetry(async (abortSignal) => {
    const response = await ai.models.generateContent({
      model,
      contents: `Título do Material: "${materialTitle}"\n\nTexto do Material:\n${textSample}`,
      config: {
        abortSignal,
        httpOptions: { timeout: AI_CONFIG.getRequestTimeoutMs() },
        systemInstruction,
        temperature: 0.2, // Baixa temperatura para fidelidade
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedTitle: {
              type: Type.STRING,
              description: 'Título identificado ou refinado do material',
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  sectionType: { type: Type.STRING, enum: ['chapter', 'section', 'topic', 'subtopic'] },
                  summary: { type: Type.STRING },
                  keyConcepts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  excerptContent: { type: Type.STRING },
                },
                required: ['title', 'sectionType', 'summary', 'keyConcepts'],
              },
            },
          },
          required: ['topics'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const topics: MaterialTopic[] = (parsed.topics || []).map((t: any, index: number) => ({
      id: `topic-${index + 1}-${Date.now().toString(36)}`,
      title: t.title || `Tópico ${index + 1}`,
      sectionType: t.sectionType || 'topic',
      orderIndex: index + 1,
      summary: t.summary || '',
      keyConcepts: Array.isArray(t.keyConcepts) ? t.keyConcepts : [],
      excerptContent: t.excerptContent || '',
    }));

    return {
      title: parsed.identifiedTitle || materialTitle,
      topics,
    };
  });
}

/**
 * Gera Flashcards, Múltipla Escolha e V/F com base estrita no material selecionado
 */
export async function generateActivities(params: {
  materialTitle: string;
  combinedContent: string;
  selectedTopics: { title: string; summary: string }[];
  mode: StudyMode;
  difficulty: StudyDifficulty;
  flashcardCount: number;
  multipleChoiceCount: number;
  trueFalseCount: number;
}): Promise<ActivityGenerationResult> {
  const {
    materialTitle,
    combinedContent,
    selectedTopics,
    mode,
    difficulty,
    flashcardCount,
    multipleChoiceCount,
    trueFalseCount,
  } = params;

  if (flashcardCount === 0 && multipleChoiceCount === 0 && trueFalseCount === 0) {
    return { flashcards: [], multipleChoiceQuestions: [], trueFalseQuestions: [] };
  }

  const ai = getAiClient();
  const model = AI_CONFIG.getModel();

  const isFaithful = mode === 'faithful';

  const systemInstruction = `Você é um gerador e avaliador pedagógico especializado em aprendizagem ativa.
Sua missão é gerar atividades de estudo (Flashcards, Questões de Múltipla Escolha e Questões Verdadeiro/Falso) com base no material fornecido.

DIRETRIZ DE FIDELIDADE (Modo: ${isFaithful ? 'FIEL AO MATERIAL' : 'COMPLEMENTAR'}):
${
  isFaithful
    ? `- Modo FIEL ATIVADO: Toda informação, pergunta, alternativa correta, distrator plausível, afirmativa e justificativa DEVE ser fundamentada estritamente no conteúdo fornecido em <material_context>.
- É ESTRITAMENTE PROIBIDO inventar fatos, leis, regras, datas ou conceitos que não estejam no texto.
- Toda atividade DEVE conter obrigatoriamente a propriedade "sourceReference" contendo a citação literal ou trecho aproximado do material original onde a resposta se apoia.`
    : `- Modo COMPLEMENTAR ATIVADO: Você pode utilizar conhecimentos externos para contextualizar, mas deve marcar no campo "sourceReference" se a base veio do material ou de conhecimento geral complementar.`
}

DIRETRIZ DE DIFICULDADE (${difficulty}):
- basic: foco em definições diretas, terminologia e conceitos fundamentais.
- intermediate: foco em aplicação prática, comparações e relações de causa/efeito descritas no material.
- advanced: análise crítica, cenários-problema baseados no texto, exceções e interpretação aprofundada.
- auto/mixed: distribuição equilibrada entre compreensão direta e aplicação.

QUALIDADE DAS QUESTÕES:
- Múltipla Escolha: Sempre 4 alternativas (A, B, C, D) com textos claros e plausíveis. Sem alternativas absurdas ou "todas as anteriores". A propriedade "correctOptionId" deve ser estritamente 'A', 'B', 'C' ou 'D'.
- Verdadeiro/Falso: Afirmativas claras, equilibrando afirmativas verdadeiras e falsas convincentes (que testam armadilhas conceituais reais descritas no material), com justificativa objetiva.
- Flashcards: Frente com pergunta/estímulo conciso e Verso com resposta direta e explicativa.`;

  const promptContent = `
<material_info>
Título: ${materialTitle}
Tópicos Selecionados: ${selectedTopics.map((t) => t.title).join(', ')}
</material_info>

<material_context>
${combinedContent}
</material_context>

QUANTIDADES SOLICITADAS:
- Flashcards: ${flashcardCount}
- Questões de Múltipla Escolha: ${multipleChoiceCount}
- Questões de Verdadeiro ou Falso: ${trueFalseCount}

Gere exatamente as quantidades solicitadas acima em conformidade com o schema JSON.`;

  return await executeWithRetry(async (abortSignal) => {
    const response = await ai.models.generateContent({
      model,
      contents: promptContent,
      config: {
        abortSignal,
        httpOptions: { timeout: AI_CONFIG.getRequestTimeoutMs() },
        systemInstruction,
        temperature: isFaithful ? 0.15 : 0.35,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: 'Pergunta ou conceito na frente do card' },
                  back: { type: Type.STRING, description: 'Resposta explicativa no verso' },
                  tip: { type: Type.STRING, description: 'Dica de memorização opcional' },
                  sourceReference: { type: Type.STRING, description: 'Trecho do material que fundamenta o card' },
                },
                required: ['front', 'back', 'sourceReference'],
              },
            },
            multipleChoiceQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  prompt: { type: Type.STRING, description: 'Enunciado da questão' },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
                        text: { type: Type.STRING },
                      },
                      required: ['id', 'text'],
                    },
                  },
                  correctOptionId: { type: Type.STRING, enum: ['A', 'B', 'C', 'D'] },
                  explanation: { type: Type.STRING, description: 'Explicação detalhada do gabarito' },
                  sourceReference: { type: Type.STRING, description: 'Trecho do material original que valida o gabarito' },
                },
                required: ['prompt', 'options', 'correctOptionId', 'explanation', 'sourceReference'],
              },
            },
            trueFalseQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  statement: { type: Type.STRING, description: 'Afirmativa a ser julgada' },
                  isTrue: { type: Type.BOOLEAN, description: 'Gabarito Verdadeiro (true) ou Falso (false)' },
                  justification: { type: Type.STRING, description: 'Por que a afirmativa é verdadeira ou falsa' },
                  sourceReference: { type: Type.STRING, description: 'Trecho do material que fundamenta a resposta' },
                },
                required: ['statement', 'isTrue', 'justification', 'sourceReference'],
              },
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Avisos caso o texto seja curto para a quantidade de questões solicitada',
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    // Validação e normalização de IDs
    const flashcards: Flashcard[] = (parsed.flashcards || []).map((f: any, i: number) => ({
      id: `fc-${i + 1}-${Date.now().toString(36)}`,
      front: f.front || '',
      back: f.back || '',
      tip: f.tip || undefined,
      sourceReference: f.sourceReference || 'Fundamentado no material fornecido.',
    }));

    const multipleChoiceQuestions: MultipleChoiceQuestion[] = (parsed.multipleChoiceQuestions || []).map(
      (q: any, i: number) => {
        const rawOptions = Array.isArray(q.options) ? q.options : [];
        const options = rawOptions.map((opt: any, optIdx: number) => ({
          id: opt.id || ['A', 'B', 'C', 'D'][optIdx] || 'A',
          text: opt.text || '',
        }));

        return {
          id: `mc-${i + 1}-${Date.now().toString(36)}`,
          prompt: q.prompt || '',
          options,
          correctOptionId: q.correctOptionId || 'A',
          explanation: q.explanation || '',
          sourceReference: q.sourceReference || 'Fundamentado no material fornecido.',
        };
      }
    );

    const trueFalseQuestions: TrueFalseQuestion[] = (parsed.trueFalseQuestions || []).map((tf: any, i: number) => ({
      id: `tf-${i + 1}-${Date.now().toString(36)}`,
      statement: tf.statement || '',
      isTrue: typeof tf.isTrue === 'boolean' ? tf.isTrue : true,
      justification: tf.justification || '',
      sourceReference: tf.sourceReference || 'Fundamentado no material fornecido.',
    }));

    return {
      flashcards,
      multipleChoiceQuestions,
      trueFalseQuestions,
      warnings: parsed.warnings || [],
    };
  });
}
