import { pool } from "../db";

export async function initializeDatabase(): Promise<boolean> {
  try {
    console.log("🔄 Initializing database connection...");

    // Test basic connectivity
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log("✅ Database connection successful");

    // Check if required tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bills', 'users', 'bill_comments', 'bill_engagement')
    `);

    if (tableCheck.rows.length < 4) {
      console.log("⚠️  Some required tables are missing. Running in sample data mode.");
      return false;
    }

    console.log("✅ All required tables found");
    return true;

  } catch (error) {
    console.error("❌ Database initialization failed:", {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      detail: (error as any)?.detail
    });

    console.log("🔄 Falling back to sample data mode");
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
    console.error('Database health check failed:', error);
    return {
      connected: false,
      tablesExist: false,
      canWrite: false,
      message: `Database error: ${(error as any).message || 'Unknown error'}`
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
    console.error('Error checking table existence:', error);
    return false;
  }
}