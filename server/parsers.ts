import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  wordCount: number;
}

type PdfErrorCategory =
  | 'WORKER'
  | 'CANVAS_NATIVE'
  | 'FONT'
  | 'IMAGE'
  | 'XREF'
  | 'ENCRYPTION'
  | 'INVALID_PDF'
  | 'FILESYSTEM'
  | 'WASM'
  | 'MEMORY'
  | 'MODULE_RESOLUTION'
  | 'UNKNOWN';

function classifyPdfError(error: unknown): PdfErrorCategory {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  const matches = (...patterns: string[]) => patterns.some((pattern) => message.includes(pattern));

  if (matches('cannot find module', 'module not found', 'err_module_not_found', 'cannot find package')) return 'MODULE_RESOLUTION';
  if (matches('worker', 'workersrc')) return 'WORKER';
  if (matches('canvas', 'dommatrix', 'imagedata', 'path2d')) return 'CANVAS_NATIVE';
  if (matches('font', 'fontface', 'standardfontdata')) return 'FONT';
  if (matches('image', 'jpeg', 'jpx', 'png', 'bitmap')) return 'IMAGE';
  if (matches('xref', 'cross-reference')) return 'XREF';
  if (matches('password', 'encrypt')) return 'ENCRYPTION';
  if (matches('invalidpdf', 'invalid pdf', 'pdf structure', 'formaterror', 'invalid document')) return 'INVALID_PDF';
  if (matches('enoent', 'eacces', 'filesystem', 'readfile', 'no such file')) return 'FILESYSTEM';
  if (matches('wasm', 'webassembly')) return 'WASM';
  if (matches('out of memory', 'enomem', 'allocation failed', 'heap')) return 'MEMORY';
  return 'UNKNOWN';
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const cleanText = (result?.text || '').trim();
    const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    
    // Libera recursos internos do parser se existir método destroy
    if (typeof (parser as any).destroy === 'function') {
      try {
        await (parser as any).destroy();
      } catch {
        // Ignora erros de teardown
      }
    }

    return {
      text: cleanText,
      pageCount: result?.total || result?.pages?.length || undefined,
      wordCount,
    };
  } catch (error) {
    console.error('[PDF Parser Error Category]:', {
      stage: 'PDFParse.getText',
      pdfErrorCategory: classifyPdfError(error),
    });
    throw new Error('Falha ao ler o arquivo PDF. O documento pode estar invalido ou protegido.');
  }
}

export async function parseDocxBuffer(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || '').trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return {
      text,
      wordCount,
    };
  } catch {
    throw new Error('Falha ao ler o arquivo DOCX. O documento pode estar corrompido.');
  }
}

export function parsePlainText(text: string): ExtractedDocument {
  const cleanText = (text || '').trim();
  const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
  return {
    text: cleanText,
    wordCount,
  };
}
