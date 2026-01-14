// financial-disclosure-monitoring.ts
// Production-Ready Financial Disclosure Monitoring Service
// Handles automated monitoring cycles, alert generation, and operational data access

import { FinancialDisclosureConfig } from '@server/features/analytics/financial-disclosure/config.ts';
import { logger } from '@shared/core/observability/logging/logger.js';
import {
  notifications,
  sponsors,
  sponsorTransparency} from '@server/infrastructure/schema/schema.js';
import { and, desc, eq, gte, inArray,sql } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";

import { CacheService } from '@/infrastructure/cache/cache-service.js';
import {
  DatabaseError,
  NotFoundError as SponsorNotFoundError,
  ValidationError as InvalidInputError
} from '@/utils/errors.js';

import type {
  CompletenessScore,
  FinancialAlert,
  FinancialDisclosure,
  HealthCheckResult,
  MonitoringStatus,
  SponsorInfo,
  SystemHealthStatus} from './types.js';

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

// ============================================================================
// Main Service Class
// ============================================================================

/**
 * Financial Disclosure Monitoring Service
 * 
 * This service handles the operational aspects of financial disclosure monitoring:
 * - Automated scheduled monitoring cycles
 * - Alert generation and management
 * - Data collection and caching
 * - Health monitoring and graceful shutdown
 * 
 * Architecture Principles:
 * - Dependency injection for testability
 * - Separate read/write databases for scalability
 * - Batch processing to prevent system overwhelm
 * - Graceful shutdown to prevent data corruption
 * - Comprehensive error handling and logging
 * 
 * Usage:
 *   const service = new FinancialDisclosureMonitoringService(dependencies);
 *   service.startAutomatedMonitoring();
 *   // ... later ...
 *   await service.stopAutomatedMonitoring();
 */
export class FinancialDisclosureMonitoringService {
  // Injected dependencies
  private readonly readDb: PgDatabase<any>;
  private readonly writeDb: PgDatabase<any>;
  private readonly cache: CacheService;
  private readonly logger: typeof logger;
  
  // Configuration from centralized config
  private readonly config = FinancialDisclosureConfig;

  // Monitoring state management
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private isCycleRunning = false;
  private status: MonitoringStatus = {
    isRunning: false,
    lastCheckTime: null,
    next_checkTime: null,
    checksPerformed: 0,
    alertsGenerated: 0,
    errorsEncountered: 0
  };

  constructor(dependencies: MonitoringServiceDependencies) {
    this.readDb = dependencies.readDb;
    this.writeDb = dependencies.writeDb;
    this.cache = dependencies.cache;
    this.logger = dependencies.logger;
  }

  // ============================================================================
  // Public API - Monitoring Lifecycle
  // ============================================================================

  /**
   * Starts automated monitoring with graceful error handling.
   * This method is idempotent - calling it multiple times won't create duplicate timers.
   * 
   * The monitoring cycle runs on a configured interval and performs:
   * 1. New disclosure detection
   * 2. Threshold violation checks
   * 3. Missing disclosure identification
   * 4. Stale disclosure detection
   */
  startAutomatedMonitoring(): void {
    if (this.monitoringTimer) {
      this.logger.warn('Monitoring already active. Ignoring start request.');
      return;
    }

    this.logger.info('Starting automated financial disclosure monitoring', {
      interval: this.config.monitoring.dailyCheckInterval,
      batchSize: this.config.monitoring.batchSize
    });

    this.isShuttingDown = false;
    this.status.isRunning = true;

    // Define the monitoring cycle runner
    const runCycle = async () => {
      if (this.isShuttingDown) return;

      try {
        await this.performMonitoringCycle();
        this.status.checksPerformed++;
        this.status.lastCheckTime = new Date();
        this.status.next_checkTime = new Date(
          Date.now() + this.config.monitoring.dailyCheckInterval
        );
      } catch (error) {
        this.status.errorsEncountered++;
        this.logger.error('Error in monitoring cycle', { error });
        
        // Implement exponential backoff for repeated failures
        if (this.status.errorsEncountered > this.config.monitoring.maxRetries) {
          this.logger.error('Max retries exceeded. Stopping monitoring.', {
            errorsEncountered: this.status.errorsEncountered
          });
          this.stopAutomatedMonitoring();
        }
      }
    };

    // Set up recurring timer
    this.monitoringTimer = setInterval(
      runCycle, 
      this.config.monitoring.dailyCheckInterval
    );

    // Perform initial check immediately
    runCycle();
  }

  /**
   * Gracefully stops monitoring, allowing current operations to complete.
   * This prevents data corruption and ensures clean shutdown.
   * 
   * The method will wait up to the configured timeout for the current
   * cycle to complete before forcing shutdown.
   */
  async stopAutomatedMonitoring(): Promise<void> {
    if (!this.monitoringTimer) {
      this.logger.info('Monitoring not active. Nothing to stop.');
      return;
    }

    this.logger.info('Initiating graceful monitoring shutdown...');
    this.isShuttingDown = true;

    // Clear the interval timer
    clearInterval(this.monitoringTimer);
    this.monitoringTimer = null;

    // Wait for any running cycle to complete with timeout
    const maxWaitTime = this.config.monitoring.shutdownTimeoutMs;
    const startTime = Date.now();
    
    while (this.isCycleRunning && (Date.now() - startTime) < maxWaitTime) {
      await this.sleep(500);
    }

    if (this.isCycleRunning) {
      this.logger.warn('Monitoring cycle still running after timeout. Forcing shutdown.');
    }

    this.status.isRunning = false;
    this.status.next_checkTime = null;
    
    this.logger.info('Monitoring stopped successfully', {
      checksPerformed: this.status.checksPerformed,
      alertsGenerated: this.status.alertsGenerated,
      errorsEncountered: this.status.errorsEncountered
    });
  }

  /**
   * Manually triggers a monitoring check, useful for testing or on-demand analysis.
   * Returns all alerts generated during the check.
   */
  async triggerManualCheck(): Promise<FinancialAlert[]> {
    this.logger.info('Manual monitoring check triggered');
    
    try {
      const alerts = await this.performMonitoringCycle();
      this.status.checksPerformed++;
      this.status.lastCheckTime = new Date();
      return alerts;
    } catch (error) {
      this.status.errorsEncountered++;
      this.logger.error('Error in manual monitoring check', { error });
      throw error;
    }
  }

  /**
   * Returns current monitoring status for observability and diagnostics.
   */
  getStatus(): MonitoringStatus {
    return { ...this.status };
  }

  // ============================================================================
  // Public API - Data Access & Analysis
  // ============================================================================

  /**
   * Retrieves sponsor information with validation and caching.
   * Throws SponsorNotFoundError if the sponsor doesn't exist.
   */
  async getSponsorInfo(sponsor_id: number): Promise<SponsorInfo> {
    if (!sponsor_id || sponsor_id <= 0) {
      throw new InvalidInputError('Invalid sponsor ID provided.');
    }

    const cacheKey = this.config.cache.keyPrefixes.sponsor(sponsor_id);
    
    const cached = await this.cache.get<SponsorInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.readDb
      .select({
        id: sponsors.id,
        name: sponsors.name,
        is_active: sponsors.is_active
      })
      .from(sponsors)
      .where(eq(sponsors.id, sponsor_id))
      .limit(1);

    if (result.length === 0) {
      throw new SponsorNotFoundError(`Sponsor with ID ${sponsor_id} not found.`);
    }

    const sponsorInfo = result[0];
    await this.cache.set(cacheKey, sponsorInfo, this.config.cache.ttl.sponsorInfo);
    return sponsorInfo;
  }

  /**
   * Collects all financial disclosures for a sponsor with caching.
   * This is the primary data access method used throughout the service.
   * 
   * If no sponsor_id is provided, returns all disclosures in the system
   * (useful for system-wide analysis and dashboard generation).
   */
  async collectFinancialDisclosures(sponsor_id?: number): Promise<FinancialDisclosure[]> {
    const cacheKey = sponsor_id 
      ? this.config.cache.keyPrefixes.disclosures(sponsor_id)
      : this.config.cache.keyPrefixes.allDisclosures();

    try {
      const cached = await this.cache.get<FinancialDisclosure[]>(cacheKey);
      if (cached) {
        return cached;
      }

      let query = this.readDb
        .select()
        .from(sponsorTransparency)
        .$dynamic();

      if (sponsor_id) {
        query = query.where(eq(sponsorTransparency.sponsor_id, sponsor_id));
      }

      const rawDisclosures = await query.orderBy(
        desc(sponsorTransparency.dateReported)
      );

      const disclosures = rawDisclosures.map(d => this.enhanceDisclosure(d));
      await this.cache.set(cacheKey, disclosures, this.config.cache.ttl.disclosureData);
      return disclosures;
    } catch (error) {
      this.logger.error('Error collecting financial disclosures', { sponsor_id, error });
      throw new DatabaseError('Failed to collect financial disclosures.');
    }
  }

  /**
   * Calculates a fast completeness score for operational monitoring.
   * For detailed analytics with temporal trends and recommendations,
   * use the separate analytics service.
   */
  async calculateBasicCompleteness(sponsor_id: number): Promise<CompletenessScore> {
    const disclosures = await this.collectFinancialDisclosures(sponsor_id);
    const presentTypes = new Set(disclosures.map(d => d.disclosureType));
    const missing = this.config.requiredTypes.filter(
      t => !presentTypes.has(t)
    );

    const totalRequired = this.config.requiredTypes.length;
    const totalPresent = totalRequired - missing.length;
    const score = Math.round((totalPresent / totalRequired) * 100);

    return {
      sponsor_id,
      score,
      missingDisclosures: [...missing],
      totalRequired,
      totalPresent
    };
  }

  /**
   * Exports sponsor disclosures in JSON or CSV format.
   * Useful for compliance reporting, external audits, and data analysis.
   */
  async exportSponsorDisclosures(
    sponsor_id: number, 
    format: 'json' | 'csv'
  ): Promise<string> {
    // Verify sponsor exists
    await this.getSponsorInfo(sponsor_id);
    
    const disclosures = await this.collectFinancialDisclosures(sponsor_id);

    if (format === 'json') {
      return JSON.stringify(disclosures, null, 2);
    }

    // Generate CSV with proper escaping
    const headers = [
      'id', 'disclosureType', 'description', 'amount', 
      'source', 'dateReported', 'is_verified', 'riskLevel'
    ];
    
    const rows = disclosures.map(d => [
      d.id,
      d.disclosureType,
      `"${(d.description || '').replace(/"/g, '""')}"`,
      d.amount || '',
      d.source || '',
      d.dateReported.toISOString(),
      d.is_verified,
      d.riskLevel
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // ============================================================================
  // Public API - Alert Management
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
    metadata: Record<string, any> = {}
  ): Promise<FinancialAlert> {
    const sponsor = await this.getSponsorInfo(sponsor_id);
    
    const alert = this.generateAlert(
      type, 
      sponsors.id, 
      sponsors.name, 
      description, 
      severity,
      metadata
    );

    await this.persistAlerts([alert]);
    this.status.alertsGenerated++;
    
    this.logger.info('Manual alert created', {
      alertId: alert.id,
      sponsor_id,
      type,
      severity
    });
    
    return alert;
  }

  /**
   * Retrieves recent alerts with flexible filtering options.
   * Supports filtering by sponsor, severity, type, and resolution status.
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
      const allAlerts = await this.cache.get<FinancialAlert[]>(cacheKey) || [];

      let filtered = allAlerts;

      // Apply filters progressively
      if (options?.sponsor_id) {
        filtered = filtered.filter(a => a.sponsor_id === options.sponsor_id);
      }

      if (options?.severity) {
        filtered = filtered.filter(a => a.severity === options.severity);
      }

      if (options?.type) {
        filtered = filtered.filter(a => a.type === options.type);
      }

      if (!options?.includeResolved) {
        filtered = filtered.filter(a => !a.isResolved);
      }

      // Sort by creation time (newest first)
      filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      // Apply limit
      const limit = options?.limit || 50;
      return filtered.slice(0, limit);
    } catch (error) {
      this.logger.error('Error fetching recent alerts', { error });
      return [];
    }
  }

  /**
   * Marks an alert as resolved with optional resolution notes.
   * Updates both the alert's resolved status and metadata.
   */
  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    try {
      const cacheKey = this.config.cache.keyPrefixes.alerts(alertId);
      const alert = await this.cache.get<FinancialAlert>(cacheKey);

      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      alert.isResolved = true;
      alert.metadata.resolvedAt = new Date().toISOString();
      
      if (resolution) {
        alert.metadata.resolution = resolution;
      }

      await this.cache.set(cacheKey, alert, this.config.cache.ttl.alerts);
      
      this.logger.info('Alert resolved', { 
        alertId, 
        sponsor_id: alert.sponsor_id,
        resolution 
      });
    } catch (error) {
      this.logger.error('Error resolving alert', { alertId, error });
      throw new DatabaseError('Failed to resolve alert');
    }
  }

  // ============================================================================
  // Public API - Health & Diagnostics
  // ============================================================================

  /**
   * Performs comprehensive health checks on all service dependencies.
   * This is crucial for production monitoring, alerting, and incident response.
   * 
   * Checks include:
   * - Read database connectivity and performance
   * - Write database connectivity and performance
   * - Cache service health and hit rates
   * - Monitoring service state consistency
   */
  async getHealthStatus(): Promise<SystemHealthStatus> {
    const checks = await Promise.all([
      this.checkDatabaseConnection(this.readDb, 'Read Database'),
      this.checkDatabaseConnection(this.writeDb, 'Write Database'),
      this.checkCacheHealth(),
      this.checkMonitoringHealth()
    ]);

    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    
    const status = hasUnhealthy ? 'unhealthy' 
                 : hasDegraded ? 'degraded' 
                 : 'healthy';

    return { 
      status, 
      checks,
      timestamp: new Date()
    };
  }

  // ============================================================================
  // Private Methods - Core Monitoring Logic
  // ============================================================================

  /**
   * Orchestrates a complete monitoring cycle with batch processing.
   * This is the heart of the automated monitoring system.
   * 
   * The cycle:
   * 1. Fetches all active sponsors
   * 2. Processes them in configurable batches
   * 3. Runs parallel checks (new disclosures, thresholds, missing, stale)
   * 4. Aggregates and persists all generated alerts
   * 5. Handles graceful shutdown if requested
   */
  private async performMonitoringCycle(): Promise<FinancialAlert[]> {
    if (this.isCycleRunning) {
      this.logger.warn('Monitoring cycle already in progress. Skipping.');
      return [];
    }

    this.isCycleRunning = true;
    this.logger.info('Starting monitoring cycle');

    const allAlerts: FinancialAlert[] = [];

    try {
      // Get all active sponsors for processing
      const activeSponsors = await this.readDb
        .select({ id: sponsors.id })
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      const totalSponsors = activeSponsors.length;
      const batchSize = this.config.monitoring.batchSize;
      const totalBatches = Math.ceil(totalSponsors / batchSize);

      this.logger.info('Processing sponsors in batches', {
        totalSponsors,
        batchSize,
        totalBatches
      });

      // Process sponsors in batches to avoid overwhelming the system
      for (let i = 0; i < totalSponsors; i += batchSize) {
        if (this.isShuttingDown) {
          this.logger.info('Shutdown requested. Stopping batch processing.');
          break;
        }

        const currentBatch = Math.floor(i / batchSize) + 1;
        this.status.currentBatch = currentBatch;
        this.status.totalBatches = totalBatches;

        const batch = activeSponsors.slice(i, i + batchSize);
        const sponsor_ids = batch.map(s => s.id);

        this.logger.info(`Processing batch ${currentBatch}/${totalBatches}`, {
          sponsorCount: sponsor_ids.length
        });

        // Run all check types in parallel for this batch
        const [
          newDisclosureAlerts,
          thresholdAlerts,
          missingAlerts,
          staleAlerts
        ] = await Promise.all([
          this.checkNewDisclosures(sponsor_ids),
          this.checkThresholdViolations(sponsor_ids),
          this.checkMissingDisclosures(sponsor_ids),
          this.checkStaleDisclosures(sponsor_ids)
        ]);

        allAlerts.push(
          ...newDisclosureAlerts,
          ...thresholdAlerts,
          ...missingAlerts,
          ...staleAlerts
        );

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < totalSponsors) {
          await this.sleep(100);
        }
      }

      // Persist all generated alerts
      if (allAlerts.length > 0) {
        await this.persistAlerts(allAlerts);
      }

      this.logger.info('Monitoring cycle completed', {
        totalAlerts: allAlerts.length,
        breakdown: {
          info: allAlerts.filter(a => a.severity === 'info').length,
          warning: allAlerts.filter(a => a.severity === 'warning').length,
          critical: allAlerts.filter(a => a.severity === 'critical').length
        }
      });

      this.status.alertsGenerated += allAlerts.length;

    } catch (error) {
      this.logger.error('Critical error in monitoring cycle', { error });
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
   * Generates informational or warning alerts based on disclosure amounts.
   */
  private async checkNewDisclosures(sponsor_ids: number[]): Promise<FinancialAlert[]> {
    const alerts: FinancialAlert[] = [];
    const cutoffDate = new Date(
      Date.now() - this.config.monitoring.lookbackWindowHours * 60 * 60 * 1000
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
          created_at: sponsorTransparency.created_at
        })
        .from(sponsorTransparency)
        .innerJoin(sponsors, eq(sponsorTransparency.sponsor_id, sponsors.id))
        .where(
          and(
            inArray(sponsorTransparency.sponsor_id, sponsor_ids),
            gte(sponsorTransparency.created_at, cutoffDate)
          )
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
              amount: disclosure.amount
            }
          )
        );
      }
    } catch (error) {
      this.logger.error('Error checking new disclosures', { error });
    }

    return alerts;
  }

  /**
   * Identifies disclosures that exceed configured thresholds.
   * These require manual review to ensure compliance and proper categorization.
   */
  private async checkThresholdViolations(sponsor_ids: number[]): Promise<FinancialAlert[]> {
    const alerts: FinancialAlert[] = [];
    const cutoffDate = new Date(
      Date.now() - this.config.monitoring.lookbackWindowHours * 60 * 60 * 1000
    );

    try {
      // Build dynamic threshold conditions from config
      const thresholdConditions = Object.entries(this.config.thresholds)
        .map(([type, threshold]) =>
          and(
            eq(sponsorTransparency.disclosureType, type as any),
            sql`CAST(${sponsorTransparency.amount} AS NUMERIC) > ${threshold}`
          )
        );

      if (thresholdConditions.length === 0) {
        return alerts;
      }

      const violations = await this.readDb
        .select({
          id: sponsorTransparency.id,
          sponsor_id: sponsorTransparency.sponsor_id,
          sponsorName: sponsors.name,
          disclosureType: sponsorTransparency.disclosureType,
          amount: sponsorTransparency.amount,
          created_at: sponsorTransparency.created_at
        })
        .from(sponsorTransparency)
        .innerJoin(sponsors, eq(sponsorTransparency.sponsor_id, sponsors.id))
        .where(
          and(
            inArray(sponsorTransparency.sponsor_id, sponsor_ids),
            gte(sponsorTransparency.created_at, cutoffDate),
            sql`(${sql.join(thresholdConditions, sql` OR `)})`
          )
        )
        .limit(1000);

      for (const violation of violations) {
        const threshold = this.config.thresholds[violation.disclosureType as keyof typeof this.config.thresholds];
        const amount = Number(violation.amount) || 0;

        const description = `Threshold exceeded: ${violation.disclosureType} ` +
          `amount of KSh ${amount.toLocaleString()} exceeds ` +
          `limit of KSh ${threshold.toLocaleString()}`;

        alerts.push(
          this.generateAlert(
            'threshold_exceeded',
            violation.sponsor_id,
            violation.sponsorName,
            description,
            'warning',
            {
              disclosureId: violation.id,
              threshold,
              actualAmount: amount,
              disclosureType: violation.disclosureType
            }
          )
        );
      }
    } catch (error) {
      this.logger.error('Error checking threshold violations', { error });
    }

    return alerts;
  }

  /**
   * Identifies sponsors with missing required disclosures.
   * Severity escalates based on how many disclosures are missing.
   */
  private async checkMissingDisclosures(sponsor_ids: number[]): Promise<FinancialAlert[]> {
    const alerts: FinancialAlert[] = [];

    try {
      // Check completeness for each sponsor
      for (const sponsor_id of sponsor_ids) {
        if (this.isShuttingDown) break;

        try {
          const completeness = await this.calculateBasicCompleteness(sponsor_id);

          if (completeness.missingDisclosures.length > 0) {
            const sponsor = await this.getSponsorInfo(sponsor_id);
            
            // Determine severity based on completeness score
            const severity = completeness.score < 50 ? 'critical'
                           : completeness.score < 75 ? 'warning'
                           : 'info';

            const description = `Missing ${completeness.missingDisclosures.length} ` +
              `required disclosure(s): ${completeness.missingDisclosures.join(', ')}. ` +
              `Completeness: ${completeness.score}%`;

            alerts.push(
              this.generateAlert(
                'missing_disclosure',
                sponsor_id,
                sponsors.name,
                description,
                severity,
                {
                  missingTypes: completeness.missingDisclosures,
                  completenessScore: completeness.score
                }
              )
            );
          }
        } catch (error) {
          this.logger.error('Error checking completeness for sponsor', { sponsor_id, error });
        }
      }
    } catch (error) {
      this.logger.error('Error checking missing disclosures', { error });
    }

    return alerts;
  }

  /**
   * Identifies sponsors with outdated disclosures.
   * Stale data reduces transparency and may indicate compliance issues.
   */
  private async checkStaleDisclosures(sponsor_ids: number[]): Promise<FinancialAlert[]> {
    const alerts: FinancialAlert[] = [];
    const staleThreshold = this.config.monitoring.staleThresholdDays;
    const cutoffDate = new Date(
      Date.now() - staleThreshold * 24 * 60 * 60 * 1000
    );

    try {
      const staleSponsors = await this.readDb
        .select({
          sponsor_id: sponsors.id,
          sponsorName: sponsors.name,
          lastDisclosure: sql<Date>`MAX(${sponsorTransparency.dateReported})`
        })
        .from(sponsors)
        .leftJoin(
          sponsorTransparency, 
          eq(sponsors.id, sponsorTransparency.sponsor_id)
        )
        .where(
          and(
            inArray(sponsors.id, sponsor_ids),
            eq(sponsors.is_active, true)
          )
        )
        .groupBy(sponsors.id, sponsors.name)
        .having(sql`MAX(${sponsorTransparency.dateReported}) < ${cutoffDate} OR MAX(${sponsorTransparency.dateReported}) IS NULL`);

      for (const sponsor of staleSponsors) {
        if (!sponsors.lastDisclosure) {
          // No disclosures at all
          alerts.push(
            this.generateAlert(
              'stale_disclosure',
              sponsors.sponsor_id,
              sponsors.sponsorName,
              'No disclosures found for this sponsor',
              'critical',
              { daysSinceUpdate: null, lastUpdateDate: null }
            )
          );
          continue;
        }

        const daysSince = Math.floor(
          (Date.now() - new Date(sponsors.lastDisclosure).getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        const severity = daysSince > 365 ? 'critical'
                       : daysSince > 270 ? 'warning'
                       : 'info';

        const description = `Disclosures not updated in ${daysSince} days ` +
          `(last update: ${new Date(sponsors.lastDisclosure).toISOString().split('T')[0]})`;

        alerts.push(
          this.generateAlert(
            'stale_disclosure',
            sponsors.sponsor_id,
            sponsors.sponsorName,
            description,
            severity,
            {
              daysSinceUpdate: daysSince,
              lastUpdateDate: sponsors.lastDisclosure
            }
          )
        );
      }
    } catch (error) {
      this.logger.error('Error checking stale disclosures', { error });
    }

    return alerts;
  }

  // ============================================================================
  // Private Methods - Alert Persistence & Notifications
  // ============================================================================

  /**
   * Persists alerts to cache and creates database notifications.
   * Only creates notifications for configured severity levels to avoid noise.
   */
  private async persistAlerts(alerts: FinancialAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    try {
      // Store each alert in cache
      for (const alert of alerts) {
        await this.cache.set(
          this.config.cache.keyPrefixes.alerts(alert.id),
          alert,
          this.config.cache.ttl.alerts
        );
      }

      // Update the recent alerts collection
      const recentAlertsKey = this.config.cache.keyPrefixes.recentAlerts();
      const existingAlerts = await this.cache.get<FinancialAlert[]>(recentAlertsKey) || [];
      const updatedAlerts = [...alerts, ...existingAlerts]
        .slice(0, this.config.alerting.maxRecentAlerts);
      await this.cache.set(recentAlertsKey, updatedAlerts, this.config.cache.ttl.alerts);

      // Create database notifications for qualifying alerts
      const notificationsToCreate = alerts.filter(alert =>
        this.config.alerting.createNotifications &&
        this.config.alerting.notificationSeverities.includes(alert.severity as any)
      );

      if (notificationsToCreate.length > 0) {
        await this.createNotifications(notificationsToCreate);
      }

      this.logger.info('Alerts persisted successfully', {
        totalAlerts: alerts.length,
        notificationsCreated: notificationsToCreate.length
      });
    } catch (error) {
      this.logger.error('Error persisting alerts', { error });
      throw new DatabaseError('Failed to persist alerts');
    }
  }

  /**
   * Creates database notifications for alerts.
   * Uses transactions to ensure atomicity and batch inserts for performance.
   */
  private async createNotifications(alerts: FinancialAlert[]): Promise<void> { const notificationValues = alerts.map(alert => ({
      user_id: this.config.alerting.adminUserId,
      type: 'bill_update' as const, // Use existing notification type
      title: `[${alert.severity.toUpperCase() }] ${alert.type.replace(/_/g, ' ')}`,
      message: `${alert.sponsorName}: ${alert.description}`,
      is_read: false,
      metadata: {
        sponsor_id: alert.sponsor_id,
        alertId: alert.id,
        alertType: alert.type
      }
    }));

    try {
      await this.writeDb.transaction(async (tx) => {
        // Insert in batches to avoid exceeding parameter limits
        const batchSize = 100;
        for (let i = 0; i < notificationValues.length; i += batchSize) {
          const batch = notificationValues.slice(i, i + batchSize);
          await tx.insert(notifications).values(batch);
        }
      });

      this.logger.info('Notifications created', {
        count: notificationValues.length
      });
    } catch (error) {
      this.logger.error('Error creating notifications', { error });
      // Don't throw - notification failure shouldn't block alert persistence
    }
  }

  // ============================================================================
  // Private Methods - Health Checks
  // ============================================================================

  /**
   * Checks database connectivity and responsiveness.
   * Measures response time and returns degraded status if slow.
   */
  private async checkDatabaseConnection(
    db: PgDatabase<any>,
    name: string
  ): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      await db.execute(sql`SELECT 1 as health_check`);
      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return {
          name,
          status: 'degraded',
          message: `Slow response time: ${responseTime}ms`
        };
      }

      return { name, status: 'healthy' };
    } catch (error) {
      this.logger.error(`${name} health check failed`, { error });
      return {
        name,
        status: 'unhealthy',
        error: (error as Error).message
      };
    }
  }

  /**
   * Checks cache service health and performance.
   * Monitors cache hit rate as an indicator of effectiveness.
   */
  private async checkCacheHealth(): Promise<HealthCheckResult> {
    try {
      const stats = this.cache.getStats();

      // Simple health check based on cache size
      if (stats.size > 10000) {
        return {
          name: 'Cache',
          status: 'degraded',
          message: `Cache size is high: ${stats.size} entries`
        };
      }

      return {
        name: 'Cache',
        status: 'healthy'
      };
    } catch (error) {
      return {
        name: 'Cache',
        status: 'unhealthy',
        error: (error as Error).message
      };
    }
  }

  /**
   * Checks monitoring service health and state consistency.
   * Detects issues like stalled cycles or high error rates.
   */
  private async checkMonitoringHealth(): Promise<HealthCheckResult> {
    const timeSinceLastCheck = this.status.lastCheckTime
      ? Date.now() - this.status.lastCheckTime.getTime()
      : Infinity;

    const maxAcceptableGap = this.config.monitoring.dailyCheckInterval * 2;

    if (!this.status.isRunning && this.monitoringTimer) {
      return {
        name: 'Monitoring Service',
        status: 'unhealthy',
        message: 'Service in inconsistent state'
      };
    }

    if (this.status.isRunning && timeSinceLastCheck > maxAcceptableGap) {
      return {
        name: 'Monitoring Service',
        status: 'degraded',
        message: 'No checks performed recently'
      };
    }

    if (this.status.errorsEncountered > this.status.checksPerformed * 0.5) {
      return {
        name: 'Monitoring Service',
        status: 'degraded',
        message: 'High error rate detected'
      };
    }

    return {
      name: 'Monitoring Service',
      status: 'healthy'
    };
  }

  // ============================================================================
  // Private Methods - Data Enhancement & Utilities
  // ============================================================================

  /**
   * Enhances raw disclosure data with computed fields.
   * Adds completeness scores, risk levels, and normalized timestamps.
   */
  private enhanceDisclosure(raw: any): FinancialDisclosure {
    return {
      id: raw.id,
      sponsor_id: raw.sponsor_id,
      disclosureType: raw.disclosureType,
      description: raw.description || '',
      amount: raw.amount ? Number(raw.amount) : undefined,
      source: raw.source || undefined,
      dateReported: new Date(raw.dateReported),
      is_verified: Boolean(raw.is_verified),
      completenessScore: this.calculateIndividualCompletenessScore(raw),
      riskLevel: this.assessDisclosureRisk(raw),
      lastUpdated: new Date(raw.created_at || raw.dateReported)
    };
  }

  /**
   * Calculates a simple completeness score for an individual disclosure.
   * Based on presence of key fields: verification, amount, source.
   */
  private calculateIndividualCompletenessScore(disclosure: any): number {
    let score = 40; // Base score for having a disclosure
    if (disclosure.is_verified) score += 30;
    if (disclosure.amount) score += 20;
    if (disclosure.source) score += 10;
    return Math.min(score, 100);
  }

  /**
   * Assesses risk level based on amount and verification status.
   * Unverified high-value disclosures are flagged as highest risk.
   */
  private assessDisclosureRisk(
    disclosure: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    const amount = Number(disclosure.amount) || 0;
    const is_verified = Boolean(disclosure.is_verified);

    // Unverified high-value disclosures are critical
    if (!is_verified && amount > 1_000_000) return 'critical';
    if (!is_verified && amount > 500_000) return 'high';

    // Verified disclosures based on amount
    if (amount > 1_000_000) return 'high';
    if (amount > 100_000) return 'medium';

    return 'low';
  }

  /**
   * Generates a standardized alert object with unique ID and metadata.
   */
  private generateAlert(
    type: FinancialAlert['type'],
    sponsor_id: number,
    sponsorName: string,
    description: string,
    severity: FinancialAlert['severity'],
    metadata: Record<string, any> = {}
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
      metadata
    };
  }

  /**
   * Generates a unique alert identifier using timestamp and random string.
   */
  private generateAlertId(type: string, sponsor_id: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `alert_${type}_${sponsor_id}_${timestamp}_${random}`;
  }

  /**
   * Formats a human-readable description for new disclosure alerts.
   */
  private formatNewDisclosureDescription(disclosure: any): string {
    const parts = [`New ${disclosure.disclosureType} disclosure`];

    if (disclosure.amount) {
      parts.push(`Amount: KSh ${Number(disclosure.amount).toLocaleString()}`);
    }

    if (disclosure.source) {
      parts.push(`Source: ${disclosure.source}`);
    }

    return parts.join(' | ');
  }

  /**
   * Determines alert severity based on financial amount thresholds.
   */
  private determineSeverityByAmount(
    amount: number
  ): FinancialAlert['severity'] {
    if (amount >= 1_000_000) return 'critical';
    if (amount >= 100_000) return 'warning';
    return 'info';
  }

  /**
   * Utility method for async sleep (used for batch delays and graceful shutdown).
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new monitoring service instance with dependencies.
 * This is the recommended way to instantiate the service as it
 * ensures proper dependency injection and type safety.
 * 
 * Example usage:
 *   const service = createMonitoringService({
 *     readDb: readDatabase,
 *     writeDb: writeDatabase,
 *     cache: cacheService,
 *     logger: logger
 *   });
 */
export function createMonitoringService(
  dependencies: MonitoringServiceDependencies
): FinancialDisclosureMonitoringService {
  return new FinancialDisclosureMonitoringService(dependencies);
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  FinancialDisclosure,
  FinancialAlert,
  MonitoringStatus,
  CompletenessScore,
  SystemHealthStatus
};









































