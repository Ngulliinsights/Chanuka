/**
 * Plain-Language Translation Service
 * Converts legal text to plain language
 * 
 * PRODUCTION: Replace mock data with OpenAI API or NLP model
 */

import { getMockTranslation, getMockClauses, type ClauseTranslation } from './mocks/translation-mock-data';

export interface TranslationRequest {
  billId: string;
  clauseRef?: string;
  fullBill?: boolean;
}

export interface TranslationResponse {
  billId: string;
  translations: ClauseTranslation[];
  summary: string;
  totalClauses: number;
  translatedClauses: number;
}

export class TranslationService {
  /**
   * Translate bill clauses to plain language
   * 
   * @param request - Translation request
   * @returns Plain-language translations
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const { billId, clauseRef, fullBill } = request;

    // MOCK: Get translations from mock data
    // PRODUCTION: Call OpenAI API or NLP model
    const translations = getMockTranslation(billId, clauseRef);
    const allClauses = getMockClauses(billId);

    if (translations.length === 0) {
      throw new Error(`No translations available for bill ${billId}`);
    }

    // Generate summary
    const summary = this.generateSummary(translations);

    return {
      billId,
      translations,
      summary,
      totalClauses: allClauses.length,
      translatedClauses: fullBill ? translations.length : (clauseRef ? 1 : translations.length)
    };
  }

  /**
   * Get available clauses for a bill
   */
  async getAvailableClauses(billId: string): Promise<string[]> {
    // MOCK: Get from mock data
    // PRODUCTION: Parse bill text and extract clause references
    return getMockClauses(billId);
  }

  /**
   * Generate executive summary from translations
   */
  private generateSummary(translations: ClauseTranslation[]): string {
    if (translations.length === 0) return '';
    
    if (translations.length === 1) {
      return translations[0].plainLanguage;
    }

    // Combine key points from all translations
    const allKeyPoints = translations.flatMap(t => t.keyPoints);
    const topPoints = allKeyPoints.slice(0, 3);
    
    return `This bill contains ${translations.length} major provisions. Key changes: ${topPoints.join('; ')}.`;
  }

  /**
   * PRODUCTION: Call OpenAI API for translation
   * Uncomment and configure when ready to use real API
   */
  /*
  private async callOpenAI(legalText: string): Promise<string> {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a legal translator for Kenyan citizens. Translate complex legal text into simple, clear language that ordinary Kenyans can understand. Use Kenyan context and examples.'
        },
        {
          role: 'user',
          content: `Translate this legal text to plain language:\n\n${legalText}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content || '';
  }
  */
}

export const translationService = new TranslationService();
