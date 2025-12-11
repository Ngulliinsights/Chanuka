/**
 * Data Synchronization Service
 * 
 * Implements scheduled data synchronization jobs with incremental updates,
 * conflict resolution, and comprehensive monitoring and error reporting.
 */

import { EventEmitter } from 'events';
import * as cron from 'node-cron';
// Import the database instance properly - adjust path as needed
import { database as db } from '@shared/database/connection';
import {
  DataSource,
  SyncJob,
  SyncError,
  ConflictResolution,
  BillData,
  SponsorData,
  ApiResponse
} from './types.js';
import { GovernmentDataService } from '@server/infrastructure/external-data/government-data-service.ts';
import { ConflictResolutionService } from '@server/infrastructure/external-data/conflict-resolution-service.ts';
import { bills, sponsors, bill_cosponsors, sync_jobs, data_sources } from '@shared/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { logger   } from '@shared/core';

export class DataSynchronizationService extends EventEmitter {
  private governmentDataService: GovernmentDataService;
  private conflictResolutionService: ConflictResolutionService;
  private activeSyncJobs: Map<string, SyncJob> = new Map();
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private syncMetrics: Map<string, SyncMetrics> = new Map();

  constructor() {
    super();
    this.governmentDataService = new GovernmentDataService();
    this.conflictResolutionService = new ConflictResolutionService();
    this.setupEventHandlers();
  }

  /**
   * Initialize synchronization schedules for all active data sources
   */
  async initializeSyncSchedules(): Promise<void> {
    try {
      const dataSources = await this.governmentDataService.getActiveDataSources();
      
      for (const dataSource of dataSources) {
        await this.setupDataSourceSync(dataSource);
      }

      console.log(`✅ Initialized sync schedules for ${dataSources.length} data sources`);
    } catch (error) {
      logger.error('❌ Failed to initialize sync schedules:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Setup synchronization schedule for a specific data source
   */
  private async setupDataSourceSync(dataSource: DataSource): Promise<void> {
    for (const endpoint of dataSource.endpoints) {
      const jobId = `${dataSource.id}-${endpoint.id}`;
      
      // Create cron schedule based on sync frequency
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

  /**
   * Execute a synchronization job for a specific endpoint
   */
  async executeSyncJob(dataSource: DataSource, endpoint: any): Promise<SyncJob> {
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
      lastSyncTimestamp: await this.getLastSyncTimestamp(dataSource.id, endpoint.id)
    };

    try {
      // Store sync job in database
      await this.storeSyncJob(syncJob);
      
      // Update status to running
      syncJob.status = 'running';
      syncJob.startTime = new Date();
      await this.updateSyncJob(syncJob);

      this.activeSyncJobs.set(jobId, syncJob);
      this.emit('syncJobStarted', syncJob);

      // Execute the actual synchronization
      await this.performDataSync(syncJob, dataSource, endpoint);

      // Mark as completed
      syncJob.status = 'completed';
      syncJob.endTime = new Date();
      await this.updateSyncJob(syncJob);

      this.emit('syncJobCompleted', syncJob);
      console.log(`✅ Sync job ${jobId} completed successfully`);

    } catch (error) {
      syncJob.status = 'failed';
      syncJob.endTime = new Date();
      
      const syncError: SyncError = {
        timestamp: new Date(),
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        endpoint: endpoint.id
      };
      
      syncJob.errors.push(syncError);
      await this.updateSyncJob(syncJob);
      await this.storeSyncError(jobId, syncError);

      this.emit('syncJobFailed', syncJob, error);
      console.error(`❌ Sync job ${jobId} failed:`, error);
    } finally {
      this.activeSyncJobs.delete(jobId);
    }

    return syncJob;
  }

  /**
   * Perform the actual data synchronization
   */
  private async performDataSync(syncJob: SyncJob, dataSource: DataSource, endpoint: any): Promise<void> {
    const batchSize = 100;
    let offset = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      try {
        // Fetch data from external API
        const response = await this.governmentDataService.fetchData(
          dataSource.id,
          endpoint.id,
          {
            limit: batchSize,
            offset,
            since: syncJob.lastSyncTimestamp
          }
        );

        if (!response.success || !response.data) {
          throw new Error(`API request failed: ${response.error?.message}`);
        }

        const records = Array.isArray(response.data) ? response.data : [response.data];
        
        if (records.length === 0) {
          hasMoreData = false;
          break;
        }

        // Process each record
        for (const record of records) {
          await this.processRecord(syncJob, record, endpoint.dataType);
        }

        offset += batchSize;
        syncJob.recordsProcessed += records.length;

        // Update progress
        await this.updateSyncJob(syncJob);

        // Check if we got less than batch size (indicates end of data)
        if (records.length < batchSize) {
          hasMoreData = false;
        }

      } catch (error) {
        const syncError: SyncError = {
          timestamp: new Date(),
          level: 'error',
          message: `Batch processing failed at offset ${offset}`,
          details: error,
          endpoint: endpoint.id
        };
        
        syncJob.errors.push(syncError);
        
        // Continue with next batch unless it's a critical error
        if (this.isCriticalError(error)) {
          throw error;
        }
      }
    }
  }

  /**
   * Process individual record and handle conflicts
   */
  private async processRecord(syncJob: SyncJob, record: any, dataType: string): Promise<void> {
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
    } catch (error) {
      const syncError: SyncError = {
        timestamp: new Date(),
        level: 'warning',
        message: `Failed to process record`,
        details: error,
        recordId: record.id || record.bill_number || 'unknown'
      };
      
      syncJob.errors.push(syncError);
      syncJob.recordsSkipped++;
    }
  }

  /**
   * Process bill record with conflict detection
   */
  private async processBillRecord(syncJob: SyncJob, billData: BillData): Promise<void> {
    // Check if bill already exists - using proper Drizzle query
    const existingBill = await db
      .select()
      .from(bills)
      .where(eq(bills.bill_number, billData.bill_number))
      .limit(1);

    if (existingBill.length > 0) {
      // Check for conflicts
      const conflicts = await this.detectBillConflicts(existingBill[0], billData);
      
      if (conflicts.length > 0) {
        // Handle conflicts
        const resolution = await this.conflictResolutionService.resolveBillConflicts(
          existingBill[0],
          billData,
          conflicts
        );

        if (resolution.resolution === 'automatic') {
          await this.updateBillWithResolution(existingBill[0].id, resolution);
          syncJob.recordsUpdated++;
        } else {
          // Queue for manual review
          await this.queueForManualReview(resolution);
          syncJob.recordsSkipped++;
        }
      } else {
        // No conflicts, update normally
        await this.updateBill(existingBill[0].id, billData);
        syncJob.recordsUpdated++;
      }
    } else {
      // Create new bill
      await this.createBill(billData);
      syncJob.recordsCreated++;
    }
  }

  /**
   * Process sponsor record
   * Note: Using 'id' field instead of 'externalId' to match your schema
   */
  private async processSponsorRecord(syncJob: SyncJob, sponsorData: SponsorData): Promise<void> {
    // Query by a unique identifier that exists in your sponsors schema
    // Adjust this based on your actual schema - using 'name' as fallback
    const existingSponsor = await db
      .select()
      .from(sponsors)
      .where(eq(sponsors.name, sponsorData.name))
      .limit(1);

    if (existingSponsor.length > 0) {
      await this.updateSponsor(existingSponsor[0].id, sponsorData);
      syncJob.recordsUpdated++;
    } else {
      await this.createSponsor(sponsorData);
      syncJob.recordsCreated++;
    }
  }

  /**
   * Detect conflicts between existing and new bill data
   */
  private async detectBillConflicts(existingBill: any, newBillData: BillData): Promise<string[]> {
    const conflicts: string[] = [];

    // Check for significant differences
    if (existingBill.title !== newBillData.title) {
      conflicts.push('title');
    }
    
    if (existingBill.status !== newBillData.status) {
      conflicts.push('status');
    }
    
    if (existingBill.summary !== newBillData.summary && newBillData.summary) {
      conflicts.push('summary');
    }

    return conflicts;
  }

  /**
   * Get cron schedule based on sync frequency
   */
  private getCronSchedule(frequency: string): string | null {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Every hour
      case 'daily':
        return '0 2 * * *'; // Daily at 2 AM
      case 'weekly':
        return '0 2 * * 0'; // Weekly on Sunday at 2 AM
      default:
        return null; // Real-time handled separately
    }
  }

  /**
   * Get last sync timestamp for incremental updates
   */
  private async getLastSyncTimestamp(dataSourceId: string, endpointId: string): Promise<Date | undefined> {
    try {
      const lastJob = await db
        .select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.dataSourceId, dataSourceId),
            eq(syncJobs.endpointId, endpointId),
            eq(syncJobs.status, 'completed')
          )
        )
        .orderBy(desc(syncJobs.endTime))
        .limit(1);

      return lastJob[0]?.endTime || undefined;
    } catch (error) {
      logger.error('Error getting last sync timestamp:', { component: 'Chanuka' }, error);
      return undefined;
    }
  }

  /**
   * Store sync job in database
   */
  private async storeSyncJob(syncJob: SyncJob): Promise<void> {
    await db.insert(syncJobs).values({
      id: syncJob.id,
      dataSourceId: syncJob.dataSourceId,
      endpointId: syncJob.endpointId,
      status: syncJob.status,
      startTime: syncJob.startTime,
      endTime: syncJob.endTime,
      recordsProcessed: syncJob.recordsProcessed,
      recordsUpdated: syncJob.recordsUpdated,
      recordsCreated: syncJob.recordsCreated,
      recordsSkipped: syncJob.recordsSkipped,
      isIncremental: syncJob.isIncremental,
      lastSyncTimestamp: syncJob.lastSyncTimestamp,
      nextRunTime: syncJob.nextRunTime
    });
  }

  /**
   * Update sync job in database
   */
  private async updateSyncJob(syncJob: SyncJob): Promise<void> {
    await db
      .update(syncJobs)
      .set({
        status: syncJob.status,
        startTime: syncJob.startTime,
        endTime: syncJob.endTime,
        recordsProcessed: syncJob.recordsProcessed,
        recordsUpdated: syncJob.recordsUpdated,
        recordsCreated: syncJob.recordsCreated,
        recordsSkipped: syncJob.recordsSkipped
      })
      .where(eq(syncJobs.id, syncJob.id));
  }

  /**
   * Store sync error in database
   */
  private async storeSyncError(jobId: string, error: SyncError): Promise<void> {
    await db.insert(syncErrors).values({
      jobId,
      timestamp: error.timestamp,
      level: error.level,
      message: error.message,
      details: JSON.stringify(error.details),
      recordId: error.recordId,
      endpoint: error.endpoint
    });
  }

  /**
   * Helper methods for database operations
   */
  private async createBill(billData: BillData): Promise<void> {
    // Implementation would create bill in database
    console.log(`Creating bill: ${billData.bill_number}`);
  }

  private async updateBill(bill_id: number, billData: BillData): Promise<void> { // Implementation would update bill in database
    console.log(`Updating bill ID: ${bill_id }`);
  }

  private async createSponsor(sponsorData: SponsorData): Promise<void> {
    // Implementation would create sponsor in database
    console.log(`Creating sponsor: ${sponsorData.name}`);
  }

  private async updateSponsor(sponsor_id: number, sponsorData: SponsorData): Promise<void> {
    // Implementation would update sponsor in database
    console.log(`Updating sponsor ID: ${sponsor_id}`);
  }

  private async updateBillWithResolution(bill_id: number, resolution: ConflictResolution): Promise<void> { // Implementation would apply conflict resolution
    console.log(`Applying resolution for bill ID: ${bill_id }`);
  }

  private async queueForManualReview(resolution: ConflictResolution): Promise<void> {
    // Implementation would queue conflict for manual review
    console.log(`Queuing conflict for manual review: ${resolution.conflictId}`);
  }

  private isCriticalError(error: any): boolean {
    // Determine if error should stop the entire sync job
    return error?.code === 'ECONNREFUSED' || error?.status === 401;
  }

  private setupEventHandlers(): void {
    this.on('syncJobStarted', (job: SyncJob) => {
      console.log(`🚀 Sync job started: ${job.id}`);
    });

    this.on('syncJobCompleted', (job: SyncJob) => {
      console.log(`✅ Sync job completed: ${job.id} - Processed: ${job.recordsProcessed}, Created: ${job.recordsCreated}, Updated: ${job.recordsUpdated}`);
    });

    this.on('syncJobFailed', (job: SyncJob, error: any) => {
      console.error(`❌ Sync job failed: ${job.id} - ${error.message}`);
    });
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(jobId: string): Promise<SyncJob | null> {
    try {
      const job = await db
        .select()
        .from(syncJobs)
        .where(eq(syncJobs.id, jobId))
        .limit(1);

      if (job[0]) {
        // Add the errors array and convert nulls to undefined to match SyncJob interface
        return {
          id: job[0].id,
          dataSourceId: job[0].dataSourceId,
          endpointId: job[0].endpointId,
          status: job[0].status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
          startTime: job[0].startTime || undefined,
          endTime: job[0].endTime || undefined,
          recordsProcessed: job[0].recordsProcessed,
          recordsUpdated: job[0].recordsUpdated,
          recordsCreated: job[0].recordsCreated,
          recordsSkipped: job[0].recordsSkipped,
          errors: [], // Initialize empty errors array since it's not stored in the database
          nextRunTime: job[0].nextRunTime || undefined,
          isIncremental: job[0].isIncremental,
          lastSyncTimestamp: job[0].lastSyncTimestamp || undefined
        };
      }
      return null;
    } catch (error) {
      logger.error('Error getting sync job status:', { component: 'Chanuka' }, error);
      return null;
    }
  }

  /**
   * Get sync metrics for monitoring
   */
  getSyncMetrics(): Map<string, SyncMetrics> {
    return this.syncMetrics;
  }

  /**
   * Stop all scheduled sync jobs
   */
  stopAllSyncJobs(): void {
    for (const [jobId, cronJob] of this.scheduledJobs) {
      cronJob.stop();
      console.log(`⏹️ Stopped sync job: ${jobId}`);
    }
    this.scheduledJobs.clear();
  }

  /**
   * Manually trigger sync for a specific data source
   */
  async triggerManualSync(dataSourceId: string, endpointId?: string): Promise<SyncJob[]> {
    const dataSource = await this.governmentDataService.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    const jobs: SyncJob[] = [];
    const endpoints = endpointId 
      ? dataSource.endpoints.filter(e => e.id === endpointId)
      : dataSource.endpoints;

    for (const endpoint of endpoints) {
      const job = await this.executeSyncJob(dataSource, endpoint);
      jobs.push(job);
    }

    return jobs;
  }
}

interface SyncMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  lastSyncTime: Date;
  recordsProcessedToday: number;
}







































