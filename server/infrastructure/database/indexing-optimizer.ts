/**
 * Database Indexing Optimizer
 * 
 * Analyzes query patterns and optimizes database indexes for:
 * - Search and filtering performance
 * - Real-time query optimization
 * - Index usage monitoring
 * - Automatic index recommendations
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '@shared/core';

export interface IndexAnalysis {
  indexName: string;
  tableName: string;
  columns: string[];
  indexType: string;
  size: number;
  usage: IndexUsageStats;
  recommendation: IndexRecommendation;
}

export interface IndexUsageStats {
  scans: number;
  tuplesRead: number;
  tuplesReturned: number;
  efficiency: number;
  lastUsed: Date | null;
}

export interface IndexRecommendation {
  action: 'keep' | 'drop' | 'rebuild' | 'modify';
  reason: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface QueryPattern {
  query: string;
  frequency: number;
  avgExecutionTime: number;
  tables: string[];
  whereColumns: string[];
  orderByColumns: string[];
  joinColumns: string[];
}

export interface IndexOptimizationReport {
  timestamp: Date;
  totalIndexes: number;
  unusedIndexes: number;
  missingIndexes: MissingIndexSuggestion[];
  recommendations: IndexAnalysis[];
  performanceImpact: string;
}

export interface MissingIndexSuggestion {
  tableName: string;
  columns: string[];
  indexType: string;
  reason: string;
  estimatedBenefit: string;
  priority: 'low' | 'medium' | 'high';
}

export class DatabaseIndexingOptimizer {
  private pool: Pool;
  private queryPatterns: Map<string, QueryPattern> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Analyze all indexes and provide optimization recommendations
   */
  async analyzeIndexes(): Promise<IndexOptimizationReport> {
    const client = await this.pool.connect();
    
    try {
      logger.info('Starting database index analysis', {
        component: 'IndexOptimizer'
      });

      // Get all indexes
      const indexes = await this.getAllIndexes(client);
      
      // Analyze each index
      const recommendations: IndexAnalysis[] = [];
      let unusedCount = 0;

      for (const index of indexes) {
        const analysis = await this.analyzeIndex(client, index);
        recommendations.push(analysis);
        
        if (analysis.recommendation.action === 'drop') {
          unusedCount++;
        }
      }

      // Find missing indexes
      const missingIndexes = await this.findMissingIndexes(client);

      // Calculate performance impact
      const performanceImpact = this.calculatePerformanceImpact(recommendations, missingIndexes);

      const report: IndexOptimizationReport = {
        timestamp: new Date(),
        totalIndexes: indexes.length,
        unusedIndexes: unusedCount,
        missingIndexes,
        recommendations,
        performanceImpact
      };

      logger.info('Index analysis completed', {
        component: 'IndexOptimizer',
        totalIndexes: report.totalIndexes,
        unusedIndexes: report.unusedIndexes,
        missingIndexes: report.missingIndexes.length
      });

      return report;

    } finally {
      client.release();
    }
  }

  /**
   * Get all indexes in the database
   */
  private async getAllIndexes(client: PoolClient): Promise<any[]> {
    const result = await client.query(`
      SELECT 
        i.indexname,
        i.tablename,
        i.indexdef,
        pg_relation_size(c.oid) as size_bytes,
        am.amname as index_type
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_am am ON am.oid = c.relam
      WHERE i.schemaname = 'public'
        AND i.indexname NOT LIKE 'pg_%'
      ORDER BY i.tablename, i.indexname
    `);

    return result.rows.map(row => ({
      indexName: row.indexname,
      tableName: row.tablename,
      definition: row.indexdef,
      size: parseInt(row.size_bytes),
      indexType: row.index_type,
      columns: this.extractColumnsFromDefinition(row.indexdef)
    }));
  }

  /**
   * Analyze a specific index
   */
  private async analyzeIndex(client: PoolClient, index: any): Promise<IndexAnalysis> {
    // Get index usage statistics
    const usageStats = await this.getIndexUsageStats(client, index.indexName);
    
    // Generate recommendation
    const recommendation = this.generateIndexRecommendation(index, usageStats);

    return {
      indexName: index.indexName,
      tableName: index.tableName,
      columns: index.columns,
      indexType: index.indexType,
      size: index.size,
      usage: usageStats,
      recommendation
    };
  }

  /**
   * Get index usage statistics
   */
  private async getIndexUsageStats(client: PoolClient, indexName: string): Promise<IndexUsageStats> {
    const result = await client.query(`
      SELECT 
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
          WHEN idx_tup_read > 0 THEN (idx_tup_fetch::float / idx_tup_read::float) * 100
          ELSE 0
        END as efficiency
      FROM pg_stat_user_indexes 
      WHERE indexrelname = $1
    `, [indexName]);

    if (result.rows.length === 0) {
      return {
        scans: 0,
        tuplesRead: 0,
        tuplesReturned: 0,
        efficiency: 0,
        lastUsed: null
      };
    }

    const row = result.rows[0];
    return {
      scans: parseInt(row.idx_scan) || 0,
      tuplesRead: parseInt(row.idx_tup_read) || 0,
      tuplesReturned: parseInt(row.idx_tup_fetch) || 0,
      efficiency: parseFloat(row.efficiency) || 0,
      lastUsed: null // PostgreSQL doesn't track last usage time by default
    };
  }

  /**
   * Generate recommendation for an index
   */
  private generateIndexRecommendation(index: any, usage: IndexUsageStats): IndexRecommendation {
    // Check if index is unused
    if (usage.scans === 0) {
      return {
        action: 'drop',
        reason: 'Index has never been used',
        priority: 'medium',
        estimatedImpact: `Save ${this.formatBytes(index.size)} storage space`
      };
    }

    // Check if index is inefficient
    if (usage.efficiency < 10 && usage.scans > 0) {
      return {
        action: 'rebuild',
        reason: `Low efficiency (${usage.efficiency.toFixed(1)}%)`,
        priority: 'high',
        estimatedImpact: 'Improve query performance by rebuilding index'
      };
    }

    // Check if index is rarely used but large
    if (usage.scans < 10 && index.size > 10 * 1024 * 1024) { // 10MB
      return {
        action: 'drop',
        reason: 'Large index with minimal usage',
        priority: 'low',
        estimatedImpact: `Save ${this.formatBytes(index.size)} storage space`
      };
    }

    // Index appears to be useful
    return {
      action: 'keep',
      reason: `Good usage pattern (${usage.scans} scans, ${usage.efficiency.toFixed(1)}% efficiency)`,
      priority: 'low',
      estimatedImpact: 'Continue providing query optimization'
    };
  }

  /**
   * Find missing indexes based on query patterns
   */
  private async findMissingIndexes(client: PoolClient): Promise<MissingIndexSuggestion[]> {
    const suggestions: MissingIndexSuggestion[] = [];

    // Analyze slow queries for missing indexes
    const slowQueries = await this.getSlowQueries(client);
    
    for (const query of slowQueries) {
      const missingSuggestions = await this.analyzeMissingIndexesForQuery(client, query);
      suggestions.push(...missingSuggestions);
    }

    // Add Chanuka-specific index suggestions
    const chanukaSpecific = await this.getChanukaSpecificIndexSuggestions(client);
    suggestions.push(...chanukaSpecific);

    // Remove duplicates and prioritize
    return this.deduplicateAndPrioritize(suggestions);
  }

  /**
   * Get slow queries from pg_stat_statements
   */
  private async getSlowQueries(client: PoolClient): Promise<any[]> {
    try {
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_exec_time > 100 -- queries taking more than 100ms on average
          AND calls > 10 -- called more than 10 times
        ORDER BY mean_exec_time DESC
        LIMIT 20
      `);

      return result.rows;
    } catch (error) {
      // pg_stat_statements extension might not be enabled
      logger.warn('pg_stat_statements not available, using alternative analysis', {
        component: 'IndexOptimizer'
      });
      return [];
    }
  }

  /**
   * Analyze missing indexes for a specific query
   */
  private async analyzeMissingIndexesForQuery(client: PoolClient, query: any): Promise<MissingIndexSuggestion[]> {
    const suggestions: MissingIndexSuggestion[] = [];

    // This is a simplified analysis - in production, you'd want more sophisticated query parsing
    const queryText = query.query.toLowerCase();

    // Look for WHERE clauses that might benefit from indexes
    if (queryText.includes('where') && queryText.includes('bills')) {
      if (queryText.includes('status') && !await this.indexExists(client, 'bills', ['status'])) {
        suggestions.push({
          tableName: 'bills',
          columns: ['status'],
          indexType: 'btree',
          reason: 'Frequent filtering by bill status',
          estimatedBenefit: 'Improve bill filtering queries by 60-80%',
          priority: 'high'
        });
      }

      if (queryText.includes('sponsor_id') && !await this.indexExists(client, 'bills', ['sponsor_id'])) {
        suggestions.push({
          tableName: 'bills',
          columns: ['sponsor_id'],
          indexType: 'btree',
          reason: 'Frequent filtering by sponsor',
          estimatedBenefit: 'Improve sponsor-based queries by 70-90%',
          priority: 'high'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get Chanuka-specific index suggestions
   */
  private async getChanukaSpecificIndexSuggestions(client: PoolClient): Promise<MissingIndexSuggestion[]> {
    const suggestions: MissingIndexSuggestion[] = [];

    // Check for common Chanuka query patterns
    const chanukaIndexes = [
      {
        table: 'bills',
        columns: ['status', 'introduced_date'],
        reason: 'Common filtering pattern for active bills',
        priority: 'high' as const
      },
      {
        table: 'bills',
        columns: ['affected_counties'],
        indexType: 'gin',
        reason: 'Array column for geographic filtering',
        priority: 'high' as const
      },
      {
        table: 'comments',
        columns: ['bill_id', 'created_at'],
        reason: 'Recent comments on bills',
        priority: 'medium' as const
      },
      {
        table: 'bill_engagement',
        columns: ['user_id', 'engagement_type'],
        reason: 'User engagement tracking',
        priority: 'medium' as const
      },
      {
        table: 'notifications',
        columns: ['user_id', 'is_read', 'created_at'],
        reason: 'Unread notifications query',
        priority: 'high' as const
      },
      {
        table: 'user_profiles',
        columns: ['county', 'is_id_verified'],
        reason: 'Geographic and verification filtering',
        priority: 'medium' as const
      }
    ];

    for (const indexSpec of chanukaIndexes) {
      const exists = await this.indexExists(client, indexSpec.table, indexSpec.columns);
      if (!exists) {
        suggestions.push({
          tableName: indexSpec.table,
          columns: indexSpec.columns,
          indexType: indexSpec.indexType || 'btree',
          reason: indexSpec.reason,
          estimatedBenefit: 'Improve Chanuka-specific query performance',
          priority: indexSpec.priority
        });
      }
    }

    return suggestions;
  }

  /**
   * Check if an index exists for specific columns
   */
  private async indexExists(client: PoolClient, tableName: string, columns: string[]): Promise<boolean> {
    const result = await client.query(`
      SELECT 1
      FROM pg_indexes 
      WHERE tablename = $1 
        AND indexdef ILIKE $2
    `, [tableName, `%${columns.join('%')}%`]);

    return result.rows.length > 0;
  }

  /**
   * Deduplicate and prioritize suggestions
   */
  private deduplicateAndPrioritize(suggestions: MissingIndexSuggestion[]): MissingIndexSuggestion[] {
    const seen = new Set<string>();
    const unique: MissingIndexSuggestion[] = [];

    for (const suggestion of suggestions) {
      const key = `${suggestion.tableName}:${suggestion.columns.join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return unique.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Apply index optimizations
   */
  async applyOptimizations(report: IndexOptimizationReport, options: {
    dropUnused: boolean;
    createMissing: boolean;
    rebuildInefficient: boolean;
  }): Promise<{ applied: number; errors: string[] }> {
    const client = await this.pool.connect();
    let applied = 0;
    const errors: string[] = [];

    try {
      await client.query('BEGIN');

      // Drop unused indexes
      if (options.dropUnused) {
        for (const rec of report.recommendations) {
          if (rec.recommendation.action === 'drop') {
            try {
              await client.query(`DROP INDEX IF EXISTS ${rec.indexName}`);
              applied++;
              logger.info(`Dropped unused index: ${rec.indexName}`, {
                component: 'IndexOptimizer'
              });
            } catch (error) {
              const errorMsg = `Failed to drop index ${rec.indexName}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
              logger.error(errorMsg, { component: 'IndexOptimizer' });
            }
          }
        }
      }

      // Create missing indexes
      if (options.createMissing) {
        for (const missing of report.missingIndexes) {
          if (missing.priority === 'high') {
            try {
              const indexName = `idx_${missing.tableName}_${missing.columns.join('_')}`;
              const sql = `CREATE INDEX CONCURRENTLY ${indexName} ON ${missing.tableName} USING ${missing.indexType} (${missing.columns.join(', ')})`;
              
              await client.query(sql);
              applied++;
              logger.info(`Created missing index: ${indexName}`, {
                component: 'IndexOptimizer'
              });
            } catch (error) {
              const errorMsg = `Failed to create index on ${missing.tableName}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
              logger.error(errorMsg, { component: 'IndexOptimizer' });
            }
          }
        }
      }

      // Rebuild inefficient indexes
      if (options.rebuildInefficient) {
        for (const rec of report.recommendations) {
          if (rec.recommendation.action === 'rebuild') {
            try {
              await client.query(`REINDEX INDEX ${rec.indexName}`);
              applied++;
              logger.info(`Rebuilt inefficient index: ${rec.indexName}`, {
                component: 'IndexOptimizer'
              });
            } catch (error) {
              const errorMsg = `Failed to rebuild index ${rec.indexName}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
              logger.error(errorMsg, { component: 'IndexOptimizer' });
            }
          }
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      const errorMsg = `Transaction failed: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      logger.error(errorMsg, { component: 'IndexOptimizer' });
    } finally {
      client.release();
    }

    return { applied, errors };
  }

  /**
   * Extract columns from index definition
   */
  private extractColumnsFromDefinition(definition: string): string[] {
    const match = definition.match(/\((.*?)\)/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(col => col.trim().replace(/"/g, ''))
      .filter(col => col.length > 0);
  }

  /**
   * Calculate performance impact
   */
  private calculatePerformanceImpact(recommendations: IndexAnalysis[], missingIndexes: MissingIndexSuggestion[]): string {
    const unusedCount = recommendations.filter(r => r.recommendation.action === 'drop').length;
    const inefficientCount = recommendations.filter(r => r.recommendation.action === 'rebuild').length;
    const highPriorityMissing = missingIndexes.filter(m => m.priority === 'high').length;

    if (highPriorityMissing > 0) {
      return `High impact: ${highPriorityMissing} critical missing indexes could significantly improve performance`;
    } else if (inefficientCount > 0) {
      return `Medium impact: ${inefficientCount} indexes need rebuilding for optimal performance`;
    } else if (unusedCount > 0) {
      return `Low impact: ${unusedCount} unused indexes can be removed to save storage`;
    } else {
      return 'Minimal impact: Database indexes are well optimized';
    }
  }

  /**
   * Format bytes for human reading
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
let indexOptimizer: DatabaseIndexingOptimizer | null = null;

export function createIndexOptimizer(pool: Pool): DatabaseIndexingOptimizer {
  if (indexOptimizer) {
    return indexOptimizer;
  }
  
  indexOptimizer = new DatabaseIndexingOptimizer(pool);
  return indexOptimizer;
}

export function getIndexOptimizer(): DatabaseIndexingOptimizer {
  if (!indexOptimizer) {
    throw new Error('Index optimizer not initialized. Call createIndexOptimizer() first.');
  }
  
  return indexOptimizer;
}
