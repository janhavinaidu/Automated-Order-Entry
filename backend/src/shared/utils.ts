import crypto from 'crypto';
import { env } from '../config/env';

// ─── String Utilities ─────────────────────────────────────────────────────────

export const generateOrderNumber = (prefix = env.ORDER_PREFIX): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  const ts = Date.now().toString().slice(-4);
  return `${prefix}-${year}-${random}${ts}`.slice(0, 20);
};

export const generateInvoiceNumber = (prefix = env.INVOICE_PREFIX): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${year}-${random}`;
};

export const getAvatarInitials = (name: string): string => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
};

export const slugify = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// ─── Date Utilities ───────────────────────────────────────────────────────────

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addBusinessDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  let added = 0;
  while (added < days) {
    result = addDays(result, 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
};

export const isDateFeasible = (deliveryDate: Date, leadTimeDays = 3): boolean => {
  const minDate = addBusinessDays(new Date(), leadTimeDays);
  return deliveryDate >= minDate;
};

// ─── Crypto Utilities ─────────────────────────────────────────────────────────

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateSecureToken = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex');

// ─── Number Utilities ─────────────────────────────────────────────────────────

export const roundToTwo = (num: number): number => Math.round(num * 100) / 100;

export const calculateTax = (amount: number, taxRate = env.DEFAULT_TAX_RATE): number =>
  roundToTwo((amount * taxRate) / 100);

export const calculateTotal = (amount: number, taxRate = env.DEFAULT_TAX_RATE): number =>
  roundToTwo(amount + calculateTax(amount, taxRate));

// ─── File Utilities ───────────────────────────────────────────────────────────

export const getFileType = (mimeType: string, filename: string): 'pdf' | 'excel' | 'image' | 'word' | 'unknown' => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    filename.endsWith('.xlsx') ||
    filename.endsWith('.xls')
  )
    return 'excel';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  )
    return 'word';
  return 'unknown';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Object Utilities ─────────────────────────────────────────────────────────

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result;
};

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((k) => {
    if (k in obj) result[k] = obj[k];
  });
  return result;
};
