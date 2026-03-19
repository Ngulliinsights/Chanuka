/**
 * Plain-Language Translation Service
 * Converts legal text to plain language using OpenAI API.
 *
 * - Uses native fetch (no SDK dependency)
 * - Falls back gracefully when OPENAI_API_KEY is not configured
 * - Caches translations to minimise API costs
 */

import type { ClauseTranslation } from '../infrastructure/mocks/translation-mock-data';

export interface TranslationRequest {
  billId: string;
  billTitle?: string;
  clauseRef?: string;
  fullBill?: boolean;
  /** Raw legal text of the clause(s) to translate. Required for real translation. */
  legalText?: string;
}

export interface TranslationResponse {
  billId: string;
  translations: ClauseTranslation[];
  summary: string;
  totalClauses: number;
  translatedClauses: number;
  /** Whether real AI translation was used vs fallback */
  source: 'openai' | 'unavailable';
}

// In-memory cache to avoid repeated API calls for the same text
const translationCache = new Map<string, ClauseTranslation[]>();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export class TranslationService {
  /**
   * Translate bill clauses to plain language
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const { billId, legalText, clauseRef, billTitle } = request;
    const apiKey = getApiKey();

    // If no API key or no legal text provided, return honest fallback
    if (!apiKey || !legalText) {
      return this.unavailableResponse(billId, legalText);
    }

    // Check cache
    const cacheKey = `${billId}:${clauseRef ?? 'full'}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      return {
        billId,
        translations: cached,
        summary: this.generateSummary(cached),
        totalClauses: cached.length,
        translatedClauses: cached.length,
        source: 'openai',
      };
    }

    try {
      const translations = await this.callOpenAI(legalText, billTitle, clauseRef);

      // Cache the result
      translationCache.set(cacheKey, translations);

      return {
        billId,
        translations,
        summary: this.generateSummary(translations),
        totalClauses: translations.length,
        translatedClauses: translations.length,
        source: 'openai',
      };
    } catch (error) {
      // If API call fails, return honest fallback rather than crashing
      console.error('[TranslationService] OpenAI call failed:', error);
      return this.unavailableResponse(billId, legalText);
    }
  }

  /**
   * Call OpenAI API via native fetch
   */
  private async callOpenAI(
    legalText: string,
    billTitle?: string,
    clauseRef?: string
  ): Promise<ClauseTranslation[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const systemPrompt = `You are a legal translator for Kenyan citizens. Translate complex legal text into simple, clear language that ordinary Kenyans can understand.

Rules:
- Use everyday language, not legal jargon
- Use Kenyan context and examples when helpful
- Break down penalties and obligations clearly
- Identify the key points a citizen needs to understand
- Be accurate — do not change the meaning

Respond in JSON format matching this structure:
[{
  "clauseRef": "Section X",
  "legalText": "original text",
  "plainLanguage": "simple translation",
  "keyPoints": ["point 1", "point 2"],
  "complexity": "low" | "medium" | "high"
}]`;

    const userPrompt = clauseRef
      ? `Translate this clause from ${billTitle ?? 'a Kenyan bill'}:\n\n${clauseRef}: "${legalText}"`
      : `Translate these clauses from ${billTitle ?? 'a Kenyan bill'}:\n\n"${legalText}"`;

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), 30000);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsed = JSON.parse(content) as
      | ClauseTranslation[]
      | { translations: ClauseTranslation[] };

    // Handle both array and object wrapper responses
    return Array.isArray(parsed) ? parsed : parsed.translations ?? [];
  }

  /**
   * Honest fallback when translation is not available
   */
  private unavailableResponse(billId: string, legalText?: string): TranslationResponse {
    const fallbackTranslation: ClauseTranslation = {
      clauseRef: 'N/A',
      legalText: legalText ?? '',
      plainLanguage: 'Plain-language translation is not yet available for this bill. '
        + 'The translation service requires an OpenAI API key to be configured. '
        + 'Please check back later or contact the Chanuka team.',
      keyPoints: ['Translation service is being set up'],
      complexity: 'high',
    };

    return {
      billId,
      translations: [fallbackTranslation],
      summary: 'Translation is not yet available for this bill.',
      totalClauses: 0,
      translatedClauses: 0,
      source: 'unavailable',
    };
  }

  /**
   * Get available clauses for a bill
   */
  async getAvailableClauses(_billId: string): Promise<string[]> {
    // In production: parse the bill text and extract clause references
    // For now, return empty — we don't have stored bill text yet
    return [];
  }

  /**
   * Generate executive summary from translations
   */
  private generateSummary(translations: ClauseTranslation[]): string {
    if (translations.length === 0) return '';

    if (translations.length === 1) {
      return translations[0].plainLanguage;
    }

    const allKeyPoints = translations.flatMap(t => t.keyPoints);
    const topPoints = allKeyPoints.slice(0, 3);

    return `This bill contains ${translations.length} major provisions. Key changes: ${topPoints.join('; ')}.`;
  }

  /**
   * Clear the in-memory translation cache
   */
  clearCache(): void {
    translationCache.clear();
  }
}

export const translationService = new TranslationService();
