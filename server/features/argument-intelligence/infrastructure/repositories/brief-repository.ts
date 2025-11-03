// ============================================================================
// ARGUMENT INTELLIGENCE - Brief Repository
// ============================================================================
// Database access layer for legislative briefs and bill argument synthesis

import { logger } from '../../../../shared/core/index.js';
import { db } from '../../../../shared/core/index.js';

export interface BillArgumentSynthesis {
  billId: string;
  majorClaims: SynthesizedClaim[];
  evidenceBase: EvidenceAssessment[];
  stakeholderPositions: StakeholderPosition[];
  consensusAreas: string[];
  controversialPoints: string[];
  legislativeBrief: string;
  lastUpdated: Date;
}

export interface SynthesizedClaim {
  claimText: string;
  supportingComments: number;
  opposingComments: number;
  evidenceStrength: number;
  stakeholderGroups: string[];
  representativeQuotes: string[];
}

export interface EvidenceAssessment {
  evidenceType: 'statistical' | 'anecdotal' | 'expert_opinion' | 'legal_precedent' | 'comparative';
  source: string;
  verificationStatus: 'verified' | 'unverified' | 'disputed' | 'false';
  credibilityScore: number;
  citationCount: number;
}

export interface StakeholderPosition {
  stakeholderGroup: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  keyArguments: string[];
  evidenceProvided: string[];
  participantCount: number;
}

export interface StoredBrief {
  id: string;
  billId: string;
  briefType: string;
  targetAudience: string;
  executiveSummary: string;
  keyFindings: string; // JSON
  stakeholderAnalysis: string; // JSON
  evidenceAssessment: string; // JSON
  recommendationsSection: string; // JSON
  appendices: string; // JSON
  metadata: string; // JSON
  generatedAt: Date;
  updatedAt?: Date;
}

export class BriefRepository {
  constructor(private readonly database: typeof db) {}

  /**
   * Store bill argument synthesis
   */
  async storeBillSynthesis(synthesis: BillArgumentSynthesis): Promise<void> {
    try {
      await this.database.execute(`
        INSERT OR REPLACE INTO bill_argument_synthesis (
          bill_id, major_claims, evidence_base, stakeholder_positions,
          consensus_areas, controversial_points, legislative_brief, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        synthesis.billId,
        JSON.stringify(synthesis.majorClaims),
        JSON.stringify(synthesis.evidenceBase),
        JSON.stringify(synthesis.stakeholderPositions),
        JSON.stringify(synthesis.consensusAreas),
        JSON.stringify(synthesis.controversialPoints),
        synthesis.legislativeBrief,
        synthesis.lastUpdated
      ]);

      logger.debug(`Stored bill synthesis`, {
        component: 'BriefRepository',
        billId: synthesis.billId
      });

    } catch (error) {
      logger.error(`Failed to store bill synthesis`, {
        component: 'BriefRepository',
        billId: synthesis.billId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get bill argument synthesis
   */
  async getBillSynthesis(billId: string): Promise<BillArgumentSynthesis | null> {
    try {
      const rows = await this.database.execute(`
        SELECT * FROM bill_argument_synthesis WHERE bill_id = ?
      `, [billId]);

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        billId: row.bill_id,
        majorClaims: this.parseJson(row.major_claims, []),
        evidenceBase: this.parseJson(row.evidence_base, []),
        stakeholderPositions: this.parseJson(row.stakeholder_positions, []),
        consensusAreas: this.parseJson(row.consensus_areas, []),
        controversialPoints: this.parseJson(row.controversial_points, []),
        legislativeBrief: row.legislative_brief,
        lastUpdated: new Date(row.last_updated)
      };

    } catch (error) {
      logger.error(`Failed to get bill synthesis`, {
        component: 'BriefRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Store generated brief
   */
  async storeBrief(brief: StoredBrief): Promise<void> {
    try {
      await this.database.execute(`
        INSERT INTO legislative_briefs (
          id, bill_id, brief_type, target_audience, executive_summary,
          key_findings, stakeholder_analysis, evidence_assessment,
          recommendations_section, appendices, metadata, generated_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        brief.id,
        brief.billId,
        brief.briefType,
        brief.targetAudience,
        brief.executiveSummary,
        brief.keyFindings,
        brief.stakeholderAnalysis,
        brief.evidenceAssessment,
        brief.recommendationsSection,
        brief.appendices,
        brief.metadata,
        brief.generatedAt,
        brief.updatedAt || brief.generatedAt
      ]);

      logger.debug(`Stored legislative brief`, {
        component: 'BriefRepository',
        briefId: brief.id,
        billId: brief.billId
      });

    } catch (error) {
      logger.error(`Failed to store brief`, {
        component: 'BriefRepository',
        briefId: brief.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get brief by ID
   */
  async getBrief(briefId: string): Promise<StoredBrief | null> {
    try {
      const rows = await this.database.execute(`
        SELECT * FROM legislative_briefs WHERE id = ?
      `, [briefId]);

      if (rows.length === 0) return null;

      return this.mapRowToBrief(rows[0]);

    } catch (error) {
      logger.error(`Failed to get brief`, {
        component: 'BriefRepository',
        briefId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get briefs by bill ID
   */
  async getBriefsByBill(
    billId: string,
    briefType?: string,
    limit: number = 10
  ): Promise<StoredBrief[]> {
    try {
      let query = `SELECT * FROM legislative_briefs WHERE bill_id = ?`;
      const params: any[] = [billId];

      if (briefType) {
        query += ` AND brief_type = ?`;
        params.push(briefType);
      }

      query += ` ORDER BY generated_at DESC LIMIT ?`;
      params.push(limit);

      const rows = await this.database.execute(query, params);
      return rows.map(row => this.mapRowToBrief(row));

    } catch (error) {
      logger.error(`Failed to get briefs by bill`, {
        component: 'BriefRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get latest brief for bill
   */
  async getLatestBrief(billId: string, briefType?: string): Promise<StoredBrief | null> {
    try {
      let query = `SELECT * FROM legislative_briefs WHERE bill_id = ?`;
      const params: any[] = [billId];

      if (briefType) {
        query += ` AND brief_type = ?`;
        params.push(briefType);
      }

      query += ` ORDER BY generated_at DESC LIMIT 1`;

      const rows = await this.database.execute(query, params);
      
      if (rows.length === 0) return null;
      return this.mapRowToBrief(rows[0]);

    } catch (error) {
      logger.error(`Failed to get latest brief`, {
        component: 'BriefRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Update brief
   */
  async updateBrief(briefId: string, updates: Partial<StoredBrief>): Promise<void> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (updates.executiveSummary !== undefined) {
        updateFields.push('executive_summary = ?');
        params.push(updates.executiveSummary);
      }

      if (updates.keyFindings !== undefined) {
        updateFields.push('key_findings = ?');
        params.push(updates.keyFindings);
      }

      if (updates.stakeholderAnalysis !== undefined) {
        updateFields.push('stakeholder_analysis = ?');
        params.push(updates.stakeholderAnalysis);
      }

      if (updates.evidenceAssessment !== undefined) {
        updateFields.push('evidence_assessment = ?');
        params.push(updates.evidenceAssessment);
      }

      if (updates.recommendationsSection !== undefined) {
        updateFields.push('recommendations_section = ?');
        params.push(updates.recommendationsSection);
      }

      if (updates.appendices !== undefined) {
        updateFields.push('appendices = ?');
        params.push(updates.appendices);
      }

      if (updates.metadata !== undefined) {
        updateFields.push('metadata = ?');
        params.push(updates.metadata);
      }

      if (updateFields.length === 0) return;

      updateFields.push('updated_at = ?');
      params.push(new Date());
      params.push(briefId);

      const query = `UPDATE legislative_briefs SET ${updateFields.join(', ')} WHERE id = ?`;
      await this.database.execute(query, params);

      logger.debug(`Updated brief`, {
        component: 'BriefRepository',
        briefId,
        fieldsUpdated: updateFields.length - 1
      });

    } catch (error) {
      logger.error(`Failed to update brief`, {
        component: 'BriefRepository',
        briefId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete brief
   */
  async deleteBrief(briefId: string): Promise<void> {
    try {
      await this.database.execute(`
        DELETE FROM legislative_briefs WHERE id = ?
      `, [briefId]);

      logger.debug(`Deleted brief`, {
        component: 'BriefRepository',
        briefId
      });

    } catch (error) {
      logger.error(`Failed to delete brief`, {
        component: 'BriefRepository',
        briefId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get brief statistics
   */
  async getBriefStatistics(): Promise<{
    totalBriefs: number;
    briefsByType: Record<string, number>;
    briefsByAudience: Record<string, number>;
    averageBriefLength: number;
    recentBriefs: number; // Last 30 days
  }> {
    try {
      // Total briefs
      const totalResult = await this.database.execute(`
        SELECT COUNT(*) as total FROM legislative_briefs
      `);
      const totalBriefs = totalResult[0]?.total || 0;

      // Briefs by type
      const typeResult = await this.database.execute(`
        SELECT brief_type, COUNT(*) as count 
        FROM legislative_briefs 
        GROUP BY brief_type
      `);
      const briefsByType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        briefsByType[row.brief_type] = row.count;
      });

      // Briefs by audience
      const audienceResult = await this.database.execute(`
        SELECT target_audience, COUNT(*) as count 
        FROM legislative_briefs 
        GROUP BY target_audience
      `);
      const briefsByAudience: Record<string, number> = {};
      audienceResult.forEach((row: any) => {
        briefsByAudience[row.target_audience] = row.count;
      });

      // Average brief length
      const lengthResult = await this.database.execute(`
        SELECT AVG(LENGTH(executive_summary)) as avg_length 
        FROM legislative_briefs
      `);
      const averageBriefLength = lengthResult[0]?.avg_length || 0;

      // Recent briefs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentResult = await this.database.execute(`
        SELECT COUNT(*) as count 
        FROM legislative_briefs 
        WHERE generated_at >= ?
      `, [thirtyDaysAgo]);
      const recentBriefs = recentResult[0]?.count || 0;

      return {
        totalBriefs,
        briefsByType,
        briefsByAudience,
        averageBriefLength,
        recentBriefs
      };

    } catch (error) {
      logger.error(`Failed to get brief statistics`, {
        component: 'BriefRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalBriefs: 0,
        briefsByType: {},
        briefsByAudience: {},
        averageBriefLength: 0,
        recentBriefs: 0
      };
    }
  }

  /**
   * Search briefs by content
   */
  async searchBriefs(
    searchQuery: string,
    briefType?: string,
    targetAudience?: string,
    limit: number = 20
  ): Promise<StoredBrief[]> {
    try {
      const conditions = ['1=1'];
      const params: any[] = [];

      // Add search condition
      conditions.push('(executive_summary LIKE ? OR key_findings LIKE ?)');
      const searchPattern = `%${searchQuery}%`;
      params.push(searchPattern, searchPattern);

      if (briefType) {
        conditions.push('brief_type = ?');
        params.push(briefType);
      }

      if (targetAudience) {
        conditions.push('target_audience = ?');
        params.push(targetAudience);
      }

      const query = `
        SELECT * FROM legislative_briefs 
        WHERE ${conditions.join(' AND ')}
        ORDER BY generated_at DESC
        LIMIT ?
      `;

      params.push(limit);

      const rows = await this.database.execute(query, params);
      return rows.map(row => this.mapRowToBrief(row));

    } catch (error) {
      logger.error(`Failed to search briefs`, {
        component: 'BriefRepository',
        searchQuery,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get bills needing synthesis update
   */
  async getBillsNeedingSynthesisUpdate(
    hoursThreshold: number = 24
  ): Promise<string[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

      const rows = await this.database.execute(`
        SELECT DISTINCT bill_id 
        FROM arguments 
        WHERE created_at > ? 
        AND bill_id NOT IN (
          SELECT bill_id 
          FROM bill_argument_synthesis 
          WHERE last_updated > ?
        )
      `, [thresholdDate, thresholdDate]);

      return rows.map((row: any) => row.bill_id);

    } catch (error) {
      logger.error(`Failed to get bills needing synthesis update`, {
        component: 'BriefRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Clean up old briefs
   */
  async cleanupOldBriefs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.database.execute(`
        DELETE FROM legislative_briefs 
        WHERE generated_at < ? 
        AND brief_type != 'committee' -- Keep committee briefs longer
      `, [cutoffDate]);

      const deletedCount = result.changes || 0;

      logger.info(`Cleaned up old briefs`, {
        component: 'BriefRepository',
        deletedCount,
        cutoffDate
      });

      return deletedCount;

    } catch (error) {
      logger.error(`Failed to cleanup old briefs`, {
        component: 'BriefRepository',
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  // Private helper methods

  private mapRowToBrief(row: any): StoredBrief {
    return {
      id: row.id,
      billId: row.bill_id,
      briefType: row.brief_type,
      targetAudience: row.target_audience,
      executiveSummary: row.executive_summary,
      keyFindings: row.key_findings,
      stakeholderAnalysis: row.stakeholder_analysis,
      evidenceAssessment: row.evidence_assessment,
      recommendationsSection: row.recommendations_section,
      appendices: row.appendices,
      metadata: row.metadata,
      generatedAt: new Date(row.generated_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }

  private parseJson<T>(jsonString: string | null, defaultValue: T): T {
    if (!jsonString) return defaultValue;
    
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }
}