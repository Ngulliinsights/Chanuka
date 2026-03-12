import { bills } from '@server/infrastructure/schema';
/**
 * Bill Summarizer - MWANGA Stack
 * 
 * Three-tier bill summarization and plain-language translation:
 * - Tier 1: Extractive summarization with rules (<50ms)
 * - Tier 2: spaCy + TextRank abstractive summarization (~200ms)
 * - Tier 3: Ollama plain-language translation (~2s)
 * 
 * Purpose: Make complex legislative text accessible to ordinary Kenyan citizens.
 * Closes the gap between "we are angry about the Finance Bill" and 
 * "here is Clause 42, here is who benefits, here is how to submit comment."
 */

import { BaseAnalyzer } from './base-analyzer';
import type { AnalysisTier } from './types';

// ============================================================================
// Types
// ============================================================================

export interface BillSummarizationInput {
  billId: number;
  billTitle: string;
  billText: string;
  billType: 'public' | 'private' | 'money' | 'constitutional';
  
  summarizationType: 'executive' | 'section_by_section' | 'plain_language' | 'impact_focused';
  
  targetAudience: 'general_public' | 'activists' | 'legal_experts' | 'media';
  
  options?: {
    maxLength?: number; // words
    includeKeyProvisions?: boolean;
    includeImpactAnalysis?: boolean;
    language?: 'english' | 'swahili' | 'both';
    readingLevel?: 'basic' | 'intermediate' | 'advanced';
  };
}

export interface BillSummarizationResult {
  // Executive Summary
  executiveSummary: string;
  
  // Key Provisions
  keyProvisions: Array<{
    section: string;
    title: string;
    summary: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    plainLanguage: string;
  }>;
  
  // Impact Analysis
  impactAnalysis?: {
    whoIsAffected: string[];
    howTheyAreAffected: string;
    whenItTakesEffect: string;
    costImplications: string;
  };
  
  // Plain Language Translation
  plainLanguageVersion: string;
  
  // Metadata
  wordCount: {
    original: number;
    summary: number;
    compressionRatio: number; // 0-1
  };
  
  readabilityScore: {
    original: number; // Flesch-Kincaid grade level
    summary: number;
    improvement: number;
  };
  
  // Key Terms Explained
  keyTerms: Array<{
    term: string;
    definition: string;
    context: string;
  }>;
  
  // Action Items
  actionItems: Array<{
    action: string;
    deadline?: string;
    howTo: string;
    priority: 'urgent' | 'important' | 'optional';
  }>;
  
  // Swahili Translation (if requested)
  swahiliSummary?: string;
  
  narrative: string;
}

// ============================================================================
// Analyzer Implementation
// ============================================================================

export class BillSummarizer extends BaseAnalyzer<
  BillSummarizationInput,
  BillSummarizationResult
> {
  /**
   * Tier-specific analysis implementation
   */
  protected async analyzeWithTier(
    input: BillSummarizationInput,
    tier: AnalysisTier
  ): Promise<BillSummarizationResult> {
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
   * Tier 1: Extractive summarization with rules
   * Fast rule-based extraction of key sections
   */
  private async analyzeTier1(
    input: BillSummarizationInput
  ): Promise<BillSummarizationResult> {
    const text = input.billText;
    const words = text.split(/\s+/);
    const originalWordCount = words.length;

    // Extract key sections using rules
    const keyProvisions = this.extractKeyProvisions(text);

    // Generate executive summary (first paragraph + key points)
    const executiveSummary = this.generateExecutiveSummary(
      input.billTitle,
      text,
      keyProvisions
    );

    // Calculate word counts
    const summaryWordCount = executiveSummary.split(/\s+/).length;
    const compressionRatio = summaryWordCount / originalWordCount;

    // Calculate readability (simple heuristic)
    const originalReadability = this.calculateReadability(text);
    const summaryReadability = this.calculateReadability(executiveSummary);

    // Extract key terms
    const keyTerms = this.extractKeyTerms(text);

    // Generate action items
    const actionItems = this.extractActionItems(text);

    // If bill is complex or long, escalate to Tier 2
    if (originalWordCount > 5000 || keyProvisions.length > 10) {
      throw new Error('Complex bill detected, escalating to Tier 2 for better summarization');
    }

    return {
      executiveSummary,
      keyProvisions,
      plainLanguageVersion: executiveSummary, // Tier 1 doesn't do full translation
      wordCount: {
        original: originalWordCount,
        summary: summaryWordCount,
        compressionRatio,
      },
      readabilityScore: {
        original: originalReadability,
        summary: summaryReadability,
        improvement: originalReadability - summaryReadability,
      },
      keyTerms,
      actionItems,
      narrative: `Bill summarized: ${originalWordCount} words → ${summaryWordCount} words (${(compressionRatio * 100).toFixed(0)}% compression). ${keyProvisions.length} key provisions identified.`,
    };
  }

  /**
   * Tier 2: spaCy + TextRank abstractive summarization
   * Better summarization with NLP
   */
  private async analyzeTier2(
    input: BillSummarizationInput
  ): Promise<BillSummarizationResult> {
    // TODO: Implement spaCy + TextRank
    console.log('Tier 2: Running spaCy + TextRank summarization...');

    // Get Tier 1 baseline
    const tier1Results = await this.analyzeTier1(input);

    // Simulate spaCy analysis
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Enhanced summarization (mock - replace with spaCy)
    const enhancedSummary = this.enhanceSummary(tier1Results.executiveSummary);

    // Add impact analysis
    const impactAnalysis = this.analyzeImpact(input.billText);

    // If plain language translation requested, escalate to Tier 3
    if (input.summarizationType === 'plain_language' || input.options?.language === 'swahili') {
      throw new Error('Plain language translation requested, escalating to Tier 3');
    }

    return {
      ...tier1Results,
      executiveSummary: enhancedSummary,
      impactAnalysis,
    };
  }

  /**
   * Tier 3: Ollama plain-language translation
   * Full plain-language translation for accessibility
   */
  private async analyzeTier3(
    input: BillSummarizationInput
  ): Promise<BillSummarizationResult> {
    // TODO: Implement Ollama integration
    console.log('Tier 3: Generating plain-language translation with Ollama...');

    // Get Tier 2 results
    const tier2Results = await this.analyzeTier2(input);

    const prompt = `You are a Kenyan civic educator. Translate this bill into plain language that ordinary Kenyan citizens can understand.

Bill Title: ${input.billTitle}
Bill Type: ${input.billType}
Target Audience: ${input.targetAudience}
Reading Level: ${input.options?.readingLevel || 'basic'}

Executive Summary:
${tier2Results.executiveSummary}

Key Provisions:
${tier2Results.keyProvisions.map((p, i) => `${i + 1}. ${p.section}: ${p.summary}`).join('\n')}

Requirements:
1. Use simple, everyday language (avoid legal jargon)
2. Explain who is affected and how
3. Include practical examples
4. Explain what citizens can do
5. Use Kenyan context and examples
6. Keep sentences short (max 20 words)
7. Use active voice
8. Define any technical terms that must be used

${input.options?.language === 'swahili' ? 'Also provide a Swahili translation.' : ''}

Provide:
1. Plain-language version of the bill
2. Impact analysis (who, how, when, cost)
3. Action items for citizens
4. Key terms explained
${input.options?.language === 'swahili' ? '5. Swahili translation' : ''}

Keep the plain-language version under ${input.options?.maxLength || 500} words.`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock plain-language translation
    const plainLanguageVersion = `This bill changes how ${input.billType === 'money' ? 'government spends money' : 'laws work'} in Kenya. 

What it does:
${tier2Results.keyProvisions.slice(0, 3).map((p, i) => `${i + 1}. ${p.plainLanguage}`).join('\n')}

Who is affected:
- All Kenyan citizens
- Businesses operating in Kenya
- Government agencies

What you can do:
1. Read the full bill at [link]
2. Submit your comments before [deadline]
3. Contact your MP to share your views
4. Join community discussions

This bill will take effect on [date] if passed by Parliament.`;

    const swahiliSummary = input.options?.language === 'swahili' || input.options?.language === 'both'
      ? `Muswada huu unabadilisha jinsi ${input.billType === 'money' ? 'serikali inavyotumia pesa' : 'sheria zinavyofanya kazi'} nchini Kenya.

Kinachofanywa:
${tier2Results.keyProvisions.slice(0, 3).map((p, i) => `${i + 1}. ${p.plainLanguage}`).join('\n')}

Nani anaathiriwa:
- Wananchi wote wa Kenya
- Biashara zinazofanya kazi Kenya
- Mashirika ya serikali

Unaweza kufanya nini:
1. Soma muswada kamili kwa [link]
2. Wasilisha maoni yako kabla ya [tarehe]
3. Wasiliana na Mbunge wako kushiriki maoni yako
4. Jiunge na majadiliano ya jamii

Muswada huu utaanza kutumika tarehe [tarehe] ikiwa utapitishwa na Bunge.`
      : undefined;

    return {
      ...tier2Results,
      plainLanguageVersion,
      swahiliSummary,
      narrative: `Bill translated into plain language (reading level: ${input.options?.readingLevel || 'basic'}). Original: ${tier2Results.wordCount.original} words, Plain language: ${plainLanguageVersion.split(/\s+/).length} words. ${tier2Results.keyProvisions.length} key provisions explained.`,
    };
  }

  /**
   * Calculate confidence based on tier and result
   */
  protected getConfidence(result: BillSummarizationResult, tier: AnalysisTier): number {
    const baseConfidence = result.keyProvisions.length > 0 ? 0.8 : 0.5;

    if (tier === 'tier3') return Math.min(baseConfidence * 1.2, 1.0);
    if (tier === 'tier2') return baseConfidence;
    return Math.min(baseConfidence * 0.85, 0.9);
  }

  // Helper methods for Tier 1

  private extractKeyProvisions(text: string): Array<{
    section: string;
    title: string;
    summary: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    plainLanguage: string;
  }> {
    const provisions = [];
    
    // Simple regex to find sections (e.g., "Section 5:", "Clause 12:")
    const sectionRegex = /(Section|Clause|Article)\s+(\d+[A-Za-z]?)[:\.]?\s*([^\n]+)/gi;
    const matches = text.matchAll(sectionRegex);

    for (const match of matches) {
      const section = `${match[1] || ''} ${match[2] || ''}`;
      const title = (match[3] || '').trim();
      
      // Extract text after section header (next 200 chars)
      const startIndex = (match.index ?? 0) + match[0].length;
      const summary = text.substring(startIndex, startIndex + 200).trim();

      // Determine importance (simple heuristic)
      const importance = this.determineImportance(title, summary);

      provisions.push({
        section,
        title,
        summary,
        importance,
        plainLanguage: this.simplifyText(summary),
      });

      if (provisions.length >= 10) break; // Limit to top 10
    }

    return provisions;
  }

  private generateExecutiveSummary(
    title: string,
    text: string,
    keyProvisions: any[]
  ): string {
    // Extract first paragraph
    const firstParagraph = text.split('\n\n')[0] || text.substring(0, 300);

    // Generate summary
    const summary = `${title} introduces ${keyProvisions.length} key provisions. ${firstParagraph.substring(0, 200)}... Key changes include: ${keyProvisions.slice(0, 3).map((p) => p.title).join('; ')}.`;

    return summary;
  }

  private calculateReadability(text: string): number {
    // Simple Flesch-Kincaid approximation
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = text.split(/[aeiou]/i).length; // Rough approximation

    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    // Flesch-Kincaid Grade Level
    const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

    return Math.max(0, gradeLevel);
  }

  private extractKeyTerms(text: string): Array<{
    term: string;
    definition: string;
    context: string;
  }> {
    // Simple extraction of capitalized terms and legal jargon
    const legalTerms = [
      { term: 'Notwithstanding', definition: 'Despite or regardless of', context: 'Legal term meaning "even though"' },
      { term: 'Pursuant to', definition: 'According to or in accordance with', context: 'Legal term meaning "following"' },
      { term: 'Hereby', definition: 'By this document or action', context: 'Legal term meaning "by this"' },
    ];

    return legalTerms.filter((t) => text.includes(t.term));
  }

  private extractActionItems(text: string): Array<{
    action: string;
    deadline?: string;
    howTo: string;
    priority: 'urgent' | 'important' | 'optional';
  }> {
    // Simple extraction of action-oriented text
    const actions = [];

    if (text.includes('comment') || text.includes('consultation')) {
      actions.push({
        action: 'Submit public comments',
        deadline: 'Check bill for deadline',
        howTo: 'Visit parliament website or email comments',
        priority: 'important' as const,
      });
    }

    if (text.includes('hearing') || text.includes('public participation')) {
      actions.push({
        action: 'Attend public hearing',
        deadline: 'Check bill for dates',
        howTo: 'Register at parliament website',
        priority: 'important' as const,
      });
    }

    return actions;
  }

  private determineImportance(
    title: string,
    summary: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    const criticalKeywords = ['repeal', 'amend', 'penalty', 'fine', 'imprisonment', 'tax', 'fee'];
    const highKeywords = ['establish', 'create', 'require', 'prohibit', 'mandate'];

    const text = (title + ' ' + summary).toLowerCase();

    if (criticalKeywords.some((k) => text.includes(k))) return 'critical';
    if (highKeywords.some((k) => text.includes(k))) return 'high';
    return 'medium';
  }

  private simplifyText(text: string): string {
    // Simple text simplification (replace with better logic)
    return text
      .replace(/notwithstanding/gi, 'despite')
      .replace(/pursuant to/gi, 'according to')
      .replace(/hereby/gi, 'by this')
      .replace(/shall/gi, 'will')
      .replace(/aforementioned/gi, 'mentioned above');
  }

  private enhanceSummary(summary: string): string {
    // Placeholder for spaCy enhancement
    return summary;
  }

  private analyzeImpact(text: string): {
    whoIsAffected: string[];
    howTheyAreAffected: string;
    whenItTakesEffect: string;
    costImplications: string;
  } {
    // Simple impact analysis
    return {
      whoIsAffected: ['All Kenyan citizens', 'Businesses', 'Government agencies'],
      howTheyAreAffected: 'Changes to existing laws and regulations',
      whenItTakesEffect: 'Upon passage by Parliament',
      costImplications: 'To be determined based on implementation',
    };
  }
}

// Export singleton instance
export const billSummarizer = new BillSummarizer({
  enableCaching: true,
  cacheExpiryMs: 7200000, // 2 hours (bills don't change frequently)
  enableFallback: true,
});
