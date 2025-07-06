import express from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db.js';

const router = express.Router();

export function setupSystemRoutes(app: express.Router) {
  // Database schema information
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
  app.get('/environment', (req: express.Request, res: express.Response) => {
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      PORT: process.env.PORT || '5000',
      timestamp: new Date().toISOString()
    };

    res.json(envStatus);
  });

  // Database table count summary
  app.get('/stats', async (req: express.Request, res: express.Response) => {
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

      res.json({
        tables: tableStats.rows,
        summary: {
          totalTables: tableStats.rows.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Database stats failed:', error);
      res.status(500).json({ error: 'Failed to get database statistics' });
    }
  });

  // System health check
  app.get('/health', async (req: express.Request, res: express.Response) => {
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);

      res.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('System health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        database: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// Set up the routes on the router
setupSystemRoutes(router);

// Export both the router and setup function for flexibility
export { router };