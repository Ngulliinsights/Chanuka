/**
 * Government Data API Service
 * Modernized API service following standardized patterns
 */

import { SyncableApiService } from '@shared/core/api/base-api-service';
import { globalApiClient } from '@client/infrastructure/api/client';
import {
  GovernmentData,
  CreateGovernmentDataRequest,
  UpdateGovernmentDataRequest,
  GovernmentDataQueryParams,
  GovernmentDataResponse,
  GovernmentDataListResponse,
  GovernmentDataStatsResponse,
  GovernmentDataHealthResponse,
  GovernmentDataSyncResponse,
  BulkUpdateRequest,
} from '@shared/types/api/contracts/government-data.contracts';

class GovernmentDataApiService extends SyncableApiService<
  GovernmentData,
  CreateGovernmentDataRequest,
  UpdateGovernmentDataRequest,
  GovernmentDataQueryParams
> {
  constructor() {
    super('/api/government-data', globalApiClient);
  }

  // Enhanced query methods
  async getByType(
    dataType: string,
    params?: Partial<GovernmentDataQueryParams>
  ): Promise<GovernmentDataListResponse> {
    return this.client.get(`${this.baseUrl}/type/${dataType}`, params);
  }

  async getBySource(
    source: string,
    params?: Partial<GovernmentDataQueryParams>
  ): Promise<GovernmentDataListResponse> {
    return this.client.get(`${this.baseUrl}/source/${source}`, params);
  }

  async getRecent(limit: number = 10): Promise<GovernmentDataListResponse> {
    return this.client.get(`${this.baseUrl}/recent`, { limit });
  }

  async getTrending(
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<GovernmentDataListResponse> {
    return this.client.get(`${this.baseUrl}/trending`, { period });
  }

  // Statistics and analytics
  async getStats(dateFrom?: string, dateTo?: string): Promise<GovernmentDataStatsResponse> {
    return this.client.get(`${this.baseUrl}/stats`, { dateFrom, dateTo });
  }

  async getHealthStatus(): Promise<GovernmentDataHealthResponse> {
    return this.client.get(`${this.baseUrl}/health`);
  }

  // Bulk operations
  async bulkUpdateByIds(request: BulkUpdateRequest): Promise<GovernmentDataListResponse> {
    return this.client.patch(`${this.baseUrl}/bulk`, request);
  }

  async bulkUpdateByQuery(
    query: Partial<GovernmentDataQueryParams>,
    updates: Partial<UpdateGovernmentDataRequest>
  ): Promise<GovernmentDataListResponse> {
    return this.client.patch(`${this.baseUrl}/bulk/query`, { query, updates });
  }

  // Sync operations (inherited from SyncableApiService)
  async syncFromSource(
    source: string,
    options?: { force?: boolean }
  ): Promise<GovernmentDataSyncResponse> {
    return this.client.post(`${this.baseUrl}/sync/source/${source}`, options);
  }

  async syncAll(options?: {
    force?: boolean;
    parallel?: boolean;
  }): Promise<GovernmentDataSyncResponse> {
    return this.client.post(`${this.baseUrl}/sync/all`, options);
  }

  // Content operations
  async getContent(id: string, format?: 'json' | 'html' | 'text'): Promise<any> {
    return this.client.get(`${this.baseUrl}/${id}/content`, { format });
  }

  async updateContent(id: string, content: Record<string, any>): Promise<GovernmentDataResponse> {
    return this.client.patch(`${this.baseUrl}/${id}/content`, { content });
  }

  // Tag operations
  async getTags(): Promise<{ tags: string[]; counts: Record<string, number> }> {
    return this.client.get(`${this.baseUrl}/tags`);
  }

  async addTags(id: string, tags: string[]): Promise<GovernmentDataResponse> {
    return this.client.post(`${this.baseUrl}/${id}/tags`, { tags });
  }

  async removeTags(id: string, tags: string[]): Promise<GovernmentDataResponse> {
    return this.client.delete(`${this.baseUrl}/${id}/tags?tags=${tags.join(',')}`);
  }

  // Search and filtering
  async advancedSearch(params: {
    query?: string;
    filters?: Record<string, any>;
    facets?: string[];
    highlight?: boolean;
  }): Promise<
    GovernmentDataListResponse & {
      facets?: Record<string, Array<{ value: string; count: number }>>;
      highlights?: Record<string, string[]>;
    }
  > {
    return this.client.post(`${this.baseUrl}/search/advanced`, params);
  }

  // Validation operations
  async validateData(id: string): Promise<{
    isValid: boolean;
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
    score: number;
  }> {
    return this.client.post(`${this.baseUrl}/${id}/validate`);
  }

  async validateBatch(ids: string[]): Promise<
    Record<
      string,
      {
        isValid: boolean;
        errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>;
        score: number;
      }
    >
  > {
    return this.client.post(`${this.baseUrl}/validate/batch`, { ids });
  }
}

// Export singleton instance
export const governmentDataApiService = new GovernmentDataApiService();
export default governmentDataApiService;
