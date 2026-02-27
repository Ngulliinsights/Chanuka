/**
 * Data Synchronization Service
 *
 * Implements scheduled data synchronization jobs with incremental updates,
 * conflict resolution, and comprehensive monitoring and error reporting.
 */

import { ConflictResolutionService } from '@server/infrastructure/external-data/conflict-resolution-service';
import {
  GovernmentDataIntegrationService,
  // Import the gov service's own DataSource under an alias to avoid colliding
  // with the richer DataSource shape declared in ./types.
  DataSource as GovDataSource,
} from '@server/features/government-data/services/government-data-integration.service';
import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import { bills, sponsors } from '@server/infrastructure/schema';
import { sync_jobs as syncJobs } from '@server/infrastructure/schema/platform_operations';
import { and, desc, eq } from 'drizzle-orm';
import { EventEmitter } from 'events';
import * as cron from 'node-cron';

import {
  BillData,
  ConflictResolution,
  SponsorData,
  SyncError,
  SyncJob,
} from './types';

// ---------------------------------------------------------------------------
// Augment the gov-service module so TypeScript knows about the runtime methods
// and the `endpoints` array that the objects actually carry.
// Remove any declaration that already exists upstream.
// ---------------------------------------------------------------------------
declare module '@server/features/government-data/services/government-data-integration.service' {
  /** Endpoint descriptor as returned by the government data service. */
  interface Endpoint {
    id: string;
    syncFrequency: string;
    dataType: string;
  }

  interface DataSource {
    /** Unique identifier for the data source */
    id: string;
    /** Present at runtime even if missing from the upstream type declaration. */
    endpoints: Endpoint[];
  }

  interface GovernmentDataIntegrationService {
    getActiveDataSources(): Promise<GovDataSource[]>;
    getDataSource(id: string): Promise<GovDataSource | null>;
    fetchData(
      dataSourceId: string,
      endpointId: string,
      params: { limit: number; offset: number; since?: Date },
    ): Promise<{
      success: boolean;
      data?: unknown | unknown[];
      error?: { message: string };
    }>;
  }
}

// Convenience alias — keeps call-site code readable.
type Endpoint = import('@server/features/government-data/services/government-data-integration.service').Endpoint;

// ---------------------------------------------------------------------------
// Sync metrics shape
// ---------------------------------------------------------------------------
interface SyncMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  lastSyncTime: Date;
  recordsProcessedToday: number;
}

// ---------------------------------------------------------------------------
// Utility: safely narrow an unknown catch-clause value to a typed Error.
// ---------------------------------------------------------------------------
function toError(value: unknown): Error & { code?: string; status?: number } {
  if (value instanceof Error) {
    return value as Error & { code?: string; status?: number };
  }
  return new Error(String(value));
}

// ---------------------------------------------------------------------------
// Utility: cast Drizzle query results to any[] to work around type inference issues
// ---------------------------------------------------------------------------
function asAnyArray<T>(promise: Promise<T>): Promise<any[]> {
  return promise as unknown as Promise<any[]>;
}

// ---------------------------------------------------------------------------
// Logger helper: pino's overloads only accept a single string argument.
// This wrapper keeps every call site to a single readable line.
// ---------------------------------------------------------------------------
function logError(message: string, err: unknown): void {
  logger.error(`${message} ${toError(err).message}`);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export class DataSynchronizationService extends EventEmitter {
  private governmentDataService: GovernmentDataIntegrationService;
  private conflictResolutionService: ConflictResolutionService;
  private activeSyncJobs: Map<string, SyncJob> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private syncMetrics: Map<string, SyncMetrics> = new Map();

  constructor() {
    super();
    this.governmentDataService = new GovernmentDataIntegrationService();
    this.conflictResolutionService = new ConflictResolutionService();
    this.setupEventHandlers();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Initialize synchronization schedules for all active data sources. */
  async initializeSyncSchedules(): Promise<void> {
    try {
      const dataSources = await this.governmentDataService.getActiveDataSources();
      for (const dataSource of dataSources) {
        await this.setupDataSourceSync(dataSource);
      }
      console.log(`✅ Initialized sync schedules for ${dataSources.length} data sources`);
    } catch (err) {
      logError('❌ Failed to initialize sync schedules:', err);
      throw toError(err);
    }
  }

  /** Execute a synchronization job for a specific endpoint. */
  async executeSyncJob(dataSource: GovDataSource, endpoint: Endpoint): Promise<SyncJob> {
    const jobId = `${dataSource.id}-${endpoint.id}-${Date.now()}`;

    const syncJob: SyncJob = {
      id: jobId,
      dataSourceId: dataSource.id,
      endpointId: endpoint.id,
      status: 'pending',
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      recordsSkipped: 0,
      errors: [],
      isIncremental: true,
      lastSyncTimestamp: await this.getLastSyncTimestamp(dataSource.id, endpoint.id),
    };

    try {
      await this.storeSyncJob(syncJob);

      syncJob.status = 'running';
      syncJob.startTime = new Date();
      await this.updateSyncJob(syncJob);

      this.activeSyncJobs.set(jobId, syncJob);
      this.emit('syncJobStarted', syncJob);

      await this.performDataSync(syncJob, dataSource, endpoint);

      syncJob.status = 'completed';
      syncJob.endTime = new Date();
      await this.updateSyncJob(syncJob);

      this.emit('syncJobCompleted', syncJob);
      console.log(`✅ Sync job ${jobId} completed successfully`);
    } catch (err) {
      const error = toError(err);
      syncJob.status = 'failed';
      syncJob.endTime = new Date();

      const syncError: SyncError = {
        timestamp: new Date(),
        level: 'error',
        message: error.message,
        details: error,
        endpoint: endpoint.id,
      };

      syncJob.errors.push(syncError);
      await this.updateSyncJob(syncJob);
      await this.storeSyncError(jobId, syncError);

      this.emit('syncJobFailed', syncJob, error);
      console.error(`❌ Sync job ${jobId} failed: ${error.message}`);
    } finally {
      this.activeSyncJobs.delete(jobId);
    }

    return syncJob;
  }

  /** Get sync job status by ID. */
  async getSyncJobStatus(jobId: string): Promise<SyncJob | null> {
    try {
      const rows = await asAnyArray(db
        .select()
        .from(syncJobs)
        .where(eq(syncJobs.id, jobId))
        .limit(1));

      if (rows.length === 0) return null;
      
      const row: any = rows[0];

      return {
        id: row.id,
        dataSourceId: row.data_source_id,
        endpointId: row.job_name,
        status: row.status,
        startTime: row.started_at ?? undefined,
        endTime: row.completed_at ?? undefined,
        recordsProcessed: row.records_processed ?? 0,
        recordsUpdated: row.records_updated ?? 0,
        recordsCreated: row.records_created ?? 0,
        recordsSkipped: row.records_skipped ?? 0,
        errors: [],
        nextRunTime: undefined,
        isIncremental: row.job_type === 'incremental',
        lastSyncTimestamp: row.completed_at ?? undefined,
      };
    } catch (err) {
      logError('Error getting sync job status:', err);
      return null;
    }
  }

  /** Return current sync metrics. */
  getSyncMetrics(): Map<string, SyncMetrics> {
    return this.syncMetrics;
  }

  /** Stop all scheduled cron jobs. */
  stopAllSyncJobs(): void {
    for (const [jobId, cronJob] of this.scheduledJobs) {
      cronJob.stop();
      console.log(`⏹️ Stopped sync job: ${jobId}`);
    }
    this.scheduledJobs.clear();
  }

  /** Manually trigger sync for a specific data source (and optional endpoint). */
  async triggerManualSync(dataSourceId: string, endpointId?: string): Promise<SyncJob[]> {
    const dataSource = await this.governmentDataService.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    const endpoints = endpointId
      ? dataSource.endpoints.filter((e) => e.id === endpointId)
      : dataSource.endpoints;

    const jobs: SyncJob[] = [];
    for (const endpoint of endpoints) {
      jobs.push(await this.executeSyncJob(dataSource, endpoint));
    }
    return jobs;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async setupDataSourceSync(dataSource: GovDataSource): Promise<void> {
    for (const endpoint of dataSource.endpoints) {
      const jobId = `${dataSource.id}-${endpoint.id}`;
      const cronSchedule = this.getCronSchedule(endpoint.syncFrequency);

      if (cronSchedule) {
        const cronJob = cron.schedule(cronSchedule, async () => {
          await this.executeSyncJob(dataSource, endpoint);
        });
        this.scheduledJobs.set(jobId, cronJob);
        cronJob.start();
        console.log(`📅 Scheduled sync job ${jobId} with frequency: ${endpoint.syncFrequency}`);
      }
    }
  }

  private async performDataSync(
    syncJob: SyncJob,
    dataSource: GovDataSource,
    endpoint: Endpoint,
  ): Promise<void> {
    const batchSize = 100;
    let offset = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        const response = await this.governmentDataService.fetchData(
          dataSource.id,
          endpoint.id,
          { limit: batchSize, offset, since: syncJob.lastSyncTimestamp },
        );

        if (!response.success || !response.data) {
          throw new Error(`API request failed: ${response.error?.message ?? 'unknown'}`);
        }

        const records = Array.isArray(response.data) ? response.data : [response.data];

        if (records.length === 0) {
          hasMoreData = false;
          break;
        }

        for (const record of records) {
          await this.processRecord(syncJob, record, endpoint.dataType);
        }

        offset += batchSize;
        syncJob.recordsProcessed += records.length;
        await this.updateSyncJob(syncJob);

        if (records.length < batchSize) {
          hasMoreData = false;
        }
      } catch (err) {
        const error = toError(err);
        const syncError: SyncError = {
          timestamp: new Date(),
          level: 'error',
          message: `Batch processing failed at offset ${offset}: ${error.message}`,
          details: error,
          endpoint: endpoint.id,
        };
        syncJob.errors.push(syncError);

        if (this.isCriticalError(error)) throw error;
      }
    }
  }

  private async processRecord(
    syncJob: SyncJob,
    record: unknown,
    dataType: string,
  ): Promise<void> {
    try {
      switch (dataType) {
        case 'bills':
          await this.processBillRecord(syncJob, record as BillData);
          break;
        case 'sponsors':
          await this.processSponsorRecord(syncJob, record as SponsorData);
          break;
        default:
          console.warn(`Unknown data type: ${dataType}`);
          syncJob.recordsSkipped++;
      }
    } catch (err) {
      const error = toError(err);
      const rec = record as Record<string, unknown>;
      const syncError: SyncError = {
        timestamp: new Date(),
        level: 'warning',
        message: `Failed to process record: ${error.message}`,
        details: error,
        recordId: String(rec?.id ?? rec?.bill_number ?? 'unknown'),
      };
      syncJob.errors.push(syncError);
      syncJob.recordsSkipped++;
    }
  }

  private async processBillRecord(syncJob: SyncJob, billData: BillData): Promise<void> {
    const existing = await asAnyArray(db
      .select()
      .from(bills)
      .where(eq(bills.bill_number, billData.bill_number))
      .limit(1));

    if (existing.length > 0) {
      const existingBill: any = existing[0];
      const conflicts = await this.detectBillConflicts(existingBill, billData);

      if (conflicts.length > 0) {
        const resolution = await this.conflictResolutionService.resolveBillConflicts(
          existingBill,
          billData,
          conflicts,
        );

        if (resolution.resolution === 'automatic') {
          await this.updateBillWithResolution(existingBill.id, resolution);
          syncJob.recordsUpdated++;
        } else {
          await this.queueForManualReview(resolution);
          syncJob.recordsSkipped++;
        }
      } else {
        await this.updateBill(existingBill.id, billData);
        syncJob.recordsUpdated++;
      }
    } else {
      await this.createBill(billData);
      syncJob.recordsCreated++;
    }
  }

  private async processSponsorRecord(syncJob: SyncJob, sponsorData: SponsorData): Promise<void> {
    const existing = await asAnyArray(db
      .select()
      .from(sponsors)
      .where(eq(sponsors.name, sponsorData.name))
      .limit(1));

    if (existing.length > 0) {
      const existingSponsor: any = existing[0];
      await this.updateSponsor(existingSponsor.id, sponsorData);
      syncJob.recordsUpdated++;
    } else {
      await this.createSponsor(sponsorData);
      syncJob.recordsCreated++;
    }
  }

  private async detectBillConflicts(
    existingBill: typeof bills.$inferSelect,
    newBillData: BillData,
  ): Promise<string[]> {
    const conflicts: string[] = [];
    if (existingBill.title !== newBillData.title) conflicts.push('title');
    if (existingBill.status !== newBillData.status) conflicts.push('status');
    if (newBillData.summary && existingBill.summary !== newBillData.summary) conflicts.push('summary');
    return conflicts;
  }

  private getCronSchedule(frequency: string): string | null {
    switch (frequency) {
      case 'hourly': return '0 * * * *';   // every hour on the hour
      case 'daily':  return '0 2 * * *';   // 02:00 every day
      case 'weekly': return '0 2 * * 0';   // 02:00 every Sunday
      default:       return null;           // real-time — handled separately
    }
  }

  private async getLastSyncTimestamp(
    dataSourceId: string,
    endpointId: string,
  ): Promise<Date | undefined> {
    try {
      const rows = await asAnyArray(db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.data_source_id, dataSourceId),
            eq(syncJobs.job_name, endpointId),
            eq(syncJobs.status, 'completed'),
          ),
        )
        .orderBy(desc(syncJobs.completed_at))
        .limit(1));

      if (rows.length === 0) return undefined;
      const row: any = rows[0];
      return row.completed_at ?? undefined;
    } catch (err) {
      logError('Error getting last sync timestamp:', err);
      return undefined;
    }
  }

  private async storeSyncJob(syncJob: SyncJob): Promise<void> {
    await (db.insert(syncJobs) as any).values({
      id: syncJob.id,
      data_source_id: syncJob.dataSourceId,
      job_name: syncJob.endpointId,
      job_type: syncJob.isIncremental ? 'incremental' : 'full_sync',
      status: syncJob.status,
      started_at: syncJob.startTime,
      completed_at: syncJob.endTime,
      records_processed: syncJob.recordsProcessed,
      records_updated: syncJob.recordsUpdated,
      records_created: syncJob.recordsCreated,
      records_skipped: syncJob.recordsSkipped,
    });
  }

  private async updateSyncJob(syncJob: SyncJob): Promise<void> {
    await (db
      .update(syncJobs) as any)
      .set({
        status: syncJob.status,
        started_at: syncJob.startTime,
        completed_at: syncJob.endTime,
        records_processed: syncJob.recordsProcessed,
        records_updated: syncJob.recordsUpdated,
        records_created: syncJob.recordsCreated,
        records_skipped: syncJob.recordsSkipped,
      })
      .where(eq(syncJobs.id, syncJob.id));
  }

  /**
   * Persist a sync error.
   * TODO: once `syncErrors` is exported from the schema, replace the
   * console.error below with:
   *   import { syncErrors as syncErrorsTable } from '@server/infrastructure/schema';
   *   await db.insert(syncErrorsTable).values({ jobId, ...error, details: JSON.stringify(error.details) });
   */
  private async storeSyncError(jobId: string, error: SyncError): Promise<void> {
    console.error(
      `[SyncError] job=${jobId} endpoint=${error.endpoint ?? '-'} record=${error.recordId ?? '-'} — ${error.message}`,
    );
  }

  private isCriticalError(error: Error & { code?: string; status?: number }): boolean {
    return error.code === 'ECONNREFUSED' || error.status === 401;
  }

  // -------------------------------------------------------------------------
  // Stub CRUD helpers (replace with real Drizzle implementations)
  // -------------------------------------------------------------------------

  private async createBill(billData: BillData): Promise<void> {
    console.log(`Creating bill: ${billData.bill_number}`);
  }

  private async updateBill(billId: number, _billData: BillData): Promise<void> {
    console.log(`Updating bill ID: ${billId}`);
  }

  private async createSponsor(sponsorData: SponsorData): Promise<void> {
    console.log(`Creating sponsor: ${sponsorData.name}`);
  }

  private async updateSponsor(sponsorId: number, _sponsorData: SponsorData): Promise<void> {
    console.log(`Updating sponsor ID: ${sponsorId}`);
  }

  private async updateBillWithResolution(
    billId: number,
    _resolution: ConflictResolution,
  ): Promise<void> {
    console.log(`Applying resolution for bill ID: ${billId}`);
  }

  private async queueForManualReview(resolution: ConflictResolution): Promise<void> {
    console.log(`Queuing conflict for manual review: ${resolution.conflictId}`);
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private setupEventHandlers(): void {
    this.on('syncJobStarted', (job: SyncJob) => {
      console.log(`🚀 Sync job started: ${job.id}`);
    });

    this.on('syncJobCompleted', (job: SyncJob) => {
      console.log(
        `✅ Sync job completed: ${job.id} — ` +
        `Processed: ${job.recordsProcessed}, ` +
        `Created: ${job.recordsCreated}, ` +
        `Updated: ${job.recordsUpdated}`,
      );
    });

    this.on('syncJobFailed', (job: SyncJob, error: Error) => {
      console.error(`❌ Sync job failed: ${job.id} — ${error.message}`);
    });
  }
}