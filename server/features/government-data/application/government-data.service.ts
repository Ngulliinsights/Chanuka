/**
 * Government Data Service
 * Orchestrates business logic and coordinates between layers.
 *
 * Design decisions:
 *  - safeAsync wrapper eliminates try/catch boilerplate across all methods
 *  - ErrorCategory enrichment (DATABASE vs SYSTEM) preserved for observability
 *  - camelCase domain entities throughout — DB schema types never leak upward
 *  - All inputs sanitized before reaching the repository
 */

import { safeAsync, AsyncServiceResult, ErrorCategory, createError } from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';
import { InputSanitizationService } from '@server/features/security';
import { governmentDataRepository } from '../infrastructure/repositories/government-data.repository.impl';
import {
  GovernmentDataEntity,
  GovernmentSyncLogEntity,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
} from '../domain/entities/government-data.entity';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    cache: boolean;
    externalAPIs: boolean;
  };
  lastSync: Date | null;
  totalRecords: number;
}

export interface DataStatistics {
  total: number;
  byDataType: Record<string, number>;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
}

type CountOptions = Omit<GovernmentDataQueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'>;

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export class GovernmentDataService {
  private readonly inputSanitizer = new InputSanitizationService();

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async getGovernmentData(
    options: GovernmentDataQueryOptions = {},
  ): AsyncServiceResult<GovernmentDataEntity[]> {
    return safeAsync(
      async () => {
        logger.debug(
          { component: 'GovernmentDataService', operation: 'getGovernmentData', options },
          'Getting government data',
        );

        const result = await governmentDataRepository.findMany(this.sanitizeQueryOptions(options));
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getGovernmentData',
            metadata: { options },
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'getGovernmentData', metadata: { options } },
    );
  }

  async getGovernmentDataById(id: number): AsyncServiceResult<GovernmentDataEntity | null> {
    return safeAsync(
      async () => {
        logger.debug(
          { component: 'GovernmentDataService', operation: 'getGovernmentDataById', id },
          'Getting government data by ID',
        );

        const result = await governmentDataRepository.findById(id);
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getGovernmentDataById',
            metadata: { id },
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'getGovernmentDataById', metadata: { id } },
    );
  }

  async getGovernmentDataByExternalId(
    externalId: string,
    source: string,
  ): AsyncServiceResult<GovernmentDataEntity | null> {
    return safeAsync(
      async () => {
        const sanitizedExternalId = this.inputSanitizer.sanitizeString(externalId);
        const sanitizedSource = this.inputSanitizer.sanitizeString(source);

        const result = await governmentDataRepository.findByExternalId(
          sanitizedExternalId,
          sanitizedSource,
        );
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getGovernmentDataByExternalId',
            metadata: { externalId, source },
          });
        }

        return result.value;
      },
      {
        service: 'GovernmentDataService',
        operation: 'getGovernmentDataByExternalId',
        metadata: { externalId, source },
      },
    );
  }

  async countGovernmentData(options: CountOptions = {}): AsyncServiceResult<number> {
    return safeAsync(
      async () => {
        const result = await governmentDataRepository.count(this.sanitizeQueryOptions(options));
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'countGovernmentData',
            metadata: { options },
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'countGovernmentData', metadata: { options } },
    );
  }

  // ==========================================================================
  // Mutation Operations
  // ==========================================================================

  async createGovernmentData(
    input: GovernmentDataCreateInput,
  ): AsyncServiceResult<GovernmentDataEntity> {
    return safeAsync(
      async () => {
        logger.info(
          {
            component: 'GovernmentDataService',
            operation: 'createGovernmentData',
            dataType: input.dataType,
            source: input.source,
          },
          'Creating government data',
        );

        const result = await governmentDataRepository.create(this.sanitizeCreateInput(input));
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'createGovernmentData',
            metadata: { input },
          });
        }

        return result.value;
      },
      {
        service: 'GovernmentDataService',
        operation: 'createGovernmentData',
        metadata: { input },
      },
    );
  }

  async updateGovernmentData(
    id: number,
    input: GovernmentDataUpdateInput,
  ): AsyncServiceResult<GovernmentDataEntity> {
    return safeAsync(
      async () => {
        logger.info(
          { component: 'GovernmentDataService', operation: 'updateGovernmentData', id },
          'Updating government data',
        );

        const result = await governmentDataRepository.update(id, this.sanitizeUpdateInput(input));
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'updateGovernmentData',
            metadata: { id, input },
          });
        }

        return result.value;
      },
      {
        service: 'GovernmentDataService',
        operation: 'updateGovernmentData',
        metadata: { id, input },
      },
    );
  }

  async deleteGovernmentData(id: number): AsyncServiceResult<boolean> {
    return safeAsync(
      async () => {
        logger.info(
          { component: 'GovernmentDataService', operation: 'deleteGovernmentData', id },
          'Deleting government data',
        );

        const result = await governmentDataRepository.delete(id);
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'deleteGovernmentData',
            metadata: { id },
          });
        }

        return result.value;
      },
      {
        service: 'GovernmentDataService',
        operation: 'deleteGovernmentData',
        metadata: { id },
      },
    );
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  async getSyncLogs(
    source?: string,
    limit: number = 50,
  ): AsyncServiceResult<GovernmentSyncLogEntity[]> {
    return safeAsync(
      async () => {
        const sanitizedSource = source ? this.inputSanitizer.sanitizeString(source) : undefined;

        const result = await governmentDataRepository.getSyncLogs(sanitizedSource, limit);
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getSyncLogs',
            metadata: { source, limit },
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'getSyncLogs', metadata: { source, limit } },
    );
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  async getDataTypes(): AsyncServiceResult<string[]> {
    return safeAsync(
      async () => {
        const result = await governmentDataRepository.getDataTypes();
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getDataTypes',
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'getDataTypes' },
    );
  }

  async getSources(): AsyncServiceResult<string[]> {
    return safeAsync(
      async () => {
        const result = await governmentDataRepository.getSources();
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getSources',
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'getSources' },
    );
  }

  async getStatistics(): AsyncServiceResult<DataStatistics> {
    return safeAsync(
      async () => {
        const result = await governmentDataRepository.getStatistics();
        if (result.isErr()) {
          throw createError(result.error.message, ErrorCategory.DATABASE, {
            service: 'GovernmentDataService',
            operation: 'getStatistics',
          });
        }

        return result.value;
      },
      { service: 'GovernmentDataService', operation: 'getStatistics' },
    );
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async getHealthStatus(): AsyncServiceResult<HealthStatus> {
    return safeAsync(
      async () => {
        logger.debug(
          { component: 'GovernmentDataService', operation: 'getHealthStatus' },
          'Checking health status',
        );

        // Database connectivity — if this fails the service is unhealthy
        const countResult = await governmentDataRepository.count();
        const databaseHealthy = countResult.isOk();
        const totalRecords = databaseHealthy ? countResult.value : 0;

        // TODO: Replace stubs with real health probes
        const cacheHealthy = true;
        const externalAPIsHealthy = true;

        // Last sync time — safe access through intermediate variable
        const syncLogsResult = await governmentDataRepository.getSyncLogs(undefined, 1);
        const firstLog = syncLogsResult.isOk() ? syncLogsResult.value[0] : undefined;
        const lastSync: Date | null = firstLog?.createdAt ?? null;

        const status: HealthStatus['status'] = !databaseHealthy
          ? 'unhealthy'
          : !cacheHealthy || !externalAPIsHealthy
            ? 'degraded'
            : 'healthy';

        return {
          status,
          checks: { database: databaseHealthy, cache: cacheHealthy, externalAPIs: externalAPIsHealthy },
          lastSync,
          totalRecords,
        };
      },
      { service: 'GovernmentDataService', operation: 'getHealthStatus' },
    );
  }

  // ==========================================================================
  // Private Helpers
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