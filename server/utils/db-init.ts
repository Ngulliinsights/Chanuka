import { logger } from '@server/infrastructure/observability';
import { pool } from '@server/infrastructure/database';

export async function initializeDatabase(): Promise<boolean> {
  try {
    logger.info({
      component: "database",
      operation: "initialize"
    }, "Initializing database connection");

    // Test basic connectivity
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info({
      component: "database",
      operation: "connect"
    }, "Database connection successful");

    // Check if required tables exist
    const tableCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('bills', 'users', 'bill_comments', 'bill_engagement')
    `);

    if (tableCheck.rows.length < 4) {
      logger.warn({
        component: "database",
        operation: "table_check",
        foundTables: tableCheck.rows.length,
        requiredTables: 4
      }, "Some required tables are missing. Running in sample data mode");
      return false;
    }

    logger.info({
      component: "database",
      operation: "table_check",
      tableCount: tableCheck.rows.length
    }, "All required tables found");
    return true;

  } catch (error) {
    logger.error({
      component: "database",
      operation: "initialize",
      message: error instanceof Error ? error.message : String(error),
      code: (error as Record<string, unknown>)?.code,
      detail: (error as Record<string, unknown>)?.detail
    }, "Database initialization failed");

    logger.info({
      component: "database",
      operation: "fallback"
    }, "Falling back to sample data mode");
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
    logger.error({
      component: 'database',
      operation: 'health_check',
      message: errorMessage
    }, 'Database health check failed');
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
    logger.error({
      component: 'database',
      operation: 'table_check',
      message: errorMessage
    }, 'Error checking table existence');
    return false;
  }
}













































