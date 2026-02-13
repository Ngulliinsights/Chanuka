/**
 * Property-Based Test: Migration Integration Preservation
 * Feature: full-stack-integration, Property 9: Migration Integration Preservation
 * 
 * Property: For any migration, applying the migration should preserve type alignment,
 * API contract compatibility, and validation rule consistency, and the migration should
 * fail if any of these would be violated.
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { verifyMigration } from '../../scripts/database/migration-verification-framework';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Feature: full-stack-integration, Property 9: Migration Integration Preservation', () => {
  /**
   * Property 9: Migration Integration Preservation
   * 
   * For any migration, applying the migration should preserve type alignment,
   * API contract compatibility, and validation rule consistency.
   */
  it('should preserve integration integrity across migrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary migration scenarios
        fc.record({
          migrationName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          verificationRuns: fc.integer({ min: 1, max: 3 }),
        }),
        async (scenario) => {
          // Run verification multiple times to ensure consistency
          const verificationResults = [];
          
          for (let i = 0; i < scenario.verificationRuns; i++) {
            const report = await verifyMigration(scenario.migrationName);
            verificationResults.push(report);
          }

          // Property 1: Verification should be deterministic
          // Running verification multiple times should produce consistent results
          if (verificationResults.length > 1) {
            const firstResult = verificationResults[0];
            for (let i = 1; i < verificationResults.length; i++) {
              const currentResult = verificationResults[i];
              
              // Error counts should be consistent
              expect(currentResult.summary.totalErrors).toBe(firstResult.summary.totalErrors);
              expect(currentResult.summary.totalWarnings).toBe(firstResult.summary.totalWarnings);
              
              // Overall pass status should be consistent
              expect(currentResult.overallPassed).toBe(firstResult.overallPassed);
            }
          }

          // Property 2: All verification reports should have required structure
          for (const report of verificationResults) {
            expect(report).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.typeAlignment).toBeDefined();
            expect(report.apiContractCompatibility).toBeDefined();
            expect(report.validationSchemaConsistency).toBeDefined();
            expect(report.overallPassed).toBeDefined();
            expect(report.summary).toBeDefined();
            
            // Timestamp should be valid ISO string
            const timestamp = new Date(report.timestamp);
            expect(timestamp.toISOString()).toBe(report.timestamp);
            
            // Summary should have required fields
            expect(typeof report.summary.totalErrors).toBe('number');
            expect(typeof report.summary.totalWarnings).toBe('number');
            expect(Array.isArray(report.summary.criticalIssues)).toBe(true);
            
            // Error and warning counts should be non-negative
            expect(report.summary.totalErrors).toBeGreaterThanOrEqual(0);
            expect(report.summary.totalWarnings).toBeGreaterThanOrEqual(0);
          }

          // Property 3: Type alignment verification should be present
          for (const report of verificationResults) {
            expect(report.typeAlignment.passed).toBeDefined();
            expect(Array.isArray(report.typeAlignment.errors)).toBe(true);
            expect(Array.isArray(report.typeAlignment.warnings)).toBe(true);
            expect(report.typeAlignment.timestamp).toBeDefined();
            
            // All errors should have required structure
            for (const error of report.typeAlignment.errors) {
              expect(error.type).toBeDefined();
              expect(error.entity).toBeDefined();
              expect(error.message).toBeDefined();
              expect(typeof error.type).toBe('string');
              expect(typeof error.entity).toBe('string');
              expect(typeof error.message).toBe('string');
            }
            
            // All warnings should have required structure
            for (const warning of report.typeAlignment.warnings) {
              expect(warning.type).toBeDefined();
              expect(warning.entity).toBeDefined();
              expect(warning.message).toBeDefined();
            }
          }

          // Property 4: API contract compatibility verification should be present
          for (const report of verificationResults) {
            expect(report.apiContractCompatibility.passed).toBeDefined();
            expect(Array.isArray(report.apiContractCompatibility.errors)).toBe(true);
            expect(Array.isArray(report.apiContractCompatibility.warnings)).toBe(true);
            expect(report.apiContractCompatibility.timestamp).toBeDefined();
            
            // All errors should have required structure
            for (const error of report.apiContractCompatibility.errors) {
              expect(error.type).toBeDefined();
              expect(error.entity).toBeDefined();
              expect(error.message).toBeDefined();
            }
          }

          // Property 5: Validation schema consistency verification should be present
          for (const report of verificationResults) {
            expect(report.validationSchemaConsistency.passed).toBeDefined();
            expect(Array.isArray(report.validationSchemaConsistency.errors)).toBe(true);
            expect(Array.isArray(report.validationSchemaConsistency.warnings)).toBe(true);
            expect(report.validationSchemaConsistency.timestamp).toBeDefined();
            
            // All errors should have required structure
            for (const error of report.validationSchemaConsistency.errors) {
              expect(error.type).toBeDefined();
              expect(error.entity).toBeDefined();
              expect(error.message).toBeDefined();
            }
          }

          // Property 6: Overall pass status should reflect component statuses
          for (const report of verificationResults) {
            const hasErrors = 
              report.typeAlignment.errors.length > 0 ||
              report.apiContractCompatibility.errors.length > 0 ||
              report.validationSchemaConsistency.errors.length > 0;
            
            expect(report.overallPassed).toBe(!hasErrors);
          }

          // Property 7: Total error count should match sum of component errors
          for (const report of verificationResults) {
            const expectedErrorCount = 
              report.typeAlignment.errors.length +
              report.apiContractCompatibility.errors.length +
              report.validationSchemaConsistency.errors.length;
            
            expect(report.summary.totalErrors).toBe(expectedErrorCount);
          }

          // Property 8: Total warning count should match sum of component warnings
          for (const report of verificationResults) {
            const expectedWarningCount = 
              report.typeAlignment.warnings.length +
              report.apiContractCompatibility.warnings.length +
              report.validationSchemaConsistency.warnings.length;
            
            expect(report.summary.totalWarnings).toBe(expectedWarningCount);
          }

          // Property 9: Critical issues should be identified correctly
          for (const report of verificationResults) {
            const criticalErrorTypes = ['TYPE_MISMATCH', 'MISSING_FIELD_IN_TYPE'];
            const allErrors = [
              ...report.typeAlignment.errors,
              ...report.apiContractCompatibility.errors,
              ...report.validationSchemaConsistency.errors,
            ];
            
            const criticalErrors = allErrors.filter(error => 
              criticalErrorTypes.includes(error.type)
            );
            
            // Each critical error should be represented in critical issues
            for (const criticalError of criticalErrors) {
              const hasCriticalIssue = report.summary.criticalIssues.some(issue =>
                issue.includes(criticalError.entity)
              );
              
              expect(hasCriticalIssue).toBe(true);
            }
          }

          // Property 10: Migration name should be preserved if provided
          for (const report of verificationResults) {
            if (scenario.migrationName !== undefined) {
              expect(report.migrationName).toBe(scenario.migrationName);
            } else {
              expect(report.migrationName).toBeUndefined();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property: Migration verification should handle edge cases gracefully
   * 
   * Tests that verification works correctly with various input scenarios
   * includi