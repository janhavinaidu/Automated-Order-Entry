import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { Invoice } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors';
import { buildPagination } from '../../shared/types';
import {
  generateInvoiceNumber,
  calculateTax,
  calculateTotal,
  addDays,
} from '../../shared/utils';
import { UPLOAD_PATHS } from '../../middleware/upload.middleware';
import { NotificationService } from '../notifications/notification.service';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

// ─── PDF Generation Helper ────────────────────────────────────────────────────

function generateInvoicePDF(params: {
  invoice: {
    invoiceNumber: string;
    amount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    dueDate: Date;
    createdAt: Date;
  };
  order: {
    orderNumber: string;
    items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; total: number }>;
  };
  customer: {
    name: string;
    company: string;
    email: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  outputPath: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const { invoice, order, customer, outputPath } = params;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const writeStream = fs.createWriteStream(outputPath);

    doc.pipe(writeStream);

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fillColor('#1a1a2e')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(env.APP_NAME, 50, 50);

    doc
      .fillColor('#555')
      .fontSize(10)
      .font('Helvetica')
      .text('Enterprise Order Management System', 50, 80)
      .text('support@orderpilot.ai | www.orderpilot.ai', 50, 94);

    doc
      .fillColor('#1a1a2e')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });

    doc
      .fillColor('#333')
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 78, { align: 'right' })
      .text(`Order #: ${order.orderNumber}`, 400, 92, { align: 'right' })
      .text(`Date: ${invoice.createdAt.toLocaleDateString('en-IN')}`, 400, 106, { align: 'right' })
      .text(`Due: ${invoice.dueDate.toLocaleDateString('en-IN')}`, 400, 120, { align: 'right' });

    // Divider
    doc.moveTo(50, 145).lineTo(545, 145).strokeColor('#ddd').stroke();

    // ── Bill To ─────────────────────────────────────────────────────────────
    doc.y = 160;
    doc.fillColor('#888').fontSize(9).font('Helvetica-Bold').text('BILL TO', 50);
    doc
      .fillColor('#1a1a2e')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(customer.company, 50, 176);
    doc
      .fillColor('#555')
      .fontSize(10)
      .font('Helvetica')
      .text(customer.name, 50, 191)
      .text(customer.email, 50, 205);

    const addressParts = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean);
    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), 50, 219);
    }

    // ── Items Table ──────────────────────────────────────────────────────────
    const tableTop = 270;
    const col = { item: 50, sku: 230, qty: 320, price: 380, total: 460 };

    // Table header
    doc
      .fillColor('#1a1a2e')
      .rect(50, tableTop - 8, 495, 22)
      .fill();

    doc
      .fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('ITEM NAME', col.item, tableTop)
      .text('SKU', col.sku, tableTop)
      .text('QTY', col.qty, tableTop)
      .text('UNIT PRICE', col.price, tableTop)
      .text('TOTAL', col.total, tableTop);

    // Table rows
    let y = tableTop + 28;
    doc.font('Helvetica').fontSize(9).fillColor('#333');

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];

      if (i % 2 === 0) {
        doc.fillColor('#f8f9fa').rect(50, y - 5, 495, 18).fill();
      }

      doc
        .fillColor('#333')
        .text(item.name.slice(0, 28), col.item, y, { width: 175 })
        .text(item.sku, col.sku, y)
        .text(String(item.quantity), col.qty, y)
        .text(`₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col.price, y)
        .text(`₹${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col.total, y);

      y += 20;
    }

    // ── Totals ───────────────────────────────────────────────────────────────
    y += 15;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
    y += 12;

    const formatCurrency = (n: number) =>
      `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    doc
      .fillColor('#555')
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', 380, y)
      .text(formatCurrency(invoice.amount), col.total, y, { align: 'left' });

    y += 18;
    doc
      .text(`GST (${invoice.taxRate}%):`, 380, y)
      .text(formatCurrency(invoice.taxAmount), col.total, y);

    y += 18;
    doc.moveTo(380, y).lineTo(545, y).strokeColor('#bbb').stroke();
    y += 10;

    doc
      .fillColor('#1a1a2e')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('GRAND TOTAL:', 380, y)
      .text(formatCurrency(invoice.totalAmount), col.total, y);

    // ── Footer ───────────────────────────────────────────────────────────────
    y += 60;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
    y += 12;

    doc
      .fillColor('#888')
      .fontSize(8)
      .font('Helvetica')
      .text('Payment Terms: Net 30 days from invoice date', 50, y)
      .text('Bank Details: Account Holder: OrderPilot AI | Bank: HDFC Bank | Account No: XXXXXXXXXXXX | IFSC: HDFC0000001', 50, y + 14)
      .text('Please reference the invoice number in your payment. For queries: support@orderpilot.ai', 50, y + 28);

    doc.end();

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// ─── Billing Service ──────────────────────────────────────────────────────────

export const BillingService = {
  /**
   * Paginated list of invoices with order and customer context.
   */
  async findAll(query: {
    page: number;
    limit: number;
    status?: string;
    orderId?: string;
  }): Promise<{ data: Invoice[]; pagination: ReturnType<typeof buildPagination> }> {
    const { page, limit, status, orderId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          order: { include: { customer: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, pagination: buildPagination(page, limit, total) };
  },

  /**
   * Get a single invoice by ID with full order and customer details.
   */
  async findById(id: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
          },
        },
      },
    });

    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  },

  /**
   * Generate a PDF invoice for an order and create the Invoice record.
   */
  async generateInvoice(orderId: string): Promise<Invoice> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    });

    if (!order) throw new NotFoundError('Order');

    if (order.invoice) {
      throw new ConflictError(`Invoice already exists for order ${order.orderNumber}: ${order.invoice.invoiceNumber}`);
    }

    if (!['APPROVED', 'MANUFACTURING', 'INVOICED'].includes(order.status)) {
      throw new BadRequestError(
        `Order must be in APPROVED, MANUFACTURING, or INVOICED status to generate an invoice. Current: ${order.status}`,
      );
    }

    // Calculate financial figures
    const amount = order.amount;
    const taxRate = env.DEFAULT_TAX_RATE;
    const taxAmount = calculateTax(amount, taxRate);
    const totalAmount = calculateTotal(amount, taxRate);

    // Calculate due date based on customer payment terms
    let dueDays = 30;
    if (order.customer.paymentTerms) {
      const match = order.customer.paymentTerms.match(/\d+/);
      if (match) dueDays = parseInt(match[0], 10);
    }
    const dueDate = addDays(new Date(), dueDays);

    const invoiceNumber = generateInvoiceNumber();
    const pdfFilename = `${invoiceNumber}.pdf`;
    const pdfPath = path.join(UPLOAD_PATHS.invoices, pdfFilename);
    const pdfRelativePath = `invoices/${pdfFilename}`;

    // Generate PDF
    await generateInvoicePDF({
      invoice: {
        invoiceNumber,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
        dueDate,
        createdAt: new Date(),
      },
      order: {
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      },
      customer: order.customer,
      outputPath: pdfPath,
    });

    logger.info(`Invoice PDF generated: ${pdfPath}`);

    // Create Invoice record and update order in a transaction
    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          amount,
          taxRate,
          taxAmount,
          totalAmount,
          dueDate,
          status: 'DRAFT',
          pdfPath: pdfRelativePath,
        },
        include: {
          order: { include: { customer: true } },
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: order.status === 'INVOICED' ? 'INVOICED' : 'INVOICED',
          progress: 80,
        },
      }),
    ]);

    await NotificationService.create({
      type: 'INVOICE',
      title: 'Invoice Generated',
      message: `Invoice ${invoiceNumber} generated for order ${order.orderNumber}`,
      metadata: { invoiceId: invoice.id, orderId: order.id, invoiceNumber },
    });

    return invoice;
  },

  /**
   * Send an invoice email to the customer with the PDF as an attachment.
   */
  async sendInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: { include: { customer: true } },
      },
    });

    if (!invoice) throw new NotFoundError('Invoice');
    if (!invoice.pdfPath) throw new BadRequestError('Invoice PDF not yet generated');

    const pdfAbsolutePath = path.join(UPLOAD_PATHS.invoices, path.basename(invoice.pdfPath));

    if (env.SMTP_ENABLED && env.SMTP_USER && env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      });

      const customer = invoice.order.customer;
      const mailOptions = {
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to: customer.email,
        cc: env.SMTP_FROM_EMAIL,
        subject: `Invoice ${invoice.invoiceNumber} — ${invoice.order.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">Invoice from ${env.APP_NAME}</h2>
            <p>Dear ${customer.name},</p>
            <p>Please find attached your invoice <strong>${invoice.invoiceNumber}</strong> 
               for order <strong>${invoice.order.orderNumber}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
              <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;"><strong>Invoice Number</strong></td>
                <td style="padding:8px; border-bottom:1px solid #eee;">${invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;"><strong>Amount</strong></td>
                <td style="padding:8px; border-bottom:1px solid #eee;">₹${invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;"><strong>GST (${invoice.taxRate}%)</strong></td>
                <td style="padding:8px; border-bottom:1px solid #eee;">₹${invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding:8px;"><strong>Total Amount</strong></td>
                <td style="padding:8px;"><strong>₹${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            </table>
            <p>Due Date: <strong>${invoice.dueDate.toLocaleDateString('en-IN')}</strong></p>
            <p>Please reference the invoice number in your payment. For queries, contact support@orderpilot.ai.</p>
            <hr/>
            <p style="color:#888; font-size:12px;">${env.APP_NAME} — Enterprise Order Management</p>
          </div>
        `,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            path: pdfAbsolutePath,
            contentType: 'application/pdf',
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Invoice ${invoice.invoiceNumber} emailed to ${customer.email}`);
    } else {
      logger.warn('SMTP not configured — invoice email not sent');
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT', sentAt: new Date() },
      include: { order: { include: { customer: true } } },
    });

    return updated;
  },

  /**
   * Update invoice status (PAID, OVERDUE, CANCELLED).
   */
  async updateStatus(invoiceId: string, status: 'PAID' | 'OVERDUE' | 'CANCELLED'): Promise<Invoice> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { order: { include: { customer: true } } },
    });

    if (!invoice) throw new NotFoundError('Invoice');

    const updateData: Record<string, unknown> = { status };
    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: { order: { include: { customer: true } } },
    });

    if (status === 'PAID') {
      await NotificationService.create({
        type: 'INVOICE',
        title: 'Invoice Paid',
        message: `Invoice ${invoice.invoiceNumber} for order ${invoice.order.orderNumber} has been marked as paid`,
        metadata: {
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
        },
      });
    }

    logger.info(`Invoice ${invoice.invoiceNumber} status updated to ${status}`);
    return updated;
  },

  /**
   * Return the PDF path and invoice number for streaming/download.
   */
  async downloadInvoicePDF(invoiceId: string): Promise<{ pdfPath: string; invoiceNumber: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { pdfPath: true, invoiceNumber: true },
    });

    if (!invoice) throw new NotFoundError('Invoice');
    if (!invoice.pdfPath) throw new BadRequestError('PDF not yet generated for this invoice');

    const absolutePath = path.join(UPLOAD_PATHS.invoices, path.basename(invoice.pdfPath));

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundError('Invoice PDF file');
    }

    return { pdfPath: absolutePath, invoiceNumber: invoice.invoiceNumber };
  },
};
