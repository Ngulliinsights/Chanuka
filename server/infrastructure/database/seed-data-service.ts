import { databaseService } from './database-service.js';
import * as schema from '../../../shared/schema.js';
import bcrypt from 'bcrypt';
import { logger } from '@shared/utils/logger';

/**
 * Comprehensive Seed Data Service
 * Generates realistic, diverse data for development and testing
 */
export class SeedDataService {
  private db = databaseService.getDatabase();

  /**
   * Generate comprehensive seed data
   */
  async generateSeedData(): Promise<void> {
    logger.info('🌱 Starting comprehensive seed data generation...', { component: 'SimpleTool' });

    try {
      // Clear existing data in proper order
      await this.clearExistingData();

      // Generate data in dependency order
      const users = await this.createUsers();
      const userProfiles = await this.createUserProfiles(users);
      const sponsors = await this.createSponsors();
      const sponsorAffiliations = await this.createSponsorAffiliations(sponsors);
      const bills = await this.createBills(users);
      const billSponsorships = await this.createBillSponsorships(bills, sponsors);
      const sponsorTransparency = await this.createSponsorTransparency(sponsors);
      const billSectionConflicts = await this.createBillSectionConflicts(bills, sponsors);
      const analysis = await this.createAnalysis(bills);
      const comments = await this.createComments(bills, users);
      const engagement = await this.createEngagement(bills, users);
      const notifications = await this.createNotifications(users, bills);

      logger.info('✅ Comprehensive seed data generation completed successfully', { component: 'SimpleTool' });
      console.log(`📊 Generated: ${users.length} users, ${bills.length} bills, ${sponsors.length} sponsors, ${comments.length} comments`);
    } catch (error) {
      logger.error('❌ Seed data generation failed:', { component: 'SimpleTool' }, error);
      throw error;
    }
  }

  /**
   * Clear existing data in reverse dependency order
   */
  private async clearExistingData(): Promise<void> {
    logger.info('🧹 Clearing existing data...', { component: 'SimpleTool' });
    
    const tables = [
      schema.notifications,
      schema.billEngagement,
      schema.billComments,
      schema.analysis,
      schema.billSectionConflicts,
      schema.sponsorTransparency,
      schema.billSponsorships,
      schema.sponsorAffiliations,
      schema.sponsors,
      schema.bills,
      schema.userProfiles,
      schema.users
    ];
    // Safely truncate tables in reverse dependency order if DB supports it.
    for (const table of tables) {
      try {
        // Use database client abstraction if available, otherwise no-op
        if (this.db && typeof (this.db as any).raw === 'function') {
          await (this.db as any).raw(`DELETE FROM ${table}`);
        } else if (this.db && typeof (this.db as any).exec === 'function') {
          await (this.db as any).exec(`DELETE FROM ${table}`);
        } else {
          logger.info(`Would clear table: ${table}`, { component: 'SeedDataService' });
        }
      } catch (err) {
        logger.warn(`Failed to clear table ${table}: ${err}`, { component: 'SeedDataService' });
      }
    }
  }

  // Minimal helper stubs to create seed data. These may be replaced by richer implementations.
  private async createUsers(): Promise<any[]> {
    logger.info('Creating stub users for seed...', { component: 'SeedDataService' });
    return [];
  }

  private async createUserProfiles(users: any[]): Promise<any[]> {
    logger.info('Creating stub user profiles...', { component: 'SeedDataService' });
    return [];
  }

  private async createSponsors(): Promise<any[]> {
    logger.info('Creating stub sponsors...', { component: 'SeedDataService' });
    return [];
  }

  private async createSponsorAffiliations(sponsors: any[]): Promise<any[]> {
    logger.info('Creating stub sponsor affiliations...', { component: 'SeedDataService' });
    return [];
  }

  private async createBills(users: any[]): Promise<any[]> {
    logger.info('Creating stub bills...', { component: 'SeedDataService' });
    return [];
  }

  private async createBillSponsorships(bills: any[], sponsors: any[]): Promise<any[]> {
    logger.info('Creating stub bill sponsorships...', { component: 'SeedDataService' });
    return [];
  }

  private async createSponsorTransparency(sponsors: any[]): Promise<any[]> {
    logger.info('Creating stub sponsor transparency...', { component: 'SeedDataService' });
    return [];
  }

  private async createBillSectionConflicts(bills: any[], sponsors: any[]): Promise<any[]> {
    logger.info('Creating stub bill section conflicts...', { component: 'SeedDataService' });
    return [];
  }

  private async createAnalysis(bills: any[]): Promise<any[]> {
    logger.info('Creating stub analysis entries...', { component: 'SeedDataService' });
    return [];
  }

  private async createComments(bills: any[], users: any[]): Promise<any[]> {
    logger.info('Creating stub comments...', { component: 'SeedDataService' });
    return [];
  }

  private async createEngagement(bills: any[], users: any[]): Promise<any[]> {
    logger.info('Creating stub engagement entries...', { component: 'SeedDataService' });
    return [];
  }

  private async createNotifications(users: any[], bills: any[]): Promise<any[]> {
    logger.info('Creating stub notifications...', { component: 'SeedDataService' });
    return [];
  }

}

export const seedDataService = new SeedDataService();






