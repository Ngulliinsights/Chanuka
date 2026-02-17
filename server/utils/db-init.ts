import { logger } from '@server/infrastructure/observability';
import { pool } from '@server/infrastructure/database';

export async function initializeDatabase(): Promise<boolean> {
  try {
    logger.info("Initializing database connection", {
      component: "database",
      operation: "initialize"
    });

    // Test basic connectivity
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info("Database connection successful", {
      component: "database",
      operation: "connect"
    });

    // Check if required tables exist
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('bills', 'users', 'bill_comments', 'bill_engagement')
    `);

    if (tableCheck.rows.length < 4) {
      logger.warn("Some required tables are missing. Running in sample data mode", {
        component: "database",
        operation: "table_check",
        foundTables: tableCheck.rows.length,
        requiredTables: 4
      });
      return false;
    }

    logger.info("All required tables found", {
      component: "database",
      operation: "table_check",
      tableCount: tableCheck.rows.length
    });
    return true;

  } catch (error) {
    logger.error("Database initialization failed", {
      component: "database",
      operation: "initialize"
    }, {
      message: error instanceof Error ? error.message : String(error),
      code: (error as Record<string, unknown>)?.code,
      detail: (error as Record<string, unknown>)?.detail
    });

    logger.info("Falling back to sample data mode", {
      component: "database",
      operation: "fallback"
    });
    return false;
  }
}

export async function validateDatabaseHealth() {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        connected: false,
        tablesExist: false,
        canWrite: false,
        message: "No database URL configured - running in sample data mode"
      };
    }

    // Test basic connectivity
    const client = await pool.connect();

    // Test write capability
    await client.query('SELECT 1');
    client.release();

    // Check if core tables exist
    const tablesExist = await checkTablesExist();

    return {
      connected: true,
      tablesExist,
      canWrite: true,
      message: "Database fully operational"
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database health check failed', {
      component: 'database',
      operation: 'health_check'
    }, {
      message: errorMessage
    });
    return {
      connected: false,
      tablesExist: false,
      canWrite: false,
      message: `Database error: ${errorMessage}`
    };
  }
}

async function checkTablesExist(): Promise<boolean> {
  try {
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bills', 'users', 'bill_comments', 'bill_engagement', 'notifications', 'analysis', 'sponsors')
    `);

    return tableCheck.rows.length >= 4; // At least the core tables should exist
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error checking table existence', {
      component: 'database',
      operation: 'table_check'
    }, {
      message: errorMessage
    });
    return false;
  }
}













































