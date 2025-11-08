/**
 * Conflict Resolution Recommendation Service
 * 
 * Generates actionable recommendations for addressing conflicts of interest
 * and improving transparency based on analysis results.
 */

import { logger  } from '../../../../shared/core/src/index.js';
import {
  ConflictAnalysis,
  FinancialConflict,
  ProfessionalConflict,
  VotingAnomaly
} from './types.js';

export class ConflictResolutionRecommendationService {
  private static instance: ConflictResolutionRecommendationService;

  public static getInstance(): ConflictResolutionRecommendationService {
    if (!ConflictResolutionRecommendationService.instance) {
      ConflictResolutionRecommendationService.instance = new ConflictResolutionRecommendationService();
    }
    return ConflictResolutionRecommendationService.instance;
  }

  /**
   * Generates comprehensive recommendations for addressing conflicts
   */
  generateConflictRecommendations(
    financialConflicts: FinancialConflict[],
    professionalConflicts: ProfessionalConflict[],
    votingAnomalies: VotingAnomaly[],
    transparency_score: number,
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string[] {
    try {
      const recommendations: string[] = [];

      // Financial conflict recommendations
      recommendations.push(...this.generateFinancialRecommendations(financialConflicts));

      // Professional conflict recommendations
      recommendations.push(...this.generateProfessionalRecommendations(professionalConflicts));

      // Voting anomaly recommendations
      recommendations.push(...this.generateVotingRecommendations(votingAnomalies));

      // Transparency recommendations
      recommendations.push(...this.generateTransparencyRecommendations(transparency_score));

      // Risk-level specific recommendations
      recommendations.push(...this.generateRiskLevelRecommendations(riskLevel));

      // Remove duplicates and sort by priority
      const uniqueRecommendations = Array.from(new Set(recommendations));
      return this.prioritizeRecommendations(uniqueRecommendations, riskLevel);
    } catch (error) {
      logger.error('Error generating conflict recommendations:', {
        component: 'ConflictResolutionRecommendation',
        error: error instanceof Error ? error.message : String(error)
      });
      return ['Conduct comprehensive conflict of interest review'];
    }
  }

  /**
   * Generates specific mitigation strategies for high-risk conflicts
   */
  generateMitigationStrategies(
    conflicts: (FinancialConflict | ProfessionalConflict)[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): Array<{
    conflictId: string;
    strategy: string;
    timeline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    stakeholders: string[];
  }> {
    const strategies: Array<{
      conflictId: string;
      strategy: string;
      timeline: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      stakeholders: string[];
    }> = [];

    for (const conflict of conflicts) {
      if (conflict.conflictSeverity === 'high' || conflict.conflictSeverity === 'critical') {
        const strategy = this.generateSpecificMitigationStrategy(conflict);
        if (strategy) {
          strategies.push({
            conflictId: conflict.id,
            ...strategy
          });
        }
      }
    }

    return strategies.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generates compliance recommendations based on regulatory requirements
   */
  generateComplianceRecommendations(
    analysis: ConflictAnalysis
  ): Array<{
    requirement: string;
    currentStatus: 'compliant' | 'partial' | 'non_compliant';
    actions: string[];
    deadline?: string;
  }> {
    const recommendations: Array<{
      requirement: string;
      currentStatus: 'compliant' | 'partial' | 'non_compliant';
      actions: string[];
      deadline?: string;
    }> = [];

    // Financial disclosure compliance
    const hasFinancialDisclosures = analysis.financialConflicts.some(c => 
      c.detectionMethod === 'disclosure_analysis'
    );

    recommendations.push({
      requirement: 'Financial Interest Disclosure',
      currentStatus: hasFinancialDisclosures ? 'compliant' : 'non_compliant',
      actions: hasFinancialDisclosures 
        ? ['Maintain current disclosure practices', 'Update disclosures annually']
        : ['File comprehensive financial disclosure', 'Include all investments above KSh 100,000'],
      deadline: 'Within 30 days'
    });

    // Professional affiliation disclosure
    const hasProfessionalDisclosures = analysis.professionalConflicts.length > 0;

    recommendations.push({
      requirement: 'Professional Affiliation Disclosure',
      currentStatus: hasProfessionalDisclosures ? 'partial' : 'non_compliant',
      actions: [
        'Disclose all board positions and advisory roles',
        'Update professional affiliations quarterly',
        'Include family member professional interests'
      ],
      deadline: 'Within 14 days'
    });

    // Voting transparency
    const votingTransparency = analysis.votingAnomalies.length < 3 ? 'compliant' : 'partial';

    recommendations.push({
      requirement: 'Voting Pattern Transparency',
      currentStatus: votingTransparency,
      actions: votingTransparency === 'compliant'
        ? ['Continue transparent voting practices']
        : ['Provide explanations for party-line deviations', 'Publish voting rationale statements'],
      deadline: 'Ongoing'
    });

    return recommendations;
  }

  // Private helper methods

  private generateFinancialRecommendations(conflicts: FinancialConflict[]): string[] {
    const recommendations: string[] = [];

    if (conflicts.length === 0) {
      recommendations.push('Maintain current financial disclosure practices');
      return recommendations;
    }

    const totalValue = conflicts.reduce((sum, c) => sum + c.financialValue, 0);
    const criticalConflicts = conflicts.filter(c => c.conflictSeverity === 'critical');
    const highConflicts = conflicts.filter(c => c.conflictSeverity === 'high');

    if (criticalConflicts.length > 0) {
      recommendations.push('Immediately divest from critical financial conflicts or recuse from related decisions');
      recommendations.push('Establish blind trust for significant financial holdings');
    }

    if (highConflicts.length > 0) {
      recommendations.push('Consider divestiture or recusal for high-severity financial conflicts');
      recommendations.push('Implement enhanced disclosure protocols for significant investments');
    }

    if (totalValue > 20000000) {
      recommendations.push('Establish comprehensive asset management oversight');
      recommendations.push('Consider independent financial advisory board');
    }

    const directInvestments = conflicts.filter(c => c.type === 'direct_investment');
    if (directInvestments.length > 3) {
      recommendations.push('Consolidate investment portfolio to reduce conflict potential');
    }

    const familyInterests = conflicts.filter(c => c.type === 'family_interest');
    if (familyInterests.length > 0) {
      recommendations.push('Enhance family financial interest disclosure and monitoring');
    }

    return recommendations;
  }

  private generateProfessionalRecommendations(conflicts: ProfessionalConflict[]): string[] {
    const recommendations: string[] = [];

    if (conflicts.length === 0) {
      recommendations.push('Continue transparent professional affiliation practices');
      return recommendations;
    }

    const activeConflicts = conflicts.filter(c => c.is_active);
    const leadershipRoles = conflicts.filter(c => c.type === 'leadership_role');
    const ownershipStakes = conflicts.filter(c => c.type === 'ownership_stake');

    if (leadershipRoles.length > 0) {
      recommendations.push('Consider stepping down from leadership roles in organizations with legislative interests');
      recommendations.push('Implement recusal protocols for bills affecting organizations where you hold leadership positions');
    }

    if (ownershipStakes.length > 0) {
      recommendations.push('Divest ownership stakes in organizations with significant legislative interests');
      recommendations.push('Establish independent management for business interests');
    }

    if (activeConflicts.length > 3) {
      recommendations.push('Reduce number of active professional affiliations to minimize conflicts');
      recommendations.push('Focus on roles that do not create legislative conflicts of interest');
    }

    const advisoryRoles = conflicts.filter(c => c.type === 'advisory_position');
    if (advisoryRoles.length > 2) {
      recommendations.push('Limit advisory positions to avoid appearance of conflicted interests');
    }

    return recommendations;
  }

  private generateVotingRecommendations(anomalies: VotingAnomaly[]): string[] {
    const recommendations: string[] = [];

    if (anomalies.length === 0) {
      recommendations.push('Maintain consistent and transparent voting patterns');
      return recommendations;
    }

    const partyDeviations = anomalies.filter(a => a.type === 'party_deviation');
    const patternInconsistencies = anomalies.filter(a => a.type === 'pattern_inconsistency');
    const financialCorrelations = anomalies.filter(a => a.type === 'financial_correlation');

    if (partyDeviations.length > 2) {
      recommendations.push('Provide public explanations for significant party-line deviations');
      recommendations.push('Ensure voting decisions are based on constituent interests, not personal gain');
    }

    if (patternInconsistencies.length > 1) {
      recommendations.push('Develop consistent policy framework to guide voting decisions');
      recommendations.push('Publish voting principles and decision-making criteria');
    }

    if (financialCorrelations.length > 0) {
      recommendations.push('Review voting patterns for potential financial bias');
      recommendations.push('Implement pre-vote conflict screening process');
      recommendations.push('Consider recusal from votes where financial interests may influence decisions');
    }

    if (anomalies.length > 5) {
      recommendations.push('Conduct comprehensive review of voting decision-making process');
      recommendations.push('Implement enhanced transparency measures for voting rationale');
    }

    return recommendations;
  }

  private generateTransparencyRecommendations(transparency_score: number): string[] {
    const recommendations: string[] = [];

    if (transparency_score >= 0.8) {
      recommendations.push('Maintain excellent transparency standards');
      return recommendations;
    }

    if (transparency_score < 0.3) {
      recommendations.push('Immediately improve disclosure practices across all areas');
      recommendations.push('Implement comprehensive transparency framework');
      recommendations.push('Engage independent transparency auditor');
    } else if (transparency_score < 0.6) {
      recommendations.push('Enhance disclosure completeness and timeliness');
      recommendations.push('Implement regular transparency reviews');
    }

    recommendations.push('Establish proactive disclosure schedule');
    recommendations.push('Improve verification processes for all disclosures');
    recommendations.push('Consider publishing annual transparency report');

    return recommendations;
  }

  private generateRiskLevelRecommendations(riskLevel: 'low' | 'medium' | 'high' | 'critical'): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('Implement immediate conflict resolution measures');
        recommendations.push('Consider temporary recusal from legislative duties pending conflict resolution');
        recommendations.push('Engage independent ethics advisor');
        recommendations.push('Establish comprehensive conflict management plan');
        break;

      case 'high':
        recommendations.push('Develop comprehensive conflict mitigation strategy within 30 days');
        recommendations.push('Implement enhanced monitoring and reporting protocols');
        recommendations.push('Consider independent oversight of conflict management');
        break;

      case 'medium':
        recommendations.push('Establish regular conflict monitoring and review process');
        recommendations.push('Enhance disclosure practices and transparency measures');
        recommendations.push('Implement preventive conflict management protocols');
        break;

      case 'low':
        recommendations.push('Maintain current ethical standards and transparency practices');
        recommendations.push('Implement periodic conflict review process');
        break;
    }

    return recommendations;
  }

  private prioritizeRecommendations(
    recommendations: string[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string[] {
    // Define priority keywords for different risk levels
    const priorityKeywords = {
      critical: ['immediately', 'urgent', 'critical', 'divest', 'recuse'],
      high: ['comprehensive', 'enhanced', 'independent', 'establish'],
      medium: ['implement', 'develop', 'consider', 'review'],
      low: ['maintain', 'periodic', 'continue']
    };

    const currentPriorityWords = priorityKeywords[riskLevel];

    return recommendations.sort((a, b) => {
      const aHasPriority = currentPriorityWords.some(word => 
        a.toLowerCase().includes(word.toLowerCase())
      );
      const bHasPriority = currentPriorityWords.some(word => 
        b.toLowerCase().includes(word.toLowerCase())
      );

      if (aHasPriority && !bHasPriority) return -1;
      if (!aHasPriority && bHasPriority) return 1;
      return 0;
    });
  }

  private generateSpecificMitigationStrategy(
    conflict: FinancialConflict | ProfessionalConflict
  ): {
    strategy: string;
    timeline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    stakeholders: string[];
  } | null {
    const isFinancial = 'financialValue' in conflict;
    const severity = conflict.conflictSeverity;

    if (severity === 'critical') {
      return {
        strategy: isFinancial 
          ? `Immediate divestiture of ${conflict.organization} holdings or establishment of blind trust`
          : `Immediate resignation from ${conflict.organization} or recusal from all related legislative matters`,
        timeline: '7-14 days',
        priority: 'critical',
        stakeholders: ['Ethics Committee', 'Legal Counsel', 'Financial Advisor']
      };
    }

    if (severity === 'high') {
      return {
        strategy: isFinancial
          ? `Develop divestiture plan for ${conflict.organization} interests or implement enhanced disclosure protocols`
          : `Transition leadership responsibilities at ${conflict.organization} or establish clear recusal protocols`,
        timeline: '30-60 days',
        priority: 'high',
        stakeholders: ['Ethics Committee', 'Legal Counsel']
      };
    }

    return null;
  }
}

export const conflictResolutionRecommendationService = ConflictResolutionRecommendationService.getInstance();