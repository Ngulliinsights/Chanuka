// Anomaly Detection Service
// Handles detection of anomalies and unusual patterns in financial disclosure data

import type { FinancialDisclosure } from '../types';
import { FinancialDisclosureConfig } from '../config';
import { createDatabaseError, createNotFoundError } from '@server/infrastructure/error-handling';
import { cacheService } from '@server/infrastructure/cache';
import { logger } from '@server/infrastructure/observability';
import { readDb as readDatabase } from '@server/infrastructure/database';
import { sponsors } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';
import { disclosureProcessingService } from './disclosure-processing.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnomalyDetectionResult {
  sponsor_id: number;
  sponsorName: string;
  anomalies: FinancialAnomaly[];
  risk_score: number;
  detectionDate: Date;
}

export interface FinancialAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  affectedDisclosures: number[];
  detectedValue: number;
  expectedRange: { min: number; max: number };
  recommendation: string;
}

export interface SystemAnomalyStats {
  totalSponsorsWithAnomalies: number;
  anomaliesBySeverity: Record<AnomalySeverity, number>;
  anomaliesByType: Record<AnomalyType, number>;
  averageRiskScore: number;
}

type AnomalyType =
  | 'amount_spike'
  | 'frequency_change'
  | 'verification_gap'
  | 'missing_data'
  | 'temporal_inconsistency';

type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Record<AnomalySeverity, number> = {
  low: 10,
  medium: 25,
  high: 50,
  critical: 100,
};

/** Sentinel values for anomaly type and severity tallies. */
const ZERO_SEVERITY_COUNTS: Record<AnomalySeverity, number> = {
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
};

const ZERO_TYPE_COUNTS: Record<AnomalyType, number> = {
  amount_spike: 0,
  frequency_change: 0,
  verification_gap: 0,
  missing_data: 0,
  temporal_inconsistency: 0,
};

const MS_PER_DAY = 1_000 * 60 * 60 * 24;
const AVG_DAYS_PER_MONTH = 30.44;

/** Financial disclosure types that must carry an amount. */
const FINANCIAL_TYPES = new Set(['financial', 'investment', 'income']);

/** Minimum number of disclosures needed for statistical validity in each check. */
const MIN_DISCLOSURES_FOR_SPIKE = 3;
const MIN_DISCLOSURES_FOR_FREQUENCY = 6;
const MIN_DISCLOSURES_FOR_TEMPORAL = 3;
const MIN_RECENT_DISCLOSURES_FOR_RATE = 5;

/** Spike threshold: standard deviations above the mean. */
const SPIKE_STD_DEV_THRESHOLD = 3;

/** Verification rate decline: flag if recent rate falls below this fraction of overall rate. */
const VERIFICATION_RATE_DROP_THRESHOLD = 0.7;
const VERIFICATION_RATE_EXPECTED_FLOOR = 0.8;

/** Recent window for verification rate analysis (days). */
const RECENT_VERIFICATION_WINDOW_DAYS = 180;

/** Frequency change: flag if period-over-period shift exceeds this ratio. */
const FREQUENCY_CHANGE_MIN_RATIO = 0.5;
const FREQUENCY_CHANGE_HIGH_RATIO = 1.0;

/** Missing-source threshold: flag if more than this fraction lack a source. */
const MISSING_SOURCE_THRESHOLD = 0.3;
const MISSING_AMOUNT_HIGH_THRESHOLD = 0.5;
const MISSING_AMOUNT_MEDIUM_THRESHOLD = 0.25;

/** Timeline gap thresholds (days). */
const GAP_FLAG_DAYS = 365;
const GAP_HIGH_SEVERITY_DAYS = 730;

/** Max sponsors analysed per system-stats call. */
const SYSTEM_STATS_SPONSOR_LIMIT = 50;
const SYSTEM_STATS_CACHE_TTL_SECONDS = 300;

// ─── Service ──────────────────────────────────────────────────────────────────

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
    const cacheKey = `anomaly_detection_v1_${sponsor_id}`;

    try {
      const cached = await cacheService.get<AnomalyDetectionResult>(cacheKey);
      if (cached) return cached;

      const [sponsorInfo, disclosures] = await Promise.all([
        disclosureProcessingService.getSponsorBasicInfo(sponsor_id),
        disclosureProcessingService.getDisclosureData(sponsor_id),
      ]);

      if (!sponsorInfo) {
        throw createNotFoundError(
          'Sponsor', String(sponsor_id),
          { service: 'anomaly-detection', operation: 'detectAnomalies' },
        );
      }

      const anomalies: FinancialAnomaly[] = [
        ...this.detectAmountSpikes(disclosures),
        ...this.detectFrequencyChanges(disclosures),
        ...this.detectVerificationGaps(disclosures),
        ...this.detectMissingDataPatterns(disclosures),
        ...this.detectTemporalInconsistencies(disclosures),
      ];

      const result: AnomalyDetectionResult = {
        sponsor_id,
        sponsorName: sponsorInfo.name,
        anomalies,
        risk_score: this.calculateRiskScore(anomalies),
        detectionDate: new Date(),
      };

      await cacheService.set(cacheKey, result, this.config.cache.ttl.analyticsReport);
      return result;
    } catch (error) {
      logger.error({ sponsor_id, error }, 'Error detecting anomalies');
      throw createDatabaseError(
        'detectAnomalies',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'anomaly-detection', operation: 'detectAnomalies' },
      );
    }
  }

  /**
   * Gets system-wide anomaly statistics for the monitoring dashboard.
   * Analyses up to {@link SYSTEM_STATS_SPONSOR_LIMIT} active sponsors in parallel.
   * Results are cached for {@link SYSTEM_STATS_CACHE_TTL_SECONDS} seconds.
   */
  async getSystemAnomalyStats(): Promise<SystemAnomalyStats> {
    const cacheKey = 'anomaly_system_stats_v1';

    try {
      const cached = await cacheService.get<SystemAnomalyStats>(cacheKey);
      if (cached) return cached;

      const activeSponsors = await readDatabase
        .select({ id: sponsors.id })
        .from(sponsors)
        .where(eq(sponsors.is_active, true))
        .limit(SYSTEM_STATS_SPONSOR_LIMIT);

      const results = await Promise.allSettled(
        activeSponsors.map(({ id }) => this.detectAnomalies(id)),
      );

      const anomaliesBySeverity = { ...ZERO_SEVERITY_COUNTS };
      const anomaliesByType = { ...ZERO_TYPE_COUNTS };
      const riskScores: number[] = [];
      let totalSponsorsWithAnomalies = 0;

      for (const result of results) {
        if (result.status === 'rejected') continue;
        const { anomalies, risk_score } = result.value;
        if (anomalies.length === 0) continue;

        totalSponsorsWithAnomalies++;
        riskScores.push(risk_score);

        for (const anomaly of anomalies) {
          anomaliesBySeverity[anomaly.severity]++;
          anomaliesByType[anomaly.type]++;
        }
      }

      const stats: SystemAnomalyStats = {
        totalSponsorsWithAnomalies,
        anomaliesBySeverity,
        anomaliesByType,
        averageRiskScore:
          riskScores.length > 0
            ? Math.round(riskScores.reduce((sum, s) => sum + s, 0) / riskScores.length)
            : 0,
      };

      await cacheService.set(cacheKey, stats, SYSTEM_STATS_CACHE_TTL_SECONDS);
      return stats;
    } catch (error) {
      logger.error({ error }, 'Error getting system anomaly stats');
      throw createDatabaseError(
        'getSystemAnomalyStats',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'anomaly-detection', operation: 'getSystemAnomalyStats' },
      );
    }
  }

  // ─── Detection Methods ──────────────────────────────────────────────────────

  /**
   * Detects unusual spikes in disclosure amounts that deviate significantly
   * from historical patterns (> {@link SPIKE_STD_DEV_THRESHOLD} standard deviations above the mean).
   */
  private detectAmountSpikes(disclosures: FinancialDisclosure[]): FinancialAnomaly[] {
    const withAmounts = disclosures.filter(
      (d): d is FinancialDisclosure & { amount: number } => d.amount != null && d.amount > 0,
    );

    if (withAmounts.length < MIN_DISCLOSURES_FOR_SPIKE) return [];

    const amounts = withAmounts.map((d) => d.amount);
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const spikeThreshold = mean + stdDev * SPIKE_STD_DEV_THRESHOLD;

    return withAmounts
      .filter((d) => d.amount > spikeThreshold)
      .map((d) => {
        const deviations = (d.amount - mean) / stdDev;
        const severity = this.amountSpikeSeverity(deviations);
        return {
          type: 'amount_spike' as const,
          severity,
          description: `Disclosure amount of KSh ${d.amount.toLocaleString()} is ${deviations.toFixed(2)} standard deviations above the historical average.`,
          affectedDisclosures: [d.id],
          detectedValue: d.amount,
          expectedRange: { min: 0, max: spikeThreshold },
          recommendation:
            severity === 'critical' || severity === 'high'
              ? 'Immediate verification required — this amount significantly exceeds normal patterns.'
              : 'Review this disclosure for accuracy and ensure proper documentation.',
        };
      });
  }

  /**
   * Detects significant changes in disclosure frequency (> {@link FREQUENCY_CHANGE_MIN_RATIO} shift
   * between periods) that may indicate compliance issues or a change in financial activity.
   */
  private detectFrequencyChanges(disclosures: FinancialDisclosure[]): FinancialAnomaly[] {
    if (disclosures.length < MIN_DISCLOSURES_FOR_FREQUENCY) return [];

    // Sort once; pass pre-sorted slices to avoid redundant sorts in periodInMonths.
    const sorted = [...disclosures].sort(
      (a, b) => a.dateReported.getTime() - b.dateReported.getTime(),
    );
    const mid = Math.floor(sorted.length / 2);
    const firstPeriod = sorted.slice(0, mid);
    const secondPeriod = sorted.slice(mid);

    const firstFreq = firstPeriod.length / this.periodInMonths(firstPeriod, true);
    const secondFreq = secondPeriod.length / this.periodInMonths(secondPeriod, true);

    if (firstFreq === 0) return [];

    const changeRatio = Math.abs(secondFreq - firstFreq) / firstFreq;
    if (changeRatio <= FREQUENCY_CHANGE_MIN_RATIO) return [];

    const isIncrease = secondFreq > firstFreq;

    return [
      {
        type: 'frequency_change',
        severity: changeRatio > FREQUENCY_CHANGE_HIGH_RATIO ? 'high' : 'medium',
        description: `Disclosure frequency ${isIncrease ? 'increased' : 'decreased'} by ${Math.round(changeRatio * 100)}% between periods (${firstFreq.toFixed(1)} → ${secondFreq.toFixed(1)} per month).`,
        affectedDisclosures: secondPeriod.map((d) => d.id),
        detectedValue: secondFreq,
        expectedRange: {
          min: firstFreq * (1 - FREQUENCY_CHANGE_MIN_RATIO),
          max: firstFreq * (1 + FREQUENCY_CHANGE_MIN_RATIO),
        },
        recommendation: isIncrease
          ? 'Verify if increased activity reflects actual financial changes or improved compliance.'
          : 'Investigate potential compliance gaps or reduced financial activity.',
      },
    ];
  }

  /**
   * Detects gaps in verification status — both high-value unverified disclosures
   * and a declining verification rate over the last {@link RECENT_VERIFICATION_WINDOW_DAYS} days.
   */
  private detectVerificationGaps(disclosures: FinancialDisclosure[]): FinancialAnomaly[] {
    const anomalies: FinancialAnomaly[] = [];

    // High-value unverified disclosures
    const highValueUnverified = disclosures.filter(
      (d) => !d.is_verified && d.amount != null && d.amount > this.config.thresholds.investment,
    );

    if (highValueUnverified.length > 0) {
      const totalValue = highValueUnverified.reduce((sum, d) => sum + (d.amount ?? 0), 0);
      anomalies.push({
        type: 'verification_gap',
        severity: totalValue > 1_000_000 ? 'critical' : 'high',
        description: `${highValueUnverified.length} high-value disclosure(s) (total: KSh ${totalValue.toLocaleString()}) remain unverified.`,
        affectedDisclosures: highValueUnverified.map((d) => d.id),
        detectedValue: highValueUnverified.length,
        expectedRange: { min: 0, max: 0 },
        recommendation:
          'Prioritize verification of high-value disclosures to ensure compliance and accuracy.',
      });
    }

    // Recent verification rate decline vs all-time rate
    const cutoff = Date.now() - RECENT_VERIFICATION_WINDOW_DAYS * MS_PER_DAY;
    const recentDisclosures = disclosures.filter((d) => d.dateReported.getTime() >= cutoff);

    if (recentDisclosures.length >= MIN_RECENT_DISCLOSURES_FOR_RATE) {
      const verificationRate = (arr: FinancialDisclosure[]) =>
        arr.filter((d) => d.is_verified).length / arr.length;

      const recentRate = verificationRate(recentDisclosures);
      const overallRate = verificationRate(disclosures);

      if (recentRate < overallRate * VERIFICATION_RATE_DROP_THRESHOLD) {
        anomalies.push({
          type: 'verification_gap',
          severity: 'medium',
          description: `Recent verification rate (${Math.round(recentRate * 100)}%) is significantly below the historical average (${Math.round(overallRate * 100)}%).`,
          affectedDisclosures: recentDisclosures.filter((d) => !d.is_verified).map((d) => d.id),
          detectedValue: recentRate,
          expectedRange: { min: overallRate * VERIFICATION_RATE_EXPECTED_FLOOR, max: 1.0 },
          recommendation:
            'Review verification processes and address any bottlenecks in the approval workflow.',
        });
      }
    }

    return anomalies;
  }

  /**
   * Detects patterns of missing critical data fields (amounts and sources).
   */
  private detectMissingDataPatterns(disclosures: FinancialDisclosure[]): FinancialAnomaly[] {
    const anomalies: FinancialAnomaly[] = [];

    // Missing amounts on financial disclosures
    const financialDisclosures = disclosures.filter((d) => FINANCIAL_TYPES.has(d.disclosureType));
    const missingAmounts = financialDisclosures.filter((d) => d.amount == null);

    if (missingAmounts.length > 0) {
      const missingRate = missingAmounts.length / financialDisclosures.length;
      anomalies.push({
        type: 'missing_data',
        severity:
          missingRate > MISSING_AMOUNT_HIGH_THRESHOLD
            ? 'high'
            : missingRate > MISSING_AMOUNT_MEDIUM_THRESHOLD
              ? 'medium'
              : 'low',
        description: `${missingAmounts.length} financial disclosure(s) (${Math.round(missingRate * 100)}%) are missing amount information.`,
        affectedDisclosures: missingAmounts.map((d) => d.id),
        detectedValue: missingAmounts.length,
        expectedRange: { min: 0, max: Math.floor(financialDisclosures.length * 0.1) },
        recommendation:
          'Complete missing amount information for financial disclosures to improve data quality.',
      });
    }

    // Missing source fields
    const missingSources = disclosures.filter((d) => !d.source?.trim());
    if (missingSources.length > disclosures.length * MISSING_SOURCE_THRESHOLD) {
      anomalies.push({
        type: 'missing_data',
        severity: 'medium',
        description: `${missingSources.length} disclosure(s) are missing source information.`,
        affectedDisclosures: missingSources.map((d) => d.id),
        detectedValue: missingSources.length,
        expectedRange: { min: 0, max: Math.floor(disclosures.length * 0.1) },
        recommendation:
          'Add source information to improve disclosure transparency and traceability.',
      });
    }

    return anomalies;
  }

  /**
   * Detects temporal inconsistencies: future-dated records and unusually
   * long gaps (> {@link GAP_FLAG_DAYS} days) in the disclosure timeline.
   */
  private detectTemporalInconsistencies(disclosures: FinancialDisclosure[]): FinancialAnomaly[] {
    if (disclosures.length < MIN_DISCLOSURES_FOR_TEMPORAL) return [];

    const anomalies: FinancialAnomaly[] = [];
    const now = new Date();

    // Future-dated disclosures
    const futureDated = disclosures.filter((d) => d.dateReported > now);
    if (futureDated.length > 0) {
      anomalies.push({
        type: 'temporal_inconsistency',
        severity: 'high',
        description: `${futureDated.length} disclosure(s) have future dates, which may indicate data entry errors.`,
        affectedDisclosures: futureDated.map((d) => d.id),
        detectedValue: futureDated.length,
        expectedRange: { min: 0, max: 0 },
        recommendation: 'Review and correct disclosure dates that appear in the future.',
      });
    }

    // Timeline gaps exceeding the flag threshold
    const sorted = [...disclosures].sort(
      (a, b) => a.dateReported.getTime() - b.dateReported.getTime(),
    );

    let longestGapDays = 0;
    let gapCount = 0;

    for (let i = 1; i < sorted.length; i++) {
      const daysBetween =
        (sorted[i]!.dateReported.getTime() - sorted[i - 1]!.dateReported.getTime()) / MS_PER_DAY;
      if (daysBetween > GAP_FLAG_DAYS) {
        gapCount++;
        if (daysBetween > longestGapDays) longestGapDays = daysBetween;
      }
    }

    if (gapCount > 0) {
      anomalies.push({
        type: 'temporal_inconsistency',
        severity: longestGapDays > GAP_HIGH_SEVERITY_DAYS ? 'high' : 'medium',
        description: `Found ${gapCount} significant gap(s) in the disclosure timeline. Longest gap: ${Math.round(longestGapDays)} days.`,
        affectedDisclosures: [],
        detectedValue: longestGapDays,
        expectedRange: { min: 0, max: GAP_FLAG_DAYS },
        recommendation:
          'Review disclosure timeline for completeness and ensure regular reporting compliance.',
      });
    }

    return anomalies;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Maps standard-deviation distance above the mean to a severity level.
   * Callers guarantee `deviations > {@link SPIKE_STD_DEV_THRESHOLD}`, so 'low' is intentionally
   * excluded — every detected spike is at least 'medium'.
   */
  private amountSpikeSeverity(deviations: number): AnomalySeverity {
    if (deviations > 5) return 'critical';
    if (deviations > 4) return 'high';
    return 'medium'; // guaranteed > SPIKE_STD_DEV_THRESHOLD (3) by caller
  }

  /**
   * Returns the time span of a disclosure set in months (minimum 1).
   *
   * @param disclosures - The disclosures to measure.
   * @param alreadySorted - Skip re-sorting when the caller has already sorted the array.
   */
  private periodInMonths(disclosures: FinancialDisclosure[], alreadySorted = false): number {
    if (disclosures.length < 2) return 1;

    const ordered = alreadySorted
      ? disclosures
      : [...disclosures].sort((a, b) => a.dateReported.getTime() - b.dateReported.getTime());

    const spanMs =
      ordered[ordered.length - 1]!.dateReported.getTime() - ordered[0]!.dateReported.getTime();

    return Math.max(spanMs / (MS_PER_DAY * AVG_DAYS_PER_MONTH), 1);
  }

  /**
   * Calculates an overall risk score (0–100) from a list of anomalies.
   * Applies diminishing returns via `sqrt(n)` scaling to prevent many low-severity
   * anomalies from drowning out a single critical one.
   */
  private calculateRiskScore(anomalies: FinancialAnomaly[]): number {
    if (anomalies.length === 0) return 0;
    const total = anomalies.reduce((sum, a) => sum + SEVERITY_WEIGHTS[a.severity], 0);
    return Math.min(Math.round(total / Math.sqrt(anomalies.length)), 100);
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();