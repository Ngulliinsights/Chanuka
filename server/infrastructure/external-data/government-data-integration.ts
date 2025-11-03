import { z } from 'zod';
import { database as db } from '@shared/database/connection';
import { bills, sponsors, bill_cosponsors, sponsors as sponsorAffiliations } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { logger  } from '../../../shared/core/src/index.js';

// Data source configuration
interface DataSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  timeout: number;
  retryAttempts: number;
  priority: number; // Higher number = higher priority for conflict resolution
}

// Government data schemas for validation
const GovernmentBillSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  status: z.string(),
  bill_number: z.string(),
  introduced_date: z.string().optional(),
  last_action_date: z.string().optional(),
  sponsors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    party: z.string().optional(),
    sponsorshipType: z.string()
  })).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  lastUpdated: z.string()
});

const GovernmentSponsorSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  party: z.string().optional(),
  constituency: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  photo_url: z.string().optional(),
  affiliations: z.array(z.object({
    organization: z.string(),
    role: z.string().optional(),
    type: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })).optional(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  lastUpdated: z.string()
});

type GovernmentBill = z.infer<typeof GovernmentBillSchema>;
type GovernmentSponsor = z.infer<typeof GovernmentSponsorSchema>;

// Data quality metrics
interface DataQualityMetrics {
  completeness: number; // 0-1 scale
  accuracy: number; // 0-1 scale
  timeliness: number; // 0-1 scale
  consistency: number; // 0-1 scale
  overall: number; // 0-1 scale
}

// Integration result
interface IntegrationResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  dataQuality: DataQualityMetrics;
  processingTime: number;
}

export class GovernmentDataIntegrationService {
  private dataSources: Map<string, DataSourceConfig> = new Map();
  private rateLimiters: Map<string, { requests: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeDataSources();
  }

  private initializeDataSources(): void {
    // Canadian Parliament API (example)
    this.dataSources.set('parliament-ca', {
      name: 'Parliament of Canada',
      baseUrl: 'https://www.ourcommons.ca/members/en/search/xml',
      rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
      timeout: 30000,
      retryAttempts: 3,
      priority: 10
    });

    // Provincial legislature APIs (example for Ontario)
    this.dataSources.set('ontario-legislature', {
      name: 'Ontario Legislature',
      baseUrl: 'https://www.ola.org/en/legislative-business/bills',
      rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
      timeout: 30000,
      retryAttempts: 3,
      priority: 8
    });

    // OpenParliament.ca API
    this.dataSources.set('openparliament', {
      name: 'OpenParliament.ca',
      baseUrl: 'https://openparliament.ca/api',
      rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
      timeout: 30000,
      retryAttempts: 3,
      priority: 7
    });
  }

  /**
   * Fetch bills from a specific government data source
   */
  async fetchBillsFromSource(sourceName: string, options: {
    limit?: number;
    offset?: number;
    since?: Date;
    status?: string[];
  } = {}): Promise<GovernmentBill[]> {
    const source = this.dataSources.get(sourceName);
    if (!source) {
      throw new Error(`Unknown data source: ${sourceName}`);
    }

    await this.checkRateLimit(sourceName);

    try {
      const url = this.buildBillsUrl(source, options);
      const response = await this.makeRequest(url, source);
      const rawData = await response.json();
      
      return this.parseBillsData(rawData, sourceName);
    } catch (error) {
      console.error(`Error fetching bills from ${sourceName}:`, error);
      throw error;
    }
  }

  /**
   * Fetch sponsors from a specific government data source
   */
  async fetchSponsorsFromSource(sourceName: string, options: {
    limit?: number;
    offset?: number;
    since?: Date;
  } = {}): Promise<GovernmentSponsor[]> {
    const source = this.dataSources.get(sourceName);
    if (!source) {
      throw new Error(`Unknown data source: ${sourceName}`);
    }

    await this.checkRateLimit(sourceName);

    try {
      const url = this.buildSponsorsUrl(source, options);
      const response = await this.makeRequest(url, source);
      const rawData = await response.json();
      
      return this.parseSponsorsData(rawData, sourceName);
    } catch (error) {
      console.error(`Error fetching sponsors from ${sourceName}:`, error);
      throw error;
    }
  }

  /**
   * Integrate bills from all configured sources
   */
  async integrateBills(options: {
    sources?: string[];
    since?: Date;
    dryRun?: boolean;
  } = {}): Promise<IntegrationResult> {
    const startTime = Date.now();
    const result: IntegrationResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: [],
      dataQuality: { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 },
      processingTime: 0
    };

    const sourcesToProcess = options.sources || Array.from(this.dataSources.keys());
    const allBills: GovernmentBill[] = [];

    // Fetch from all sources
    for (const sourceName of sourcesToProcess) {
      try {
        const bills = await this.fetchBillsFromSource(sourceName, {
          since: options.since,
          limit: 1000
        });
        allBills.push(...bills);
        result.recordsProcessed += bills.length;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors.push(`Failed to fetch from ${sourceName}: ${err.message}`);
        result.success = false;
      }
    }

    // Process and integrate bills
    for (const govBill of allBills) {
      try {
        const processResult = await this.processBill(govBill, options.dryRun);
        if (processResult.created) result.recordsCreated++;
        if (processResult.updated) result.recordsUpdated++;
        if (processResult.skipped) result.recordsSkipped++;
        if (processResult.warnings.length > 0) {
          result.warnings.push(...processResult.warnings);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors.push(`Failed to process bill ${govBill.bill_number}: ${err.message}`);
      }
    }

    // Calculate data quality metrics
    result.dataQuality = this.calculateDataQuality(allBills);
    result.processingTime = Date.now() - startTime;

    return result;
  }

  /**
   * Integrate sponsors from all configured sources
   */
  async integrateSponsors(options: {
    sources?: string[];
    since?: Date;
    dryRun?: boolean;
  } = {}): Promise<IntegrationResult> {
    const startTime = Date.now();
    const result: IntegrationResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: [],
      dataQuality: { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 },
      processingTime: 0
    };

    const sourcesToProcess = options.sources || Array.from(this.dataSources.keys());
    const allSponsors: GovernmentSponsor[] = [];

    // Fetch from all sources
    for (const sourceName of sourcesToProcess) {
      try {
        const sponsors = await this.fetchSponsorsFromSource(sourceName, {
          since: options.since,
          limit: 1000
        });
        allSponsors.push(...sponsors);
        result.recordsProcessed += sponsors.length;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors.push(`Failed to fetch sponsors from ${sourceName}: ${err.message}`);
        result.success = false;
      }
    }

    // Process and integrate sponsors
    for (const govSponsor of allSponsors) {
      try {
        const processResult = await this.processSponsor(govSponsor, options.dryRun);
        if (processResult.created) result.recordsCreated++;
        if (processResult.updated) result.recordsUpdated++;
        if (processResult.skipped) result.recordsSkipped++;
        if (processResult.warnings.length > 0) {
          result.warnings.push(...processResult.warnings);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.errors.push(`Failed to process sponsor ${govSponsor.name}: ${err.message}`);
      }
    }

    // Calculate data quality metrics
    result.dataQuality = this.calculateDataQuality(allSponsors);
    result.processingTime = Date.now() - startTime;

    return result;
  }

  /**
   * Validate and normalize government bill data
   */
  private async processBill(govBill: GovernmentBill, dryRun: boolean = false): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    // Validate the bill data
    try {
      GovernmentBillSchema.parse(govBill);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      warnings.push(`Validation failed for bill ${govBill.bill_number}: ${err.message}`);
      return { created: false, updated: false, skipped: true, warnings };
    }

    if (dryRun) {
      return { created: true, updated: false, skipped: false, warnings };
    }

    // Check if bill already exists
    const existingBill = await db.select()
      .from(bills)
      .where(eq(bills.bill_number, govBill.bill_number))
      .limit(1);

    const billData = {
      title: govBill.title,
      description: govBill.description || null,
      content: govBill.content || null,
      summary: govBill.summary || null,
      status: this.normalizeBillStatus(govBill.status),
      bill_number: govBill.bill_number,
      category: govBill.category || null,
      tags: govBill.tags || [],
      introduced_date: govBill.introduced_date ? new Date(govBill.introduced_date) : null,
      last_action_date: govBill.last_action_date ? new Date(govBill.last_action_date) : null,
      updated_at: new Date()
    };

    if (existingBill.length === 0) {
      // Create new bill
      const [newBill] = await db.insert(bills).values({
        ...billData,
        created_at: new Date()
      }).returning();

      // Process sponsors if provided
      if (govBill.sponsors && govBill.sponsors.length > 0) {
        await this.processBillSponsors(newBill.id, govBill.sponsors);
      }

      return { created: true, updated: false, skipped: false, warnings };
    } else {
      // Update existing bill
      const [updatedBill] = await db.update(bills)
        .set(billData)
        .where(eq(bills.id, existingBill[0].id))
        .returning();

      // Update sponsors if provided
      if (govBill.sponsors && govBill.sponsors.length > 0) {
        await this.processBillSponsors(updatedBill.id, govBill.sponsors);
      }

      return { created: false, updated: true, skipped: false, warnings };
    }
  }

  /**
   * Process sponsor data from government sources
   */
  private async processSponsor(govSponsor: GovernmentSponsor, dryRun: boolean = false): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    // Validate the sponsor data
    try {
      GovernmentSponsorSchema.parse(govSponsor);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      warnings.push(`Validation failed for sponsor ${govSponsor.name}: ${err.message}`);
      return { created: false, updated: false, skipped: true, warnings };
    }

    if (dryRun) {
      return { created: true, updated: false, skipped: false, warnings };
    }

    // Check if sponsor already exists
    const existingSponsor = await db.select()
      .from(sponsors)
      .where(and(
        eq(sponsors.name, govSponsor.name),
        eq(sponsors.role, govSponsor.role)
      ))
      .limit(1);

    const sponsorData = {
      name: govSponsor.name,
      role: govSponsor.role,
      party: govSponsor.party || null,
      constituency: govSponsor.constituency || null,
      email: govSponsor.email || null,
      phone: govSponsor.phone || null,
      bio: govSponsor.bio || null,
      photo_url: govSponsor.photo_url || null,
      is_active: true,
      created_at: new Date()
    };

    if (existingSponsor.length === 0) {
      // Create new sponsor
      const [newSponsor] = await db.insert(sponsors).values(sponsorData).returning();

      // Process affiliations if provided
      if (govSponsor.affiliations && govSponsor.affiliations.length > 0) {
        await this.processSponsorAffiliations(newSponsor.id, govSponsor.affiliations);
      }

      return { created: true, updated: false, skipped: false, warnings };
    } else {
      // Update existing sponsor
      const [updatedSponsor] = await db.update(sponsors)
        .set({
          ...sponsorData,
          created_at: existingSponsor[0].created_at // Preserve original creation date
        })
        .where(eq(sponsors.id, existingSponsor[0].id))
        .returning();

      // Update affiliations if provided
      if (govSponsor.affiliations && govSponsor.affiliations.length > 0) {
        await this.processSponsorAffiliations(updatedSponsor.id, govSponsor.affiliations);
      }

      return { created: false, updated: true, skipped: false, warnings };
    }
  }

  /**
   * Process bill sponsors and create sponsorship records
   */
  private async processBillSponsors(bill_id: number, billSponsors: GovernmentBill['sponsors']): Promise<void> {
    if (!billSponsors) return;

    for (const sponsorInfo of billSponsors) {
      if (!sponsorInfo.name) continue; // Skip if name is missing

      // Find or create sponsor
      let sponsor = await db.select()
        .from(sponsors)
        .where(eq(sponsors.name, sponsorInfo.name))
        .limit(1);

      if (sponsors.length === 0) {
        // Create sponsor if doesn't exist
        const [newSponsor] = await db.insert(sponsors).values({
          name: sponsorInfo.name,
          role: sponsorInfo.role || 'Unknown',
          party: sponsorInfo.party || null,
          is_active: true,
          created_at: new Date()
        }).returning();
        sponsor = [newSponsor];
      }

      // Create or update sponsorship record
      const existingSponsorship = await db.select()
        .from(bill_sponsorships)
        .where(and(
          eq(bill_sponsorships.bill_id, bill_id),
          eq(bill_sponsorships.sponsor_id, sponsor[0].id)
        ))
        .limit(1);

      if (existingSponsorship.length === 0) { await db.insert(bill_sponsorships).values({
          bill_id,
          sponsor_id: sponsor[0].id,
          sponsorshipType: sponsorInfo.sponsorshipType || 'primary',
          sponsorshipDate: new Date(),
          is_active: true
         });
      }
    }
  }

  /**
   * Process sponsor affiliations
   */
  private async processSponsorAffiliations(sponsor_id: number, affiliations: GovernmentSponsor['affiliations']): Promise<void> {
    if (!affiliations) return;

    for (const affiliation of affiliations) {
      const existingAffiliation = await db.select()
        .from(sponsorAffiliations)
        .where(and(
          eq(sponsorAffiliations.sponsor_id, sponsor_id),
          eq(sponsorAffiliations.organization, affiliation.organization),
          eq(sponsorAffiliations.type, affiliation.type)
        ))
        .limit(1);

      if (existingAffiliation.length === 0) {
        await db.insert(sponsorAffiliations).values({
          sponsor_id,
          organization: affiliation.organization,
          role: affiliation.role || null,
          type: affiliation.type,
          startDate: affiliation.startDate ? new Date(affiliation.startDate) : null,
          endDate: affiliation.endDate ? new Date(affiliation.endDate) : null,
          is_active: !affiliation.endDate,
          created_at: new Date()
        });
      }
    }
  }

  /**
   * Build URL for fetching bills from a data source
   */
  private buildBillsUrl(source: DataSourceConfig, options: any): string {
    // This would be customized for each data source
    // For now, return a placeholder URL
    let url = `${source.baseUrl}/bills`;
    const params = new URLSearchParams();

    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.since) params.append('since', options.since.toISOString());
    if (options.status) params.append('status', options.status.join(','));

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return url;
  }

  /**
   * Build URL for fetching sponsors from a data source
   */
  private buildSponsorsUrl(source: DataSourceConfig, options: any): string {
    let url = `${source.baseUrl}/sponsors`;
    const params = new URLSearchParams();

    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.since) params.append('since', options.since.toISOString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return url;
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest(url: string, source: DataSourceConfig): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= source.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), source.timeout);

        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'Chanuka-Legislative-Platform/1.0'
        };

        if (source.apiKey) {
          headers['Authorization'] = `Bearer ${source.apiKey}`;
        }

        const response = await fetch(url, {
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Update rate limiter
        this.updateRateLimit(source.name);

        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        console.warn(`Attempt ${attempt}/${source.retryAttempts} failed for ${url}:`, err.message);

        if (attempt < source.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Parse bills data from different government sources
   */
  public parseBillsData(rawData: any, sourceName: string): GovernmentBill[] {
    // This would be customized for each data source format
    // For now, assume a standard format and provide basic parsing
    
    if (!rawData || !Array.isArray(rawData.bills)) {
      console.warn(`Unexpected data format from ${sourceName}`);
      return [];
    }

    return rawData.bills.map((item: any) => ({
      id: item.id || item.bill_id || item.bill_id,
      title: item.title || item.bill_title,
      description: item.description || item.summary,
      content: item.content || item.full_text,
      summary: item.summary || item.short_summary,
      status: item.status || item.bill_status,
      bill_number: item.bill_number || item.bill_number || item.number,
      introduced_date: item.introduced_date || item.introduced_date,
      last_action_date: item.last_action_date || item.last_action_date,
      sponsors: item.sponsors || [],
      category: item.category || item.subject,
      tags: item.tags || item.keywords || [],
      source: sourceName,
      sourceUrl: item.url || item.source_url,
      lastUpdated: item.updated_at || item.lastUpdated || new Date().toISOString()
    }));
  }

  /**
   * Parse sponsors data from different government sources
   */
  public parseSponsorsData(rawData: any, sourceName: string): GovernmentSponsor[] {
    if (!rawData || !Array.isArray(rawData.sponsors)) {
      console.warn(`Unexpected sponsor data format from ${sourceName}`);
      return [];
    }

    return rawData.sponsors.map((item: any) => ({
      id: item.id || item.sponsor_id || item.sponsor_id,
      name: item.name || item.full_name,
      role: item.role || item.position,
      party: item.party || item.political_party,
      constituency: item.constituency || item.district,
      email: item.email || item.contact_email,
      phone: item.phone || item.contact_phone,
      bio: item.bio || item.biography,
      photo_url: item.photo_url || item.photo_url,
      affiliations: item.affiliations || [],
      source: sourceName,
      sourceUrl: item.url || item.source_url,
      lastUpdated: item.updated_at || item.lastUpdated || new Date().toISOString()
    }));
  }

  /**
   * Normalize bill status from different sources
   */
  private normalizeBillStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'introduced': 'introduced',
      'first_reading': 'introduced',
      'second_reading': 'committee',
      'committee': 'committee',
      'third_reading': 'passed',
      'passed': 'passed',
      'royal_assent': 'signed',
      'signed': 'signed',
      'failed': 'failed',
      'withdrawn': 'failed',
      'defeated': 'failed'
    };

    return statusMap[status.toLowerCase()] || status;
  }

  /**
   * Check rate limiting for a data source
   */
  private async checkRateLimit(sourceName: string): Promise<void> {
    const source = this.dataSources.get(sourceName);
    if (!source) return;

    const limiter = this.rateLimiters.get(sourceName);
    const now = Date.now();

    if (!limiter || now > limiter.resetTime) {
      // Reset rate limiter
      this.rateLimiters.set(sourceName, {
        requests: 0,
        resetTime: now + (60 * 1000) // Reset every minute
      });
      return;
    }

    if (limiter.requests >= source.rateLimit.requestsPerMinute) {
      const waitTime = limiter.resetTime - now;
      console.log(`Rate limit reached for ${sourceName}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after waiting
      this.rateLimiters.set(sourceName, {
        requests: 0,
        resetTime: now + waitTime + (60 * 1000)
      });
    }
  }

  /**
   * Update rate limiter after successful request
   */
  private updateRateLimit(sourceName: string): void {
    const limiter = this.rateLimiters.get(sourceName);
    if (limiter) {
      limiter.requests++;
    }
  }

  /**
   * Calculate data quality metrics
   */
  private calculateDataQuality(data: (GovernmentBill | GovernmentSponsor)[]): DataQualityMetrics {
    if (data.length === 0) {
      return { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 };
    }

    // Calculate completeness (percentage of records with all required fields)
    const completeRecords = data.filter(record => {
      if ('bill_number' in record) {
        return record.title && record.bill_number && record.status;
      } else {
        return record.name && record.role;
      }
    });
    const completeness = completeRecords.length / data.length;

    // Calculate timeliness (based on lastUpdated timestamps)
    const now = new Date();
    const recentRecords = data.filter(record => {
      const lastUpdated = new Date(record.lastUpdated);
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 7; // Consider recent if updated within 7 days
    });
    const timeliness = recentRecords.length / data.length;

    // For now, set accuracy and consistency to reasonable defaults
    // These would be calculated based on cross-source validation in a real implementation
    const accuracy = 0.85;
    const consistency = 0.80;

    const overall = (completeness + accuracy + timeliness + consistency) / 4;

    return {
      completeness,
      accuracy,
      timeliness,
      consistency,
      overall
    };
  }

  /**
   * Get integration status and health metrics
   */
  async getIntegrationStatus(): Promise<{
    sources: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      lastSync: Date | null;
      errorCount: number;
      dataQuality: DataQualityMetrics;
    }>;
    overallHealth: 'healthy' | 'degraded' | 'down';
  }> {
    const sourceStatuses: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      lastSync: Date | null;
      errorCount: number;
      dataQuality: DataQualityMetrics;
    }> = [];
    
    for (const [sourceName, config] of this.dataSources) {
      try {
        // Try to make a simple health check request
        const healthUrl = `${config.baseUrl}/health`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(healthUrl, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        sourceStatuses.push({
          name: config.name,
          status: response.ok ? 'healthy' as const : 'degraded' as const,
          lastSync: new Date(), // This would be tracked in a real implementation
          errorCount: 0, // This would be tracked in a real implementation
          dataQuality: { completeness: 0.9, accuracy: 0.85, timeliness: 0.8, consistency: 0.82, overall: 0.84 }
        });
      } catch (error) {
        sourceStatuses.push({
          name: config.name,
          status: 'down' as const,
          lastSync: null,
          errorCount: 1,
          dataQuality: { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 }
        });
      }
    }

    const healthySources = sourceStatuses.filter(s => s.status === 'healthy').length;
    const totalSources = sourceStatuses.length;
    
    let overallHealth: 'healthy' | 'degraded' | 'down';
    if (healthySources === totalSources) {
      overallHealth = 'healthy';
    } else if (healthySources > 0) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'down';
    }

    return {
      sources: sourceStatuses,
      overallHealth
    };
  }
}












































