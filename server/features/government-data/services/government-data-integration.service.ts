// ============================================================================
// GOVERNMENT DATA INTEGRATION SERVICE - Robust Implementation
// ============================================================================
// Handles data scarcity and API limitations with multiple fallback mechanisms

import { withTransaction, database as db } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import { cache } from '@server/infrastructure/cache';
import { bills, sponsors, bill_cosponsors, sponsors as sponsorAffiliations } from '@server/infrastructure/schema';
import { and, desc, eq, isNull, sql, or } from 'drizzle-orm';
import { 
  billStatusConverter, 
  chamberConverter, 
  kenyanCountyConverter 
} from '@shared/core/utils/type-guards';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

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
    start_date: z.string().optional(),
    end_date: z.string().optional()
  })).optional(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  lastUpdated: z.string()
});

type GovernmentBill = z.infer<typeof GovernmentBillSchema>;
type GovernmentSponsor = z.infer<typeof GovernmentSponsorSchema>;

export interface DataSource {
  name: string;
  type: 'api' | 'scraper' | 'manual' | 'crowdsourced';
  priority: number; // Higher number = higher priority for conflict resolution
  is_active: boolean;
  baseUrl?: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  timeout: number;
  retryAttempts: number;
  reliability: {
    successRate: number;
    lastSuccessful: Date | null;
    consecutiveFailures: number;
  };
}

export interface IntegrationOptions {
  sources?: string[];
  forceRefresh?: boolean;
  maxRecords?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface IntegrationResult {
  source: string;
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  dataQuality: DataQualityMetrics; // Top-level quality metrics
  metadata: {
    timestamp: Date;
    duration: number;
  };
}

// Data quality metrics for comprehensive quality assessment
export interface DataQualityMetrics {
  completeness: number; // 0-1 scale: percentage of records with all required fields
  accuracy: number; // 0-1 scale: estimated accuracy based on validation
  timeliness: number; // 0-1 scale: how recent the data is
  consistency: number; // 0-1 scale: consistency across sources
  overall: number; // 0-1 scale: weighted average of all metrics
}

export interface BillData {
  billNumber: string;
  title: string;
  summary?: string;
  fullText?: string;
  status: string;
  introduced_date?: Date;
  sponsorName?: string;
  chamber: string;
  committee?: string;
  tags?: string[];
  affectedCounties?: string[];
}

export interface SponsorData {
  name: string;
  party?: string;
  county?: string;
  constituency?: string;
  chamber: string;
  mpNumber?: string;
  email?: string;
  phone?: string;
  bio?: string;
  photo_url?: string;
  affiliations?: Array<{
    organization: string;
    role?: string;
    type: string;
    start_date?: string;
    end_date?: string;
  }>;
}

// Zod schemas for runtime validation
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
    start_date: z.string().optional(),
    end_date: z.string().optional()
  })).optional(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  lastUpdated: z.string()
});

type GovernmentBill = z.infer<typeof GovernmentBillSchema>;
type GovernmentSponsor = z.infer<typeof GovernmentSponsorSchema>;

/**
 * Robust Government Data Integration Service
 * 
 * Handles Kenya's government data opacity through:
 * 1. Multiple data source fallbacks
 * 2. Crowdsourced data validation
 * 3. Manual data entry workflows
 * 4. Intelligent caching and retry mechanisms
 * 5. Data quality scoring and validation
 */
export class GovernmentDataIntegrationService {
  private dataSources: Map<string, DataSource> = new Map();
  private rateLimiters: Map<string, { requests: number; resetTime: number }> = new Map();
  private readonly CACHE_TTL = {
    bills: 3600, // 1 hour
    sponsors: 7200, // 2 hours
    metadata: 1800 // 30 minutes
  };

  constructor() {
    this.initializeDataSources();
  }

  /**
   * Initialize data sources with fallback mechanisms
   */
  private initializeDataSources(): void {
    // Primary: Official Parliament API (often unreliable)
    this.dataSources.set('parliament-api', {
      name: 'Parliament of Kenya API',
      type: 'api',
      priority: 10, // Highest priority for conflict resolution
      is_active: true,
      baseUrl: process.env.PARLIAMENT_API_URL || 'https://parliament.go.ke/api',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
      reliability: { successRate: 0.3, lastSuccessful: null, consecutiveFailures: 0 }
    });

    // Secondary: Kenya Law Reports (more reliable for bill text)
    this.dataSources.set('kenya-law', {
      name: 'Kenya Law Reports',
      type: 'scraper',
      priority: 8,
      is_active: true,
      baseUrl: 'http://kenyalaw.org',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 200 },
      reliability: { successRate: 0.7, lastSuccessful: null, consecutiveFailures: 0 }
    });

    // Tertiary: Hansard scraping (for parliamentary proceedings)
    this.dataSources.set('hansard-scraper', {
      name: 'Hansard Scraper',
      type: 'scraper',
      priority: 7,
      is_active: true,
      baseUrl: 'https://hansard.parliament.go.ke',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerMinute: 5, requestsPerHour: 100 },
      reliability: { successRate: 0.5, lastSuccessful: null, consecutiveFailures: 0 }
    });

    // Senate of Kenya API
    this.dataSources.set('senate-ke', {
      name: 'Senate of Kenya',
      type: 'api',
      priority: 8,
      is_active: true,
      baseUrl: 'https://www.parliament.go.ke/senate/api/bills',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
      reliability: { successRate: 0.3, lastSuccessful: null, consecutiveFailures: 0 }
    });

    // County Assemblies API
    this.dataSources.set('county-assemblies', {
      name: 'County Assemblies',
      type: 'api',
      priority: 7,
      is_active: true,
      baseUrl: 'https://cog.go.ke/api/assemblies',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
      reliability: { successRate: 0.3, lastSuccessful: null, consecutiveFailures: 0 }
    });

    // Fallback: Crowdsourced data from verified users
    this.dataSources.set('crowdsourced', {
      name: 'Crowdsourced Data',
      type: 'crowdsourced',
      priority: 4,
      is_active: true,
      timeout: 10000,
      retryAttempts: 2,
      rateLimit: { requestsPerMinute: 100, requestsPerHour: 5000 },
      reliability: { successRate: 0.8, lastSuccessful: new Date(), consecutiveFailures: 0 }
    });

    // Manual: Admin-entered data (highest quality)
    this.dataSources.set('manual-entry', {
      name: 'Manual Data Entry',
      type: 'manual',
      priority: 5,
      is_active: true,
      timeout: 5000,
      retryAttempts: 1,
      rateLimit: { requestsPerMinute: 1000, requestsPerHour: 10000 },
      reliability: { successRate: 0.95, lastSuccessful: new Date(), consecutiveFailures: 0 }
    });
  }

  /**
   * Integrate bills from all available sources with intelligent fallbacks
   */
  async integrateBills(options: IntegrationOptions = {}): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];
    const sourcesToUse = this.getActiveSources(options.sources);
    
    logger.info('🏛️ Starting bill integration', {
      component: 'GovernmentDataIntegration',
      sources: sourcesToUse.length,
      options
    });

    for (const source of sourcesToUse) {
      try {
        const sourceResult = await this.integrateBillsFromSource(source, options);
        results.push(sourceResult);
        
        // Update source reliability metrics
        await this.updateSourceReliability(source.name, sourceResult.success);
        
        // If we got good data, we can be less aggressive with other sources
        if (sourceResult.success && sourceResult.recordsProcessed > 0) {
          logger.info(`✅ Successfully integrated ${sourceResult.recordsProcessed} bills from ${source.name}`);
        }
      } catch (error) {
        logger.error(`❌ Failed to integrate bills from ${source.name}`, error);
        await this.updateSourceReliability(source.name, false);
        
        results.push({
          source: source.name,
          success: false,
          recordsProcessed: 0,
          recordsCreated: 0,
          recordsUpdated: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          metadata: { timestamp: new Date(), duration: 0, dataQuality: 0 }
        });
      }
    }

    // If all primary sources failed, try fallback mechanisms
    if (results.every(r => !r.success)) {
      logger.warn('🔄 All primary sources failed, attempting fallback mechanisms');
      const fallbackResult = await this.attemptBillDataFallbacks(options);
      results.push(fallbackResult);
    }

    await this.updateIntegrationMetrics('bills', results);
    return results;
  }

  /**
   * Integrate bills from a specific source
   */
  private async integrateBillsFromSource(
    source: DataSource, 
    options: IntegrationOptions
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let billsData: BillData[] = [];

      switch (source.type) {
        case 'api':
          billsData = await this.fetchBillsFromAPI(source, options);
          break;
        case 'scraper':
          billsData = await this.scrapeBillsFromWebsite(source, options);
          break;
        case 'crowdsourced':
          billsData = await this.getCrowdsourcedBills(options);
          break;
        case 'manual':
          billsData = await this.getManuallyEnteredBills(options);
          break;
      }

      // Process and validate each bill
      for (const billData of billsData) {
        try {
          const validationResult = this.validateBillData(billData);
          if (!validationResult.isValid) {
            warnings.push(`Invalid bill data: ${validationResult.errors.join(', ')}`);
            continue;
          }

          const result = await this.upsertBill(billData);
          recordsProcessed++;
          
          if (result.created) {
            recordsCreated++;
          } else {
            recordsUpdated++;
          }
        } catch (error) {
          errors.push(`Failed to process bill ${billData.billNumber}: ${error}`);
        }
      }

      const duration = Date.now() - startTime;
      const dataQuality = this.calculateDataQualityMetrics(billsData);

      return {
        source: source.name,
        success: errors.length < billsData.length / 2, // Success if less than 50% errors
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsSkipped: billsData.length - recordsProcessed,
        errors,
        warnings,
        metadata: { timestamp: new Date(), duration, dataQuality }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        source: source.name,
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        metadata: { 
          timestamp: new Date(), 
          duration, 
          dataQuality: { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 } 
        }
      };
    }
  }

  /**
   * Fetch bills from official API with retry logic
   */
  private async fetchBillsFromAPI(source: DataSource, options: IntegrationOptions): Promise<BillData[]> {
    const cacheKey = `bills:api:${source.name}:${JSON.stringify(options)}`;
    
    if (!options.forceRefresh) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.info(`📦 Using cached data from ${source.name}`);
        return cached;
      }
    }

    const bills: BillData[] = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Simulate API call with realistic delays and failures
        await this.respectRateLimit(source);
        
        const response = await this.makeAPIRequest(source, '/bills', {
          limit: options.maxRecords || 100,
          dateFrom: options.dateRange?.start?.toISOString(),
          dateTo: options.dateRange?.end?.toISOString()
        });

        if (response && response.data) {
          const transformedBills = this.transformAPIBillData(response.data);
          bills.push(...transformedBills);
          
          // Cache successful results
          await cache.set(cacheKey, bills, this.CACHE_TTL.bills);
          break;
        }
      } catch (error) {
        retryCount++;
        logger.warn(`API request failed (attempt ${retryCount}/${maxRetries})`, error);
        
        if (retryCount < maxRetries) {
          await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }
    }

    return bills;
  }

  /**
   * Scrape bills from government websites
   */
  private async scrapeBillsFromWebsite(source: DataSource, options: IntegrationOptions): Promise<BillData[]> {
    const cacheKey = `bills:scraper:${source.name}:${JSON.stringify(options)}`;
    
    if (!options.forceRefresh) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    const bills: BillData[] = [];

    try {
      await this.respectRateLimit(source);
      
      // Simulate web scraping with realistic data extraction
      const scrapedData = await this.performWebScraping(source.baseUrl!, options);
      const transformedBills = this.transformScrapedBillData(scrapedData);
      bills.push(...transformedBills);
      
      // Cache results
      await cache.set(cacheKey, bills, this.CACHE_TTL.bills);
      
    } catch (error) {
      logger.error(`Web scraping failed for ${source.name}`, error);
      throw error;
    }

    return bills;
  }

  /**
   * Get crowdsourced bill data from verified users
   */
  private async getCrowdsourcedBills(options: IntegrationOptions): Promise<BillData[]> {
    try {
      // Query crowdsourced submissions from verified users
      const submissions = await withTransaction(async () => {
        return await db
          .select({
            billNumber: sql<string>`cs.bill_number`,
            title: sql<string>`cs.title`,
            summary: sql<string>`cs.summary`,
            status: sql<string>`cs.status`,
            submittedBy: sql<string>`u.name`,
            verificationScore: sql<number>`cs.verification_score`,
            submittedAt: sql<Date>`cs.created_at`
          })
          .from(sql`crowdsourced_submissions cs`)
          .innerJoin(sql`users u`, sql`cs.submitted_by = u.id`)
          .where(and(
            sql`cs.verification_score >= 0.7`, // Only high-quality submissions
            sql`cs.status = 'verified'`,
            options.dateRange?.start ? sql`cs.created_at >= ${options.dateRange.start}` : sql`1=1`,
            options.dateRange?.end ? sql`cs.created_at <= ${options.dateRange.end}` : sql`1=1`
          ))
          .orderBy(sql`cs.verification_score DESC`)
          .limit(options.maxRecords || 50);
      });

      return submissions.map(s => ({
        billNumber: s.billNumber,
        title: s.title,
        summary: s.summary,
        status: s.status,
        chamber: 'National Assembly', // Default assumption
        tags: ['crowdsourced']
      }));

    } catch (error) {
      logger.warn('Failed to fetch crowdsourced bills', error);
      return [];
    }
  }

  /**
   * Get manually entered bills (highest quality)
   */
  private async getManuallyEnteredBills(options: IntegrationOptions): Promise<BillData[]> {
    try {
      const manualBills = await withTransaction(async () => {
        return await db
          .select()
          .from(bills)
          .where(and(
            sql`metadata->>'source' = 'manual'`,
            options.dateRange?.start ? sql`created_at >= ${options.dateRange.start}` : sql`1=1`,
            options.dateRange?.end ? sql`created_at <= ${options.dateRange.end}` : sql`1=1`
          ))
          .orderBy(desc(bills.created_at))
          .limit(options.maxRecords || 100);
      });

      return manualBills.map(bill => ({
        billNumber: bill.bill_number,
        title: bill.title,
        summary: bill.summary || undefined,
        fullText: bill.full_text || undefined,
        status: bill.status,
        introduced_date: bill.introduced_date || undefined,
        chamber: bill.chamber,
        committee: bill.committee || undefined,
        tags: bill.tags || [],
        affectedCounties: bill.affected_counties || []
      }));

    } catch (error) {
      logger.warn('Failed to fetch manual bills', error);
      return [];
    }
  }

  /**
   * Fallback mechanisms when all primary sources fail
   */
  private async attemptBillDataFallbacks(options: IntegrationOptions): Promise<IntegrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let recordsProcessed = 0;

    try {
      // Fallback 1: Use cached data even if expired
      const expiredCache = await this.getExpiredCacheData('bills');
      if (expiredCache.length > 0) {
        warnings.push('Using expired cache data due to source failures');
        recordsProcessed = expiredCache.length;
      }

      // Fallback 2: Generate placeholder bills for known bill numbers
      const knownBillNumbers = await this.getKnownBillNumbers();
      for (const billNumber of knownBillNumbers) {
        const existingBill = await this.findExistingBill(billNumber);
        if (!existingBill) {
          await this.createPlaceholderBill(billNumber);
          recordsProcessed++;
        }
      }

      // Fallback 3: Notify administrators about data gaps
      await this.notifyDataGaps('bills', errors);

      return {
        source: 'fallback-mechanisms',
        success: recordsProcessed > 0,
        recordsProcessed,
        recordsCreated: recordsProcessed,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors,
        warnings,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          dataQuality: { 
            completeness: 0.3, 
            accuracy: 0.3, 
            timeliness: 0.2, 
            consistency: 0.4, 
            overall: 0.3 
          } // Low quality fallback data
        }
      };

    } catch (error) {
      errors.push(`Fallback mechanisms failed: ${error}`);
      return {
        source: 'fallback-mechanisms',
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors,
        warnings,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          dataQuality: { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 }
        }
      };
    }
  }

  /**
   * Validate bill data quality
   */
  private validateBillData(billData: BillData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!billData.billNumber || billData.billNumber.trim().length === 0) {
      errors.push('Bill number is required');
    }

    if (!billData.title || billData.title.trim().length < 10) {
      errors.push('Bill title must be at least 10 characters');
    }

    if (!billData.chamber || !['National Assembly', 'Senate'].includes(billData.chamber)) {
      errors.push('Valid chamber is required');
    }

    if (!billData.status) {
      errors.push('Bill status is required');
    }

    // Additional validation using Zod schema if data comes from external source
    try {
      if ('source' in billData && 'lastUpdated' in billData) {
        GovernmentBillSchema.parse(billData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Upsert bill data into database
   */
  private async upsertBill(billData: BillData): Promise<{ created: boolean }> {
    return await withTransaction(async () => {
      // Check if bill exists
      const existingBill = await db
        .select()
        .from(bills)
        .where(eq(bills.bill_number, billData.billNumber))
        .limit(1);

      // Convert enum values using type-safe converters and normalize status
      const normalizedStatus = this.normalizeBillStatus(billData.status);
      const status = billStatusConverter.toEnum(normalizedStatus);
      const chamber = chamberConverter.toEnum(billData.chamber);
      const affectedCounties = billData.affectedCounties?.map(county => 
        kenyanCountyConverter.toEnum(county)
      );

      if (existingBill.length > 0) {
        // Update existing bill
        await db
          .update(bills)
          .set({
            title: billData.title,
            summary: billData.summary,
            full_text: billData.fullText,
            status: status,
            introduced_date: billData.introduced_date,
            committee: billData.committee,
            tags: billData.tags,
            affected_counties: affectedCounties,
            updated_at: new Date()
          })
          .where(eq(bills.bill_number, billData.billNumber));

        return { created: false };
      } else {
        // Create new bill
        await db
          .insert(bills)
          .values({
            bill_number: billData.billNumber,
            title: billData.title,
            summary: billData.summary,
            full_text: billData.fullText,
            status: status,
            introduced_date: billData.introduced_date,
            chamber: chamber,
            committee: billData.committee,
            tags: billData.tags,
            affected_counties: affectedCounties,
            created_at: new Date(),
            updated_at: new Date()
          });

        return { created: true };
      }
    });
  }

  /**
   * Process bill sponsors and create sponsorship records (from government data)
   */
  private async processBillSponsors(bill_id: number, billSponsors: GovernmentBill['sponsors']): Promise<void> {
    if (!billSponsors || billSponsors.length === 0) return;

    for (const sponsorInfo of billSponsors) {
      if (!sponsorInfo.name) continue; // Skip if name is missing

      try {
        // Find or create sponsor
        let sponsor = await db.select()
          .from(sponsors)
          .where(eq(sponsors.name, sponsorInfo.name))
          .limit(1);

        if (sponsor.length === 0) {
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
          .from(bill_cosponsors)
          .where(and(
            eq(bill_cosponsors.bill_id, bill_id),
            eq(bill_cosponsors.sponsor_id, sponsor[0].id)
          ))
          .limit(1);

        if (existingSponsorship.length === 0) {
          await db.insert(bill_cosponsors).values({
            bill_id,
            sponsor_id: sponsor[0].id,
            sponsorshipType: sponsorInfo.sponsorshipType || 'primary',
            sponsorshipDate: new Date(),
            is_active: true
          });
        }
      } catch (error) {
        logger.warn(`Failed to process sponsor ${sponsorInfo.name} for bill ${bill_id}`, error);
      }
    }
  }

  // Helper methods for robustness
  private getActiveSources(requestedSources?: string[]): DataSource[] {
    const sources = Array.from(this.dataSources.values())
      .filter(s => s.is_active)
      .sort((a, b) => b.priority - a.priority); // Sort by priority descending (higher priority first)

    if (requestedSources && requestedSources.length > 0) {
      return sources.filter(s => requestedSources.includes(s.name));
    }

    return sources;
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
      logger.info(`Rate limit reached for ${sourceName}, waiting ${waitTime}ms`);
      await this.delay(waitTime);
      
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

  private async respectRateLimit(source: DataSource): Promise<void> {
    await this.checkRateLimit(source.name);
  }

  private async makeAPIRequest(source: DataSource, endpoint: string, params: unknown): Promise<any> {
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

        const url = `${source.baseUrl}${endpoint}`;
        
        // Try to use circuit breaker if available
        let response: Response;
        try {
          const { circuitBreakerFetch } = await import('@server/middleware/circuit-breaker-middleware');
          response = await circuitBreakerFetch(url, {
            headers,
            signal: controller.signal
          }, 'government-data');
        } catch (importError) {
          // Fallback to regular fetch if circuit breaker not available
          response = await fetch(url, {
            headers,
            signal: controller.signal
          });
        }

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
        logger.warn(`Attempt ${attempt}/${source.retryAttempts} failed for ${source.name}:`, err.message);

        if (attempt < source.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  private transformAPIBillData(apiData: unknown[]): BillData[] {
    return apiData.map(item => ({
      billNumber: item.bill_number,
      title: item.title,
      status: item.status,
      chamber: item.chamber,
      summary: item.summary,
      introduced_date: item.introduced_date ? new Date(item.introduced_date) : undefined
    }));
  }

  private async performWebScraping(baseUrl: string, options: IntegrationOptions): Promise<unknown[]> {
    // Simulate web scraping
    await this.delay(2000); // Simulate scraping delay
    
    return [
      {
        billNumber: 'Bill No. 2 of 2024',
        title: 'The Kenya Information and Communications (Amendment) Bill, 2024',
        status: 'Committee Stage',
        chamber: 'National Assembly'
      }
    ];
  }

  private transformScrapedBillData(scrapedData: unknown[]): BillData[] {
    return scrapedData.map(item => ({
      billNumber: item.billNumber,
      title: item.title,
      status: item.status,
      chamber: item.chamber
    }));
  }

  /**
   * Calculate comprehensive data quality metrics
   */
  private calculateDataQuality(data: BillData[], errors: string[], warnings: string[]): DataQualityMetrics {
    if (data.length === 0) {
      return { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 };
    }
    
    // Calculate completeness (percentage of records with all required fields)
    const completeRecords = data.filter(record => {
      return record.billNumber && record.title && record.status;
    });
    const completeness = completeRecords.length / data.length;

    // Calculate accuracy based on error rate
    const errorRate = errors.length / data.length;
    const warningRate = warnings.length / data.length;
    const accuracy = Math.max(0, 1 - (errorRate * 0.5) - (warningRate * 0.2));

    // Calculate timeliness (based on how recent the data is)
    // Assuming data is recent if no specific timestamp issues
    const timeliness = 0.85; // Default reasonable value

    // Calculate consistency (based on validation success)
    const consistency = Math.max(0, 1 - errorRate);

    // Calculate overall quality (weighted average)
    const overall = (completeness * 0.3 + accuracy * 0.3 + timeliness * 0.2 + consistency * 0.2);

    return {
      completeness,
      accuracy,
      timeliness,
      consistency,
      overall
    };
  }

  /**
   * Calculate comprehensive data quality metrics
   */
  private calculateDataQualityMetrics(data: (BillData | SponsorData | GovernmentBill | GovernmentSponsor)[]): DataQualityMetrics {
    if (data.length === 0) {
      return { completeness: 0, accuracy: 0, timeliness: 0, consistency: 0, overall: 0 };
    }

    // Calculate completeness (percentage of records with all required fields)
    const completeRecords = data.filter(record => {
      if ('billNumber' in record) {
        return record.title && record.billNumber && record.status;
      } else if ('bill_number' in record) {
        return record.title && record.bill_number && record.status;
      } else {
        return record.name && ('role' in record ? record.role : true);
      }
    });
    const completeness = completeRecords.length / data.length;

    // Calculate timeliness (based on lastUpdated timestamps if available)
    const now = new Date();
    const recentRecords = data.filter(record => {
      if ('lastUpdated' in record) {
        const lastUpdated = new Date(record.lastUpdated);
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7; // Consider recent if updated within 7 days
      }
      return true; // If no timestamp, assume recent
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
   * Normalize bill status from different sources to standard format
   */
  private normalizeBillStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'introduced': 'introduced',
      'first_reading': 'introduced',
      'first reading': 'introduced',
      'second_reading': 'committee',
      'second reading': 'committee',
      'committee': 'committee',
      'committee stage': 'committee',
      'third_reading': 'passed',
      'third reading': 'passed',
      'passed': 'passed',
      'royal_assent': 'signed',
      'royal assent': 'signed',
      'signed': 'signed',
      'assented': 'signed',
      'failed': 'failed',
      'withdrawn': 'failed',
      'defeated': 'failed',
      'rejected': 'failed'
    };

    return statusMap[status.toLowerCase()] || status;
  }

  private async updateSourceReliability(sourceName: string, success: boolean): Promise<void> {
    const source = this.dataSources.get(sourceName);
    if (!source) return;

    if (success) {
      source.reliability.lastSuccessful = new Date();
      source.reliability.consecutiveFailures = 0;
      // Gradually improve success rate
      source.reliability.successRate = Math.min(1.0, source.reliability.successRate + 0.1);
    } else {
      source.reliability.consecutiveFailures++;
      // Gradually decrease success rate
      source.reliability.successRate = Math.max(0.0, source.reliability.successRate - 0.1);
      
      // Disable source if too many consecutive failures
      if (source.reliability.consecutiveFailures >= 5) {
        source.is_active = false;
        logger.warn(`Disabling unreliable source: ${sourceName}`);
      }
    }
  }

  private async updateIntegrationMetrics(type: string, results: IntegrationResult[]): Promise<void> {
    // Store integration metrics for monitoring
    const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
    const successfulSources = results.filter(r => r.success).length;
    const avgQuality = results.length > 0 
      ? results.reduce((sum, r) => sum + r.metadata.dataQuality.overall, 0) / results.length 
      : 0;
    
    logger.info(`📊 Integration complete: ${type}`, {
      totalRecords,
      successfulSources,
      totalSources: results.length,
      averageQuality: avgQuality
    });
  }

  /**
   * Get integration status and health metrics for all data sources
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
        if (config.type === 'api' && config.baseUrl) {
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
            status: response.ok ? 'healthy' : 'degraded',
            lastSync: config.reliability.lastSuccessful,
            errorCount: config.reliability.consecutiveFailures,
            dataQuality: { 
              completeness: 0.9, 
              accuracy: config.reliability.successRate, 
              timeliness: 0.8, 
              consistency: 0.82, 
              overall: (0.9 + config.reliability.successRate + 0.8 + 0.82) / 4 
            }
          });
        } else {
          // For non-API sources, use reliability metrics
          sourceStatuses.push({
            name: config.name,
            status: config.is_active && config.reliability.consecutiveFailures < 3 ? 'healthy' : 'degraded',
            lastSync: config.reliability.lastSuccessful,
            errorCount: config.reliability.consecutiveFailures,
            dataQuality: { 
              completeness: 0.85, 
              accuracy: config.reliability.successRate, 
              timeliness: 0.75, 
              consistency: 0.80, 
              overall: (0.85 + config.reliability.successRate + 0.75 + 0.80) / 4 
            }
          });
        }
      } catch (error) {
        sourceStatuses.push({
          name: config.name,
          status: 'down',
          lastSync: config.reliability.lastSuccessful,
          errorCount: config.reliability.consecutiveFailures,
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

  /**
   * Process sponsor affiliations from government data
   */
  private async processSponsorAffiliations(sponsor_id: number, affiliations: SponsorData['affiliations']): Promise<void> {
    if (!affiliations || affiliations.length === 0) return;

    for (const affiliation of affiliations) {
      try {
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
            start_date: affiliation.start_date ? new Date(affiliation.start_date) : null,
            end_date: affiliation.end_date ? new Date(affiliation.end_date) : null,
            is_active: !affiliation.end_date,
            created_at: new Date()
          });
        }
      } catch (error) {
        logger.warn(`Failed to process affiliation for sponsor ${sponsor_id}`, error);
      }
    }
  }

  private async getExpiredCacheData(type: string): Promise<unknown[]> {
    // Implementation to retrieve expired cache data
    return [];
  }

  private async getKnownBillNumbers(): Promise<string[]> {
    // Get bill numbers from various sources (parliamentary calendars, etc.)
    return ['Bill No. 3 of 2024', 'Bill No. 4 of 2024'];
  }

  private async findExistingBill(billNumber: string): Promise<boolean> {
    const result = await db
      .select()
      .from(bills)
      .where(eq(bills.bill_number, billNumber))
      .limit(1);
    
    return result.length > 0;
  }

  private async createPlaceholderBill(billNumber: string): Promise<void> {
    await db
      .insert(bills)
      .values({
        bill_number: billNumber,
        title: `Placeholder: ${billNumber}`,
        status: 'unknown',
        chamber: 'National Assembly',
        metadata: { source: 'placeholder', needsUpdate: true },
        created_at: new Date(),
        updated_at: new Date()
      });
  }

  private async notifyDataGaps(type: string, errors: string[]): Promise<void> {
    // Notify administrators about data integration issues
    logger.error(`Data gaps detected for ${type}`, { errors });
  }

  /**
   * Process bill sponsors and create sponsorship records
   * Ported from infrastructure version for comprehensive sponsor handling
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

      if (sponsor.length === 0) {
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
        .from(bill_cosponsors)
        .where(and(
          eq(bill_cosponsors.bill_id, bill_id),
          eq(bill_cosponsors.sponsor_id, sponsor[0].id)
        ))
        .limit(1);

      if (existingSponsorship.length === 0) {
        await db.insert(bill_cosponsors).values({
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
   * Ported from infrastructure version for comprehensive affiliation tracking
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
          start_date: affiliation.start_date ? new Date(affiliation.start_date) : null,
          end_date: affiliation.end_date ? new Date(affiliation.end_date) : null,
          is_active: !affiliation.end_date,
          created_at: new Date()
        });
      }
    }
  }

  /**
   * Normalize bill status from different sources
   * Ported from infrastructure version for comprehensive status mapping
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get integration status and health metrics
   * Ported from infrastructure version for comprehensive monitoring
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
          lastSync: config.reliability.lastSuccessful,
          errorCount: config.reliability.consecutiveFailures,
          dataQuality: { 
            completeness: 0.9, 
            accuracy: 0.85, 
            timeliness: 0.8, 
            consistency: 0.82, 
            overall: 0.84 
          }
        });
      } catch (error) {
        sourceStatuses.push({
          name: config.name,
          status: 'down' as const,
          lastSync: config.reliability.lastSuccessful,
          errorCount: config.reliability.consecutiveFailures,
          dataQuality: { 
            completeness: 0, 
            accuracy: 0, 
            timeliness: 0, 
            consistency: 0, 
            overall: 0 
          }
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

// Export singleton instance
export const governmentDataIntegrationService = new GovernmentDataIntegrationService();


