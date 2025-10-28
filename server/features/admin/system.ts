import express, { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { database as db } from '../../../shared/database/connection';
import { HealthCheckResponse } from '../../types/api.ts';
import { ApiSuccess, ApiError, ApiResponseWrapper } from '@shared/core/utils/api'";
import { errorTracker } from '../../core/errors/error-tracker.js';
import { logger } from '@shared/core';
interface SchemaIssue {
  type: string;
  severity: 'critical' | 'warning';
  message: string;
  table: string;
  column?: string;
}

const router = express.Router();

export function setupSystemRoutes(app: express.Router) {
  // Database schema information
  app.get('/schema', async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();

    try {
      const tableInfo = await db.execute(sql`
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      const tables: Record<string, any[]> = {};
      tableInfo.rows.forEach((row: any) => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = [];
        }
        tables[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        });
      });

      return ApiSuccess(res, {
        tables,
        tableCount: Object.keys(tables).length,
        analyzed: new Date().toISOString()
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Failed to analyze database schema', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Environment status
  app.get('/environment', (req: express.Request, res: express.Response) => {
    const startTime = Date.now();

    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set',
      PORT: process.env.PORT || '5000',
      timestamp: new Date().toISOString()
    };

    return ApiSuccess(res, envStatus,
      ApiResponseWrapper.createMetadata(startTime, 'static'));
  });

  // Database table count summary
  app.get('/stats', async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();

    try {
      const tableStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC
      `);

      return ApiSuccess(res, {
        tables: tableStats.rows,
        summary: {
          totalTables: tableStats.rows.length,
          timestamp: new Date().toISOString()
        }
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Failed to get database statistics', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Migration status
  app.get('/migrations', (req: express.Request, res: express.Response) => {
    const startTime = Date.now();

    return ApiSuccess(res, {
      migrations: [
        {
          name: "0000_initial_migration.sql",
          status: "applied",
          appliedAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          name: "0001_comprehensive_schema.sql",
          status: "pending",
          conflicts: 3
        },
        {
          name: "01-init-database.sql",
          status: "ready",
          enhanced: true
        }
      ],
      lastCheck: new Date().toISOString()
    }, ApiResponseWrapper.createMetadata(startTime, 'static'));
  });

  // Schema consistency check
  app.get('/schema/check', async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();

    try {
      const issues: SchemaIssue[] = [];

      // Check for missing tables
      const tables = await db.execute(sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const tableNames = tables.rows.map((row: any) => row.table_name);
      const expectedTables = ['users', 'bills', 'bill_comments', 'user_profiles', 'bill_engagement'];

      expectedTables.forEach(table => {
        if (!tableNames.includes(table)) {
          issues.push({
            type: 'missing_table',
            severity: 'critical',
            message: `Missing table: ${table}`,
            table
          });
        }
      });

      // Check for ID type consistency
      if (tableNames.includes('users')) {
        const userIdType = await db.execute(sql`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'id'
        `);

        if (userIdType.rows.length > 0) {
          const idType = userIdType.rows[0].data_type;
          if (idType !== 'uuid') {
            issues.push({
              type: 'id_type_inconsistency',
              severity: 'critical',
              message: `Users table ID type is ${idType}, expected uuid`,
              table: 'users',
              column: 'id'
            });
          }
        }
      }

      return ApiSuccess(res, {
        issues,
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        checkedAt: new Date().toISOString()
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'database'
      );
      return ApiError(res, 'Failed to check schema consistency', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // System health check
  app.get('/health', async (req: express.Request, res: express.Response<HealthCheckResponse>) => {
    const startTime = Date.now();

    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);

      const healthResponse: HealthCheckResponse = {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      };

      return ApiSuccess(res, healthResponse,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'high',
        'database'
      );
      const errorResponse: HealthCheckResponse = {
        status: 'unhealthy',
        database: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      };
      return ApiError(res, error instanceof Error ? error : 'System health check failed', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });
}

// Set up the routes on the router
setupSystemRoutes(router);

// Export both the router and setup function for flexibility
export { router };














































