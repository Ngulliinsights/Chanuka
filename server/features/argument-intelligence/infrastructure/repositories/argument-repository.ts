// ============================================================================
// ARGUMENT INTELLIGENCE - Argument Repository
// ============================================================================
// Database access layer for extracted arguments

import { logger } from '../../../../shared/core/index.js';
import { db } from '../../../../shared/core/index.js';

export interface StoredArgument {
  id: string;
  commentId: string;
  billId: string;
  userId: string;
  argumentType: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment';
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  extractedText: string;
  normalizedText: string;
  topicTags: string[];
  affectedGroups: string[];
  extractionConfidence: number;
  evidenceQuality: 'none' | 'weak' | 'moderate' | 'strong';
  parentArgumentId?: string;
  claimId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ArgumentQueryOptions {
  billId?: string;
  userId?: string;
  argumentType?: string;
  position?: string;
  minConfidence?: number;
  topicTags?: string[];
  affectedGroups?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'confidence' | 'evidence_quality';
  sortOrder?: 'asc' | 'desc';
}

export interface ArgumentStatistics {
  totalArguments: number;
  argumentsByType: Record<string, number>;
  argumentsByPosition: Record<string, number>;
  averageConfidence: number;
  topTopicTags: Array<{ tag: string; count: number }>;
  topAffectedGroups: Array<{ group: string; count: number }>;
}

export class ArgumentRepository {
  constructor(private readonly database: typeof db) {}

  /**
   * Store an extracted argument
   */
  async storeArgument(argument: StoredArgument): Promise<void> {
    try {
      await this.database.execute(`
        INSERT INTO arguments (
          id, comment_id, bill_id, user_id, argument_type, position,
          extracted_text, normalized_text, topic_tags, affected_groups,
          extraction_confidence, evidence_quality, parent_argument_id,
          claim_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        argument.id,
        argument.commentId,
        argument.billId,
        argument.userId,
        argument.argumentType,
        argument.position,
        argument.extractedText,
        argument.normalizedText,
        JSON.stringify(argument.topicTags),
        JSON.stringify(argument.affectedGroups),
        argument.extractionConfidence,
        argument.evidenceQuality,
        argument.parentArgumentId || null,
        argument.claimId || null,
        argument.createdAt,
        argument.updatedAt || argument.createdAt
      ]);

      logger.debug(`Stored argument ${argument.id}`, {
        component: 'ArgumentRepository',
        argumentId: argument.id,
        billId: argument.billId
      });

    } catch (error) {
      logger.error(`Failed to store argument`, {
        component: 'ArgumentRepository',
        argumentId: argument.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get arguments by bill ID
   */
  async getArgumentsByBill(billId: string, options: ArgumentQueryOptions = {}): Promise<StoredArgument[]> {
    try {
      const conditions = ['bill_id = ?'];
      const params: any[] = [billId];

      // Add optional filters
      if (options.argumentType) {
        conditions.push('argument_type = ?');
        params.push(options.argumentType);
      }

      if (options.position) {
        conditions.push('position = ?');
        params.push(options.position);
      }

      if (options.minConfidence !== undefined) {
        conditions.push('extraction_confidence >= ?');
        params.push(options.minConfidence);
      }

      if (options.topicTags && options.topicTags.length > 0) {
        const tagConditions = options.topicTags.map(() => 'JSON_EXTRACT(topic_tags, "$") LIKE ?').join(' OR ');
        conditions.push(`(${tagConditions})`);
        options.topicTags.forEach(tag => params.push(`%"${tag}"%`));
      }

      // Build query
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      const query = `
        SELECT * FROM arguments 
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const rows = await this.database.execute(query, params);
      return this.mapRowsToArguments(rows);

    } catch (error) {
      logger.error(`Failed to get arguments by bill`, {
        component: 'ArgumentRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get arguments by user ID
   */
  async getArgumentsByUser(userId: string, options: ArgumentQueryOptions = {}): Promise<StoredArgument[]> {
    try {
      const conditions = ['user_id = ?'];
      const params: any[] = [userId];

      if (options.billId) {
        conditions.push('bill_id = ?');
        params.push(options.billId);
      }

      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'desc';
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      const query = `
        SELECT * FROM arguments 
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);

      const rows = await this.database.execute(query, params);
      return this.mapRowsToArguments(rows);

    } catch (error) {
      logger.error(`Failed to get arguments by user`, {
        component: 'ArgumentRepository',
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Search arguments by text similarity
   */
  async searchArgumentsByText(
    searchText: string,
    billId?: string,
    limit: number = 20
  ): Promise<StoredArgument[]> {
    try {
      const conditions = ['1=1']; // Base condition
      const params: any[] = [];

      if (billId) {
        conditions.push('bill_id = ?');
        params.push(billId);
      }

      // Simple text search using LIKE (in production, would use full-text search)
      conditions.push('(extracted_text LIKE ? OR normalized_text LIKE ?)');
      const searchPattern = `%${searchText}%`;
      params.push(searchPattern, searchPattern);

      const query = `
        SELECT * FROM arguments 
        WHERE ${conditions.join(' AND ')}
        ORDER BY extraction_confidence DESC
        LIMIT ?
      `;

      params.push(limit);

      const rows = await this.database.execute(query, params);
      return this.mapRowsToArguments(rows);

    } catch (error) {
      logger.error(`Failed to search arguments by text`, {
        component: 'ArgumentRepository',
        searchText,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get arguments by topic tags
   */
  async getArgumentsByTopicTags(
    topicTags: string[],
    billId?: string,
    limit: number = 50
  ): Promise<StoredArgument[]> {
    try {
      const conditions = ['1=1'];
      const params: any[] = [];

      if (billId) {
        conditions.push('bill_id = ?');
        params.push(billId);
      }

      // Search for any of the provided topic tags
      if (topicTags.length > 0) {
        const tagConditions = topicTags.map(() => 'JSON_EXTRACT(topic_tags, "$") LIKE ?').join(' OR ');
        conditions.push(`(${tagConditions})`);
        topicTags.forEach(tag => params.push(`%"${tag}"%`));
      }

      const query = `
        SELECT * FROM arguments 
        WHERE ${conditions.join(' AND ')}
        ORDER BY extraction_confidence DESC
        LIMIT ?
      `;

      params.push(limit);

      const rows = await this.database.execute(query, params);
      return this.mapRowsToArguments(rows);

    } catch (error) {
      logger.error(`Failed to get arguments by topic tags`, {
        component: 'ArgumentRepository',
        topicTags,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get arguments by affected groups
   */
  async getArgumentsByAffectedGroups(
    affectedGroups: string[],
    billId?: string,
    limit: number = 50
  ): Promise<StoredArgument[]> {
    try {
      const conditions = ['1=1'];
      const params: any[] = [];

      if (billId) {
        conditions.push('bill_id = ?');
        params.push(billId);
      }

      if (affectedGroups.length > 0) {
        const groupConditions = affectedGroups.map(() => 'JSON_EXTRACT(affected_groups, "$") LIKE ?').join(' OR ');
        conditions.push(`(${groupConditions})`);
        affectedGroups.forEach(group => params.push(`%"${group}"%`));
      }

      const query = `
        SELECT * FROM arguments 
        WHERE ${conditions.join(' AND ')}
        ORDER BY extraction_confidence DESC
        LIMIT ?
      `;

      params.push(limit);

      const rows = await this.database.execute(query, params);
      return this.mapRowsToArguments(rows);

    } catch (error) {
      logger.error(`Failed to get arguments by affected groups`, {
        component: 'ArgumentRepository',
        affectedGroups,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update argument claim association
   */
  async updateArgumentClaimId(argumentId: string, claimId: string): Promise<void> {
    try {
      await this.database.execute(`
        UPDATE arguments 
        SET claim_id = ?, updated_at = ?
        WHERE id = ?
      `, [claimId, new Date(), argumentId]);

      logger.debug(`Updated argument claim association`, {
        component: 'ArgumentRepository',
        argumentId,
        claimId
      });

    } catch (error) {
      logger.error(`Failed to update argument claim ID`, {
        component: 'ArgumentRepository',
        argumentId,
        claimId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete arguments by comment ID
   */
  async deleteArgumentsByComment(commentId: string): Promise<number> {
    try {
      const result = await this.database.execute(`
        DELETE FROM arguments WHERE comment_id = ?
      `, [commentId]);

      const deletedCount = result.changes || 0;

      logger.debug(`Deleted arguments for comment`, {
        component: 'ArgumentRepository',
        commentId,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error(`Failed to delete arguments by comment`, {
        component: 'ArgumentRepository',
        commentId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get argument statistics for a bill
   */
  async getArgumentStatistics(billId: string): Promise<ArgumentStatistics> {
    try {
      // Get total count
      const totalResult = await this.database.execute(`
        SELECT COUNT(*) as total FROM arguments WHERE bill_id = ?
      `, [billId]);
      const totalArguments = totalResult[0]?.total || 0;

      // Get arguments by type
      const typeResult = await this.database.execute(`
        SELECT argument_type, COUNT(*) as count 
        FROM arguments 
        WHERE bill_id = ? 
        GROUP BY argument_type
      `, [billId]);
      const argumentsByType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        argumentsByType[row.argument_type] = row.count;
      });

      // Get arguments by position
      const positionResult = await this.database.execute(`
        SELECT position, COUNT(*) as count 
        FROM arguments 
        WHERE bill_id = ? 
        GROUP BY position
      `, [billId]);
      const argumentsByPosition: Record<string, number> = {};
      positionResult.forEach((row: any) => {
        argumentsByPosition[row.position] = row.count;
      });

      // Get average confidence
      const confidenceResult = await this.database.execute(`
        SELECT AVG(extraction_confidence) as avg_confidence 
        FROM arguments 
        WHERE bill_id = ?
      `, [billId]);
      const averageConfidence = confidenceResult[0]?.avg_confidence || 0;

      // Get top topic tags (simplified - would need proper JSON aggregation in production)
      const topTopicTags: Array<{ tag: string; count: number }> = [];

      // Get top affected groups (simplified)
      const topAffectedGroups: Array<{ group: string; count: number }> = [];

      return {
        totalArguments,
        argumentsByType,
        argumentsByPosition,
        averageConfidence,
        topTopicTags,
        topAffectedGroups
      };

    } catch (error) {
      logger.error(`Failed to get argument statistics`, {
        component: 'ArgumentRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get argument count by bill
   */
  async getArgumentCountByBill(billId: string): Promise<number> {
    try {
      const result = await this.database.execute(`
        SELECT COUNT(*) as count FROM arguments WHERE bill_id = ?
      `, [billId]);

      return result[0]?.count || 0;

    } catch (error) {
      logger.error(`Failed to get argument count`, {
        component: 'ArgumentRepository',
        billId,
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Batch store multiple arguments
   */
  async batchStoreArguments(arguments: StoredArgument[]): Promise<void> {
    if (arguments.length === 0) return;

    try {
      // Use transaction for batch insert
      await this.database.execute('BEGIN TRANSACTION');

      for (const argument of arguments) {
        await this.storeArgument(argument);
      }

      await this.database.execute('COMMIT');

      logger.debug(`Batch stored ${arguments.length} arguments`, {
        component: 'ArgumentRepository',
        count: arguments.length
      });

    } catch (error) {
      await this.database.execute('ROLLBACK');
      
      logger.error(`Failed to batch store arguments`, {
        component: 'ArgumentRepository',
        count: arguments.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods

  private mapRowsToArguments(rows: any[]): StoredArgument[] {
    return rows.map(row => ({
      id: row.id,
      commentId: row.comment_id,
      billId: row.bill_id,
      userId: row.user_id,
      argumentType: row.argument_type,
      position: row.position,
      extractedText: row.extracted_text,
      normalizedText: row.normalized_text,
      topicTags: this.parseJsonArray(row.topic_tags),
      affectedGroups: this.parseJsonArray(row.affected_groups),
      extractionConfidence: row.extraction_confidence,
      evidenceQuality: row.evidence_quality,
      parentArgumentId: row.parent_argument_id,
      claimId: row.claim_id,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    }));
  }

  private parseJsonArray(jsonString: string | null): string[] {
    if (!jsonString) return [];
    
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}