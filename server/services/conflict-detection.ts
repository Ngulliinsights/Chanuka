
import { db } from '../db';
import { bills, sponsors, sponsorAffiliations, billSponsorships } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface ConflictAnalysis {
  sponsorId: string;
  billId: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  financialInterests: FinancialInterest[];
  businessRelationships: BusinessRelationship[];
  beneficiaryAnalysis: BeneficiaryMapping[];
  transparencyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface FinancialInterest {
  organization: string;
  type: 'investment' | 'employment' | 'consulting' | 'board_position';
  value: number;
  conflictPotential: 'direct' | 'indirect' | 'minimal';
  billSections: string[];
}

export interface BusinessRelationship {
  entity: string;
  relationshipType: string;
  startDate: Date;
  ongoing: boolean;
  relevanceToBill: number; // 0-100 score
}

export interface BeneficiaryMapping {
  claimedBeneficiary: string;
  actualBeneficiaries: string[];
  discrepancyScore: number;
  evidenceLevel: 'confirmed' | 'probable' | 'suspected' | 'unclear';
}

export class ConflictDetectionService {
  
  async analyzeConflicts(billId: number): Promise<ConflictAnalysis[]> {
    const sponsorships = await this.getBillSponsorships(billId);
    const bill = await this.getBillContent(billId);
    
    const analyses: ConflictAnalysis[] = [];
    
    for (const sponsorship of sponsorships) {
      const analysis = await this.analyzeSponsorConflicts(
        sponsorship.sponsorId,
        billId,
        bill.content,
        sponsorship.sponsorshipType
      );
      analyses.push(analysis);
    }
    
    return analyses;
  }

  private async analyzeSponsorConflicts(
    sponsorId: string,
    billId: number,
    billContent: string,
    sponsorshipType: string
  ): Promise<ConflictAnalysis> {
    
    // Get sponsor affiliations and financial interests
    const affiliations = await this.getSponsorAffiliations(sponsorId);
    const financialInterests = await this.extractFinancialInterests(affiliations, billContent);
    const businessRelationships = await this.mapBusinessRelationships(affiliations);
    const beneficiaryAnalysis = await this.analyzeBeneficiaryDiscrepancies(billContent, affiliations);
    
    // Calculate risk scores
    const financialRisk = this.calculateFinancialRisk(financialInterests);
    const relationshipRisk = this.calculateRelationshipRisk(businessRelationships);
    const beneficiaryRisk = this.calculateBeneficiaryRisk(beneficiaryAnalysis);
    const transparencyRisk = await this.calculateTransparencyRisk(sponsorId);
    
    // Weighted overall risk score
    const weights = { financial: 0.4, relationship: 0.25, beneficiary: 0.25, transparency: 0.1 };
    const riskScore = Math.round(
      financialRisk * weights.financial +
      relationshipRisk * weights.relationship +
      beneficiaryRisk * weights.beneficiary +
      transparencyRisk * weights.transparency
    );
    
    const riskLevel = this.determineRiskLevel(riskScore);
    const transparencyGrade = this.calculateTransparencyGrade(transparencyRisk, riskScore);
    const recommendations = this.generateRecommendations(riskLevel, financialInterests, businessRelationships);
    
    return {
      sponsorId,
      billId,
      riskScore,
      riskLevel,
      financialInterests,
      businessRelationships,
      beneficiaryAnalysis,
      transparencyGrade,
      recommendations
    };
  }

  private async getBillSponsorships(billId: number) {
    return await db
      .select({
        sponsorId: billSponsorships.sponsorId,
        sponsorshipType: billSponsorships.sponsorshipType
      })
      .from(billSponsorships)
      .where(and(
        eq(billSponsorships.billId, billId),
        eq(billSponsorships.isActive, true)
      ));
  }

  private async getBillContent(billId: number) {
    const result = await db
      .select({
        content: bills.content,
        title: bills.title
      })
      .from(bills)
      .where(eq(bills.id, billId));
    
    return result[0] || { content: '', title: '' };
  }

  private async getSponsorAffiliations(sponsorId: string) {
    return await db
      .select()
      .from(sponsorAffiliations)
      .where(eq(sponsorAffiliations.sponsorId, sponsorId));
  }

  private async extractFinancialInterests(affiliations: any[], billContent: string): Promise<FinancialInterest[]> {
    const interests: FinancialInterest[] = [];
    
    for (const affiliation of affiliations) {
      const relevantSections = this.findRelevantBillSections(affiliation.organization, billContent);
      const conflictPotential = this.assessConflictPotential(affiliation, relevantSections);
      
      if (conflictPotential !== 'minimal') {
        interests.push({
          organization: affiliation.organization,
          type: affiliation.type as any,
          value: this.estimateFinancialValue(affiliation),
          conflictPotential,
          billSections: relevantSections
        });
      }
    }
    
    return interests;
  }

  private findRelevantBillSections(organization: string, billContent: string): string[] {
    const sections: string[] = [];
    const orgKeywords = this.extractOrganizationKeywords(organization);
    
    // Split bill into sections and analyze
    const billSections = this.parseBillSections(billContent);
    
    for (const [sectionId, sectionText] of billSections) {
      for (const keyword of orgKeywords) {
        if (sectionText.toLowerCase().includes(keyword.toLowerCase())) {
          sections.push(sectionId);
          break;
        }
      }
    }
    
    return sections;
  }

  private extractOrganizationKeywords(organization: string): string[] {
    const baseKeywords = [organization];
    
    // Add industry-specific keywords
    const industryMap: Record<string, string[]> = {
      'pharmaceutical': ['drug', 'medicine', 'health', 'medical', 'pharma'],
      'technology': ['tech', 'software', 'digital', 'data', 'ai'],
      'energy': ['oil', 'gas', 'renewable', 'solar', 'wind'],
      'financial': ['bank', 'finance', 'investment', 'credit']
    };
    
    for (const [industry, keywords] of Object.entries(industryMap)) {
      if (organization.toLowerCase().includes(industry)) {
        baseKeywords.push(...keywords);
      }
    }
    
    return baseKeywords;
  }

  private parseBillSections(content: string): Map<string, string> {
    const sections = new Map<string, string>();
    
    // Simple section parsing - can be enhanced with legal document parsing
    const sectionRegex = /(?:Section|Article|Chapter)\s+(\d+(?:\.\d+)?)\s*[:\-]?\s*(.*?)(?=(?:Section|Article|Chapter)\s+\d+|$)/gis;
    let match;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      sections.set(match[1], match[2]);
    }
    
    return sections;
  }

  private assessConflictPotential(affiliation: any, relevantSections: string[]): 'direct' | 'indirect' | 'minimal' {
    if (relevantSections.length > 0 && affiliation.conflictType === 'direct') {
      return 'direct';
    }
    
    if (relevantSections.length > 0 || affiliation.conflictType === 'indirect') {
      return 'indirect';
    }
    
    return 'minimal';
  }

  private estimateFinancialValue(affiliation: any): number {
    // Simple estimation based on affiliation type and role
    const valueMap: Record<string, number> = {
      'board_position': 500000,
      'investment': 1000000,
      'employment': 200000,
      'consulting': 100000
    };
    
    return valueMap[affiliation.type] || 50000;
  }

  private async mapBusinessRelationships(affiliations: any[]): Promise<BusinessRelationship[]> {
    return affiliations.map(affiliation => ({
      entity: affiliation.organization,
      relationshipType: affiliation.role || affiliation.type,
      startDate: affiliation.startDate || new Date(),
      ongoing: affiliation.isActive !== false,
      relevanceToBill: Math.floor(Math.random() * 100) // Placeholder - implement proper relevance scoring
    }));
  }

  private async analyzeBeneficiaryDiscrepancies(billContent: string, affiliations: any[]): Promise<BeneficiaryMapping[]> {
    const claimedBeneficiaries = this.extractClaimedBeneficiaries(billContent);
    const actualBeneficiaries = this.identifyActualBeneficiaries(affiliations);
    
    return claimedBeneficiaries.map(claimed => {
      const discrepancyScore = this.calculateDiscrepancyScore(claimed, actualBeneficiaries);
      
      return {
        claimedBeneficiary: claimed,
        actualBeneficiaries,
        discrepancyScore,
        evidenceLevel: discrepancyScore > 70 ? 'confirmed' : 
                      discrepancyScore > 40 ? 'probable' : 
                      discrepancyScore > 20 ? 'suspected' : 'unclear'
      };
    });
  }

  private extractClaimedBeneficiaries(billContent: string): string[] {
    // Extract mentioned beneficiaries from bill text
    const beneficiaryPatterns = [
      /(?:benefit|help|assist|support)\s+([^.]{1,50})/gi,
      /(?:for the benefit of|intended to help)\s+([^.]{1,50})/gi
    ];
    
    const beneficiaries: string[] = [];
    
    for (const pattern of beneficiaryPatterns) {
      let match;
      while ((match = pattern.exec(billContent)) !== null) {
        beneficiaries.push(match[1].trim());
      }
    }
    
    return [...new Set(beneficiaries)];
  }

  private identifyActualBeneficiaries(affiliations: any[]): string[] {
    return affiliations.map(aff => aff.organization);
  }

  private calculateDiscrepancyScore(claimed: string, actual: string[]): number {
    // Check if claimed beneficiary matches actual beneficiaries
    const matchScore = actual.some(act => 
      claimed.toLowerCase().includes(act.toLowerCase()) ||
      act.toLowerCase().includes(claimed.toLowerCase())
    ) ? 0 : 100;
    
    return matchScore;
  }

  private calculateFinancialRisk(interests: FinancialInterest[]): number {
    if (interests.length === 0) return 0;
    
    const totalValue = interests.reduce((sum, interest) => sum + interest.value, 0);
    const directConflicts = interests.filter(i => i.conflictPotential === 'direct').length;
    
    let risk = Math.min((totalValue / 1000000) * 20, 80); // Cap at 80
    risk += directConflicts * 20; // 20 points per direct conflict
    
    return Math.min(risk, 100);
  }

  private calculateRelationshipRisk(relationships: BusinessRelationship[]): number {
    if (relationships.length === 0) return 0;
    
    const activeRelationships = relationships.filter(r => r.ongoing).length;
    const highRelevance = relationships.filter(r => r.relevanceToBill > 70).length;
    
    return Math.min(activeRelationships * 15 + highRelevance * 25, 100);
  }

  private calculateBeneficiaryRisk(analysis: BeneficiaryMapping[]): number {
    if (analysis.length === 0) return 0;
    
    const avgDiscrepancy = analysis.reduce((sum, item) => sum + item.discrepancyScore, 0) / analysis.length;
    return avgDiscrepancy;
  }

  private async calculateTransparencyRisk(sponsorId: string): Promise<number> {
    // Check disclosure completeness, public statements, etc.
    // Placeholder implementation
    return Math.floor(Math.random() * 50); // 0-50 risk from transparency issues
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private calculateTransparencyGrade(transparencyRisk: number, overallRisk: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    const combinedScore = (transparencyRisk + overallRisk) / 2;
    
    if (combinedScore <= 20) return 'A';
    if (combinedScore <= 40) return 'B';
    if (combinedScore <= 60) return 'C';
    if (combinedScore <= 80) return 'D';
    return 'F';
  }

  private generateRecommendations(
    riskLevel: string,
    interests: FinancialInterest[],
    relationships: BusinessRelationship[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Consider recusal from voting on this bill');
      recommendations.push('Require independent ethics review');
    }
    
    if (interests.some(i => i.conflictPotential === 'direct')) {
      recommendations.push('Disclose all direct financial interests publicly');
    }
    
    if (relationships.some(r => r.relevanceToBill > 70)) {
      recommendations.push('Provide detailed explanation of business relationships');
    }
    
    if (riskLevel !== 'low') {
      recommendations.push('Increase transparency reporting frequency');
    }
    
    return recommendations;
  }
}

export const conflictDetectionService = new ConflictDetectionService();
