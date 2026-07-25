// ─── OrderPilot AI – Mock Data ───────────────────────────────────────────────

export interface Email {
  id: string;
  from: string;
  company: string;
  avatar: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments: Attachment[];
  status: 'pending' | 'processing' | 'processed' | 'failed';
  aiExtracted?: AIExtraction;
}

export interface Attachment {
  name: string;
  type: 'pdf' | 'excel' | 'image' | 'word';
  size: string;
}

export interface AIExtraction {
  confidence: number;
  customer: string;
  products: ExtractedProduct[];
  deliveryDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  summary: string;
  validationIssues: ValidationIssue[];
}

export interface ExtractedProduct {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  available: number;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  recommendation?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  company: string;
  avatar: string;
  status: 'pending' | 'processing' | 'approved' | 'manufacturing' | 'invoiced' | 'dispatched' | 'rejected';
  amount: number;
  currency: string;
  deliveryDate: string;
  createdAt: string;
  progress: number;
  products: OrderProduct[];
  timeline: TimelineEvent[];
  emailId?: string;
}

export interface OrderProduct {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  inventoryStatus: 'available' | 'partial' | 'unavailable';
  available: number;
}

export interface TimelineEvent {
  step: string;
  label: string;
  status: 'completed' | 'active' | 'pending';
  timestamp?: string;
  note?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  available: number;
  reserved: number;
  total: number;
  reorderLevel: number;
  unit: string;
  status: 'healthy' | 'low' | 'critical';
}

export interface KPIData {
  ordersToday: number;
  ordersProcessing: number;
  revenue: number;
  pendingOrders: number;
  inventoryHealth: number;
}

export interface AIActivity {
  id: string;
  type: 'extraction' | 'validation' | 'order_created' | 'alert';
  message: string;
  timestamp: string;
  confidence?: number;
  status: 'success' | 'warning' | 'error';
}

export interface Notification {
  id: string;
  type: 'order' | 'inventory' | 'ai' | 'dispatch' | 'invoice';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

// ─── KPI ─────────────────────────────────────────────────────────────────────
export const kpiData: KPIData = {
  ordersToday: 24,
  ordersProcessing: 8,
  revenue: 284750,
  pendingOrders: 12,
  inventoryHealth: 87,
};

// ─── Emails ──────────────────────────────────────────────────────────────────
export const emails: Email[] = [
  {
    id: 'em-001',
    from: 'procurement@arctech.io',
    company: 'ArcTech Industries',
    avatar: 'AT',
    subject: 'Urgent: Q3 Component Order – 500 Units Required',
    preview: 'Hi team, we urgently need 500 units of the X200 servo motors for our Q3 production run...',
    body: `Hi OrderPilot Team,

We urgently need to place an order for the following components for our Q3 production schedule. Please process this as high priority.

**Required Items:**
- X200 Servo Motor (500 units)
- P450 Control Board (500 units)
- CX-12 Cable Assembly (1000 units)

Delivery required by: July 25, 2026
Shipping to: 42 Industrial Park, Mumbai 400072

Please confirm availability and dispatch timeline.

Best regards,
Rajesh Sharma
Procurement Manager
ArcTech Industries`,
    receivedAt: '2026-07-06T08:32:00',
    isRead: false,
    hasAttachments: true,
    attachments: [
      { name: 'PO_ArcTech_Q3_2026.pdf', type: 'pdf', size: '284 KB' },
      { name: 'Component_Specs.xlsx', type: 'excel', size: '156 KB' },
    ],
    status: 'pending',
    aiExtracted: {
      confidence: 94,
      customer: 'ArcTech Industries',
      products: [
        { name: 'X200 Servo Motor', sku: 'SRV-X200', quantity: 500, unitPrice: 2450, available: 320 },
        { name: 'P450 Control Board', sku: 'CB-P450', quantity: 500, unitPrice: 1820, available: 500 },
        { name: 'CX-12 Cable Assembly', sku: 'CA-CX12', quantity: 1000, unitPrice: 340, available: 800 },
      ],
      deliveryDate: '2026-07-25',
      priority: 'urgent',
      summary: 'High-priority Q3 production order from ArcTech Industries. 3 products, partial inventory shortfall on X200 Servo Motors (180 units to manufacture). Total order value ₹18.2L.',
      validationIssues: [
        {
          type: 'warning',
          message: 'X200 Servo Motor: Only 320 of 500 units available',
          recommendation: 'Dispatch 320 immediately, trigger manufacturing for remaining 180 units (ETA: 5 days)',
        },
        {
          type: 'info',
          message: 'Delivery date is 19 days from today — feasible',
        },
      ],
    },
  },
  {
    id: 'em-002',
    from: 'orders@nexusmanuf.com',
    company: 'Nexus Manufacturing',
    avatar: 'NM',
    subject: 'Monthly Bulk Order – Fasteners & Connectors',
    preview: 'Please find attached our monthly bulk order for fasteners, connectors, and mounting hardware...',
    body: `Dear Sales Team,

Please find attached our monthly bulk order for the following items. This is our recurring monthly order, reference contract CNT-2025-088.

Items enclosed in the attached Excel sheet.

Delivery by: August 1, 2026
Bill to: Nexus Manufacturing Pvt Ltd, Pune

Regards,
Priya Mehta
Purchase Department`,
    receivedAt: '2026-07-06T07:15:00',
    isRead: false,
    hasAttachments: true,
    attachments: [
      { name: 'Monthly_Order_July2026.xlsx', type: 'excel', size: '98 KB' },
    ],
    status: 'processed',
    aiExtracted: {
      confidence: 91,
      customer: 'Nexus Manufacturing',
      products: [
        { name: 'M8 Stainless Bolt Set', sku: 'BOLT-M8-SS', quantity: 5000, unitPrice: 12, available: 8000 },
        { name: 'Industrial Connector Type-B', sku: 'CON-B-IND', quantity: 2000, unitPrice: 85, available: 2000 },
        { name: 'Mounting Bracket MK3', sku: 'BRK-MK3', quantity: 800, unitPrice: 220, available: 1200 },
      ],
      deliveryDate: '2026-08-01',
      priority: 'medium',
      summary: 'Recurring monthly bulk order from Nexus Manufacturing per contract CNT-2025-088. All stock available. Ready to dispatch.',
      validationIssues: [
        { type: 'info', message: 'Recurring order — customer verified against contract CNT-2025-088' },
      ],
    },
  },
  {
    id: 'em-003',
    from: 'supply@deltaforged.in',
    company: 'Delta Forged Parts',
    avatar: 'DF',
    subject: 'RE: Quotation Acceptance – Hydraulic Cylinders',
    preview: 'We accept the quotation QT-2026-441 for hydraulic cylinders. Please proceed with the order...',
    body: `Hello,

We formally accept quotation QT-2026-441 for the following:

- HC-200 Hydraulic Cylinder: 120 units @ ₹8,500 each
- HC-Seal Kit: 240 units @ ₹450 each

Please raise a formal order confirmation and send invoice to accounts@deltaforged.in

Delivery at our Coimbatore facility by July 30, 2026.

Thanks,
Anand Krishnamurthy
Operations Head`,
    receivedAt: '2026-07-05T16:45:00',
    isRead: true,
    hasAttachments: false,
    attachments: [],
    status: 'processed',
    aiExtracted: {
      confidence: 98,
      customer: 'Delta Forged Parts',
      products: [
        { name: 'HC-200 Hydraulic Cylinder', sku: 'HYD-HC200', quantity: 120, unitPrice: 8500, available: 120 },
        { name: 'HC-Seal Kit', sku: 'HYD-SEAL-KIT', quantity: 240, unitPrice: 450, available: 500 },
      ],
      deliveryDate: '2026-07-30',
      priority: 'high',
      summary: 'Quotation acceptance for hydraulic cylinders per QT-2026-441. All stock available. Invoice to be sent to accounts@deltaforged.in.',
      validationIssues: [],
    },
  },
  {
    id: 'em-004',
    from: 'purchase@globalvolt.com',
    company: 'GlobalVolt Systems',
    avatar: 'GV',
    subject: 'New Order – Switchgear Components (Attached PO)',
    preview: 'Please find our purchase order for switchgear components. This is time sensitive as we have a project...',
    body: `Hi,

Attached is our PO for switchgear components. This is time-sensitive — we have a project commissioning deadline.

PO Number: GV-PO-20260706
Total Value: ~₹12.4L

Please confirm receipt and expected dispatch.

Warm regards,
Sameer Gupta
GlobalVolt Systems`,
    receivedAt: '2026-07-05T11:20:00',
    isRead: true,
    hasAttachments: true,
    attachments: [
      { name: 'GV_PO_20260706.pdf', type: 'pdf', size: '412 KB' },
      { name: 'Technical_Specs.pdf', type: 'pdf', size: '2.1 MB' },
    ],
    status: 'processing',
    aiExtracted: {
      confidence: 87,
      customer: 'GlobalVolt Systems',
      products: [
        { name: 'MCB 32A Triple Pole', sku: 'MCB-32A-3P', quantity: 200, unitPrice: 1850, available: 150 },
        { name: 'RCCB 63A', sku: 'RCCB-63A', quantity: 100, unitPrice: 3200, available: 100 },
        { name: 'Distribution Board 12-way', sku: 'DB-12W', quantity: 50, unitPrice: 4500, available: 60 },
      ],
      deliveryDate: '2026-07-20',
      priority: 'urgent',
      summary: 'Time-sensitive switchgear order from GlobalVolt. Partial shortfall on MCB 32A (50 units). Manufacturing required.',
      validationIssues: [
        {
          type: 'error',
          message: 'MCB 32A Triple Pole: Only 150 of 200 units available',
          recommendation: 'Trigger manufacturing for 50 units. ETA 3 business days. Delivery deadline July 20 is tight.',
        },
      ],
    },
  },
  {
    id: 'em-005',
    from: 'ops@pinnacleengineering.co',
    company: 'Pinnacle Engineering',
    avatar: 'PE',
    subject: 'Sample Order + Quotation Request for New Products',
    preview: 'We would like to place a small sample order and also request quotation for the new product line...',
    body: `Dear Team,

We'd like to:
1. Place a sample order for 10 units of your new CNC-Grade Precision Bearing PB-7
2. Request quotation for 500 units (for Q4 if sample quality is confirmed)

Ship to: Pinnacle Engineering, Hyderabad.

Thanks,
Kavitha Reddy`,
    receivedAt: '2026-07-05T09:10:00',
    isRead: true,
    hasAttachments: false,
    attachments: [],
    status: 'pending',
    aiExtracted: {
      confidence: 79,
      customer: 'Pinnacle Engineering',
      products: [
        { name: 'CNC-Grade Precision Bearing PB-7', sku: 'BRG-PB7', quantity: 10, unitPrice: 3200, available: 45 },
      ],
      deliveryDate: '2026-07-15',
      priority: 'low',
      summary: 'Sample order for 10 precision bearings. Low value but potential Q4 bulk order of 500 units. Stock available.',
      validationIssues: [
        { type: 'info', message: 'This is a sample order — consider adding quotation note for 500-unit Q4 order' },
      ],
    },
  },
  {
    id: 'em-006',
    from: 'imports@meridiangroup.in',
    company: 'Meridian Group',
    avatar: 'MG',
    subject: 'Annual Contract Renewal Order – See Attached',
    preview: 'As per our annual contract renewal, please find the order for Year 2 supplies...',
    body: `Hi,

As per annual contract renewal (Contract ID: MRD-2026-ANN), please process Year 2 order as per attached schedule.

Total approximate value: ₹45L
Payment terms: Net 30

Prashant Joshi
Meridian Group`,
    receivedAt: '2026-07-04T14:30:00',
    isRead: true,
    hasAttachments: true,
    attachments: [
      { name: 'Annual_Order_Schedule.xlsx', type: 'excel', size: '320 KB' },
      { name: 'Contract_MRD-2026-ANN.pdf', type: 'pdf', size: '1.8 MB' },
    ],
    status: 'failed',
    aiExtracted: {
      confidence: 62,
      customer: 'Meridian Group',
      products: [],
      deliveryDate: '',
      priority: 'high',
      summary: 'Annual contract order. Low confidence — Excel contains complex multi-sheet data. Manual review required.',
      validationIssues: [
        {
          type: 'error',
          message: 'Could not parse multi-sheet Excel format. Manual product extraction required.',
          recommendation: 'Download and manually review the attached Excel. Contact customer to resend as simplified format.',
        },
      ],
    },
  },
];

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'OP-2026-1247',
    customer: 'Rajesh Sharma',
    company: 'ArcTech Industries',
    avatar: 'AT',
    status: 'manufacturing',
    amount: 2285000,
    currency: '₹',
    deliveryDate: '2026-07-25',
    createdAt: '2026-07-06T09:15:00',
    progress: 62,
    emailId: 'em-001',
    products: [
      { name: 'X200 Servo Motor', sku: 'SRV-X200', quantity: 500, unitPrice: 2450, total: 1225000, inventoryStatus: 'partial', available: 320 },
      { name: 'P450 Control Board', sku: 'CB-P450', quantity: 500, unitPrice: 1820, total: 910000, inventoryStatus: 'available', available: 500 },
      { name: 'CX-12 Cable Assembly', sku: 'CA-CX12', quantity: 1000, unitPrice: 340, total: 340000, inventoryStatus: 'partial', available: 800 },
    ],
    timeline: [
      { step: '1', label: 'Email Received', status: 'completed', timestamp: '07:32 AM', note: 'ArcTech Industries' },
      { step: '2', label: 'AI Extraction', status: 'completed', timestamp: '07:32 AM', note: '94% confidence' },
      { step: '3', label: 'Validation', status: 'completed', timestamp: '07:33 AM', note: '1 warning resolved' },
      { step: '4', label: 'Order Created', status: 'completed', timestamp: '09:15 AM', note: 'OP-2026-1247' },
      { step: '5', label: 'Inventory Updated', status: 'completed', timestamp: '09:16 AM', note: '320 units reserved' },
      { step: '6', label: 'Manufacturing', status: 'active', note: '180 units – ETA 5 days' },
      { step: '7', label: 'Invoice', status: 'pending' },
      { step: '8', label: 'Dispatch Ready', status: 'pending' },
    ],
  },
  {
    id: 'ord-002',
    orderNumber: 'OP-2026-1246',
    customer: 'Priya Mehta',
    company: 'Nexus Manufacturing',
    avatar: 'NM',
    status: 'invoiced',
    amount: 394000,
    currency: '₹',
    deliveryDate: '2026-08-01',
    createdAt: '2026-07-06T08:00:00',
    progress: 88,
    emailId: 'em-002',
    products: [
      { name: 'M8 Stainless Bolt Set', sku: 'BOLT-M8-SS', quantity: 5000, unitPrice: 12, total: 60000, inventoryStatus: 'available', available: 8000 },
      { name: 'Industrial Connector Type-B', sku: 'CON-B-IND', quantity: 2000, unitPrice: 85, total: 170000, inventoryStatus: 'available', available: 2000 },
      { name: 'Mounting Bracket MK3', sku: 'BRK-MK3', quantity: 800, unitPrice: 220, total: 176000, inventoryStatus: 'available', available: 1200 },
    ],
    timeline: [
      { step: '1', label: 'Email Received', status: 'completed', timestamp: '07:15 AM' },
      { step: '2', label: 'AI Extraction', status: 'completed', timestamp: '07:15 AM', note: '91% confidence' },
      { step: '3', label: 'Validation', status: 'completed', timestamp: '07:16 AM' },
      { step: '4', label: 'Order Created', status: 'completed', timestamp: '08:00 AM' },
      { step: '5', label: 'Inventory Updated', status: 'completed', timestamp: '08:01 AM' },
      { step: '6', label: 'Manufacturing', status: 'completed', timestamp: 'N/A', note: 'Not required' },
      { step: '7', label: 'Invoice', status: 'active', note: 'Invoice #INV-9841 sent' },
      { step: '8', label: 'Dispatch Ready', status: 'pending' },
    ],
  },
  {
    id: 'ord-003',
    orderNumber: 'OP-2026-1245',
    customer: 'Anand Krishnamurthy',
    company: 'Delta Forged Parts',
    avatar: 'DF',
    status: 'approved',
    amount: 1128000,
    currency: '₹',
    deliveryDate: '2026-07-30',
    createdAt: '2026-07-05T17:00:00',
    progress: 45,
    emailId: 'em-003',
    products: [
      { name: 'HC-200 Hydraulic Cylinder', sku: 'HYD-HC200', quantity: 120, unitPrice: 8500, total: 1020000, inventoryStatus: 'available', available: 120 },
      { name: 'HC-Seal Kit', sku: 'HYD-SEAL-KIT', quantity: 240, unitPrice: 450, total: 108000, inventoryStatus: 'available', available: 500 },
    ],
    timeline: [
      { step: '1', label: 'Email Received', status: 'completed', timestamp: '04:45 PM' },
      { step: '2', label: 'AI Extraction', status: 'completed', timestamp: '04:45 PM', note: '98% confidence' },
      { step: '3', label: 'Validation', status: 'completed', timestamp: '04:45 PM', note: 'No issues' },
      { step: '4', label: 'Order Created', status: 'completed', timestamp: '05:00 PM' },
      { step: '5', label: 'Inventory Updated', status: 'active', note: 'Reservation in progress' },
      { step: '6', label: 'Manufacturing', status: 'pending' },
      { step: '7', label: 'Invoice', status: 'pending' },
      { step: '8', label: 'Dispatch Ready', status: 'pending' },
    ],
  },
  {
    id: 'ord-004',
    orderNumber: 'OP-2026-1244',
    customer: 'Sameer Gupta',
    company: 'GlobalVolt Systems',
    avatar: 'GV',
    status: 'processing',
    amount: 1240000,
    currency: '₹',
    deliveryDate: '2026-07-20',
    createdAt: '2026-07-05T12:00:00',
    progress: 28,
    emailId: 'em-004',
    products: [
      { name: 'MCB 32A Triple Pole', sku: 'MCB-32A-3P', quantity: 200, unitPrice: 1850, total: 370000, inventoryStatus: 'partial', available: 150 },
      { name: 'RCCB 63A', sku: 'RCCB-63A', quantity: 100, unitPrice: 3200, total: 320000, inventoryStatus: 'available', available: 100 },
      { name: 'Distribution Board 12-way', sku: 'DB-12W', quantity: 50, unitPrice: 4500, total: 225000, inventoryStatus: 'available', available: 60 },
    ],
    timeline: [
      { step: '1', label: 'Email Received', status: 'completed', timestamp: '11:20 AM' },
      { step: '2', label: 'AI Extraction', status: 'completed', timestamp: '11:20 AM', note: '87% confidence' },
      { step: '3', label: 'Validation', status: 'active', note: '1 critical issue' },
      { step: '4', label: 'Order Created', status: 'pending' },
      { step: '5', label: 'Inventory Updated', status: 'pending' },
      { step: '6', label: 'Manufacturing', status: 'pending' },
      { step: '7', label: 'Invoice', status: 'pending' },
      { step: '8', label: 'Dispatch Ready', status: 'pending' },
    ],
  },
  {
    id: 'ord-005',
    orderNumber: 'OP-2026-1243',
    customer: 'Vikram Patel',
    company: 'SteelCore Industries',
    avatar: 'SC',
    status: 'dispatched',
    amount: 580000,
    currency: '₹',
    deliveryDate: '2026-07-08',
    createdAt: '2026-07-03T10:00:00',
    progress: 100,
    products: [
      { name: 'Structural Steel Beam A-40', sku: 'STL-A40', quantity: 50, unitPrice: 8500, total: 425000, inventoryStatus: 'available', available: 200 },
      { name: 'Weld Connector WC-8', sku: 'WLD-WC8', quantity: 500, unitPrice: 310, total: 155000, inventoryStatus: 'available', available: 800 },
    ],
    timeline: [
      { step: '1', label: 'Email Received', status: 'completed', timestamp: 'Jul 3' },
      { step: '2', label: 'AI Extraction', status: 'completed', timestamp: 'Jul 3' },
      { step: '3', label: 'Validation', status: 'completed', timestamp: 'Jul 3' },
      { step: '4', label: 'Order Created', status: 'completed', timestamp: 'Jul 3' },
      { step: '5', label: 'Inventory Updated', status: 'completed', timestamp: 'Jul 3' },
      { step: '6', label: 'Manufacturing', status: 'completed', timestamp: 'N/A' },
      { step: '7', label: 'Invoice', status: 'completed', timestamp: 'Jul 4' },
      { step: '8', label: 'Dispatch Ready', status: 'completed', timestamp: 'Jul 5', note: 'AWB: DHL-990124' },
    ],
  },
  {
    id: 'ord-006',
    orderNumber: 'OP-2026-1242',
    customer: 'Lakshmi Narayan',
    company: 'PrecisionCraft Ltd',
    avatar: 'PC',
    status: 'pending',
    amount: 320000,
    currency: '₹',
    deliveryDate: '2026-07-28',
    createdAt: '2026-07-06T09:50:00',
    progress: 10,
    products: [
      { name: 'CNC-Grade Precision Bearing PB-7', sku: 'BRG-PB7', quantity: 100, unitPrice: 3200, total: 320000, inventoryStatus: 'available', available: 45 },
    ],
    timeline: [
      { step: '1', label: 'Email Received', status: 'completed', timestamp: '09:50 AM' },
      { step: '2', label: 'AI Extraction', status: 'active', note: 'Processing...' },
      { step: '3', label: 'Validation', status: 'pending' },
      { step: '4', label: 'Order Created', status: 'pending' },
      { step: '5', label: 'Inventory Updated', status: 'pending' },
      { step: '6', label: 'Manufacturing', status: 'pending' },
      { step: '7', label: 'Invoice', status: 'pending' },
      { step: '8', label: 'Dispatch Ready', status: 'pending' },
    ],
  },
];

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventory: InventoryItem[] = [
  { id: 'inv-001', name: 'X200 Servo Motor', sku: 'SRV-X200', category: 'Motors', available: 140, reserved: 320, total: 500, reorderLevel: 100, unit: 'units', status: 'low' },
  { id: 'inv-002', name: 'P450 Control Board', sku: 'CB-P450', category: 'Electronics', available: 200, reserved: 500, total: 800, reorderLevel: 150, unit: 'units', status: 'healthy' },
  { id: 'inv-003', name: 'CX-12 Cable Assembly', sku: 'CA-CX12', category: 'Cables', available: 1200, reserved: 800, total: 2000, reorderLevel: 300, unit: 'units', status: 'healthy' },
  { id: 'inv-004', name: 'M8 Stainless Bolt Set', sku: 'BOLT-M8-SS', category: 'Fasteners', available: 3000, reserved: 5000, total: 8000, reorderLevel: 1000, unit: 'sets', status: 'healthy' },
  { id: 'inv-005', name: 'Industrial Connector Type-B', sku: 'CON-B-IND', category: 'Connectors', available: 400, reserved: 2000, total: 2400, reorderLevel: 200, unit: 'units', status: 'low' },
  { id: 'inv-006', name: 'Mounting Bracket MK3', sku: 'BRK-MK3', category: 'Hardware', available: 850, reserved: 800, total: 1650, reorderLevel: 200, unit: 'units', status: 'healthy' },
  { id: 'inv-007', name: 'HC-200 Hydraulic Cylinder', sku: 'HYD-HC200', category: 'Hydraulics', available: 0, reserved: 120, total: 120, reorderLevel: 20, unit: 'units', status: 'critical' },
  { id: 'inv-008', name: 'HC-Seal Kit', sku: 'HYD-SEAL-KIT', category: 'Hydraulics', available: 260, reserved: 240, total: 500, reorderLevel: 100, unit: 'kits', status: 'healthy' },
  { id: 'inv-009', name: 'MCB 32A Triple Pole', sku: 'MCB-32A-3P', category: 'Switchgear', available: 50, reserved: 200, total: 250, reorderLevel: 50, unit: 'units', status: 'critical' },
  { id: 'inv-010', name: 'RCCB 63A', sku: 'RCCB-63A', category: 'Switchgear', available: 180, reserved: 100, total: 280, reorderLevel: 80, unit: 'units', status: 'healthy' },
  { id: 'inv-011', name: 'Distribution Board 12-way', sku: 'DB-12W', category: 'Switchgear', available: 95, reserved: 50, total: 145, reorderLevel: 20, unit: 'units', status: 'healthy' },
  { id: 'inv-012', name: 'CNC-Grade Precision Bearing PB-7', sku: 'BRG-PB7', category: 'Bearings', available: 35, reserved: 10, total: 45, reorderLevel: 25, unit: 'units', status: 'low' },
  { id: 'inv-013', name: 'Structural Steel Beam A-40', sku: 'STL-A40', category: 'Steel', available: 180, reserved: 0, total: 180, reorderLevel: 30, unit: 'beams', status: 'healthy' },
  { id: 'inv-014', name: 'Weld Connector WC-8', sku: 'WLD-WC8', category: 'Welding', available: 650, reserved: 0, total: 650, reorderLevel: 100, unit: 'units', status: 'healthy' },
  { id: 'inv-015', name: 'Pneumatic Valve PV-12', sku: 'PNM-PV12', category: 'Pneumatics', available: 12, reserved: 40, total: 52, reorderLevel: 15, unit: 'units', status: 'critical' },
];

// ─── AI Activity ──────────────────────────────────────────────────────────────
export const aiActivities: AIActivity[] = [
  { id: 'ai-001', type: 'extraction', message: 'Extracted order from ArcTech Industries email — 3 products, ₹22.8L', timestamp: '09:32 AM', confidence: 94, status: 'success' },
  { id: 'ai-002', type: 'validation', message: 'Validated OP-2026-1246 — All stock available, ready to dispatch', timestamp: '08:01 AM', status: 'success' },
  { id: 'ai-003', type: 'order_created', message: 'Auto-created order OP-2026-1245 from Delta Forged quotation acceptance', timestamp: '07:45 AM', status: 'success' },
  { id: 'ai-004', type: 'alert', message: 'Low confidence extraction for Meridian Group — Manual review required', timestamp: '06:30 AM', confidence: 62, status: 'warning' },
  { id: 'ai-005', type: 'validation', message: 'MCB 32A shortfall detected — Manufacturing trigger recommended', timestamp: 'Yesterday', status: 'warning' },
];

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications: Notification[] = [
  { id: 'notif-001', type: 'order', title: 'New Order Received', message: 'ArcTech Industries placed a ₹22.8L order via email', timestamp: '09:32 AM', isRead: false },
  { id: 'notif-002', type: 'inventory', title: 'Low Stock Alert', message: 'HC-200 Hydraulic Cylinder — 0 units available (120 reserved)', timestamp: '09:00 AM', isRead: false },
  { id: 'notif-003', type: 'inventory', title: 'Critical Stock Alert', message: 'Pneumatic Valve PV-12 — Only 12 available, 40 reserved', timestamp: '08:45 AM', isRead: false },
  { id: 'notif-004', type: 'order', title: 'Order Approved', message: 'OP-2026-1245 approved for Delta Forged Parts', timestamp: '08:30 AM', isRead: true },
  { id: 'notif-005', type: 'invoice', title: 'Invoice Generated', message: 'Invoice #INV-9841 sent to Nexus Manufacturing', timestamp: '08:01 AM', isRead: true },
  { id: 'notif-006', type: 'dispatch', title: 'Dispatch Ready', message: 'OP-2026-1243 dispatched via DHL — AWB: DHL-990124', timestamp: 'Yesterday', isRead: true },
  { id: 'notif-007', type: 'ai', title: 'AI Extraction Failed', message: 'Meridian Group email — Complex Excel format, manual review needed', timestamp: 'Yesterday', isRead: true },
];
