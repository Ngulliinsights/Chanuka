// Anomaly Detection Service
// Handles detection of anomalies and unusual patterns in financial disclosure data

import type {
  CompletenessReport,
  FinancialDisclosure} from '@server/types/index';
import { FinancialDisclosureConfig } from '@shared/config';
import { DatabaseError } from '@shared/core';
import { cache } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { readDatabase } from '@server/infrastructure/database';
import { sponsors, sponsorTransparency } from "@shared/foundation";
import { and, count,desc, eq, sql } from "drizzle-orm";

import { disclosureProcessingService } from './disclosure-processing.service';

export interface AnomalyDetectionResult {
  sponsor_id: number;
  sponsorName: string;
  anomalies: FinancialAnomaly[];
  risk_score: number;
  detectionDate: Date;
}

export interface FinancialAnomaly {
  type: 'amount_spike' | 'frequency_change' | 'verification_gap' | 'missing_data' | 'temporal_inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedDisclosures: number[];
  detectedValue: number;
  expectedRange: { min: number; max: number };
  recommendation: string;
}

/**
 * Anomaly Detection Service
 * 
 * Responsible for:
 * - Detecting unusual patterns in financial disclosure data
 * - Identifying amount spikes and frequency changes
 * - Finding verification gaps and missing data patterns
 * - Assessing temporal inconsistencies
 */
export class AnomalyDetectionService {
  private readonly config = FinancialDisclosureConfig;

  /**
   * Performs comprehensive anomaly detection for a sponsor's financial disclosures.
   */
  async detectAnomalies(sponsor_id: number): Promise<AnomalyDetectionResult> {
    try {
      const cacheKey = `anomaly_detection_v1_${sponsor_id}`;

      return await cache.getOrSetCache(
        cacheKey,
        this.config.cache.ttl.analyticsReport,
        async () => {
          const [sponsorInfo, disclosures] = await Promise.all([
            disclosureProcessingService.getSponsorBasicInfo(sponsor_id),
            disclosureProcessingService.getDisclosureData(sponsor_id)
          ]);

          const anomalies: FinancialAnomaly[] = [];

          // Detect different types of anomalies
          anomalies.push(...await this.detectAmountSpikes(disclosures));
          anomalies.push(...await this.detectFrequencyChanges(disclosures));
          anomalies.push(...await this.detectVerificationGaps(disclosures));
          anomalies.push(...await this.detectMissingDataPatterns(disclosures));
          anomalies.push(...await this.detectTemporalInconsistencies(disclosures));

          // Calculate overall risk score based on anomalies
          const risk_score = this.calculateAnomalyRiskScore(anomalies);

          return {
            sponsor_id,
            sponsorName: sponsorInfo.name,
            anomalies,
            risk_score,
            detectionDate: new Date()
          };
        }
      );
    } catch (error) {
      logger.error('Error detecting anomalies:', { sponsor_id }, error);
      throw new DatabaseError('Failed to detect financial disclosure anomalies');
    }
  }

  /**
   * Detects unusual spikes in disclosure amounts that deviate significantly
   * from historical patterns.
   */
  private async detectAmountSpikes(disclosures: FinancialDisclosure[]): Promise<FinancialAnomaly[]> {
    const anomalies: FinancialAnomaly[] = [];
    const disclosuresWithAmounts = disclosures.filter(d => d.amount && d.amount > 0);

    if (disclosuresWithAmounts.length < 3) return anomalies;

    // Calculate statistical measures
    const amounts = disclosuresWithAmounts.map(d => d.amount!);
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Define spike threshold (3 standard deviations above mean)
    const spikeThreshold = mean + (3 * stdDev);

    // Find disclosures that exceed the spike threshold
    const spikes = disclosuresWithAmounts.filter(d => d.amount! > spikeThreshold);

    for (const spike of spikes) {
      const severity = this.assessAmountSpikeSeverity(spike.amount!, mean, stdDev);
      
      anomalies.push({
        type: 'amount_spike',
        severity,
        description: `Disclosure amount of KSh ${spike.amount!.toLocaleString()} is ${Math.round((spike.amount! - mean) / stdDev * 100) / 100} standard deviations above the historical average.`,
        affectedDisclosures: [spike.id],
        detectedValue: spike.amount!,
        expectedRange: { min: 0, max: spikeThreshold },
        recommendation: severity === 'critical' || severity === 'high' 
          ? 'Immediate verification required - this amount significantly exceeds normal patterns.'
          : 'Review this disclosure for accuracy and ensure proper documentation.'
      });
    }

    return anomalies;
  }

  /**
   * Detects changes in disclosure frequency patterns that might indicate
   * compliance issues or changes in financial activity.
   */
  private async detectFrequencyChanges(disclosures: FinancialDisclosure[]): Promise<FinancialAnomaly[]> {
    const anomalies: FinancialAnomaly[] = [];

    if (disclosures.length < 6) return anomalies; // Need sufficient data

    // Sort disclosures by date
    const sorted = [...disclosures].sort((a, b) => a.dateReported.getTime() - b.dateReported.getTime());

    // Split into two periods for comparison
    const midpoint = Math.floor(sorted.length / 2);
    const firstPeriod = sorted.slice(0, midpoint);
    const secondPeriod = sorted.slice(midpoint);

    // Calculate disclosure frequency for each period (disclosures per month)
    const firstPeriodMonths = this.calculatePeriodInMonths(firstPeriod);
    const secondPeriodMonths = this.calculatePeriodInMonths(secondPeriod);

    const firstFrequency = firstPeriodMonths > 0 ? firstPeriod.length / firstPeriodMonths : 0;
    const secondFrequency = secondPeriodMonths > 0 ? secondPeriod.length / secondPeriodMonths : 0;

    // Detect significant changes (>50% change)
    if (firstFrequency > 0) {
      const changeRatio = Math.abs(secondFrequency - firstFrequency) / firstFrequency;
      
      if (changeRatio > 0.5) {
        const isIncrease = secondFrequency > firstFrequency;
        const severity = changeRatio > 1.0 ? 'high' : 'medium';

        anomalies.push({
          type: 'frequency_change',
          severity,
          description: `Disclosure frequency ${isIncrease ? 'increased' : 'decreased'} by ${Math.round(changeRatio * 100)}% between periods (from ${firstFrequency.toFixed(1)} to ${secondFrequency.toFixed(1)} per month).`,
          affectedDisclosures: secondPeriod.map(d => d.id),
          detectedValue: secondFrequency,
          expectedRange: { min: firstFrequency * 0.5, max: firstFrequency * 1.5 },
          recommendation: isIncrease 
            ? 'Verify if increased activity reflects actual financial changes or improved compliance.'
            : 'Investigate potential compliance gaps or reduced financial activity.'
        });
      }
    }

    return anomalies;
  }

  /**
   * Detects gaps in verification status that might indicate compliance issues.
   */
  private async detectVerificationGaps(disclosures: FinancialDisclosure[]): Promise<FinancialAnomaly[]> {
    const anomalies: FinancialAnomaly[] = [];

    // Find high-value unverified disclosures
    const highValueUnverified = disclosures.filter(d => 
      !d.is_verified && 
      d.amount && 
      d.amount > this.config.thresholds.investment
    );

    if (highValueUnverified.length > 0) {
      const totalUnverifiedValue = highValueUnverified.reduce((sum, d) => sum + (d.amount || 0), 0);
      const severity = totalUnverifiedValue > 1_000_000 ? 'critical' : 'high';

      anomalies.push({
        type: 'verification_gap',
        severity,
        description: `${highValueUnverified.length} high-value disclosures (total: KSh ${totalUnverifiedValue.toLocaleString()}) remain unverified.`,
        affectedDisclosures: highValueUnverified.map(d => d.id),
        detectedValue: highValueUnverified.length,
        expectedRange: { min: 0, max: 0 },
        recommendation: 'Prioritize verification of high-value disclosures to ensure compliance and accuracy.'
      });
    }

    // Check for verification rate decline over time
    const recentDisclosures = disclosures
      .filter(d => {
        const ageInDays = (Date.now() - d.dateReported.getTime()) / (1000 * 60 * 60 * 24);
        return ageInDays <= 180; // Last 6 months
      });

    if (recentDisclosures.length >= 5) {
      const recentVerificationRate = recentDisclosures.filter(d => d.is_verified).length / recentDisclosures.length;
      const overallVerificationRate = disclosures.filter(d => d.is_verified).length / disclosures.length;

      if (recentVerificationRate < overallVerificationRate * 0.7) {
        anomalies.push({
          type: 'verification_gap',
          severity: 'medium',
          description: `Recent verification rate (${Math.round(recentVerificationRate * 100)}%) is significantly lower than historical average (${Math.round(overallVerificationRate * 100)}%).`,
          affectedDisclosures: recentDisclosures.filter(d => !d.is_verified).map(d => d.id),
          detectedValue: recentVerificationRate,
          expectedRange: { min: overallVerificationRate * 0.8, max: 1.0 },
          recommendation: 'Review verification processes and address any bottlenecks in the approval workflow.'
        });
      }
    }

    return anomalies;
  }

  /**
   * Detects patterns of missing critical data fields.
   */
  private async detectMissingDataPatterns(disclosures: FinancialDisclosure[]): Promise<FinancialAnomaly[]> {
    const anomalies: FinancialAnomaly[] = [];

    // Check for missing amounts in financial disclosures
    const financialDisclosures = disclosures.filter(d => 
      ['financial', 'investment', 'income'].includes(d.disclosureType)
    );
    const missingAmounts = financialDisclosures.filter(d => !d.amount);

    if (missingAmounts.length > 0) {
      const missingRate = missingAmounts.length / financialDisclosures.length;
      const severity = missingRate > 0.5 ? 'high' : missingRate > 0.25 ? 'medium' : 'low';

      anomalies.push({
        type: 'missing_data',
        severity,
        description: `${missingAmounts.length} financial disclosures (${Math.round(missingRate * 100)}%) are missing amount information.`,
        affectedDisclosures: missingAmounts.map(d => d.id),
        detectedValue: missingAmounts.length,
        expectedRange: { min: 0, max: Math.floor(financialDisclosures.length * 0.1) },
        recommendation: 'Complete missing amount information for financial disclosures to improve data quality.'
      });
    }

    // Check for missing sources
    const missingSources = disclosures.filter(d => !d.source || d.source.trim().length === 0);
    if (missingSources.length > disclosures.length * 0.3) {
      anomalies.push({
        type: 'missing_data',
        severity: 'medium',
        description: `${missingSources.length} disclosures are missing source information.`,
        affectedDisclosures: missingSources.map(d => d.id),
        detectedValue: missingSources.length,
        expectedRange: { min: 0, max: Math.floor(disclosures.length * 0.1) },
        recommendation: 'Add source information to improve disclosure transparency and traceability.'
      });
    }

    return anomalies;
  }

  /**
   * Detects temporal inconsistencies in disclosure patterns.
   */
  private async detectTemporalInconsistencies(disclosures: FinancialDisclosure[]): Promise<FinancialAnomaly[]> {
    const anomalies: FinancialAnomaly[] = [];

    if (disclosures.length < 3) return anomalies;

    // Check for future-dated disclosures
    const now = new Date();
    const futureDated = disclosures.filter(d => d.dateReported > now);

    if (futureDated.length > 0) {
      anomalies.push({
        type: 'temporal_inconsistency',
        severity: 'high',
        description: `${futureDated.length} disclosures have future dates, which may indicate data entry errors.`,
        affectedDisclosures: futureDated.map(d => d.id),
        detectedValue: futureDated.length,
        expectedRange: { min: 0, max: 0 },
        recommendation: 'Review and correct disclosure dates that appear in the future.'
      });
    }

    // Check for large gaps in disclosure timeline
    const sorted = [...disclosures].sort((a, b) => a.dateReported.getTime() - b.dateReported.getTime());
    const gaps: { start: Date; end: Date; daysGap: number }[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (sorted[i].dateReported.getTime() - sorted[i-1].dateReported.getTime()) / (1000 * 60 * 60 * 24);
      if (daysBetween > 365) { // Gap longer than 1 year
        gaps.push({
          start: sorted[i-1].dateReported,
          end: sorted[i].dateReported,
          daysGap: daysBetween
        });
      }
    }

    if (gaps.length > 0) {
      const longestGap = gaps.reduce((max, gap) => gap.daysGap > max.daysGap ? gap : max);
      
      anomalies.push({
        type: 'temporal_inconsistency',
        severity: longestGap.daysGap > 730 ? 'high' : 'medium',
        description: `Found ${gaps.length} significant gap(s) in disclosure timeline. Longest gap: ${Math.round(longestGap.daysGap)} days.`,
        affectedDisclosures: [],
        detectedValue: longestGap.daysGap,
        expectedRange: { min: 0, max: 365 },
        recommendation: 'Review disclosure timeline for completeness and ensure regular reporting compliance.'
      });
    }

    return anomalies;
  }

  /**
   * Calculates the severity of an amount spike based on statistical deviation.
   */
  private assessAmountSpikeSeverity(amount: number, mean: number, stdDev: number): FinancialAnomaly['severity'] {
    const deviations = (amount - mean) / stdDev;
    
    if (deviations > 5) return 'critical';
    if (deviations > 4) return 'high';
    if (deviations > 3) return 'medium';
    return 'low';
  }

  /**
   * Calculates the time period in months for a set of disclosures.
   */
  private calculatePeriodInMonths(disclosures: FinancialDisclosure[]): number {
    if (disclosures.length === 0) return 0;
    
    const sorted = [...disclosures].sort((a, b) => a.dateReported.getTime() - b.dateReported.getTime());
    const start = sorted[0].dateReported;
    const end = sorted[sorted.length - 1].dateReported;
    
    const diffInMs = end.getTime() - start.getTime();
    const diffInMonths = diffInMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
    
    return Math.max(diffInMonths, 1); // Minimum 1 month to avoid division by zero
  }

  /**
   * Calculates an overall risk score based on detected anomalies.
   */
  private calculateAnomalyRiskScore(anomalies: FinancialAnomaly[]): number {
    if (anomalies.length === 0) return 0;

    const severityWeights = {
      low: 10,
      medium: 25,
      high: 50,
      critical: 100
    };

    const totalScore = anomalies.reduce((sum, anomaly) => {
      return sum + severityWeights[anomaly.severity];
    }, 0);

    // Normalize to 0-100 scale, with diminishing returns for many anomalies
    return Math.min(Math.round(totalScore / Math.sqrt(anomalies.length)), 100);
  }

  /**
   * Gets system-wide anomaly statistics for monitoring dashboard.
   */
  async getSystemAnomalyStats(): Promise<{
    totalSponsorsWithAnomalies: number;
    anomaliesBySeverity: Record<FinancialAnomaly['severity'], number>;
    anomaliesByType: Record<FinancialAnomaly['type'], number>;
    averageRiskScore: number;
  }> {
    try {
      // Get active sponsors (limited for performance)
      const activeSponsors = await readDatabase
        .select({ id: sponsors.id })
        .from(sponsors)
        .where(eq(sponsors.is_active, true))
        .limit(50);

      const allAnomalies: FinancialAnomaly[] = [];
      const riskScores: number[] = [];
      let sponsorsWithAnomalies = 0;

      // Analyze each sponsor
      for (const sponsor of activeSponsors) {
        try {
          const result = await this.detectAnomalies(sponsors.id);
          if (result.anomalies.length > 0) {
            sponsorsWithAnomalies++;
            allAnomalies.push(...result.anomalies);
            riskScores.push(result.risk_score);
          }
        } catch {
          // Skip sponsors that error out
          continue;
        }
      }

      // Calculate statistics
      const anomaliesBySeverity = {
        low: allAnomalies.filter(a => a.severity === 'low').length,
        medium: allAnomalies.filter(a => a.severity === 'medium').length,
        high: allAnomalies.filter(a => a.severity === 'high').length,
        critical: allAnomalies.filter(a => a.severity === 'critical').length
      };

      const anomaliesByType = {
        amount_spike: allAnomalies.filter(a => a.type === 'amount_spike').length,
        frequency_change: allAnomalies.filter(a => a.type === 'frequency_change').length,
        verification_gap: allAnomalies.filter(a => a.type === 'verification_gap').length,
        missing_data: allAnomalies.filter(a => a.type === 'missing_data').length,
        temporal_inconsistency: allAnomalies.filter(a => a.type === 'temporal_inconsistency').length
      };

      const averageRiskScore = riskScores.length > 0
        ? Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length)
        : 0;

      return {
        totalSponsorsWithAnomalies: sponsorsWithAnomalies,
        anomaliesBySeverity,
        anomaliesByType,
        averageRiskScore
      };
    } catch (error) {
      logger.error('Error getting system anomaly stats:', error);
      throw new DatabaseError('Failed to retrieve system anomaly statistics');
    }
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();


