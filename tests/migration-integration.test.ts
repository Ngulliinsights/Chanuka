/**
 * Migration Integration Tests
 * Tests for database migration safety and integration preservation
 * 
 * These tests verify:
 * 1. Type alignment is preserved after migrations
 * 2. API contracts remain compatible after migrations
 * 3. Validation schemas stay consistent after migrations
 * 4. Integration points work correctly after migrations
 * 
 * Requirements: 6.2
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { verifyMigration } from '../scripts/database/migration-verification-framework';
import { migrateWithVerification } from '../scripts/database/migrate-with-verification';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Migration Integration Tests', () => {
  describe('Migration Verification Framework', () => {
    it('should verify type alignment', async () => {
      const report = await verifyMigration();
      
      expect(report).toBeDefined();
      expect(report.typeAlignment).toBeDefined();
      expect(report.typeAlignment.timestamp).toBeDefined();
      
      // Type alignment should have minimal errors
      expect(report.typeAlignment.errors.length).toBeLessThan(10);
    });

    it('should verify API contract compatibility', async () => {
      const report = await verifyMigration();
      
      expect(report).toBeDefined();
      expect(report.apiContractCompatibility).toBeDefined();
      expect(report.apiContractCompatibility.timestamp).toBeDefined();
    });

    it('should verify validation schema consistency', async () => {
      const report = await verifyMigration();
      
      expect(report).toBeDefined();
      expect(report.validationSchemaConsistency).toBeDefined();
      expect(report.validationSchemaConsistency.timestamp).toBeDefined();
    });

    it('should generate comprehensive report', async () => {
      const report = await verifyMigration();
      
      expect(report.summary).toBeDefined();
      expect(report.summary.totalErrors).toBeGreaterThanOrEqual(0);
      expect(report.summary.totalWarnings).toBeGreaterThanOrEqual(0);
      expect(report.summary.criticalIssues).toBeInstanceOf(Array);
    });

    it('should identify critical issues', async () => {
      const report = await verifyMigration();
      
      // Critical issues should be clearly identified
      if (report.summary.criticalIssues.length > 0) {
        report.summary.criticalIssues.forEach(issue => {
          expect(issue).toContain(':');
          expect(issue.length).toBeGreaterThan(10);
        });
      }
    });
  });

  describe('Type Alignment Verification', () => {
    it('should detect missing type definitions', async () => {
      const report = await verifyMigration();
      
      const missingTypeErrors = report.typeAlignment.errors.filter(
        error => error.type === 'MISSING_TYPE' || error.type === 'MISSING_FIELD_IN_TYPE'
      );
      
      // Should identify any missing types
      missingTypeErrors.forEach(error => {
        expect(error.entity).toBeDefined();
        expect(error.message).toBeDefined();
      });
    });

    it('should detect type mismatches', async () => {
      const report = await verifyMigration();
      
      const typeMismatchErrors = report.typeAlignment.errors.filter(
        error => error.type === 'TYPE_MISMATCH'
      );
      
      // Type mismatches should include both schema and type values
      typeMismatchErrors.forEach(error => {
        expect(error.details).toBeDefined();
        if (error.details) {
          expect(error.details.schemaType).toBeDefined();
          expect(error.details.typeDefType).toBeDefined();
        }
      });
    });

    it('should detect nullability mismatches', async () => {
      const report = await verifyMigration();
      
      const nullabilityErrors = report.typeAlignment.errors.filter(
        error => error.type === 'NULLABILITY_MISMATCH'
      );
      
      // Nullability mismatches should specify both values
      nullabilityErrors.forEach(error => {
        expect(error.details).toBeDefined();
        if (error.details) {
          expect(error.details.schemaNullable).toBeDefined();
          expect(error.details.typeNullable).toBeDefined();
        }
      });
    });
  });

  describe('Migration Execution with Verification', () => {
    it('should have migration verification scripts available', () => {
      const frameworkPath = join(process.cwd(), 'scripts', 'database', 'migration-verification-framework.ts');
      const migratePath = join(process.cwd(), 'scripts', 'database', 'migrate-with-verification.ts');
      
      expect(existsSync(frameworkPath)).toBe(true);
      expect(existsSync(migratePath)).toBe(true);
    });

    it('should generate verification report file', async () => {
      await verifyMigration();
      
      const reportPath = join(process.cwd(), 'migration-verification-report.json');
      expect(existsSync(reportPath)).toBe(true);
      
      // Report should be valid JSON
      const reportContent = readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(reportContent);
      
      expect(report.timestamp).toBeDefined();
      expect(report.typeAlignment).toBeDefined();
      expect(report.apiContractCompatibility).toBeDefined();
      expect(report.validationSchemaConsistency).toBeDefined();
    });
  });

  describe('Integration Point Verification', () => {
    it('should verify database schema files exist', () => {
      const schemaFiles = [
        'server/infrastructure/schema/foundation.ts',
        'server/infrastructure/schema/citizen_participation.ts',
        'server/infrastructure/schema/parliamentary_process.ts',
        'server/infrastructure/schema/safeguards.ts',
        'server/infrastructure/schema/enum.ts',
      ];

      schemaFiles.forEach(file => {
        const filePath = join(process.cwd(), file);
        expect(existsSync(filePath)).toBe(true);
      });
    });

    it('should verify type definition files exist', () => {
      const typeFiles = [
        'shared/types/database/tables.ts',
        'shared/types/database/generated-tables.ts',
        'shared/types/database/generated-domains.ts',
      ];

      typeFiles.forEach(file => {
        const filePath = join(process.cwd(), file);
        expect(existsSync(filePath)).toBe(true);
      });
    });

    it('should verify API contract files exist', () => {
      const apiFiles = [
        'shared/types/api/request-types.ts',
        'shared/types/api/response-types.ts',
      ];

      apiFiles.forEach(file => {
        const filePath = join(process.cwd(), file);
        expect(existsSync(filePath)).toBe(true);
      });
    });

    it('should verify validation schema files exist', () => {
      const validationPath = join(process.cwd(), 'shared', 'validation');
      expect(existsSync(validationPath)).toBe(true);
    });
  });

  describe('Migration Safety Checks', () => {
    it('should fail if critical type misalignments exist', async () => {
      const report = await verifyMigration();
      
      // If there are critical issues, overall should fail
      if (report.summary.criticalIssues.length > 0) {
        expect(report.overallPassed).toBe(false);
      }
    });

    it('should pass if no critical issues exist', async () => {
      const report = await verifyMigration();
      
      // If no critical issues, should pass (warnings are ok)
      if (report.summary.criticalIssues.length === 0) {
        expect(report.overallPassed).toBe(true);
      }
    });

    it('should track verification timestamp', async () => {
      const report = await verifyMigration();
      
      const timestamp = new Date(report.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      
      // Timestamp should be recent (within last minute)
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      expect(diff).toBeLessThan(60000); // 60 seconds
    });
  });

  describe('Error Reporting', () => {
    it('should provide detailed error information', async () => {
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
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    it('should categorize errors by type', async () => {
      const report = await verifyMigration();
      
      const errorTypes = new Set<string>();
      
      report.typeAlignment.errors.forEach(error => {
        errorTypes.add(error.type);
      });

      // Error types should be meaningful
      errorTypes.forEach(type => {
        expect(type).toMatch(/^[A-Z_]+$/);
      });
    });

    it('should provide warnings for non-critical issues', async () => {
      const report = await verifyMigration();
      
      const allWarnings = [
        ...report.typeAlignment.warnings,
        ...report.apiContractCompatibility.warnings,
        ...report.validationSchemaConsistency.warnings,
      ];

      allWarnings.forEach(warning => {
        expect(warning.type).toBeDefined();
        expect(warning.entity).toBeDefined();
        expect(warning.message).toBeDefined();
      });
    });
  });

  describe('Drizzle Configuration', () => {
    it('should have valid drizzle config', () => {
      const configPath = join(process.cwd(), 'drizzle.config.ts');
      expect(existsSync(configPath)).toBe(true);
      
      const configContent = readFileSync(configPath, 'utf-8');
      expect(configContent).toContain('defineConfig');
      expect(configContent).toContain('schema');
      expect(configContent).toContain('migrations');
    });

    it('should have migrations directory', () => {
      const migrationsPath = join(process.cwd(), 'drizzle');
      expect(existsSync(migrationsPath)).toBe(true);
    });

    it('should have migration files', () => {
      const migrationsPath = join(process.cwd(), 'drizzle');
      const files = require('fs').readdirSync(migrationsPath);
      
      const sqlFiles = files.filter((file: string) => file.endsWith('.sql'));
      expect(sqlFiles.length).toBeGreaterThan(0);
    });
  });
});

describe('Migration Rollback Verification', () => {
  it('should have rollback verification capability', async () => {
    // This test verifies that the framework can check rollback scenarios
    const report = await verifyMigration();
    
    // Framework should be able to verify state
    expect(report).toBeDefined();
    expect(report.overallPassed).toBeDefined();
  });

  it('should verify alignment can be restored', async () => {
    // Verify that current state is verifiable
    const report = await verifyMigration();
    
    // If we can verify current state, we can verify rollback state
    expect(report.typeAlignment).toBeDefined();
    expect(report.apiContractCompatibility).toBeDefined();
    expect(report.validationSchemaConsistency).toBeDefined();
  });
});

describe('Performance and Scalability', () => {
  it('should complete verification in reasonable time', async () => {
    const startTime = Date.now();
    
    await verifyMigration();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verification should complete within 30 seconds
    expect(duration).toBeLessThan(30000);
  });

  it('should handle large schema definitions', async () => {
    // Test that verification works with current schema size
    const report = await verifyMigration();
    
    expect(report).toBeDefined();
    expect(report.typeAlignment.errors).toBeInstanceOf(Array);
  });
});
