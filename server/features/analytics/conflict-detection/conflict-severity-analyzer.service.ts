/**
 * Conflict Severity Analyzer Service
 * 
 * Responsible for calculating risk scores, determining severity levels,
 * and assessing confidence in conflict detection results.
 */

import { logger  } from '@shared/core';

import {
  ConflictAnalysis,
  ConflictDetectionConfig,
  FinancialConflict,
  ProfessionalConflict,
  VotingAnomaly} from './types.js';

export class ConflictSeverityAnalyzerService {
  private static instance: ConflictSeverityAnalyzerService;
  private readonly config: ConflictDetectionConfig;

  public static getInstance(): ConflictSeverityAnalyzerService {
    if (!ConflictSeverityAnalyzerService.instance) {
      ConflictSeverityAnalyzerService.instance = new ConflictSeverityAnalyzerService();
    }
    return ConflictSeverityAnalyzerService.instance;
  }

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Calculates the overall risk score for a sponsor
   */
  calculateOverallRiskScore(
    financialConflicts: FinancialConflict[],
    professionalConflicts: ProfessionalConflict[],
    votingAnomalies: VotingAnomaly[],
    transparency_score: number
  ): number {
    try {
      const financialScore = this.calculateFinancialRiskScore(financialConflicts);
      const professionalScore = this.calculateProfessionalRiskScore(professionalConflicts);
      const votingScore = this.calculateVotingRiskScore(votingAnomalies);
      const transparencyPenalty = this.calculateTransparencyPenalty(transparency_score);

      // Weighted combination of risk factors
      const baseScore = (
        financialScore * 0.4 +
        professionalScore * 0.3 +
        votingScore * 0.2 +
        transparencyPenalty * 0.1
      );

      // Apply multipliers for severe combinations
      let multiplier = 1.0;

      // High financial + professional conflicts are particularly concerning
      if (financialScore > 0.7 && professionalScore > 0.7) {
        multiplier += 0.2;
      }

      // Multiple voting anomalies with financial conflicts
      if (votingScore > 0.6 && financialScore > 0.5) {
        multiplier += 0.15;
      }

      // Low transparency with high conflicts
      if (transparency_score < 0.3 && (financialScore > 0.6 || professionalScore > 0.6)) {
        multiplier += 0.1;
      }

      const finalScore = Math.min(baseScore * multiplier, 1.0);

      logger.debug('Risk score calculation:', {
        component: 'ConflictSeverityAnalyzer',
        financialScore,
        professionalScore,
        votingScore,
        transparencyPenalty,
        multiplier,
        finalScore
      });

      return Math.round(finalScore * 100) / 100;
    } catch (error) {
      logger.error('Error calculating overall risk score:', {
        component: 'ConflictSeverityAnalyzer',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0.5; // Default moderate risk
    }
  }

  /**
   * Determines the risk level based on the overall risk score
   */
  determineRiskLevel(overallRiskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (overallRiskScore >= 0.8) return 'critical';
    if (overallRiskScore >= 0.6) return 'high';
    if (overallRiskScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calculates confidence in the analysis results
   */
  calculateAnalysisConfidence(
    financialConflicts: FinancialConflict[],
    professionalConflicts: ProfessionalConflict[],
    votingAnomalies: VotingAnomaly[],
    transparency_score: number
  ): number {
    try {
      let confidence = 0.5; // Base confidence

      // Higher confidence with more evidence
      const totalConflicts = financialConflicts.length + professionalConflicts.length + votingAnomalies.length;
      confidence += Math.min(totalConflicts * 0.05, 0.2);

      // Higher confidence with verified evidence
      const verifiedFinancial = financialConflicts.filter(c => c.evidenceStrength >= 80).length;
      const verifiedProfessional = professionalConflicts.filter(c => c.evidenceStrength >= 80).length;
      confidence += (verifiedFinancial + verifiedProfessional) * 0.03;

      // Higher confidence with good transparency
      if (transparency_score > 0.7) {
        confidence += 0.1;
      } else if (transparency_score < 0.3) {
        confidence -= 0.1;
      }

      // Higher confidence with consistent patterns
      if (votingAnomalies.length > 2) {
        confidence += 0.05;
      }

      return Math.max(0.1, Math.min(confidence, 0.95));
    } catch (error) {
      logger.error('Error calculating analysis confidence:', {
        component: 'ConflictSeverityAnalyzer',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0.5;
    }
  }

  /**
   * Calculates transparency score based on disclosures
   */
  calculateTransparencyScore(disclosures: any[]): number {
    if (disclosures.length === 0) return 0.1;

    let score = 0.3; // Base score for having any disclosures

    // Points for verified disclosures
    const verifiedCount = disclosures.filter(d => d.is_verified).length;
    score += (verifiedCount / disclosures.length) * 0.4;

    // Points for recent disclosures
    const recentCount = disclosures.filter(d => {
      const disclosureDate = new Date(d.created_at);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return disclosureDate > oneYearAgo;
    }).length;
    score += (recentCount / disclosures.length) * 0.2;

    // Points for comprehensive disclosures
    const types = new Set(disclosures.map(d => d.disclosureType));
    score += Math.min(types.size * 0.05, 0.1);

    return Math.min(score, 1.0);
  }

  /**
   * Calculates transparency grade based on score
   */
  calculateTransparencyGrade(transparency_score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (transparency_score >= 0.9) return 'A';
    if (transparency_score >= 0.8) return 'B';
    if (transparency_score >= 0.6) return 'C';
    if (transparency_score >= 0.4) return 'D';
    return 'F';
  }

  /**
   * Assesses the severity of individual conflicts
   */
  assessConflictSeverity(
    conflict: FinancialConflict | ProfessionalConflict
  ): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // Base severity from the conflict itself
    const severityScores = { low: 0.2, medium: 0.4, high: 0.7, critical: 1.0 };
    score += severityScores[conflict.conflictSeverity];

    // Evidence strength factor
    score += (conflict.evidenceStrength / 100) * 0.3;

    // Number of affected bills
    score += Math.min(conflict.affectedBills.length * 0.05, 0.2);

    // Financial value for financial conflicts
    if ('financialValue' in conflict && conflict.financialValue > 0) {
      if (conflict.financialValue >= 10000000) score += 0.3;
      else if (conflict.financialValue >= 5000000) score += 0.2;
      else if (conflict.financialValue >= 1000000) score += 0.1;
    }

    // Relationship strength for professional conflicts
    if ('relationshipStrength' in conflict) {
      score += conflict.relationshipStrength * 0.2;
    }

    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  // Private helper methods

  private calculateFinancialRiskScore(conflicts: FinancialConflict[]): number {
    if (conflicts.length === 0) return 0;

    let score = 0;
    let totalValue = 0;

    for (const conflict of conflicts) {
      // Base score from severity
      const severityScores = { low: 0.2, medium: 0.4, high: 0.7, critical: 1.0 };
      score += severityScores[conflict.conflictSeverity] * 0.3;

      // Financial value impact
      totalValue += conflict.financialValue;

      // Evidence strength
      score += (conflict.evidenceStrength / 100) * 0.1;

      // Number of affected bills
      score += Math.min(conflict.affectedBills.length * 0.02, 0.1);
    }

    // Total financial exposure
    if (totalValue >= 50000000) score += 0.4;      // 50M+
    else if (totalValue >= 20000000) score += 0.3; // 20M+
    else if (totalValue >= 10000000) score += 0.2; // 10M+
    else if (totalValue >= 5000000) score += 0.1;  // 5M+

    // Multiple conflicts penalty
    if (conflicts.length > 3) score += 0.1;
    if (conflicts.length > 5) score += 0.1;

    return Math.min(score, 1.0);
  }

  private calculateProfessionalRiskScore(conflicts: ProfessionalConflict[]): number {
    if (conflicts.length === 0) return 0;

    let score = 0;

    for (const conflict of conflicts) {
      // Base score from severity
      const severityScores = { low: 0.2, medium: 0.4, high: 0.7, critical: 1.0 };
      score += severityScores[conflict.conflictSeverity] * 0.25;

      // Relationship strength
      score += conflict.relationshipStrength * 0.15;

      // Active vs inactive conflicts
      if (conflict.is_active) score += 0.05;

      // Evidence strength
      score += (conflict.evidenceStrength / 100) * 0.1;

      // Leadership roles are more concerning
      if (conflict.type === 'leadership_role') score += 0.1;
      if (conflict.type === 'ownership_stake') score += 0.15;
    }

    // Multiple active conflicts
    const activeConflicts = conflicts.filter(c => c.is_active).length;
    if (activeConflicts > 2) score += 0.1;
    if (activeConflicts > 4) score += 0.1;

    return Math.min(score, 1.0);
  }

  private calculateVotingRiskScore(anomalies: VotingAnomaly[]): number {
    if (anomalies.length === 0) return 0;

    let score = 0;

    for (const anomaly of anomalies) {
      score += anomaly.anomalyScore * 0.2;

      // Different types have different weights
      switch (anomaly.type) {
        case 'financial_correlation':
          score += 0.15;
          break;
        case 'party_deviation':
          score += 0.1;
          break;
        case 'pattern_inconsistency':
          score += 0.08;
          break;
        case 'timing_suspicious':
          score += 0.12;
          break;
      }
    }

    // Multiple anomalies penalty
    if (anomalies.length > 3) score += 0.1;
    if (anomalies.length > 5) score += 0.15;

    return Math.min(score, 1.0);
  }

  private calculateTransparencyPenalty(transparency_score: number): number {
    // Convert transparency score to penalty (inverse relationship)
    return Math.max(0, 1.0 - transparency_score);
  }

  private loadConfiguration(): ConflictDetectionConfig {
    return {
      financialThresholds: {
        direct: 100000,
        indirect: 500000,
        family: 250000
      },
      professionalWeights: {
        leadership: 0.8,
        advisory: 0.6,
        ownership: 0.9
      },
      votingAnomalyThresholds: {
        partyDeviation: 0.3,
        patternInconsistency: 0.4
      },
      confidenceThresholds: {
        high: 0.8,
        medium: 0.6,
        low: 0.4
      }
    };
  }
}

export const conflictSeverityAnalyzerService = ConflictSeverityAnalyzerService.getInstance();
