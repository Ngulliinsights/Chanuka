// ============================================================================
// TROJAN BILL DETECTOR - ML Model for Hidden Agenda Detection (OPTIMIZED)
// ============================================================================
// Detects hidden provisions and deceptive techniques in legislation

import { z } from 'zod';
import { TextProcessor, Cache } from './shared_utils';

export const TrojanBillInputSchema = z.object({
  billText: z.string().min(1),
  billTitle: z.string().min(1),
  statedPurpose: z.string().optional(),
  pageCount: z.number().positive(),
  scheduleCount: z.number().nonnegative(),
  amendmentCount: z.number().nonnegative(),
  consultationPeriod: z.number().nonnegative(),
  urgencyLevel: z.enum(['routine', 'normal', 'urgent', 'emergency']),
  sponsorHistory: z.array(z.string()).optional(),
});

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
  private modelVersion = '2.1.0';
  private cache = new Cache<TrojanBillOutput>(600); // 10 minute cache
  
  private readonly SIGNAL_WEIGHTS = {
    page_count_high: 15,
    schedule_heavy: 20,
    rushed_timeline: 25,
    minimal_consultation: 20,
    technical_jargon_density: 15,
    broad_ministerial_powers: 30,
    weak_oversight: 25,
    late_amendments: 20,
  };

  private readonly SUSPICIOUS_PATTERNS = [
    {
      pattern: /minister\s+may\s+(?:\w+\s+){0,5}without\s+(?:\w+\s+){0,3}oversight/gi,
      severity: 'high' as const,
      agenda: 'Grants excessive ministerial discretion without oversight',
      rights: ['Accountability', 'Parliamentary Oversight']
    },
    {
      pattern: /notwithstanding\s+(?:any|the)\s+(?:\w+\s+){0,3}constitution/gi,
      severity: 'critical' as const,
      agenda: 'Overrides constitutional protections',
      rights: ['Constitutional Rights']
    },
    {
      pattern: /deemed\s+(?:\w+\s+){0,3}necessary\s+(?:\w+\s+){0,3}minister/gi,
      severity: 'high' as const,
      agenda: 'Grants broad discretionary powers',
      rights: ['Due Process']
    },
    {
      pattern: /such\s+(?:\w+\s+){0,5}(?:minister|cabinet)\s+(?:\w+\s+){0,3}fit/gi,
      severity: 'medium' as const,
      agenda: 'Vague language grants undefined powers',
      rights: ['Legal Certainty']
    },
    {
      pattern: /without\s+(?:\w+\s+){0,3}judicial\s+review/gi,
      severity: 'critical' as const,
      agenda: 'Removes judicial oversight mechanisms',
      rights: ['Right to Fair Hearing', 'Judicial Review']
    },
  ];

  async analyze(input: TrojanBillInput): Promise<TrojanBillOutput> {
    const validatedInput = TrojanBillInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Single-pass preprocessing
    const normalizedText = TextProcessor.normalize(validatedInput.billText);
    const tokens = TextProcessor.tokenize(validatedInput.billText);
    
    // Extract detection signals
    const signals = this.extractDetectionSignals(validatedInput, normalizedText, tokens);
    
    // Analyze text for hidden provisions
    const hiddenProvisions = this.detectHiddenProvisions(validatedInput, normalizedText);
    
    // Identify deception techniques
    const techniques = this.identifyDeceptionTechniques(validatedInput, normalizedText, tokens);
    
    // Extract red flags
    const redFlags = this.extractRedFlags(validatedInput, signals, normalizedText);
    
    // Calculate overall risk score
    const trojanRiskScore = this.calculateRiskScore(signals, hiddenProvisions, techniques);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(signals, hiddenProvisions);

    const result = {
      trojanRiskScore,
      confidence,
      hiddenProvisions,
      redFlags,
      deceptionTechniques: techniques,
      detectionSignals: signals,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private extractDetectionSignals(input: TrojanBillInput, _normalizedText: string, tokens: string[]) {
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

    // Technical jargon density
    const jargonDensity = this.calculateJargonDensity(tokens);
    if (jargonDensity > 0.3) {
      signals.push({
        signalType: 'technical_jargon_density',
        value: jargonDensity,
        threshold: 0.3,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.technical_jargon_density,
      });
    }

    // Broad ministerial powers
    const ministerialPowerCount = (input.billText.match(/minister may/gi) || []).length;
    if (ministerialPowerCount > 10) {
      signals.push({
        signalType: 'broad_ministerial_powers',
        value: ministerialPowerCount,
        threshold: 10,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.broad_ministerial_powers,
      });
    }

    // Weak oversight
    const oversightMentions = (_normalizedText.match(/\b(oversight|review|appeal|accountability)\b/g) || []).length;
    if (oversightMentions < 5) {
      signals.push({
        signalType: 'weak_oversight',
        value: oversightMentions,
        threshold: 5,
        exceeded: true,
        riskWeight: this.SIGNAL_WEIGHTS.weak_oversight,
      });
    }

    return signals;
  }

  private detectHiddenProvisions(input: TrojanBillInput, _normalizedText: string) {
    const provisions = [];

    for (const { pattern, severity, agenda, rights } of this.SUSPICIOUS_PATTERNS) {
      const matches = input.billText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const section = this.extractSectionReference(input.billText, match);
          const constitutionalConcern = this.identifyConstitutionalConcern(match);
          
          provisions.push({
            section,
            statedPurpose: input.statedPurpose || 'Not specified',
            hiddenAgenda: agenda,
            severity,
            constitutionalConcern,
            affectedRights: rights,
          });
        }
      }
    }

    return provisions;
  }

  private identifyDeceptionTechniques(input: TrojanBillInput, _normalizedText: string, tokens: string[]) {
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
    const jargonDensity = this.calculateJargonDensity(tokens);
    if (jargonDensity > 0.25) {
      techniques.push({
        technique: 'technical_language' as const,
        effectiveness: Math.floor(jargonDensity * 10),
        example: `${Math.round(jargonDensity * 100)}% jargon density obscures true meaning`,
      });
    }

    // Cross-references
    const crossRefCount = (input.billText.match(/pursuant to|in accordance with|as provided/gi) || []).length;
    if (crossRefCount > 20) {
      techniques.push({
        technique: 'cross_references' as const,
        effectiveness: Math.min(10, Math.floor(crossRefCount / 5)),
        example: `${crossRefCount} cross-references complicate comprehension`,
      });
    }

    // Vague language
    const vagueTerms = ['such', 'necessary', 'appropriate', 'reasonable', 'adequate'];
    let vagueCount = 0;
    for (const term of vagueTerms) {
      vagueCount += tokens.filter(t => t === term).length;
    }
    if (vagueCount > 30) {
      techniques.push({
        technique: 'vague_language' as const,
        effectiveness: Math.min(10, Math.floor(vagueCount / 5)),
        example: `${vagueCount} vague terms reduce legal certainty`,
      });
    }

    return techniques;
  }

  private extractRedFlags(input: TrojanBillInput, _signals: any[], _normalizedText: string) {
    const flags = new Set<'rushed_process' | 'buried_provisions' | 'vague_language' | 'excessive_powers' | 'weak_oversight' | 'undefined_terms'>();

    if (input.consultationPeriod < 30) flags.add('rushed_process');
    if (input.pageCount > 100) flags.add('buried_provisions');
    
    const jargonDensity = this.calculateJargonDensity(TextProcessor.tokenize(input.billText));
    if (jargonDensity > 0.3) flags.add('vague_language');
    
    if (_normalizedText.includes('minister may') && _normalizedText.includes('without')) {
      flags.add('excessive_powers');
    }
    
    const oversightMentions = (_normalizedText.match(/\b(oversight|review|appeal)\b/g) || []).length;
    if (oversightMentions < 3) flags.add('weak_oversight');
    
    const vagueTermCount = (_normalizedText.match(/\b(such|necessary|appropriate|deemed)\b/g) || []).length;
    if (vagueTermCount > 20) flags.add('undefined_terms');

    return Array.from(flags);
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
    let confidence = 0.5;
    confidence += Math.min(0.25, signals.length * 0.05);
    confidence += Math.min(0.25, provisions.length * 0.08);
    return Math.min(1.0, confidence);
  }

  private calculateJargonDensity(tokens: string[]): number {
    const jargonWords = tokens.filter(word => 
      word.length > 12 || 
      /^[A-Z]{2,}$/.test(word) ||
      ['pursuant', 'notwithstanding', 'aforementioned', 'hereinafter', 'whereby'].includes(word)
    );
    return tokens.length > 0 ? jargonWords.length / tokens.length : 0;
  }

  private extractSectionReference(text: string, match: string): string {
    const beforeMatch = text.substring(0, text.indexOf(match));
    const sectionPattern = /section\s+\d+/gi;
    const sections = beforeMatch.match(sectionPattern);
    return sections && sections.length > 0 ? sections[sections.length - 1]! : 'Unknown section';
  }

  private identifyConstitutionalConcern(match: string): string | undefined {
    const lowerMatch = match.toLowerCase();
    if (lowerMatch.includes('judicial')) return 'Article 165 (Judicial Authority)';
    if (lowerMatch.includes('oversight') || lowerMatch.includes('parliament')) return 'Article 94 (Parliamentary Oversight)';
    if (lowerMatch.includes('constitution')) return 'Article 2 (Supremacy of Constitution)';
    if (lowerMatch.includes('fair') || lowerMatch.includes('administrative')) return 'Article 47 (Fair Administrative Action)';
    return undefined;
  }

  private generateCacheKey(input: TrojanBillInput): string {
    return `${input.billTitle}-${input.pageCount}-${input.scheduleCount}-${input.consultationPeriod}`;
  }

  getModelInfo() {
    return {
      name: 'Trojan Bill Detector',
      version: this.modelVersion,
      description: 'Detects hidden agendas and deceptive techniques in legislation',
      capabilities: [
        'Hidden provision detection with pattern matching',
        'Deception technique identification',
        'Risk scoring with signal weighting',
        'Constitutional impact assessment',
        'Performance optimization with caching'
      ]
    };
  }
}

export const trojanBillDetector = new TrojanBillDetector();
