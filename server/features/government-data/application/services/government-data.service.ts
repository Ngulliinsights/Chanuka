/**
 * Government Data Application Service
 * Orchestrates business logic and coordinates between layers
 */

import { ServiceResult, createOk, createError } from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';
import { InputSanitizationService } from '@server/features/security';
import { governmentDataRepository } from '../../infrastructure/repositories/government-data.repository.impl';
import { 
  GovernmentDataEntity,
  GovernmentSyncLogEntity,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput
} from '../../domain/entities/government-data.entity';

export class GovernmentDataService {
  private inputSanitizer = new InputSanitizationService();

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async getGovernmentData(options: GovernmentDataQueryOptions = {}): Promise<ServiceResult<GovernmentDataEntity[]>> {
    try {
      const logContext = { 
        component: 'GovernmentDataService', 
        operation: 'getGovernmentData',
        options 
      };
      logger.debug(logContext, 'Getting government data');

      // Sanitize inputs
      const sanitizedOptions = this.sanitizeQueryOptions(options);

      // Use repository for data access
      const result = await governmentDataRepository.findMany(sanitizedOptions);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch government data: ${result.error.message}`, { options });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, options }, 'Failed to get government data');
      return createError('SERVICE_ERROR', 'Failed to get government data', { options });
    }
  }

  async getGovernmentDataById(id: number): Promise<ServiceResult<GovernmentDataEntity | null>> {
    try {
      const logContext = { 
        component: 'GovernmentDataService', 
        operation: 'getGovernmentDataById',
        id 
      };
      logger.debug(logContext, 'Getting government data by ID');

      const result = await governmentDataRepository.findById(id);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch government data: ${result.error.message}`, { id });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, id }, 'Failed to get government data by ID');
      return createError('SERVICE_ERROR', 'Failed to get government data by ID', { id });
    }
  }

  async getGovernmentDataByExternalId(externalId: string, source: string): Promise<ServiceResult<GovernmentDataEntity | null>> {
    try {
      const sanitizedExternalId = this.inputSanitizer.sanitizeString(externalId);
      const sanitizedSource = this.inputSanitizer.sanitizeString(source);

      const result = await governmentDataRepository.findByExternalId(sanitizedExternalId, sanitizedSource);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch government data: ${result.error.message}`, { externalId, source });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, externalId, source }, 'Failed to get government data by external ID');
      return createError('SERVICE_ERROR', 'Failed to get government data by external ID', { externalId, source });
    }
  }

  async countGovernmentData(options: Omit<GovernmentDataQueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'> = {}): Promise<ServiceResult<number>> {
    try {
      const sanitizedOptions = this.sanitizeQueryOptions(options);

      const result = await governmentDataRepository.count(sanitizedOptions);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to count government data: ${result.error.message}`, { options });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, options }, 'Failed to count government data');
      return createError('SERVICE_ERROR', 'Failed to count government data', { options });
    }
  }

  // ==========================================================================
  // Mutation Operations
  // ==========================================================================

  async createGovernmentData(input: GovernmentDataCreateInput): Promise<ServiceResult<GovernmentDataEntity>> {
    try {
      const logContext = { 
        component: 'GovernmentDataService', 
        operation: 'createGovernmentData',
        dataType: input.dataType,
        source: input.source
      };
      logger.info(logContext, 'Creating government data');

      // Sanitize inputs
      const sanitizedInput = this.sanitizeCreateInput(input);

      const result = await governmentDataRepository.create(sanitizedInput);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to create government data: ${result.error.message}`, { input });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, input }, 'Failed to create government data');
      return createError('SERVICE_ERROR', 'Failed to create government data', { input });
    }
  }

  async updateGovernmentData(id: number, input: GovernmentDataUpdateInput): Promise<ServiceResult<GovernmentDataEntity>> {
    try {
      const logContext = { 
        component: 'GovernmentDataService', 
        operation: 'updateGovernmentData',
        id
      };
      logger.info(logContext, 'Updating government data');

      // Sanitize inputs
      const sanitizedInput = this.sanitizeUpdateInput(input);

      const result = await governmentDataRepository.update(id, sanitizedInput);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to update government data: ${result.error.message}`, { id, input });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, id, input }, 'Failed to update government data');
      return createError('SERVICE_ERROR', 'Failed to update government data', { id, input });
    }
  }

  async deleteGovernmentData(id: number): Promise<ServiceResult<boolean>> {
    try {
      const logContext = { 
        component: 'GovernmentDataService', 
        operation: 'deleteGovernmentData',
        id
      };
      logger.info(logContext, 'Deleting government data');

      const result = await governmentDataRepository.delete(id);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to delete government data: ${result.error.message}`, { id });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete government data');
      return createError('SERVICE_ERROR', 'Failed to delete government data', { id });
    }
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async getSyncLogs(source?: string, limit: number = 50): Promise<ServiceResult<GovernmentSyncLogEntity[]>> {
    try {
      const sanitizedSource = source ? this.inputSanitizer.sanitizeString(source) : undefined;

      const result = await governmentDataRepository.getSyncLogs(sanitizedSource, limit);
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch sync logs: ${result.error.message}`, { source, limit });
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error, source, limit }, 'Failed to get sync logs');
      return createError('SERVICE_ERROR', 'Failed to get sync logs', { source, limit });
    }
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  async getDataTypes(): Promise<ServiceResult<string[]>> {
    try {
      const result = await governmentDataRepository.getDataTypes();
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch data types: ${result.error.message}`);
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error }, 'Failed to get data types');
      return createError('SERVICE_ERROR', 'Failed to get data types');
    }
  }

  async getSources(): Promise<ServiceResult<string[]>> {
    try {
      const result = await governmentDataRepository.getSources();
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch sources: ${result.error.message}`);
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error }, 'Failed to get sources');
      return createError('SERVICE_ERROR', 'Failed to get sources');
    }
  }

  async getStatistics(): Promise<ServiceResult<{
    total: number;
    byDataType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  }>> {
    try {
      const result = await governmentDataRepository.getStatistics();
      if (!result.isOk) {
        return createError('SERVICE_ERROR', `Failed to fetch statistics: ${result.error.message}`);
      }

      return createOk(result.value);
    } catch (error) {
      logger.error({ error }, 'Failed to get statistics');
      return createError('SERVICE_ERROR', 'Failed to get statistics');
    }
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async getHealthStatus(): Promise<ServiceResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: boolean;
      cache: boolean;
      externalAPIs: boolean;
    };
    lastSync: Date | null;
    totalRecords: number;
  }>> {
    try {
      const logContext = { 
        component: 'GovernmentDataService', 
        operation: 'getHealthStatus'
      };
      logger.debug(logContext, 'Checking health status');

      // Check database connectivity
      const countResult = await governmentDataRepository.count();
      const databaseHealthy = countResult.isOk;
      const totalRecords = databaseHealthy ? countResult.value : 0;

      // Check cache (basic test)
      const cacheHealthy = true; // TODO: Implement cache health check

      // Check external APIs (basic test)
      const externalAPIsHealthy = true; // TODO: Implement external API health check

      // Get last sync time
      const syncLogsResult = await governmentDataRepository.getSyncLogs(undefined, 1);
      const lastSync = syncLogsResult.isOk && syncLogsResult.value.length > 0 
        ? syncLogsResult.value[0].createdAt 
        : null;

      // Determine overall status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!databaseHealthy) {
        status = 'unhealthy';
      } else if (!cacheHealthy || !externalAPIsHealthy) {
        status = 'degraded';
      }

      return createOk({
        status,
        checks: {
          database: databaseHealthy,
          cache: cacheHealthy,
          externalAPIs: externalAPIsHealthy,
        },
        lastSync,
        totalRecords,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get health status');
      return createError('SERVICE_ERROR', 'Failed to get health status');
    }
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
      dataType: this.inputSanitizer.sanitizeString(input.dataType),
      source: this.inputSanitizer.sanitizeString(input.source),
      externalId: input.externalId ? this.inputSanitizer.sanitizeString(input.externalId) : undefined,
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

export const governmentDataService = new GovernmentDataService();