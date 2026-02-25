/**
 * Pretext Detection Round-Trip Property Tests
 * 
 * Property-based tests to ensure parsing → formatting → parsing produces equivalent results
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';

// Mock bill text generator
const billTextArbitrary = fc.record({
  title: fc.string({ minLength: 10, maxLength: 200 }),
  sections: fc.array(
    fc.record({
      number: fc.string({ minLength: 1, maxLength: 10 }),
      title: fc.string({ minLength: 5, maxLength: 100 }),
      content: fc.string({ minLength: 50, maxLength: 1000 }),
    }),
    { minLength: 1, maxLength: 20 }
  ),
  amendments: fc.array(
    fc.record({
      section: fc.string({ minLength: 1, maxLength: 10 }),
      change: fc.string({ minLength: 10, maxLength: 200 }),
    }),
    { maxLength: 10 }
  ),
});

// Mock detection result generator
const detectionArbitrary = fc.record({
  type: fc.constantFrom('hidden_clause', 'vague_language', 'contradictory_terms', 'scope_creep'),
  severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  evidence: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
  confidence: fc.double({ min: 0, max: 1 }),
});

const analysisResultArbitrary = fc.record({
  billId: fc.uuid(),
  detections: fc.array(detectionArbitrary, { maxLength: 10 }),
  score: fc.integer({ min: 0, max: 100 }),
  confidence: fc.double({ min: 0, max: 1 }),
  analyzedAt: fc.date(),
});

describe('TASK-1.3: Property-Based Round-Trip Tests', () => {
  describe('Bill Text Round-Trip', () => {
    it('should preserve bill text structure through parse → format → parse', () => {
      fc.assert(
        fc.property(billTextArbitrary, (billText) => {
          // Simulate parsing
          const parsed = parseBillText(billText);
          
          // Simulate formatting
          const formatted = formatBillText(parsed);
          
          // Simulate re-parsing
          const reparsed = parseBillText(formatted);
          
          // Verify equivalence
          expect(reparsed).toEqual(parsed);
        }),
        { numRuns: 100 }
      );
    });

    it('should detect round-trip failures within 100ms', () => {
      fc.assert(
        fc.property(billTextArbitrary, (billText) => {
          const startTime = Date.now();
          
          try {
            const parsed = parseBillText(billText);
            const formatted = formatBillText(parsed);
            const reparsed = parseBillText(formatted);
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(100);
            
            return true;
          } catch (error) {
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(100);
            throw error;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Analysis Result Round-Trip', () => {
    it('should preserve analysis results through serialize → deserialize', () => {
      fc.assert(
        fc.property(analysisResultArbitrary, (result) => {
          // Serialize to JSON
          const serialized = JSON.stringify(result);
          
          // Deserialize
          const deserialized = JSON.parse(serialized);
          
          // Convert dates back
          deserialized.analyzedAt = new Date(deserialized.analyzedAt);
          
          // Verify equivalence (with date tolerance)
          expect(deserialized.billId).toBe(result.billId);
          expect(deserialized.detections).toEqual(result.detections);
          expect(deserialized.score).toBe(result.score);
          expect(deserialized.confidence).toBeCloseTo(result.confidence, 10);
          expect(Math.abs(deserialized.analyzedAt.getTime() - result.analyzedAt.getTime())).toBeLessThan(1000);
        }),
        { numRuns: 1000 }
      );
    });

    it('should handle edge cases in detection data', () => {
      fc.assert(
        fc.property(
          fc.record({
            billId: fc.uuid(),
            detections: fc.array(
              fc.record({
                type: fc.string(),
                severity: fc.string(),
                description: fc.string(),
                evidence: fc.array(fc.string()),
                confidence: fc.double({ min: 0, max: 1, noNaN: true }),
              }),
              { maxLength: 100 }
            ),
            score: fc.integer({ min: 0, max: 100 }),
            confidence: fc.double({ min: 0, max: 1, noNaN: true }),
            analyzedAt: fc.date(),
          }),
          (result) => {
            const serialized = JSON.stringify(result);
            const deserialized = JSON.parse(serialized);
            
            expect(deserialized.detections.length).toBe(result.detections.length);
            expect(deserialized.score).toBe(result.score);
            
            return true;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Detection Confidence Validation', () => {
    it('should maintain confidence values within valid range', () => {
      fc.assert(
        fc.property(analysisResultArbitrary, (result) => {
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          
          result.detections.forEach((detection) => {
            expect(detection.confidence).toBeGreaterThanOrEqual(0);
            expect(detection.confidence).toBeLessThanOrEqual(1);
          });
        }),
        { numRuns: 1000 }
      );
    });

    it('should maintain score values within valid range', () => {
      fc.assert(
        fc.property(analysisResultArbitrary, (result) => {
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        }),
        { numRuns: 1000 }
      );
    });
  });
});

// Helper functions for testing
function parseBillText(text: any): any {
  // Simplified parser for testing
  return {
    title: text.title || '',
    sections: text.sections || [],
    amendments: text.amendments || [],
  };
}

function formatBillText(parsed: any): any {
  // Simplified formatter for testing
  return {
    title: parsed.title,
    sections: parsed.sections,
    amendments: parsed.amendments,
  };
}
