/**
 * Base API Service
 * Standardized API service pattern for all features
 */

import { ApiResponse, BaseQueryParams, HealthCheckResponse, MetadataResponse } from '../../types/api/contracts/core.contracts';

export interface ApiClient {
  get<T>(url: string, params?: Record<string, any>): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  patch<T>(url: string, data?: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export abstract class BaseApiService<TEntity, TCreateRequest, TUpdateRequest, TQueryParams extends BaseQueryParams> {
  protected readonly baseUrl: string;
  protected readonly client: ApiClient;

  constructor(baseUrl: string, client: ApiClient) {
    this.baseUrl = baseUrl;
    this.client = client;
  }

  // Standard CRUD Operations
  async getAll(params?: TQueryParams): Promise<ApiResponse<TEntity[]>> {
    return this.client.get(`${this.baseUrl}`, params);
  }

  async getById(id: string): Promise<ApiResponse<TEntity>> {
    return this.client.get(`${this.baseUrl}/${id}`);
  }

  async create(data: TCreateRequest): Promise<ApiResponse<TEntity>> {
    return this.client.post(`${this.baseUrl}`, data);
  }

  async update(id: string, data: TUpdateRequest): Promise<ApiResponse<TEntity>> {
    return this.client.patch(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return this.client.delete(`${this.baseUrl}/${id}`);
  }

  // Standard Metadata Operations
  async getCount(params?: Partial<TQueryParams>): Promise<ApiResponse<{ count: number }>> {
    return this.client.get(`${this.baseUrl}/count`, params);
  }

  async getHealth(): Promise<HealthCheckResponse> {
    return this.client.get(`${this.baseUrl}/health`);
  }

  async getMetadata(): Promise<MetadataResponse> {
    return this.client.get(`${this.baseUrl}/metadata`);
  }

  // Batch Operations
  async bulkCreate(data: TCreateRequest[]): Promise<ApiResponse<TEntity[]>> {
    return this.client.post(`${this.baseUrl}/bulk`, { items: data });
  }

  async bulkUpdate(updates: Array<{ id: string; data: TUpdateRequest }>): Promise<ApiResponse<TEntity[]>> {
    return this.client.patch(`${this.baseUrl}/bulk`, { updates });
  }

  async bulkDelete(ids: string[]): Promise<ApiResponse<void>> {
    return this.client.delete(`${this.baseUrl}/bulk?ids=${ids.join(',')}`);
  }

  // Search Operations
  async search(query: string, params?: Partial<TQueryParams>): Promise<ApiResponse<TEntity[]>> {
    return this.client.get(`${this.baseUrl}/search`, { q: query, ...params });
  }

  // Export Operations
  async export(format: 'json' | 'csv' | 'xlsx', params?: Partial<TQueryParams>): Promise<Blob> {
    return this.client.get(`${this.baseUrl}/export/${format}`, params);
  }

  // Utility Methods
  protected buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }

  protected handleError(error: any): never {
    // Standardized error handling
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error.message || 'API request failed');
    }
    throw new Error(error.message || 'Unknown API error');
  }
}

// Specialized base classes for common patterns
export abstract class CacheableApiService<TEntity, TCreateRequest, TUpdateRequest, TQueryParams extends BaseQueryParams> 
  extends BaseApiService<TEntity, TCreateRequest, TUpdateRequest, TQueryParams> {
  
  // Cache Operations
  async getCacheStats(): Promise<ApiResponse<{
    hitRate: number;
    missRate: number;
    size: number;
    maxSize: number;
    evictions: number;
  }>> {
    return this.client.get(`${this.baseUrl}/cache/stats`);
  }

  async clearCache(pattern?: string): Promise<ApiResponse<void>> {
    return this.client.delete(`${this.baseUrl}/cache${pattern ? `?pattern=${pattern}` : ''}`);
  }

  async warmCache(ids?: string[]): Promise<ApiResponse<void>> {
    return this.client.post(`${this.baseUrl}/cache/warm`, { ids });
  }
}

export abstract class SyncableApiService<TEntity, TCreateRequest, TUpdateRequest, TQueryParams extends BaseQueryParams> 
  extends BaseApiService<TEntity, TCreateRequest, TUpdateRequest, TQueryParams> {
  
  // Sync Operations
  async getSyncStatus(): Promise<ApiResponse<{
    lastSync: string;
    nextSync: string;
    status: 'idle' | 'running' | 'error';
    recordsProcessed: number;
  }>> {
    return this.client.get(`${this.baseUrl}/sync/status`);
  }

  async triggerSync(options?: { force?: boolean; source?: string }): Promise<ApiResponse<void>> {
    return this.client.post(`${this.baseUrl}/sync/trigger`, options);
  }

  async getSyncLogs(limit?: number): Promise<ApiResponse<Array<{
    timestamp: string;
    operation: string;
    status: 'success' | 'error';
    recordsProcessed: number;
    duration: number;
    error?: string;
  }>>> {
    return this.client.get(`${this.baseUrl}/sync/logs`, { limit });
  }
}