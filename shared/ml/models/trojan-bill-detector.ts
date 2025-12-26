// ============================================================================
// TROJAN BILL DETECTOR - ML Model for Hidden Agenda Detection
// ============================================================================
// Detects hidden provisions and deceptive techniques in legislation

import { z } from 'zod';

// Input schema for bill analysis
export const TrojanBillInputSchema = z.object({
  billText: z.string().min(1),
  billTitle: z.string().min(1),
  statedPurpose: z.string().optional(),
  pageCount: z.number().positive(),
  scheduleCount: z.number().nonnegative(),
  amendmentCount: z.number().nonnegative(),
  consultationPeriod: z.number().nonnegative(), // days
  urgencyLevel: z.enum(['routine', 'normal', 'urgent', 'emergency']),
  sponsorHistory: z.array(z.string()).optional(),
});

// Output schema for detection results
export const TrojanBillOutputSchema = z.object({
  trojanRiskScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  hiddenProvisions: z.array(z.object({
    section: z.string(),
    statedPurpose: z.string(),
    hiddenAgenda: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    constitutionalConcern: z.string().optional(),
    affectedRights: z.array(z.string()),
  })),
  redFlags: z.array(z.enum([
    'rushed_process',
    'buried_provisions', 
    'vague_language',
    'excessive_powers',
    'weak_oversight',
    'undefined_terms'
  ])),
  deceptionTechniques: z.array(z.object({
    technique: z.enum([
      'burying',
      'technical_language',
      'definitions',
      'schedules',
      'cross_references',
      'vague_language',
      'broad_discretion'
    ]),
    effectiveness: z.number().min(1).max(10),
    example: z.string(),
  })),
  detectionSignals: z.array(z.object({
    signalType: z.string(),
    value: z.number(),
    threshold: z.number(),
    exceeded: z.boolean(),
    riskWeight: z.number().min(0).max(100),
  })),
});

export type TrojanBillInput = z.infer<typeof TrojanBillInputSchema>;
export type TrojanBillOutput = z.infer<typeof TrojanBillOutputSchema>;

export class TrojanBillDetector {
  private modelVersion = '2.0.0';
  
  // Risk thresholds
  private readonly RISK_THRESHOLDS = {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 90
  };

  // Signal weights for risk calculation
  private readonly SIGNAL_WEIGHTS = {
    page_count_high: 15,        // Bills over 100 pages
    schedule_heavy: 20,         // Heavy use of schedules
    rushed_timeline: 25,        // Less than 30 days consultation
    minimal_consultation: 20,   // No public input
    technical_jargon_density: 15, // Hard to read
    broad_ministerial_powers: 30, // Excessive discretion
    weak_oversight: 25,         // No checks and balances
    late_amendments: 20,        // Last-minute changes
  };

  async analyze(input: TrojanBillInput): Promise<TrojanBillOutput> {
    // Validate input
    const validatedInput = TrojanBillInputSchema.parse(input);
    
    // Extract detection signals
    const signals = this.extractDetectionSignals(validatedInput);
    
    // Analyze text for hidden provisions
    const hiddenProvisions = await this.detectHiddenProvisions(validatedInput);
    
    // Identify deception techniques
    const techniques = this.identifyDeceptionTechniques(validatedInput);
    
    // Extract red flags
    const redFlags = this.extractRedFlags(validatedInput, signals);
    
    // Calculate overall risk score
    const trojanRiskScore = this.calculateRiskScore(signals, hiddenProvisions, techniques);
    
    // Calculate confidence based on signal strength
    const confidence = this.calculateConfidence(signals, hiddenProvisions);

    return {
      trojanRiskScore,
      confidence,
      hiddenProvisions,
      redFlags,
      deceptionTechniques: techniques,
      detectionSignals: signals,
    };
  }

  private extractDetectionSignals(input: TrojanBillInput) {
    const signals = [];

    // Page count signal
    if (input.pageCount > 100) {
      signals.push({
        signalType: 'page_count_high',
        value: input.pageCount,
        threshold: 100,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.page_count_high,
      });
    }

    // Schedule heavy signal
    if (input.scheduleCount > 5) {
      signals.push({
        signalType: 'schedule_heavy',
        value: input.scheduleCount,
        threshold: 5,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.schedule_heavy,
      });
    }

    // Rushed timeline signal
    if (input.consultationPeriod < 30) {
      signals.push({
        signalType: 'rushed_timeline',
        value: input.consultationPeriod,
        threshold: 30,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.rushed_timeline,
      });
    }

    // Minimal consultation signal
    if (input.consultationPeriod === 0) {
      signals.push({
        signalType: 'minimal_consultation',
        value: 0,
        threshold: 1,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.minimal_consultation,
      });
    }

    // Technical jargon density (simplified heuristic)
    const jargonDensity = this.calculateJargonDensity(input.billText);
    if (jargonDensity > 0.3) {
      signals.push({
        signalType: 'technical_jargon_density',
        value: jargonDensity,
        threshold: 0.3,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.technical_jargon_density,
      });
    }

    return signals;
  }

  private async detectHiddenProvisions(input: TrojanBillInput) {
    const provisions = [];
    
    // Simplified NLP analysis for hidden provisions
    const suspiciousPatterns = [
      /minister may.*without.*oversight/gi,
      /notwithstanding.*constitution/gi,
      /deemed.*necessary.*minister/gi,
      /such.*regulations.*minister.*fit/gi,
      /without.*judicial.*review/gi,
    ];

    for (const pattern of suspiciousPatterns) {
      const matches = input.billText.match(pattern);
      if (matches) {
        for (const match of matches) {
          provisions.push({
            section: this.extractSectionReference(input.billText, match),
            statedPurpose: input.statedPurpose || 'Not specified',
            hiddenAgenda: this.analyzeHiddenAgenda(match),
            severity: this.assessSeverity(match) as 'low' | 'medium' | 'high' | 'critical',
            constitutionalConcern: this.identifyConstitutionalConcern(match),
            affectedRights: this.identifyAffectedRights(match),
          });
        }
      }
    }

    return provisions;
  }

  private identifyDeceptionTechniques(input: TrojanBillInput) {
    const techniques = [];

    // Burying technique (long bills)
    if (input.pageCount > 100) {
      techniques.push({
        technique: 'burying' as const,
        effectiveness: Math.min(10, Math.floor(input.pageCount / 20)),
        example: `Bill is ${input.pageCount} pages long, making detailed review difficult`,
      });
    }

    // Schedule hiding
    if (input.scheduleCount > 3) {
      techniques.push({
        technique: 'schedules' as const,
        effectiveness: Math.min(10, input.scheduleCount),
        example: `Important provisions hidden in ${input.scheduleCount} schedules`,
      });
    }

    // Technical language
    const jargonDensity = this.calculateJargonDensity(input.billText);
    if (jargonDensity > 0.25) {
      techniques.push({
        technique: 'technical_language' as const,
        effectiveness: Math.floor(jargonDensity * 10),
        example: 'Heavy use of technical jargon obscures true meaning',
      });
    }

    return techniques;
  }

  private extractRedFlags(input: TrojanBillInput, signals: any[]) {
    const flags = [];

    if (input.consultationPeriod < 30) flags.push('rushed_process');
    if (input.pageCount > 100) flags.push('buried_provisions');
    if (this.calculateJargonDensity(input.billText) > 0.3) flags.push('vague_language');
    if (input.billText.includes('minister may') && input.billText.includes('without')) flags.push('excessive_powers');
    if (!input.billText.includes('oversight') && !input.billText.includes('review')) flags.push('weak_oversight');
    if (input.billText.includes('such') && input.billText.includes('necessary')) flags.push('undefined_terms');

    return flags as Array<'rushed_process' | 'buried_provisions' | 'vague_language' | 'excessive_powers' | 'weak_oversight' | 'undefined_terms'>;
  }

  private calculateRiskScore(signals: any[], provisions: any[], techniques: any[]): number {
    let score = 0;

    // Base score from signals
    for (const signal of signals) {
      if (signal.exceeded) {
        score += signal.riskWeight;
      }
    }

    // Additional score from hidden provisions
    score += provisions.length * 15;
    
    // Severity multiplier
    for (const provision of provisions) {
      switch (provision.severity) {
        case 'critical': score += 20; break;
        case 'high': score += 15; break;
        case 'medium': score += 10; break;
        case 'low': score += 5; break;
      }
    }

    // Technique effectiveness
    for (const technique of techniques) {
      score += technique.effectiveness * 2;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateConfidence(signals: any[], provisions: any[]): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence with more signals
    confidence += signals.length * 0.1;
    
    // Increase confidence with detected provisions
    confidence += provisions.length * 0.15;

    // Cap at 1.0
    return Math.min(1.0, confidence);
  }

  // Helper methods
  private calculateJargonDensity(text: string): number {
    const words = text.split(/\s+/);
    const jargonWords = words.filter(word => 
      word.length > 12 || 
      /^[A-Z]{2,}$/.test(word) ||
      word.includes('pursuant') ||
      word.includes('notwithstanding') ||
      word.includes('aforementioned')
    );
    return jargonWords.length / words.length;
  }

  private extractSectionReference(text: string, match: string): string {
    const sectionPattern = /section\s+\d+/gi;
    const beforeMatch = text.substring(0, text.indexOf(match));
    const sections = beforeMatch.match(sectionPattern);
    return sections ? sections[sections.length - 1] : 'Unknown section';
  }

  private analyzeHiddenAgenda(match: string): string {
    if (match.includes('minister may')) return 'Grants excessive ministerial discretion';
    if (match.includes('without oversight')) return 'Removes accountability mechanisms';
    if (match.includes('notwithstanding')) return 'Overrides constitutional protections';
    return 'Potentially problematic provision';
  }

  private assessSeverity(match: string): string {
    if (match.includes('constitution') || match.includes('judicial review')) return 'critical';
    if (match.includes('minister may') && match.includes('without')) return 'high';
    if (match.includes('oversight')) return 'medium';
    return 'low';
  }

  private identifyConstitutionalConcern(match: string): string | undefined {
    if (match.includes('judicial')) return 'Article 165 (Judicial Authority)';
    if (match.includes('oversight')) return 'Article 94 (Parliamentary Oversight)';
    if (match.includes('constitution')) return 'Article 2 (Supremacy of Constitution)';
    return undefined;
  }

  private identifyAffectedRights(match: string): string[] {
    const rights = [];
    if (match.includes('property')) rights.push('Property Rights');
    if (match.includes('privacy')) rights.push('Privacy Rights');
    if (match.includes('expression')) rights.push('Freedom of Expression');
    if (match.includes('assembly')) rights.push('Freedom of Assembly');
    return rights;
  }

  getModelInfo() {
    return {
      name: 'Trojan Bill Detector',
      version: this.modelVersion,
      description: 'Detects hidden agendas and deceptive techniques in legislation',
      capabilities: [
        'Hidden provision detection',
        'Deception technique identification',
        'Risk scoring',
        'Constitutional impact assessment'
      ]
    };
  }
}

export const trojanBillDetector = new TrojanBillDetector();