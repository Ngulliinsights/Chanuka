/**
 * USSD Validator
 * 
 * Validation utilities for USSD requests and data
 */

import type { USSDRequest, USSDLanguage } from './ussd.types';
import { USSD_CONFIG } from './ussd.config';

export class USSDValidator {
  /**
   * Validate USSD request
   */
  validateRequest(request: USSDRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.sessionId || request.sessionId.trim() === '') {
      errors.push('Session ID is required');
    }

    if (!request.phoneNumber || request.phoneNumber.trim() === '') {
      errors.push('Phone number is required');
    } else if (!this.isValidPhoneNumber(request.phoneNumber)) {
      errors.push('Invalid phone number format');
    }

    if (!request.serviceCode || request.serviceCode.trim() === '') {
      errors.push('Service code is required');
    }

    if (request.text && request.text.length > USSD_CONFIG.maxTextLength) {
      errors.push(`Text exceeds maximum length of ${USSD_CONFIG.maxTextLength}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Kenyan phone number format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
    const patterns = [
      /^\+254[17]\d{8}$/,  // +254 format
      /^254[17]\d{8}$/,    // 254 format
      /^0[17]\d{8}$/       // 0 format
    ];

    return patterns.some(pattern => pattern.test(phoneNumber));
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove spaces and dashes
    let normalized = phoneNumber.replace(/[\s-]/g, '');

    // Convert to +254 format
    if (normalized.startsWith('0')) {
      normalized = '+254' + normalized.substring(1);
    } else if (normalized.startsWith('254')) {
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+')) {
      normalized = '+254' + normalized;
    }

    return normalized;
  }

  /**
   * Validate language code
   */
  isValidLanguage(language: string): language is USSDLanguage {
    return USSD_CONFIG.supportedLanguages.includes(language as USSDLanguage);
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    // Remove any non-alphanumeric characters except spaces and basic punctuation
    return input.replace(/[^\w\s.,!?-]/g, '').trim();
  }

  /**
   * Validate menu option selection
   */
  isValidMenuOption(option: string): boolean {
    // Menu options should be single digits 0-9
    return /^[0-9]$/.test(option);
  }
}

export const ussdValidator = new USSDValidator();
