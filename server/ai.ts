import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { MaterialTopic, Flashcard, MultipleChoiceQuestion, TrueFalseQuestion, ActivityGenerationResult, StudyMode, StudyDifficulty } from '../src/types.js';

// Centralized AI configuration with dynamic defaults (no hardcoded quota/RPM assumptions)
export const AI_CONFIG = {
  getModel: () => process.env.AI_MODEL || 'gemini-3.7-flash',
  maxRetries: 3,
  initialBackoffMs: 1200,
};

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

// Resilient wrapper with exponential backoff for rate limits (429) and transient errors
async function executeWithRetry<T>(operation: () => Promise<T>, attempts = AI_CONFIG.maxRetries): Promise<T> {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const isTransient = (typeof error?.status === 'number' && error.status >= 500) || error?.message?.includes('fetch failed') || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('high demand');

      if ((isRateLimit || isTransient) && i < attempts - 1) {
        const delay = AI_CONFIG.initialBackoffMs * Math.pow(2, i) + Math.random() * 400;
        console.warn(`[AI Engine] Erro transitório ou limite atingido (${error?.message}). Tentativa ${i + 1}/${attempts} em ${Math.round(delay)}ms...`);
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

  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: `Título do Material: "${materialTitle}"\n\nTexto do Material:\n${textSample}`,
      config: {
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

  return await executeWithRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: promptContent,
      config: {
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
