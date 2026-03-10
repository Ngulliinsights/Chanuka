/**
 * Government Data API Service
 * Complete client-side API integration for government data management
 */

import { apiClient } from '@client/infrastructure/api';
import { 
  GovernmentData,
  GovernmentDataListResponse,
  GovernmentDataResponse,
  GovernmentDataQueryOptions,
  GovernmentDataCreateInput,
  GovernmentDataUpdateInput,
  GovernmentDataMetadata,
  GovernmentSyncLog,
  SyncTriggerOptions,
  SyncStatus,
  HealthStatus,
  SearchOptions,
  SearchResult,
  DataAnalytics
} from '../types';

export class GovernmentDataApiService {
  private readonly baseUrl = '/api/government-data';

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * List government data with filtering, pagination, and sorting
   */
  async list(options: GovernmentDataQueryOptions = {}): Promise<GovernmentDataListResponse> {
    const params = new URLSearchParams();
    
    if (options.dataType) params.append('dataType', options.dataType);
    if (options.source) params.append('source', options.source);
    if (options.status) params.append('status', options.status);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom.toISOString());
    if (options.dateTo) params.append('dateTo', options.dateTo.toISOString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const response = await apiClient.get<GovernmentDataListResponse>(
      `${this.baseUrl}?${params.toString()}`
    );

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = response.data.map(this.transformDates);
    }

    return response;
  }

  /**
   * Get government data by ID
   */
  async getById(id: number): Promise<GovernmentDataResponse> {
    const response = await apiClient.get<GovernmentDataResponse>(`${this.baseUrl}/${id}`);

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = this.transformDates(response.data);
    }

    return response;
  }

  /**
   * Get government data by external ID and source
   */
  async getByExternalId(source: string, externalId: string): Promise<GovernmentDataResponse> {
    const response = await apiClient.get<GovernmentDataResponse>(
      `${this.baseUrl}/external/${encodeURIComponent(source)}/${encodeURIComponent(externalId)}`
    );

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = this.transformDates(response.data);
    }

    return response;
  }

  /**
   * Search government data with advanced options
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams();
    
    params.append('query', options.query);
    if (options.dataTypes?.length) {
      options.dataTypes.forEach(type => params.append('dataTypes', type));
    }
    if (options.sources?.length) {
      options.sources.forEach(source => params.append('sources', source));
    }
    if (options.dateRange) {
      params.append('dateFrom', options.dateRange.from.toISOString());
      params.append('dateTo', options.dateRange.to.toISOString());
    }
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await apiClient.get<SearchResult>(
      `${this.baseUrl}/search?${params.toString()}`
    );

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = response.data.map(this.transformDates);
    }

    return response;
  }

  // ==========================================================================
  // Mutation Operations (Admin only)
  // ==========================================================================

  /**
   * Create new government data record
   */
  async create(input: GovernmentDataCreateInput): Promise<GovernmentDataResponse> {
    const response = await apiClient.post<GovernmentDataResponse>(this.baseUrl, input);

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = this.transformDates(response.data);
    }

    return response;
  }

  /**
   * Update government data record
   */
  async update(id: number, input: GovernmentDataUpdateInput): Promise<GovernmentDataResponse> {
    const response = await apiClient.patch<GovernmentDataResponse>(`${this.baseUrl}/${id}`, input);

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = this.transformDates(response.data);
    }

    return response;
  }

  /**
   * Delete government data record
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  /**
   * Get available data types
   */
  async getDataTypes(): Promise<{ success: boolean; data: string[] }> {
    return await apiClient.get(`${this.baseUrl}/metadata/data-types`);
  }

  /**
   * Get available sources
   */
  async getSources(): Promise<{ success: boolean; data: string[] }> {
    return await apiClient.get(`${this.baseUrl}/metadata/sources`);
  }

  /**
   * Get government data statistics
   */
  async getStatistics(): Promise<{ 
    success: boolean; 
    data: {
      total: number;
      byDataType: Record<string, number>;
      bySource: Record<string, number>;
      byStatus: Record<string, number>;
    }
  }> {
    return await apiClient.get(`${this.baseUrl}/metadata/statistics`);
  }

  /**
   * Get complete metadata (data types, sources, statistics)
   */
  async getMetadata(): Promise<{ success: boolean; data: GovernmentDataMetadata }> {
    const [dataTypesRes, sourcesRes, statisticsRes] = await Promise.all([
      this.getDataTypes(),
      this.getSources(),
      this.getStatistics(),
    ]);

    if (!dataTypesRes.success || !sourcesRes.success || !statisticsRes.success) {
      return {
        success: false,
        data: {
          dataTypes: [],
          sources: [],
          statistics: {
            total: 0,
            byDataType: {},
            bySource: {},
            byStatus: {},
          },
        },
      };
    }

    return {
      success: true,
      data: {
        dataTypes: dataTypesRes.data,
        sources: sourcesRes.data,
        statistics: statisticsRes.data,
      },
    };
  }

  // ==========================================================================
  // Analytics Operations
  // ==========================================================================

  /**
   * Get comprehensive analytics data
   */
  async getAnalytics(): Promise<{ success: boolean; data: DataAnalytics }> {
    const [statisticsRes, syncLogsRes] = await Promise.all([
      this.getStatistics(),
      this.getSyncLogs(undefined, 10),
    ]);

    if (!statisticsRes.success) {
      return {
        success: false,
        data: {
          totalRecords: 0,
          recordsThisMonth: 0,
          recordsThisWeek: 0,
          topDataTypes: [],
          topSources: [],
          statusDistribution: [],
          syncHealth: {
            lastSync: null,
            successRate: 0,
            averageRecordsPerSync: 0,
            failureReasons: [],
          },
        },
      };
    }

    const stats = statisticsRes.data;
    const syncLogs = syncLogsRes.success ? syncLogsRes.data : [];

    // Calculate analytics from statistics
    const totalRecords = stats.total;
    
    // Convert data type counts to percentages
    const topDataTypes = Object.entries(stats.byDataType)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalRecords > 0 ? (count / totalRecords) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Convert source counts to percentages
    const topSources = Object.entries(stats.bySource)
      .map(([source, count]) => ({
        source,
        count,
        percentage: totalRecords > 0 ? (count / totalRecords) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Convert status counts to percentages
    const statusDistribution = Object.entries(stats.byStatus)
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalRecords > 0 ? (count / totalRecords) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate sync health metrics
    const successfulSyncs = syncLogs.filter(log => log.status === 'success');
    const successRate = syncLogs.length > 0 ? (successfulSyncs.length / syncLogs.length) * 100 : 0;
    const averageRecordsPerSync = syncLogs.length > 0 
      ? syncLogs.reduce((sum, log) => sum + log.records_processed, 0) / syncLogs.length 
      : 0;

    const failureReasons = syncLogs
      .filter(log => log.status === 'error' && log.error_details)
      .reduce((acc, log) => {
        const reason = log.error_details?.message || 'Unknown error';
        const existing = acc.find(item => item.reason === reason);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ reason, count: 1 });
        }
        return acc;
      }, [] as Array<{ reason: string; count: number }>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      success: true,
      data: {
        totalRecords,
        recordsThisMonth: 0, // TODO: Calculate from date filters
        recordsThisWeek: 0, // TODO: Calculate from date filters
        topDataTypes,
        topSources,
        statusDistribution,
        syncHealth: {
          lastSync: syncLogs.length > 0 ? syncLogs[0].created_at : null,
          successRate,
          averageRecordsPerSync,
          failureReasons,
        },
      },
    };
  }

  // ==========================================================================
  // Sync Operations (Admin only)
  // ==========================================================================

  /**
   * Get sync logs
   */
  async getSyncLogs(source?: string, limit: number = 50): Promise<{ 
    success: boolean; 
    data: GovernmentSyncLog[] 
  }> {
    const params = new URLSearchParams();
    if (source) params.append('source', source);
    params.append('limit', limit.toString());

    const response = await apiClient.get<{ success: boolean; data: GovernmentSyncLog[] }>(
      `${this.baseUrl}/sync/logs?${params.toString()}`
    );

    // Transform date strings to Date objects
    if (response.success && response.data) {
      response.data = response.data.map(log => ({
        ...log,
        created_at: new Date(log.created_at),
      }));
    }

    return response;
  }

  /**
   * Trigger data synchronization
   */
  async triggerSync(options: SyncTriggerOptions = {}): Promise<{ 
    success: boolean; 
    data: SyncStatus 
  }> {
    return await apiClient.post(`${this.baseUrl}/sync/trigger`, options);
  }

  // ==========================================================================
  // Health Operations
  // ==========================================================================

  /**
   * Get service health status
   */
  async getHealth(): Promise<{ success: boolean; data: HealthStatus }> {
    const response = await apiClient.get<{ success: boolean; data: HealthStatus }>(
      `${this.baseUrl}/health`
    );

    // Transform date strings to Date objects
    if (response.success && response.data && response.data.lastSync) {
      response.data.lastSync = new Date(response.data.lastSync);
    }

    return response;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Transform date strings to Date objects
   */
  private transformDates(data: any): GovernmentData {
    return {
      ...data,
      published_date: data.published_date ? new Date(data.published_date) : undefined,
      effective_date: data.effective_date ? new Date(data.effective_date) : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Format date for API requests
   */
  private formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Build query parameters from options
   */
  private buildQueryParams(options: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else if (Array.isArray(value)) {
          value.forEach(item => params.append(key, item.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return params;
  }
}

// Export singleton instance
export const governmentDataApiService = new GovernmentDataApiService();