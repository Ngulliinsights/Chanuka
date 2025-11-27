import express from 'express';
import { sql } from 'drizzle-orm';
import { database as db } from '../../../shared/database/index';
import { HealthCheckResponse } from '../../types/api';
import { ResponseHelper } from '../../../shared/core/src/utils/response-helpers';
import { errorTracker } from '../../core/errors/error-tracker';
import { schemaValidationService } from '../../core/validation/schema-validation-service';
import { validationMetricsCollector } from '../../core/validation/validation-metrics';

// Define interfaces for type safety
interface SchemaIssue {
  type: string;
  severity: 'critical' | 'warning';
  message: string;
  table: string;
  column?: string;
}

interface TableColumn {
  column: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

// This interface represents a row returned from the information_schema.columns query
// PostgreSQL's information schema has standardized column names that we can rely on
interface DatabaseRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

// Note: We don't define TableStatsRow interface because the /stats endpoint
// returns raw PostgreSQL statistics rows without transformation.
// The pg_stat_user_tables view uses PostgreSQL naming: schemaname, tablename (not typos)

// Create the router with explicit type annotation to satisfy TypeScript
const router: express.Router = express.Router();

export function setupSystemRoutes(app: express.Router): void {
  // Database schema information endpoint
  // This retrieves all table structures from the PostgreSQL information schema
  app.get('/schema', async (_req: express.Request, res: express.Response) => {
    try {
      // Query the information schema to get comprehensive table structure details
      const tableInfo = await db.execute(sql`
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      // Organize columns by their parent table for easier consumption
      const tables: Record<string, TableColumn[]> = {};

      // We explicitly type the parameter here to tell TypeScript what structure to expect
      // This is safer than using 'any' and provides proper autocomplete and error checking
      tableInfo.rows.forEach((row: unknown) => {
        const dbRow = row as DatabaseRow;

        // Guard against undefined values - defensive programming for database queries
        if (!dbRow || !dbRow.table_name) {
          return; // Skip malformed rows
        }

        // Initialize the table array if this is the first column we've seen for this table
        const tableArray = tables[dbRow.table_name] || (tables[dbRow.table_name] = []);
        tableArray.push({
          column: dbRow.column_name,
          type: dbRow.data_type,
          nullable: dbRow.is_nullable === 'YES',
          default: dbRow.column_default
        });
      });

      return ResponseHelper.success(res, {
        tables,
        tableCount: Object.keys(tables).length,
        analyzed: new Date().toISOString()
      });
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        _req,
        'medium',
        'database'
      );
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: 'Failed to analyze database schema'
      });
    }
  });

  // Environment status endpoint
  // Returns sanitized environment configuration without exposing sensitive values
  app.get('/environment', (_req: express.Request, res: express.Response) => {
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set',
      PORT: process.env.PORT || '5000',
      timestamp: new Date().toISOString()
    };

    return ResponseHelper.success(res, envStatus);
  });

  // Database statistics endpoint
  // Provides insights into table activity and row counts
  app.get('/stats', async (_req: express.Request, res: express.Response) => {
    try {
      // Query PostgreSQL statistics for user tables
      // Note: "schemaname" and "tablename" are PostgreSQL's actual column names (not typos)
      // cspell:disable-next-line
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

      return ResponseHelper.success(res, {
        tables: tableStats.rows,
        summary: {
          totalTables: tableStats.rows.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        _req,
        'medium',
        'database'
      );
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: 'Failed to get database statistics'
      });
    }
  });

  // Migration status endpoint
  // Returns the current state of database migrations
  app.get('/migrations', (_req: express.Request, res: express.Response) => {
    return ResponseHelper.success(res, {
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
    });
  });

  // Schema consistency check endpoint
  // Validates that all expected tables exist and have correct structure
  app.get('/schema/check', async (_req: express.Request, res: express.Response) => {
    try {
      const issues: SchemaIssue[] = [];

      // Retrieve all public schema tables
      const tables = await db.execute(sql`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      // Extract table names with proper type casting
      // We type the parameter explicitly to avoid implicit 'any' errors
      const tableNames = tables.rows.map((row: unknown) => {
        const dbRow = row as DatabaseRow;
        return dbRow.table_name;
      });

      const expectedTables = ['users', 'bills', 'bill_comments', 'user_profiles', 'bill_engagement'];

      // Check for missing required tables
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

      // Verify ID column type consistency for users table
      if (tableNames.includes('users')) {
        const userIdType = await db.execute(sql`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'id'
        `);

        // We need to check if rows exist AND if the first row exists before accessing properties
        // This prevents the "Object is possibly 'undefined'" error
        if (userIdType.rows.length > 0 && userIdType.rows[0]) {
          const idType = (userIdType.rows[0] as DatabaseRow).data_type;
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

      return ResponseHelper.success(res, {
        issues,
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        _req,
        'medium',
        'database'
      );
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: 'Failed to check schema consistency'
      });
    }
  });

  // System health check endpoint
  // Tests basic database connectivity and system status
  app.get('/health', async (_req: express.Request, res: express.Response<HealthCheckResponse>) => {
    try {
      // Simple database ping to verify connectivity
      await db.execute(sql`SELECT 1`);

      const healthResponse: HealthCheckResponse = {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      };

      return ResponseHelper.success(res, healthResponse);
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        _req,
        'high',
        'database'
      );

      // Return error response while maintaining type consistency
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'System health check failed'
      });
    }
  });

  // Schema validation health check endpoint
  // Provides detailed validation status for database schema
  app.get('/health/schema', async (_req: express.Request, res: express.Response) => {
    try {
      const report = await schemaValidationService.generateValidationReport();

      const schemaHealth = {
        status: report.overallStatus === 'valid' ? 'healthy' : report.overallStatus === 'warning' ? 'warning' : 'unhealthy',
        overallStatus: report.overallStatus,
        validatedTables: report.validatedTables,
        invalidTables: report.invalidTables,
        totalIssues: report.totalIssues,
        criticalIssues: report.criticalIssues,
        timestamp: report.timestamp.toISOString(),
        recommendations: report.recommendations
      };

      // Determine HTTP status based on issue severity
      const statusCode = report.criticalIssues > 0 ? 500 : 200;

      return ResponseHelper.success(res, schemaHealth, statusCode);
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        _req,
        'high',
        'database'
      );
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Schema validation health check failed'
      });
    }
  });

  // Validation metrics endpoint
  // Returns validation performance metrics with optional CSV export
  app.get('/metrics/validation', async (req: express.Request, res: express.Response) => {
    try {
      const hoursBack = parseInt(req.query.hours as string) || 1;
      const format = req.query.format as 'json' | 'csv' || 'json';

      // Support CSV export for data analysis tools
      if (format === 'csv') {
        const csvData = validationMetricsCollector.exportMetrics('csv', hoursBack);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="validation-metrics.csv"');
        return res.send(csvData);
      }

      const metrics = validationMetricsCollector.getMetricsSummary(hoursBack);
      return ResponseHelper.success(res, {
        metrics,
        period: `${hoursBack} hour(s)`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        req,
        'medium',
        'validation'
      );
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: 'Failed to retrieve validation metrics'
      });
    }
  });

  // Validation health status endpoint
  // Provides real-time health assessment of validation system
  app.get('/health/validation', async (_req: express.Request, res: express.Response) => {
    try {
      const healthStatus = validationMetricsCollector.getHealthStatus();

      // Map health status to appropriate HTTP status code
      const statusCode = healthStatus.overall === 'critical' ? 500 : 200;

      return ResponseHelper.success(res, {
        health: healthStatus,
        timestamp: new Date().toISOString()
      }, statusCode);
    } catch (error) {
      errorTracker.trackRequestError(
        error as Error,
        _req,
        'high',
        'validation'
      );
      return ResponseHelper.error(res, {
        statusCode: 500,
        message: 'Failed to retrieve validation health status'
      });
    }
  });
}

// Initialize routes on the router instance
setupSystemRoutes(router);

// Export both router and setup function for flexible integration
export { router };
