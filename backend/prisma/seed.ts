import { PrismaClient, OrderStatus, Priority, InventoryStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── Users ────────────────────────────────────────────────────────────────────
  console.log('Creating users...');
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const operatorHash = await bcrypt.hash('Inventory@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@orderpilot.ai' },
    update: {},
    create: {
      email: 'admin@orderpilot.ai',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash: adminHash,
      avatarInitials: 'AU',
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'inventory@orderpilot.ai' },
    update: {},
    create: {
      email: 'inventory@orderpilot.ai',
      name: 'Inventory Manager',
      role: 'INVENTORY',
      passwordHash: operatorHash,
      avatarInitials: 'IM',
    },
  });

  console.log(`  ✅ Users: admin@orderpilot.ai / Admin@123`);
  console.log(`  ✅ Users: inventory@orderpilot.ai / Inventory@123\n`);

  // ─── Customers ────────────────────────────────────────────────────────────────
  console.log('Creating customers...');

  const customersData = [
    { name: 'Jan Eaton', company: 'BuildWithJan', email: 'buildwithjan@gmail.com', phone: '+91-98765-43210', address: '10 Eaton Tech Center', city: 'Pune', state: 'Maharashtra', pincode: '411014', paymentTerms: 'Net 30', avatar: 'JW' },
    { name: 'Rajesh Sharma', company: 'ArcTech Industries', email: 'procurement@arctech.io', phone: '+91-22-4567-8901', address: '42 Industrial Park', city: 'Mumbai', state: 'Maharashtra', pincode: '400072', paymentTerms: 'Net 30', avatar: 'AT' },
    { name: 'Priya Mehta', company: 'Nexus Manufacturing', email: 'orders@nexusmanuf.com', phone: '+91-20-3456-7890', address: '15 MIDC Area', city: 'Pune', state: 'Maharashtra', pincode: '411019', paymentTerms: 'Net 30', contractRef: 'CNT-2025-088', avatar: 'NM' },
    { name: 'Anand Krishnamurthy', company: 'Delta Forged Parts', email: 'supply@deltaforged.in', phone: '+91-422-345-6789', address: '8 Forge Street', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', avatar: 'DF' },
    { name: 'Sameer Gupta', company: 'GlobalVolt Systems', email: 'purchase@globalvolt.com', phone: '+91-80-2345-6789', address: '22 Tech Park', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', avatar: 'GV' },
    { name: 'Kavitha Reddy', company: 'Pinnacle Engineering', email: 'ops@pinnacleengineering.co', phone: '+91-40-3456-7890', address: '55 Hitech City', city: 'Hyderabad', state: 'Telangana', pincode: '500081', avatar: 'PE' },
    { name: 'Prashant Joshi', company: 'Meridian Group', email: 'imports@meridiangroup.in', phone: '+91-22-5678-9012', address: '100 Trade Centre', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', paymentTerms: 'Net 30', contractRef: 'MRD-2026-ANN', avatar: 'MG' },
    { name: 'Vikram Patel', company: 'SteelCore Industries', email: 'orders@steelcore.in', phone: '+91-265-234-5678', address: '34 GIDC Estate', city: 'Vadodara', state: 'Gujarat', pincode: '390010', avatar: 'SC' },
    { name: 'Lakshmi Narayan', company: 'PrecisionCraft Ltd', email: 'orders@precisioncraft.in', phone: '+91-44-2345-6789', address: '12 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', avatar: 'PC' },
  ];

  const customers: Record<string, string> = {};
  for (const c of customersData) {
    const customer = await prisma.customer.upsert({
      where: { email: c.email },
      update: {},
      create: c,
    });
    customers[c.company] = customer.id;
    console.log(`  ✅ ${c.company}`);
  }

  // ─── Inventory ────────────────────────────────────────────────────────────────
  console.log('\nCreating inventory items...');

  const inventoryItems = [
    { name: 'X200 Servo Motor', sku: 'SRV-X200', category: 'Motors', totalQty: 500, availableQty: 140, reservedQty: 320, reorderLevel: 100, unit: 'units', status: 'LOW' as InventoryStatus },
    { name: 'P450 Control Board', sku: 'CB-P450', category: 'Electronics', totalQty: 800, availableQty: 200, reservedQty: 500, reorderLevel: 150, unit: 'units', status: 'HEALTHY' as InventoryStatus },
    { name: 'CX-12 Cable Assembly', sku: 'CA-CX12', category: 'Cables', totalQty: 2000, availableQty: 1200, reservedQty: 800, reorderLevel: 300, unit: 'units', status: 'HEALTHY' as InventoryStatus },
    { name: 'M8 Stainless Bolt Set', sku: 'BOLT-M8-SS', category: 'Fasteners', totalQty: 8000, availableQty: 3000, reservedQty: 5000, reorderLevel: 1000, unit: 'sets', status: 'HEALTHY' as InventoryStatus },
    { name: 'Industrial Connector Type-B', sku: 'CON-B-IND', category: 'Connectors', totalQty: 2400, availableQty: 400, reservedQty: 2000, reorderLevel: 200, unit: 'units', status: 'LOW' as InventoryStatus },
    { name: 'Mounting Bracket MK3', sku: 'BRK-MK3', category: 'Hardware', totalQty: 1650, availableQty: 850, reservedQty: 800, reorderLevel: 200, unit: 'units', status: 'HEALTHY' as InventoryStatus },
    { name: 'HC-200 Hydraulic Cylinder', sku: 'HYD-HC200', category: 'Hydraulics', totalQty: 120, availableQty: 0, reservedQty: 120, reorderLevel: 20, unit: 'units', status: 'CRITICAL' as InventoryStatus },
    { name: 'HC-Seal Kit', sku: 'HYD-SEAL-KIT', category: 'Hydraulics', totalQty: 500, availableQty: 260, reservedQty: 240, reorderLevel: 100, unit: 'kits', status: 'HEALTHY' as InventoryStatus },
    { name: 'MCB 32A Triple Pole', sku: 'MCB-32A-3P', category: 'Switchgear', totalQty: 250, availableQty: 50, reservedQty: 200, reorderLevel: 50, unit: 'units', status: 'CRITICAL' as InventoryStatus },
    { name: 'RCCB 63A', sku: 'RCCB-63A', category: 'Switchgear', totalQty: 280, availableQty: 180, reservedQty: 100, reorderLevel: 80, unit: 'units', status: 'HEALTHY' as InventoryStatus },
    { name: 'Distribution Board 12-way', sku: 'DB-12W', category: 'Switchgear', totalQty: 145, availableQty: 95, reservedQty: 50, reorderLevel: 20, unit: 'units', status: 'HEALTHY' as InventoryStatus },
    { name: 'CNC-Grade Precision Bearing PB-7', sku: 'BRG-PB7', category: 'Bearings', totalQty: 45, availableQty: 35, reservedQty: 10, reorderLevel: 25, unit: 'units', status: 'LOW' as InventoryStatus },
    { name: 'Structural Steel Beam A-40', sku: 'STL-A40', category: 'Steel', totalQty: 180, availableQty: 180, reservedQty: 0, reorderLevel: 30, unit: 'beams', status: 'HEALTHY' as InventoryStatus },
    { name: 'Weld Connector WC-8', sku: 'WLD-WC8', category: 'Welding', totalQty: 650, availableQty: 650, reservedQty: 0, reorderLevel: 100, unit: 'units', status: 'HEALTHY' as InventoryStatus },
    { name: 'Pneumatic Valve PV-12', sku: 'PNM-PV12', category: 'Pneumatics', totalQty: 52, availableQty: 12, reservedQty: 40, reorderLevel: 15, unit: 'units', status: 'CRITICAL' as InventoryStatus },
  ];

  const inventoryMap: Record<string, string> = {};
  for (const item of inventoryItems) {
    const inv = await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
    inventoryMap[item.sku] = inv.id;
    console.log(`  ✅ ${item.sku} — ${item.name}`);
  }

  // ─── Emails ───────────────────────────────────────────────────────────────────
  console.log('\nCreating sample emails...');

  const emailsData = [
    {
      fromEmail: 'buildwithjan@gmail.com',
      fromName: 'Jan Eaton',
      company: 'BuildWithJan',
      avatar: 'JW',
      subject: 'New Order Request – Servo Motors & Connectors',
      preview: 'Hi team, please supply 10 units of X200 Servo Motors and 50 units of Industrial Connectors...',
      body: `Dear Sales Team,\n\nPlease process a new order for the following items under our standard terms:\n\n- X200 Servo Motor: 10 units\n- Industrial Connector Type-B: 50 units\n\nWe require delivery to our Pune facility by July 28, 2026.\n\nThank you,\nJan Eaton\nBuildWithJan`,
      receivedAt: new Date('2026-07-06T09:10:00'),
      isRead: false,
      hasAttachments: false,
      status: 'PENDING',
      customerId: customers['BuildWithJan'],
      messageId: 'msg-em-007@buildwithjan.com',
    },
    {
      fromEmail: 'procurement@arctech.io',
      fromName: 'Rajesh Sharma',
      company: 'ArcTech Industries',
      avatar: 'AT',
      subject: 'Urgent: Q3 Component Order – 500 Units Required',
      preview: 'Hi team, we urgently need 500 units of the X200 servo motors for our Q3 production run...',
      body: `Hi OrderPilot Team,\n\nWe urgently need to place an order for the following components for our Q3 production schedule. Please process this as high priority.\n\nRequired Items:\n- X200 Servo Motor (500 units)\n- P450 Control Board (500 units)\n- CX-12 Cable Assembly (1000 units)\n\nDelivery required by: July 25, 2026\nShipping to: 42 Industrial Park, Mumbai 400072\n\nPlease confirm availability and dispatch timeline.\n\nBest regards,\nRajesh Sharma\nProcurement Manager\nArcTech Industries`,
      receivedAt: new Date('2026-07-06T08:32:00'),
      isRead: false,
      hasAttachments: true,
      status: 'PROCESSED',
      customerId: customers['ArcTech Industries'],
      messageId: 'msg-em-001@arctech.io',
    },
    {
      fromEmail: 'orders@nexusmanuf.com',
      fromName: 'Priya Mehta',
      company: 'Nexus Manufacturing',
      avatar: 'NM',
      subject: 'Monthly Bulk Order – Fasteners & Connectors',
      preview: 'Please find attached our monthly bulk order for fasteners, connectors, and mounting hardware...',
      body: `Dear Sales Team,\n\nPlease find attached our monthly bulk order for the following items. This is our recurring monthly order, reference contract CNT-2025-088.\n\nItems enclosed in the attached Excel sheet.\n\nDelivery by: August 1, 2026\nBill to: Nexus Manufacturing Pvt Ltd, Pune\n\nRegards,\nPriya Mehta\nPurchase Department`,
      receivedAt: new Date('2026-07-06T07:15:00'),
      isRead: false,
      hasAttachments: true,
      status: 'PROCESSED',
      customerId: customers['Nexus Manufacturing'],
      messageId: 'msg-em-002@nexusmanuf.com',
    },
    {
      fromEmail: 'supply@deltaforged.in',
      fromName: 'Anand Krishnamurthy',
      company: 'Delta Forged Parts',
      avatar: 'DF',
      subject: 'RE: Quotation Acceptance – Hydraulic Cylinders',
      preview: 'We accept the quotation QT-2026-441 for hydraulic cylinders. Please proceed with the order...',
      body: `Hello,\n\nWe formally accept quotation QT-2026-441 for the following:\n\n- HC-200 Hydraulic Cylinder: 120 units @ ₹8,500 each\n- HC-Seal Kit: 240 units @ ₹450 each\n\nPlease raise a formal order confirmation and send invoice to accounts@deltaforged.in\n\nDelivery at our Coimbatore facility by July 30, 2026.\n\nThanks,\nAnand Krishnamurthy\nOperations Head`,
      receivedAt: new Date('2026-07-05T16:45:00'),
      isRead: true,
      hasAttachments: false,
      status: 'PROCESSED',
      customerId: customers['Delta Forged Parts'],
      messageId: 'msg-em-003@deltaforged.in',
    },
    {
      fromEmail: 'purchase@globalvolt.com',
      fromName: 'Sameer Gupta',
      company: 'GlobalVolt Systems',
      avatar: 'GV',
      subject: 'New Order – Switchgear Components (Attached PO)',
      preview: 'Please find our purchase order for switchgear components. This is time sensitive as we have a project...',
      body: `Hi,\n\nAttached is our PO for switchgear components. This is time-sensitive — we have a project commissioning deadline.\n\nPO Number: GV-PO-20260706\nTotal Value: ~₹12.4L\n\nPlease confirm receipt and expected dispatch.\n\nWarm regards,\nSameer Gupta\nGlobalVolt Systems`,
      receivedAt: new Date('2026-07-05T11:20:00'),
      isRead: true,
      hasAttachments: true,
      status: 'PROCESSING',
      customerId: customers['GlobalVolt Systems'],
      messageId: 'msg-em-004@globalvolt.com',
    },
    {
      fromEmail: 'ops@pinnacleengineering.co',
      fromName: 'Kavitha Reddy',
      company: 'Pinnacle Engineering',
      avatar: 'PE',
      subject: 'Sample Order + Quotation Request for New Products',
      preview: 'We would like to place a small sample order and also request quotation for the new product line...',
      body: `Dear Team,\n\nWe'd like to:\n1. Place a sample order for 10 units of your new CNC-Grade Precision Bearing PB-7\n2. Request quotation for 500 units (for Q4 if sample quality is confirmed)\n\nShip to: Pinnacle Engineering, Hyderabad.\n\nThanks,\nKavitha Reddy`,
      receivedAt: new Date('2026-07-05T09:10:00'),
      isRead: true,
      hasAttachments: false,
      status: 'PENDING',
      customerId: customers['Pinnacle Engineering'],
      messageId: 'msg-em-005@pinnacleengineering.co',
    },
    {
      fromEmail: 'imports@meridiangroup.in',
      fromName: 'Prashant Joshi',
      company: 'Meridian Group',
      avatar: 'MG',
      subject: 'Annual Contract Renewal Order – See Attached',
      preview: 'As per our annual contract renewal, please find the order for Year 2 supplies...',
      body: `Hi,\n\nAs per annual contract renewal (Contract ID: MRD-2026-ANN), please process Year 2 order as per attached schedule.\n\nTotal approximate value: ₹45L\nPayment terms: Net 30\n\nPrashant Joshi\nMeridian Group`,
      receivedAt: new Date('2026-07-04T14:30:00'),
      isRead: true,
      hasAttachments: true,
      status: 'FAILED',
      customerId: customers['Meridian Group'],
      messageId: 'msg-em-006@meridiangroup.in',
    },
  ];

  const emailMap: Record<string, string> = {};
  for (const e of emailsData) {
    const email = await prisma.email.upsert({
      where: { messageId: e.messageId },
      update: {},
      create: {
        ...e,
        status: e.status as 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED',
      },
    });
    emailMap[e.company!] = email.id;
    console.log(`  ✅ Email from ${e.company}`);
  }

  // ─── AI Extraction Jobs ───────────────────────────────────────────────────────
  console.log('\nCreating sample AI extraction jobs...');

  const extractionJobsData = [
    {
      company: 'ArcTech Industries',
      status: 'COMPLETED' as const,
      confidence: 94,
      customerName: 'ArcTech Industries',
      deliveryDate: '2026-07-25',
      priority: 'URGENT' as const,
      summary: 'Urgent Q3 component order from ArcTech Industries for 500 units of X200 Servo Motors, 500 units of P450 Control Boards, and 1000 units of CX-12 Cable Assemblies to be delivered by July 25, 2026.',
      modelUsed: 'llama-3.3-70b-versatile',
      products: [
        { name: 'X200 Servo Motor', sku: 'SRV-X200', quantity: 500, unitPrice: 2450, confidence: 94 },
        { name: 'P450 Control Board', sku: 'CB-P450', quantity: 500, unitPrice: 1820, confidence: 94 },
        { name: 'CX-12 Cable Assembly', sku: 'CA-CX12', quantity: 1000, unitPrice: 340, confidence: 94 },
      ],
      issues: [
        { type: 'warning' as const, message: 'CX-12 Cable Assembly: Only 800 of 1000 units available in inventory', recommendation: 'Split dispatch or check production schedule' }
      ]
    },
    {
      company: 'Nexus Manufacturing',
      status: 'COMPLETED' as const,
      confidence: 91,
      customerName: 'Nexus Manufacturing',
      deliveryDate: '2026-08-01',
      priority: 'MEDIUM' as const,
      summary: 'Recurring monthly bulk order for hardware components under contract CNT-2025-088. Includes 5000 sets of M8 Stainless Bolts, 2000 units of Industrial Connector Type-B, and 800 units of Mounting Bracket MK3.',
      modelUsed: 'llama-3.3-70b-versatile',
      products: [
        { name: 'M8 Stainless Bolt Set', sku: 'BOLT-M8-SS', quantity: 5000, unitPrice: 12, confidence: 91 },
        { name: 'Industrial Connector Type-B', sku: 'CON-B-IND', quantity: 2000, unitPrice: 85, confidence: 91 },
        { name: 'Mounting Bracket MK3', sku: 'BRK-MK3', quantity: 800, unitPrice: 220, confidence: 91 },
      ],
      issues: []
    },
    {
      company: 'Delta Forged Parts',
      status: 'COMPLETED' as const,
      confidence: 98,
      customerName: 'Delta Forged Parts',
      deliveryDate: '2026-07-30',
      priority: 'HIGH' as const,
      summary: 'Formal acceptance of quotation QT-2026-441 for 120 units of HC-200 Hydraulic Cylinders and 240 units of HC-Seal Kits for delivery at the Coimbatore facility by July 30, 2026.',
      modelUsed: 'llama-3.3-70b-versatile',
      products: [
        { name: 'HC-200 Hydraulic Cylinder', sku: 'HYD-HC200', quantity: 120, unitPrice: 8500, confidence: 98 },
        { name: 'HC-Seal Kit', sku: 'HYD-SEAL-KIT', quantity: 240, unitPrice: 450, confidence: 98 },
      ],
      issues: []
    },
    {
      company: 'GlobalVolt Systems',
      status: 'COMPLETED' as const,
      confidence: 87,
      customerName: 'GlobalVolt Systems',
      deliveryDate: '2026-07-20',
      priority: 'URGENT' as const,
      summary: 'Time-sensitive purchase order for switchgear components including MCB 32A Triple Pole motors, RCCB 63A components, and Distribution Boards. Subject to project commissioning deadline.',
      modelUsed: 'llama-3.3-70b-versatile',
      products: [
        { name: 'MCB 32A Triple Pole', sku: 'MCB-32A-3P', quantity: 200, unitPrice: 1850, confidence: 87 },
        { name: 'RCCB 63A', sku: 'RCCB-63A', quantity: 100, unitPrice: 3200, confidence: 87 },
        { name: 'Distribution Board 12-way', sku: 'DB-12W', quantity: 50, unitPrice: 4500, confidence: 87 },
      ],
      issues: [
        { type: 'warning' as const, message: 'MCB 32A Triple Pole: Only 150 of 200 units available in inventory', recommendation: 'Manufacture remaining 50 units' }
      ]
    },
    {
      company: 'Pinnacle Engineering',
      status: 'QUEUED' as const,
      confidence: null,
      customerName: null,
      deliveryDate: null,
      priority: null,
      summary: null,
      modelUsed: null,
      products: [],
      issues: []
    },
    {
      company: 'Meridian Group',
      status: 'FAILED' as const,
      confidence: 62,
      customerName: 'Meridian Group',
      deliveryDate: null,
      priority: 'LOW' as const,
      summary: 'Annual contract renewal order (Contract ID: MRD-2026-ANN) for Meridian Group. Approximate value: ₹45L.',
      modelUsed: 'llama-3.3-70b-versatile',
      errorMessage: 'AI Extraction failed: Groq Vision API error: Image size too large or invalid format.',
      products: [],
      issues: [
        { type: 'error' as const, message: 'Groq Vision API error: Image size too large or invalid format.', recommendation: 'Review the source document manually.' }
      ]
    },
    {
      company: 'BuildWithJan',
      status: 'QUEUED' as const,
      confidence: null,
      customerName: null,
      deliveryDate: null,
      priority: null,
      summary: null,
      modelUsed: null,
      products: [],
      issues: []
    }
  ];

  for (const jobData of extractionJobsData) {
    const emailId = emailMap[jobData.company];
    if (!emailId) continue;

    // Check if extraction job already exists
    const existingJob = await prisma.aIExtractionJob.findUnique({ where: { emailId } });
    if (existingJob) continue;

    const rawResponse = jobData.status === 'COMPLETED' ? {
      customer: jobData.customerName,
      deliveryDate: jobData.deliveryDate,
      priority: jobData.priority?.toLowerCase(),
      summary: jobData.summary,
      confidence: jobData.confidence,
      products: jobData.products.map(p => ({ name: p.name, sku: p.sku, quantity: p.quantity, unitPrice: p.unitPrice })),
      issues: jobData.issues.map(i => ({ type: i.type, message: i.message, recommendation: i.recommendation }))
    } : null;

    await prisma.aIExtractionJob.create({
      data: {
        emailId,
        status: jobData.status as any,
        confidence: jobData.confidence,
        customerName: jobData.customerName,
        deliveryDate: jobData.deliveryDate,
        priority: jobData.priority,
        summary: jobData.summary,
        modelUsed: jobData.modelUsed,
        errorMessage: (jobData as any).errorMessage ?? null,
        rawResponse: rawResponse ? JSON.stringify(rawResponse) : null,
        startedAt: new Date(),
        completedAt: new Date(),
        extractedProducts: {
          create: jobData.products.map(p => ({
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            confidence: p.confidence,
          }))
        },
        validationResult: jobData.issues.length > 0 ? {
          create: {
            overallStatus: jobData.issues.some(i => i.type === 'error') ? 'FAIL' : 'WARNING',
            issues: jobData.issues as any,
          }
        } : undefined
      }
    });

    console.log(`  ✅ AI Extraction Job for ${jobData.company} — ${jobData.status}`);
  }

  // ─── Orders ───────────────────────────────────────────────────────────────────
  console.log('\nCreating sample orders...');

  const ordersData = [
    {
      orderNumber: 'OP-2026-1247',
      customerId: customers['ArcTech Industries'],
      emailId: emailMap['ArcTech Industries'],
      status: 'MANUFACTURING' as OrderStatus,
      amount: 2285000,
      currency: 'INR',
      deliveryDate: new Date('2026-07-25'),
      priority: 'URGENT' as Priority,
      progress: 62,
      createdById: operator.id,
      createdAt: new Date('2026-07-06T09:15:00'),
      items: [
        { sku: 'SRV-X200', name: 'X200 Servo Motor', quantity: 500, unitPrice: 2450, total: 1225000, inventoryStatus: 'PARTIAL' as const, availableQty: 320 },
        { sku: 'CB-P450', name: 'P450 Control Board', quantity: 500, unitPrice: 1820, total: 910000, inventoryStatus: 'AVAILABLE' as const, availableQty: 500 },
        { sku: 'CA-CX12', name: 'CX-12 Cable Assembly', quantity: 1000, unitPrice: 340, total: 340000, inventoryStatus: 'PARTIAL' as const, availableQty: 800 },
      ],
      timeline: [
        { step: '1', label: 'Email Received', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T07:32:00'), note: 'ArcTech Industries' },
        { step: '2', label: 'AI Extraction', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T07:32:30'), note: '94% confidence' },
        { step: '3', label: 'Validation', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T07:33:00'), note: '1 warning resolved' },
        { step: '4', label: 'Order Created', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T09:15:00'), note: 'OP-2026-1247' },
        { step: '5', label: 'Inventory Updated', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T09:16:00'), note: '320 units reserved' },
        { step: '6', label: 'Manufacturing', status: 'ACTIVE' as const, note: '180 units – ETA 5 days' },
        { step: '7', label: 'Invoice', status: 'PENDING' as const },
        { step: '8', label: 'Dispatch Ready', status: 'PENDING' as const },
      ],
    },
    {
      orderNumber: 'OP-2026-1246',
      customerId: customers['Nexus Manufacturing'],
      emailId: emailMap['Nexus Manufacturing'],
      status: 'INVOICED' as OrderStatus,
      amount: 394000,
      currency: 'INR',
      deliveryDate: new Date('2026-08-01'),
      priority: 'MEDIUM' as Priority,
      progress: 88,
      createdById: operator.id,
      createdAt: new Date('2026-07-06T08:00:00'),
      items: [
        { sku: 'BOLT-M8-SS', name: 'M8 Stainless Bolt Set', quantity: 5000, unitPrice: 12, total: 60000, inventoryStatus: 'AVAILABLE' as const, availableQty: 8000 },
        { sku: 'CON-B-IND', name: 'Industrial Connector Type-B', quantity: 2000, unitPrice: 85, total: 170000, inventoryStatus: 'AVAILABLE' as const, availableQty: 2000 },
        { sku: 'BRK-MK3', name: 'Mounting Bracket MK3', quantity: 800, unitPrice: 220, total: 176000, inventoryStatus: 'AVAILABLE' as const, availableQty: 1200 },
      ],
      timeline: [
        { step: '1', label: 'Email Received', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T07:15:00') },
        { step: '2', label: 'AI Extraction', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T07:15:30'), note: '91% confidence' },
        { step: '3', label: 'Validation', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T07:16:00') },
        { step: '4', label: 'Order Created', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T08:00:00') },
        { step: '5', label: 'Inventory Updated', status: 'COMPLETED' as const, timestamp: new Date('2026-07-06T08:01:00') },
        { step: '6', label: 'Manufacturing', status: 'COMPLETED' as const, note: 'Not required' },
        { step: '7', label: 'Invoice', status: 'ACTIVE' as const, note: 'Invoice #INV-2026-9841 sent' },
        { step: '8', label: 'Dispatch Ready', status: 'PENDING' as const },
      ],
    },
    {
      orderNumber: 'OP-2026-1245',
      customerId: customers['Delta Forged Parts'],
      emailId: emailMap['Delta Forged Parts'],
      status: 'APPROVED' as OrderStatus,
      amount: 1128000,
      currency: 'INR',
      deliveryDate: new Date('2026-07-30'),
      priority: 'HIGH' as Priority,
      progress: 45,
      createdById: operator.id,
      createdAt: new Date('2026-07-05T17:00:00'),
      items: [
        { sku: 'HYD-HC200', name: 'HC-200 Hydraulic Cylinder', quantity: 120, unitPrice: 8500, total: 1020000, inventoryStatus: 'AVAILABLE' as const, availableQty: 120 },
        { sku: 'HYD-SEAL-KIT', name: 'HC-Seal Kit', quantity: 240, unitPrice: 450, total: 108000, inventoryStatus: 'AVAILABLE' as const, availableQty: 500 },
      ],
      timeline: [
        { step: '1', label: 'Email Received', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T16:45:00') },
        { step: '2', label: 'AI Extraction', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T16:45:30'), note: '98% confidence' },
        { step: '3', label: 'Validation', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T16:45:45'), note: 'No issues' },
        { step: '4', label: 'Order Created', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T17:00:00') },
        { step: '5', label: 'Inventory Updated', status: 'ACTIVE' as const, note: 'Reservation in progress' },
        { step: '6', label: 'Manufacturing', status: 'PENDING' as const },
        { step: '7', label: 'Invoice', status: 'PENDING' as const },
        { step: '8', label: 'Dispatch Ready', status: 'PENDING' as const },
      ],
    },
    {
      orderNumber: 'OP-2026-1244',
      customerId: customers['GlobalVolt Systems'],
      emailId: emailMap['GlobalVolt Systems'],
      status: 'PROCESSING' as OrderStatus,
      amount: 1240000,
      currency: 'INR',
      deliveryDate: new Date('2026-07-20'),
      priority: 'URGENT' as Priority,
      progress: 28,
      createdById: operator.id,
      createdAt: new Date('2026-07-05T12:00:00'),
      items: [
        { sku: 'MCB-32A-3P', name: 'MCB 32A Triple Pole', quantity: 200, unitPrice: 1850, total: 370000, inventoryStatus: 'PARTIAL' as const, availableQty: 150 },
        { sku: 'RCCB-63A', name: 'RCCB 63A', quantity: 100, unitPrice: 3200, total: 320000, inventoryStatus: 'AVAILABLE' as const, availableQty: 100 },
        { sku: 'DB-12W', name: 'Distribution Board 12-way', quantity: 50, unitPrice: 4500, total: 225000, inventoryStatus: 'AVAILABLE' as const, availableQty: 60 },
      ],
      timeline: [
        { step: '1', label: 'Email Received', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T11:20:00') },
        { step: '2', label: 'AI Extraction', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T11:20:30'), note: '87% confidence' },
        { step: '3', label: 'Validation', status: 'ACTIVE' as const, note: '1 critical issue' },
        { step: '4', label: 'Order Created', status: 'PENDING' as const },
        { step: '5', label: 'Inventory Updated', status: 'PENDING' as const },
        { step: '6', label: 'Manufacturing', status: 'PENDING' as const },
        { step: '7', label: 'Invoice', status: 'PENDING' as const },
        { step: '8', label: 'Dispatch Ready', status: 'PENDING' as const },
      ],
    },
    {
      orderNumber: 'OP-2026-1243',
      customerId: customers['SteelCore Industries'],
      status: 'DISPATCHED' as OrderStatus,
      amount: 580000,
      currency: 'INR',
      deliveryDate: new Date('2026-07-08'),
      priority: 'MEDIUM' as Priority,
      progress: 95,
      createdById: admin.id,
      createdAt: new Date('2026-07-03T10:00:00'),
      items: [
        { sku: 'STL-A40', name: 'Structural Steel Beam A-40', quantity: 50, unitPrice: 8500, total: 425000, inventoryStatus: 'AVAILABLE' as const, availableQty: 200 },
        { sku: 'WLD-WC8', name: 'Weld Connector WC-8', quantity: 500, unitPrice: 310, total: 155000, inventoryStatus: 'AVAILABLE' as const, availableQty: 800 },
      ],
      timeline: [
        { step: '1', label: 'Email Received', status: 'COMPLETED' as const, timestamp: new Date('2026-07-03T09:00:00') },
        { step: '2', label: 'AI Extraction', status: 'COMPLETED' as const, timestamp: new Date('2026-07-03T09:01:00') },
        { step: '3', label: 'Validation', status: 'COMPLETED' as const, timestamp: new Date('2026-07-03T09:01:30') },
        { step: '4', label: 'Order Created', status: 'COMPLETED' as const, timestamp: new Date('2026-07-03T10:00:00') },
        { step: '5', label: 'Inventory Updated', status: 'COMPLETED' as const, timestamp: new Date('2026-07-03T10:01:00') },
        { step: '6', label: 'Manufacturing', status: 'COMPLETED' as const, note: 'Not required' },
        { step: '7', label: 'Invoice', status: 'COMPLETED' as const, timestamp: new Date('2026-07-04T10:00:00') },
        { step: '8', label: 'Dispatch Ready', status: 'COMPLETED' as const, timestamp: new Date('2026-07-05T14:00:00'), note: 'AWB: DHL-990124' },
      ],
    },
  ];

  for (const orderData of ordersData) {
    const { items, timeline, ...orderFields } = orderData;

    // Check if order already exists
    const existing = await prisma.order.findUnique({ where: { orderNumber: orderFields.orderNumber } });
    if (existing) {
      console.log(`  ⏭  Order ${orderFields.orderNumber} already exists, skipping`);
      continue;
    }

    const order = await prisma.order.create({
      data: {
        ...orderFields,
        items: {
          create: items.map((item) => ({
            inventoryItemId: inventoryMap[item.sku] ?? null,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            inventoryStatus: item.inventoryStatus,
            availableQty: item.availableQty,
          })),
        },
        timeline: {
          create: timeline,
        },
      },
    });

    console.log(`  ✅ Order ${order.orderNumber} — ${orderFields.status}`);
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────────
  console.log('\nCreating sample invoices...');

  const invoiceSeedData = [
    {
      orderNumber: 'OP-2026-1246',
      invoiceNumber: 'INV-2026-9841',
      amount: 394000,
      taxRate: 18,
      taxAmount: 70920,
      totalAmount: 464920,
      dueDate: new Date('2026-08-31'),
      status: 'SENT' as const,
      sentAt: new Date('2026-07-06T08:30:00'),
    },
    {
      orderNumber: 'OP-2026-1243',
      invoiceNumber: 'INV-2026-9835',
      amount: 580000,
      taxRate: 18,
      taxAmount: 104400,
      totalAmount: 684400,
      dueDate: new Date('2026-08-05'),
      status: 'PAID' as const,
      sentAt: new Date('2026-07-04T10:00:00'),
      paidAt: new Date('2026-07-06T15:00:00'),
    },
    {
      orderNumber: 'OP-2026-1245',
      invoiceNumber: 'INV-2026-9844',
      amount: 1128000,
      taxRate: 18,
      taxAmount: 203040,
      totalAmount: 1331040,
      dueDate: new Date('2026-09-01'),
      status: 'DRAFT' as const,
    },
  ];

  for (const inv of invoiceSeedData) {
    const invOrder = await prisma.order.findUnique({ where: { orderNumber: inv.orderNumber } });
    if (!invOrder) continue;
    const existingInv = await prisma.invoice.findUnique({ where: { orderId: invOrder.id } });
    if (existingInv) { console.log(`  ⏭  Invoice for ${inv.orderNumber} already exists`); continue; }
    const { orderNumber, ...invData } = inv;
    await prisma.invoice.create({ data: { orderId: invOrder.id, ...invData } });
    console.log(`  ✅ Invoice ${inv.invoiceNumber} for ${inv.orderNumber} — ${inv.status}`);
  }

  // ─── Shipments ────────────────────────────────────────────────────────────────
  console.log('\nCreating sample shipments...');

  const shipmentSeedData = [
    {
      orderNumber: 'OP-2026-1243',
      carrier: 'DHL',
      awbNumber: 'DHL-990124',
      status: 'IN_TRANSIT' as const,
      shippingAddress: '34 GIDC Estate, Vadodara, Gujarat - 390010',
      trackingUrl: 'https://www.dhl.com/tracking?ref=DHL-990124',
      dispatchedAt: new Date('2026-07-05T14:00:00'),
    },
  ];

  for (const ship of shipmentSeedData) {
    const shipOrder = await prisma.order.findUnique({ where: { orderNumber: ship.orderNumber } });
    if (!shipOrder) continue;
    const existingShip = await prisma.shipment.findUnique({ where: { orderId: shipOrder.id } });
    if (existingShip) { console.log(`  ⏭  Shipment for ${ship.orderNumber} already exists`); continue; }
    const { orderNumber, ...shipData } = ship;
    await prisma.shipment.create({ data: { orderId: shipOrder.id, ...shipData } });
    console.log(`  ✅ Shipment ${ship.awbNumber} for ${ship.orderNumber}`);
  }

  // ─── Manufacturing Jobs ───────────────────────────────────────────────────────
  console.log('\nCreating sample manufacturing jobs...');

  const mfgOrder = await prisma.order.findUnique({
    where: { orderNumber: 'OP-2026-1247' },
    include: { items: true },
  });

  if (mfgOrder) {
    const existingMfg = await prisma.manufacturingJob.findFirst({ where: { orderId: mfgOrder.id } });
    if (!existingMfg) {
      const servoItem = mfgOrder.items.find((i) => i.sku === 'SRV-X200');
      const cableItem = mfgOrder.items.find((i) => i.sku === 'CA-CX12');

      if (servoItem) {
        await prisma.manufacturingJob.create({
          data: {
            orderId: mfgOrder.id,
            orderItemId: servoItem.id,
            description: 'Produce 180 units of X200 Servo Motor (shortage cover)',
            quantityRequired: 180,
            quantityCompleted: 120,
            status: 'IN_PROGRESS',
            estimatedCompletion: new Date('2026-07-26T18:00:00'),
            startedAt: new Date('2026-07-07T08:00:00'),
            notes: 'Running at full capacity. 120 of 180 units completed.',
          },
        });
        console.log('  ✅ Manufacturing job: X200 Servo Motor (IN_PROGRESS)');
      }

      if (cableItem) {
        await prisma.manufacturingJob.create({
          data: {
            orderId: mfgOrder.id,
            orderItemId: cableItem.id,
            description: 'Produce 200 units of CX-12 Cable Assembly (shortage cover)',
            quantityRequired: 200,
            quantityCompleted: 200,
            status: 'COMPLETED',
            estimatedCompletion: new Date('2026-07-15T18:00:00'),
            startedAt: new Date('2026-07-07T08:00:00'),
            completedAt: new Date('2026-07-14T16:00:00'),
          },
        });
        console.log('  ✅ Manufacturing job: CX-12 Cable Assembly (COMPLETED)');
      }
    }
  }

  // ─── Sample Notifications ─────────────────────────────────────────────────────
  console.log('\nCreating sample notifications...');

  const existingNotifCount = await prisma.notification.count();
  if (existingNotifCount === 0) {
    const notificationsData = [
      { type: 'ORDER' as const, title: 'New Order Received', message: 'ArcTech Industries placed a ₹22.8L order via email', isRead: false },
      { type: 'AI' as const, title: '✅ Order Auto-Created', message: 'AI extracted order with 94% confidence — Order OP-2026-1247 created automatically.', isRead: false },
      { type: 'INVENTORY' as const, title: 'Low Stock Alert', message: 'HC-200 Hydraulic Cylinder — 0 units available (120 reserved)', isRead: false },
      { type: 'INVENTORY' as const, title: 'Critical Stock Alert', message: 'Pneumatic Valve PV-12 — Only 12 available, 40 reserved', isRead: false },
      { type: 'ORDER' as const, title: 'Order Approved', message: 'OP-2026-1245 approved for Delta Forged Parts', isRead: true },
      { type: 'INVOICE' as const, title: 'Invoice Generated', message: 'Invoice #INV-2026-9841 sent to Nexus Manufacturing', isRead: true },
      { type: 'DISPATCH' as const, title: 'Order Dispatched', message: 'OP-2026-1243 dispatched via DHL — AWB: DHL-990124', isRead: true },
      { type: 'AI' as const, title: '👀 Human Review Required', message: 'AI extracted order with only 62% confidence from Meridian Group email. Please review and approve manually.', isRead: true },
    ];

    for (const n of notificationsData) {
      await prisma.notification.create({ data: n });
    }
    console.log(`  ✅ ${notificationsData.length} notifications created`);
  } else {
    console.log(`  ⏭  Notifications already exist (${existingNotifCount})`);
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\n─── Login Credentials ────────────────────────────');
  console.log('  Admin     : admin@orderpilot.ai     / Admin@123');
  console.log('  Inventory : inventory@orderpilot.ai / Inventory@123');
  console.log('──────────────────────────────────────────────────\n');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
