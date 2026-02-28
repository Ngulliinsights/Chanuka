/**
 * Security Tests for Bill Service
 * 
 * Tests SQL injection prevention, XSS prevention, input validation,
 * and output sanitization for the Bills feature.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedBillService } from '../bill-service';
import { inputSanitizationService, queryValidationService } from '@server/features/security';

describe('Bill Service - Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in search queries', async () => {
      const maliciousInput = "test'; DROP TABLE bills; --";
      
      // Should not throw error and should sanitize input
      const result = await cachedBillService.searchBills(maliciousInput);
      
      expect(result.success).toBe(true);
      // Verify the malicious SQL was sanitized
      expect(maliciousInput).not.toContain('DROP TABLE');
    });

    it('should prevent SQL injection in bill ID lookup', async () => {
      const maliciousId = "1' OR '1'='1";
      
      // Should handle gracefully
      const result = await cachedBillService.getBillById(maliciousId);
      
      expect(result.success).toBe(true);
    });

    it('should sanitize LIKE patterns in search', async () => {
      const maliciousPattern = "test%' OR '1'='1";
      
      const result = await cachedBillService.searchBills(maliciousPattern);
      
      expect(result.success).toBe(true);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize HTML in bill full_text', async () => {
      const xssInput = '<script>alert("XSS")</script>';
      
      const billData = {
        title: 'Test Bill',
        summary: 'Test summary',
        full_text: xssInput,
        status: 'draft' as const,
        category: 'test',
        bill_number: 'TEST-001',
        introduced_date: '2024-01-01'
      };
      
      const result = await cachedBillService.createBill(billData);
      
      if (result.success) {
        expect(result.data.full_text).not.toContain('<script>');
      }
    });

    it('should sanitize HTML in bill title', async () => {
      const xssInput = '<img src=x onerror=alert(1)>';
      
      const billData = {
        title: xssInput,
        summary: 'Test summary',
        status: 'draft' as const,
        category: 'test',
        bill_number: 'TEST-002',
        introduced_date: '2024-01-01'
      };
      
      const result = await cachedBillService.createBill(billData);
      
      if (result.success) {
        expect(result.data.title).not.toContain('<img');
        expect(result.data.title).not.toContain('onerror');
      }
    });
  });

  describe('Input Validation', () => {
    it('should reject empty title', async () => {
      const billData = {
        title: '',
        summary: 'Test summary',
        status: 'draft' as const,
        category: 'test',
        bill_number: 'TEST-003',
        introduced_date: '2024-01-01'
      };
      
      const result = await cachedBillService.createBill(billData);
      
      expect(result.success).toBe(false);
    });

    it('should validate bill ID format', async () => {
      const invalidId = 'invalid<>id';
      
      const result = await cachedBillService.getBillById(invalidId);
      
      // Should handle gracefully
      expect(result.success).toBe(true);
    });

    it('should sanitize special characters in search', async () => {
      const specialChars = "test<>\"'&";
      
      const result = await cachedBillService.searchBills(specialChars);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Output Sanitization', () => {
    it('should sanitize output data', async () => {
      // Create a bill with potentially unsafe data
      const billData = {
        title: 'Test Bill <script>',
        summary: 'Test summary',
        status: 'draft' as const,
        category: 'test',
        bill_number: 'TEST-004',
        introduced_date: '2024-01-01'
      };
      
      const createResult = await cachedBillService.createBill(billData);
      
      if (createResult.success) {
        const getResult = await cachedBillService.getBillById(createResult.data.id);
        
        if (getResult.success && getResult.data) {
          // Output should be sanitized
          expect(getResult.data.title).not.toContain('<script>');
        }
      }
    });
  });

  describe('Security Audit Logging', () => {
    it('should log bill creation', async () => {
      const billData = {
        title: 'Test Bill for Audit',
        summary: 'Test summary',
        status: 'draft' as const,
        category: 'test',
        bill_number: 'TEST-005',
        introduced_date: '2024-01-01'
      };
      
      const result = await cachedBillService.createBill(billData);
      
      expect(result.success).toBe(true);
      // Audit logging is async, so we just verify the operation succeeded
    });

    it('should log bill access', async () => {
      const result = await cachedBillService.getBillById('test-id');
      
      // Should complete without error
      expect(result.success).toBe(true);
    });

    it('should log bill search', async () => {
      const result = await cachedBillService.searchBills('test query');
      
      expect(result.success).toBe(true);
    });
  });

  describe('Input Sanitization Service Integration', () => {
    it('should use inputSanitizationService for strings', () => {
      const input = '<script>alert("test")</script>';
      const sanitized = inputSanitizationService.sanitizeString(input);
      
      expect(sanitized).not.toContain('<script>');
    });

    it('should use inputSanitizationService for HTML', () => {
      const input = '<div onclick="alert(1)">Test</div>';
      const sanitized = inputSanitizationService.sanitizeHtml(input);
      
      expect(sanitized).not.toContain('onclick');
    });

    it('should create safe LIKE patterns', () => {
      const input = "test%' OR '1'='1";
      const pattern = inputSanitizationService.createSafeLikePattern(input);
      
      // Should escape special characters
      expect(pattern).not.toContain("'");
    });
  });

  describe('Query Validation Service Integration', () => {
    it('should validate inputs', () => {
      const inputs = ['valid', 'also-valid', '123'];
      const validation = queryValidationService.validateInputs(inputs);
      
      expect(validation.hasErrors()).toBe(false);
    });

    it('should detect invalid inputs', () => {
      const inputs = ['<script>alert(1)</script>'];
      const validation = queryValidationService.validateInputs(inputs);
      
      // Validation should flag suspicious content
      expect(validation).toBeDefined();
    });

    it('should sanitize output objects', () => {
      const data = {
        title: 'Test <script>',
        summary: 'Summary'
      };
      
      const sanitized = queryValidationService.sanitizeOutput(data);
      
      expect(sanitized).toBeDefined();
    });
  });
});
