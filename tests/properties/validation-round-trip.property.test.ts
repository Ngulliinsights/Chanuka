/**
 * Property Test: Validation Round-Trip
 * 
 * Feature: infrastructure-modernization, Property 6: Validation Round-Trip
 * 
 * Validates: Requirements 3.6
 * 
 * This property test verifies that:
 * - For any valid input, validating → processing → serializing → parsing produces equivalent data
 * - Validation schemas preserve data integrity through the full processing pipeline
 * - Type transformations (e.g., string to number, date parsing) are reversible
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { z } from 'zod';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import {
  CreateBillSchema,
  UpdateBillSchema,
  SearchBillsSchema,
  PaginationSchema,
  type CreateBillInput,
  type UpdateBillInput,
  type SearchBillsInput,
} from '@server/features/bills/application/bill-validation.schemas';

// ============================================================================
// Arbitrary Generators for Property Testing
// ============================================================================

/**
 * Generate valid date string in YYYY-MM-DD format
 */
const arbitraryDateString = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map(d => d.toISOString().split('T')[0]);

/**
 * Generate arbitrary CreateBillInput for property testing
 * Only generates valid inputs that will pass validation
 */
const arbitraryCreateBillInput = fc.record({
  title: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  summary: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
  full_text: fc.option(
    fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
    { nil: undefined }
  ),
  bill_number: fc.option(
    fc.integer({ min: 1, max: 9999 }).map(n => `HR-2024-${String(n).padStart(4, '0')}`),
    { nil: undefined }
  ),
  status: fc.constantFrom(
    'draft',
    'introduced',
    'committee_stage',
    'second_reading',
    'third_reading',
    'passed',
    'rejected',
    'withdrawn',
    'enacted'
  ),
  category: fc.constantFrom(
    'agriculture',
    'budget',
    'defense',
    'education',
    'energy',
    'environment',
    'finance',
    'foreign_affairs',
    'health',
    'infrastructure',
    'justice',
    'labor',
    'social_welfare',
    'technology',
    'trade',
    'transportation',
    'other'
  ),
  sponsor_id: fc.option(fc.uuid(), { nil: undefined }),
  tags: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { 
      minLength: 1,
      maxLength: 20 
    }),
    { nil: undefined }
  ),
  introduced_date: fc.option(arbitraryDateString, { nil: undefined }),
  last_action_date: fc.option(arbitraryDateString, { nil: undefined }),
});

/**
 * Generate arbitrary UpdateBillInput for property testing
 * Ensures at least one field is defined
 */
const arbitraryUpdateBillInput = fc
  .record({
    title: fc.option(fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0), { nil: undefined }),
    summary: fc.option(fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0), { nil: undefined }),
    full_text: fc.option(fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0), { nil: undefined }),
    bill_number: fc.option(
      fc.integer({ min: 1, max: 9999 }).map(n => `HR-2024-${String(n).padStart(4, '0')}`),
      { nil: undefined }
    ),
    status: fc.option(
      fc.constantFrom(
        'draft',
        'introduced',
        'committee_stage',
        'second_reading',
        'third_reading',
        'passed',
        'rejected',
        'withdrawn',
        'enacted'
      ),
      { nil: undefined }
    ),
    category: fc.option(
      fc.constantFrom(
        'agriculture',
        'budget',
        'defense',
        'education',
        'energy',
        'environment',
        'finance',
        'foreign_affairs',
        'health',
        'infrastructure',
        'justice',
        'labor',
        'social_welfare',
        'technology',
        'trade',
        'transportation',
        'other'
      ),
      { nil: undefined }
    ),
    sponsor_id: fc.option(fc.uuid(), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { 
        minLength: 1,
        maxLength: 20 
      }),
      { nil: undefined }
    ),
    introduced_date: fc.option(arbitraryDateString, { nil: undefined }),
    last_action_date: fc.option(arbitraryDateString, { nil: undefined }),
  })
  .filter(input => {
    // Ensure at least one field is defined (UpdateBillSchema is partial)
    return Object.values(input).some(v => v !== undefined);
  });

/**
 * Generate arbitrary SearchBillsInput for property testing
 */
const arbitrarySearchBillsInput = fc.record({
  query: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  filters: fc.option(
    fc.record({
      status: fc.option(
        fc.constantFrom(
          'draft',
          'introduced',
          'committee_stage',
          'second_reading',
          'third_reading',
          'passed',
          'rejected',
          'withdrawn',
          'enacted'
        ),
        { nil: undefined }
      ),
      category: fc.option(
        fc.constantFrom(
          'agriculture',
          'budget',
          'defense',
          'education',
          'energy',
          'environment',
          'finance',
          'foreign_affairs',
          'health',
          'infrastructure',
          'justice',
          'labor',
          'social_welfare',
          'technology',
          'trade',
          'transportation',
          'other'
        ),
        { nil: undefined }
      ),
      sponsor_id: fc.option(fc.uuid(), { nil: undefined }),
      search: fc.option(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: undefined }),
    }),
    { nil: undefined }
  ),
});

/**
 * Generate arbitrary pagination input for property testing
 */
const arbitraryPaginationInput = fc.record({
  page: fc.integer({ min: 1, max: 100 }).map(String),
  limit: fc.integer({ min: 1, max: 100 }).map(String),
  sortBy: fc.option(
    fc.constantFrom('created_at', 'updated_at', 'title', 'status', 'introduced_date'),
    { nil: undefined }
  ),
  sortOrder: fc.option(fc.constantFrom('asc', 'desc'), { nil: undefined }),
});

// ============================================================================
// Property Tests
// ============================================================================

describe('Validation Round-Trip Properties', () => {
  // Feature: infrastructure-modernization, Property 6: Validation Round-Trip
  describe('Property 6: Validation Round-Trip', () => {
    it('should preserve CreateBillInput data through validation → processing → serialization → parsing', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryCreateBillInput, async (input) => {
          // Step 1: Validate input
          const validationResult = await validateData(CreateBillSchema, input);
          
          // Should succeed for valid input
          expect(validationResult.success).toBe(true);
          expect(validationResult.data).toBeDefined();
          
          const validatedData = validationResult.data!;
          
          // Step 2: Process (simulate business logic that might transform data)
          const processed = {
            ...validatedData,
            // Simulate processing that might normalize or transform data
            title: validatedData.title.trim(),
            summary: validatedData.summary.trim(),
            full_text: validatedData.full_text?.trim(),
          };
          
          // Step 3: Serialize (convert to JSON-compatible format)
          const serialized = JSON.stringify(processed);
          
          // Step 4: Parse (deserialize back to object)
          const parsed = JSON.parse(serialized);
          
          // Step 5: Re-validate parsed data
          const revalidationResult = await validateData(CreateBillSchema, parsed);
          
          // Should still be valid after round-trip
          expect(revalidationResult.success).toBe(true);
          expect(revalidationResult.data).toBeDefined();
          
          // Step 6: Verify data equivalence
          const revalidatedData = revalidationResult.data!;
          
          // Core fields should be preserved
          expect(revalidatedData.title).toBe(processed.title);
          expect(revalidatedData.summary).toBe(processed.summary);
          expect(revalidatedData.status).toBe(processed.status);
          expect(revalidatedData.category).toBe(processed.category);
          
          // Optional fields should be preserved
          if (processed.full_text !== undefined) {
            expect(revalidatedData.full_text).toBe(processed.full_text);
          }
          if (processed.bill_number !== undefined) {
            expect(revalidatedData.bill_number).toBe(processed.bill_number);
          }
          if (processed.sponsor_id !== undefined) {
            expect(revalidatedData.sponsor_id).toBe(processed.sponsor_id);
          }
          if (processed.tags !== undefined) {
            expect(revalidatedData.tags).toEqual(processed.tags);
          }
          if (processed.introduced_date !== undefined) {
            expect(revalidatedData.introduced_date).toBe(processed.introduced_date);
          }
          if (processed.last_action_date !== undefined) {
            expect(revalidatedData.last_action_date).toBe(processed.last_action_date);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should preserve UpdateBillInput data through validation round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryUpdateBillInput, async (input) => {
          // Step 1: Validate
          const validationResult = await validateData(UpdateBillSchema, input);
          expect(validationResult.success).toBe(true);
          
          const validatedData = validationResult.data!;
          
          // Step 2: Process
          const processed = {
            ...validatedData,
            title: validatedData.title?.trim(),
            summary: validatedData.summary?.trim(),
            full_text: validatedData.full_text?.trim(),
          };
          
          // Step 3: Serialize → Parse
          const roundTripped = JSON.parse(JSON.stringify(processed));
          
          // Step 4: Re-validate
          const revalidationResult = await validateData(UpdateBillSchema, roundTripped);
          expect(revalidationResult.success).toBe(true);
          
          // Step 5: Verify equivalence
          const revalidatedData = revalidationResult.data!;
          
          // All defined fields should be preserved
          Object.keys(processed).forEach(key => {
            if (processed[key as keyof typeof processed] !== undefined) {
              expect(revalidatedData[key as keyof typeof revalidatedData]).toEqual(
                processed[key as keyof typeof processed]
              );
            }
          });
        }),
        { numRuns: 50 }
      );
    });

    it('should preserve SearchBillsInput data through validation round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbitrarySearchBillsInput, async (input) => {
          // Step 1: Validate
          const validationResult = await validateData(SearchBillsSchema, input);
          expect(validationResult.success).toBe(true);
          
          const validatedData = validationResult.data!;
          
          // Step 2: Process (simulate query normalization)
          const processed = {
            ...validatedData,
            query: validatedData.query.trim(),
          };
          
          // Step 3: Serialize → Parse
          const roundTripped = JSON.parse(JSON.stringify(processed));
          
          // Step 4: Re-validate
          const revalidationResult = await validateData(SearchBillsSchema, roundTripped);
          expect(revalidationResult.success).toBe(true);
          
          // Step 5: Verify equivalence
          const revalidatedData = revalidationResult.data!;
          expect(revalidatedData.query).toBe(processed.query);
          
          if (processed.filters) {
            expect(revalidatedData.filters).toEqual(processed.filters);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should preserve pagination parameters through validation round-trip with type transformations', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryPaginationInput, async (input) => {
          // Step 1: Validate (transforms string to number)
          const validationResult = await validateData(PaginationSchema, input);
          expect(validationResult.success).toBe(true);
          
          const validatedData = validationResult.data!;
          
          // Verify type transformation occurred
          expect(typeof validatedData.page).toBe('number');
          expect(typeof validatedData.limit).toBe('number');
          
          // Step 2: Process (use the transformed data)
          const processed = {
            page: validatedData.page,
            limit: validatedData.limit,
            sortBy: validatedData.sortBy,
            sortOrder: validatedData.sortOrder,
          };
          
          // Step 3: Serialize → Parse
          const roundTripped = JSON.parse(JSON.stringify(processed));
          
          // Step 4: Convert back to string format for re-validation
          const backToStringFormat = {
            page: String(roundTripped.page),
            limit: String(roundTripped.limit),
            sortBy: roundTripped.sortBy,
            sortOrder: roundTripped.sortOrder,
          };
          
          // Step 5: Re-validate
          const revalidationResult = await validateData(PaginationSchema, backToStringFormat);
          expect(revalidationResult.success).toBe(true);
          
          // Step 6: Verify equivalence after transformation
          const revalidatedData = revalidationResult.data!;
          expect(revalidatedData.page).toBe(validatedData.page);
          expect(revalidatedData.limit).toBe(validatedData.limit);
          expect(revalidatedData.sortBy).toBe(validatedData.sortBy);
          expect(revalidatedData.sortOrder).toBe(validatedData.sortOrder);
        }),
        { numRuns: 50 }
      );
    });

    it('should handle nested objects with optional fields through round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            filters: fc.option(
              fc.record({
                status: fc.option(fc.constantFrom('draft', 'passed', 'rejected'), { nil: undefined }),
                category: fc.option(fc.constantFrom('health', 'education', 'finance'), { nil: undefined }),
              }),
              { nil: undefined }
            ),
          }),
          async (input) => {
            // Validate
            const validationResult = await validateData(SearchBillsSchema, input);
            expect(validationResult.success).toBe(true);
            
            // Round-trip through JSON
            const roundTripped = JSON.parse(JSON.stringify(validationResult.data));
            
            // Re-validate
            const revalidationResult = await validateData(SearchBillsSchema, roundTripped);
            expect(revalidationResult.success).toBe(true);
            
            // Verify nested structure preserved
            expect(revalidationResult.data!.query).toBe(validationResult.data!.query);
            
            if (validationResult.data!.filters) {
              expect(revalidationResult.data!.filters).toEqual(validationResult.data!.filters);
            } else {
              expect(revalidationResult.data!.filters).toBeUndefined();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle arrays through validation round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            summary: fc.string({ minLength: 1, maxLength: 5000 }).filter(s => s.trim().length > 0),
            category: fc.constantFrom('health', 'education'),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { 
              minLength: 1, 
              maxLength: 10 
            }),
          }),
          async (input) => {
            // Validate
            const validationResult = await validateData(CreateBillSchema, input);
            expect(validationResult.success).toBe(true);
            
            // Round-trip
            const roundTripped = JSON.parse(JSON.stringify(validationResult.data));
            
            // Re-validate
            const revalidationResult = await validateData(CreateBillSchema, roundTripped);
            expect(revalidationResult.success).toBe(true);
            
            // Verify array preserved
            expect(revalidationResult.data!.tags).toEqual(validationResult.data!.tags);
            expect(revalidationResult.data!.tags?.length).toBe(validationResult.data!.tags?.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal valid input through round-trip', async () => {
      const minimalInput = {
        title: 'A',
        summary: 'B',
        category: 'other' as const,
      };

      const result1 = await validateData(CreateBillSchema, minimalInput);
      expect(result1.success).toBe(true);

      const roundTripped = JSON.parse(JSON.stringify(result1.data));
      const result2 = await validateData(CreateBillSchema, roundTripped);
      
      expect(result2.success).toBe(true);
      expect(result2.data!.title).toBe(minimalInput.title);
      expect(result2.data!.summary).toBe(minimalInput.summary);
      expect(result2.data!.category).toBe(minimalInput.category);
    });

    it('should handle maximal valid input through round-trip', async () => {
      const maximalInput = {
        title: 'A'.repeat(500),
        summary: 'B'.repeat(5000),
        full_text: 'C'.repeat(1000),
        bill_number: 'HR-2024-1234',
        status: 'passed' as const,
        category: 'health' as const,
        sponsor_id: '123e4567-e89b-12d3-a456-426614174000',
        tags: Array(20).fill('tag'),
        introduced_date: '2024-01-01',
        last_action_date: '2024-12-31',
      };

      const result1 = await validateData(CreateBillSchema, maximalInput);
      expect(result1.success).toBe(true);

      const roundTripped = JSON.parse(JSON.stringify(result1.data));
      const result2 = await validateData(CreateBillSchema, roundTripped);
      
      expect(result2.success).toBe(true);
      expect(result2.data).toEqual(result1.data);
    });

    it('should handle empty optional fields through round-trip', async () => {
      const inputWithUndefined = {
        title: 'Test',
        summary: 'Summary',
        category: 'other' as const,
        full_text: undefined,
        sponsor_id: undefined,
        tags: undefined,
      };

      const result1 = await validateData(CreateBillSchema, inputWithUndefined);
      expect(result1.success).toBe(true);

      const roundTripped = JSON.parse(JSON.stringify(result1.data));
      const result2 = await validateData(CreateBillSchema, roundTripped);
      
      expect(result2.success).toBe(true);
      // Undefined fields should remain undefined or be omitted
      expect(result2.data!.full_text).toBeUndefined();
      expect(result2.data!.sponsor_id).toBeUndefined();
      expect(result2.data!.tags).toBeUndefined();
    });
  });
});
