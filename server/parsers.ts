import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  wordCount: number;
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
  } catch {
    console.error('[PDF Parser Error]:', { stage: 'PDFParse.getText' });
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
