import { databaseService } from './database-service.js';
import * as schema from '../../../shared/schema.js';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

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
      sch






