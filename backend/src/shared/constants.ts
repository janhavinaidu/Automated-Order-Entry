// ─── Order Status State Machine ───────────────────────────────────────────────
// Defines which transitions are valid. Enforced at service layer.
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'APPROVED', 'REJECTED'],
  PROCESSING: ['APPROVED', 'REJECTED'],
  APPROVED: ['MANUFACTURING', 'INVOICED', 'REJECTED'],
  MANUFACTURING: ['INVOICED', 'REJECTED'],
  INVOICED: ['DISPATCHED', 'REJECTED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  REJECTED: [],
};

// ─── Order Progress by Status ─────────────────────────────────────────────────
export const ORDER_PROGRESS: Record<string, number> = {
  PENDING: 10,
  PROCESSING: 25,
  APPROVED: 45,
  MANUFACTURING: 62,
  INVOICED: 80,
  DISPATCHED: 95,
  DELIVERED: 100,
  REJECTED: 0,
};

// ─── Order Timeline Steps ─────────────────────────────────────────────────────
export const ORDER_TIMELINE_STEPS = [
  { step: '1', label: 'Email Received' },
  { step: '2', label: 'AI Extraction' },
  { step: '3', label: 'Validation' },
  { step: '4', label: 'Order Created' },
  { step: '5', label: 'Inventory Updated' },
  { step: '6', label: 'Manufacturing' },
  { step: '7', label: 'Invoice' },
  { step: '8', label: 'Dispatch Ready' },
] as const;

// ─── Inventory Thresholds ─────────────────────────────────────────────────────
export const INVENTORY_STATUS_THRESHOLDS = {
  CRITICAL_RATIO: 0.1,  // < 10% available of total → CRITICAL
  LOW_RATIO: 0.25,      // < 25% available of total → LOW
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────
export const VALIDATION = {
  MIN_CONFIDENCE_AUTO_APPROVE: 80,   // Above this, auto-create order
  MIN_CONFIDENCE_PROCESS: 60,        // Below this, mark as FAILED
  MAX_QUANTITY_SANITY_CHECK: 50_000, // Flag quantities above this
  DUPLICATE_ORDER_WINDOW_DAYS: 7,    // Check for duplicates in last N days
  MIN_DELIVERY_LEAD_DAYS: 2,         // Minimum business days for delivery
  PRICE_TOLERANCE_PERCENT: 30,       // Allow ±30% from catalog price
} as const;

// ─── Rate Limits ──────────────────────────────────────────────────────────────
export const RATE_LIMITS = {
  GENERAL: { windowMs: 60_000, max: 100 },
  AUTH: { windowMs: 60_000, max: 10 },
  UPLOAD: { windowMs: 60_000, max: 20 },
} as const;

// ─── BullMQ Queue Names ───────────────────────────────────────────────────────
export const QUEUES = {
  AI_EXTRACTION: 'ai-extraction',
  EMAIL_INGESTION: 'email-ingestion',
  INVOICE_SENDER: 'invoice-sender',
  STOCK_ALERT: 'stock-alert',
} as const;

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  // Server → Client
  EXTRACTION_COMPLETE: 'extraction:complete',
  EXTRACTION_FAILED: 'extraction:failed',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_CREATED: 'order:created',
  INVENTORY_LOW_STOCK: 'inventory:low_stock',
  NOTIFICATION_NEW: 'notification:new',
  DASHBOARD_KPI_UPDATE: 'dashboard:kpi_update',
  // Client → Server
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
} as const;

// ─── User Roles ───────────────────────────────────────────────────────────────
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  INVENTORY: 'INVENTORY',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = keyof typeof USER_ROLES;

// ─── Default Values ───────────────────────────────────────────────────────────
export const DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  CURRENCY: 'INR',
  TAX_RATE: 18,
} as const;
