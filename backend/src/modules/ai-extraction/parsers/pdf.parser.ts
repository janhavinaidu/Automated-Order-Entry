import pdfParse from 'pdf-parse';
import fs from 'fs';
import { logger } from '../../../config/logger';

export interface PDFExtractionResult {
  text: string;
  isScanned: boolean;
  pageCount: number;
  confidence: 'high' | 'medium' | 'low';
  hasImages: boolean;
}

/**
 * Reads a PDF from disk and extracts all text content.
 * Detects if PDF is scanned (image-based) vs searchable (text-based).
 * @param filePath - Absolute path to the PDF file
 * @returns Object with extracted text, page count, and scan detection
 */
export const extractTextFromPDF = async (filePath: string): Promise<PDFExtractionResult> => {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    
    const text = data.text.trim();
    const pageCount = data.numpages || 0;
    
    // Detect if scanned: if text is very short (< 50 chars per page average)
    const avgCharsPerPage = pageCount > 0 ? text.length / pageCount : text.length;
    const isScanned = avgCharsPerPage < 50 && text.length < 500;
    
    // Detect if PDF has images (check for embedded images)
    const hasImages = (data as any).version?.includes('Image') || false;
    
    const result: PDFExtractionResult = {
      text,
      isScanned,
      pageCount,
      hasImages,
      confidence: text.length > 500 ? 'high' : text.length > 100 ? 'medium' : 'low',
    };
    
    logger.debug(
      `[PDF] File: ${filePath.split('/').pop()}, Pages: ${pageCount}, Text length: ${text.length}, ` +
      `Scanned: ${isScanned}, Confidence: ${result.confidence}`,
    );
    
    return result;
  } catch (error) {
    logger.error(`[PDF] Error extracting from ${filePath}:`, error);
    throw error;
  }
};
