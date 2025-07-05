
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

export async function validateDatabaseHealth(): Promise<{
  connected: boolean;
  tablesExist: boolean;
  canWrite: boolean;
  error?: string;
}> {
  try {
    const client = await pool.connect();
    
    // Test read capability
    await client.query('SELECT 1');
    
    // Test table existence
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bills', 'users', 'bill_comments')
    `);
    
    const tablesExist = parseInt(tableCheck.rows[0].count) >= 3;
    
    // Test write capability (with rollback)
    await client.query('BEGIN');
    try {
      await client.query('CREATE TEMP TABLE test_write_check (id INT)');
      await client.query('ROLLBACK');
    } catch (writeError) {
      await client.query('ROLLBACK');
      client.release();
      return {
        connected: true,
        tablesExist,
        canWrite: false,
        error: 'Database is read-only'
      };
    }
    
    client.release();
    
    return {
      connected: true,
      tablesExist,
      canWrite: true
    };
    
  } catch (error) {
    return {
      connected: false,
      tablesExist: false,
      canWrite: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
