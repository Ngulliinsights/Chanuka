/**
 * Property-Based Test: ID Type Analysis Consistency
 * 
 * Property 4: For any TypeScript codebase with entity IDs, when the Error_Remediation_System 
 * analyzes ID usage patterns, it should identify the most frequently used type (string or number) 
 * and designate it as the canonical ID_Type with at least 60% usage frequency.
 * 
 * Feature: client-error-remediation, Property 4: ID Type Analysis Consistency
 * Validates: Requirements 3.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as path from 'path';
import { ErrorAnalyzer } from '../../core/error-analyzer';
import { RemediationConfig, defaultConfig } from '../../config';

describe('Property 4: ID Type Analysis Consistency', () => {
  it('should identify canonical ID type with 60%+ usage frequency', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary ID usage patterns
        fc.array(
          fc.record({
            file: fc.string({ minLength: 5, maxLength: 20 }).map(s => `file-${s}.ts`),
            idType: fc.constantFrom('string', 'number') as fc.Arbitrary<'string' | 'number'>,
            occurrences: fc.integer({ min: 1, max: 100 })
          }),
          { minLength: 10, maxLength: 50 }
        ),
        (idUsages) => {
          // Create analyzer with default config
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Analyze ID types with test data
          const result = analyzer.analyzeIdTypes(idUsages);
          
          // Calculate actual frequency
          const totalOccurrences = idUsages.reduce((sum, u) => sum + u.occurrences, 0);
          const stringOccurrences = idUsages
            .filter(u => u.idType === 'string')
            .reduce((sum, u) => sum + u.occurrences, 0);
          const numberOccurrences = totalOccurrences - stringOccurrences;
          
          const stringFreq = totalOccurrences > 0 ? stringOccurrences / totalOccurrences : 0;
          const numberFreq = totalOccurrences > 0 ? numberOccurrences / totalOccurrences : 0;
          
          // Property: Verify canonical type matches most frequent
          if (stringFreq >= 0.6) {
            expect(result.canonicalType).toBe('string');
          } else if (numberFreq >= 0.6) {
            expect(result.canonicalType).toBe('number');
          } else {
            // If neither reaches 60%, no canonical type should be chosen
            expect(result.canonicalType).toBeNull();
          }
          
          // Property: Verify calculated frequencies match actual
          expect(result.stringFrequency).toBeCloseTo(stringFreq, 5);
          expect(result.numberFrequency).toBeCloseTo(numberFreq, 5);
          
          // Property: Verify occurrence counts are correct
          expect(result.stringOccurrences).toBe(stringOccurrences);
          expect(result.numberOccurrences).toBe(numberOccurrences);
          expect(result.totalOccurrences).toBe(totalOccurrences);
          
          // Property: Frequencies should sum to 1.0 (or 0 if no occurrences)
          if (totalOccurrences > 0) {
            expect(result.stringFrequency + result.numberFrequency).toBeCloseTo(1.0, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly aggregate usages by file', () => {
    fc.assert(
      fc.property(
        // Generate ID usages with specific file patterns
        fc.array(
          fc.record({
            file: fc.constantFrom('file1.ts', 'file2.ts', 'file3.ts'),
            idType: fc.constantFrom('string', 'number') as fc.Arbitrary<'string' | 'number'>,
            occurrences: fc.integer({ min: 1, max: 20 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (idUsages) => {
          // Create analyzer with default config
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Analyze ID types
          const result = analyzer.analyzeIdTypes(idUsages);
          
          // Property: Verify usages by file are correctly aggregated
          const expectedByFile = new Map<string, { string: number; number: number }>();
          
          for (const usage of idUsages) {
            if (!expectedByFile.has(usage.file)) {
              expectedByFile.set(usage.file, { string: 0, number: 0 });
            }
            const fileUsage = expectedByFile.get(usage.file)!;
            if (usage.idType === 'string') {
              fileUsage.string += usage.occurrences;
            } else {
              fileUsage.number += usage.occurrences;
            }
          }
          
          // Verify each file's usage counts
          for (const [file, expected] of expectedByFile.entries()) {
            const actual = result.usagesByFile.get(file);
            expect(actual).toBeDefined();
            expect(actual?.string).toBe(expected.string);
            expect(actual?.number).toBe(expected.number);
          }
          
          // Property: All files in result should be in expected
          for (const file of result.usagesByFile.keys()) {
            expect(expectedByFile.has(file)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case: all string IDs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            file: fc.string({ minLength: 5, maxLength: 20 }).map(s => `file-${s}.ts`),
            idType: fc.constant('string') as fc.Arbitrary<'string'>,
            occurrences: fc.integer({ min: 1, max: 50 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (idUsages) => {
          // Create analyzer with default config
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Analyze ID types
          const result = analyzer.analyzeIdTypes(idUsages);
          
          // Property: Should identify 'string' as canonical type
          expect(result.canonicalType).toBe('string');
          
          // Property: String frequency should be 1.0
          expect(result.stringFrequency).toBe(1.0);
          
          // Property: Number frequency should be 0
          expect(result.numberFrequency).toBe(0);
          
          // Property: Number occurrences should be 0
          expect(result.numberOccurrences).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case: all number IDs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            file: fc.string({ minLength: 5, maxLength: 20 }).map(s => `file-${s}.ts`),
            idType: fc.constant('number') as fc.Arbitrary<'number'>,
            occurrences: fc.integer({ min: 1, max: 50 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (idUsages) => {
          // Create analyzer with default config
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Analyze ID types
          const result = analyzer.analyzeIdTypes(idUsages);
          
          // Property: Should identify 'number' as canonical type
          expect(result.canonicalType).toBe('number');
          
          // Property: Number frequency should be 1.0
          expect(result.numberFrequency).toBe(1.0);
          
          // Property: String frequency should be 0
          expect(result.stringFrequency).toBe(0);
          
          // Property: String occurrences should be 0
          expect(result.stringOccurrences).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case: exactly 60% threshold', () => {
    // Test with exactly 60% string and 40% number
    const idUsages = [
      { file: 'file1.ts', idType: 'string' as const, occurrences: 60 },
      { file: 'file2.ts', idType: 'number' as const, occurrences: 40 }
    ];

    const analyzer = new ErrorAnalyzer(defaultConfig);
    const result = analyzer.analyzeIdTypes(idUsages);

    // Property: Should identify 'string' as canonical type (exactly 60%)
    expect(result.canonicalType).toBe('string');
    expect(result.stringFrequency).toBe(0.6);
    expect(result.numberFrequency).toBe(0.4);
  });

  it('should handle edge case: below 60% threshold for both types', () => {
    // Test with 50% string and 50% number (neither reaches 60%)
    const idUsages = [
      { file: 'file1.ts', idType: 'string' as const, occurrences: 50 },
      { file: 'file2.ts', idType: 'number' as const, occurrences: 50 }
    ];

    const analyzer = new ErrorAnalyzer(defaultConfig);
    const result = analyzer.analyzeIdTypes(idUsages);

    // Property: Should not identify a canonical type (neither reaches 60%)
    expect(result.canonicalType).toBeNull();
    expect(result.stringFrequency).toBe(0.5);
    expect(result.numberFrequency).toBe(0.5);
  });
});
