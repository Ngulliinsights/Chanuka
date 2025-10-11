import { GovernmentDataIntegrationService } from './government-data-integration.js';
import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '../infrastructure/external-data/external-api-manager.js';
import { ExternalAPIErrorHandler } from './external-api-error-handler.js';
import { logger } from '../utils/logger';

/**
 * Enhanced Government Data Integration Service with full API management
 * This service wraps the existing GovernmentDataIntegrationService with
 * comprehensive API management capabilities including rate limiting,
 * health monitoring, caching, and usage analytics.
 */
export class ManagedGovernmentDataIntegrationService extends GovernmentDataIntegrationService {
  private apiManager: ExternalAPIManagementService;
  private errorHandler: ExternalAPIErrorHandler;

  constructor() {
    super();
    this.apiManager = new ExternalAPIManagementService();
    this.errorHandler = new ExternalAPIErrorHandler();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for API management events
   */
  private setupEventListeners(): void {
    // Listen for health status changes
    this.apiManager.on('healthStatusChange', ({ source, status, responseTime }) => {
      console.log(`API Health Status Change: ${source} is now ${status} (${responseTime}ms)`);
      
      if (status === 'down') {
        console.warn(`⚠️  API source ${source} is down - switching to fallback strategies`);
      } else if (status === 'healthy') {
        console.log(`✅ API source ${source} is healthy again`);
      }
    });

    // Listen for downtime events
    this.apiManager.on('downtimeEvent', ({ source, reason, severity }) => {
      console.error(`🚨 Downtime Event: ${source} - ${reason} (${severity})`);
    });

    // Listen for cache events
    this.apiManager.on('cacheHit', ({ source, endpoint, hits }) => {
      console.log(`💾 Cache hit for ${source}${endpoint} (${hits} total hits)`);
    });

    this.apiManager.on('cacheSet', ({ source, endpoint, size }) => {
      console.log(`💾 Cached response for ${source}${endpoint} (${size} bytes)`);
    });

    // Listen for error handler events
    this.errorHandler.on('error', (error) => {
      console.error(`🔥 External API Error: ${error.source} - ${error.type}: ${error.message}`);
    });

    this.errorHandler.on('retry', async ({ source, error, context, resolve }) => {
      try {
        console.log(`🔄 Retrying request to ${source} (attempt ${error.retryCount})`);
        
        // Attempt to retry the original request
        const result = await this.retryOriginalRequest(source, context);
        resolve({ success: true, data: result });
      } catch (retryError) {
        const err = retryError instanceof Error ? retryError : new Error(String(retryError));
        console.error(`❌ Retry failed for ${source}:`, err.message);
        resolve({ success: false });
      }
    });
  }

  /**
   * Enhanced bill fetching with full API management
   */
  async fetchBillsFromSource(sourceName: string, options: {
    limit?: number;
    offset?: number;
    since?: Date;
    status?: string[];
  } = {}): Promise<any[]> {
    const endpoint = this.buildBillsEndpoint(options);
    
    try {
      const result = await this.apiManager.makeRequest(sourceName, endpoint, {
        method: 'GET',
        priority: 'normal'
      });

      if (result.success) {
        console.log(`✅ Successfully fetched bills from ${sourceName} (cached: ${result.cached}, ${result.responseTime}ms)`);
        return this.parseBillsData(result.data, sourceName);
      } else {
        console.error(`❌ Failed to fetch bills from ${sourceName}:`, result.error);
        throw new Error(result.error?.message || 'Unknown API error');
      }
    } catch (error) {
      console.error(`🔥 Error fetching bills from ${sourceName}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced sponsor fetching with full API management
   */
  async fetchSponsorsFromSource(sourceName: string, options: {
    limit?: number;
    offset?: number;
    since?: Date;
  } = {}): Promise<any[]> {
    const endpoint = this.buildSponsorsEndpoint(options);
    
    try {
      const result = await this.apiManager.makeRequest(sourceName, endpoint, {
        method: 'GET',
        priority: 'normal'
      });

      if (result.success) {
        console.log(`✅ Successfully fetched sponsors from ${sourceName} (cached: ${result.cached}, ${result.responseTime}ms)`);
        return this.parseSponsorsData(result.data, sourceName);
      } else {
        console.error(`❌ Failed to fetch sponsors from ${sourceName}:`, result.error);
        throw new Error(result.error?.message || 'Unknown API error');
      }
    } catch (error) {
      console.error(`🔥 Error fetching sponsors from ${sourceName}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced integration with comprehensive monitoring and analytics
   */
  async integrateBills(options: {
    sources?: string[];
    since?: Date;
    dryRun?: boolean;
  } = {}): Promise<any> {
    const startTime = Date.now();
    logger.info('🚀 Starting managed bill integration with API management...', { component: 'SimpleTool' });

    try {
      // Get initial API health status
      const healthStatuses = this.apiManager.getHealthStatus();
      const healthySources = healthStatuses.filter(h => h.status === 'healthy').map(h => h.source);
      
      console.log(`📊 API Health Status: ${healthySources.length}/${healthStatuses.length} sources healthy`);

      // Filter sources to only include healthy ones (unless specifically requested)
      const requestedSources = options.sources || healthySources;
      const sourcesToProcess = requestedSources.filter(source => 
        healthySources.includes(source) || options.sources?.includes(source)
      );

      if (sourcesToProcess.length === 0) {
        throw new Error('No healthy API sources available for integration');
      }

      console.log(`🎯 Processing sources: ${sourcesToProcess.join(', ')}`);

      // Call the parent integration method with managed sources
      const result = await super.integrateBills({
        ...options,
        sources: sourcesToProcess
      });

      // Get post-integration analytics
      const analytics = this.apiManager.getAPIAnalytics();
      const processingTime = Date.now() - startTime;

      console.log(`✅ Integration completed in ${processingTime}ms`);
      console.log(`📈 API Usage: ${analytics.totalRequests} requests, ${analytics.totalCost.toFixed(4)} cost`);
      console.log(`⚡ Performance: ${analytics.averageResponseTime.toFixed(0)}ms avg response, ${analytics.overallSuccessRate.toFixed(1)}% success rate`);
      console.log(`💾 Cache: ${analytics.cacheHitRate.toFixed(1)}% hit rate`);

      // Enhanced result with API management metrics
      return {
        ...result,
        apiMetrics: {
          totalRequests: analytics.totalRequests,
          totalCost: analytics.totalCost,
          averageResponseTime: analytics.averageResponseTime,
          successRate: analytics.overallSuccessRate,
          cacheHitRate: analytics.cacheHitRate,
          sourcesUsed: sourcesToProcess,
          healthySources: healthySources.length,
          totalSources: healthStatuses.length
        },
        processingTime
      };

    } catch (error) {
      logger.error('🔥 Managed integration failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Enhanced sponsor integration with API management
   */
  async integrateSponsors(options: {
    sources?: string[];
    since?: Date;
    dryRun?: boolean;
  } = {}): Promise<any> {
    const startTime = Date.now();
    logger.info('🚀 Starting managed sponsor integration with API management...', { component: 'SimpleTool' });

    try {
      // Get initial API health status
      const healthStatuses = this.apiManager.getHealthStatus();
      const healthySources = healthStatuses.filter(h => h.status === 'healthy').map(h => h.source);
      
      console.log(`📊 API Health Status: ${healthySources.length}/${healthStatuses.length} sources healthy`);

      // Filter sources to only include healthy ones
      const requestedSources = options.sources || healthySources;
      const sourcesToProcess = requestedSources.filter(source => 
        healthySources.includes(source) || options.sources?.includes(source)
      );

      if (sourcesToProcess.length === 0) {
        throw new Error('No healthy API sources available for sponsor integration');
      }

      console.log(`🎯 Processing sources: ${sourcesToProcess.join(', ')}`);

      // Call the parent integration method with managed sources
      const result = await super.integrateSponsors({
        ...options,
        sources: sourcesToProcess
      });

      // Get post-integration analytics
      const analytics = this.apiManager.getAPIAnalytics();
      const processingTime = Date.now() - startTime;

      console.log(`✅ Sponsor integration completed in ${processingTime}ms`);
      console.log(`📈 API Usage: ${analytics.totalRequests} requests, ${analytics.totalCost.toFixed(4)} cost`);

      // Enhanced result with API management metrics
      return {
        ...result,
        apiMetrics: {
          totalRequests: analytics.totalRequests,
          totalCost: analytics.totalCost,
          averageResponseTime: analytics.averageResponseTime,
          successRate: analytics.overallSuccessRate,
          cacheHitRate: analytics.cacheHitRate,
          sourcesUsed: sourcesToProcess,
          healthySources: healthySources.length,
          totalSources: healthStatuses.length
        },
        processingTime
      };

    } catch (error) {
      logger.error('🔥 Managed sponsor integration failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Get comprehensive integration status with API management metrics
   */
  async getIntegrationStatus(): Promise<any> {
    const baseStatus = await super.getIntegrationStatus();
    const apiAnalytics = this.apiManager.getAPIAnalytics();
    const healthStatuses = this.apiManager.getHealthStatus();
    const cacheStats = this.apiManager.getCacheStatistics();

    return {
      ...baseStatus,
      apiManagement: {
        totalRequests: apiAnalytics.totalRequests,
        totalCost: apiAnalytics.totalCost,
        averageResponseTime: apiAnalytics.averageResponseTime,
        successRate: apiAnalytics.overallSuccessRate,
        cacheHitRate: apiAnalytics.cacheHitRate,
        healthySources: healthStatuses.filter(h => h.status === 'healthy').length,
        totalSources: healthStatuses.length,
        cacheEntries: cacheStats.totalEntries,
        cacheSize: cacheStats.totalSize,
        quotaUtilization: apiAnalytics.sources.map(s => ({
          source: s.source,
          utilization: Math.max(...Object.values(s.quotaUtilization))
        }))
      },
      sources: healthStatuses.map(health => {
        const sourceMetrics = apiAnalytics.sources.find(s => s.source === health.source);
        const baseSource = baseStatus.sources.find((s: any) => s.name === health.source);
        
        return {
          ...baseSource,
          health: {
            status: health.status,
            responseTime: health.responseTime,
            successRate: health.successRate,
            errorRate: health.errorRate,
            uptime: health.uptime,
            lastChecked: health.lastChecked
          },
          usage: sourceMetrics ? {
            totalRequests: sourceMetrics.totalRequests,
            successfulRequests: sourceMetrics.successfulRequests,
            failedRequests: sourceMetrics.failedRequests,
            averageResponseTime: sourceMetrics.averageResponseTime,
            totalCost: sourceMetrics.totalCost,
            quotaUtilization: sourceMetrics.quotaUtilization
          } : null
        };
      })
    };
  }

  /**
   * Build bills endpoint with parameters
   */
  private buildBillsEndpoint(options: any): string {
    let endpoint = '/bills';
    const params = new URLSearchParams();

    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.since) params.append('since', options.since.toISOString());
    if (options.status) params.append('status', options.status.join(','));

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return endpoint;
  }

  /**
   * Build sponsors endpoint with parameters
   */
  private buildSponsorsEndpoint(options: any): string {
    let endpoint = '/sponsors';
    const params = new URLSearchParams();

    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.since) params.append('since', options.since.toISOString());

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    return endpoint;
  }

  /**
   * Retry original request (used by error handler)
   */
  private async retryOriginalRequest(source: string, context: any): Promise<any> {
    const { endpoint, options } = context;
    
    const result = await this.apiManager.makeRequest(source, endpoint, {
      ...options,
      bypassCache: true, // Bypass cache on retry
      priority: 'high'
    });

    if (!result.success) {
      throw new Error(result.error?.message || 'Retry failed');
    }

    return result.data;
  }

  /**
   * Get API management service instance
   */
  getAPIManager(): ExternalAPIManagementService {
    return this.apiManager;
  }

  /**
   * Get error handler instance
   */
  getErrorHandler(): ExternalAPIErrorHandler {
    return this.errorHandler;
  }

  /**
   * Shutdown the service and clean up resources
   */
  shutdown(): void {
    this.apiManager.shutdown();
    logger.info('🛑 Managed Government Data Integration Service shut down', { component: 'SimpleTool' });
  }
}






