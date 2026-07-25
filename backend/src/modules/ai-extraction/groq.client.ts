import { groq, EXTRACTION_SYSTEM_PROMPT, AI_MODELS } from '../../config/ai';
import { logger } from '../../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedProduct {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface ExtractionIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  recommendation?: string;
}

export interface ExtractedOrderData {
  customer: string;
  deliveryDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  summary: string;
  confidence: number;
  products: ExtractedProduct[];
  issues: ExtractionIssue[];
}

// ─── Fallback Result ──────────────────────────────────────────────────────────

const buildFallbackResult = (errorMessage: string): ExtractedOrderData => ({
  customer: '',
  deliveryDate: '',
  priority: 'low',
  summary: 'Extraction failed — could not parse AI response.',
  confidence: 0,
  products: [],
  issues: [
    {
      type: 'error',
      message: errorMessage,
      recommendation: 'Review the source document manually.',
    },
  ],
});

// ─── Parse JSON helper ────────────────────────────────────────────────────────

const parseExtractionResponse = (content: string | null): ExtractedOrderData => {
  if (!content) {
    return buildFallbackResult('AI returned an empty response');
  }

  // Strip markdown code fences if the model included them despite instructions
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as ExtractedOrderData;

    // Normalise confidence to number in [0,100]
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(100, parsed.confidence))
        : 0;

    return {
      customer: parsed.customer ?? '',
      deliveryDate: parsed.deliveryDate ?? '',
      priority: (['urgent', 'high', 'medium', 'low'].includes(parsed.priority)
        ? parsed.priority
        : 'low') as ExtractedOrderData['priority'],
      summary: parsed.summary ?? '',
      confidence,
      products: Array.isArray(parsed.products)
        ? parsed.products.map((p) => ({
            name: p.name ?? '',
            sku: p.sku ?? '',
            quantity: Number(p.quantity) || 0,
            unitPrice: Number(p.unitPrice) || 0,
          }))
        : [],
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.map((i) => ({
            type: (['error', 'warning', 'info'].includes(i.type)
              ? i.type
              : 'info') as ExtractionIssue['type'],
            message: i.message ?? '',
            recommendation: i.recommendation ?? undefined,
          }))
        : [],
    };
  } catch (err) {
    logger.warn('Failed to parse Groq JSON response', { content, err });
    return buildFallbackResult(
      `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

// ─── Text / Document Extraction ───────────────────────────────────────────────

/**
 * Send plain text (from PDF, Excel, or email body) to Groq LLM for order extraction.
 * Uses the TEXT model (llama-3.3-70b-versatile).
 */
export const extractOrderFromText = async (
  text: string,
  context?: string,
): Promise<ExtractedOrderData> => {
  try {
    logger.debug(`[Groq] Sending text to AI (length: ${text.length}, context: ${context})`);
    logger.debug(`[Groq] First 500 chars of text: ${text.slice(0, 500)}`);
    
    const response = await groq.chat.completions.create({
      model: AI_MODELS.TEXT,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Extract order details from the following document:\n\nContext: ${context ?? 'Email attachment'}\n\n${text}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? null;
    logger.debug(`[Groq] AI response length: ${content?.length ?? 0}`);
    logger.debug(`[Groq] AI response: ${content?.slice(0, 500)}`);
    
    return parseExtractionResponse(content);
  } catch (err) {
    logger.error('Groq text extraction failed', { err });
    return buildFallbackResult(
      `Groq API error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

// ─── Image Extraction ─────────────────────────────────────────────────────────

/**
 * Send a base64-encoded image to Groq Vision API for order extraction.
 * Uses the VISION model (llama-3.2-11b-vision-preview).
 */
export const extractOrderFromImage = async (
  base64: string,
  mimeType: string,
): Promise<ExtractedOrderData> => {
  try {
    const response = await groq.chat.completions.create({
      model: AI_MODELS.VISION,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
            {
              type: 'text',
              text: 'Extract all order details from this image. Return the structured JSON as instructed.',
            },
          ] as unknown as string,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? null;
    return parseExtractionResponse(content);
  } catch (err) {
    logger.error('Groq vision extraction failed', { err });
    return buildFallbackResult(
      `Groq Vision API error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};
