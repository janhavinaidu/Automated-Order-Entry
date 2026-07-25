import fs from 'fs';
import path from 'path';

/**
 * MIME type map keyed by lowercase file extension.
 */
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

/**
 * Reads an image file from disk and encodes it as a base64 string,
 * along with its inferred MIME type.
 * @param filePath - Absolute path to the image file
 * @returns base64-encoded string and MIME type
 */
export const encodeImageToBase64 = (
  filePath: string,
): { base64: string; mimeType: string } => {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  return {
    base64: buffer.toString('base64'),
    mimeType: MIME_TYPES[ext] ?? 'image/jpeg',
  };
};
