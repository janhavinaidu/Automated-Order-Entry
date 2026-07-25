import pdfParse from 'pdf-parse';
import fs from 'fs';

/**
 * Reads a PDF from disk and extracts all text content.
 * @param filePath - Absolute path to the PDF file
 * @returns Extracted text, trimmed
 */
export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text.trim();
};
