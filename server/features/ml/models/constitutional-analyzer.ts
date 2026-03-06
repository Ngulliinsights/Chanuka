/**
 * Constitutional Analyzer - MWANGA Stack
 * 
 * Three-tier constitutional analysis:
 * - Tier 1: spaCy keyword matching (<10ms)
 * - Tier 2: ChromaDB + sentence-transformers RAG (~100ms)
 * - Tier 3: Ollama + focused constitutional prompt (~1s)
 */

import { BaseAnalyzer } from './base-analyzer';
import type {
  ConstitutionalAnalysisInput,
  ConstitutionalAnalysisResult,
  ConstitutionalArticle,
  AnalysisTier,
} from './types';

// Bill of Rights keywords for Tier 1
const BILL_OF_RIGHTS_KEYWORDS = [
  'rights', 'freedom', 'liberty', 'equality', 'discrimination',
  'life', 'dignity', 'privacy', 'property', 'expression',
  'assembly', 'association', 'religion', 'conscience', 'belief',
  'education', 'health', 'housing', 'food', 'water',
  'social security', 'environment', 'language', 'culture',
];

// Constitutional articles (simplified - full version would be in ChromaDB)
const CONSTITUTIONAL_ARTICLES: Record<string, { title: string; text: string }> = {
  '43(1)(a)': {
    title: 'Economic and Social Rights - Highest Attainable Standard of Health',
    text: 'Every person has the right to the highest attainable standard of health, which includes the right to health care services, including reproductive health care.',
  },
  '43(1)(b)': {
    title: 'Economic and Social Rights - Accessible and Adequate Housing',
    text: 'Every person has the right to accessible and adequate housing, and to reasonable standards of sanitation.',
  },
  '43(1)(c)': {
    title: 'Economic and Social Rights - Freedom from Hunger',
    text: 'Every person has the right to be free from hunger, and to have adequate food of acceptable quality.',
  },
  '27': {
    title: 'Equality and Freedom from Discrimination',
    text: 'Every person is equal before the law and has the right to equal protection and equal benefit of the law. Equality includes the full and equal enjoyment of all rights and fundamental freedoms.',
  },
  '28': {
    title: 'Human Dignity',
    text: 'Every person has inherent dignity and the right to have that dignity respected and protected.',
  },
};

export class ConstitutionalAnalyzer extends BaseAnalyzer<
  ConstitutionalAnalysisInput,
  ConstitutionalAnalysisResult
> {
  /**
   * Tier-specific analysis implementation
   */
  protected async analyzeWithTier(
    input: ConstitutionalAnalysisInput,
    tier: AnalysisTier
  ): Promise<ConstitutionalAnalysisResult> {
    switch (tier) {
      case 'tier1':
        return this.analyzeTier1(input);
      case 'tier2':
        return this.analyzeTier2(input);
      case 'tier3':
        return this.analyzeTier3(input);
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Tier 1: Keyword matching for Bill of Rights terms
   */
  private async analyzeTier1(
    input: ConstitutionalAnalysisInput
  ): Promise<ConstitutionalAnalysisResult> {
    const text = input.billSection.toLowerCase();
    const matchedKeywords: string[] = [];

    // Find matching keywords
    for (const keyword of BILL_OF_RIGHTS_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    // If no keywords match, fall back to Tier 2
    if (matchedKeywords.length === 0) {
      throw new Error('No Bill of Rights keywords found, falling back to Tier 2');
    }

    // Simple heuristic: map keywords to articles
    const relevantArticles: ConstitutionalArticle[] = [];
    
    if (matchedKeywords.some(k => ['health', 'healthcare'].includes(k))) {
      relevantArticles.push({
        article: '43(1)(a)',
        ...CONSTITUTIONAL_ARTICLES['43(1)(a)'],
        similarity: 0.7,
      });
    }
    
    if (matchedKeywords.some(k => ['housing', 'sanitation'].includes(k))) {
      relevantArticles.push({
        article: '43(1)(b)',
        ...CONSTITUTIONAL_ARTICLES['43(1)(b)'],
        similarity: 0.7,
      });
    }

    if (matchedKeywords.some(k => ['equality', 'discrimination'].includes(k))) {
      relevantArticles.push({
        article: '27',
        ...CONSTITUTIONAL_ARTICLES['27'],
        similarity: 0.75,
      });
    }

    const riskScore = relevantArticles.length > 0 ? 0.5 : 0.2;

    return {
      relevantArticles,
      summary: `Found ${matchedKeywords.length} Bill of Rights keywords: ${matchedKeywords.join(', ')}`,
      riskLevel: this.calculateRiskLevel(riskScore),
      riskScore,
      citations: relevantArticles.map(a => a.article),
    };
  }

  /**
   * Tier 2: ChromaDB + sentence-transformers RAG
   * Vector similarity search for relevant constitutional provisions
   */
  private async analyzeTier2(
    input: ConstitutionalAnalysisInput
  ): Promise<ConstitutionalAnalysisResult> {
    // TODO: Implement ChromaDB vector search
    console.log('Tier 2: Querying ChromaDB for constitutional provisions...');

    // Simulate vector search
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock response (replace with actual ChromaDB query)
    const relevantArticles: ConstitutionalArticle[] = [
      {
        article: '43(1)(a)',
        ...CONSTITUTIONAL_ARTICLES['43(1)(a)'],
        similarity: 0.92,
      },
      {
        article: '27',
        ...CONSTITUTIONAL_ARTICLES['27'],
        similarity: 0.85,
      },
    ];

    const riskScore = 0.7;

    return {
      relevantArticles,
      summary: 'Vector search found 2 highly relevant constitutional provisions',
      riskLevel: this.calculateRiskLevel(riskScore),
      riskScore,
      citations: relevantArticles.map(a => a.article),
    };
  }

  /**
   * Tier 3: Ollama + focused constitutional prompt
   * Deep analysis with local LLM
   */
  private async analyzeTier3(
    input: ConstitutionalAnalysisInput
  ): Promise<ConstitutionalAnalysisResult> {
    // TODO: Implement Ollama API call
    console.log('Tier 3: Calling Ollama for constitutional analysis...');

    const prompt = `You are a Kenyan constitutional law expert. Analyze this bill section against the Constitution of Kenya 2010.

Bill Section:
"${input.billSection}"

Relevant Constitutional Articles (from RAG):
${this.formatArticlesForPrompt(input)}

Provide:
1. Which articles are most relevant (with similarity scores)
2. Risk assessment (low/medium/high/critical)
3. Plain-English summary for citizens
4. Specific citations

Respond in JSON format.`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response (replace with actual Ollama call)
    const relevantArticles: ConstitutionalArticle[] = [
      {
        article: '43(1)(a)',
        ...CONSTITUTIONAL_ARTICLES['43(1)(a)'],
        similarity: 0.95,
      },
      {
        article: '27',
        ...CONSTITUTIONAL_ARTICLES['27'],
        similarity: 0.88,
      },
      {
        article: '28',
        ...CONSTITUTIONAL_ARTICLES['28'],
        similarity: 0.82,
      },
    ];

    const riskScore = 0.85;

    return {
      relevantArticles,
      summary: 'This bill section potentially conflicts with Article 43(1)(a) on the right to health. The provision may create barriers to accessing healthcare services, which could violate constitutional protections.',
      riskLevel: this.calculateRiskLevel(riskScore),
      riskScore,
      citations: relevantArticles.map(a => a.article),
    };
  }

  /**
   * Calculate confidence based on tier and result
   */
  protected getConfidence(
    result: ConstitutionalAnalysisResult,
    tier: AnalysisTier
  ): number {
    const baseConfidence = result.relevantArticles.length > 0 ? 0.8 : 0.3;

    if (tier === 'tier3') return Math.min(baseConfidence * 1.2, 1.0);
    if (tier === 'tier2') return baseConfidence;
    return Math.min(baseConfidence * 0.7, 0.8);
  }

  /**
   * Helper: Calculate risk level from score
   */
  private calculateRiskLevel(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Helper: Format articles for LLM prompt
   */
  private formatArticlesForPrompt(input: ConstitutionalAnalysisInput): string {
    // In real implementation, this would include articles from ChromaDB
    return Object.entries(CONSTITUTIONAL_ARTICLES)
      .slice(0, 3)
      .map(([article, data]) => `Article ${article}: ${data.title}\n${data.text}`)
      .join('\n\n');
  }
}

// Export singleton instance
export const constitutionalAnalyzer = new ConstitutionalAnalyzer({
  enableCaching: true,
  cacheExpiryMs: 7200000, // 2 hours (Constitution doesn't change often)
  enableFallback: true,
});
