/**
 * Enhanced Government Data Service - Complete Infrastructure Integration
 * Modernized service layer using Repository pattern with comprehensive functionality
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';
import { governmentDataRepository, GovernmentDataQueryOptions, GovernmentDataCreateInput, GovernmentDataUpdateInput } from '../domain/repositories/government-data.repository';
import { InputSanitizationService } from '@server/features/security';
import { GovernmentData, GovernmentSyncLog } from '@server/infrastructure/schema';

export class EnhancedGovernmentDataService {
  private inputSanitizer = new InputSanitizationService();

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async getGovernmentData(options: GovernmentDataQueryOptions = {}): AsyncServiceResult<GovernmentData[]> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'EnhancedGovernmentDataService', 
        operation: 'getGovernmentData',
        options 
      };
      logger.debug(logContext, 'Getting government data');

      // Sanitize inputs
      const sanitizedOptions = this.sanitizeQueryOptions(options);

      // Use repository for data access
      const result = await governmentDataRepository.findMany(sanitizedOptions);
      if (result.isErr()) {
        throw new Error(`Failed to fetch government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getGovernmentData',
      context: { options }
    });
  }

  async getGovernmentDataById(id: number): AsyncServiceResult<GovernmentData | null> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'EnhancedGovernmentDataService', 
        operation: 'getGovernmentDataById',
        id 
      };
      logger.debug(logContext, 'Getting government data by ID');

      const result = await governmentDataRepository.findById(id);
      if (result.isErr()) {
        throw new Error(`Failed to fetch government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getGovernmentDataById',
      context: { id }
    });
  }

  async getGovernmentDataByExternalId(externalId: string, source: string): AsyncServiceResult<GovernmentData | null> {
    return safeAsync(async () => {
      const sanitizedExternalId = this.inputSanitizer.sanitizeString(externalId);
      const sanitizedSource = this.inputSanitizer.sanitizeString(source);

      const result = await governmentDataRepository.findByExternalId(sanitizedExternalId, sanitizedSource);
      if (result.isErr()) {
        throw new Error(`Failed to fetch government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getGovernmentDataByExternalId',
      context: { externalId, source }
    });
  }

  async countGovernmentData(options: Omit<GovernmentDataQueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'> = {}): AsyncServiceResult<number> {
    return safeAsync(async () => {
      const sanitizedOptions = this.sanitizeQueryOptions(options);

      const result = await governmentDataRepository.count(sanitizedOptions);
      if (result.isErr()) {
        throw new Error(`Failed to count government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'countGovernmentData',
      context: { options }
    });
  }

  // ==========================================================================
  // Mutation Operations
  // ==========================================================================

  async createGovernmentData(input: GovernmentDataCreateInput): AsyncServiceResult<GovernmentData> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'EnhancedGovernmentDataService', 
        operation: 'createGovernmentData',
        dataType: input.data_type,
        source: input.source
      };
      logger.info(logContext, 'Creating government data');

      // Sanitize inputs
      const sanitizedInput = this.sanitizeCreateInput(input);

      const result = await governmentDataRepository.create(sanitizedInput);
      if (result.isErr()) {
        throw new Error(`Failed to create government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'createGovernmentData',
      context: { input }
    });
  }

  async updateGovernmentData(id: number, input: GovernmentDataUpdateInput): AsyncServiceResult<GovernmentData> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'EnhancedGovernmentDataService', 
        operation: 'updateGovernmentData',
        id
      };
      logger.info(logContext, 'Updating government data');

      // Sanitize inputs
      const sanitizedInput = this.sanitizeUpdateInput(input);

      const result = await governmentDataRepository.update(id, sanitizedInput);
      if (result.isErr()) {
        throw new Error(`Failed to update government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'updateGovernmentData',
      context: { id, input }
    });
  }

  async deleteGovernmentData(id: number): AsyncServiceResult<boolean> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'EnhancedGovernmentDataService', 
        operation: 'deleteGovernmentData',
        id
      };
      logger.info(logContext, 'Deleting government data');

      const result = await governmentDataRepository.delete(id);
      if (result.isErr()) {
        throw new Error(`Failed to delete government data: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'deleteGovernmentData',
      context: { id }
    });
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async getSyncLogs(source?: string, limit: number = 50): AsyncServiceResult<GovernmentSyncLog[]> {
    return safeAsync(async () => {
      const sanitizedSource = source ? this.inputSanitizer.sanitizeString(source) : undefined;

      const result = await governmentDataRepository.getSyncLogs(sanitizedSource, limit);
      if (result.isErr()) {
        throw new Error(`Failed to fetch sync logs: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getSyncLogs',
      context: { source, limit }
    });
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  async getDataTypes(): AsyncServiceResult<string[]> {
    return safeAsync(async () => {
      const result = await governmentDataRepository.getDataTypes();
      if (result.isErr()) {
        throw new Error(`Failed to fetch data types: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getDataTypes'
    });
  }

  async getSources(): AsyncServiceResult<string[]> {
    return safeAsync(async () => {
      const result = await governmentDataRepository.getSources();
      if (result.isErr()) {
        throw new Error(`Failed to fetch sources: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getSources'
    });
  }

  async getStatistics(): AsyncServiceResult<{
    total: number;
    byDataType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    return safeAsync(async () => {
      const result = await governmentDataRepository.getStatistics();
      if (result.isErr()) {
        throw new Error(`Failed to fetch statistics: ${result.error.message}`);
      }

      return result.value;
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getStatistics'
    });
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async getHealthStatus(): AsyncServiceResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: boolean;
      cache: boolean;
      externalAPIs: boolean;
    };
    lastSync: Date | null;
    totalRecords: number;
  }> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'EnhancedGovernmentDataService', 
        operation: 'getHealthStatus'
      };
      logger.debug(logContext, 'Checking health status');

      // Check database connectivity
      const countResult = await governmentDataRepository.count();
      const databaseHealthy = countResult.isOk();
      const totalRecords = databaseHealthy ? countResult.value : 0;

      // Check cache (basic test)
      const cacheHealthy = true; // TODO: Implement cache health check

      // Check external APIs (basic test)
      const externalAPIsHealthy = true; // TODO: Implement external API health check

      // Get last sync time
      const syncLogsResult = await governmentDataRepository.getSyncLogs(undefined, 1);
      const lastSync = syncLogsResult.isOk() && syncLogsResult.value.length > 0 
        ? syncLogsResult.value[0].created_at 
        : null;

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!databaseHealthy) {
        status = 'unhealthy';
      } else if (!cacheHealthy || !externalAPIsHealthy) {
        status = 'degraded';
      }

      return {
        status,
        checks: {
          database: databaseHealthy,
          cache: cacheHealthy,
          externalAPIs: externalAPIsHealthy,
        },
        lastSync,
        totalRecords,
      };
    }, { 
      service: 'EnhancedGovernmentDataService', 
      operation: 'getHealthStatus'
    });
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private sanitizeQueryOptions(options: GovernmentDataQueryOptions): GovernmentDataQueryOptions {
    return {
      ...options,
      dataType: options.dataType ? this.inputSanitizer.sanitizeString(options.dataType) : undefined,
      source: options.source ? this.inputSanitizer.sanitizeString(options.source) : undefined,
      status: options.status ? this.inputSanitizer.sanitizeString(options.status) : undefined,
    };
  }

  private sanitizeCreateInput(input: GovernmentDataCreateInput): GovernmentDataCreateInput {
    return {
      ...input,
      data_type: this.inputSanitizer.sanitizeString(input.data_type),
      source: this.inputSanitizer.sanitizeString(input.source),
      external_id: input.external_id ? this.inputSanitizer.sanitizeString(input.external_id) : undefined,
      title: input.title ? this.inputSanitizer.sanitizeString(input.title) : undefined,
      status: input.status ? this.inputSanitizer.sanitizeString(input.status) : undefined,
    };
  }

  private sanitizeUpdateInput(input: GovernmentDataUpdateInput): GovernmentDataUpdateInput {
    return {
      ...input,
      title: input.title ? this.inputSanitizer.sanitizeString(input.title) : undefined,
      status: input.status ? this.inputSanitizer.sanitizeString(input.status) : undefined,
    };
  }
}

export const enhancedGovernmentDataService = new EnhancedGovernmentDataService();