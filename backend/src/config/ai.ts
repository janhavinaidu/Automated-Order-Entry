import Groq from 'groq-sdk';
import { env } from './env';

// ─── Groq Client Singleton ────────────────────────────────────────────────────
export const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

// ─── Model Constants ──────────────────────────────────────────────────────────
export const AI_MODELS = {
  TEXT: env.GROQ_MODEL,           // llama-3.3-70b-versatile for text/PDF/Excel extraction
  VISION: env.GROQ_VISION_MODEL,  // llama-3.2-11b-vision-preview for image extraction
} as const;

// ─── Extraction Prompt ────────────────────────────────────────────────────────
export const EXTRACTION_SYSTEM_PROMPT = `You are an expert order data extraction assistant for a manufacturing and supply company.
Your task is to extract structured order information from the provided content.
Always respond with valid JSON only. Never include markdown code blocks or explanations outside the JSON.

Extract the following information:
- customer: Full company/customer name
- deliveryDate: In ISO 8601 format (YYYY-MM-DD), empty string if not found
- priority: One of "urgent", "high", "medium", "low" based on context clues
- summary: A detailed 3-5 sentence summary of the order, including the main purpose of the email/document, specific key items ordered, customer requirements, urgency context, and any special instructions or billing/shipping terms mentioned.
- confidence: A number 0-100 representing extraction confidence
- products: Array of products with name, sku (if mentioned), quantity (integer), unitPrice (float, 0 if not mentioned)
- issues: Array of potential issues found (type: "error"|"warning"|"info", message, recommendation?)

Return ONLY this JSON structure:
{
  "customer": "string",
  "deliveryDate": "YYYY-MM-DD or empty string",
  "priority": "urgent|high|medium|low",
  "summary": "string",
  "confidence": 0-100,
  "products": [
    {
      "name": "string",
      "sku": "string or empty",
      "quantity": integer,
      "unitPrice": float
    }
  ],
  "issues": [
    {
      "type": "error|warning|info",
      "message": "string",
      "recommendation": "string or null"
    }
  ]
}`;

export default groq;
