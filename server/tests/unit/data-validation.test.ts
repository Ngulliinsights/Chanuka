import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataValidationService } from '../../core/validation/data-validation.ts';
import { logger } from '@shared/core';

describe('DataValidationService', () => {
  describe('validateBill', () => {
    it('should validate a complete bill successfully', () => {
      const validBill = {
        title: 'Test Bill',
        billNumber: 'C-123',
        status: 'introduced',
        description: 'A test bill for validation',
        content: 'Detailed content of the bill',
        summary: 'Test summary',
        category: 'technology',
        introducedDate: '2024-01-15',
        lastActionDate: '2024-01-20',
        lastUpdated: new Date().toISOString()
      };

      const result = DataValidationService.validateBill(validBill);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.details.completeness).toBeGreaterThan(0.8);
      expect(result.details.accuracy).toBe(1.0);
    });

    it('should fail validation for missing required fields', () => {
      const invalidBill = {
        description: 'A bill without required fields'
      };

      const result = DataValidationService.validateBill(invalidBill);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Missing required fields')]));
      expect(result.score).toBeLessThan(0.6);
    });

    it('should validate bill number format', () => {
      const billWithInvalidNumber = {
        title: 'Test Bill',
        billNumber: 'INVALID-FORMAT-123456',
        status: 'introduced'
      };

      const result = DataValidationService.validateBill(billWithInvalidNumber);

      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Bill number format may be invalid')]));
    });

    it('should validate bill status values', () => {
      const billWithInvalidStatus = {
        title: 'Test Bill',
        billNumber: 'C-123',
        status: 'invalid-status'
      };

      const result = DataValidationService.validateBill(billWithInvalidStatus);

      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Invalid bill status')]));
    });

    it('should validate field lengths', () => {
      const billWithLongFields = {
        title: 'x'.repeat(600), // Exceeds max length of 500
        billNumber: 'C-123',
        status: 'introduced'
      };

      const result = DataValidationService.validateBill(billWithLongFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('exceeds maximum length')]));
    });

    it('should validate date formats', () => {
      const billWithInvalidDate = {
        title: 'Test Bill',
        billNumber: 'C-123',
        status: 'introduced',
        introducedDate: 'invalid-date'
      };

      const result = DataValidationService.validateBill(billWithInvalidDate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Invalid date format')]));
    });

    it('should warn about future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const billWithFutureDate = {
        title: 'Test Bill',
        billNumber: 'C-123',
        status: 'introduced',
        introducedDate: futureDate.toISOString()
      };

      const result = DataValidationService.validateBill(billWithFutureDate);

      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Future date')]));
    });

    it('should check date consistency', () => {
      const billWithInconsistentDates = {
        title: 'Test Bill',
        billNumber: 'C-123',
        status: 'introduced',
        introducedDate: '2024-01-20',
        lastActionDate: '2024-01-15' // Earlier than introduced date
      };

      const result = DataValidationService.validateBill(billWithInconsistentDates);

      expect(result.details.consistency).toBeLessThan(1.0);
    });

    it('should calculate timeliness score based on last updated', () => {
      const recentBill = {
        title: 'Test Bill',
        billNumber: 'C-123',
        status: 'introduced',
        lastUpdated: new Date().toISOString()
      };

      const oldBill = {
        title: 'Test Bill',
        billNumber: 'C-124',
        status: 'introduced',
        lastUpdated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
      };

      const recentResult = DataValidationService.validateBill(recentBill);
      const oldResult = DataValidationService.validateBill(oldBill);

      expect(recentResult.details.timeliness).toBeGreaterThan(oldResult.details.timeliness);
    });
  });

  describe('validateSponsor', () => {
    it('should validate a complete sponsor successfully', () => {
      const validSponsor = {
        name: 'Hon. John Doe',
        role: 'MP',
        party: 'Test Party',
        constituency: 'Test Riding',
        email: 'john.doe@parliament.ca',
        phone: '613-555-0123',
        bio: 'A dedicated member of parliament'
      };

      const result = DataValidationService.validateSponsor(validSponsor);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.details.completeness).toBeGreaterThan(0.8);
    });

    it('should fail validation for missing required fields', () => {
      const invalidSponsor = {
        party: 'Test Party'
      };

      const result = DataValidationService.validateSponsor(invalidSponsor);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Missing required fields')]));
    });

    it('should validate email format', () => {
      const sponsorWithInvalidEmail = {
        name: 'Hon. John Doe',
        role: 'MP',
        email: 'invalid-email-format'
      };

      const result = DataValidationService.validateSponsor(sponsorWithInvalidEmail);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('Invalid email format')]));
    });

    it('should validate phone format', () => {
      const sponsorWithInvalidPhone = {
        name: 'Hon. John Doe',
        role: 'MP',
        phone: '123' // Too short
      };

      const result = DataValidationService.validateSponsor(sponsorWithInvalidPhone);

      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Phone number format may be invalid')]));
    });

    it('should warn about uncommon roles', () => {
      const sponsorWithUncommonRole = {
        name: 'Hon. John Doe',
        role: 'Uncommon Role'
      };

      const result = DataValidationService.validateSponsor(sponsorWithUncommonRole);

      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Uncommon role')]));
    });

    it('should validate field lengths', () => {
      const sponsorWithLongFields = {
        name: 'x'.repeat(250), // Exceeds max length of 200
        role: 'MP'
      };

      const result = DataValidationService.validateSponsor(sponsorWithLongFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining('exceeds maximum length')]));
    });
  });

  describe('validateBatch', () => {
    it('should validate a batch of bills', () => {
      const bills = [
        {
          title: 'Valid Bill 1',
          billNumber: 'C-123',
          status: 'introduced'
        },
        {
          title: 'Valid Bill 2',
          billNumber: 'C-124',
          status: 'passed'
        },
        {
          // Invalid bill - missing required fields
          description: 'Invalid bill'
        }
      ];

      const result = DataValidationService.validateBatch(bills, 'bills');

      expect(result.totalRecords).toBe(3);
      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(1);
      expect(result.validationRate).toBeCloseTo(2/3);
      expect(result.validData).toHaveLength(2);
      expect(result.invalidData).toHaveLength(1);
    });

    it('should validate a batch of sponsors', () => {
      const sponsors = [
        {
          name: 'Hon. John Doe',
          role: 'MP'
        },
        {
          name: 'Hon. Jane Smith',
          role: 'Senator'
        },
        {
          // Invalid sponsor - missing required fields
          party: 'Test Party'
        }
      ];

      const result = DataValidationService.validateBatch(sponsors, 'sponsors');

      expect(result.totalRecords).toBe(3);
      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(1);
      expect(result.validationRate).toBeCloseTo(2/3);
    });

    it('should calculate summary statistics', () => {
      const bills = [
        {
          title: 'Complete Bill',
          billNumber: 'C-123',
          status: 'introduced',
          description: 'Complete description',
          summary: 'Complete summary',
          lastUpdated: new Date().toISOString()
        },
        {
          title: 'Minimal Bill',
          billNumber: 'C-124',
          status: 'introduced'
        }
      ];

      const result = DataValidationService.validateBatch(bills, 'bills');

      expect(result.summary).toHaveProperty('completeness');
      expect(result.summary).toHaveProperty('accuracy');
      expect(result.summary).toHaveProperty('consistency');
      expect(result.summary).toHaveProperty('timeliness');
      expect(result.summary.completeness).toBeGreaterThan(0);
      expect(result.summary.accuracy).toBeGreaterThan(0);
    });
  });

  describe('crossValidate', () => {
    it('should detect conflicts between sources', () => {
      const records = [
        {
          data: {
            billNumber: 'C-123',
            title: 'Original Title',
            status: 'introduced'
          },
          source: 'parliament-ca'
        },
        {
          data: {
            billNumber: 'C-123',
            title: 'Different Title', // Conflict
            status: 'committee' // Conflict
          },
          source: 'openparliament'
        }
      ];

      const result = DataValidationService.crossValidate(records, 'bills');

      expect(result.totalRecords).toBe(2);
      expect(result.uniqueRecords).toBe(1);
      expect(result.duplicateGroups).toBe(1);
      expect(result.conflicts).toBe(1);
      expect(result.conflictDetails).toHaveLength(1);
      expect(result.overallConsistency).toBeLessThan(1.0);
    });

    it('should handle records with no conflicts', () => {
      const records = [
        {
          data: {
            billNumber: 'C-123',
            title: 'Same Title',
            status: 'introduced'
          },
          source: 'parliament-ca'
        },
        {
          data: {
            billNumber: 'C-123',
            title: 'Same Title',
            status: 'introduced'
          },
          source: 'openparliament'
        }
      ];

      const result = DataValidationService.crossValidate(records, 'bills');

      expect(result.conflicts).toBe(0);
      expect(result.overallConsistency).toBe(1.0);
    });

    it('should group sponsors by name and role', () => {
      const records = [
        {
          data: {
            name: 'Hon. John Doe',
            role: 'MP',
            party: 'Party A'
          },
          source: 'parliament-ca'
        },
        {
          data: {
            name: 'Hon. John Doe',
            role: 'MP',
            party: 'Party B' // Conflict
          },
          source: 'openparliament'
        },
        {
          data: {
            name: 'Hon. Jane Smith',
            role: 'Senator',
            party: 'Party A'
          },
          source: 'parliament-ca'
        }
      ];

      const result = DataValidationService.crossValidate(records, 'sponsors');

      expect(result.uniqueRecords).toBe(2); // Two unique sponsor identities
      expect(result.conflicts).toBe(1); // One conflict for John Doe
    });

    it('should provide recommendations for conflict resolution', () => {
      const records = [
        {
          data: {
            billNumber: 'C-123',
            title: 'Government Title'
          },
          source: 'parliament-ca'
        },
        {
          data: {
            billNumber: 'C-123',
            title: 'Third Party Title'
          },
          source: 'openparliament'
        }
      ];

      const result = DataValidationService.crossValidate(records, 'bills');

      expect(result.conflictDetails[0].recommendation).toContain('parliament-ca');
    });

    it('should classify conflict severity', () => {
      const recordsLowSeverity = [
        {
          data: { billNumber: 'C-123', title: 'Title A' },
          source: 'source1'
        },
        {
          data: { billNumber: 'C-123', title: 'Title B' },
          source: 'source2'
        }
      ];

      const recordsHighSeverity = [
        {
          data: { 
            billNumber: 'C-123', 
            title: 'Title A',
            status: 'introduced',
            description: 'Desc A',
            category: 'Cat A'
          },
          source: 'source1'
        },
        {
          data: { 
            billNumber: 'C-123', 
            title: 'Title B',
            status: 'passed',
            description: 'Desc B',
            category: 'Cat B'
          },
          source: 'source2'
        }
      ];

      const lowResult = DataValidationService.crossValidate(recordsLowSeverity, 'bills');
      const highResult = DataValidationService.crossValidate(recordsHighSeverity, 'bills');

      expect(lowResult.conflictDetails[0].severity).toBe('low');
      expect(highResult.conflictDetails[0].severity).toBe('high');
    });
  });
});











































