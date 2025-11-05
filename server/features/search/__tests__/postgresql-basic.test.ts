// ============================================================================
// BASIC POSTGRESQL FULL-TEXT SEARCH TEST
// ============================================================================
// Simple test to verify PostgreSQL full-text search functionality

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { databaseService } from '../../../infrastructure/database/database-service.js';

describe('PostgreSQL Full-Text Search Basic Test', () => {
  beforeAll(async () => {
    // Ensure database connection
    const healthStatus = await databaseService.getHealthStatus();
    expect(healthStatus.isHealthy).toBe(true);
  });

  afterAll(async () => {
    await databaseService.close();
  });

  it('should connect to database successfully', async () => {
    const status = databaseService.getConnectionStatus();
    expect(status.isConnected).toBe(true);
  });

  it('should verify search support tables exist', async () => {
    const result = await databaseService.executeRawQuery(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('search_synonyms', 'search_analytics')
      ORDER BY table_name;
      `,
      [],
      [],
      'checkSearchTables'
    );

    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    
    const tableNames = result.data.map((row: any) => row.table_name);
    expect(tableNames).toContain('search_synonyms');
    expect(tableNames).toContain('search_analytics');
  });

  it('should verify search functions exist', async () => {
    const result = await databaseService.executeRawQuery(
      `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('expand_query_with_synonyms', 'log_search_performance')
      ORDER BY routine_name;
      `,
      [],
      [],
      'checkSearchFunctions'
    );

    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    
    const functionNames = result.data.map((row: any) => row.routine_name);
    expect(functionNames).toContain('expand_query_with_synonyms');
    expect(functionNames).toContain('log_search_performance');
  });

  it('should verify synonym data exists', async () => {
    const result = await databaseService.executeRawQuery(
      `SELECT COUNT(*) as count FROM search_synonyms;`,
      [],
      [],
      'checkSynonymData'
    );

    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(1);
    expect(Number(result.data[0].count)).toBeGreaterThan(0);
  });

  it('should test query expansion function', async () => {
    const result = await databaseService.executeRawQuery(
      `SELECT expand_query_with_synonyms('bill healthcare') as expanded_query;`,
      [],
      [],
      'testQueryExpansion'
    );

    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(1);
    expect(result.data[0].expanded_query).toBeDefined();
    expect(typeof result.data[0].expanded_query).toBe('string');
    
    // Should contain original terms and synonyms
    const expandedQuery = result.data[0].expanded_query;
    expect(expandedQuery).toContain('bill');
    expect(expandedQuery).toContain('healthcare');
  });

  it('should test performance logging function', async () => {
    const testQuery = 'test performance logging';
    
    // Log a test search
    await databaseService.executeRawQuery(
      `SELECT log_search_performance($1, $2, $3, $4);`,
      [testQuery, 'fulltext', 5, 50],
      [],
      'testPerformanceLogging'
    );

    // Verify it was logged
    const result = await databaseService.executeRawQuery(
      `SELECT * FROM search_analytics WHERE query = $1 ORDER BY search_timestamp DESC LIMIT 1;`,
      [testQuery],
      [],
      'checkLoggedPerformance'
    );

    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(1);
    
    const logEntry = result.data[0];
    expect(logEntry.query).toBe(testQuery);
    expect(logEntry.search_type).toBe('fulltext');
    expect(logEntry.results_count).toBe(5);
    expect(logEntry.execution_time_ms).toBe(50);
  });

  it('should verify PostgreSQL extensions are installed', async () => {
    const result = await databaseService.executeRawQuery(
      `
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('pg_trgm', 'btree_gin', 'unaccent')
      ORDER BY extname;
      `,
      [],
      [],
      'checkExtensions'
    );

    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    
    const extensions = result.data.map((row: any) => row.extname);
    expect(extensions).toContain('pg_trgm');
    expect(extensions).toContain('btree_gin');
  });

  it('should measure basic query performance', async () => {
    const startTime = Date.now();
    
    // Test a simple query that should be fast
    const result = await databaseService.executeRawQuery(
      `SELECT COUNT(*) as count FROM search_synonyms WHERE term = 'bill';`,
      [],
      [],
      'performanceTest'
    );
    
    const executionTime = Date.now() - startTime;
    
    expect(result.data).toBeDefined();
    expect(executionTime).toBeLessThan(100); // Should be under 100ms
  });
});