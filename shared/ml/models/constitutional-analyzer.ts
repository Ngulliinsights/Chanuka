// ============================================================================
// CONSTITUTIONAL ANALYZER - ML Model for Constitutional Compliance
// ============================================================================
// Analyzes bills for constitutional violations and alignment

import { z } from 'zod';

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
  private modelVersion = '2.0.0';
  
  // Constitutional provisions database (simplified)
  private readonly CONSTITUTIONAL_PROVISIONS = {
    'Article 2': { title: 'Supremacy of Constitution', chapter: 1 },
    'Article 10': { title: 'National Values and Principles', chapter: 2 },
    'Article 19': { title: 'Bill of Rights - General', chapter: 4 },
    'Article 31': { title: 'Privacy', chapter: 4 },
    'Article 33': { title: 'Freedom of Expression', chapter: 4 },
    'Article 47': { title: 'Fair Administrative Action', chapter: 4 },
    'Article 94': { title: 'Role of Parliament', chapter: 8 },
    'Article 96': { title: 'Senate Powers', chapter: 8 },
    'Article 110': { title: 'Money Bills', chapter: 8 },
    'Article 165': { title: 'Judicial Authority', chapter: 10 },
    'Article 174': { title: 'Objects of Devolution', chapter: 11 },
    'Article 201': { title: 'Principles of Public Finance', chapter: 12 },
  };

  // Legal precedents database (simplified)
  private readonly PRECEDENTS = [
    {
      caseName: 'Trusted Society of Human Rights Alliance v Attorney General',
      court: 'High Court',
      relevantArticles: ['Article 2', 'Article 94'],
      outcome: 'Constitutional supremacy upheld',
    },
    {
      caseName: 'Okiya Omtatah Okoiti v Attorney General',
      court: 'High Court', 
      relevantArticles: ['Article 47', 'Article 201'],
      outcome: 'Procedural fairness required in public finance',
    },
  ];

  async analyze(input: ConstitutionalInput): Promise<ConstitutionalOutput> {
    const validatedInput = ConstitutionalInputSchema.parse(input);
    
    // Analyze for constitutional violations
    const violations = await this.detectViolations(validatedInput);
    
    // Find relevant constitutional provisions
    const citedProvisions = this.identifyRelevantProvisions(validatedInput);
    
    // Find relevant precedents
    const precedents = this.findRelevantPrecedents(validatedInput, violations);
    
    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore(violations, citedProvisions);
    
    // Determine overall alignment
    const alignment = this.determineAlignment(alignmentScore, violations);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, citedProvisions);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(violations, citedProvisions);

    return {
      alignmentScore,
      confidence,
      alignment,
      violations,
      citedProvisions,
      precedents,
      recommendations,
    };
  }

  private async detectViolations(input: ConstitutionalInput) {
    const violations = [];

    // Check for Bill of Rights violations
    const rightsViolations = this.checkBillOfRights(input);
    violations.push(...rightsViolations);

    // Check for separation of powers issues
    const powerViolations = this.checkSeparationOfPowers(input);
    violations.push(...powerViolations);

    // Check procedural fairness
    const proceduralViolations = this.checkProceduralFairness(input);
    violations.push(...proceduralViolations);

    // Check devolution principles
    const devolutionViolations = this.checkDevolution(input);
    violations.push(...devolutionViolations);

    // Check public finance principles
    const financeViolations = this.checkPublicFinance(input);
    violations.push(...financeViolations);

    return violations;
  }

  private checkBillOfRights(input: ConstitutionalInput) {
    const violations = [];
    const text = input.billText.toLowerCase();

    // Privacy violations (Article 31)
    if (text.includes('surveillance') && !text.includes('warrant')) {
      violations.push({
        provision: 'Article 31',
        violationType: 'bill_of_rights' as const,
        severity: 'high' as const,
        explanation: 'Surveillance powers without warrant requirements may violate privacy rights',
        recommendedAction: 'Include warrant requirements and judicial oversight',
      });
    }

    // Freedom of expression violations (Article 33)
    if (text.includes('prohibit') && (text.includes('speech') || text.includes('expression'))) {
      violations.push({
        provision: 'Article 33',
        violationType: 'bill_of_rights' as const,
        severity: 'critical' as const,
        explanation: 'Restrictions on speech must meet constitutional standards',
        recommendedAction: 'Ensure restrictions are reasonable and justifiable in an open society',
      });
    }

    return violations;
  }

  private checkSeparationOfPowers(input: ConstitutionalInput) {
    const violations = [];
    const text = input.billText.toLowerCase();

    // Executive overreach
    if (text.includes('minister may') && text.includes('without') && text.includes('parliament')) {
      violations.push({
        provision: 'Article 94',
        violationType: 'separation_powers' as const,
        severity: 'high' as const,
        explanation: 'Excessive ministerial powers without parliamentary oversight',
        recommendedAction: 'Include parliamentary approval mechanisms',
      });
    }

    // Judicial independence
    if (text.includes('court') && text.includes('direct') && text.includes('executive')) {
      violations.push({
        provision: 'Article 165',
        violationType: 'separation_powers' as const,
        severity: 'critical' as const,
        explanation: 'Executive direction of courts violates judicial independence',
        recommendedAction: 'Remove provisions allowing executive control of judiciary',
      });
    }

    return violations;
  }

  private checkProceduralFairness(input: ConstitutionalInput) {
    const violations = [];
    const text = input.billText.toLowerCase();

    // Administrative action without fair procedures
    if (text.includes('administrative') && !text.includes('hearing') && !text.includes('appeal')) {
      violations.push({
        provision: 'Article 47',
        violationType: 'procedural_fairness' as const,
        severity: 'medium' as const,
        explanation: 'Administrative actions must include fair procedures',
        recommendedAction: 'Include hearing rights and appeal mechanisms',
      });
    }

    return violations;
  }

  private checkDevolution(input: ConstitutionalInput) {
    const violations = [];
    const text = input.billText.toLowerCase();

    // County government interference
    if (text.includes('county') && text.includes('national government') && text.includes('override')) {
      violations.push({
        provision: 'Article 174',
        violationType: 'devolution' as const,
        severity: 'high' as const,
        explanation: 'National government override of county functions violates devolution',
        recommendedAction: 'Respect county government autonomy in devolved functions',
      });
    }

    return violations;
  }

  private checkPublicFinance(input: ConstitutionalInput) {
    const violations = [];
    const text = input.billText.toLowerCase();

    // Money bill procedures
    if (input.billType === 'money' && !text.includes('cabinet secretary')) {
      violations.push({
        provision: 'Article 110',
        violationType: 'public_finance' as const,
        severity: 'medium' as const,
        explanation: 'Money bills must be introduced by Cabinet Secretary',
        recommendedAction: 'Ensure proper introduction procedures for money bills',
      });
    }

    return violations;
  }

  private identifyRelevantProvisions(input: ConstitutionalInput) {
    const provisions = [];
    const text = input.billText.toLowerCase();

    // Scan for constitutional keywords and map to articles
    for (const [article, info] of Object.entries(this.CONSTITUTIONAL_PROVISIONS)) {
      let relevance: 'directly_applicable' | 'related' | 'contextual' = 'contextual';
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';

      // Determine relevance based on content
      if (text.includes(info.title.toLowerCase())) {
        relevance = 'directly_applicable';
      } else if (this.isRelatedToProvision(text, article)) {
        relevance = 'related';
      }

      // Determine impact
      if (this.hasNegativeImpact(text, article)) {
        impact = 'negative';
      } else if (this.hasPositiveImpact(text, article)) {
        impact = 'positive';
      }

      if (relevance !== 'contextual' || impact !== 'neutral') {
        provisions.push({
          article,
          title: info.title,
          relevance,
          impact,
        });
      }
    }

    return provisions;
  }

  private findRelevantPrecedents(input: ConstitutionalInput, violations: any[]) {
    const relevantPrecedents = [];

    for (const precedent of this.PRECEDENTS) {
      let relevance = 0;

      // Check if precedent relates to detected violations
      for (const violation of violations) {
        if (precedent.relevantArticles.includes(violation.provision)) {
          relevance += 0.8;
        }
      }

      // Check if precedent relates to bill content
      const text = input.billText.toLowerCase();
      for (const article of precedent.relevantArticles) {
        if (text.includes(article.toLowerCase())) {
          relevance += 0.3;
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
    let score = 100; // Start with perfect alignment

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
      if (provision.impact === 'positive') {
        score += 5;
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
    const recommendations = [];

    // Add specific recommendations for violations
    for (const violation of violations) {
      recommendations.push(violation.recommendedAction);
    }

    // Add general recommendations
    if (violations.length > 0) {
      recommendations.push('Conduct thorough constitutional review before enactment');
      recommendations.push('Consider public participation in constitutional assessment');
    }

    // Add positive reinforcement
    const positiveProvisions = provisions.filter(p => p.impact === 'positive');
    if (positiveProvisions.length > 0) {
      recommendations.push('Bill demonstrates good constitutional alignment in several areas');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private calculateConfidence(violations: any[], provisions: any[]): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence with more analysis points
    confidence += Math.min(0.2, violations.length * 0.05);
    confidence += Math.min(0.1, provisions.length * 0.02);

    return Math.min(1.0, confidence);
  }

  // Helper methods
  private isRelatedToProvision(text: string, article: string): boolean {
    const keywords = {
      'Article 2': ['constitution', 'supremacy', 'law'],
      'Article 10': ['values', 'principles', 'governance'],
      'Article 31': ['privacy', 'personal', 'information'],
      'Article 33': ['expression', 'speech', 'media'],
      'Article 47': ['administrative', 'procedure', 'fair'],
      'Article 94': ['parliament', 'legislative', 'oversight'],
      'Article 165': ['court', 'judicial', 'judge'],
      'Article 174': ['county', 'devolution', 'local'],
      'Article 201': ['finance', 'budget', 'money'],
    };

    const articleKeywords = keywords[article as keyof typeof keywords] || [];
    return articleKeywords.some(keyword => text.includes(keyword));
  }

  private hasNegativeImpact(text: string, article: string): boolean {
    const negativePatterns = {
      'Article 31': ['surveillance without warrant', 'privacy violation'],
      'Article 33': ['restrict speech', 'prohibit expression'],
      'Article 47': ['without hearing', 'no appeal'],
      'Article 94': ['without parliament', 'bypass legislative'],
      'Article 165': ['executive control court', 'direct judiciary'],
    };

    const patterns = negativePatterns[article as keyof typeof negativePatterns] || [];
    return patterns.some(pattern => text.includes(pattern));
  }

  private hasPositiveImpact(text: string, article: string): boolean {
    const positivePatterns = {
      'Article 31': ['protect privacy', 'data protection'],
      'Article 33': ['freedom of expression', 'media freedom'],
      'Article 47': ['fair procedure', 'right to hearing'],
      'Article 94': ['parliamentary oversight', 'legislative approval'],
      'Article 165': ['judicial independence', 'court autonomy'],
    };

    const patterns = positivePatterns[article as keyof typeof positivePatterns] || [];
    return patterns.some(pattern => text.includes(pattern));
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
        'Compliance scoring'
      ]
    };
  }
}

export const constitutionalAnalyzer = new ConstitutionalAnalyzer();