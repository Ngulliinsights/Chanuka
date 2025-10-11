
import { database as db, bills, analysis } from '../../../shared/database/connection.js';
import { eq } from 'drizzle-orm';
import { conflictDetectionService } from './conflict-detection';
import { legalAnalysisService } from './legal-analysis';
import { MLAnalysisService } from '../analytics/services/ml.service';
import { logger } from '../../utils/logger';

export interface RealTimeBillAnalysis {
  billId: number;
  analysisId: string;
  timestamp: Date;
  constitutionalAnalysis: ConstitutionalAnalysis;
  conflictAnalysis: ConflictSummary;
  stakeholderImpact: StakeholderImpactAnalysis;
  transparencyScore: TransparencyScore;
  publicInterestScore: number;
  recommendedActions: string[];
  confidence: number;
}

export interface ConstitutionalAnalysis {
  constitutionalityScore: number; // 0-100
  concerns: ConstitutionalConcern[];
  precedents: LegalPrecedent[];
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface ConstitutionalConcern {
  section: string;
  concern: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  article: string; // Constitutional article affected
  explanation: string;
}

export interface LegalPrecedent {
  caseName: string;
  year: number;
  relevance: number; // 0-100
  outcome: string;
  applicability: string;
}

export interface ConflictSummary {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsors: number;
  totalFinancialExposure: number;
  directConflicts: number;
  indirectConflicts: number;
}

export interface StakeholderImpactAnalysis {
  primaryBeneficiaries: StakeholderGroup[];
  affectedPopulations: PopulationImpact[];
  economicImpact: EconomicImpact;
  socialImpact: SocialImpact;
}

export interface StakeholderGroup {
  name: string;
  size: number;
  impactLevel: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface PopulationImpact {
  demographic: string;
  affected: number;
  impactType: 'benefit' | 'burden' | 'mixed';
  description: string;
}

export interface EconomicImpact {
  estimatedCost: number;
  estimatedBenefit: number;
  netImpact: number;
  timeframe: string;
  confidence: number;
}

export interface SocialImpact {
  equity: number; // -100 to 100 (negative = increases inequality)
  accessibilityImprovement: number; // 0-100
  publicHealthImpact: number; // -100 to 100
  environmentalImpact: number; // -100 to 100
}

export interface TransparencyScore {
  overall: number; // 0-100
  breakdown: {
    sponsorTransparency: number;
    processTransparency: number;
    financialTransparency: number;
    publicAccess: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export class RealTimeBillAnalysisEngine {
  
  async analyzeBill(billId: number): Promise<RealTimeBillAnalysis> {
    const analysisId = `analysis_${billId}_${Date.now()}`;
    const timestamp = new Date();
    
    // Parallel analysis for performance
    const [bill, constitutionalAnalysis, conflictAnalysis, stakeholderImpact] = await Promise.all([
      this.getBillContent(billId),
      this.performConstitutionalAnalysis(billId),
      this.performConflictAnalysis(billId),
      this.performStakeholderAnalysis(billId)
    ]);
    
    const transparencyScore = await this.calculateTransparencyScore(billId, conflictAnalysis);
    const publicInterestScore = this.calculatePublicInterestScore(stakeholderImpact, transparencyScore);
    const recommendedActions = this.generateRecommendedActions(
      constitutionalAnalysis,
      conflictAnalysis,
      stakeholderImpact,
      transparencyScore
    );
    
    // Calculate overall confidence
    const confidence = this.calculateAnalysisConfidence(
      constitutionalAnalysis,
      conflictAnalysis,
      stakeholderImpact
    );
    
    // Store analysis results
    await this.storeAnalysisResults(billId, {
      analysisId,
      constitutionalAnalysis,
      conflictAnalysis,
      stakeholderImpact,
      transparencyScore,
      publicInterestScore,
      confidence
    });
    
    return {
      billId,
      analysisId,
      timestamp,
      constitutionalAnalysis,
      conflictAnalysis,
      stakeholderImpact,
      transparencyScore,
      publicInterestScore,
      recommendedActions,
      confidence
    };
  }

  private async getBillContent(billId: number) {
    const result = await db
      .select()
      .from(bills)
      .where(eq(bills.id, billId));
    
    if (!result.length) {
      throw new Error(`Bill ${billId} not found`);
    }
    
    return result[0];
  }

  private async performConstitutionalAnalysis(billId: number): Promise<ConstitutionalAnalysis> {
    const bill = await this.getBillContent(billId);
    
    // Analyze constitutional concerns
    const concerns = await this.identifyConstitutionalConcerns(bill.content);
    const precedents = await this.findRelevantPrecedents(bill.content);
    const constitutionalityScore = this.calculateConstitutionalityScore(concerns);
    const riskAssessment = this.assessConstitutionalRisk(constitutionalityScore, concerns);
    
    return {
      constitutionalityScore,
      concerns,
      precedents,
      riskAssessment
    };
  }

  private async identifyConstitutionalConcerns(billContent: string): Promise<ConstitutionalConcern[]> {
    const concerns: ConstitutionalConcern[] = [];
    
    // Constitutional analysis patterns
    const constitutionalChecks = [
      {
        pattern: /federal.*power|commerce.*clause/i,
        article: 'Article I, Section 8',
        concern: 'Federal authority and commerce regulation',
        defaultSeverity: 'moderate' as const
      },
      {
        pattern: /due.*process|equal.*protection/i,
        article: 'Amendment XIV',
        concern: 'Due process and equal protection rights',
        defaultSeverity: 'major' as const
      },
      {
        pattern: /freedom.*speech|first.*amendment/i,
        article: 'Amendment I',
        concern: 'First Amendment protections',
        defaultSeverity: 'major' as const
      },
      {
        pattern: /search.*seizure|fourth.*amendment/i,
        article: 'Amendment IV',
        concern: 'Fourth Amendment protections',
        defaultSeverity: 'major' as const
      },
      {
        pattern: /state.*rights|tenth.*amendment/i,
        article: 'Amendment X',
        concern: 'States rights and federal overreach',
        defaultSeverity: 'moderate' as const
      }
    ];
    
    for (const check of constitutionalChecks) {
      if (check.pattern.test(billContent)) {
        concerns.push({
          section: this.findRelevantSection(billContent, check.pattern),
          concern: check.concern,
          severity: check.defaultSeverity,
          article: check.article,
          explanation: `This provision may implicate ${check.concern} under ${check.article}`
        });
      }
    }
    
    return concerns;
  }

  private findRelevantSection(content: string, pattern: RegExp): string {
    const match = content.match(pattern);
    if (!match) return 'Unknown section';
    
    const start = Math.max(0, match.index! - 100);
    const end = Math.min(content.length, match.index! + 100);
    
    return content.substring(start, end).trim();
  }

  private async findRelevantPrecedents(billContent: string): Promise<LegalPrecedent[]> {
    // Placeholder for legal precedent matching
    return [
      {
        caseName: 'Wickard v. Filburn',
        year: 1942,
        relevance: 75,
        outcome: 'Expanded federal commerce power',
        applicability: 'Relevant for federal regulation scope'
      },
      {
        caseName: 'Lopez v. United States',
        year: 1995,
        relevance: 68,
        outcome: 'Limited federal commerce power',
        applicability: 'Constraint on federal authority'
      }
    ];
  }

  private calculateConstitutionalityScore(concerns: ConstitutionalConcern[]): number {
    if (concerns.length === 0) return 90;
    
    const severityWeights = {
      minor: 5,
      moderate: 15,
      major: 25,
      critical: 40
    };
    
    const totalPenalty = concerns.reduce((sum, concern) => 
      sum + severityWeights[concern.severity], 0
    );
    
    return Math.max(0, 100 - totalPenalty);
  }

  private assessConstitutionalRisk(score: number, concerns: ConstitutionalConcern[]): 'low' | 'medium' | 'high' {
    const hasCritical = concerns.some(c => c.severity === 'critical');
    const hasMajor = concerns.some(c => c.severity === 'major');
    
    if (hasCritical || score < 40) return 'high';
    if (hasMajor || score < 70) return 'medium';
    return 'low';
  }

  private async performConflictAnalysis(billId: number): Promise<ConflictSummary> {
    const conflicts = await conflictDetectionService.analyzeConflicts(billId);
    
    const riskLevels = conflicts.map(c => c.riskLevel);
    const overallRisk = this.determineOverallRisk(riskLevels);
    
    const totalFinancialExposure = conflicts.reduce((sum, c) => 
      sum + c.financialInterests.reduce((iSum, i) => iSum + i.value, 0), 0
    );
    
    const directConflicts = conflicts.reduce((sum, c) => 
      sum + c.financialInterests.filter(i => i.conflictPotential === 'direct').length, 0
    );
    
    const indirectConflicts = conflicts.reduce((sum, c) => 
      sum + c.financialInterests.filter(i => i.conflictPotential === 'indirect').length, 0
    );
    
    return {
      overallRisk,
      affectedSponsors: conflicts.length,
      totalFinancialExposure,
      directConflicts,
      indirectConflicts
    };
  }

  private determineOverallRisk(riskLevels: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (riskLevels.includes('critical')) return 'critical';
    if (riskLevels.includes('high')) return 'high';
    if (riskLevels.includes('medium')) return 'medium';
    return 'low';
  }

  private async performStakeholderAnalysis(billId: number): Promise<StakeholderImpactAnalysis> {
    const bill = await this.getBillContent(billId);
    
    // Use ML analysis service for stakeholder identification
    const stakeholderResult = await MLAnalysisService.analyzeStakeholderInfluence(bill.content);
    const beneficiaryResult = await MLAnalysisService.analyzeBeneficiaries(bill.content);
    
    const primaryBeneficiaries = this.extractStakeholderGroups(beneficiaryResult.result);
    const affectedPopulations = this.estimatePopulationImpact(bill.content);
    const economicImpact = this.calculateEconomicImpact(bill.content);
    const socialImpact = this.assessSocialImpact(bill.content);
    
    return {
      primaryBeneficiaries,
      affectedPopulations,
      economicImpact,
      socialImpact
    };
  }

  private extractStakeholderGroups(beneficiaryData: any): StakeholderGroup[] {
    const groups: StakeholderGroup[] = [];
    
    if (beneficiaryData.directBeneficiaries) {
      beneficiaryData.directBeneficiaries.forEach((beneficiary: string) => {
        groups.push({
          name: beneficiary,
          size: this.estimateGroupSize(beneficiary),
          impactLevel: 'positive',
          confidence: 80
        });
      });
    }
    
    if (beneficiaryData.potentialLosers) {
      beneficiaryData.potentialLosers.forEach((loser: string) => {
        groups.push({
          name: loser,
          size: this.estimateGroupSize(loser),
          impactLevel: 'negative',
          confidence: 70
        });
      });
    }
    
    return groups;
  }

  private estimateGroupSize(groupName: string): number {
    // Placeholder estimation based on group type
    const sizeMap: Record<string, number> = {
      'small businesses': 500000,
      'consumers': 50000000,
      'tech startups': 75000,
      'large corporations': 5000,
      'healthcare providers': 200000
    };
    
    const lowerName = groupName.toLowerCase();
    for (const [key, size] of Object.entries(sizeMap)) {
      if (lowerName.includes(key)) {
        return size;
      }
    }
    
    return 100000; // Default estimate
  }

  private estimatePopulationImpact(billContent: string): PopulationImpact[] {
    // Extract demographic references from bill content
    const demographics = [
      { name: 'Working families', pattern: /working.*famil|middle.*class/i, size: 25000000 },
      { name: 'Small business owners', pattern: /small.*business/i, size: 2000000 },
      { name: 'Healthcare workers', pattern: /healthcare.*worker|medical.*professional/i, size: 1500000 },
      { name: 'Rural communities', pattern: /rural|farm/i, size: 5000000 }
    ];
    
    return demographics
      .filter(demo => demo.pattern.test(billContent))
      .map(demo => ({
        demographic: demo.name,
        affected: demo.size,
        impactType: 'benefit' as const,
        description: `Legislation appears to benefit ${demo.name}`
      }));
  }

  private calculateEconomicImpact(billContent: string): EconomicImpact {
    // Extract cost/benefit estimates from bill text
    const costMatches = billContent.match(/\$[\d,]+(?:\s*(?:million|billion|trillion))?/gi) || [];
    let estimatedCost = 0;
    if (costMatches.length > 0) {
      estimatedCost = costMatches.reduce((sum: number, match: string) => {
        const value = this.parseFinancialAmount(match);
        return sum + value;
      }, 0);
    }
    
    // Estimate benefits as multiple of costs (varies by bill type)
    const estimatedBenefit: number = estimatedCost * this.getBenefitMultiplier(billContent);
    
    return {
      estimatedCost: estimatedCost,
      estimatedBenefit: estimatedBenefit,
      netImpact: estimatedBenefit - estimatedCost,
      timeframe: '5-10 years',
      confidence: 65
    };
  }

  private parseFinancialAmount(amountStr: string): number {
    const cleanStr = amountStr.replace(/[$,]/g, '').toLowerCase();
    const baseAmount = parseFloat(cleanStr);
    
    if (cleanStr.includes('trillion')) return baseAmount * 1000000000000;
    if (cleanStr.includes('billion')) return baseAmount * 1000000000;
    if (cleanStr.includes('million')) return baseAmount * 1000000;
    
    return baseAmount;
  }

  private getBenefitMultiplier(billContent: string): number {
    // Different types of bills have different benefit/cost ratios
    if (/infrastructure|investment/i.test(billContent)) return 2.5;
    if (/healthcare|medical/i.test(billContent)) return 3.0;
    if (/education/i.test(billContent)) return 4.0;
    if (/environment|climate/i.test(billContent)) return 2.0;
    
    return 1.5; // Default multiplier
  }

  private assessSocialImpact(billContent: string): SocialImpact {
    // Analyze social impact dimensions
    const equity = this.assessEquityImpact(billContent);
    const accessibility = this.assessAccessibilityImprovement(billContent);
    const publicHealth = this.assessPublicHealthImpact(billContent);
    const environmental = this.assessEnvironmentalImpact(billContent);
    
    return {
      equity,
      accessibilityImprovement: accessibility,
      publicHealthImpact: publicHealth,
      environmentalImpact: environmental
    };
  }

  private assessEquityImpact(billContent: string): number {
    // Positive scores for equity-promoting language
    const equityPatterns = [
      /equal.*access|fair.*distribution/i,
      /underserved|disadvantaged|marginalized/i,
      /reduce.*inequality|close.*gap/i
    ];
    
    let score = 0;
    equityPatterns.forEach(pattern => {
      if (pattern.test(billContent)) score += 25;
    });
    
    // Negative scores for potentially regressive effects
    const regressivePatterns = [
      /tax.*cut.*wealthy|benefit.*corporation/i,
      /reduce.*social.*program/i
    ];
    
    regressivePatterns.forEach(pattern => {
      if (pattern.test(billContent)) score -= 30;
    });
    
    return Math.max(-100, Math.min(100, score));
  }

  private assessAccessibilityImprovement(billContent: string): number {
    const accessPatterns = [
      /improve.*access|increase.*availability/i,
      /digital.*divide|broadband.*access/i,
      /transportation.*access/i,
      /affordable.*housing/i
    ];
    
    let score = 0;
    accessPatterns.forEach(pattern => {
      if (pattern.test(billContent)) score += 20;
    });
    
    return Math.min(100, score);
  }

  private assessPublicHealthImpact(billContent: string): number {
    const healthPatterns = [
      /public.*health|healthcare.*access/i,
      /prevent.*disease|improve.*health/i,
      /mental.*health|substance.*abuse/i
    ];
    
    let score = 0;
    healthPatterns.forEach(pattern => {
      if (pattern.test(billContent)) score += 25;
    });
    
    // Check for negative health impacts
    const negativeHealthPatterns = [
      /pollution|toxic|harmful.*substance/i,
      /reduce.*healthcare.*funding/i
    ];
    
    negativeHealthPatterns.forEach(pattern => {
      if (pattern.test(billContent)) score -= 20;
    });
    
    return Math.max(-100, Math.min(100, score));
  }

  private assessEnvironmentalImpact(billContent: string): number {
    const environmentalPatterns = [
      /environment|climate|sustainable/i,
      /renewable.*energy|clean.*energy/i,
      /carbon.*reduction|emission.*reduction/i
    ];
    
    let score = 0;
    environmentalPatterns.forEach(pattern => {
      if (pattern.test(billContent)) score += 30;
    });
    
    const negativeEnvironmentalPatterns = [
      /drill|fossil.*fuel|coal/i,
      /deregulat.*environment/i
    ];
    
    negativeEnvironmentalPatterns.forEach(pattern => {
      if (pattern.test(billContent)) score -= 25;
    });
    
    return Math.max(-100, Math.min(100, score));
  }

  private async calculateTransparencyScore(billId: number, conflictAnalysis: ConflictSummary): Promise<TransparencyScore> {
    // Get bill process information
    const bill = await this.getBillContent(billId);
    
    const sponsorTransparency = this.calculateSponsorTransparency(conflictAnalysis);
    const processTransparency = this.calculateProcessTransparency(bill);
    const financialTransparency = this.calculateFinancialTransparency(conflictAnalysis);
    const publicAccess = this.calculatePublicAccess(bill);
    
    const overall = Math.round((sponsorTransparency + processTransparency + financialTransparency + publicAccess) / 4);
    const grade = this.calculateTransparencyGrade(overall);
    
    return {
      overall,
      breakdown: {
        sponsorTransparency,
        processTransparency,
        financialTransparency,
        publicAccess
      },
      grade
    };
  }

  private calculateSponsorTransparency(conflictAnalysis: ConflictSummary): number {
    // Lower scores for higher conflict risk
    const riskPenalties = {
      low: 0,
      medium: 20,
      high: 40,
      critical: 60
    };
    
    return Math.max(0, 100 - riskPenalties[conflictAnalysis.overallRisk]);
  }

  private calculateProcessTransparency(bill: any): number {
    // Base score, can be enhanced with actual process data
    let score = 70;
    
    // Check for public comment periods, committee hearings, etc.
    if (bill.publicCommentPeriod) score += 15;
    if (bill.committeeHearings > 0) score += 10;
    if (bill.amendmentHistory?.length > 0) score += 5;
    
    return Math.min(100, score);
  }

  private calculateFinancialTransparency(conflictAnalysis: ConflictSummary): number {
    // Score based on financial disclosure completeness
    if (conflictAnalysis.totalFinancialExposure === 0) return 90;
    
    const directConflictPenalty = conflictAnalysis.directConflicts * 15;
    const indirectConflictPenalty = conflictAnalysis.indirectConflicts * 8;
    
    return Math.max(0, 100 - directConflictPenalty - indirectConflictPenalty);
  }

  private calculatePublicAccess(bill: any): number {
    // Score based on availability of bill information
    let score = 60; // Base score for basic availability
    
    if (bill.fullTextAvailable) score += 15;
    if (bill.summaryAvailable) score += 10;
    if (bill.amendmentHistory) score += 10;
    if (bill.votingRecord) score += 5;
    
    return Math.min(100, score);
  }

  private calculateTransparencyGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculatePublicInterestScore(
    stakeholderImpact: StakeholderImpactAnalysis,
    transparencyScore: TransparencyScore
  ): number {
    // Weighted calculation of public interest
    const economicScore = this.normalizeEconomicScore(stakeholderImpact.economicImpact);
    const socialScore = this.normalizeSocialScore(stakeholderImpact.socialImpact);
    const transparencyWeight = transparencyScore.overall;
    
    const weights = {
      economic: 0.3,
      social: 0.4,
      transparency: 0.3
    };
    
    return Math.round(
      economicScore * weights.economic +
      socialScore * weights.social +
      transparencyWeight * weights.transparency
    );
  }

  private normalizeEconomicScore(economicImpact: EconomicImpact): number {
    if (economicImpact.netImpact > 0) {
      return Math.min(100, 50 + (economicImpact.netImpact / 1000000000) * 10); // Positive impact
    } else {
      return Math.max(0, 50 + (economicImpact.netImpact / 1000000000) * 10); // Negative impact
    }
  }

  private normalizeSocialScore(socialImpact: SocialImpact): number {
    const components = [
      Math.max(0, socialImpact.equity + 50), // Convert -50/50 to 0-100
      socialImpact.accessibilityImprovement,
      Math.max(0, socialImpact.publicHealthImpact + 50),
      Math.max(0, socialImpact.environmentalImpact + 50)
    ];
    
    return components.reduce((sum, score) => sum + score, 0) / components.length;
  }

  private generateRecommendedActions(
    constitutional: ConstitutionalAnalysis,
    conflict: ConflictSummary,
    stakeholder: StakeholderImpactAnalysis,
    transparency: TransparencyScore
  ): string[] {
    const actions: string[] = [];
    
    // Constitutional recommendations
    if (constitutional.riskAssessment === 'high') {
      actions.push('Conduct detailed constitutional review before proceeding');
      actions.push('Consider legal counsel consultation on constitutional issues');
    }
    
    // Conflict recommendations
    if (conflict.overallRisk === 'high' || conflict.overallRisk === 'critical') {
      actions.push('Require sponsor recusal from voting');
      actions.push('Implement independent oversight for bill progression');
    }
    
    if (conflict.directConflicts > 0) {
      actions.push('Mandate full financial disclosure from all sponsors');
    }
    
    // Transparency recommendations
    if (transparency.overall < 70) {
      actions.push('Increase public access to bill documentation');
      actions.push('Extend public comment period');
    }
    
    // Stakeholder recommendations
    if (stakeholder.economicImpact.netImpact < 0) {
      actions.push('Conduct independent economic impact assessment');
    }
    
    if (stakeholder.socialImpact.equity < -20) {
      actions.push('Review bill for equity implications');
      actions.push('Consider amendments to address inequality concerns');
    }
    
    return actions;
  }

  private calculateAnalysisConfidence(
    constitutional: ConstitutionalAnalysis,
    conflict: ConflictSummary,
    stakeholder: StakeholderImpactAnalysis
  ): number {
    // Base confidence factors
    const dataQuality = 85; // Based on available data sources
    const methodologyRobustness = 80; // Based on analysis methods
    
    // Adjust for complexity and uncertainty
    const constitutionalComplexity = constitutional.concerns.length * 3;
    const conflictComplexity = conflict.affectedSponsors * 2;
    const economicUncertainty = (100 - stakeholder.economicImpact.confidence) / 2;
    
    const adjustments = constitutionalComplexity + conflictComplexity + economicUncertainty;
    
    return Math.max(0, Math.min(100, (dataQuality + methodologyRobustness) / 2 - adjustments));
  }

  private async storeAnalysisResults(billId: number, analysisData: any): Promise<void> {
    // Store comprehensive analysis results in database
    await db.insert(analysis).values({
      billId,
      analysisType: 'comprehensive_real_time',
      result: analysisData,
      confidence: analysisData.confidence,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

export const realTimeBillAnalysisEngine = new RealTimeBillAnalysisEngine();









