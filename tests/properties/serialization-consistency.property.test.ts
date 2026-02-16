/**
 * Property-Based Tests for Serialization Consistency
 * 
 * Feature: comprehensive-bug-fixes
 * Property 14: Date Serialization Consistency
 * Property 15: JSON Deserialization Validation
 * 
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { z } from 'zod';
import {
  serializeDomainModel,
  deserializeDomainModel,
  dateOrISOString,
} from '../../shared/utils/serialization/json';

describe('Serialization Consistency Properties', () => {
  // Feature: comprehensive-bug-fixes, Property 14: Date Serialization Consistency
  describe('Property 14: Date Serialization Consistency', () => {
    it('should preserve date values through serialization round-trip (within millisecond precision)', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            name: fc.string(),
            createdAt: fc.date(),
            updatedAt: fc.date(),
            optionalDate: fc.option(fc.date(), { nil: undefined }),
          }),
          (model) => {
            // Serialize to JSON-compatible format
            const serialized = serializeDomainModel(model);

            // Verify dates are converted to ISO strings
            expect(typeof serialized.createdAt).toBe('string');
            expect(typeof serialized.updatedAt).toBe('string');
            if (model.optionalDate) {
              expect(typeof serialized.optionalDate).toBe('string');
            }

            // Deserialize back to domain model
            const schema = z.object({
              id: z.string(),
              name: z.string(),
              createdAt: dateOrISOString(),
              updatedAt: dateOrISOString(),
              optionalDate: dateOrISOString().optional(),
            });

            const deserialized = deserializeDomainModel(serialized, schema);

            // Verify dates are converted back to Date objects
            expect(deserialized.createdAt).toBeInstanceOf(Date);
            expect(deserialized.updatedAt).toBeInstanceOf(Date);

            // Verify date values are preserved (within millisecond precision)
            expect((deserialized.createdAt as Date).getTime()).toBe(
              model.createdAt.getTime()
            );
            expect((deserialized.updatedAt as Date).getTime()).toBe(
              model.updatedAt.getTime()
            );

            if (model.optionalDate && deserialized.optionalDate) {
              expect(deserialized.optionalDate).toBeInstanceOf(Date);
              expect((deserialized.optionalDate as Date).getTime()).toBe(
                model.optionalDate.getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nested objects with dates correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            metadata: fc.record({
              timestamp: fc.date(),
              lastModified: fc.date(),
            }),
            history: fc.array(
              fc.record({
                eventDate: fc.date(),
                description: fc.string(),
              }),
              { maxLength: 5 }
            ),
          }),
          (model) => {
            // Filter out invalid dates (NaN) that fast-check might generate
            const hasInvalidDate =
              isNaN(model.metadata.timestamp.getTime()) ||
              isNaN(model.metadata.lastModified.getTime()) ||
              model.history.some((item) => isNaN(item.eventDate.getTime()));

            if (hasInvalidDate) {
              // Skip this test case - invalid dates should be caught by serialization
              return true;
            }

            // Serialize
            const serialized = serializeDomainModel(model);

            // Verify nested dates are strings
            expect(typeof serialized.metadata).toBe('object');
            expect(
              typeof (serialized.metadata as Record<string, unknown>).timestamp
            ).toBe('string');
            expect(Array.isArray(serialized.history)).toBe(true);

            // Deserialize
            const schema = z.object({
              id: z.string(),
              metadata: z.object({
                timestamp: dateOrISOString(),
                lastModified: dateOrISOString(),
              }),
              history: z.array(
                z.object({
                  eventDate: dateOrISOString(),
                  description: z.string(),
                })
              ),
            });

            const deserialized = deserializeDomainModel(serialized, schema);

            // Verify nested dates are Date objects
            expect(deserialized.metadata.timestamp).toBeInstanceOf(Date);
            expect(deserialized.metadata.lastModified).toBeInstanceOf(Date);

            // Verify array dates
            deserialized.history.forEach((item, index) => {
              expect(item.eventDate).toBeInstanceOf(Date);
              expect((item.eventDate as Date).getTime()).toBe(
                model.history[index].eventDate.getTime()
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw descriptive error for invalid dates during serialization', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => /^[a-zA-Z0-9_]+$/.test(s) && s.length > 0),
          (fieldName) => {
            const invalidModel = {
              [fieldName]: new Date(NaN),
            };

            expect(() => serializeDomainModel(invalidModel)).toThrow(
              /Cannot serialize invalid Date in field/
            );
            expect(() => serializeDomainModel(invalidModel)).toThrow(
              new RegExp(fieldName)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use ISO 8601 format for date serialization', () => {
      fc.assert(
        fc.property(fc.date(), (date) => {
          const model = { testDate: date };
          const serialized = serializeDomainModel(model);

          // Verify ISO 8601 format (handles negative years for BCE dates and extended years beyond 9999)
          const isoRegex =
            /^[+-]?\d{4,6}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
          expect(typeof serialized.testDate).toBe('string');
          expect(serialized.testDate).toMatch(isoRegex);

          // Verify it matches the original date's ISO string
          expect(serialized.testDate).toBe(date.toISOString());
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: comprehensive-bug-fixes, Property 15: JSON Deserialization Validation
  describe('Property 15: JSON Deserialization Validation', () => {
    it('should validate structure before deserialization', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
            name: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
          }),
          (invalidData) => {
            const schema = z.object({
              id: z.string(),
              name: z.string(),
              createdAt: dateOrISOString(),
            });

            // Should throw validation error for invalid structure
            expect(() => deserializeDomainModel(invalidData, schema)).toThrow(
              /Deserialization validation failed/
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide field-level error details for validation failures', () => {
      const invalidData = {
        id: 123, // Should be string
        name: null, // Should be string
        createdAt: 'not-a-date', // Should be valid ISO date
      };

      const schema = z.object({
        id: z.string(),
        name: z.string(),
        createdAt: dateOrISOString(),
      });

      try {
        deserializeDomainModel(invalidData, schema);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Deserialization validation failed');
        // Should include field-level details
        expect(errorMessage).toMatch(/id:|name:|createdAt:/);
      }
    });

    it('should accept valid data with proper structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string(),
            name: fc.string(),
            createdAt: fc.date(),
          }),
          (model) => {
            // Serialize first
            const serialized = serializeDomainModel(model);

            // Define schema
            const schema = z.object({
              id: z.string(),
              name: z.string(),
              createdAt: dateOrISOString(),
            });

            // Should not throw for valid data
            expect(() =>
              deserializeDomainModel(serialized, schema)
            ).not.toThrow();

            const deserialized = deserializeDomainModel(serialized, schema);
            expect(deserialized.id).toBe(model.id);
            expect(deserialized.name).toBe(model.name);
            expect(deserialized.createdAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid ISO date strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('not-a-date'),
            fc.constant('2024-13-45'), // Invalid month/day
            fc.constant('2024-02-30T00:00:00Z'), // Invalid date
            fc.string().filter((s) => !s.match(/^\d{4}-\d{2}-\d{2}T/))
          ),
          (invalidDateString) => {
            const data = {
              id: 'test',
              createdAt: invalidDateString,
            };

            const schema = z.object({
              id: z.string(),
              createdAt: dateOrISOString(),
            });

            expect(() => deserializeDomainModel(data, schema)).toThrow(
              /Deserialization validation failed/
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle complex nested structures with validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            user: fc.record({
              id: fc.string(),
              profile: fc.record({
                name: fc.string(),
                joinedAt: fc.date(),
              }),
            }),
            posts: fc.array(
              fc.record({
                id: fc.string(),
                publishedAt: fc.date(),
              }),
              { maxLength: 3 }
            ),
          }),
          (model) => {
            const serialized = serializeDomainModel(model);

            const schema = z.object({
              user: z.object({
                id: z.string(),
                profile: z.object({
                  name: z.string(),
                  joinedAt: dateOrISOString(),
                }),
              }),
              posts: z.array(
                z.object({
                  id: z.string(),
                  publishedAt: dateOrISOString(),
                })
              ),
            });

            const deserialized = deserializeDomainModel(serialized, schema);

            // Verify structure is preserved
            expect(deserialized.user.id).toBe(model.user.id);
            expect(deserialized.user.profile.name).toBe(
              model.user.profile.name
            );
            expect(deserialized.user.profile.joinedAt).toBeInstanceOf(Date);
            expect(deserialized.posts).toHaveLength(model.posts.length);

            // Verify dates in arrays
            deserialized.posts.forEach((post, index) => {
              expect(post.publishedAt).toBeInstanceOf(Date);
              expect((post.publishedAt as Date).getTime()).toBe(
                model.posts[index].publishedAt.getTime()
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      const empty = {};
      const serialized = serializeDomainModel(empty);
      expect(serialized).toEqual({});

      const schema = z.object({});
      const deserialized = deserializeDomainModel(serialized, schema);
      expect(deserialized).toEqual({});
    });

    it('should handle null and undefined values', () => {
      const model = {
        id: 'test',
        nullValue: null,
        undefinedValue: undefined,
      };

      const serialized = serializeDomainModel(model);
      expect(serialized.nullValue).toBeNull();
      expect(serialized.undefinedValue).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const model = {
        items: [],
      };

      const serialized = serializeDomainModel(model);
      expect(serialized.items).toEqual([]);

      const schema = z.object({
        items: z.array(z.unknown()),
      });

      const deserialized = deserializeDomainModel(serialized, schema);
      expect(deserialized.items).toEqual([]);
    });
  });
});
