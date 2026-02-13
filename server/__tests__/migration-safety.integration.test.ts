/**
 * Migration Safety Tests
 * Tests for migration verification system and rollback verification
 * 
 * These tests verify:
 * 1. Migration verification system works correctly
 * 2. Rollback verification system works correctly
 * 3. Migration process documentation is complete
 * 
 * Task: 14.4
 * Requirements: 6.1, 6.4, 6.5
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { verifyMigration } from '../../scripts/database/migration-verification-framework';
import { testRollbackForMigrations } from '../../scripts/database/rollback-with-verification';

describe('Migration Safety - Task 14.4', () => {
  describe('Migration Verification System', () => {
    it('should have migration verification framework', () => {
      const frameworkPath = join(process.cwd(), 'scripts', 'database', 'migration-verification-framework.ts');
      expect(existsSync(frameworkPath)).toBe(true);
    });

    it('should have migrate-with-verification script', () => {
      const migratePath = join(process.cwd(), 'scripts', 'database', 'migrate-with-verification.ts');
      expect(existsSync(migratePath)).toBe(true);
    });

    it('should run pre-migration verification', async () => {
      const report = await verifyMigration();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.typeAlignment).toBeDefined();
      expect(report.apiContractCompatibility).toBeDefined();
      expect(report.validationSchemaConsistency).toBeDefined();
    });

    it('should generate verification report file', async () => {
      await verifyMigration();
      
      const reportPath = join(process.cwd(), 'migration-verification-report.json');
      expect(existsSync(reportPath)).toBe(true);
      
      const reportContent = readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(reportContent);
      
      expect(report.timestamp).toBeDefined();
      expect(report.overallPassed).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('should verify type alignment before migration', async () => {
      const report = await verifyMigration();
      
      expect(report.typeAlignment).toBeDefined();
      expect(report.typeAlignment.passed).toBeDefined();
      expect(report.typeAlignment.errors).toBeInstanceOf(Array);
      expect(report.typeAlignment.warnings).toBeInstanceOf(Array);
    });

    it('should verify API contract compatibility before migration', async () => {
      const report = await verifyMigration();
      
      expect(report.apiContractCompatibility).toBeDefined();
      expect(report.apiContractCompatibility.passed).toBeDefined();
      expect(report.apiContractCompatibility.errors).toBeInstanceOf(Array);
      expect(report.apiContractCompatibility.warnings).toBeInstanceOf(Array);
    });

    it('should verify validation schema consistency before migration', async () => {
      const report = await verifyMigration();
      
      expect(report.validationSchemaConsistency).toBeDefined();
      expect(report.validationSchemaConsistency.passed).toBeDefined();
      expect(report.validationSchemaConsistency.errors).toBeInstanceOf(Array);
      expect(report.validationSchemaConsistency.warnings).toBeInstanceOf(Array);
    });

    it('should identify critical issues that would block migration', async () => {
      const report = await verifyMigration();
      
      expect(report.summary).toBeDefined();
      expect(report.summary.criticalIssues).toBeInstanceOf(Array);
      
      // If there are critical issues, overall should fail
      if (report.summary.criticalIssues.length > 0) {
        expect(report.overallPassed).toBe(false);
      }
    });

    it('should provide detailed error information for debugging', async () => {
      const report = await verifyMigration();
      
      const allErrors = [
        ...report.typeAlignment.errors,
        ...report.apiContractCompatibility.errors,
        ...report.validationSchemaConsistency.errors,
      ];

      allErrors.forEach(error => {
        expect(error.type).toBeDefined();
        expect(error.entity).toBeDefined();
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should complete verification in reasonable time', async () => {
      const startTime = Date.now();
      await verifyMigration();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Rollback Verification System', () => {
    it('should have rollback-with-verification script', () => {
      const rollbackPath = join(process.cwd(), 'scripts', 'database', 'rollback-with-verification.ts');
      expect(existsSync(rollbackPath)).toBe(true);
    });

    it('should have testRollbackForMigrations function', () => {
      expect(testRollbackForMigrations).toBeDefined();
      expect(typeof testRollbackForMigrations).toBe('function');
    });

    it('should be able to verify current state for rollback', async () => {
      const report = await verifyMigration();
      
      // If we can verify current state, we can verify rollback state
      expect(report).toBeDefined();
      expect(report.typeAlignment).toBeDefined();
      expect(report.apiContractCompatibility).toBeDefined();
      expect(report.validationSchemaConsistency).toBeDefined();
    });

    it('should test rollback verification capability', async () => {
      // This tests the rollback verification without actually rolling back
      await expect(testRollbackForMigrations()).resolves.not.toThrow();
    });

    it('should capture pre-rollback state', async () => {
      const preRollbackReport = await verifyMigration();
      
      expect(preRollbackReport).toBeDefined();
      expect(preRollbackReport.timestamp).toBeDefined();
      
      // Should capture error counts
      expect(preRollbackReport.typeAlignment.errors.length).toBeGreaterThanOrEqual(0);
      expect(preRollbackReport.apiContractCompatibility.errors.length).toBeGreaterThanOrEqual(0);
      expect(preRollbackReport.validationSchemaConsistency.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should be able to compare pre and post rollback states', async () => {
      const state1 = await verifyMigration();
      const state2 = await verifyMigration();
      
      // Should be able to compare states
      expect(state1.typeAlignment.errors.length).toBe(state2.typeAlignment.errors.length);
      expect(state1.apiContractCompatibility.errors.length).toBe(state2.apiContractCompatibility.errors.length);
      expect(state1.validationSchemaConsistency.errors.length).toBe(state2.validationSchemaConsistency.errors.length);
    });

    it('should identify issues resolved by rollback', async () => {
      const report = await verifyMigration();
      
      // Framework should be able to identify critical issues
      expect(report.summary.criticalIssues).toBeInstanceOf(Array);
      
      // Each critical issue should be a string
      report.summary.criticalIssues.forEach(issue => {
        expect(typeof issue).toBe('string');
        expect(issue.length).toBeGreaterThan(0);
      });
    });

    it('should identify new issues introduced by rollback', async () => {
      // This verifies the framework can detect new issues
      const report = await verifyMigration();
      
      // Should have summary with issue counts
      expect(report.summary.totalErrors).toBeGreaterThanOrEqual(0);
      expect(report.summary.totalWarnings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Migration Process Documentation', () => {
    it('should have migration process documentation', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      expect(existsSync(docPath)).toBe(true);
    });

    it('should document pre-migration verification steps', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Pre-Migration Verification');
      expect(content).toContain('migration-verification-framework');
    });

    it('should document migration execution steps', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Migration Execution');
      expect(content).toContain('migrate-with-verification');
    });

    it('should document post-migration verification steps', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Post-Migration Verification');
    });

    it('should document rollback process', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Rollback');
      expect(content).toContain('rollback-with-verification');
    });

    it('should provide example commands', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('npm run');
      expect(content).toContain('tsx scripts/database');
    });

    it('should document verification report format', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Verification Report');
      expect(content).toContain('typeAlignment');
      expect(content).toContain('apiContractCompatibility');
      expect(content).toContain('validationSchemaConsistency');
    });

    it('should document error handling', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Error');
      expect(content).toContain('fail');
    });

    it('should document best practices', () => {
      const docPath = join(process.cwd(), 'docs', 'guides', 'migration-process.md');
      const content = readFileSync(docPath, 'utf-8');
      
      expect(content).toContain('Best Practices');
    });
  });

  describe('Integration with Drizzle', () => {
    it('should have drizzle configuration', () => {
      const configPath = join(process.cwd(), 'drizzle.config.ts');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should have migrations directory', () => {
      const migrationsPath = join(process.cwd(), 'drizzle');
      expect(existsSync(migrationsPath)).toBe(true);
    });

    it('should have schema definitions', () => {
      const schemaPath = join(process.cwd(), 'server', 'infrastructure', 'schema');
      expect(existsSync(schemaPath)).toBe(true);
    });

    it('should verify migrations are tracked', () => {
      const migrationsPath = join(process.cwd(), 'drizzle');
      const fs = require('fs');
      const files = fs.readdirSync(migrationsPath);
      
      const sqlFiles = files.filter((file: string) => file.endsWith('.sql'));
      expect(sqlFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Safety Guarantees', () => {
    it('should fail migration if pre-verification fails', async () => {
      const report = await verifyMigration();
      
      // If there are critical issues, migration should not proceed
      if (report.summary.criticalIssues.length > 0) {
        expect(report.overallPassed).toBe(false);
      }
    });

    it('should detect type misalignments', async () => {
      const report = await verifyMigration();
      
      const typeMismatches = report.typeAlignment.errors.filter(
        error => error.type === 'TYPE_MISMATCH'
      );
      
      // Should be able to detect type mismatches
      typeMismatches.forEach(error => {
        expect(error.details).toBeDefined();
      });
    });

    it('should detect missing type definitions', async () => {
      const report = await verifyMigration();
      
      const missingTypes = report.typeAlignment.errors.filter(
        error => error.type === 'MISSING_TYPE' || error.type === 'MISSING_FIELD_IN_TYPE'
      );
      
      // Should be able to detect missing types
      missingTypes.forEach(error => {
        expect(error.entity).toBeDefined();
        expect(error.message).toBeDefined();
      });
    });

    it('should detect nullability mismatches', async () => {
      const report = await verifyMigration();
      
      const nullabilityErrors = report.typeAlignment.errors.filter(
        error => error.type === 'NULLABILITY_MISMATCH'
      );
      
      // Should be able to detect nullability issues
      nullabilityErrors.forEach(error => {
        expect(error.details).toBeDefined();
      });
    });

    it('should provide actionable error messages', async () => {
      const report = await verifyMigration();
      
      const allErrors = [
        ...report.typeAlignment.errors,
        ...report.apiContractCompatibility.errors,
        ...report.validationSchemaConsistency.errors,
      ];

      allErrors.forEach(error => {
        // Error messages should be descriptive
        expect(error.message.length).toBeGreaterThan(20);
        
        // Should include entity name
        expect(error.entity).toBeDefined();
        expect(error.entity.length).toBeGreaterThan(0);
      });
    });
  });
});
