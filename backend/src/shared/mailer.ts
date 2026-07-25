import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

function getTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASSWORD!,
    },
  });
}

export async function sendOrderConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  company: string;
  orderNumber: string;
  amount: number;
  itemCount: number;
}): Promise<void> {
  if (!env.SMTP_ENABLED) {
    logger.warn('SMTP not configured — order confirmation email not sent');
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to: params.customerEmail,
    subject: `Order Confirmed — ${params.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Your order has been approved</h2>
        <p>Dear ${params.customerName},</p>
        <p>Thank you for your order. We have reviewed and <strong>approved</strong> your request.</p>
        <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
          <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Order Number</strong></td>
              <td style="padding:8px; border-bottom:1px solid #eee;">${params.orderNumber}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Company</strong></td>
              <td style="padding:8px; border-bottom:1px solid #eee;">${params.company}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #eee;"><strong>Line Items</strong></td>
              <td style="padding:8px; border-bottom:1px solid #eee;">${params.itemCount}</td></tr>
          <tr><td style="padding:8px;"><strong>Order Value</strong></td>
              <td style="padding:8px;">₹${params.amount.toLocaleString('en-IN')}</td></tr>
        </table>
        <p>Our team will proceed with fulfillment and billing. If you have questions, reply to this email.</p>
        <p style="color:#888; font-size:12px;">${env.APP_NAME} — Automated Order Management</p>
      </div>
    `,
  });

  logger.info(`Order confirmation emailed to ${params.customerEmail} for ${params.orderNumber}`);
}
