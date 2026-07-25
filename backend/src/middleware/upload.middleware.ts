import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { BadRequestError } from '../shared/errors';

// ─── Ensure Upload Directory Exists ──────────────────────────────────────────
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

const attachmentsDir = path.join(env.UPLOAD_DIR, 'attachments');
const invoicesDir = path.join(env.UPLOAD_DIR, 'invoices');

[attachmentsDir, invoicesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Storage Configuration ────────────────────────────────────────────────────
const attachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, attachmentsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ─── File Filter ──────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`File type '${file.mimetype}' is not allowed. Supported: PDF, Excel, Word, images`));
  }
};

// ─── Multer Instances ─────────────────────────────────────────────────────────

export const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES, files: 10 },
  fileFilter,
});

// Re-export directory paths for use in other modules
export const UPLOAD_PATHS = {
  attachments: attachmentsDir,
  invoices: invoicesDir,
};
