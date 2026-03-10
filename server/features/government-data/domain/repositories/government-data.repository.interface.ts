/**
 * Government Data Repository Interface
 * Defines the contract for data access operations
 */

import { ServiceResult } from '@server/infrastructure/error-handling';
import { 
  GovernmentDataEntity, 
  GovernmentSyncLogEntity,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
  SyncLogCreateInput
} from '../entities/government-data.entity';

export interface IGovernmentDataRepository {
  // Query operations
  findById(id: number): Promise<ServiceResult<GovernmentDataEntity | null>>;
  findByExternalId(externalId: string, source: string): Promise<ServiceResult<GovernmentDataEntity | null>>;
  findMany(options: GovernmentDataQueryOptions): Promise<ServiceResult<GovernmentDataEntity[]>>;
  count(options: Omit<GovernmentDataQueryOptions, 'limit' | 'offset' | 'sortBy' | 'sortOrder'>): Promise<ServiceResult<number>>;

  // Mutation operations
  create(input: GovernmentDataCreateInput): Promise<ServiceResult<GovernmentDataEntity>>;
  update(id: number, input: GovernmentDataUpdateInput): Promise<ServiceResult<GovernmentDataEntity>>;
  delete(id: number): Promise<ServiceResult<boolean>>;

  // Sync operations
  createSyncLog(input: SyncLogCreateInput): Promise<ServiceResult<GovernmentSyncLogEntity>>;
  getSyncLogs(source?: string, limit?: number): Promise<ServiceResult<GovernmentSyncLogEntity[]>>;

  // Metadata operations
  getDataTypes(): Promise<ServiceResult<string[]>>;
  getSources(): Promise<ServiceResult<string[]>>;
  getStatistics(): Promise<ServiceResult<{
    total: number;
    byDataType: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
  }>>;
}