import { logger   } from '@shared/core';

import { GovernmentDataService } from '@/infrastructure/external-data/government-data-service.js';
import { ApiResponse, BillData, DataSource, SponsorData } from '@/infrastructure/external-data/types.js';

export interface UserGovernmentDataQuery { user_id: string;
  queryType: 'bill_search' | 'sponsor_lookup' | 'legislative_tracking' | 'committee_info';
  parameters: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
 }

export interface UserGovernmentDataResult {
  success: boolean;
  data?: any;
  error?: string;
  source?: string;
  cached?: boolean;
  timestamp: Date;
}

/**
 * User Government Data Service
 *
 * Provides user-specific access to government data including:
 * - Bill tracking and status updates
 * - Sponsor information lookup
 * - Legislative data queries
 * - User-specific data caching and rate limiting
 * - Privacy-compliant data access
 */
export class UserGovernmentDataService {
  private governmentDataService: GovernmentDataService;
  private userQueryCache: Map<string, { result: UserGovernmentDataResult; expires: Date }> = new Map();

  constructor() {
    this.governmentDataService = new GovernmentDataService();
    logger.info('✅ User Government Data Service initialized');
  }

  /**
   * Query government data for a specific user
   */
  async queryGovernmentData(query: UserGovernmentDataQuery): Promise<UserGovernmentDataResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        logger.debug(`📋 Using cached government data for user ${query.user_id}`);
        return cached;
      }

      // Execute query based on type
      let result: UserGovernmentDataResult;

      switch (query.queryType) {
        case 'bill_search':
          result = await this.searchBills(query);
          break;
        case 'sponsor_lookup':
          result = await this.lookupSponsor(query);
          break;
        case 'legislative_tracking':
          result = await this.trackLegislation(query);
          break;
        case 'committee_info':
          result = await this.getCommitteeInfo(query);
          break;
        default:
          throw new Error(`Unsupported query type: ${query.queryType}`);
      }

      // Cache successful results
      if (result.success && result.data) {
        this.cacheResult(cacheKey, result);
      }

      logger.info(`📊 Government data query completed for user ${query.user_id}: ${query.queryType}`);
      return result;

    } catch (error) {
      logger.error(`❌ Government data query failed for user ${query.user_id}`, { error, query });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Search for bills based on user criteria
   */
  private async searchBills(query: UserGovernmentDataQuery): Promise<UserGovernmentDataResult> {
    const { parameters } = query;
    const dataSourceId = parameters.dataSource || 'congress.gov';

    try {
      const response: ApiResponse = await this.governmentDataService.fetchData(
        dataSourceId,
        'bills',
        {
          query: parameters.query,
          category: parameters.category,
          congress: parameters.congress,
          limit: parameters.limit || 20,
          offset: parameters.offset || 0
        }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Bill search failed',
          timestamp: new Date()
        };
      }

      // Transform and filter results for user
      const bills = await this.transformBillResults(response.data, dataSourceId);

      return {
        success: true,
        data: {
          bills,
          total: bills.length,
          query: parameters.query,
          filters: {
            category: parameters.category,
            congress: parameters.congress
          }
        },
        source: dataSourceId,
        cached: false,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bill search failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Look up sponsor information
   */
  private async lookupSponsor(query: UserGovernmentDataQuery): Promise<UserGovernmentDataResult> {
    const { parameters } = query;
    const dataSourceId = parameters.dataSource || 'congress.gov';

    try {
      const response: ApiResponse = await this.governmentDataService.fetchData(
        dataSourceId,
        'members',
        {
          memberId: parameters.memberId,
          name: parameters.name,
          state: parameters.state,
          party: parameters.party
        }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Sponsor lookup failed',
          timestamp: new Date()
        };
      }

      // Transform sponsor data
      const sponsors = await this.transformSponsorResults(response.data, dataSourceId);

      return {
        success: true,
        data: {
          sponsors,
          total: sponsors.length,
          query: parameters
        },
        source: dataSourceId,
        cached: false,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sponsor lookup failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Track legislation status
   */
  private async trackLegislation(query: UserGovernmentDataQuery): Promise<UserGovernmentDataResult> {
    const { parameters } = query;

    // Track multiple bills if provided
    const bill_ids = Array.isArray(parameters.bill_ids) ? parameters.bill_ids : [parameters.bill_id];

    try { const trackingResults = await Promise.allSettled(
        bill_ids.map(async (bill_id: string) => {
          const response = await this.governmentDataService.fetchData(
            parameters.dataSource || 'congress.gov',
            'bills',
            { bill_id  }
          );

          if (response.success) {
            return await this.governmentDataService.transformBillData(response.data, parameters.dataSource || 'congress.gov');
          }
          return null;
        })
      );

      const successful = trackingResults
        .filter((result): result is PromiseFulfilledResult<BillData | null> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(Boolean);

      return {
        success: true,
        data: {
          trackedBills: successful,
          total: successful.length,
          requested: bill_ids.length,
          failed: bill_ids.length - successful.length
        },
        source: parameters.dataSource || 'congress.gov',
        cached: false,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Legislation tracking failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get committee information
   */
  private async getCommitteeInfo(query: UserGovernmentDataQuery): Promise<UserGovernmentDataResult> {
    const { parameters } = query;

    try {
      // This would typically call a committee-specific endpoint
      // For now, we'll use a generic approach
      const response = await this.governmentDataService.fetchData(
        parameters.dataSource || 'congress.gov',
        'bills', // Using bills endpoint as committees are often associated with bills
        {
          committee: parameters.committeeCode,
          congress: parameters.congress
        }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Committee info lookup failed',
          timestamp: new Date()
        };
      }

      return {
        success: true,
        data: {
          committeeInfo: response.data,
          committeeCode: parameters.committeeCode,
          congress: parameters.congress
        },
        source: parameters.dataSource || 'congress.gov',
        cached: false,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Committee info lookup failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Transform bill search results
   */
  private async transformBillResults(rawData: any, sourceId: string): Promise<BillData[]> {
    if (!Array.isArray(rawData)) {
      rawData = [rawData];
    }

    const transformed = await Promise.all(
      rawData.map(item => this.governmentDataService.transformBillData(item, sourceId))
    );

    return transformed.filter(Boolean);
  }

  /**
   * Transform sponsor lookup results
   */
  private async transformSponsorResults(rawData: any, sourceId: string): Promise<SponsorData[]> {
    if (!Array.isArray(rawData)) {
      rawData = [rawData];
    }

    const transformed = await Promise.all(
      rawData.map(item => this.governmentDataService.transformSponsorData(item, sourceId))
    );

    return transformed.filter(Boolean);
  }

  /**
   * Generate cache key for user queries
   */
  private generateCacheKey(query: UserGovernmentDataQuery): string {
    const params = JSON.stringify(query.parameters);
    return `user_gov_data_${query.user_id}_${query.queryType}_${Buffer.from(params).toString('base64')}`;
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): UserGovernmentDataResult | null {
    const cached = this.userQueryCache.get(cacheKey);
    if (cached && cached.expires > new Date()) {
      return { ...cached.result, cached: true };
    }

    // Remove expired cache entry
    if (cached) {
      this.userQueryCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache query result
   */
  private cacheResult(cacheKey: string, result: UserGovernmentDataResult): void {
    // Cache for 5 minutes for user-specific queries
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    this.userQueryCache.set(cacheKey, { result, expires });

    // Clean up old cache entries periodically
    if (this.userQueryCache.size > 100) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    for (const [key, value] of this.userQueryCache.entries()) {
      if (value.expires <= now) {
        this.userQueryCache.delete(key);
      }
    }
  }

  /**
   * Get available data sources
   */
  async getAvailableDataSources(): Promise<DataSource[]> {
    return this.governmentDataService.getActiveDataSources();
  }

  /**
   * Get data source health status
   */
  getDataSourceHealth(): Map<string, any> {
    return this.governmentDataService.getHealthStatus();
  }

  /**
   * Clear user-specific cache
   */
  clearUserCache(user_id: string): void { const keysToDelete: string[] = [];
    for (const key of this.userQueryCache.keys()) {
      if (key.startsWith(`user_gov_data_${user_id }_`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.userQueryCache.delete(key));
    logger.info(`🧹 Cleared government data cache for user ${ user_id }`);
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; dataSourcesAvailable: number; cacheSize: number } {
    return {
      initialized: true,
      dataSourcesAvailable: this.governmentDataService.getHealthStatus().size,
      cacheSize: this.userQueryCache.size
    };
  }
}

// Export singleton instance
export const userGovernmentDataService = new UserGovernmentDataService();









































