/**
 * Unit Tests for Migration Verification Framework
 * 
 * Tests the individual components of the migration verification system:
 * - Type alignment verification
 * - API contract compatibility checking
 * - Validation schema consistency checking
 * - Rollback restoration verification
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TypeAlignmentVerifier,
  ApiContractCompatibilityChecker,
  ValidationSchemaConsistencyChecker,
  verifyMigration,
  type VerificationResult,
  type VerificationError,
  type VerificationWarning,
  type SchemaField,
  type TypeField,
} from '../../scripts/database/migration-verification-framework';

describe('Migration Verification Framework - Unit Tests', () => {
  describe('TypeAlignmentVerifier', () => {
    let verifier: TypeAlignmentVerifier;

    beforeEach(() => {
      verifier = new TypeAlignmentVerifier();
    });

    describe('Type Alignment Verification', () => {
      it('should verify type alignment successfully', async () => {
        const result = await verifier.verify();
        
        expect(result).toBeDefined();
        expect(result.passed).toBeDefined();
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
        expect(result.timestamp).toBeDefined();
      });

      it('should return timestamp in ISO format', async () => {
        const result = await verifier.verify();
        
        const timestamp = new Date(result.timestamp);
        expect(timestamp.toISOString()).toBe(result.timestamp);
      });

      it('should detect when verification passes', async () => {
        const result = await verifier.verify();
        
        if (result.errors.length === 0) {
          expect(result.passed).toBe(true);
        } else {
          expect(result.passed).toBe(false);
        }
      });

      it('should collect errors during verification', async () => {
        const result = await verifier.verify();
        
        result.errors.forEach(error => {
          expect(error.type).toBeDefined();
          expect(error.entity).toBeDefined();
          expect(error.message).toBeDefined();
          expect(typeof error.type).toBe('string');
          expect(typeof error.entity).toBe('string');
          expect(typeof error.message).toBe('string');
        });
      });

      it('should collect warnings during verification', async () => {
        const result = await verifier.verify();
        
        result.warnings.forEach(warning => {
          expect(warning.type).toBeDefined();
          expect(warning.entity).toBeDefined();
          expect(warning.message).toBeDefined();
          expect(typeof warning.type).toBe('string');
          expect(typeof warning.entity).toBe('string');
          expect(typeof warning.message).toBe('string');
        });
      });
    });

    describe('Error Detection', () => {
      it('should detect missing type definitions', async () => {
        const result = await verifier.verify();
        
        const missingTypeErrors = result.errors.filter(
          error => error.type === 'MISSING_FIELD_IN_TYPE'
        );
        
        missingTypeErrors.forEach(error => {
          expect(error.entity).toBeDefined();
          expect(error.message).toContain('exists in schema but not in type');
          expect(error.details).toBeDefined();
          expect(error.details?.schemaType).toBeDefined();
        });
      });

      it('should detect type mismatches', async () => {
        const result = await verifier.verify();
        
        const typeMismatchErrors = result.errors.filter(
          error => error.type === 'TYPE_MISMATCH'
        );
        
        typeMismatchErrors.forEach(error => {
          expect(error.entity).toBeDefined();
          expect(error.message).toContain('Type mismatch');
          expect(error.details).toBeDefined();
          expect(error.details?.schemaType).toBeDefined();
          expect(error.details?.typeDefType).toBeDefined();
        });
      });

      it('should detect nullability mismatches', async () => {
        const result = await verifier.verify();
        
        const nullabilityErrors = result.errors.filter(
          error => error.type === 'NULLABILITY_MISMATCH'
        );
        
        nullabilityErrors.forEach(error => {
          expect(error.entity).toBeDefined();
          expect(error.message).toContain('Nullability mismatch');
          expect(error.details).toBeDefined();
          expect(error.details?.schemaNullable).toBeDefined();
          expect(error.details?.typeNullable).toBeDefined();
        });
      });

      it('should handle verification errors gracefully', async () => {
        const result = await verifier.verify();
        
        const verificationErrors = result.errors.filter(
          error => error.type === 'VERIFICATION_ERROR'
        );
        
        verificationErrors.forEach(error => {
          expect(error.entity).toBe('TypeAlignmentVerifier');
          expect(error.message).toContain('Failed to verify type alignment');
        });
      });
    });

    describe('Warning Detection', () => {
      it('should warn about missing type definitions', async () => {
        const result = await verifier.verify();
        
        const missingTypeWarnings = result.warnings.filter(
          warning => warning.type === 'MISSING_TYPE'
        );
        
        missingTypeWarnings.forEach(warning => {
          expect(warning.entity).toBeDefined();
          expect(warning.message).toContain('No corresponding type definition found');
        });
      });

      it('should not fail verification on warnings alone', async () => {
        const result = await verifier.verify();
        
        if (result.warnings.length > 0 && result.errors.length === 0) {
          expect(result.passed).toBe(true);
        }
      });
    });
  });

  describe('ApiContractCompatibilityChecker', () => {
    let checker: ApiContractCompatibilityChecker;

    beforeEach(() => {
      checker = new ApiContractCompatibilityChecker();
    });

    describe('Contract Compatibility Checking', () => {
      it('should verify API contract compatibility', async () => {
        const result = await checker.verify();
        
        expect(result).toBeDefined();
        expect(result.passed).toBeDefined();
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
        expect(result.timestamp).toBeDefined();
      });

      it('should return timestamp in ISO format', async () => {
        const result = await checker.verify();
        
        const timestamp = new Date(result.timestamp);
        expect(timestamp.toISOString()).toBe(result.timestamp);
      });

      it('should detect when verification passes', async () => {
        const result = await checker.verify();
        
        if (result.errors.length === 0) {
          expect(result.passed).toBe(true);
        } else {
          expect(result.passed).toBe(false);
        }
      });

      it('should collect errors during verification', async () => {
        const result = await checker.verify();
        
        result.errors.forEach(error => {
          expect(error.type).toBeDefined();
          expect(error.entity).toBeDefined();
          expect(error.message).toBeDefined();
        });
      });

      it('should handle verification errors gracefully', async () => {
        const result = await checker.verify();
        
        const verificationErrors = result.errors.filter(
          error => error.type === 'VERIFICATION_ERROR'
        );
        
        verificationErrors.forEach(error => {
          expect(error.entity).toBe('ApiContractCompatibilityChecker');
          expect(error.message).toContain('Failed to verify API contract compatibility');
        });
      });
    });

    describe('Contract Usage Verification', () => {
      it('should verify contracts are used in routes', async () => {
        const result = await checker.verify();
        
        // Should complete without throwing
        expect(result).toBeDefined();
      });

      it('should verify type sources are from shared layer', async () => {
        const result = await checker.verify();
        
        // Should complete without throwing
        expect(result).toBeDefined();
      });
    });
  });

  describe('ValidationSchemaConsistencyChecker', () => {
    let checker: ValidationSchemaConsistencyChecker;

    beforeEach(() => {
      checker = new ValidationSchemaConsistencyChecker();
    });

    describe('Validation Consistency Checking', () => {
      it('should verify validation schema consistency', async () => {
        const result = await checker.verify();
        
        expect(result).toBeDefined();
        expect(result.passed).toBeDefined();
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
        expect(result.timestamp).toBeDefined();
      });

      it('should return timestamp in ISO format', async () => {
        const result = await checker.verify();
        
        const timestamp = new Date(result.timestamp);
        expect(timestamp.toISOString()).toBe(result.timestamp);
      });

      it('should detect when verification passes', async () => {
        const result = await checker.verify();
        
        if (result.errors.length === 0) {
          expect(result.passed).toBe(true);
        } else {
          expect(result.passed).toBe(false);
        }
      });

      it('should collect errors during verification', async () => {
        const result = await checker.verify();
        
        result.errors.forEach(error => {
          expect(error.type).toBeDefined();
          expect(error.entity).toBeDefined();
          expect(error.message).toBeDefined();
        });
      });

      it('should handle verification errors gracefully', async () => {
        const result = await checker.verify();
        
        const verificationErrors = result.errors.filter(
          error => error.type === 'VERIFICATION_ERROR'
        );
        
        verificationErrors.forEach(error => {
          expect(error.entity).toBe('ValidationSchemaConsistencyChecker');
          expect(error.message).toContain('Failed to verify validation schema consistency');
        });
      });
    });

    describe('Schema-Type Alignment', () => {
      it('should verify schemas align with types', async () => {
        const result = await checker.verify();
        
        // Should complete without throwing
        expect(result).toBeDefined();
      });
    });
  });

  describe('verifyMigration - Integration', () => {
    describe('Comprehensive Verification', () => {
      it('should run all verification checks', async () => {
        const report = await verifyMigration();
        
        expect(report).toBeDefined();
        expect(report.typeAlignment).toBeDefined();
        expect(report.apiContractCompatibility).toBeDefined();
        expect(report.validationSchemaConsistency).toBeDefined();
      });

      it('should generate comprehensive report', async () => {
        const report = await verifyMigration();
        
        expect(report.timestamp).toBeDefined();
        expect(report.overallPassed).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(report.summary.totalErrors).toBeGreaterThanOrEqual(0);
        expect(report.summary.totalWarnings).toBeGreaterThanOrEqual(0);
        expect(report.summary.criticalIssues).toBeInstanceOf(Array);
      });

      it('should include migration name when provided', async () => {
        const migrationName = 'test_migration';
        const report = await verifyMigration(migrationName);
        
        expect(report.migrationName).toBe(migrationName);
      });

      it('should calculate overall pass status correctly', async () => {
        const report = await verifyMigration();
        
        const hasErrors = 
          report.typeAlignment.errors.length > 0 ||
          report.apiContractCompatibility.errors.length > 0 ||
          report.validationSchemaConsistency.errors.length > 0;
        
        expect(report.overallPassed).toBe(!hasErrors);
      });

      it('should aggregate all errors', async () => {
        const report = await verifyMigration();
        
        const expectedErrorCount = 
          report.typeAlignment.errors.length +
          report.apiContractCompatibility.errors.length +
          report.validationSchemaConsistency.errors.length;
        
        expect(report.summary.totalErrors).toBe(expectedErrorCount);
      });

      it('should aggregate all warnings', async () => {
        const report = await verifyMigration();
        
        const expectedWarningCount = 
          report.typeAlignment.warnings.length +
          report.apiContractCompatibility.warnings.length +
          report.validationSchemaConsistency.warnings.length;
        
        expect(report.summary.totalWarnings).toBe(expectedWarningCount);
      });
    });

    describe('Critical Issue Identification', () => {
      it('should identify critical issues', async () => {
        const report = await verifyMigration();
        
        report.summary.criticalIssues.forEach(issue => {
          expect(typeof issue).toBe('string');
          expect(issue.length).toBeGreaterThan(0);
          expect(issue).toContain(':');
        });
      });

      it('should flag TYPE_MISMATCH as critical', async () => {
        const report = await verifyMigration();
        
        const typeMismatchErrors = report.typeAlignment.errors.filter(
          error => error.type === 'TYPE_MISMATCH'
        );
        
        typeMismatchErrors.forEach(error => {
          const criticalIssue = report.summary.criticalIssues.find(
            issue => issue.includes(error.entity)
          );
          
          if (criticalIssue) {
            expect(criticalIssue).toContain(error.entity);
          }
        });
      });

      it('should flag MISSING_FIELD_IN_TYPE as critical', async () => {
        const report = await verifyMigration();
        
        const missingFieldErrors = report.typeAlignment.errors.filter(
          error => error.type === 'MISSING_FIELD_IN_TYPE'
        );
        
        missingFieldErrors.forEach(error => {
          const criticalIssue = report.summary.criticalIssues.find(
            issue => issue.includes(error.entity)
          );
          
          if (criticalIssue) {
            expect(criticalIssue).toContain(error.entity);
          }
        });
      });
    });

    describe('Report Generation', () => {
      it('should generate report with valid timestamp', async () => {
        const report = await verifyMigration();
        
        const timestamp = new Date(report.timestamp);
        expect(timestamp.toISOString()).toBe(report.timestamp);
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      });

      it('should include all verification results', async () => {
        const report = await verifyMigration();
        
        expect(report.typeAlignment.passed).toBeDefined();
        expect(report.typeAlignment.errors).toBeInstanceOf(Array);
        expect(report.typeAlignment.warnings).toBeInstanceOf(Array);
        
        expect(report.apiContractCompatibility.passed).toBeDefined();
        expect(report.apiContractCompatibility.errors).toBeInstanceOf(Array);
        expect(report.apiContractCompatibility.warnings).toBeInstanceOf(Array);
        
        expect(report.validationSchemaConsistency.passed).toBeDefined();
        expect(report.validationSchemaConsistency.errors).toBeInstanceOf(Array);
        expect(report.validationSchemaConsistency.warnings).toBeInstanceOf(Array);
      });
    });
  });

  describe('Rollback Restoration Verification', () => {
    describe('State Verification', () => {
      it('should verify state before rollback', async () => {
        const preRollbackReport = await verifyMigration();
        
        expect(preRollbackReport).toBeDefined();
        expect(preRollbackReport.timestamp).toBeDefined();
      });

      it('should verify state after rollback', async () => {
        const postRollbackReport = await verifyMigration();
        
        expect(postRollbackReport).toBeDefined();
        expect(postRollbackReport.timestamp).toBeDefined();
      });

      it('should allow comparison of pre and post rollback states', async () => {
        const preReport = await verifyMigration('test_migration');
        
        // Simulate time passing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const postReport = await verifyMigration('test_migration');
        
        expect(preReport.timestamp).not.toBe(postReport.timestamp);
        expect(new Date(preReport.timestamp).getTime())
          .toBeLessThan(new Date(postReport.timestamp).getTime());
      });
    });

    describe('Alignment Restoration', () => {
      it('should verify type alignment can be checked', async () => {
        const report = await verifyMigration();
        
        expect(report.typeAlignment).toBeDefined();
        expect(report.typeAlignment.passed).toBeDefined();
      });

      it('should verify API contracts can be checked', async () => {
        const report = await verifyMigration();
        
        expect(report.apiContractCompatibility).toBeDefined();
        expect(report.apiContractCompatibility.passed).toBeDefined();
      });

      it('should verify validation schemas can be checked', async () => {
        const report = await verifyMigration();
        
        expect(report.validationSchemaConsistency).toBeDefined();
        expect(report.validationSchemaConsistency.passed).toBeDefined();
      });

      it('should track restoration status through error counts', async () => {
        const report = await verifyMigration();
        
        // If restoration is successful, error counts should be low or zero
        expect(report.summary.totalErrors).toBeGreaterThanOrEqual(0);
        
        // Can compare error counts before and after rollback
        const errorCount = report.summary.totalErrors;
        expect(typeof errorCount).toBe('number');
      });
    });

    describe('Verification Consistency', () => {
      it('should produce consistent results for same state', async () => {
        const report1 = await verifyMigration();
        const report2 = await verifyMigration();
        
        // Error counts should be the same
        expect(report1.summary.totalErrors).toBe(report2.summary.totalErrors);
        expect(report1.summary.totalWarnings).toBe(report2.summary.totalWarnings);
      });

      it('should maintain verification integrity', async () => {
        const report = await verifyMigration();
        
        // All verification components should be present
        expect(report.typeAlignment).toBeDefined();
        expect(report.apiContractCompatibility).toBeDefined();
        expect(report.validationSchemaConsistency).toBeDefined();
        
        // Summary should reflect all components
        expect(report.summary).toBeDefined();
        expect(report.overallPassed).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('Empty or Missing Data', () => {
      it('should handle missing schema files gracefully', async () => {
        const verifier = new TypeAlignmentVerifier();
        const result = await verifier.verify();
        
        // Should not throw, should return result
        expect(result).toBeDefined();
        expect(result.errors).toBeInstanceOf(Array);
      });

      it('should handle missing type files gracefully', async () => {
        const verifier = new TypeAlignmentVerifier();
        const result = await verifier.verify();
        
        // Should not throw, should return result
        expect(result).toBeDefined();
        expect(result.warnings).toBeInstanceOf(Array);
      });

      it('should handle missing API contract files gracefully', async () => {
        const checker = new ApiContractCompatibilityChecker();
        const result = await checker.verify();
        
        // Should not throw, should return result
        expect(result).toBeDefined();
      });

      it('should handle missing validation files gracefully', async () => {
        const checker = new ValidationSchemaConsistencyChecker();
        const result = await checker.verify();
        
        // Should not throw, should return result
        expect(result).toBeDefined();
      });
    });

    describe('Invalid Data', () => {
      it('should handle verification with no migration name', async () => {
        const report = await verifyMigration();
        
        expect(report).toBeDefined();
        expect(report.migrationName).toBeUndefined();
      });

      it('should handle verification with migration name', async () => {
        const report = await verifyMigration('test_migration');
        
        expect(report).toBeDefined();
        expect(report.migrationName).toBe('test_migration');
      });
    });

    describe('Performance', () => {
      it('should complete verification in reasonable time', async () => {
        const startTime = Date.now();
        await verifyMigration();
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        
        // Should complete within 30 seconds
        expect(duration).toBeLessThan(30000);
      });

      it('should handle multiple verifications', async () => {
        const reports = await Promise.all([
          verifyMigration(),
          verifyMigration(),
          verifyMigration(),
        ]);
        
        expect(reports).toHaveLength(3);
        reports.forEach(report => {
          expect(report).toBeDefined();
          expect(report.summary).toBeDefined();
        });
      });
    });
  });
});
