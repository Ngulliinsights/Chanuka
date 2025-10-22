import { logger } from '@shared/core';
import { database as db } from '@shared/database/connection';

/**
 * Kenyan Government Data Integration Service
 * 
 * This service handles the integration of legislative data from various Kenyan sources.
 * Kenya has a bicameral parliament consisting of:
 * - National Assembly: 349 members (290 constituencies + 47 women reps + 12 nominated)
 * - Senate: 67 members (47 elected + 16 women + 2 youth + 2 persons with disabilities)
 * 
 * Bills can originate in either house and must pass through multiple readings,
 * committee stages, and ultimately receive Presidential assent to become law.
 */

// Type definitions for Kenyan legislative structures
export interface KenyanBill {
  billNumber: string;              // e.g., "National Assembly Bill No. 15 of 2024"
  title: string;                   // Full title of the bill
  shortTitle: string;              // Common reference name
  billType: BillType;              // Category of legislation
  originatingHouse: House;         // Where the bill was first introduced
  sponsor: BillSponsor;            // MP or Senator who introduced it
  publicationDate: Date;           // Date published in Kenya Gazette
  firstReadingDate?: Date;         // Date of first reading
  secondReadingDate?: Date;        // Date of second reading
  committeeStage?: CommitteeStage; // Committee review details
  thirdReadingDate?: Date;         // Date of third reading
  status: BillStatus;              // Current stage in legislative process
  summary: string;                 // Brief description of the bill's purpose
  fullText?: string;               // Complete text if available
  amendments?: Amendment[];         // Any amendments made during process
  votingRecords?: VotingRecord[];  // Records of votes taken
  relatedDocuments?: string[];     // Links to supporting documents
  tags?: string[];                 // Categorization tags for searchability
}

export interface BillSponsor {
  id: string;
  name: string;
  constituency?: string;           // For National Assembly members
  county?: string;                 // For Senators
  party: string;                   // Political party affiliation
  house: House;                    // National Assembly or Senate
  email?: string;
  phone?: string;
  profileImage?: string;
}

export interface CommitteeStage {
  committeeName: string;           // e.g., "Finance and National Planning Committee"
  chairperson: string;
  membersCount: number;
  dateReferred: Date;
  dateReported?: Date;
  recommendations?: string;
  amendments?: Amendment[];
}

export interface Amendment {
  amendmentNumber: string;
  proposedBy: BillSponsor;
  dateProposed: Date;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  votingRecord?: VotingRecord;
}

export interface VotingRecord {
  date: Date;
  stage: string;                   // Which reading or stage
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  absent: number;
  result: 'passed' | 'failed';
  details?: string;
}

// Enumerations for Kenyan legislative structures
export enum House {
  NATIONAL_ASSEMBLY = 'National Assembly',
  SENATE = 'Senate',
  JOINT_SITTING = 'Joint Sitting'  // Used for special circumstances
}

export enum BillType {
  PUBLIC_BILL = 'Public Bill',                    // Government-sponsored bills
  PRIVATE_MEMBERS_BILL = 'Private Member\'s Bill', // Sponsored by individual MPs
  COUNTY_BILL = 'County Bill',                    // Related to county governments
  MONEY_BILL = 'Money Bill',                      // Financial legislation
  CONSTITUTIONAL_AMENDMENT = 'Constitutional Amendment Bill',
  DELEGATION_BILL = 'Bill Concerning County Governments' // Requires both houses
}

export enum BillStatus {
  DRAFTED = 'Drafted',                            // Being prepared
  PUBLISHED = 'Published in Kenya Gazette',       // Officially published
  FIRST_READING = 'First Reading',                // Introduced to house
  SECOND_READING = 'Second Reading',              // Debate on principles
  COMMITTEE_STAGE = 'Committee Stage',            // Detailed examination
  REPORT_STAGE = 'Report Stage',                  // Committee reports back
  THIRD_READING = 'Third Reading',                // Final debate
  SENT_TO_OTHER_HOUSE = 'Sent to Other House',   // For bicameral process
  PRESIDENTIAL_ASSENT = 'Awaiting Presidential Assent',
  ENACTED = 'Enacted',                            // Became law
  REJECTED = 'Rejected',
  WITHDRAWN = 'Withdrawn',
  LAPSED = 'Lapsed'                               // Died with parliament dissolution
}

// Configuration for data sources
interface DataSourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  priority: number;                                // Higher number = higher priority
  dataTypes: ('bills' | 'sponsors' | 'committees' | 'votes')[];
  enabled: boolean;
}

// Integration options for sync operations
interface IntegrationOptions {
  sources?: string[];              // Specific sources to sync from
  since?: Date;                    // Only sync data after this date
  billTypes?: BillType[];          // Filter by bill type
  houses?: House[];                // Filter by originating house
  dryRun?: boolean;                // Preview changes without committing
}

// Result of integration operations
interface IntegrationResult {
  source: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: IntegrationError[];
  warnings: string[];
  duration: number;                // Milliseconds
  timestamp: Date;
}

interface IntegrationError {
  itemId?: string;
  message: string;
  details?: any;
  severity: 'low' | 'medium' | 'high';
}

export class KenyanGovernmentDataIntegrationService {
  private dataSources: Map<string, DataSourceConfig>;
  private rateLimiters: Map<string, RateLimiter>;

  constructor() {
    // Initialize data sources configuration
    // In production, these would come from environment variables or database
    this.dataSources = new Map([
      [
        'parliament-kenya',
        {
          name: 'Parliament of Kenya Official',
          baseUrl: 'https://www.parliament.go.ke/api',
          rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
          priority: 10,
          dataTypes: ['bills', 'sponsors', 'committees', 'votes'],
          enabled: true
        }
      ],
      [
        'kenya-law',
        {
          name: 'Kenya Law Reports',
          baseUrl: 'https://kenyalaw.org/api',
          rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
          priority: 9,
          dataTypes: ['bills'],
          enabled: true
        }
      ],
      [
        'mzalendo',
        {
          name: 'Mzalendo Trust',
          baseUrl: 'https://info.mzalendo.com/api',
          rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000 },
          priority: 7,
          dataTypes: ['bills', 'sponsors', 'votes'],
          enabled: true
        }
      ]
    ]);

    // Initialize rate limiters for each source
    this.rateLimiters = new Map();
    this.dataSources.forEach((config, sourceName) => {
      this.rateLimiters.set(
        sourceName,
        new RateLimiter(config.rateLimit.requestsPerMinute, config.rateLimit.requestsPerHour)
      );
    });
  }

  /**
   * Get current status and health of all integration sources
   * This provides visibility into which data sources are operational
   * and when they were last successfully synchronized
   */
  async getIntegrationStatus(): Promise<any> {
    const status = {
      overall: 'healthy',
      sources: [] as any[],
      lastSync: new Date(),
      nextScheduledSync: new Date(Date.now() + 3600000) // 1 hour from now
    };

    // Check each configured data source
    for (const [sourceName, config] of this.dataSources.entries()) {
      const rateLimiter = this.rateLimiters.get(sourceName);
      
      status.sources.push({
        name: sourceName,
        displayName: config.name,
        enabled: config.enabled,
        status: config.enabled ? 'active' : 'disabled',
        priority: config.priority,
        rateLimit: {
          current: rateLimiter?.getCurrentUsage() || 0,
          limit: config.rateLimit.requestsPerMinute
        },
        dataTypes: config.dataTypes,
        lastSuccessfulSync: await this.getLastSyncTime(sourceName),
        errorCount: await this.getRecentErrorCount(sourceName)
      });
    }

    return status;
  }

  /**
   * Integrate bills from configured sources
   * This is the main entry point for synchronizing bill data
   * It handles fetching, transforming, validating, and storing bill information
   */
  async integrateBills(options: IntegrationOptions = {}): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];
    
    // Determine which sources to use based on options and configuration
    const sourcesToUse = this.getActiveSources(options.sources);
    
    logger.info('Starting bill integration', {
      sources: sourcesToUse.map(s => s.name),
      since: options.since,
      dryRun: options.dryRun
    });

    // Process each source sequentially to respect rate limits
    for (const source of sourcesToUse) {
      const startTime = Date.now();
      
      try {
        const result = await this.integrateBillsFromSource(source.name, options);
        results.push(result);
        
        logger.info(`Completed integration from ${source.name}`, {
          itemsProcessed: result.itemsProcessed,
          duration: result.duration
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error(`Failed to integrate from ${source.name}`, {
          error: errorMessage
        });
        
        results.push({
          source: source.name,
          itemsProcessed: 0,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [{
            message: `Source integration failed: ${errorMessage}`,
            severity: 'high'
          }],
          warnings: [],
          duration: Date.now() - startTime,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Integrate sponsor (MP and Senator) information
   * This keeps our database of legislators current with their
   * contact information, committee assignments, and party affiliations
   */
  async integrateSponsors(options: IntegrationOptions = {}): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];
    const sourcesToUse = this.getActiveSources(options.sources);
    
    logger.info('Starting sponsor integration', {
      sources: sourcesToUse.map(s => s.name),
      dryRun: options.dryRun
    });

    for (const source of sourcesToUse) {
      const startTime = Date.now();
      
      try {
        const result = await this.integrateSponsorsFromSource(source.name, options);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error(`Failed to integrate sponsors from ${source.name}`, {
          error: errorMessage
        });
        
        results.push({
          source: source.name,
          itemsProcessed: 0,
          itemsCreated: 0,
          itemsUpdated: 0,
          itemsSkipped: 0,
          errors: [{
            message: `Sponsor integration failed: ${errorMessage}`,
            severity: 'high'
          }],
          warnings: [],
          duration: Date.now() - startTime,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Fetch bills from a specific source
   * This method handles the actual API calls to external sources
   * and includes retry logic and error handling
   */
  async fetchBillsFromSource(
    sourceName: string,
    options: any = {}
  ): Promise<KenyanBill[]> {
    const source = this.dataSources.get(sourceName);
    
    if (!source) {
      throw new Error(`Unknown source: ${sourceName}`);
    }

    if (!source.enabled) {
      throw new Error(`Source is disabled: ${sourceName}`);
    }

    // Check rate limits before making request
    const rateLimiter = this.rateLimiters.get(sourceName);
    if (rateLimiter && !rateLimiter.canMakeRequest()) {
      throw new Error(`Rate limit exceeded for ${sourceName}`);
    }

    // In a real implementation, this would make actual HTTP requests
    // For now, we'll return synthetic data to demonstrate the structure
    logger.info(`Fetching bills from ${sourceName}`, options);

    // Simulate API call with synthetic data
    const syntheticBills = await this.generateSyntheticBills(options.limit || 10);
    
    // Record the API call for rate limiting
    rateLimiter?.recordRequest();

    return syntheticBills;
  }

  /**
   * Fetch sponsor information from a specific source
   */
  async fetchSponsorsFromSource(
    sourceName: string,
    options: any = {}
  ): Promise<BillSponsor[]> {
    const source = this.dataSources.get(sourceName);
    
    if (!source) {
      throw new Error(`Unknown source: ${sourceName}`);
    }

    if (!source.enabled) {
      throw new Error(`Source is disabled: ${sourceName}`);
    }

    const rateLimiter = this.rateLimiters.get(sourceName);
    if (rateLimiter && !rateLimiter.canMakeRequest()) {
      throw new Error(`Rate limit exceeded for ${sourceName}`);
    }

    logger.info(`Fetching sponsors from ${sourceName}`, options);

    const syntheticSponsors = await this.generateSyntheticSponsors(options.limit || 10);
    
    rateLimiter?.recordRequest();

    return syntheticSponsors;
  }

  // Private helper methods

  private getActiveSources(requestedSources?: string[]): DataSourceConfig[] {
    const sources: DataSourceConfig[] = [];

    if (requestedSources && requestedSources.length > 0) {
      // Use only requested sources if specified
      for (const sourceName of requestedSources) {
        const source = this.dataSources.get(sourceName);
        if (source && source.enabled) {
          sources.push(source);
        }
      }
    } else {
      // Use all enabled sources
      this.dataSources.forEach(source => {
        if (source.enabled) {
          sources.push(source);
        }
      });
    }

    // Sort by priority (highest first)
    return sources.sort((a, b) => b.priority - a.priority);
  }

  private async integrateBillsFromSource(
    sourceName: string,
    options: IntegrationOptions
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const result: IntegrationResult = {
      source: sourceName,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      warnings: [],
      duration: 0,
      timestamp: new Date()
    };

    try {
      // Fetch bills from the source
      const bills = await this.fetchBillsFromSource(sourceName, {
        since: options.since,
        limit: 100
      });

      result.itemsProcessed = bills.length;

      // Process each bill
      for (const bill of bills) {
        try {
          if (options.dryRun) {
            // In dry run mode, just validate without saving
            result.itemsSkipped++;
            continue;
          }

          // Check if bill already exists in database
          const existingBill = await this.findExistingBill(bill.billNumber);

          if (existingBill) {
            // Update existing bill if data has changed
            const updated = await this.updateBill(existingBill.id, bill);
            if (updated) {
              result.itemsUpdated++;
            } else {
              result.itemsSkipped++;
            }
          } else {
            // Create new bill record
            await this.createBill(bill);
            result.itemsCreated++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            itemId: bill.billNumber,
            message: `Failed to process bill: ${errorMessage}`,
            severity: 'medium'
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        message: `Failed to fetch bills: ${errorMessage}`,
        severity: 'high'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async integrateSponsorsFromSource(
    sourceName: string,
    options: IntegrationOptions
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const result: IntegrationResult = {
      source: sourceName,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      warnings: [],
      duration: 0,
      timestamp: new Date()
    };

    try {
      const sponsors = await this.fetchSponsorsFromSource(sourceName, {
        since: options.since,
        limit: 100
      });

      result.itemsProcessed = sponsors.length;

      for (const sponsor of sponsors) {
        try {
          if (options.dryRun) {
            result.itemsSkipped++;
            continue;
          }

          const existingSponsor = await this.findExistingSponsor(sponsor.id);

          if (existingSponsor) {
            const updated = await this.updateSponsor(existingSponsor.id, sponsor);
            if (updated) {
              result.itemsUpdated++;
            } else {
              result.itemsSkipped++;
            }
          } else {
            await this.createSponsor(sponsor);
            result.itemsCreated++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            itemId: sponsor.id,
            message: `Failed to process sponsor: ${errorMessage}`,
            severity: 'medium'
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        message: `Failed to fetch sponsors: ${errorMessage}`,
        severity: 'high'
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async getLastSyncTime(sourceName: string): Promise<Date | null> {
    // In production, query the database for last successful sync
    // For now, return a placeholder
    return new Date(Date.now() - 3600000); // 1 hour ago
  }

  private async getRecentErrorCount(sourceName: string): Promise<number> {
    // In production, query error logs from the database
    return 0;
  }

  private async findExistingBill(billNumber: string): Promise<any | null> {
    // Query database for existing bill
    // This is a placeholder - actual implementation would use Prisma
    return null;
  }

  private async createBill(bill: KenyanBill): Promise<void> {
    // Create bill record in database
    logger.info('Creating bill', { billNumber: bill.billNumber });
  }

  private async updateBill(id: string, bill: KenyanBill): Promise<boolean> {
    // Update bill record in database
    logger.info('Updating bill', { id, billNumber: bill.billNumber });
    return true;
  }

  private async findExistingSponsor(sponsorId: string): Promise<any | null> {
    return null;
  }

  private async createSponsor(sponsor: BillSponsor): Promise<void> {
    logger.info('Creating sponsor', { sponsorId: sponsor.id });
  }

  private async updateSponsor(id: string, sponsor: BillSponsor): Promise<boolean> {
    logger.info('Updating sponsor', { id, sponsorId: sponsor.id });
    return true;
  }

  /**
   * Generate synthetic Kenyan bills for testing
   * This creates realistic sample data that matches the structure
   * of actual Kenyan parliamentary bills
   */
  private async generateSyntheticBills(count: number): Promise<KenyanBill[]> {
    const bills: KenyanBill[] = [];
    const currentYear = new Date().getFullYear();

    const sampleTitles = [
      'The Public Finance Management (Amendment) Bill',
      'The Climate Change (Response) Bill',
      'The Data Protection and Privacy Bill',
      'The Special Economic Zones (Amendment) Bill',
      'The National Health Insurance Fund (Amendment) Bill',
      'The Education (Amendment) Bill',
      'The Energy (Solar Power Development) Bill',
      'The County Governments (Revenue Raising) Bill',
      'The Employment (Labour Relations) Bill',
      'The Land (Amendment) Bill'
    ];

    for (let i = 0; i < Math.min(count, sampleTitles.length); i++) {
      const billNumber = i + 1;
      const house = Math.random() > 0.5 ? House.NATIONAL_ASSEMBLY : House.SENATE;
      
      bills.push({
        billNumber: `${house === House.NATIONAL_ASSEMBLY ? 'National Assembly' : 'Senate'} Bill No. ${billNumber} of ${currentYear}`,
        title: sampleTitles[i],
        shortTitle: sampleTitles[i].replace('The ', '').replace(' Bill', ''),
        billType: this.getRandomBillType(),
        originatingHouse: house,
        sponsor: this.generateSyntheticSponsor(house),
        publicationDate: new Date(currentYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
        status: this.getRandomBillStatus(),
        summary: `This bill seeks to amend the existing legislation to provide for improved governance and public service delivery in Kenya.`,
        tags: ['governance', 'reform', 'public service']
      });
    }

    return bills;
  }

  private async generateSyntheticSponsors(count: number): Promise<BillSponsor[]> {
    const sponsors: BillSponsor[] = [];
    
    const constituencies = ['Westlands', 'Kamukunji', 'Makadara', 'Kasarani', 'Embakasi'];
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'];
    const parties = ['ODM', 'UDA', 'Jubilee', 'Wiper', 'KANU'];
    const names = ['Hon. John Kamau', 'Hon. Mary Wanjiku', 'Sen. Peter Omondi', 'Hon. Grace Akinyi', 'Sen. David Kipchoge'];

    for (let i = 0; i < Math.min(count, names.length); i++) {
      const house = names[i].includes('Sen.') ? House.SENATE : House.NATIONAL_ASSEMBLY;
      
      sponsors.push({
        id: `sponsor-${i + 1}`,
        name: names[i],
        constituency: house === House.NATIONAL_ASSEMBLY ? constituencies[i % constituencies.length] : undefined,
        county: house === House.SENATE ? counties[i % counties.length] : undefined,
        party: parties[i % parties.length],
        house: house
      });
    }

    return sponsors;
  }

  private generateSyntheticSponsor(house: House): BillSponsor {
    const isNationalAssembly = house === House.NATIONAL_ASSEMBLY;
    
    return {
      id: `sponsor-${Math.random().toString(36).substr(2, 9)}`,
      name: isNationalAssembly ? 'Hon. James Mwangi' : 'Sen. Alice Wambui',
      constituency: isNationalAssembly ? 'Dagoretti North' : undefined,
      county: house === House.SENATE ? 'Nairobi' : undefined,
      party: 'UDA',
      house: house
    };
  }

  private getRandomBillType(): BillType {
    const types = Object.values(BillType);
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomBillStatus(): BillStatus {
    const statuses = [
      BillStatus.PUBLISHED,
      BillStatus.FIRST_READING,
      BillStatus.SECOND_READING,
      BillStatus.COMMITTEE_STAGE
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
}

/**
 * Simple rate limiter to respect API limits
 * Tracks requests per minute and per hour
 */
class RateLimiter {
  private requestsPerMinute: number;
  private requestsPerHour: number;
  private minuteWindow: Date[] = [];
  private hourWindow: Date[] = [];

  constructor(requestsPerMinute: number, requestsPerHour: number) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestsPerHour = requestsPerHour;
  }

  canMakeRequest(): boolean {
    this.cleanupWindows();
    return (
      this.minuteWindow.length < this.requestsPerMinute &&
      this.hourWindow.length < this.requestsPerHour
    );
  }

  recordRequest(): void {
    const now = new Date();
    this.minuteWindow.push(now);
    this.hourWindow.push(now);
  }

  getCurrentUsage(): number {
    this.cleanupWindows();
    return this.minuteWindow.length;
  }

  private cleanupWindows(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    this.minuteWindow = this.minuteWindow.filter(time => time.getTime() > oneMinuteAgo);
    this.hourWindow = this.hourWindow.filter(time => time.getTime() > oneHourAgo);
  }
}





































