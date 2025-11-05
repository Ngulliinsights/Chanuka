import { database as db } from '../shared/database/connection';
import { sql } from 'drizzle-orm';
import { performanceMonitor } from '../monitoring/performance-monitor.js';
import { logger  } from '@shared/core/index.js';

export interface DatabaseIndex {
  name: string;
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  unique?: boolean;
  partial?: string; // WHERE clause for partial indexes
  description: string;
}

export interface QueryOptimization {
  id: string;
  query: string;
  optimizedQuery: string;
  description: string;
  estimatedImprovement: string;
}

export interface DatabaseMetrics {
  connectionPool: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  queryPerformance: {
    averageQueryTime: number;
    slowQueries: Array<{
      query: string;
      avgTime: number;
      callCount: number;
    }>;
  };
  indexUsage: Array<{
    tableName: string;
    indexName: string;
    scans: number;
    tuplesRead: number;
    tuplesReturned: number;
  }>;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    tableSize: string;
    indexSize: string;
  }>;
}

class DatabaseOptimizationService {
  private queryCache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map();
  private slowQueryThreshold = 1000; // 1 second
  private cacheDefaultTTL = 300000; // 5 minutes

  constructor() {
    // Start periodic optimization tasks
    this.startPeriodicOptimization();
  }

  /**
   * Create essential database indexes for performance
   */
  async createOptimizedIndexes(): Promise<void> {
    const indexes: DatabaseIndex[] = [
      // User-related indexes
      {
        name: 'idx_users_email',
        table: 'users',
        columns: ['email'],
        type: 'btree',
        unique: true,
        description: 'Unique index for user email lookups'
      },
      {
        name: 'idx_users_role_active',
        table: 'users',
        columns: ['role', 'is_active'],
        type: 'btree',
        description: 'Composite index for filtering users by role and active status'
      },
      {
        name: 'idx_users_created_at',
        table: 'users',
        columns: ['created_at'],
        type: 'btree',
        description: 'Index for user registration date queries'
      },

      // Bill-related indexes
      {
        name: 'idx_bills_status',
        table: 'bills',
        columns: ['status'],
        type: 'btree',
        description: 'Index for filtering bills by status'
      },
      {
        name: 'idx_bills_sponsor_id',
        table: 'bills',
        columns: ['sponsor_id'],
        type: 'btree',
        description: 'Index for sponsor-based bill queries'
      },
      {
        name: 'idx_bills_category',
        table: 'bills',
        columns: ['category'],
        type: 'btree',
        description: 'Index for category-based bill filtering'
      },
      {
        name: 'idx_bills_introduced_date',
        table: 'bills',
        columns: ['introduced_date'],
        type: 'btree',
        description: 'Index for date-based bill queries'
      },
      {
        name: 'idx_bills_view_count',
        table: 'bills',
        columns: ['view_count'],
        type: 'btree',
        description: 'Index for popular bills queries'
      },
      {
        name: 'idx_bills_full_text',
        table: 'bills',
        columns: ['title', 'description', 'content'],
        type: 'gin',
        description: 'Full-text search index for bills'
      },

      // Comment-related indexes
      {
        name: 'idx_bill_comments_bill_id',
        table: 'bill_comments',
        columns: ['bill_id'],
        type: 'btree',
        description: 'Index for retrieving comments by bill'
      },
      {
        name: 'idx_bill_comments_user_id',
        table: 'bill_comments',
        columns: ['user_id'],
        type: 'btree',
        description: 'Index for retrieving comments by user'
      },
      {
        name: 'idx_bill_comments_parent_id',
        table: 'bill_comments',
        columns: ['parent_comment_id'],
        type: 'btree',
        partial: 'parent_comment_id IS NOT NULL',
        description: 'Index for threaded comment queries'
      },
      {
        name: 'idx_bill_comments_created_at',
        table: 'bill_comments',
        columns: ['created_at'],
        type: 'btree',
        description: 'Index for chronological comment ordering'
      },
      {
        name: 'idx_bill_comments_votes',
        table: 'bill_comments',
        columns: ['upvotes', 'downvotes'],
        type: 'btree',
        description: 'Index for comment ranking by votes'
      },

      // Engagement indexes
      {
        name: 'idx_bill_engagement_user_bill',
        table: 'bill_engagement',
        columns: ['user_id', 'bill_id'],
        type: 'btree',
        unique: true,
        description: 'Unique index for user-bill engagement tracking'
      },
      {
        name: 'idx_bill_engagement_last_engaged',
        table: 'bill_engagement',
        columns: ['last_engaged'],
        type: 'btree',
        description: 'Index for recent engagement queries'
      },

      // Notification indexes
      {
        name: 'idx_notifications_user_id',
        table: 'notifications',
        columns: ['user_id'],
        type: 'btree',
        description: 'Index for user notification queries'
      },
      {
        name: 'idx_notifications_unread',
        table: 'notifications',
        columns: ['user_id', 'is_read'],
        type: 'btree',
        description: 'Index for unread notification queries'
      },
      {
        name: 'idx_notifications_created_at',
        table: 'notifications',
        columns: ['created_at'],
        type: 'btree',
        description: 'Index for chronological notification ordering'
      },

      // Sponsor-related indexes
      {
        name: 'idx_sponsors_name',
        table: 'sponsors',
        columns: ['name'],
        type: 'btree',
        description: 'Index for sponsor name searches'
      },
      {
        name: 'idx_sponsors_party',
        table: 'sponsors',
        columns: ['party'],
        type: 'btree',
        description: 'Index for party-based sponsor filtering'
      },
      {
        name: 'idx_sponsors_active',
        table: 'sponsors',
        columns: ['is_active'],
        type: 'btree',
        description: 'Index for active sponsor filtering'
      },

      // Sponsorship indexes
      {
        name: 'idx_bill_sponsorships_bill_id',
        table: 'bill_sponsorships',
        columns: ['bill_id'],
        type: 'btree',
        description: 'Index for bill sponsorship queries'
      },
      {
        name: 'idx_bill_sponsorships_sponsor_id',
        table: 'bill_sponsorships',
        columns: ['sponsor_id'],
        type: 'btree',
        description: 'Index for sponsor bill queries'
      },

      // Session indexes
      {
        name: 'idx_sessions_user_id',
        table: 'sessions',
        columns: ['user_id'],
        type: 'btree',
        description: 'Index for user session queries'
      },
      {
        name: 'idx_sessions_expires_at',
        table: 'sessions',
        columns: ['expires_at'],
        type: 'btree',
        description: 'Index for session expiration cleanup'
      },

      // Comment votes indexes
      {
        name: 'idx_comment_votes_comment_id',
        table: 'comment_votes',
        columns: ['comment_id'],
        type: 'btree',
        description: 'Index for comment vote aggregation'
      },
      {
        name: 'idx_comment_votes_user_comment',
        table: 'comment_votes',
        columns: ['user_id', 'comment_id'],
        type: 'btree',
        unique: true,
        description: 'Unique index to prevent duplicate votes'
      }
    ];

    logger.info('[DB Optimization] Creating optimized database indexes...', { component: 'Chanuka' });

    for (const index of indexes) {
      try {
        await this.createIndex(index);
        console.log(`[DB Optimization] ✅ Created index: ${index.name}`);
      } catch (error) {
        // Index might already exist, which is fine
        if (!(error instanceof Error) || !error.message.includes('already exists')) {
          console.error(`[DB Optimization] ❌ Failed to create index ${index.name}:`, error);
        }
      }
    }

    logger.info('[DB Optimization] Database indexing completed', { component: 'Chanuka' });
  }

  /**
   * Create a single database index
   */
  private async createIndex(index: DatabaseIndex): Promise<void> {
    const uniqueClause = index.unique ? 'UNIQUE' : '';
    const columnsClause = index.columns.join(', ');
    const partialClause = index.partial ? `WHERE ${index.partial}` : '';
    
    let indexQuery: string;

    if (index.type === 'gin' && index.columns.length > 1) {
      // For full-text search indexes
      indexQuery = `
        CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} 
        ON ${index.table} 
        USING ${index.type} (to_tsvector('english', ${index.columns.join(" || ' ' || ")}))
        ${partialClause}
      `;
    } else {
      indexQuery = `
        CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name} 
        ON ${index.table} 
        USING ${index.type} (${columnsClause})
        ${partialClause}
      `;
    }

    await db.execute(sql.raw(indexQuery.trim()));
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  async analyzeQueryPerformance(): Promise<QueryOptimization[]> {
    const optimizations: QueryOptimization[] = [
      {
        id: 'bills_with_engagement',
        query: `
          SELECT b.*, COUNT(be.id) as engagement_count 
          FROM bills b 
          LEFT JOIN bill_engagement be ON b.id = be.bill_id 
          GROUP BY b.id 
          ORDER BY engagement_count DESC
        `,
        optimizedQuery: `
          SELECT b.*, COALESCE(engagement_stats.engagement_count, 0) as engagement_count
          FROM bills b
          LEFT JOIN (
            SELECT bill_id, COUNT(*) as engagement_count
            FROM bill_engagement
            GROUP BY bill_id
          ) engagement_stats ON b.id = engagement_stats.bill_id
          ORDER BY engagement_count DESC NULLS LAST
        `,
        description: 'Optimize bill engagement counting with subquery',
        estimatedImprovement: '30-50% faster for large datasets'
      },
      {
        id: 'user_comment_history',
        query: `
          SELECT u.name, bc.content, bc.created_at 
          FROM users u 
          JOIN bill_comments bc ON u.id = bc.user_id 
          WHERE u.id = $1 
          ORDER BY bc.created_at DESC
        `,
        optimizedQuery: `
          SELECT u.name, bc.content, bc.created_at 
          FROM bill_comments bc
          JOIN users u ON u.id = bc.user_id 
          WHERE bc.user_id = $1 
          ORDER BY bc.created_at DESC
        `,
        description: 'Start with the more selective table (comments) for user-specific queries',
        estimatedImprovement: '20-40% faster with proper indexing'
      },
      {
        id: 'popular_bills_with_comments',
        query: `
          SELECT b.*, COUNT(bc.id) as comment_count 
          FROM bills b 
          LEFT JOIN bill_comments bc ON b.id = bc.bill_id 
          WHERE b.view_count > 100 
          GROUP BY b.id 
          ORDER BY comment_count DESC
        `,
        optimizedQuery: `
          SELECT b.*, COALESCE(comment_stats.comment_count, 0) as comment_count
          FROM bills b
          LEFT JOIN (
            SELECT bill_id, COUNT(*) as comment_count
            FROM bill_comments
            WHERE bill_id IN (SELECT id FROM bills WHERE view_count > 100)
            GROUP BY bill_id
          ) comment_stats ON b.id = comment_stats.bill_id
          WHERE b.view_count > 100
          ORDER BY comment_count DESC NULLS LAST
        `,
        description: 'Pre-filter bills before joining with comments',
        estimatedImprovement: '40-60% faster for popular content queries'
      }
    ];

    return optimizations;
  }

  /**
   * Get comprehensive database metrics
   */
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get connection pool stats (PostgreSQL specific)
      const connectionStats = await db.execute(sql`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Get slow query stats
      const slowQueriesResult = await db.execute(sql`
        SELECT
          query,
          mean_exec_time as avg_time,
          calls as call_count
        FROM pg_stat_statements
        WHERE mean_exec_time > ${this.slowQueryThreshold}
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }));

      // Get index usage stats
      const indexUsageResult = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_returned
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 20
      `);

      // Get table statistics
      const tableStatsResult = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      return {
        connectionPool: {
          totalConnections: Number(connectionStats.rows[0]?.total_connections) || 0,
          activeConnections: Number(connectionStats.rows[0]?.active_connections) || 0,
          idleConnections: Number(connectionStats.rows[0]?.idle_connections) || 0,
          waitingConnections: Number(connectionStats.rows[0]?.waiting_connections) || 0
        },
        queryPerformance: {
          averageQueryTime: slowQueriesResult.rows.length > 0
            ? slowQueriesResult.rows.reduce((sum: number, q: any) => sum + q.avg_time, 0) / slowQueriesResult.rows.length
            : 0,
          slowQueries: slowQueriesResult.rows.map((q: any) => ({
            query: q.query.substring(0, 100) + '...',
            avgTime: q.avg_time,
            callCount: q.call_count
          }))
        },
        indexUsage: indexUsageResult.rows.map((idx: any) => ({
          tableName: idx.tablename,
          indexName: idx.indexname,
          scans: idx.scans,
          tuplesRead: idx.tuples_read,
          tuplesReturned: idx.tuples_returned
        })),
        tableStats: tableStatsResult.rows.map((table: any) => ({
          tableName: table.tablename,
          rowCount: table.row_count,
          tableSize: table.table_size,
          indexSize: table.index_size
        }))
      };
    } catch (error) {
      logger.error('[DB Optimization] Error getting database metrics:', { component: 'Chanuka' }, error);
      return {
        connectionPool: { totalConnections: 0, activeConnections: 0, idleConnections: 0, waitingConnections: 0 },
        queryPerformance: { averageQueryTime: 0, slowQueries: [] },
        indexUsage: [],
        tableStats: []
      };
    }
  }

  /**
   * Execute query with caching
   */
  async executeWithCache<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl: number = this.cacheDefaultTTL
  ): Promise<T> {
    const cached = this.queryCache.get(queryKey);
    const now = Date.now();

    // Return cached result if valid
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.result;
    }

    // Execute query and cache result
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;

      // Track query performance
      performanceMonitor.addCustomMetric(
        'database_query',
        duration,
        { queryKey, cached: false }
      );

      // Cache the result
      this.queryCache.set(queryKey, {
        result,
        timestamp: now,
        ttl
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.addCustomMetric(
        'database_query',
        duration,
        { queryKey, cached: false, error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Clear query cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear specific pattern
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.queryCache.clear();
    }
  }

  /**
   * Optimize database tables (VACUUM and ANALYZE)
   */
  async optimizeTables(): Promise<void> {
    const tables = [
      'users', 'bills', 'bill_comments', 'bill_engagement', 
      'notifications', 'sponsors', 'bill_sponsorships'
    ];

    logger.info('[DB Optimization] Starting table optimization...', { component: 'Chanuka' });

    for (const table of tables) {
      try {
        // VACUUM ANALYZE to reclaim space and update statistics
        await db.execute(sql.raw(`VACUUM ANALYZE ${table}`));
        console.log(`[DB Optimization] ✅ Optimized table: ${table}`);
      } catch (error) {
        console.error(`[DB Optimization] ❌ Failed to optimize table ${table}:`, error);
      }
    }

    logger.info('[DB Optimization] Table optimization completed', { component: 'Chanuka' });
  }

  /**
   * Clean up expired sessions and old data
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      // Clean up expired sessions
      const expiredSessions = await db.execute(sql`
        DELETE FROM sessions 
        WHERE expires_at < NOW() 
        RETURNING id
      `);

      // Clean up old password reset tokens
      const expiredTokens = await db.execute(sql`
        DELETE FROM password_resets 
        WHERE expires_at < NOW() 
        RETURNING id
      `);

      // Clean up old notifications (older than 90 days)
      const oldNotifications = await db.execute(sql`
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '90 days' 
        AND is_read = true
        RETURNING id
      `);

      console.log(`[DB Optimization] Cleaned up: ${expiredSessions.rowCount} sessions, ${expiredTokens.rowCount} tokens, ${oldNotifications.rowCount} notifications`);
    } catch (error) {
      logger.error('[DB Optimization] Error during cleanup:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const totalEntries = this.queryCache.size;
    const memoryUsage = JSON.stringify([...this.queryCache.entries()]).length;

    return {
      totalEntries,
      hitRate: 0, // Would need to track hits/misses to calculate
      memoryUsage
    };
  }

  /**
   * Start periodic optimization tasks
   */
  private startPeriodicOptimization(): void {
    // Clean up cache every 10 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.queryCache.entries()) {
        if ((now - cached.timestamp) > cached.ttl) {
          this.queryCache.delete(key);
        }
      }
    }, 600000);

    // Run table optimization daily
    setInterval(() => {
      this.optimizeTables().catch(error => {
        logger.error('[DB Optimization] Periodic table optimization failed:', { component: 'Chanuka' }, error);
      });
    }, 86400000); // 24 hours

    // Clean up expired data every hour
    setInterval(() => {
      this.cleanupExpiredData().catch(error => {
        logger.error('[DB Optimization] Periodic cleanup failed:', { component: 'Chanuka' }, error);
      });
    }, 3600000); // 1 hour

    logger.info('[DB Optimization] Started periodic optimization tasks', { component: 'Chanuka' });
  }
}

// Export singleton instance
export const databaseOptimizationService = new DatabaseOptimizationService();












































