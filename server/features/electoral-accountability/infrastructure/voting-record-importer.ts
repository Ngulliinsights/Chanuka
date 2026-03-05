/**
 * Voting Record Importer - Data Import Scripts
 * 
 * Utilities for importing historical voting records from various sources
 */

import { votingRecordRepository } from './voting-record.repository';
import type { NewVotingRecord } from '@server/infrastructure/schema/electoral_accountability';
import { logger } from '@server/infrastructure/observability';

export interface VotingRecordImportData {
  billId: string;
  sponsorId: string;
  vote: 'yes' | 'no' | 'abstain' | 'absent';
  voteDate: Date;
  chamber: 'national_assembly' | 'senate' | 'county_assembly' | 'both';
  readingStage?: string;
  county: string;
  constituency: string;
  ward?: string;
  sessionNumber?: string;
  hansardReference?: string;
  videoTimestamp?: string;
  sourceUrl?: string;
}

export class VotingRecordImporter {
  /**
   * Import voting records from CSV data
   */
  async importFromCSV(csvData: string): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { imported: 0, failed: 0, errors: ['No data to import'] };
    }
    
    const firstLine = lines[0];
    if (!firstLine) {
      return { imported: 0, failed: 0, errors: ['Missing header line'] };
    }
    
    const headers = firstLine.split(',').map(h => h.trim());
    
    const records: NewVotingRecord[] = [];
    const errors: string[] = [];
    let failed = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line) {
          failed++;
          errors.push(`Line ${i + 1}: Empty line`);
          continue;
        }
        
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate required fields
        if (!row.bill_id || !row.sponsor_id || !row.vote_date || !row.constituency) {
          failed++;
          errors.push(`Line ${i + 1}: Missing required fields`);
          continue;
        }

        const record: NewVotingRecord = {
          bill_id: row.bill_id,
          sponsor_id: row.sponsor_id,
          vote: row.vote as 'yes' | 'no' | 'abstain' | 'absent',
          vote_date: new Date(row.vote_date),
          chamber: row.chamber as 'national_assembly' | 'senate' | 'county_assembly' | 'both',
          reading_stage: row.reading_stage || null,
          county: row.county as any,
          constituency: row.constituency,
          ward: row.ward || null,
          session_number: row.session_number || null,
          hansard_reference: row.hansard_reference || null,
          video_timestamp: row.video_timestamp || null,
          source_url: row.source_url || null,
          days_until_next_election: row.days_until_next_election ? parseInt(row.days_until_next_election) : null,
          election_cycle: row.election_cycle || null,
        };

        records.push(record);
      } catch (error) {
        failed++;
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Bulk import
    if (records.length > 0) {
      try {
        await votingRecordRepository.createMany(records);
        logger.info({ count: records.length }, 'Voting records imported from CSV');
      } catch (error) {
        logger.error({ error }, 'Failed to bulk import voting records');
        throw error;
      }
    }

    return {
      imported: records.length,
      failed,
      errors,
    };
  }

  /**
   * Import voting records from JSON array
   */
  async importFromJSON(jsonData: VotingRecordImportData[]): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const records: NewVotingRecord[] = [];
    const errors: string[] = [];
    let failed = 0;

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const data = jsonData[i];
        
        if (!data) {
          failed++;
          errors.push(`Record ${i + 1}: Empty record`);
          continue;
        }
        
        // Validate required fields
        if (!data.billId || !data.sponsorId || !data.constituency) {
          failed++;
          errors.push(`Record ${i + 1}: Missing required fields`);
          continue;
        }
        
        const record: NewVotingRecord = {
          bill_id: data.billId,
          sponsor_id: data.sponsorId,
          vote: data.vote,
          vote_date: data.voteDate,
          chamber: data.chamber,
          reading_stage: data.readingStage || null,
          county: data.county as any,
          constituency: data.constituency,
          ward: data.ward || null,
          session_number: data.sessionNumber || null,
          hansard_reference: data.hansardReference || null,
          video_timestamp: data.videoTimestamp || null,
          source_url: data.sourceUrl || null,
        };

        records.push(record);
      } catch (error) {
        failed++;
        errors.push(`Record ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Bulk import
    if (records.length > 0) {
      try {
        await votingRecordRepository.createMany(records);
        logger.info({ count: records.length }, 'Voting records imported from JSON');
      } catch (error) {
        logger.error({ error }, 'Failed to bulk import voting records');
        throw error;
      }
    }

    return {
      imported: records.length,
      failed,
      errors,
    };
  }

  /**
   * Import single voting record
   */
  async importSingle(data: VotingRecordImportData): Promise<void> {
    const record: NewVotingRecord = {
      bill_id: data.billId,
      sponsor_id: data.sponsorId,
      vote: data.vote,
      vote_date: data.voteDate,
      chamber: data.chamber,
      reading_stage: data.readingStage || null,
      county: data.county as any,
      constituency: data.constituency,
      ward: data.ward || null,
      session_number: data.sessionNumber || null,
      hansard_reference: data.hansardReference || null,
      video_timestamp: data.videoTimestamp || null,
      source_url: data.sourceUrl || null,
    };

    await votingRecordRepository.create(record);
    logger.info({ billId: data.billId, sponsorId: data.sponsorId }, 'Single voting record imported');
  }

  /**
   * Calculate days until next election for existing records
   * This should be run periodically to update the electoral context
   */
  async updateElectoralContext(nextElectionDate: Date): Promise<number> {
    // TODO: Implement bulk update of days_until_next_election
    // This would require a custom SQL query or batch updates
    logger.info({ nextElectionDate }, 'Electoral context update requested');
    return 0;
  }
}

export const votingRecordImporter = new VotingRecordImporter();
