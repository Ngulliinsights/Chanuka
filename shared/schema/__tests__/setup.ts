// ============================================================================
// TEST FRAMEWORK SETUP
// ============================================================================
// Configuration and utilities for testing the Kenya Legislative Platform schema

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

// Test database configuration
const testConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  database: process.env.TEST_DB_NAME || 'kenya_legislative_test',
  user: process.env.TEST_DB_USER || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
};

// Create test database pool
export const testPool = new Pool(testConfig);

// Test database connection
export const testDb = drizzle(testPool);

// Test data generators
export const generateTestData = {
  // User test data
  user: (overrides = {}) => ({
    email: `test.${Date.now()}@example.com`,
    password_hash: 'hashed_password_123',
    role: 'citizen',
    county: 'nairobi',
    constituency: 'westlands',
    is_verified: true,
    ...overrides
  }),

  // Sponsor test data
  sponsor: (overrides = {}) => ({
    name: `Test MP ${Date.now()}`,
    party: 'jubilee',
    county: 'nairobi',
    constituency: 'westlands',
    chamber: 'national_assembly',
    mp_number: `MP${Date.now()}`,
    is_active: true,
    ...overrides
  }),

  // Bill test data
  bill: (overrides = {}) => ({
    bill_number: `Bill ${Date.now()} of 2024`,
    title: `Test Bill ${Date.now()}`,
    summary: 'This is a test bill for testing purposes',
    full_text: 'Full text of the test bill...',
    status: 'introduced' as const,
    chamber: 'national_assembly' as const,
    affected_counties: ['nairobi', 'kiambu'] as const,
    impact_areas: ['healthcare', 'education'],
    ...overrides
  }),

  // Comment test data
  comment: (overrides = {}) => ({
    comment_text: 'This is a test comment about the bill',
    position: 'support',
    user_county: 'nairobi',
    is_constructive: true,
    ...overrides
  }),

  // Constitutional provision test data
  constitutionalProvision: (overrides = {}) => ({
    chapter_number: 4,
    chapter_title: 'The Bill of Rights',
    article_number: 43,
    article_title: 'Economic and social rights',
    section_number: '1',
    provision_text: 'Every person has the right to the highest attainable standard of health...',
    rights_category: 'bill_of_rights',
    keywords: ['health', 'rights', 'citizens'],
    ...overrides
  }),

  // Campaign test data
  campaign: (overrides = {}) => ({
    campaign_name: `Test Campaign ${Date.now()}`,
    campaign_slug: `test-campaign-${Date.now()}`,
    campaign_description: 'Test campaign for testing purposes',
    campaign_goals: ['goal1', 'goal2'],
    status: 'active',
    visibility: 'public',
    ...overrides
  }),

  // Ambassador test data
  ambassador: (overrides = {}) => ({
    ambassador_code: `AMB${Date.now()}`,
    display_name: `Test Ambassador ${Date.now()}`,
    primary_county: 'nairobi',
    languages_spoken: ['english', 'swahili'],
    status: 'active',
    training_completed: true,
    ...overrides
  })
};

// Database setup and teardown utilities
export const testUtils = {
  // Setup test database
  async setupDatabase() {
    try {
      // Create test database if it doesn't exist
      const setupPool = new Pool({
        ...testConfig,
        database: 'postgres' // Connect to default database to create test database
      });

      await setupPool.query(`CREATE DATABASE ${testConfig.database}`);
      await setupPool.end();
    } catch (error) {
      // Database might already exist, continue
      console.log('Test database setup:', error.message);
    }
  },

  // Clean up test database
  async cleanupDatabase() {
    try {
      await testPool.query(`DROP DATABASE IF EXISTS ${testConfig.database}`);
    } catch (error) {
      console.error('Database cleanup error:', error);
    }
  },

  // Clear all tables in a schema
  async clearSchema(schemaName: string) {
    try {
      await testPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      await testPool.query(`CREATE SCHEMA ${schemaName}`);
    } catch (error) {
      console.error(`Error clearing schema ${schemaName}:`, error);
    }
  },

  // Clear all test data
  async clearAllData() {
    const schemas = [
      'foundation',
      'citizen_participation',
      'parliamentary_process',
      'constitutional_intelligence',
      'argument_intelligence',
      'advocacy_coordination',
      'universal_access',
      'integrity_operations',
      'platform_operations'
    ];

    for (const schema of schemas) {
      await this.clearSchema(schema);
    }
  },

  // Helper to insert test data
  async insertTestData(table: any, data: any[]) {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const values = data.map(row => 
      columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (Array.isArray(value)) return `ARRAY[${value.map(v => `'${v}'`).join(',')}]`;
        if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
        return value;
      }).join(',')
    ).join('),(');

    const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values})`;
    await testPool.query(query);
  }
};

// Jest test configuration
export const testConfigJest = {
  // Global test timeout
  testTimeout: 30000,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
  ],

  // Test patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],

  // Module name mapper for TypeScript
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

// Export for use in test files
export { testDb as db };
export { testPool as pool };