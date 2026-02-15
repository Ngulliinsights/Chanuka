// ============================================================================
// CONSTITUTIONAL ANALYZER - ML Model for Constitutional Compliance (OPTIMIZED)
// ============================================================================
// Analyzes bills for constitutional violations and alignment

import { z } from 'zod';

import { TextProcessor, Statistics, Cache } from './shared_utils';

export const ConstitutionalInputSchema = z.object({
  billText: z.string().min(1),
  billTitle: z.string().min(1),
  billType: z.enum(['public', 'private', 'money', 'constitutional_amendment']),
  affectedInstitutions: z.array(z.string()).optional(),
  proposedChanges: z.array(z.string()).optional(),
});

export const ConstitutionalOutputSchema = z.object({
  alignmentScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  alignment: z.enum(['aligned', 'concerning', 'violates', 'neutral']),
  violations: z.array(z.object({
    provision: z.string(),
    violationType: z.enum(['procedural_fairness', 'separation_powers', 'bill_of_rights', 'devolution', 'public_finance']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    explanation: z.string(),
    recommendedAction: z.string(),
  })),
  citedProvisions: z.array(z.object({
    article: z.string(),
    section: z.string().optional(),
    title: z.string(),
    relevance: z.enum(['directly_applicable', 'related', 'contextual']),
    impact: z.enum(['positive', 'negative', 'neutral']),
  })),
  precedents: z.array(z.object({
    caseName: z.string(),
    court: z.string(),
    relevance: z.number().min(0).max(1),
    outcome: z.string(),
  })),
  recommendations: z.array(z.string()),
});

export type ConstitutionalInput = z.infer<typeof ConstitutionalInputSchema>;
export type ConstitutionalOutput = z.infer<typeof ConstitutionalOutputSchema>;

export class ConstitutionalAnalyzer {
  private modelVersion = '2.1.0';
  private cache = new Cache<ConstitutionalOutput>(600); // 10 minute cache
  
  private readonly CONSTITUTIONAL_PROVISIONS = {
    'Article 2': { title: 'Supremacy of Constitution', chapter: 1, keywords: ['constitution', 'supremacy', 'law', 'katiba'] },
    'Article 10': { title: 'National Values and Principles', chapter: 2, keywords: ['values', 'principles', 'governance', 'maadili'] },
    'Article 19': { title: 'Bill of Rights - General', chapter: 4, keywords: ['rights', 'fundamental', 'haki'] },
    'Article 31': { title: 'Privacy', chapter: 4, keywords: ['privacy', 'personal', 'information', 'faragha', 'data'] },
    'Article 33': { title: 'Freedom of Expression', chapter: 4, keywords: ['expression', 'speech', 'media', 'press', 'uhuru wa kujieleza'] },
    'Article 47': { title: 'Fair Administrative Action', chapter: 4, keywords: ['fair', 'administrative', 'procedure', 'haki', 'hearing'] },
    'Article 94': { title: 'Role of Parliament', chapter: 8, keywords: ['parliament', 'bunge', 'legislative', 'oversight'] },
    'Article 96': { title: 'Senate Powers', chapter: 8, keywords: ['senate', 'county', 'devolution'] },
    'Article 110': { title: 'Money Bills', chapter: 8, keywords: ['money', 'finance', 'budget', 'fedha'] },
    'Article 165': { title: 'Judicial Authority', chapter: 10, keywords: ['court', 'judicial', 'judge', 'mahakama', 'justice'] },
    'Article 174': { title: 'Objects of Devolution', chapter: 11, keywords: ['devolution', 'county', 'local', 'kaunti'] },
    'Article 201': { title: 'Principles of Public Finance', chapter: 12, keywords: ['finance', 'budget', 'revenue', 'public finance'] },
  };

  private readonly PRECEDENTS = [
    {
      caseName: 'Trusted Society of Human Rights Alliance v Attorney General',
      court: 'High Court',
      relevantArticles: ['Article 2', 'Article 94'],
      outcome: 'Constitutional supremacy upheld',
      keywords: ['supremacy', 'constitution', 'parliament']
    },
    {
      caseName: 'Okiya Omtatah Okoiti v Attorney General',
      court: 'High Court', 
      relevantArticles: ['Article 47', 'Article 201'],
      outcome: 'Procedural fairness required in public finance',
      keywords: ['fair', 'procedure', 'finance']
    },
    {
      caseName: 'Coalition for Reform and Democracy v Republic',
      court: 'Supreme Court',
      relevantArticles: ['Article 2', 'Article 10'],
      outcome: 'Upheld constitutional values and principles',
      keywords: ['values', 'principles', 'constitution']
    },
  ];

  private readonly VIOLATION_PATTERNS = {
    bill_of_rights: [
      { pattern: /surveillance.*without.*warrant/i, article: 'Article 31', severity: 'high' as const },
      { pattern: /prohibit.*(?:speech|expression)/i, article: 'Article 33', severity: 'critical' as const },
      { pattern: /restrict.*(?:media|press)/i, article: 'Article 33', severity: 'high' as const },
    ],
    separation_powers: [
      { pattern: /minister.*may.*without.*parliament/i, article: 'Article 94', severity: 'high' as const },
      { pattern: /executive.*direct.*court/i, article: 'Article 165', severity: 'critical' as const },
      { pattern: /override.*judicial/i, article: 'Article 165', severity: 'critical' as const },
    ],
    procedural_fairness: [
      { pattern: /administrative.*without.*(?:hearing|appeal)/i, article: 'Article 47', severity: 'medium' as const },
      { pattern: /decision.*without.*notice/i, article: 'Article 47', severity: 'medium' as const },
    ],
    devolution: [
      { pattern: /national.*override.*county/i, article: 'Article 174', severity: 'high' as const },
      { pattern: /assume.*county.*functions/i, article: 'Article 174', severity: 'high' as const },
    ],
  };

  async analyze(input: ConstitutionalInput): Promise<ConstitutionalOutput> {
    const validatedInput = ConstitutionalInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Single-pass preprocessing
    const normalizedText = TextProcessor.normalize(validatedInput.billText);
    const tokens = TextProcessor.tokenize(validatedInput.billText);
    
    // Analyze for constitutional violations
    const violations = this.detectViolations(validatedInput, normalizedText);
    
    // Find relevant constitutional provisions
    const citedProvisions = this.identifyRelevantProvisions(validatedInput, normalizedText, tokens);
    
    // Find relevant precedents
    const precedents = this.findRelevantPrecedents(validatedInput, violations, tokens);
    
    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore(violations, citedProvisions);
    
    // Determine overall alignment
    const alignment = this.determineAlignment(alignmentScore, violations);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, citedProvisions);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(violations, citedProvisions);

    const result = {
      alignmentScore,
      confidence,
      alignment,
      violations,
      citedProvisions,
      precedents,
      recommendations,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private detectViolations(input: ConstitutionalInput, normalizedText: string) {
    const violations = [];

    // Pattern-based violation detection
    for (const [type, patterns] of Object.entries(this.VIOLATION_PATTERNS)) {
      const violationType = type as 'procedural_fairness' | 'separation_powers' | 'bill_of_rights' | 'devolution' | 'public_finance';
      for (const { pattern, article, severity } of patterns) {
        if (pattern.test(input.billText)) {
          violations.push({
            provision: article,
            violationType,
            severity,
            explanation: this.generateViolationExplanation(pattern, article),
            recommendedAction: this.getRecommendedAction(severity, type),
          });
        }
      }
    }

    // Bill type specific checks
    if (input.billType === 'money' && !normalizedText.includes('cabinet secretary')) {
      violations.push({
        provision: 'Article 110',
        violationType: 'public_finance' as const,
        severity: 'medium' as const,
        explanation: 'Money bills must be introduced by Cabinet Secretary for Finance',
        recommendedAction: 'Ensure proper introduction procedures for money bills',
      });
    }

    return violations;
  }

  private identifyRelevantProvisions(input: ConstitutionalInput, normalizedText: string, tokens: string[]) {
    const provisions = [];
    const tokenSet = new Set(tokens);

    for (const [article, info] of Object.entries(this.CONSTITUTIONAL_PROVISIONS)) {
      let matchScore = 0;
      
      // Check keyword matches
      for (const keyword of info.keywords) {
        if (tokenSet.has(keyword) || normalizedText.includes(keyword)) {
          matchScore += 1;
        }
      }

      if (matchScore === 0) continue;

      // Determine relevance
      let relevance: 'directly_applicable' | 'related' | 'contextual' = 'contextual';
      if (matchScore >= 3 || normalizedText.includes(info.title.toLowerCase())) {
        relevance = 'directly_applicable';
      } else if (matchScore >= 2) {
        relevance = 'related';
      }

      // Determine impact
      const impact = this.assessProvisionImpact(article, normalizedText);

      provisions.push({
        article,
        title: info.title,
        relevance,
        impact,
      });
    }

    return provisions;
  }

  private findRelevantPrecedents(input: ConstitutionalInput, violations: any[], tokens: string[]) {
    const relevantPrecedents = [];
    const tokenSet = new Set(tokens);

    for (const precedent of this.PRECEDENTS) {
      let relevance = 0;

      // Check if precedent relates to detected violations
      for (const violation of violations) {
        if (precedent.relevantArticles.includes(violation.provision)) {
          relevance += 0.8;
        }
      }

      // Check keyword matches
      for (const keyword of precedent.keywords) {
        if (tokenSet.has(keyword)) {
          relevance += 0.2;
        }
      }

      if (relevance > 0) {
        relevantPrecedents.push({
          caseName: precedent.caseName,
          court: precedent.court,
          relevance: Math.min(1, relevance),
          outcome: precedent.outcome,
        });
      }
    }

    return relevantPrecedents.sort((a, b) => b.relevance - a.relevance);
  }

  private calculateAlignmentScore(violations: any[], provisions: any[]): number {
    let score = 100;

    // Deduct points for violations
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }

    // Add points for positive constitutional alignment
    for (const provision of provisions) {
      if (provision.impact === 'positive' && provision.relevance === 'directly_applicable') {
        score += 8;
      } else if (provision.impact === 'positive') {
        score += 3;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private determineAlignment(score: number, violations: any[]): 'aligned' | 'concerning' | 'violates' | 'neutral' {
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    
    if (criticalViolations.length > 0) return 'violates';
    if (score < 60) return 'violates';
    if (score < 80) return 'concerning';
    if (score >= 90) return 'aligned';
    return 'neutral';
  }

  private generateRecommendations(violations: any[], provisions: any[]): string[] {
    const recommendations = new Set<string>();

    // Add specific recommendations for violations
    for (const violation of violations) {
      recommendations.add(violation.recommendedAction);
    }

    // Add general recommendations
    if (violations.length > 0) {
      recommendations.add('Conduct thorough constitutional review before enactment');
      if (violations.some(v => v.severity === 'critical' || v.severity === 'high')) {
        recommendations.add('Seek legal opinion from Attorney General or constitutional experts');
      }
    }

    // Add positive reinforcement
    const positiveProvisions = provisions.filter(p => p.impact === 'positive' && p.relevance === 'directly_applicable');
    if (positiveProvisions.length > 3) {
      recommendations.add('Bill demonstrates good constitutional alignment in several areas');
    }

    return Array.from(recommendations);
  }

  private calculateConfidence(violations: any[], provisions: any[]): number {
    let confidence = 0.7;
    confidence += Math.min(0.15, violations.length * 0.03);
    confidence += Math.min(0.15, provisions.length * 0.02);
    return Math.min(1.0, confidence);
  }

  private generateViolationExplanation(pattern: RegExp, article: string): string {
    const explanations: Record<string, string> = {
      'Article 31': 'Surveillance powers without warrant requirements may violate privacy rights',
      'Article 33': 'Restrictions on speech/media must meet constitutional standards',
      'Article 47': 'Administrative actions must include fair procedures and hearing rights',
      'Article 94': 'Excessive ministerial powers without parliamentary oversight',
      'Article 165': 'Executive direction of courts violates judicial independence',
      'Article 174': 'National government override of county functions violates devolution',
    };
    return explanations[article] || 'Potential constitutional concern detected';
  }

  private getRecommendedAction(severity: string, type: string): string {
    if (severity === 'critical') {
      return 'Remove or substantially revise this provision to ensure constitutional compliance';
    }
    if (severity === 'high') {
      return 'Include appropriate safeguards and oversight mechanisms';
    }
    return 'Review and clarify provision to address constitutional concerns';
  }

  private assessProvisionImpact(article: string, normalizedText: string): 'positive' | 'negative' | 'neutral' {
    const positivePatterns: Record<string, string[]> = {
      'Article 31': ['protect privacy', 'data protection', 'safeguard personal'],
      'Article 33': ['freedom of expression', 'media freedom', 'press freedom'],
      'Article 47': ['fair procedure', 'right to hearing', 'appeal process'],
      'Article 94': ['parliamentary oversight', 'legislative approval', 'accountability'],
      'Article 165': ['judicial independence', 'court autonomy', 'access to justice'],
    };

    const negativePatterns: Record<string, string[]> = {
      'Article 31': ['surveillance without', 'privacy violation', 'intrusion'],
      'Article 33': ['restrict speech', 'prohibit expression', 'censor media'],
      'Article 47': ['without hearing', 'no appeal', 'bypass procedure'],
      'Article 94': ['without parliament', 'bypass legislative', 'executive override'],
      'Article 165': ['executive control', 'direct judiciary', 'undermine courts'],
    };

    const positive = positivePatterns[article]?.some(p => normalizedText.includes(p)) || false;
    const negative = negativePatterns[article]?.some(p => normalizedText.includes(p)) || false;

    if (positive && !negative) return 'positive';
    if (negative && !positive) return 'negative';
    return 'neutral';
  }

  private generateCacheKey(input: ConstitutionalInput): string {
    return `${input.billTitle}-${input.billType}-${input.billText.substring(0, 100)}`;
  }

  getModelInfo() {
    return {
      name: 'Constitutional Analyzer',
      version: this.modelVersion,
      description: 'Analyzes legislation for constitutional compliance and violations',
      capabilities: [
        'Constitutional violation detection',
        'Bill of Rights analysis',
        'Separation of powers assessment',
        'Legal precedent matching',
        'Compliance scoring',
        'Performance optimization with caching'
      ]
    };
  }
}

export const constitutionalAnalyzer = new ConstitutionalAnalyzer();
