import { Pool } from 'pg';
import { MigrationService } from '../infrastructure/database/migration-service.ts';
import { DataValidationService } from '../core/validation/data-validation-service.ts';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../shared/core/src/utils/logger';

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
  end: jest.fn()
} as unknown as Pool;

describe('MigrationService', () => {
  let migrationService: MigrationService;
  let testMigrationsDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testMigrationsDir = path.join(__dirname, 'test-migrations');
    migrationService = new MigrationService(mockPool, testMigrationsDir);
    
    // Create test migrations directory
    if (!fs.existsSync(testMigrationsDir)) {
      fs.mkdirSync(testMigrationsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test migrations directory
    if (fs.existsSync(testMigrationsDir)) {
      fs.rmSync(testMigrationsDir, { recursive: true, force: true });
    }
  });

  describe('initializeMigrationTable', () => {
    it('should create migration tracking table', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await migrationService.initializeMigrationTable();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS drizzle_migrations')
      );
    });
  });

  describe('validateMigration', () => {
    it('should validate correct migration filename', async () => {
      const content = 'CREATE TABLE test (id SERIAL PRIMARY KEY);';
      const result = await migrationService.validateMigration('0001_test_migration.sql', content);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid filename format', async () => {
      const content = 'CREATE TABLE test (id SERIAL PRIMARY KEY);';
      const result = await migrationService.validateMigration('invalid_name.sql', content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Invalid filename format')
      );
    });

    it('should warn about dangerous operations', async () => {
      const content = 'DROP DATABASE test; CREATE TABLE test (id SERIAL);';
      const result = await migrationService.validateMigration('0001_test.sql', content);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Potentially dangerous operation detected')
      );
    });

    it('should warn about missing rollback information', async () => {
      const content = 'CREATE TABLE test (id SERIAL PRIMARY KEY);';
      const result = await migrationService.validateMigration('0001_test.sql', content);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('No rollback information found')
      );
    });
  });

  describe('executeMigration', () => {
    beforeEach(() => {
      // Create a test migration file
      const migrationContent = `
-- Test migration
CREATE TABLE test_table (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

-- ROLLBACK:
DROP TABLE IF EXISTS test_table;
-- END ROLLBACK
      `;
      fs.writeFileSync(path.join(testMigrationsDir, '0001_test.sql'), migrationContent);
    });

    it('should execute migration successfully', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Check if applied
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // Migration SQL
        .mockResolvedValueOnce(undefined) // Record migration
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await migrationService.executeMigration('0001_test.sql');

      expect(result.success).toBe(true);
      expect(result.filename).toBe('0001_test.sql');
      expect(result.rollbackAvailable).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip already applied migration', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await migrationService.executeMigration('0001_test.sql');

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Only the check query
    });

    it('should rollback on migration failure', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Check if applied
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Migration failed')) // Migration SQL fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const result = await migrationService.executeMigration('0001_test.sql');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration failed');
      expect(mockPool.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback migration successfully', async () => {
      const migrationRecord = {
        hash: 'test-hash',
        filename: '0001_test.sql',
        rollback_sql: 'DROP TABLE IF EXISTS test_table;'
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [migrationRecord] }) // Get migration record
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // Rollback SQL
        .mockResolvedValueOnce(undefined) // Delete migration record
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await migrationService.rollbackMigration('0001_test.sql');

      expect(result.success).toBe(true);
      expect(result.filename).toBe('0001_test.sql');
      expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should fail if migration not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await migrationService.rollbackMigration('0001_test.sql');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration not found in database');
    });

    it('should fail if no rollback SQL available', async () => {
      const migrationRecord = {
        hash: 'test-hash',
        filename: '0001_test.sql',
        rollback_sql: null
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [migrationRecord] });

      const result = await migrationService.rollbackMigration('0001_test.sql');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No rollback SQL available');
    });
  });
});

describe('DataValidationService', () => {
  let validationService: DataValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    validationService = new DataValidationService(mockPool);
  });

  describe('runValidationRule', () => {
    it('should pass validation when no issues found', async () => {
      const rule = {
        name: 'test_rule',
        description: 'Test validation rule',
        query: 'SELECT * FROM test WHERE invalid = true',
        severity: 'error' as const
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await validationService.runValidationRule(rule);

      expect(result.passed).toBe(true);
      expect(result.count).toBe(0);
      expect(result.message).toContain('OK');
    });

    it('should fail validation when errors found', async () => {
      const rule = {
        name: 'test_rule',
        description: 'Test validation rule',
        query: 'SELECT * FROM test WHERE invalid = true',
        severity: 'error' as const
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ 
        rows: [{ id: 1 }, { id: 2 }] 
      });

      const result = await validationService.runValidationRule(rule);

      expect(result.passed).toBe(false);
      expect(result.count).toBe(2);
      expect(result.message).toContain('Found 2 issue(s)');
    });

    it('should handle query errors gracefully', async () => {
      const rule = {
        name: 'test_rule',
        description: 'Test validation rule',
        query: 'INVALID SQL',
        severity: 'error' as const
      };

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('SQL error'));

      const result = await validationService.runValidationRule(rule);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Validation failed');
    });
  });

  describe('runAllValidations', () => {
    it('should run all validation rules', async () => {
      // Mock all validation queries to return empty results
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const summary = await validationService.runAllValidations();

      expect(summary.totalRules).toBeGreaterThan(0);
      expect(summary.passed).toBe(summary.totalRules);
      expect(summary.errors).toBe(0);
      expect(summary.warnings).toBe(0);
    });
  });

  describe('autoFixIssues', () => {
    it('should perform dry run without making changes', async () => {
      // Mock count queries for dry run
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await validationService.autoFixIssues(true);

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      // Verify no DELETE queries were executed
      const deleteQueries = (mockPool.query as jest.Mock).mock.calls
        .filter(call => call[0].includes('DELETE'));
      expect(deleteQueries).toHaveLength(0);
    });
  });
});






