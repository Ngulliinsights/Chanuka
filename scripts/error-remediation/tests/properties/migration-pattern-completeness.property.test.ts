/**
 * Property-Based Test: Migration Pattern Completeness
 * 
 * Property 5: For any breaking type change identified during remediation, the Error_Remediation_System 
 * should generate a Migration_Pattern that includes before/after code examples, description, and 
 * automation feasibility flag.
 * 
 * Feature: client-error-remediation, Property 5: Migration Pattern Completeness
 * Validates: Requirements 3.5, 18.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ErrorAnalyzer } from '../../core/error-analyzer';
import { defaultConfig } from '../../config';
import { MigrationPattern } from '../../types';

describe('Property 5: Migration Pattern Completeness', () => {
  it('should generate complete migration pattern for ID type conversions', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary type conversion scenarios
        fc.record({
          fromType: fc.constantFrom('string', 'number') as fc.Arbitrary<'string' | 'number'>,
          toType: fc.constantFrom('string', 'number') as fc.Arbitrary<'string' | 'number'>
        }).filter(({ fromType, toType }) => fromType !== toType), // Only test actual conversions
        ({ fromType, toType }) => {
          // Create analyzer
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Create migration pattern
          const pattern = analyzer.createIdTypeMigrationPattern(fromType, toType);
          
          // Property: Migration pattern must have a name
          expect(pattern.name).toBeDefined();
          expect(pattern.name.length).toBeGreaterThan(0);
          
          // Property: Migration pattern must have a description
          expect(pattern.description).toBeDefined();
          expect(pattern.description.length).toBeGreaterThan(0);
          
          // Property: Migration pattern must have before code example
          expect(pattern.before).toBeDefined();
          expect(pattern.before.length).toBeGreaterThan(0);
          
          // Property: Migration pattern must have after code example
          expect(pattern.after).toBeDefined();
          expect(pattern.after.length).toBeGreaterThan(0);
          
          // Property: Migration pattern must have automation feasibility flag
          expect(pattern.automated).toBeDefined();
          expect(typeof pattern.automated).toBe('boolean');
          
          // Property: Before and after examples should be different
          expect(pattern.before).not.toBe(pattern.after);
          
          // Property: Before example should contain the fromType
          expect(pattern.before).toContain(fromType);
          
          // Property: After example should contain the toType
          expect(pattern.after).toContain(toType);
          
          // Property: Name should indicate the conversion direction
          expect(pattern.name.toLowerCase()).toContain(fromType);
          expect(pattern.name.toLowerCase()).toContain(toType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate migration pattern with valid TypeScript code examples', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { fromType: 'number' as const, toType: 'string' as const },
          { fromType: 'string' as const, toType: 'number' as const }
        ),
        ({ fromType, toType }) => {
          // Create analyzer
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Create migration pattern
          const pattern = analyzer.createIdTypeMigrationPattern(fromType, toType);
          
          // Property: Before example should contain valid TypeScript interface syntax
          expect(pattern.before).toMatch(/interface\s+\w+\s*{/);
          
          // Property: After example should contain valid TypeScript interface syntax
          expect(pattern.after).toMatch(/interface\s+\w+\s*{/);
          
          // Property: Before example should contain id property with fromType
          expect(pattern.before).toMatch(new RegExp(`id:\\s*${fromType}`));
          
          // Property: After example should contain id property with toType
          expect(pattern.after).toMatch(new RegExp(`id:\\s*${toType}`));
          
          // Property: Examples should show variable declarations
          expect(pattern.before).toMatch(/const\s+\w+/);
          expect(pattern.after).toMatch(/const\s+\w+/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should mark ID type migrations as automated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { fromType: 'number' as const, toType: 'string' as const },
          { fromType: 'string' as const, toType: 'number' as const }
        ),
        ({ fromType, toType }) => {
          // Create analyzer
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Create migration pattern
          const pattern = analyzer.createIdTypeMigrationPattern(fromType, toType);
          
          // Property: ID type migrations should be marked as automated
          expect(pattern.automated).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate consistent migration patterns for the same conversion', () => {
    // Test that the same conversion always generates the same pattern
    const fromType: 'number' = 'number';
    const toType: 'string' = 'string';
    
    const analyzer = new ErrorAnalyzer(defaultConfig);
    
    // Generate pattern multiple times
    const pattern1 = analyzer.createIdTypeMigrationPattern(fromType, toType);
    const pattern2 = analyzer.createIdTypeMigrationPattern(fromType, toType);
    const pattern3 = analyzer.createIdTypeMigrationPattern(fromType, toType);
    
    // Property: All patterns should be identical
    expect(pattern1.name).toBe(pattern2.name);
    expect(pattern1.name).toBe(pattern3.name);
    
    expect(pattern1.description).toBe(pattern2.description);
    expect(pattern1.description).toBe(pattern3.description);
    
    expect(pattern1.before).toBe(pattern2.before);
    expect(pattern1.before).toBe(pattern3.before);
    
    expect(pattern1.after).toBe(pattern2.after);
    expect(pattern1.after).toBe(pattern3.after);
    
    expect(pattern1.automated).toBe(pattern2.automated);
    expect(pattern1.automated).toBe(pattern3.automated);
  });

  it('should generate different patterns for different conversions', () => {
    const analyzer = new ErrorAnalyzer(defaultConfig);
    
    // Generate patterns for both conversion directions
    const numberToString = analyzer.createIdTypeMigrationPattern('number', 'string');
    const stringToNumber = analyzer.createIdTypeMigrationPattern('string', 'number');
    
    // Property: Patterns should be different
    expect(numberToString.name).not.toBe(stringToNumber.name);
    expect(numberToString.description).not.toBe(stringToNumber.description);
    expect(numberToString.before).not.toBe(stringToNumber.before);
    expect(numberToString.after).not.toBe(stringToNumber.after);
    
    // Property: Number to string pattern should show string conversion
    expect(numberToString.before).toContain('number');
    expect(numberToString.after).toContain('string');
    expect(numberToString.after).toContain('"123"'); // String literal
    
    // Property: String to number pattern should show number conversion
    expect(stringToNumber.before).toContain('string');
    expect(stringToNumber.after).toContain('number');
    expect(stringToNumber.after).toContain('Number('); // Conversion function
  });

  it('should include practical usage examples in migration patterns', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { fromType: 'number' as const, toType: 'string' as const },
          { fromType: 'string' as const, toType: 'number' as const }
        ),
        ({ fromType, toType }) => {
          // Create analyzer
          const analyzer = new ErrorAnalyzer(defaultConfig);
          
          // Create migration pattern
          const pattern = analyzer.createIdTypeMigrationPattern(fromType, toType);
          
          // Property: Examples should show interface definition
          expect(pattern.before).toContain('interface');
          expect(pattern.after).toContain('interface');
          
          // Property: Examples should show variable usage
          expect(pattern.before).toContain('const');
          expect(pattern.after).toContain('const');
          
          // Property: Examples should show comparison/usage
          expect(pattern.before).toContain('find');
          expect(pattern.after).toContain('find');
          
          // Property: Examples should be multi-line (show complete context)
          expect(pattern.before.split('\n').length).toBeGreaterThan(3);
          expect(pattern.after.split('\n').length).toBeGreaterThan(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate migration patterns that preserve semantic meaning', () => {
    const analyzer = new ErrorAnalyzer(defaultConfig);
    
    // Test number to string conversion
    const numberToString = analyzer.createIdTypeMigrationPattern('number', 'string');
    
    // Property: Before example should show number ID
    expect(numberToString.before).toMatch(/id:\s*number/);
    expect(numberToString.before).toMatch(/billId:\s*number\s*=\s*123/);
    
    // Property: After example should show string ID with same semantic value
    expect(numberToString.after).toMatch(/id:\s*string/);
    expect(numberToString.after).toMatch(/billId:\s*string\s*=\s*"123"/);
    
    // Property: The ID value should be preserved (123 -> "123")
    expect(numberToString.before).toContain('123');
    expect(numberToString.after).toContain('"123"');
    
    // Test string to number conversion
    const stringToNumber = analyzer.createIdTypeMigrationPattern('string', 'number');
    
    // Property: Before example should show string ID
    expect(stringToNumber.before).toMatch(/id:\s*string/);
    expect(stringToNumber.before).toMatch(/billId:\s*string\s*=\s*"123"/);
    
    // Property: After example should show number ID with conversion
    expect(stringToNumber.after).toMatch(/id:\s*number/);
    expect(stringToNumber.after).toMatch(/billId:\s*number\s*=\s*123/);
    
    // Property: Should show proper conversion in usage
    expect(stringToNumber.after).toContain('Number(');
  });
});
