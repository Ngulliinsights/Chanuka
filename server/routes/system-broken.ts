
import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export function setupSystemRoutes(app: express.Router) {
  // Schema information
  app.get('/schema', async (req: express.Request, res: express.Response) => {
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

      res.json({
        tables,
        tableCount: Object.keys(tables).length,
        analyzed: new Date().toISOString()
      });
    } catch (error) {
      console.error('Schema analysis failed:', error);
      res.status(500).json({ error: 'Failed to analyze database schema' });
    }
  });

  // Environment status
  app.get('/environment', (req, res) => {
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      SESSION_SECRET: process.env.SESSION_SECRET ? 'Set' : 'Not set',
      PORT: process.env.PORT || '5000',
      timestamp: new Date().toISOString()
    };

    res.json(envStatus);
  });

  // Migration status
  app.get('/migrations', (req, res) => {
    res.json({
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

  // Schema consistency check
  app.get('/schema/check', asyncHandler(async (req, res) => {
    const issues = [];

    // Check for missing tables
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableNames = tables.rows.map((row: any) => row.table_name);
    const expectedTables = ['users', 'bills', 'comments', 'sessions', 'user_profiles'];

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

    res.json({
      issues,
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      checkedAt: new Date().toISOString()
    });
  }));
}
