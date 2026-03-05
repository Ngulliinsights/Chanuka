/**
 * Voting Record Repository - Infrastructure Layer
 * 
 * Data access layer for voting records
 */

import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { db } from '@server/infrastructure/database';
import {
  voting_records,
  type VotingRecord,
  type NewVotingRecord,
} from '@server/infrastructure/schema/electoral_accountability';
import { logger } from '@server/infrastructure/observability';

export class VotingRecordRepository {
  /**
   * Create a new voting record
   */
  async create(data: NewVotingRecord): Promise<VotingRecord> {
    const records = await db.insert(voting_records).values(data).returning();
    
    if (!records || records.length === 0) {
      throw new Error('Failed to create voting record');
    }

    const record = records[0];
    
    if (!record) {
      throw new Error('Failed to create voting record - no record returned');
    }
    
    logger.info({
      recordId: record.id,
      billId: data.bill_id,
      sponsorId: data.sponsor_id,
      constituency: data.constituency,
    }, 'Voting record created');

    return record;
  }

  /**
   * Bulk create voting records (for batch imports)
   */
  async createMany(records: NewVotingRecord[]): Promise<VotingRecord[]> {
    if (records.length === 0) {
      return [];
    }

    const created = await db.insert(voting_records).values(records).returning();
    
    logger.info({
      count: created.length,
    }, 'Voting records bulk created');

    return created;
  }

  /**
   * Get voting record by ID
   */
  async findById(id: string): Promise<VotingRecord | null> {
    const record = await db.query.voting_records.findFirst({
      where: eq(voting_records.id, id),
    });

    return record || null;
  }

  /**
   * Get all voting records for a bill
   */
  async findByBill(billId: string): Promise<VotingRecord[]> {
    return db.query.voting_records.findMany({
      where: eq(voting_records.bill_id, billId),
      orderBy: [desc(voting_records.vote_date)],
    });
  }

  /**
   * Get all voting records for an MP
   */
  async findBySponsor(
    sponsorId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      constituency?: string;
    }
  ): Promise<VotingRecord[]> {
    const conditions = [eq(voting_records.sponsor_id, sponsorId)];

    if (options?.startDate) {
      conditions.push(gte(voting_records.vote_date, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(voting_records.vote_date, options.endDate));
    }

    if (options?.constituency) {
      conditions.push(eq(voting_records.constituency, options.constituency));
    }

    return db.query.voting_records.findMany({
      where: and(...conditions),
      orderBy: [desc(voting_records.vote_date)],
    });
  }

  /**
   * Get all voting records for a constituency
   */
  async findByConstituency(
    constituency: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<VotingRecord[]> {
    const conditions = [eq(voting_records.constituency, constituency)];

    if (options?.startDate) {
      conditions.push(gte(voting_records.vote_date, options.startDate));
    }

    if (options?.endDate) {
      conditions.push(lte(voting_records.vote_date, options.endDate));
    }

    return db.query.voting_records.findMany({
      where: and(...conditions),
      orderBy: [desc(voting_records.vote_date)],
    });
  }

  /**
   * Update voting record
   */
  async update(id: string, data: Partial<NewVotingRecord>): Promise<VotingRecord | null> {
    const updated = await db
      .update(voting_records)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(voting_records.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      return null;
    }

    const record = updated[0];
    
    if (!record) {
      return null;
    }

    logger.info({ recordId: id }, 'Voting record updated');

    return record;
  }

  /**
   * Delete voting record
   */
  async delete(id: string): Promise<void> {
    await db.delete(voting_records).where(eq(voting_records.id, id));
    
    logger.info({ recordId: id }, 'Voting record deleted');
  }

  /**
   * Get voting statistics for a constituency
   */
  async getConstituencyStats(constituency: string): Promise<{
    totalVotes: number;
    yesVotes: number;
    noVotes: number;
    abstentions: number;
    absences: number;
  }> {
    const records = await this.findByConstituency(constituency);

    return {
      totalVotes: records.length,
      yesVotes: records.filter(r => r.vote === 'yes').length,
      noVotes: records.filter(r => r.vote === 'no').length,
      abstentions: records.filter(r => r.vote === 'abstain').length,
      absences: records.filter(r => r.vote === 'absent').length,
    };
  }

  /**
   * Get voting statistics for an MP
   */
  async getSponsorStats(sponsorId: string): Promise<{
    totalVotes: number;
    yesVotes: number;
    noVotes: number;
    abstentions: number;
    absences: number;
    averageAlignment: number;
  }> {
    const records = await this.findBySponsor(sponsorId);

    const totalAlignment = records.reduce((sum, record) => {
      return sum + (parseFloat(record.alignment_with_constituency || '0'));
    }, 0);

    return {
      totalVotes: records.length,
      yesVotes: records.filter(r => r.vote === 'yes').length,
      noVotes: records.filter(r => r.vote === 'no').length,
      abstentions: records.filter(r => r.vote === 'abstain').length,
      absences: records.filter(r => r.vote === 'absent').length,
      averageAlignment: records.length > 0 ? totalAlignment / records.length : 0,
    };
  }
}

export const votingRecordRepository = new VotingRecordRepository();
