// ============================================================================
// CONFLICT DETECTOR - ML Model for Conflict of Interest Detection
// ============================================================================
// Detects financial and other conflicts of interest between sponsors and bills

import { z } from 'zod';

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
  private modelVersion = '2.0.0';

  // Sector mappings for conflict detection
  private readonly SECTOR_KEYWORDS = {
    'financial_services': ['bank', 'insurance', 'loan', 'credit', 'finance', 'investment'],
    'telecommunications': ['telecom', 'mobile', 'internet', 'communication', 'network'],
    'energy': ['oil', 'gas', 'electricity', 'power', 'energy', 'petroleum'],
    'healthcare': ['hospital', 'medical', 'health', 'pharmaceutical', 'drug'],
    'real_estate': ['property', 'land', 'real estate', 'construction', 'housing'],
    'agriculture': ['farm', 'agriculture', 'crop', 'livestock', 'food'],
    'mining': ['mining', 'mineral', 'extraction', 'quarry'],
    'transport': ['transport', 'aviation', 'shipping', 'logistics', 'port'],
    'education': ['school', 'university', 'education', 'training'],
    'media': ['media', 'television', 'radio', 'newspaper', 'broadcasting'],
  };

  // Risk weights for different conflict types
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
    
    // Detect different types of conflicts
    const financialConflicts = this.detectFinancialConflicts(validatedInput);
    const employmentConflicts = this.detectEmploymentConflicts(validatedInput);
    const familialConflicts = this.detectFamilialConflicts(validatedInput);
    const organizationalConflicts = this.detectOrganizationalConflicts(validatedInput);
    
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

    return {
      hasConflict: allConflicts.length > 0,
      conflictScore,
      confidence,
      conflicts: allConflicts,
      riskFactors,
      disclosureQuality,
      recommendations,
    };
  }

  private detectFinancialConflicts(input: ConflictInput) {
    const conflicts = [];
    const billSector = this.identifyBillSector(input.billText, input.billSector);

    for (const interest of input.sponsorFinancialInterests) {
      // Direct sector match
      if (interest.sector === billSector) {
        const severity = this.assessFinancialSeverity(interest, input.billText);
        conflicts.push({
          type: 'financial' as const,
          severity,
          description: `Sponsor has ${interest.type} interest in ${interest.entityName} (${interest.sector} sector)`,
          evidence: [
            `Financial interest: ${interest.type} in ${interest.entityName}`,
            `Bill affects ${billSector} sector`,
            interest.value ? `Interest value: ${interest.value}` : '',
          ].filter(Boolean),
          affectedProvisions: this.findAffectedProvisions(input.billText, interest.sector),
          recommendedAction: severity === 'critical' ? 'recusal' : 
                           severity === 'high' ? 'divestiture' : 'disclosure' as const,
        });
      }

      // Indirect benefits through bill provisions
      const indirectBenefits = this.findIndirectBenefits(input.billText, interest);
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

  private detectEmploymentConflicts(input: ConflictInput) {
    const conflicts = [];
    
    if (!input.sponsorEmploymentHistory) return conflicts;

    const billSector = this.identifyBillSector(input.billText, input.billSector);

    for (const employment of input.sponsorEmploymentHistory) {
      // Recent employment in affected sector
      if (employment.sector === billSector && this.isRecentEmployment(employment)) {
        conflicts.push({
          type: 'employment' as const,
          severity: 'high' as const,
          description: `Sponsor recently employed by ${employment.employer} in affected sector`,
          evidence: [
            `Former position: ${employment.position} at ${employment.employer}`,
            `Employment period: ${employment.startDate} - ${employment.endDate || 'present'}`,
            `Sector match: ${employment.sector}`,
          ],
          affectedProvisions: this.findAffectedProvisions(input.billText, employment.sector),
          recommendedAction: 'disclosure' as const,
        });
      }

      // Revolving door concerns
      if (this.hasRevolvingDoorConcerns(employment, input.billText)) {
        conflicts.push({
          type: 'employment' as const,
          severity: 'medium' as const,
          description: `Potential revolving door conflict with ${employment.employer}`,
          evidence: [
            `Former employer: ${employment.employer}`,
            `Bill may benefit former employer`,
          ],
          affectedProvisions: [],
          recommendedAction: 'disclosure' as const,
        });
      }
    }

    return conflicts;
  }

  private detectFamilialConflicts(input: ConflictInput) {
    const conflicts = [];
    
    if (!input.sponsorFamilyConnections) return conflicts;

    const billSector = this.identifyBillSector(input.billText, input.billSector);

    for (const family of input.sponsorFamilyConnections) {
      // Family member interests in affected sector
      const relevantInterests = family.interests.filter(interest => 
        this.isInterestRelevant(interest, billSector, input.billText)
      );

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

  private detectOrganizationalConflicts(input: ConflictInput) {
    const conflicts = [];
    
    // This would typically check against organizational memberships
    // For now, we'll check for obvious organizational mentions in the bill
    const organizationalMentions = this.findOrganizationalMentions(input.billText);
    
    if (organizationalMentions.length > 0) {
      conflicts.push({
        type: 'organizational' as const,
        severity: 'low' as const,
        description: 'Bill mentions specific organizations that may benefit',
        evidence: organizationalMentions,
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
        present: input.sponsorEmploymentHistory?.some(e => this.isRecentEmployment(e)) || false,
      },
      {
        factor: 'Family connections to affected interests',
        weight: this.CONFLICT_WEIGHTS.family_connection,
        present: input.sponsorFamilyConnections?.length > 0 || false,
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
        score += factor.weight * 0.5; // Reduced weight for risk factors
      }
    }

    return Math.min(100, score);
  }

  private assessDisclosureQuality(input: ConflictInput): 'complete' | 'partial' | 'inadequate' | 'none' {
    const hasFinancialDisclosure = input.sponsorFinancialInterests.length > 0;
    const hasEmploymentDisclosure = input.sponsorEmploymentHistory && input.sponsorEmploymentHistory.length > 0;
    const hasFamilyDisclosure = input.sponsorFamilyConnections && input.sponsorFamilyConnections.length > 0;

    if (hasFinancialDisclosure && hasEmploymentDisclosure && hasFamilyDisclosure) {
      return 'complete';
    } else if (hasFinancialDisclosure || hasEmploymentDisclosure) {
      return 'partial';
    } else if (input.sponsorFinancialInterests.length === 0 && !input.sponsorEmploymentHistory) {
      return 'none';
    } else {
      return 'inadequate';
    }
  }

  private generateRecommendations(conflicts: any[], disclosureQuality: string): string[] {
    const recommendations = [];

    if (conflicts.length === 0) {
      recommendations.push('No conflicts of interest detected');
      return recommendations;
    }

    // Specific recommendations based on conflicts
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const highConflicts = conflicts.filter(c => c.severity === 'high');

    if (criticalConflicts.length > 0) {
      recommendations.push('Sponsor should recuse themselves from voting on this bill');
      recommendations.push('Consider transferring sponsorship to another legislator');
    }

    if (highConflicts.length > 0) {
      recommendations.push('Sponsor should consider divesting conflicting interests');
      recommendations.push('Full public disclosure of all relevant interests required');
    }

    if (conflicts.some(c => c.type === 'financial')) {
      recommendations.push('Detailed financial disclosure should be made public');
    }

    if (disclosureQuality === 'inadequate' || disclosureQuality === 'none') {
      recommendations.push('Improve disclosure completeness and transparency');
    }

    recommendations.push('Independent ethics review recommended');

    return recommendations;
  }

  private calculateConfidence(conflicts: any[], input: ConflictInput): number {
    let confidence = 0.6; // Base confidence

    // Increase confidence with more data
    confidence += Math.min(0.2, input.sponsorFinancialInterests.length * 0.05);
    
    if (input.sponsorEmploymentHistory) {
      confidence += Math.min(0.1, input.sponsorEmploymentHistory.length * 0.02);
    }

    // Increase confidence with detected conflicts
    confidence += Math.min(0.2, conflicts.length * 0.05);

    return Math.min(1.0, confidence);
  }

  // Helper methods
  private identifyBillSector(billText: string, providedSector?: string): string {
    if (providedSector) return providedSector;

    const text = billText.toLowerCase();
    
    for (const [sector, keywords] of Object.entries(this.SECTOR_KEYWORDS)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return sector;
      }
    }

    return 'general';
  }

  private assessFinancialSeverity(interest: any, billText: string): 'low' | 'medium' | 'high' | 'critical' {
    const value = interest.value || 0;
    const ownership = interest.ownershipPercentage || 0;

    // High value or high ownership = higher severity
    if (value > 10000000 || ownership > 50) return 'critical';
    if (value > 1000000 || ownership > 25) return 'high';
    if (value > 100000 || ownership > 10) return 'medium';
    return 'low';
  }

  private findAffectedProvisions(billText: string, sector: string): string[] {
    const provisions = [];
    const sectionPattern = /section\s+\d+/gi;
    const sections = billText.match(sectionPattern) || [];
    
    // Simplified: return first few sections that might be relevant
    return sections.slice(0, 3);
  }

  private findIndirectBenefits(billText: string, interest: any): string[] {
    const benefits = [];
    const text = billText.toLowerCase();
    
    // Look for tax benefits, subsidies, etc.
    if (text.includes('tax') && text.includes('reduction')) {
      benefits.push('Bill includes tax reductions that may benefit sponsor\'s interests');
    }
    
    if (text.includes('subsidy') || text.includes('grant')) {
      benefits.push('Bill includes subsidies or grants that may benefit sponsor\'s sector');
    }

    return benefits;
  }

  private isRecentEmployment(employment: any): boolean {
    if (!employment.endDate) return true; // Still employed
    
    const endDate = new Date(employment.endDate);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return endDate > twoYearsAgo;
  }

  private hasRevolvingDoorConcerns(employment: any, billText: string): boolean {
    const text = billText.toLowerCase();
    const employer = employment.employer.toLowerCase();
    
    return text.includes(employer) || 
           text.includes(employment.sector.toLowerCase());
  }

  private isInterestRelevant(interest: string, billSector: string, billText: string): boolean {
    const text = billText.toLowerCase();
    const interestLower = interest.toLowerCase();
    
    return text.includes(interestLower) || 
           interest.toLowerCase().includes(billSector);
  }

  private findOrganizationalMentions(billText: string): string[] {
    const mentions = [];
    
    // Look for specific organization patterns
    const orgPatterns = [
      /\b[A-Z][a-z]+ (?:Association|Foundation|Institute|Corporation|Ltd|Limited)\b/g,
      /\b(?:Kenya|National) [A-Z][a-z]+ (?:Authority|Board|Commission)\b/g,
    ];

    for (const pattern of orgPatterns) {
      const matches = billText.match(pattern);
      if (matches) {
        mentions.push(...matches);
      }
    }

    return [...new Set(mentions)]; // Remove duplicates
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
        'Disclosure quality evaluation'
      ]
    };
  }
}

export const conflictDetector = new ConflictDetector();