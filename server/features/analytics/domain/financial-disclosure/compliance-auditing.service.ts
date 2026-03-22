// financial-disclosure-monitoring.ts
// Production-Ready Financial Disclosure Monitoring Service
// Handles automated monitoring cycles, alert generation, and operational data access

import { FinancialDisclosureConfig } from '@server/features/analytics/domain/financial-disclosure/config';
import { logger } from '@server/infrastructure/observability';
import { sponsors, sponsorTransparency } from '@server/infrastructure/schema';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { PgDatabase } from 'drizzle-orm/pg-core';
import type { CacheService } from '@server/infrastructure/cache/types';
import {
  createDatabaseError,
  createNotFoundError,
  createValidationError,
} from '@server/infrastructure/error-handling';

import type {
  CompletenessScore,
  FinancialAlert,
  FinancialDisclosure,
  HealthCheckResult,
  MonitoringStatus,
  SponsorInfo,
  SystemHealthStatus,
} from './types';

// ============================================================================
// Service Interface & Dependencies
// ============================================================================

/**
 * Dependencies required by the monitoring service.
 * Using dependency injection for testability and flexibility.
 */
export interface MonitoringServiceDependencies {
  readDb: PgDatabase<any>;
  writeDb: PgDatabase<any>;
  cache: CacheService;
  logger: typeof logger;
}

// ─── Internal raw-row type ────────────────────────────────────────────────────

/** Shape of a row returned by the disclosure SELECT query. */
interface RawDisclosureRow {
  id: number;
  sponsor_id: number;
  disclosureType: string;
  description: string | null;
  amount: string | null;
  source: string | null;
  dateReported: string;
  is_verified: boolean | number;
  created_at: string | null;
}

// ============================================================================
// Main Service Class
// ============================================================================

/**
 * Financial Disclosure Monitoring Service
 *
 * Handles the operational aspects of financial disclosure monitoring:
 * - Automated scheduled monitoring cycles
 * - Alert generation and management
 * - Data collection and caching
 * - Health monitoring and graceful shutdown
 *
 * Architecture principles:
 * - Dependency injection for testability
 * - Separate read/write databases for scalability
 * - Batch processing to prevent system overwhelm
 * - Graceful shutdown to prevent data corruption
 * - Comprehensive error handling and logging
 */
export class ComplianceAuditingService {
  private readonly readDb: PgDatabase<any>;
  private readonly writeDb: PgDatabase<any>;
  private readonly cache: CacheService;
  private readonly logger: typeof logger;
  private readonly config = FinancialDisclosureConfig;

  private monitoringTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private isCycleRunning = false;
  private status: MonitoringStatus = {
    isRunning: false,
    lastCheckTime: null,
    next_checkTime: null,
    checksPerformed: 0,
    alertsGenerated: 0,
    errorsEncountered: 0,
  };

  constructor(dependencies: MonitoringServiceDependencies) {
    this.readDb = dependencies.readDb;
    this.writeDb = dependencies.writeDb;
    this.cache = dependencies.cache;
    this.logger = dependencies.logger;
  }

  // ============================================================================
  // Public API — Monitoring Lifecycle
  // ============================================================================

  /**
   * Starts automated monitoring with graceful error handling.
   * Idempotent — calling it multiple times won't create duplicate timers.
   */
  startAutomatedMonitoring(): void {
    if (this.monitoringTimer) {
      this.logger.warn({ component: 'server' }, 'Monitoring already active. Ignoring start request.');
      return;
    }

    this.logger.info(
      {
        interval: this.config.monitoring.dailyCheckInterval,
        batchSize: this.config.monitoring.batchSize,
      },
      'Starting automated financial disclosure monitoring',
    );

    this.isShuttingDown = false;
    this.status.isRunning = true;

    const runCycle = async () => {
      if (this.isShuttingDown) return;

      try {
        await this.performMonitoringCycle();
        this.status.checksPerformed++;
        this.status.lastCheckTime = new Date();
        this.status.next_checkTime = new Date(
          Date.now() + this.config.monitoring.dailyCheckInterval,
        );
      } catch (error) {
        this.status.errorsEncountered++;
        this.logger.error({ error }, 'Error in monitoring cycle');

        if (this.status.errorsEncountered > this.config.monitoring.maxRetries) {
          this.logger.error(
            { errorsEncountered: this.status.errorsEncountered },
            'Max retries exceeded. Stopping monitoring.',
          );
          void this.stopAutomatedMonitoring();
        }
      }
    };

    this.monitoringTimer = setInterval(runCycle, this.config.monitoring.dailyCheckInterval);
    runCycle(); // Perform initial check immediately.
  }

  /**
   * Gracefully stops monitoring, allowing the current cycle to complete.
   * Waits up to the configured timeout before forcing shutdown.
   */
  async stopAutomatedMonitoring(): Promise<void> {
    if (!this.monitoringTimer) {
      this.logger.info({ component: 'server' }, 'Monitoring not active. Nothing to stop.');
      return;
    }

    this.logger.info({ component: 'server' }, 'Initiating graceful monitoring shutdown...');
    this.isShuttingDown = true;

    clearInterval(this.monitoringTimer);
    this.monitoringTimer = null;

    const maxWaitTime = this.config.monitoring.shutdownTimeoutMs;
    const startTime = Date.now();

    while (this.isCycleRunning && Date.now() - startTime < maxWaitTime) {
      await this.sleep(500);
    }

    if (this.isCycleRunning) {
      this.logger.warn({ component: 'server' }, 'Monitoring cycle still running after timeout. Forcing shutdown.');
    }

    this.status.isRunning = false;
    this.status.next_checkTime = null;

    this.logger.info(
      {
        checksPerformed: this.status.checksPerformed,
        alertsGenerated: this.status.alertsGenerated,
        errorsEncountered: this.status.errorsEncountered,
      },
      'Monitoring stopped successfully',
    );
  }

  /**
   * Manually triggers a monitoring check.
   * Useful for testing or on-demand compliance runs.
   */
  async triggerManualCheck(): Promise<FinancialAlert[]> {
    this.logger.info({ component: 'server' }, 'Manual monitoring check triggered');

    try {
      const alerts = await this.performMonitoringCycle();
      this.status.checksPerformed++;
      this.status.lastCheckTime = new Date();
      return alerts;
    } catch (error) {
      this.status.errorsEncountered++;
      this.logger.error({ error }, 'Error in manual monitoring check');
      throw error;
    }
  }

  /** Returns current monitoring status for observability and diagnostics. */
  getStatus(): MonitoringStatus {
    return { ...this.status };
  }

  // ============================================================================
  // Public API — Data Access & Analysis
  // ============================================================================

  /**
   * Retrieves sponsor information with validation and caching.
   * Throws a not-found error if the sponsor does not exist.
   */
  async getSponsorInfo(sponsor_id: number): Promise<SponsorInfo> {
    if (!sponsor_id || sponsor_id <= 0) {
      throw createValidationError(
        [{ field: 'sponsor_id', message: 'Must be a positive integer', value: sponsor_id }],
        { service: 'financial-disclosure-monitoring', operation: 'getSponsorInfo' },
      );
    }

    const cacheKey = this.config.cache.keyPrefixes.sponsor(sponsor_id);
    const cached = await this.cache.get<SponsorInfo>(cacheKey);
    if (cached) return cached;

    const result = await this.readDb
      .select({ id: sponsors.id, name: sponsors.name, is_active: sponsors.is_active })
      .from(sponsors)
      .where(eq(sponsors.id, sponsor_id))
      .limit(1);

    if (result.length === 0) {
      throw createNotFoundError(
        'Sponsor', String(sponsor_id),
        { service: 'financial-disclosure-monitoring', operation: 'getSponsorInfo' },
      );
    }

    const sponsorInfo = result[0] as SponsorInfo;
    await this.cache.set(cacheKey, sponsorInfo, this.config.cache.ttl.sponsorInfo);
    return sponsorInfo;
  }

  /**
   * Collects all financial disclosures for a sponsor (or system-wide) with caching.
   */
  async collectFinancialDisclosures(sponsor_id?: number): Promise<FinancialDisclosure[]> {
    const cacheKey = sponsor_id
      ? this.config.cache.keyPrefixes.disclosures(sponsor_id)
      : this.config.cache.keyPrefixes.allDisclosures();

    try {
      const cached = await this.cache.get<FinancialDisclosure[]>(cacheKey);
      if (cached) return cached;

      let query = this.readDb.select().from(sponsorTransparency).$dynamic();

      if (sponsor_id) {
        query = query.where(eq(sponsorTransparency.sponsor_id, sponsor_id));
      }

      const rawDisclosures = await query.orderBy(desc(sponsorTransparency.dateReported));
      const disclosures = (rawDisclosures as RawDisclosureRow[]).map((d) =>
        this.enhanceDisclosure(d),
      );

      await this.cache.set(cacheKey, disclosures, this.config.cache.ttl.disclosureData);
      return disclosures;
    } catch (error) {
      this.logger.error({ sponsor_id, error }, 'Error collecting financial disclosures');
      throw createDatabaseError(
        'collectFinancialDisclosures',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'financial-disclosure-monitoring', operation: 'collectFinancialDisclosures' },
      );
    }
  }

  /**
   * Calculates a fast completeness score for operational monitoring.
   * For deep analytics with temporal trends and recommendations,
   * use the separate analytics service.
   */
  async calculateBasicCompleteness(sponsor_id: number): Promise<CompletenessScore> {
    const disclosures = await this.collectFinancialDisclosures(sponsor_id);
    const presentTypes = new Set(disclosures.map((d) => d.disclosureType));
    const missing = this.config.requiredTypes.filter((t) => !presentTypes.has(t));

    const totalRequired = this.config.requiredTypes.length;
    const totalPresent = totalRequired - missing.length;

    return {
      sponsor_id,
      score: Math.round((totalPresent / totalRequired) * 100),
      missingDisclosures: [...missing],
      totalRequired,
      totalPresent,
    };
  }

  /**
   * Exports sponsor disclosures in JSON or CSV format.
   * Useful for compliance reporting and external audits.
   */
  async exportSponsorDisclosures(
    sponsor_id: number,
    format: 'json' | 'csv',
  ): Promise<string> {
    await this.getSponsorInfo(sponsor_id); // Verify sponsor exists.
    const disclosures = await this.collectFinancialDisclosures(sponsor_id);

    if (format === 'json') {
      return JSON.stringify(disclosures, null, 2);
    }

    const headers = [
      'id',
      'disclosureType',
      'description',
      'amount',
      'source',
      'dateReported',
      'is_verified',
      'riskLevel',
    ];

    const rows = disclosures.map((d) =>
      [
        d.id,
        this.sanitizeCsvCell(d.disclosureType),
        this.sanitizeCsvCell(d.description || ''),
        d.amount ?? '',
        this.sanitizeCsvCell(d.source ?? ''),
        d.dateReported.toISOString(),
        d.is_verified,
        d.riskLevel,
      ].join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ============================================================================
  // Public API — Alert Management
  // ============================================================================

  /**
   * Creates a manual alert, typically triggered by external systems or admins.
   * Validates the sponsor exists and persists the alert to cache and database.
   */
  async createManualAlert(
    type: FinancialAlert['type'],
    sponsor_id: number,
    description: string,
    severity: FinancialAlert['severity'],
    metadata: Record<string, unknown> = {},
  ): Promise<FinancialAlert> {
    const sponsor = await this.getSponsorInfo(sponsor_id);

    const alert = this.generateAlert(
      type,
      sponsor.id,
      sponsor.name,
      description,
      severity,
      metadata,
    );

    await this.persistAlerts([alert]);
    this.status.alertsGenerated++;

    this.logger.info({ alertId: alert.id, sponsor_id, type, severity }, 'Manual alert created');

    return alert;
  }

  /**
   * Retrieves recent alerts with flexible filtering options.
   */
  async getRecentAlerts(options?: {
    sponsor_id?: number;
    severity?: FinancialAlert['severity'];
    type?: FinancialAlert['type'];
    includeResolved?: boolean;
    limit?: number;
  }): Promise<FinancialAlert[]> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.recentAlerts();
      const allAlerts = (await this.cache.get<FinancialAlert[]>(cacheKey)) ?? [];

      let filtered = allAlerts;

      if (options?.sponsor_id !== undefined) {
        filtered = filtered.filter((a: FinancialAlert) => a.sponsor_id === options.sponsor_id);
      }
      if (options?.severity) {
        filtered = filtered.filter((a: FinancialAlert) => a.severity === options.severity);
      }
      if (options?.type) {
        filtered = filtered.filter((a: FinancialAlert) => a.type === options.type);
      }
      if (!options?.includeResolved) {
        filtered = filtered.filter((a: FinancialAlert) => !a.isResolved);
      }

      // created_at is a Date on the interface but may have been deserialized from
      // JSON cache as a string — coerce defensively via new Date() before comparing.
      filtered.sort(
        (a: FinancialAlert, b: FinancialAlert) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return filtered.slice(0, options?.limit ?? 50);
    } catch (error) {
      this.logger.error({ error }, 'Error fetching recent alerts');
      return [];
    }
  }

  /**
   * Marks an alert as resolved with optional resolution notes.
   */
  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    const cacheKey = this.config.cache.keyPrefixes.alerts(alertId);

    // Fetch outside the try-catch so a missing alert propagates as NOT_FOUND,
    // not wrapped into a generic DatabaseError.
    const alert = await this.cache.get<FinancialAlert>(cacheKey);
    if (!alert) {
      throw createNotFoundError(
        'Alert', alertId,
        { service: 'financial-disclosure-monitoring', operation: 'resolveAlert' },
      );
    }

    try {
      alert.isResolved = true;
      alert.metadata.resolvedAt = new Date().toISOString();
      if (resolution) {
        alert.metadata.resolution = resolution;
      }

      await this.cache.set(cacheKey, alert, this.config.cache.ttl.alerts);
      this.logger.info({ alertId, sponsor_id: alert.sponsor_id, resolution }, 'Alert resolved');
    } catch (error) {
      this.logger.error({ alertId, error }, 'Error resolving alert');
      throw createDatabaseError(
        'resolveAlert',
        error instanceof Error ? error : new Error(String(error)),
        { service: 'financial-disclosure-monitoring', operation: 'resolveAlert' },
      );
    }
  }

  // ============================================================================
  // Public API — Health & Diagnostics
  // ============================================================================

  /**
   * Performs comprehensive health checks on all service dependencies.
   */
  async getHealthStatus(): Promise<SystemHealthStatus> {
    const checks = await Promise.all([
      this.checkDatabaseConnection(this.readDb, 'Read Database'),
      this.checkDatabaseConnection(this.writeDb, 'Write Database'),
      this.checkCacheHealth(),
      this.checkMonitoringHealth(),
    ]);

    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');
    const status = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

    return { status, checks, timestamp: new Date() };
  }

  // ============================================================================
  // Private Methods — Core Monitoring Logic
  // ============================================================================

  /**
   * Orchestrates a complete monitoring cycle with batch processing.
   */
  private async performMonitoringCycle(): Promise<FinancialAlert[]> {
    if (this.isCycleRunning) {
      this.logger.warn({ component: 'server' }, 'Monitoring cycle already in progress. Skipping.');
      return [];
    }

    this.isCycleRunning = true;
    this.logger.info({ component: 'server' }, 'Starting monitoring cycle');

    const allAlerts: FinancialAlert[] = [];

    try {
      const activeSponsors = await this.readDb
        .select({ id: sponsors.id })
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      const totalSponsors = activeSponsors.length;
      const batchSize = this.config.monitoring.batchSize;
      const totalBatches = Math.ceil(totalSponsors / batchSize);

      this.logger.info({ totalSponsors, batchSize, totalBatches }, 'Processing sponsors in batches');

      for (let i = 0; i < totalSponsors; i += batchSize) {
        if (this.isShuttingDown) {
          this.logger.info({ component: 'server' }, 'Shutdown requested. Stopping batch processing.');
          break;
        }

        const currentBatch = Math.floor(i / batchSize) + 1;
        this.status.currentBatch = currentBatch;
        this.status.totalBatches = totalBatches;

        const batch = activeSponsors.slice(i, i + batchSize);
        const sponsor_ids = batch.map((s) => s.id);

        this.logger.info(
          { sponsorCount: sponsor_ids.length },
          `Processing batch ${currentBatch}/${totalBatches}`,
        );

        const [newDisclosureAlerts, thresholdAlerts, missingAlerts, staleAlerts] =
          await Promise.all([
            this.checkNewDisclosures(sponsor_ids),
            this.checkThresholdViolations(sponsor_ids),
            this.checkMissingDisclosures(sponsor_ids),
            this.checkStaleDisclosures(sponsor_ids),
          ]);

        allAlerts.push(
          ...newDisclosureAlerts,
          ...thresholdAlerts,
          ...missingAlerts,
          ...staleAlerts,
        );

        if (i + batchSize < totalSponsors) {
          await this.sleep(100);
        }
      }

      if (allAlerts.length > 0) {
        await this.persistAlerts(allAlerts);
      }

      this.logger.info(
        {
          totalAlerts: allAlerts.length,
          breakdown: {
            info: allAlerts.filter((a: FinancialAlert) => a.severity === 'info').length,
            warning: allAlerts.filter((a: FinancialAlert) => a.severity === 'warning').length,
            critical: allAlerts.filter((a: FinancialAlert) => a.severity === 'critical').length,
          },
        },
        'Monitoring cycle completed',
      );

      this.status.alertsGenerated += allAlerts.length;
    } catch (error) {
      this.logger.error({ error }, 'Critical error in monitoring cycle');
      throw error;
    } finally {
      this.isCycleRunning = false;
      this.status.currentBatch = undefined;
      this.status.totalBatches = undefined;
    }

    return allAlerts;
  }

  /**
   * Detects new disclosures within the configured lookback window.
   */
  private async checkNewDisclosures(sponsor_ids: number[]): Promise<FinancialAlert[]> {
    // drizzle-orm's inArray() throws when given an empty array.
    if (sponsor_ids.length === 0) return [];

    const alerts: FinancialAlert[] = [];
    const cutoffDate = new Date(
      Date.now() - this.config.monitoring.lookbackWindowHours * 60 * 60 * 1000,
    );

    try {
      const newDisclosures = await this.readDb
        .select({
          id: sponsorTransparency.id,
          sponsor_id: sponsorTransparency.sponsor_id,
          sponsorName: sponsors.name,
          disclosureType: sponsorTransparency.disclosureType,
          amount: sponsorTransparency.amount,
          source: sponsorTransparency.source,
          created_at: sponsorTransparency.created_at,
        })
        .from(sponsorTransparency)
        .innerJoin(sponsors, eq(sponsorTransparency.sponsor_id, sponsors.id))
        .where(
          and(
            inArray(sponsorTransparency.sponsor_id, sponsor_ids),
            gte(sponsorTransparency.created_at, cutoffDate),
          ),
        )
        .limit(1000);

      for (const disclosure of newDisclosures) {
        const description = this.formatNewDisclosureDescription(disclosure);
        const severity = this.determineSeverityByAmount(Number(disclosure.amount) || 0);

        alerts.push(
          this.generateAlert(
            'new_disclosure',
            disclosure.sponsor_id,
            disclosure.sponsorName,
            description,
            severity,
            {
              disclosureId: disclosure.id,
              disclosureType: disclosure.disclosureType,
              amount: disclosure.amount,
            },
          ),
        );
      }
    } catch (error) {
      this.logger.error({ error }, 'Error checking new disclosures');
    }

    return alerts;
  }

  /** Stub implementations for remaining monitoring checks. */
  private async checkThresholdViolations(_sponsor_ids: number[]): Promise<FinancialAlert[]> {
    return [];
  }

  private async checkMissingDisclosures(_sponsor_ids: number[]): Promise<FinancialAlert[]> {
    return [];
  }

  private async checkStaleDisclosures(_sponsor_ids: number[]): Promise<FinancialAlert[]> {
    return [];
  }

  /** Persists a batch of alerts to the cache and write database. */
  private async persistAlerts(alerts: FinancialAlert[]): Promise<void> {
    const cacheKey = this.config.cache.keyPrefixes.recentAlerts();
    const existing = (await this.cache.get<FinancialAlert[]>(cacheKey)) ?? [];

    const merged = [...alerts, ...existing].slice(0, this.config.alerting.maxRecentAlerts);
    await this.cache.set(cacheKey, merged, this.config.cache.ttl.alerts);

    for (const alert of alerts) {
      const alertKey = this.config.cache.keyPrefixes.alerts(alert.id);
      await this.cache.set(alertKey, alert, this.config.cache.ttl.alerts);
    }
  }

  // ============================================================================
  // Private Methods — Health Checks
  // ============================================================================

  private async checkDatabaseConnection(
    db: PgDatabase<any>,
    name: string,
  ): Promise<HealthCheckResult> {
    try {
      await db.execute(sql`SELECT 1`);
      return { name, status: 'healthy' };
    } catch (error) {
      return { name, status: 'unhealthy', error: (error as Error).message };
    }
  }

  private async checkCacheHealth(): Promise<HealthCheckResult> {
    try {
      // getStats may not exist on all CacheService implementations.
      const stats = (this.cache as any).getStats?.();
      if (stats?.size != null && stats.size > 10_000) {
        return {
          name: 'Cache',
          status: 'degraded',
          message: `Cache size is high: ${stats.size} entries`,
        };
      }
      return { name: 'Cache', status: 'healthy' };
    } catch (error) {
      return { name: 'Cache', status: 'unhealthy', error: (error as Error).message };
    }
  }

  private async checkMonitoringHealth(): Promise<HealthCheckResult> {
    const timeSinceLastCheck = this.status.lastCheckTime
      ? Date.now() - this.status.lastCheckTime.getTime()
      : Infinity;

    const maxAcceptableGap = this.config.monitoring.dailyCheckInterval * 2;

    if (!this.status.isRunning && this.monitoringTimer) {
      return {
        name: 'Monitoring Service',
        status: 'unhealthy',
        message: 'Service in inconsistent state',
      };
    }

    if (this.status.isRunning && timeSinceLastCheck > maxAcceptableGap) {
      return {
        name: 'Monitoring Service',
        status: 'degraded',
        message: 'No checks performed recently',
      };
    }

    if (
      this.status.checksPerformed > 0 &&
      this.status.errorsEncountered > this.status.checksPerformed * 0.5
    ) {
      return {
        name: 'Monitoring Service',
        status: 'degraded',
        message: 'High error rate detected',
      };
    }

    return { name: 'Monitoring Service', status: 'healthy' };
  }

  // ============================================================================
  // Private Methods — Data Enhancement & Utilities
  // ============================================================================

  /** Converts a raw DB row into a fully enriched FinancialDisclosure. */
  private enhanceDisclosure(raw: RawDisclosureRow): FinancialDisclosure {
    const reportedDate = new Date(raw.dateReported);

    return {
      id: raw.id,
      sponsor_id: raw.sponsor_id,
      disclosureType: raw.disclosureType as FinancialDisclosure['disclosureType'],
      description: raw.description ?? '',
      amount: raw.amount != null ? Number(raw.amount) : undefined,
      source: raw.source ?? undefined,
      dateReported: reportedDate,
      is_verified: Boolean(raw.is_verified),
      completenessScore: this.calculateIndividualCompletenessScore(raw),
      riskLevel: this.assessDisclosureRisk(raw),
      lastUpdated: raw.created_at ? new Date(raw.created_at) : reportedDate,
    };
  }

  private calculateIndividualCompletenessScore(disclosure: RawDisclosureRow): number {
    let score = 40;
    if (disclosure.is_verified) score += 30;
    if (disclosure.amount != null) score += 20;
    if (disclosure.source != null) score += 10;
    return Math.min(score, 100);
  }

  private assessDisclosureRisk(
    disclosure: RawDisclosureRow,
  ): FinancialDisclosure['riskLevel'] {
    const amount = Number(disclosure.amount) || 0;
    const is_verified = Boolean(disclosure.is_verified);

    if (!is_verified && amount > 1_000_000) return 'critical';
    if (!is_verified && amount > 500_000) return 'high';
    if (amount > 1_000_000) return 'high';
    if (amount > 100_000) return 'medium';
    return 'low';
  }

  private generateAlert(
    type: FinancialAlert['type'],
    sponsor_id: number,
    sponsorName: string,
    description: string,
    severity: FinancialAlert['severity'],
    metadata: Record<string, unknown> = {},
  ): FinancialAlert {
    return {
      id: this.generateAlertId(type, sponsor_id),
      type,
      sponsor_id,
      sponsorName,
      description,
      severity,
      created_at: new Date(),
      isResolved: false,
      metadata,
    };
  }

  private generateAlertId(type: string, sponsor_id: number): string {
    const random = Math.random().toString(36).substring(2, 9);
    return `alert_${type}_${sponsor_id}_${Date.now()}_${random}`;
  }

  private formatNewDisclosureDescription(disclosure: {
    disclosureType: string;
    amount: unknown;
    source: string | null;
  }): string {
    const parts = [`New ${disclosure.disclosureType} disclosure`];
    if (disclosure.amount) {
      parts.push(`Amount: KSh ${Number(disclosure.amount).toLocaleString()}`);
    }
    if (disclosure.source) {
      parts.push(`Source: ${disclosure.source}`);
    }
    return parts.join(' | ');
  }

  private determineSeverityByAmount(amount: number): FinancialAlert['severity'] {
    if (amount >= 1_000_000) return 'critical';
    if (amount >= 100_000) return 'warning';
    return 'info';
  }

  /**
   * Sanitizes a CSV cell value to prevent formula injection.
   * Values starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with
   * an apostrophe inside a quoted field to neutralise them.
   */
  private sanitizeCsvCell(value: string): string {
    const sanitized = value.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(sanitized)) {
      return `"'${sanitized}"`;
    }
    return `"${sanitized}"`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new monitoring service instance with injected dependencies.
 *
 * @example
 *   const service = createMonitoringService({
 *     readDb: readDatabase,
 *     writeDb: writeDatabase,
 *     cache: cacheService,
 *     logger,
 *   });
 */
export function createMonitoringService(
  dependencies: MonitoringServiceDependencies,
): ComplianceAuditingService {
  return new ComplianceAuditingService(dependencies);
}

// ============================================================================
// Type Exports
// ============================================================================

export type { FinancialDisclosure, FinancialAlert, MonitoringStatus, CompletenessScore, SystemHealthStatus };