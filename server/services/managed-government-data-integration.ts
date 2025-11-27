import { GovernmentDataIntegrationService } from '@shared/infrastructure/external-data/government-data-integration.js';
import { UnifiedExternalAPIManagementService as ExternalAPIManagementService } from '@shared/infrastructure/external-data/external-api-manager.js';
import { ExternalAPIErrorHandler } from './external-api-error-handler.js';
import { logger   } from '@shared/core/index.js';
import { z } from 'zod';

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
  override async fetchBillsFromSource(sourceName: string, options: {
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
  override async fetchSponsorsFromSource(sourceName: string, options: {
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
  override async integrateBills(options: {
    sources?: string[];
    since?: Date;
    dryRun?: boolean;
  } = {}): Promise<any> {
    const startTime = Date.now();
    logger.info('🚀 Starting managed bill integration with API management...', { component: 'Chanuka' });

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
      logger.error('🔥 Managed integration failed:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Enhanced sponsor integration with API management
   */
  override async integrateSponsors(options: {
    sources?: string[];
    since?: Date;
    dryRun?: boolean;
  } = {}): Promise<any> {
    const startTime = Date.now();
    logger.info('🚀 Starting managed sponsor integration with API management...', { component: 'Chanuka' });

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
      logger.error('🔥 Managed sponsor integration failed:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Get comprehensive integration status with API management metrics
   */
  override async getIntegrationStatus(): Promise<any> {
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
            last_checked: health.last_checked
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
    logger.info('🛑 Managed Government Data Integration Service shut down', { component: 'Chanuka' });
  }

  // Data transformation pipeline for different government data formats
  static transformParliamentData(rawData: any): any {
    if (!rawData) return null;

    // Handle different XML/JSON structures from Parliament API
    if (rawData.Bills && rawData.Bills.Bill) {
      return {
        bills: Array.isArray(rawData.Bills.Bill)
          ? rawData.Bills.Bill.map(this.transformParliamentBill)
          : [this.transformParliamentBill(rawData.Bills.Bill)]
      };
    }

    if (rawData.Members && rawData.Members.Member) {
      return {
        sponsors: Array.isArray(rawData.Members.Member)
          ? rawData.Members.Member.map(this.transformParliamentMember)
          : [this.transformParliamentMember(rawData.Members.Member)]
      };
    }

    return rawData;
  }

  /**
   * Transform individual Parliament bill data
   */
  private static transformParliamentBill(bill: any): any {
    return {
      id: bill.BillId || bill.id,
      title: bill.Title || bill.LongTitle || bill.title,
      description: bill.Summary || bill.description,
      content: bill.FullText || bill.content,
      summary: bill.ShortSummary || bill.Summary || bill.summary,
      status: this.mapParliamentStatus(bill.Status || bill.status),
      bill_number: bill.Number || bill.BillNumber || bill.bill_number,
      introduced_date: bill.IntroducedDate || bill.introduced_date,
      last_action_date: bill.LastActionDate || bill.last_action_date,
      sponsors: this.extractParliamentSponsors(bill),
      category: bill.Subject || bill.category,
      tags: this.extractTags(bill.Keywords || bill.tags),
      source: 'parliament-ca',
      sourceUrl: bill.Url || bill.url,
      lastUpdated: bill.LastModified || bill.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform individual Parliament member data
   */
  private static transformParliamentMember(member: any): any {
    return {
      id: member.PersonId || member.id,
      name: `${member.FirstName || ''} ${member.LastName || ''}`.trim() || member.name,
      role: member.Title || member.role || 'MP',
      party: member.Party || member.party,
      constituency: member.Constituency || member.constituency,
      email: member.Email || member.email,
      phone: member.Phone || member.phone,
      bio: member.Biography || member.bio,
      photo_url: member.PhotoUrl || member.photo_url,
      affiliations: this.extractAffiliations(member),
      source: 'parliament-ca',
      sourceUrl: member.Url || member.url,
      lastUpdated: member.LastModified || member.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform Senate of Kenya data format
   */
  static transformSenateKenyaData(rawData: any): any {
    if (!rawData) return null;

    // Handle Senate of Kenya HTML/JSON format
    if (rawData.bills) {
      return {
        bills: rawData.bills.map(this.transformSenateKenyaBill)
      };
    }

    if (rawData.members) {
      return {
        sponsors: rawData.members.map(this.transformSenateKenyaMember)
      };
    }

    return rawData;
  }

  /**
   * Transform individual Senate of Kenya bill data
   */
  private static transformSenateKenyaBill(bill: any): any {
    return {
      id: bill.bill_id || bill.id,
      title: bill.title || bill.long_title,
      description: bill.summary || bill.description,
      content: bill.full_text || bill.content,
      summary: bill.short_summary || bill.summary,
      status: this.mapSenateKenyaStatus(bill.status),
      bill_number: bill.bill_number || bill.number,
      introduced_date: bill.introduced_date,
      last_action_date: bill.last_action_date,
      sponsors: this.extractSenateKenyaSponsors(bill),
      category: bill.ministry || bill.category,
      tags: this.extractTags(bill.keywords),
      source: 'senate-ke',
      sourceUrl: bill.url,
      lastUpdated: bill.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform individual Senate of Kenya member data
   */
  private static transformSenateKenyaMember(member: any): any {
    return {
      id: member.member_id || member.id,
      name: member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      role: member.title || 'MPP',
      party: member.party,
      constituency: member.riding || member.constituency,
      email: member.email,
      phone: member.phone,
      bio: member.biography,
      photo_url: member.photo_url,
      affiliations: this.extractAffiliations(member),
      source: 'senate-ke',
      sourceUrl: member.url,
      lastUpdated: member.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform County Assemblies data format
   */
  static transformCountyAssembliesData(rawData: any): any {
    if (!rawData) return null;

    // Handle County Assemblies API format
    if (rawData.objects) {
      // Determine if this is bills or politicians data
      if (rawData.objects[0] && rawData.objects[0].number) {
        return {
          bills: rawData.objects.map(this.transformCountyAssemblyBill)
        };
      } else if (rawData.objects[0] && rawData.objects[0].name) {
        return {
          sponsors: rawData.objects.map(this.transformCountyAssemblyMember)
        };
      }
    }

    return rawData;
  }

  /**
   * Transform individual County Assembly bill data
   */
  private static transformCountyAssemblyBill(bill: any): any {
    return {
      id: bill.id,
      title: bill.name || bill.title,
      description: bill.summary,
      content: bill.text,
      summary: bill.summary,
      status: this.mapCountyAssemblyStatus(bill.status),
      bill_number: bill.number,
      introduced_date: bill.introduced,
      last_action_date: bill.last_action_date,
      sponsors: bill.sponsor_politician ? [{
        id: bill.sponsor_politician.id,
        name: bill.sponsor_politician.name,
        role: 'MP',
        party: bill.sponsor_politician.party,
        sponsorshipType: 'primary'
      }] : [],
      category: bill.law_type,
      tags: this.extractTags(bill.keywords),
      source: 'county-assemblies',
      sourceUrl: `https://cog.go.ke${bill.url}`,
      lastUpdated: bill.updated || new Date().toISOString()
    };
  }

  /**
   * Transform individual County Assembly member data
   */
  private static transformCountyAssemblyMember(politician: any): any {
    return {
      id: politician.id,
      name: politician.name,
      role: 'MP',
      party: politician.party,
      constituency: politician.riding,
      email: politician.email,
      phone: politician.phone,
      bio: politician.description,
      photo_url: politician.photo_url,
      affiliations: [],
      source: 'county-assemblies',
      sourceUrl: `https://cog.go.ke${politician.url}`,
      lastUpdated: politician.updated || new Date().toISOString()
    };
  }

  /**
   * Map Parliament status to normalized status
   */
  private static mapParliamentStatus(status: string): string {
    if (!status) return 'introduced';

    const statusMap: Record<string, string> = {
      'First Reading': 'introduced',
      'Second Reading': 'committee',
      'Committee Stage': 'committee',
      'Report Stage': 'committee',
      'Third Reading': 'passed',
      'Royal Assent': 'signed',
      'In Force': 'signed',
      'Defeated': 'failed',
      'Withdrawn': 'failed',
      'Prorogued': 'failed'
    };

    return statusMap[status] || status.toLowerCase();
  }

  /**
   * Map Senate of Kenya status to normalized status
   */
  private static mapSenateKenyaStatus(status: string): string {
    if (!status) return 'introduced';

    const statusMap: Record<string, string> = {
      'Introduced': 'introduced',
      'First Reading': 'introduced',
      'Second Reading': 'committee',
      'Committee': 'committee',
      'Third Reading': 'passed',
      'Royal Assent': 'signed',
      'Proclamation': 'signed',
      'Defeated': 'failed',
      'Withdrawn': 'failed'
    };

    return statusMap[status] || status.toLowerCase();
  }

  /**
   * Map County Assembly status to normalized status
   */
  private static mapCountyAssemblyStatus(status: string): string {
    if (!status) return 'introduced';

    const statusMap: Record<string, string> = {
      'Introduced': 'introduced',
      'First reading': 'introduced',
      'Second reading': 'committee',
      'Committee': 'committee',
      'Third reading': 'passed',
      'Royal assent': 'signed',
      'Defeated': 'failed',
      'Withdrawn': 'failed'
    };

    return statusMap[status] || status.toLowerCase();
  }

  /**
   * Extract sponsors from Parliament bill data
   */
  private static extractParliamentSponsors(bill: any): any[] {
    const sponsors: any[] = [];

    if (bill.SponsorMember) {
      sponsors.push({
        id: bill.SponsorMember.PersonId,
        name: `${bill.SponsorMember.FirstName} ${bill.SponsorMember.LastName}`,
        role: 'MP',
        party: bill.SponsorMember.Party,
        sponsorshipType: 'primary'
      });
    }

    if (bill.CoSponsors && Array.isArray(bill.CoSponsors)) {
      sponsors.push(...bill.CoSponsors.map((cosponsor: any) => ({
        id: cosponsor.PersonId,
        name: `${cosponsor.FirstName} ${cosponsor.LastName}`,
        role: 'MP',
        party: cosponsor.Party,
        sponsorshipType: 'co-sponsor'
      })));
    }

    return sponsors;
  }

  /**
   * Extract sponsors from Senate of Kenya bill data
   */
  private static extractSenateKenyaSponsors(bill: any): any[] {
    const sponsors: any[] = [];

    if (bill.sponsor) {
      sponsors.push({
        id: bill.sponsor.id,
        name: bill.sponsor.name,
        role: 'MPP',
        party: bill.sponsor.party,
        sponsorshipType: 'primary'
      });
    }

    return sponsors;
  }

  /**
   * Extract affiliations from member data
   */
  private static extractAffiliations(member: any): any[] {
    const affiliations: any[] = [];

    // Extract party affiliation
    if (member.Party || member.party) {
      affiliations.push({
        organization: member.Party || member.party,
        role: 'Member',
        type: 'political',
        start_date: member.PartyStartDate || member.party_start_date,
        end_date: member.PartyEndDate || member.party_end_date
      });
    }

    // Extract committee memberships
    if (member.Committees && Array.isArray(member.Committees)) {
      affiliations.push(...member.Committees.map((committee: any) => ({
        organization: committee.Name || committee.name,
        role: committee.Role || committee.role || 'Member',
        type: 'professional',
        start_date: committee.StartDate || committee.start_date,
        end_date: committee.EndDate || committee.end_date
      })));
    }

    // Extract other affiliations
    if (member.Affiliations && Array.isArray(member.Affiliations)) {
      affiliations.push(...member.Affiliations.map((affiliation: any) => ({
        organization: affiliation.Organization || affiliation.organization,
        role: affiliation.Role || affiliation.role,
        type: affiliation.Type || affiliation.type || 'professional',
        start_date: affiliation.StartDate || affiliation.start_date,
        end_date: affiliation.EndDate || affiliation.end_date
      })));
    }

    return affiliations;
  }

  /**
   * Extract and normalize tags
   */
  private static extractTags(tags: any): string[] {
    if (!tags) return [];

    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    if (Array.isArray(tags)) {
      return tags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag).trim())
                  .filter(tag => tag.length > 0);
    }

    return [];
  }

  /**
   * Validate transformed data against schema
   */
  static validateTransformedData(data: any, type: 'bills' | 'sponsors'): {
    valid: boolean;
    errors: string[];
    validRecords: any[];
    invalidRecords: any[];
  } {
    const result: {
      valid: boolean;
      errors: string[];
      validRecords: any[];
      invalidRecords: any[];
    } = {
      valid: true,
      errors: [],
      validRecords: [],
      invalidRecords: []
    };

    if (!data || (!data.bills && !data.sponsors)) {
      result.valid = false;
      result.errors.push('No data provided or invalid data structure');
      return result;
    }

    const records = type === 'bills' ? data.bills : data.sponsors;
    if (!Array.isArray(records)) {
      result.valid = false;
      result.errors.push(`Expected array of ${type}, got ${typeof records}`);
      return result;
    }

    // Define validation schemas
    const BillSchema = z.object({
      id: z.string(),
      title: z.string().min(1),
      bill_number: z.string().min(1),
      status: z.string().min(1),
      source: z.string().min(1)
    });

    const SponsorSchema = z.object({
      id: z.string(),
      name: z.string().min(1),
      role: z.string().min(1),
      source: z.string().min(1)
    });

    const schema = type === 'bills' ? BillSchema : SponsorSchema;

    for (const record of records) {
      try {
        schema.parse(record);
        result.validRecords.push(record);
      } catch (error) {
        result.valid = false;
        result.invalidRecords.push(record);
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Invalid ${type.slice(0, -1)} record: ${errorMessage}`);
      }
    }

    return result;
  }

  /**
   * Clean and normalize text data
   */
  static cleanTextData(text: string): string {
    if (!text || typeof text !== 'string') return '';

    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[\r\n]+/g, '\n') // Normalize line breaks
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Normalize date strings to ISO format
   */
  static normalizeDate(dateString: string): string | null {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract and normalize phone numbers
   */
  static normalizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') return null;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Kenyan phone number format
    if (digits.length === 9) {
      return `+254-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 10 && digits.startsWith('0')) {
      return `+254-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    return phone; // Return original if can't normalize
  }

  /**
   * Extract and validate email addresses
   */
  static normalizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();

    return emailRegex.test(normalizedEmail) ? normalizedEmail : null;
  }
}

// This service now serves as the unified GovernmentDataIntegrationService
// The original GovernmentDataIntegrationService should be deprecated in favor of this managed version













































