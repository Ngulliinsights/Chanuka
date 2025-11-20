/**
 * Government Data Integration Service
 * 
 * Implements API connections to official legislative data sources with
 * authentication, rate limiting compliance, and comprehensive error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import { logger   } from '@shared/core/src/index.js';
import { httpUtils } from '@shared/core/utils/http-utils';
import {
  DataSource,
  ApiEndpoint,
  ApiResponse,
  BillData,
  SponsorData,
  DataSourceHealth,
  HealthIssue
} from './types';

export class GovernmentDataService extends EventEmitter {
  private dataSources: Map<string, DataSource> = new Map();
  private apiClients: Map<string, AxiosInstance> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private healthStatus: Map<string, DataSourceHealth> = new Map();

  constructor() {
    super();
    this.initializeDataSources();
    this.setupHealthMonitoring();
  }

  /**
   * Initialize default data sources
   */
  private initializeDataSources(): void {
    const defaultSources: DataSource[] = [
      {
        id: 'congress.gov',
        name: 'Congress.gov API',
        type: 'government',
        baseUrl: 'https://api.congress.gov/v3',
        authType: 'api_key',
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 3600,
          requestsPerDay: 86400
        },
        endpoints: [
          {
            id: 'bills',
            path: '/bill',
            method: 'GET',
            description: 'Fetch bills from Congress.gov',
            dataType: 'bills',
            responseFormat: 'json',
            cacheTtl: 3600,
            syncFrequency: 'hourly'
          },
          {
            id: 'members',
            path: '/member',
            method: 'GET',
            description: 'Fetch member information',
            dataType: 'sponsors',
            responseFormat: 'json',
            cacheTtl: 86400,
            syncFrequency: 'daily'
          }
        ],
        is_active: true,
        priority: 10,
        healthStatus: 'unknown'
      },
      {
        id: 'propublica',
        name: 'ProPublica Congress API',
        type: 'legislative',
        baseUrl: 'https://api.propublica.org/congress/v1',
        authType: 'api_key',
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 3600,
          requestsPerDay: 86400
        },
        endpoints: [
          {
            id: 'bills',
            path: '/bills/search.json',
            method: 'GET',
            description: 'Search bills via ProPublica',
            dataType: 'bills',
            responseFormat: 'json',
            cacheTtl: 3600,
            syncFrequency: 'hourly'
          },
          {
            id: 'members',
            path: '/members.json',
            method: 'GET',
            description: 'Fetch member information',
            dataType: 'sponsors',
            responseFormat: 'json',
            cacheTtl: 86400,
            syncFrequency: 'daily'
          }
        ],
        is_active: true,
        priority: 8,
        healthStatus: 'unknown'
      }
    ];

    for (const source of defaultSources) {
      this.addDataSource(source);
    }
  }

  /**
   * Add a new data source
   */
  addDataSource(dataSource: DataSource): void {
    this.dataSources.set(dataSource.id, dataSource);
    
    // Create API client
    const client = axios.create({
      baseURL: dataSource.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Chanuka-Legislative-Platform/1.0',
        'Accept': 'application/json'
      }
    });

    // Add authentication
    if (dataSource.authType === 'api_key' && dataSource.apiKey) {
      client.defaults.headers.common['X-API-Key'] = dataSource.apiKey;
    }

    // Add request interceptor for rate limiting
    client.interceptors.request.use(async (config) => {
      await this.checkRateLimit(dataSource.id);
      return config;
    });

    // Add response interceptor for monitoring
    client.interceptors.response.use(
      (response) => {
        this.updateHealthStatus(dataSource.id, 'healthy', response.config.url || '');
        return response;
      },
      (error) => {
        this.handleApiError(dataSource.id, error);
        throw error;
      }
    );

    this.apiClients.set(dataSource.id, client);
    this.rateLimiters.set(dataSource.id, new RateLimiter(dataSource.rateLimit));

    console.log(`✅ Added data source: ${dataSource.name}`);
  }

  /**
   * Fetch data from a specific endpoint
   */
  async fetchData(
    dataSourceId: string,
    endpointId: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse> {
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource) {
      return {
        success: false,
        error: {
          code: 'DATA_SOURCE_NOT_FOUND',
          message: `Data source ${dataSourceId} not found`
        }
      };
    }

    const endpoint = dataSource.endpoints.find(e => e.id === endpointId);
    if (!endpoint) {
      return {
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Endpoint ${endpointId} not found in data source ${dataSourceId}`
        }
      };
    }

    const client = this.apiClients.get(dataSourceId);
    if (!client) {
      return {
        success: false,
        error: {
          code: 'API_CLIENT_NOT_FOUND',
          message: `API client for ${dataSourceId} not initialized`
        }
      };
    }

    try {
      const config: AxiosRequestConfig = {
        method: endpoint.method,
        url: endpoint.path,
        params: { ...endpoint.parameters, ...params }
      };

      const response = await client.request(config);
      
      return {
        success: true,
        data: response.data,
        metadata: {
          source: dataSourceId,
          timestamp: new Date(),
          requestId: this.generateRequestId(),
          rateLimit: this.getRateLimitInfo(dataSourceId)
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || 'UNKNOWN_ERROR',
          message: error.message || 'Unknown error occurred',
          details: error.response?.data
        },
        metadata: {
          source: dataSourceId,
          timestamp: new Date(),
          requestId: this.generateRequestId()
        }
      };
    }
  }

  /**
   * Get all active data sources
   */
  async getActiveDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSources.values()).filter(source => source.is_active);
  }

  /**
   * Get specific data source
   */
  async getDataSource(dataSourceId: string): Promise<DataSource | null> {
    return this.dataSources.get(dataSourceId) || null;
  }

  /**
   * Check rate limit for a data source
   */
  private async checkRateLimit(dataSourceId: string): Promise<void> {
    const rateLimiter = this.rateLimiters.get(dataSourceId);
    if (rateLimiter) {
      await rateLimiter.checkLimit();
    }
  }

  /**
   * Get rate limit information
   */
  private getRateLimitInfo(dataSourceId: string): { remaining: number; resetTime: Date } | undefined {
    const rateLimiter = this.rateLimiters.get(dataSourceId);
    return rateLimiter?.getInfo();
  }

  /**
   * Handle API errors and update health status
   */
  private handleApiError(dataSourceId: string, error: any): void {
    let status: 'healthy' | 'degraded' | 'down' = 'degraded';
    const issues: HealthIssue[] = [];

    if (error.response?.status === 429) {
      status = 'degraded';
      issues.push({
        type: 'rate_limit',
        severity: 'medium',
        message: 'Rate limit exceeded',
        timestamp: new Date(),
        resolved: false
      });
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      status = 'down';
      issues.push({
        type: 'authentication',
        severity: 'high',
        message: 'Authentication failed',
        timestamp: new Date(),
        resolved: false
      });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      status = 'down';
      issues.push({
        type: 'connectivity',
        severity: 'critical',
        message: 'Connection failed',
        timestamp: new Date(),
        resolved: false
      });
    }

    this.updateHealthStatus(dataSourceId, status, error.config?.url || '', issues);
  }

  /**
   * Update health status for a data source
   */
  private updateHealthStatus(
    dataSourceId: string,
    status: 'healthy' | 'degraded' | 'down',
    endpoint: string,
    issues: HealthIssue[] = []
  ): void {
    const currentHealth = this.healthStatus.get(dataSourceId) || {
      sourceId: dataSourceId,
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
      uptime: 0,
      issues: []
    };

    const updatedHealth: DataSourceHealth = {
      ...currentHealth,
      status,
      lastCheck: new Date(),
      issues: [...currentHealth.issues, ...issues]
    };

    this.healthStatus.set(dataSourceId, updatedHealth);
    this.emit('healthStatusChanged', dataSourceId, updatedHealth);
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    // Check health every 5 minutes
    setInterval(async () => {
      await this.performHealthChecks();
    }, 5 * 60 * 1000);
  }

  /**
   * Perform health checks on all data sources
   */
  private async performHealthChecks(): Promise<void> {
    for (const [sourceId, dataSource] of this.dataSources) {
      if (!dataSource.is_active) continue;

      try {
        const client = this.apiClients.get(sourceId);
        if (!client) continue;

        const startTime = Date.now();
        await client.get('/health', { timeout: 10000 });
        const responseTime = Date.now() - startTime;

        this.updateHealthStatus(sourceId, 'healthy', '/health');
        
        // Update response time in health status
        const health = this.healthStatus.get(sourceId);
        if (health) {
          health.responseTime = responseTime;
          this.healthStatus.set(sourceId, health);
        }

      } catch (error) {
        this.handleApiError(sourceId, error);
      }
    }
  }

  /**
   * Get health status for all data sources
   */
  getHealthStatus(): Map<string, DataSourceHealth> {
    return this.healthStatus;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Transform raw API data to standardized format
   */
  async transformBillData(rawData: any, sourceId: string): Promise<BillData> {
    // This would contain source-specific transformation logic
    // For now, returning a basic transformation
    return {
      bill_number: rawData.number || rawData.bill_number || 'Unknown',
      title: rawData.title || 'Untitled Bill',
      summary: rawData.summary || rawData.short_title,
      content: rawData.text || rawData.full_text,
      status: rawData.status || 'unknown',
      introduced_date: new Date(rawData.introduced_date || rawData.date_introduced || Date.now()),
      last_action_date: rawData.last_action_date ? new Date(rawData.last_action_date) : undefined,
      sponsors: rawData.sponsors || [],
      committees: rawData.committees || [],
      votes: rawData.votes || [],
      amendments: rawData.amendments || [],
      tags: rawData.tags || [],
      sourceUrl: rawData.url || rawData.source_url,
      sourceId
    };
  }

  /**
   * Transform raw sponsor data to standardized format
   */
  async transformSponsorData(rawData: any, sourceId: string): Promise<SponsorData> {
    return {
      id: rawData.id || rawData.member_id || 'unknown',
      name: rawData.name || `${rawData.first_name} ${rawData.last_name}`,
      party: rawData.party,
      state: rawData.state,
      district: rawData.district,
      role: rawData.role || 'primary',
      sponsorshipDate: new Date(rawData.sponsorship_date || Date.now())
    };
  }
}

/**
 * Rate Limiter class for API requests
 */
class RateLimiter {
  private requests: number = 0;
  private resetTime: Date;
  private rateLimit: { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number };

  constructor(rateLimit: { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number }) {
    this.rateLimit = rateLimit;
    this.resetTime = new Date(Date.now() + 60000); // Reset every minute
  }

  async checkLimit(): Promise<void> {
    const now = new Date();
    
    // Reset counter if time has passed
    if (now >= this.resetTime) {
      this.requests = 0;
      this.resetTime = new Date(now.getTime() + 60000);
    }

    // Check if we've exceeded the limit
    if (this.requests >= this.rateLimit.requestsPerMinute) {
      const waitTime = this.resetTime.getTime() - now.getTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requests = 0;
      this.resetTime = new Date(Date.now() + 60000);
    }

    this.requests++;
  }

  getInfo(): { remaining: number; resetTime: Date } {
    return {
      remaining: Math.max(0, this.rateLimit.requestsPerMinute - this.requests),
      resetTime: this.resetTime
    };
  }
}












































