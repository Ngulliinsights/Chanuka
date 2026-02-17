import { validationMetricsCollector } from '@server/infrastructure/core/validation/validation-metrics';
import { logger } from '@server/infrastructure/observability';
import { z } from 'zod';

// Comprehensive data validation service for government data integration
export class GovernmentDataValidationService {
  
  // Validation rules for different data types
  private static readonly VALIDATION_RULES = {
    bills: {
      required: ['title', 'bill_number', 'status'],
      optional: ['description', 'content', 'summary', 'category', 'tags'],
      maxLengths: {
        title: 500,
        description: 2000,
        summary: 1000,
        bill_number: 50,
        category: 100
      },
      statusValues: ['introduced', 'committee', 'passed', 'failed', 'signed'],
      bill_numberPattern: /^[A-Z]{1,3}-?\d{1,4}$/i
    },
    sponsors: {
      required: ['name', 'role'],
      optional: ['party', 'constituency', 'email', 'phone', 'bio'],
      maxLengths: {
        name: 200,
        role: 100,
        party: 100,
        constituency: 200,
        bio: 2000
      },
      roleValues: ['MP', 'MPP', 'MLA', 'Senator', 'Minister', 'Premier', 'Prime Minister']
    }
  };

  /**
   * Validate bill data comprehensively
   */
  static validateBill(bill: unknown): ValidationResult {
    const endMetric = validationMetricsCollector.startValidation('GovernmentDataValidationService', 'validateBill');

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 0,
      details: {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        timeliness: 0
      }
    };

    // Check required fields
    const missingRequired = this.checkRequiredFields(bill, this.VALIDATION_RULES.bills.required);
    if (missingRequired.length > 0) {
      result.isValid = false;
      result.errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    // Validate field lengths
    const lengthErrors = this.validateFieldLengths(bill, this.VALIDATION_RULES.bills.maxLengths);
    if (lengthErrors.length > 0) {
      result.errors.push(...lengthErrors);
      result.isValid = false;
    }

    // Validate bill status
    if (bill.status && !this.VALIDATION_RULES.bills.statusValues.includes(bill.status)) {
      result.warnings.push(`Invalid bill status: ${bill.status}. Expected one of: ${this.VALIDATION_RULES.bills.statusValues.join(', ')}`);
    }

    // Validate bill number format
    if (bill.bill_number && !this.VALIDATION_RULES.bills.bill_numberPattern.test(bill.bill_number)) {
      result.warnings.push(`Bill number format may be invalid: ${bill.bill_number}`);
    }

    // Validate dates
    const dateValidation = this.validateDates(bill, ['introduced_date', 'last_action_date']);
    result.errors.push(...dateValidation.errors);
    result.warnings.push(...dateValidation.warnings);
    if (dateValidation.errors.length > 0) {
      result.isValid = false;
    }

    // Calculate completeness score
    result.details.completeness = this.calculateCompleteness(bill, [
      ...this.VALIDATION_RULES.bills.required,
      ...this.VALIDATION_RULES.bills.optional
    ]);

    // Calculate accuracy score (based on format validation)
    result.details.accuracy = this.calculateAccuracy(result.errors, result.warnings);

    // Calculate consistency score
    result.details.consistency = this.calculateConsistency(bill);

    // Calculate timeliness score
    result.details.timeliness = this.calculateTimeliness(bill);

    // Overall score
    result.score = (
      result.details.completeness * 0.3 +
      result.details.accuracy * 0.3 +
      result.details.consistency * 0.2 +
      result.details.timeliness * 0.2
    );

    endMetric(result.isValid, result.isValid ? undefined : 'validation_failed', 'business_logic');

    return result;
  }

  /**
   * Validate sponsor data comprehensively
   */
  static validateSponsor(sponsor: unknown): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 0,
      details: {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        timeliness: 0
      }
    };

    // Check required fields
    const missingRequired = this.checkRequiredFields(sponsor, this.VALIDATION_RULES.sponsors.required);
    if (missingRequired.length > 0) {
      result.isValid = false;
      result.errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
    }

    // Validate field lengths
    const lengthErrors = this.validateFieldLengths(sponsor, this.VALIDATION_RULES.sponsors.maxLengths);
    if (lengthErrors.length > 0) {
      result.errors.push(...lengthErrors);
      result.isValid = false;
    }

    // Validate role
    if (sponsor.role && !this.VALIDATION_RULES.sponsors.roleValues.includes(sponsor.role)) {
      result.warnings.push(`Uncommon role: ${sponsor.role}. Expected one of: ${this.VALIDATION_RULES.sponsors.roleValues.join(', ')}`);
    }

    // Validate email format
    if (sponsor.email && !this.isValidEmail(sponsor.email)) {
      result.errors.push(`Invalid email format: ${sponsor.email}`);
      result.isValid = false;
    }

    // Validate phone format
    if (sponsor.phone && !this.isValidPhone(sponsor.phone)) {
      result.warnings.push(`Phone number format may be invalid: ${sponsor.phone}`);
    }

    // Calculate completeness score
    result.details.completeness = this.calculateCompleteness(sponsor, [
      ...this.VALIDATION_RULES.sponsors.required,
      ...this.VALIDATION_RULES.sponsors.optional
    ]);

    // Calculate accuracy score
    result.details.accuracy = this.calculateAccuracy(result.errors, result.warnings);

    // Calculate consistency score
    result.details.consistency = this.calculateConsistency(sponsor);

    // Calculate timeliness score
    result.details.timeliness = this.calculateTimeliness(sponsor);

    // Overall score
    result.score = (
      result.details.completeness * 0.3 +
      result.details.accuracy * 0.3 +
      result.details.consistency * 0.2 +
      result.details.timeliness * 0.2
    );

    return result;
  }

  /**
   * Validate batch of records
   */
  static validateBatch(records: unknown[], type: 'bills' | 'sponsors'): BatchValidationResult {
    const results: ValidationResult[] = [];
    const validRecords: unknown[] = [];
    const invalidRecords: unknown[] = [];

    for (const record of records) {
      const validation = type === 'bills' 
        ? this.validateBill(record)
        : this.validateSponsor(record);
      
      results.push(validation);
      
      if (validation.isValid) {
        validRecords.push(record);
      } else {
        invalidRecords.push({ record, validation });
      }
    }

    const totalScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const validCount = validRecords.length;
    const invalidCount = invalidRecords.length;

    return {
      totalRecords: records.length,
      validRecords: validCount,
      invalidRecords: invalidCount,
      validationRate: validCount / records.length,
      averageScore: totalScore,
      results,
      validData: validRecords,
      invalidData: invalidRecords,
      summary: {
        completeness: results.reduce((sum, r) => sum + r.details.completeness, 0) / results.length,
        accuracy: results.reduce((sum, r) => sum + r.details.accuracy, 0) / results.length,
        consistency: results.reduce((sum, r) => sum + r.details.consistency, 0) / results.length,
        timeliness: results.reduce((sum, r) => sum + r.details.timeliness, 0) / results.length
      }
    };
  }

  /**
   * Cross-validate data between sources for conflict detection
   */
  static crossValidate(records: Array<{ data: unknown; source: string }>, type: 'bills' | 'sponsors'): CrossValidationResult {
    const conflicts: DataConflict[] = [];
    const groupedRecords = this.groupRecordsByIdentifier(records, type);

    for (const [identifier, recordGroup] of groupedRecords) {
      if (recordGroup.length > 1) {
        const conflictAnalysis = this.analyzeRecordConflicts(recordGroup, type);
        if (conflictAnalysis.hasConflicts) {
          conflicts.push({
            identifier,
            type,
            sources: recordGroup.map(r => r.source),
            conflicts: conflictAnalysis.conflicts,
            severity: conflictAnalysis.severity,
            recommendation: conflictAnalysis.recommendation
          });
        }
      }
    }

    return {
      totalRecords: records.length,
      uniqueRecords: groupedRecords.size,
      duplicateGroups: Array.from(groupedRecords.values()).filter(group => group.length > 1).length,
      conflicts: conflicts.length,
      conflictDetails: conflicts,
      overallConsistency: conflicts.length === 0 ? 1.0 : Math.max(0, 1 - (conflicts.length / groupedRecords.size))
    };
  }

  /**
   * Check for required fields
   */
  private static checkRequiredFields(data: unknown, requiredFields: string[]): string[] {
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missing.push(field);
      }
    }
    
    return missing;
  }

  /**
   * Validate field lengths
   */
  private static validateFieldLengths(data: unknown, maxLengths: Record<string, number>): string[] {
    const errors: string[] = [];
    
    for (const [field, maxLength] of Object.entries(maxLengths)) {
      if (data[field] && typeof data[field] === 'string' && data[field].length > maxLength) {
        errors.push(`Field '${field}' exceeds maximum length of ${maxLength} characters`);
      }
    }
    
    return errors;
  }

  /**
   * Validate date fields
   */
  private static validateDates(data: unknown, dateFields: string[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const field of dateFields) {
      if (data[field]) {
        const date = new Date(data[field]);
        if (isNaN(date.getTime())) {
          errors.push(`Invalid date format for field '${field}': ${data[field]}`);
        } else {
          // Check if date is in the future (warning for introduced dates)
          if (field === 'introduced_date' && date > new Date()) {
            warnings.push(`Future date for '${field}': ${data[field]}`);
          }
          
          // Check if date is too old (warning)
          const yearsSinceDate = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
          if (yearsSinceDate > 50) {
            warnings.push(`Very old date for '${field}': ${data[field]}`);
          }
        }
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Calculate completeness score (0-1)
   */
  private static calculateCompleteness(data: unknown, allFields: string[]): number {
    const presentFields = allFields.filter(field => 
      data[field] && 
      (typeof data[field] !== 'string' || data[field].trim() !== '')
    );
    
    return presentFields.length / allFields.length;
  }

  /**
   * Calculate accuracy score based on validation errors
   */
  private static calculateAccuracy(errors: string[], warnings: string[]): number {
    // Start with perfect score and deduct for errors and warnings
    let score = 1.0;
    score -= errors.length * 0.2; // Each error reduces score by 0.2
    score -= warnings.length * 0.1; // Each warning reduces score by 0.1
    
    return Math.max(0, score);
  }

  /**
   * Calculate consistency score
   */
  private static calculateConsistency(data: unknown): number {
    let score = 1.0;
    
    // Check for internal consistency issues
    if (data.introduced_date && data.last_action_date) {
      const introduced = new Date(data.introduced_date);
      const lastAction = new Date(data.last_action_date);
      
      if (introduced > lastAction) {
        score -= 0.3; // Major consistency issue
      }
    }
    
    // Check status consistency with dates
    if (data.status === 'introduced' && data.last_action_date) {
      const daysSinceIntroduction = (new Date().getTime() - new Date(data.last_action_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceIntroduction > 365) {
        score -= 0.1; // Minor consistency issue - bill introduced long ago but still shows as introduced
      }
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate timeliness score
   */
  private static calculateTimeliness(data: unknown): number {
    if (!data.lastUpdated) return 0.5; // Neutral score if no update info
    
    const lastUpdate = new Date(data.lastUpdated);
    const daysSinceUpdate = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Score decreases as data gets older
    if (daysSinceUpdate <= 1) return 1.0;
    if (daysSinceUpdate <= 7) return 0.9;
    if (daysSinceUpdate <= 30) return 0.7;
    if (daysSinceUpdate <= 90) return 0.5;
    if (daysSinceUpdate <= 365) return 0.3;
    
    return 0.1; // Very old data
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (flexible for different formats)
   */
  private static isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Accept 10 or 11 digit numbers (North American format)
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  }

  /**
   * Group records by identifier for cross-validation
   */
  private static groupRecordsByIdentifier(
    records: Array<{ data: any; source: string }>, 
    type: 'bills' | 'sponsors'
  ): Map<string, Array<{ data: any; source: string }>> {
    const groups = new Map();
    
    for (const record of records) {
      let identifier: string;
      
      if (type === 'bills') {
        identifier = record.data.bill_number || record.data.id || 'unknown';
      } else {
        // For sponsors, use name + role as identifier
        identifier = `${record.data.name || 'unknown'}|${record.data.role || 'unknown'}`;
      }
      
      if (!groups.has(identifier)) {
        groups.set(identifier, []);
      }
      groups.get(identifier).push(record);
    }
    
    return groups;
  }

  /**
   * Analyze conflicts between records from different sources
   */
  private static analyzeRecordConflicts(
    recordGroup: Array<{ data: any; source: string }>, 
    type: 'bills' | 'sponsors'
  ): ConflictAnalysis {
    const conflicts: string[] = [];
    const fieldsToCheck = type === 'bills' 
      ? ['title', 'status', 'description', 'category']
      : ['name', 'party', 'constituency', 'email'];

    // Compare each field across sources
    for (const field of fieldsToCheck) {
      const values = recordGroup
        .map(r => r.data[field])
        .filter(v => v && v.trim && v.trim() !== '');
      
      const uniqueValues = [...new Set(values)];
      
      if (uniqueValues.length > 1) {
        conflicts.push(`${field}: ${uniqueValues.join(' vs ')}`);
      }
    }

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (conflicts.length > 3) severity = 'high';
    else if (conflicts.length > 1) severity = 'medium';

    let recommendation = '';
    if (conflicts.length > 0) {
      // Find the source with highest priority (assuming government sources are more authoritative)
      const priorityOrder = ['parliament-ke', 'senate-ke', 'county-assemblies'];
      const authoritative = recordGroup.find(r => priorityOrder.includes(r.source));
      
      if (authoritative) {
        recommendation = `Use data from ${authoritative.source} as authoritative source`;
      } else {
        recommendation = 'Manual review required to resolve conflicts';
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      severity,
      recommendation
    };
  }
}

// Type definitions for validation results
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-1 scale
  details: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
}

interface BatchValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationRate: number;
  averageScore: number;
  results: ValidationResult[];
  validData: unknown[];
  invalidData: Array<{ record: any; validation: ValidationResult }>;
  summary: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
}

interface CrossValidationResult {
  totalRecords: number;
  uniqueRecords: number;
  duplicateGroups: number;
  conflicts: number;
  conflictDetails: DataConflict[];
  overallConsistency: number;
}

interface DataConflict {
  identifier: string;
  type: 'bills' | 'sponsors';
  sources: string[];
  conflicts: string[];
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

interface ConflictAnalysis {
  hasConflicts: boolean;
  conflicts: string[];
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export type {
  ValidationResult,
  BatchValidationResult,
  CrossValidationResult,
  DataConflict,
  ConflictAnalysis
};













































