// ============================================================================
// CONFLICT DETECTOR - ML Model for Conflict of Interest Detection (OPTIMIZED)
// ============================================================================
// Detects financial and other conflicts of interest between sponsors and bills

import { z } from 'zod';

import { TextProcessor, Statistics, DateUtils, Cache } from './shared_utils';

export const ConflictInputSchema = z.object({
  billId: z.string().uuid(),
  billText: z.string().min(1),
  billTitle: z.string().min(1),
  billSector: z.string().optional(),
  sponsorId: z.string().uuid(),
  sponsorFinancialInterests: z.array(z.object({
    type: z.enum(['stock', 'business', 'property', 'income', 'gift', 'loan']),
    entityName: z.string(),
    sector: z.string(),
    value: z.number().optional(),
    ownershipPercentage: z.number().optional(),
  })),
  sponsorEmploymentHistory: z.array(z.object({
    employer: z.string(),
    position: z.string(),
    sector: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
  })).optional(),
  sponsorFamilyConnections: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    interests: z.array(z.string()),
  })).optional(),
});

export const ConflictOutputSchema = z.object({
  hasConflict: z.boolean(),
  conflictScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  conflicts: z.array(z.object({
    type: z.enum(['financial', 'employment', 'familial', 'organizational', 'political']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    evidence: z.array(z.string()),
    affectedProvisions: z.array(z.string()),
    recommendedAction: z.enum(['disclosure', 'recusal', 'divestiture', 'investigation']),
  })),
  riskFactors: z.array(z.object({
    factor: z.string(),
    weight: z.number(),
    present: z.boolean(),
  })),
  disclosureQuality: z.enum(['complete', 'partial', 'inadequate', 'none']),
  recommendations: z.array(z.string()),
});

export type ConflictInput = z.infer<typeof ConflictInputSchema>;
export type ConflictOutput = z.infer<typeof ConflictOutputSchema>;

export class ConflictDetector {
  private modelVersion = '2.1.0';
  private cache = new Cache<ConflictOutput>(600); // 10 minute cache

  private readonly SECTOR_KEYWORDS = {
    'financial_services': ['bank', 'insurance', 'loan', 'credit', 'finance', 'investment', 'benki', 'mkopo'],
    'telecommunications': ['telecom', 'mobile', 'internet', 'communication', 'network', 'simu'],
    'energy': ['oil', 'gas', 'electricity', 'power', 'energy', 'petroleum', 'umeme', 'mafuta'],
    'healthcare': ['hospital', 'medical', 'health', 'pharmaceutical', 'drug', 'afya', 'dawa'],
    'real_estate': ['property', 'land', 'real estate', 'construction', 'housing', 'ardhi', 'nyumba'],
    'agriculture': ['farm', 'agriculture', 'crop', 'livestock', 'food', 'kilimo', 'mazao'],
    'mining': ['mining', 'mineral', 'extraction', 'quarry', 'madini'],
    'transport': ['transport', 'aviation', 'shipping', 'logistics', 'port', 'usafiri'],
    'education': ['school', 'university', 'education', 'training', 'elimu', 'chuo'],
    'media': ['media', 'television', 'radio', 'newspaper', 'broadcasting', 'habari'],
  };

  private readonly CONFLICT_WEIGHTS = {
    direct_financial_benefit: 40,
    regulatory_advantage: 35,
    competitive_advantage: 30,
    employment_history: 25,
    family_connection: 20,
    organizational_tie: 15,
    political_connection: 10,
  };

  async detect(input: ConflictInput): Promise<ConflictOutput> {
    const validatedInput = ConflictInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Single-pass preprocessing
    const normalizedText = TextProcessor.normalize(validatedInput.billText);
    const tokens = TextProcessor.tokenize(validatedInput.billText);
    const tokenSet = new Set(tokens);
    
    // Detect different types of conflicts
    const financialConflicts = this.detectFinancialConflicts(validatedInput, normalizedText, tokenSet);
    const employmentConflicts = this.detectEmploymentConflicts(validatedInput, normalizedText, tokenSet);
    const familialConflicts = this.detectFamilialConflicts(validatedInput, normalizedText, tokenSet);
    const organizationalConflicts = this.detectOrganizationalConflicts(validatedInput, tokens);
    
    const allConflicts = [
      ...financialConflicts,
      ...employmentConflicts,
      ...familialConflicts,
      ...organizationalConflicts,
    ];

    // Calculate risk factors
    const riskFactors = this.calculateRiskFactors(validatedInput, allConflicts);
    
    // Calculate overall conflict score
    const conflictScore = this.calculateConflictScore(allConflicts, riskFactors);
    
    // Assess disclosure quality
    const disclosureQuality = this.assessDisclosureQuality(validatedInput);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(allConflicts, disclosureQuality);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(allConflicts, validatedInput);

    const result = {
      hasConflict: allConflicts.length > 0,
      conflictScore,
      confidence,
      conflicts: allConflicts,
      riskFactors,
      disclosureQuality,
      recommendations,
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private detectFinancialConflicts(input: ConflictInput, normalizedText: string, tokenSet: Set<string>) {
    const conflicts = [];
    const billSector = this.identifyBillSector(normalizedText, tokenSet, input.billSector);

    for (const interest of input.sponsorFinancialInterests) {
      // Direct sector match
      if (interest.sector === billSector || this.areSectorsRelated(interest.sector, billSector)) {
        const severity = this.assessFinancialSeverity(interest, normalizedText);
        const affectedProvisions = this.findAffectedProvisions(input.billText, interest.sector);
        
        conflicts.push({
          type: 'financial' as const,
          severity,
          description: `Sponsor has ${interest.type} interest in ${interest.entityName} (${interest.sector} sector)`,
          evidence: [
            `Financial interest: ${interest.type} in ${interest.entityName}`,
            `Bill affects ${billSector} sector`,
            interest.value ? `Interest value: KES ${interest.value.toLocaleString()}` : '',
            interest.ownershipPercentage ? `Ownership: ${interest.ownershipPercentage}%` : ''
          ].filter(Boolean),
          affectedProvisions,
          recommendedAction: severity === 'critical' ? 'recusal' : 
                           severity === 'high' ? 'divestiture' : 'disclosure' as const,
        });
      }

      // Indirect benefits through bill provisions
      const indirectBenefits = this.findIndirectBenefits(normalizedText, interest, tokenSet);
      if (indirectBenefits.length > 0) {
        conflicts.push({
          type: 'financial' as const,
          severity: 'medium' as const,
          description: `Bill may indirectly benefit sponsor's ${interest.type} in ${interest.entityName}`,
          evidence: indirectBenefits,
          affectedProvisions: this.findAffectedProvisions(input.billText, interest.sector),
          recommendedAction: 'disclosure' as const,
        });
      }
    }

    return conflicts;
  }

  private detectEmploymentConflicts(input: ConflictInput, normalizedText: string, tokenSet: Set<string>) {
    const conflicts = [];
    
    if (!input.sponsorEmploymentHistory) return conflicts;

    const billSector = this.identifyBillSector(normalizedText, tokenSet, input.billSector);

    for (const employment of input.sponsorEmploymentHistory) {
      const isRecent = DateUtils.isRecent(employment.endDate || new Date().toISOString(), 730); // 2 years
      
      // Recent employment in affected sector
      if (employment.sector === billSector && isRecent) {
        conflicts.push({
          type: 'employment' as const,
          severity: 'high' as const,
          description: `Sponsor recently employed by ${employment.employer} in affected sector`,
          evidence: [
            `Former position: ${employment.position} at ${employment.employer}`,
            `Employment period: ${employment.startDate} - ${employment.endDate || 'present'}`,
            `Sector match: ${employment.sector}`,
            `Days since employment: ${DateUtils.daysBetween(employment.endDate || new Date().toISOString(), new Date())}`,
          ],
          affectedProvisions: this.findAffectedProvisions(input.billText, employment.sector),
          recommendedAction: 'disclosure' as const,
        });
      }

      // Revolving door concerns
      const employerMentioned = tokenSet.has(employment.employer.toLowerCase()) ||
                               normalizedText.includes(employment.employer.toLowerCase());
      if (employerMentioned && isRecent) {
        conflicts.push({
          type: 'employment' as const,
          severity: 'medium' as const,
          description: `Potential revolving door conflict with ${employment.employer}`,
          evidence: [
            `Former employer: ${employment.employer}`,
            `Bill mentions or benefits former employer`,
            `Recent employment relationship`,
          ],
          affectedProvisions: [],
          recommendedAction: 'disclosure' as const,
        });
      }
    }

    return conflicts;
  }

  private detectFamilialConflicts(input: ConflictInput, normalizedText: string, tokenSet: Set<string>) {
    const conflicts = [];
    
    if (!input.sponsorFamilyConnections) return conflicts;

    const billSector = this.identifyBillSector(normalizedText, tokenSet, input.billSector);

    for (const family of input.sponsorFamilyConnections) {
      const relevantInterests = family.interests.filter(interest => {
        const interestLower = interest.toLowerCase();
        return normalizedText.includes(interestLower) || 
               interestLower.includes(billSector) ||
               this.isInterestRelevant(interest, billSector, tokenSet);
      });

      if (relevantInterests.length > 0) {
        conflicts.push({
          type: 'familial' as const,
          severity: 'medium' as const,
          description: `Family member ${family.name} (${family.relationship}) has interests affected by bill`,
          evidence: [
            `Family member: ${family.name} (${family.relationship})`,
            ...relevantInterests.map(interest => `Interest: ${interest}`),
          ],
          affectedProvisions: this.findAffectedProvisions(input.billText, billSector),
          recommendedAction: 'disclosure' as const,
        });
      }
    }

    return conflicts;
  }

  private detectOrganizationalConflicts(input: ConflictInput, tokens: string[]) {
    const conflicts = [];
    
    // Find organizational mentions
    const orgPatterns = [
      /\b[A-Z][a-z]+ (?:Association|Foundation|Institute|Corporation|Ltd|Limited)\b/g,
      /\b(?:Kenya|National) [A-Z][a-z]+ (?:Authority|Board|Commission)\b/g,
    ];

    const organizations = new Set<string>();
    for (const pattern of orgPatterns) {
      const matches = input.billText.match(pattern);
      if (matches) {
        matches.forEach(org => organizations.add(org));
      }
    }
    
    if (organizations.size > 5) {
      conflicts.push({
        type: 'organizational' as const,
        severity: 'low' as const,
        description: 'Bill specifically names multiple organizations that may benefit',
        evidence: Array.from(organizations).slice(0, 5),
        affectedProvisions: [],
        recommendedAction: 'disclosure' as const,
      });
    }

    return conflicts;
  }

  private calculateRiskFactors(input: ConflictInput, conflicts: any[]) {
    const factors = [
      {
        factor: 'High-value financial interests',
        weight: this.CONFLICT_WEIGHTS.direct_financial_benefit,
        present: input.sponsorFinancialInterests.some(i => (i.value || 0) > 1000000),
      },
      {
        factor: 'Recent employment in affected sector',
        weight: this.CONFLICT_WEIGHTS.employment_history,
        present: input.sponsorEmploymentHistory?.some(e => 
          DateUtils.isRecent(e.endDate || new Date().toISOString(), 730)
        ) || false,
      },
      {
        factor: 'Family connections to affected interests',
        weight: this.CONFLICT_WEIGHTS.family_connection,
        present: (input.sponsorFamilyConnections?.length || 0) > 0,
      },
      {
        factor: 'Multiple conflict types detected',
        weight: 30,
        present: new Set(conflicts.map(c => c.type)).size > 1,
      },
      {
        factor: 'Critical severity conflicts',
        weight: 35,
        present: conflicts.some(c => c.severity === 'critical'),
      },
      {
        factor: 'High percentage ownership',
        weight: 25,
        present: input.sponsorFinancialInterests.some(i => (i.ownershipPercentage || 0) > 25),
      },
    ];

    return factors;
  }

  private calculateConflictScore(conflicts: any[], riskFactors: any[]): number {
    let score = 0;

    // Base score from conflicts
    for (const conflict of conflicts) {
      switch (conflict.severity) {
        case 'critical': score += 40; break;
        case 'high': score += 30; break;
        case 'medium': score += 20; break;
        case 'low': score += 10; break;
      }
    }

    // Additional score from risk factors
    for (const factor of riskFactors) {
      if (factor.present) {
        score += factor.weight * 0.5;
      }
    }

    return Math.min(100, score);
  }

  private assessDisclosureQuality(input: ConflictInput): 'complete' | 'partial' | 'inadequate' | 'none' {
    const hasFinancialDisclosure = input.sponsorFinancialInterests.length > 0;
    const hasEmploymentDisclosure = input.sponsorEmploymentHistory && input.sponsorEmploymentHistory.length > 0;
    const hasFamilyDisclosure = input.sponsorFamilyConnections && input.sponsorFamilyConnections.length > 0;
    
    const detailedFinancial = input.sponsorFinancialInterests.some(i => i.value !== undefined);

    if (hasFinancialDisclosure && hasEmploymentDisclosure && hasFamilyDisclosure && detailedFinancial) {
      return 'complete';
    } else if (hasFinancialDisclosure && (hasEmploymentDisclosure || hasFamilyDisclosure)) {
      return 'partial';
    } else if (hasFinancialDisclosure) {
      return 'inadequate';
    } else {
      return 'none';
    }
  }

  private generateRecommendations(conflicts: any[], disclosureQuality: string): string[] {
    const recommendations = new Set<string>();

    if (conflicts.length === 0) {
      recommendations.add('No conflicts of interest detected based on provided information');
      if (disclosureQuality !== 'complete') {
        recommendations.add('Ensure comprehensive disclosure to rule out potential conflicts');
      }
      return Array.from(recommendations);
    }

    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const highConflicts = conflicts.filter(c => c.severity === 'high');

    if (criticalConflicts.length > 0) {
      recommendations.add('Sponsor should recuse themselves from voting on this bill');
      recommendations.add('Consider transferring sponsorship to another legislator without conflicts');
    }

    if (highConflicts.length > 0) {
      recommendations.add('Sponsor should consider divesting conflicting interests');
      recommendations.add('Full public disclosure of all relevant interests required');
      recommendations.add('Establish a blind trust for managing conflicting assets');
    }

    if (conflicts.some(c => c.type === 'financial')) {
      recommendations.add('Detailed financial disclosure should be made public before bill proceeds');
    }

    if (disclosureQuality === 'inadequate' || disclosureQuality === 'none') {
      recommendations.add('Significantly improve disclosure completeness and transparency');
      recommendations.add('Provide detailed values and ownership percentages for all interests');
    }

    recommendations.add('Independent ethics review recommended');
    recommendations.add('Public comment period on conflict disclosures');

    return Array.from(recommendations);
  }

  private calculateConfidence(conflicts: any[], input: ConflictInput): number {
    let confidence = 0.6;
    confidence += Math.min(0.2, input.sponsorFinancialInterests.length * 0.04);
    
    if (input.sponsorEmploymentHistory) {
      confidence += Math.min(0.1, input.sponsorEmploymentHistory.length * 0.02);
    }
    
    confidence += Math.min(0.1, conflicts.length * 0.03);
    
    return Math.min(1.0, confidence);
  }

  // Helper methods
  private identifyBillSector(normalizedText: string, tokenSet: Set<string>, providedSector?: string): string {
    if (providedSector) return providedSector;
    
    const sectorScores = new Map<string, number>();
    
    for (const [sector, keywords] of Object.entries(this.SECTOR_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (tokenSet.has(keyword) || normalizedText.includes(keyword)) {
          score++;
        }
      }
      if (score > 0) {
        sectorScores.set(sector, score);
      }
    }
    
    if (sectorScores.size === 0) return 'general';
    
    return Array.from(sectorScores.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  private areSectorsRelated(sector1: string, sector2: string): boolean {
    const relatedSectors: Record<string, string[]> = {
      'financial_services': ['real_estate', 'telecommunications'],
      'energy': ['mining', 'infrastructure'],
      'healthcare': ['pharmaceutical', 'insurance'],
    };
    
    return relatedSectors[sector1]?.includes(sector2) || 
           relatedSectors[sector2]?.includes(sector1) || 
           false;
  }

  private assessFinancialSeverity(interest: any, billText: string): 'low' | 'medium' | 'high' | 'critical' {
    const value = interest.value || 0;
    const ownership = interest.ownershipPercentage || 0;
    
    // Check for direct benefit language
    const directBenefit = billText.toLowerCase().includes(interest.entityName.toLowerCase());

    if ((value > 10000000 || ownership > 50) && directBenefit) return 'critical';
    if (value > 10000000 || ownership > 50) return 'critical';
    if (value > 1000000 || ownership > 25) return 'high';
    if (value > 100000 || ownership > 10) return 'medium';
    return 'low';
  }

  private findAffectedProvisions(billText: string, sector: string): string[] {
    const sectionPattern = /(?:section|clause)\s+\d+(?:\.\d+)?/gi;
    const sections = billText.match(sectionPattern) || [];
    return Array.from(new Set(sections)).slice(0, 3);
  }

  private findIndirectBenefits(normalizedText: string, interest: any, tokenSet: Set<string>): string[] {
    const benefits = [];
    
    if (tokenSet.has('tax') && (tokenSet.has('reduction') || tokenSet.has('exemption') || tokenSet.has('credit'))) {
      benefits.push(`Tax benefits may apply to ${interest.sector} sector`);
    }
    
    if (tokenSet.has('subsidy') || tokenSet.has('grant') || tokenSet.has('incentive')) {
      benefits.push(`Subsidies or grants may benefit ${interest.sector} sector`);
    }
    
    if (tokenSet.has('regulation') && tokenSet.has('reduce')) {
      benefits.push(`Reduced regulation may benefit sponsor's interests in ${interest.entityName}`);
    }

    return benefits;
  }

  private isInterestRelevant(interest: string, billSector: string, tokenSet: Set<string>): boolean {
    const interestTokens = TextProcessor.tokenize(interest);
    const sectorKeywords = this.SECTOR_KEYWORDS[billSector as keyof typeof this.SECTOR_KEYWORDS] || [];
    
    return interestTokens.some(token => 
      tokenSet.has(token) || sectorKeywords.includes(token)
    );
  }

  private generateCacheKey(input: ConflictInput): string {
    return `${input.billId}-${input.sponsorId}-${input.sponsorFinancialInterests.length}`;
  }

  getModelInfo() {
    return {
      name: 'Conflict Detector',
      version: this.modelVersion,
      description: 'Detects conflicts of interest between bill sponsors and legislation',
      capabilities: [
        'Financial conflict detection',
        'Employment history analysis',
        'Family connection assessment',
        'Organizational conflict identification',
        'Disclosure quality evaluation',
        'Performance optimization with caching'
      ]
    };
  }
}

export const conflictDetector = new ConflictDetector();
