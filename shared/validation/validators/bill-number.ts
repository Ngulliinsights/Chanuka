/**
 * Bill Number Validation Utility
 * 
 * Validates Kenyan bill number formats.
 * Kenyan bills follow patterns like: "Bill No. 2024/001" or "2024-001"
 */

export interface BillNumberValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
  metadata?: {
    year?: number;
    sequence?: number;
    type?: string;
  };
}

/**
 * Validate Kenyan bill number format
 * 
 * Accepts formats:
 * - "2024/001" - Year/Sequence
 * - "Bill No. 2024/001" - Full format
 * - "2024-001" - Alternative separator
 * 
 * @param billNumber - The bill number to validate
 * @returns Validation result with normalized format
 * 
 * @example
 * ```typescript
 * const result = validateBillNumber('2024/001');
 * if (result.isValid) {
 *   console.log('Normalized:', result.normalized); // "2024/001"
 *   console.log('Year:', result.metadata?.year); // 2024
 * }
 * ```
 */
export function validateBillNumber(billNumber: string): BillNumberValidationResult {
  if (!billNumber || typeof billNumber !== 'string') {
    return { isValid: false, error: 'Bill number is required' };
  }

  const trimmed = billNumber.trim();

  // Remove "Bill No." prefix if present
  const cleaned = trimmed.replace(/^Bill\s+No\.\s*/i, '');

  // Pattern: YYYY/NNN or YYYY-NNN
  const billRegex = /^(\d{4})[\/\-](\d{1,4})$/;
  const match = cleaned.match(billRegex);

  if (!match) {
    return { 
      isValid: false, 
      error: 'Invalid bill number format. Expected format: YYYY/NNN (e.g., 2024/001)' 
    };
  }

  const year = parseInt(match[1]!, 10);
  const sequence = parseInt(match[2]!, 10);

  // Validate year (reasonable range)
  const currentYear = new Date().getFullYear();
  if (year < 2010 || year > currentYear + 1) {
    return { 
      isValid: false, 
      error: `Invalid year. Must be between 2010 and ${currentYear + 1}` 
    };
  }

  // Validate sequence number
  if (sequence < 1 || sequence > 9999) {
    return { 
      isValid: false, 
      error: 'Bill sequence number must be between 1 and 9999' 
    };
  }

  // Normalize to standard format (YYYY/NNN with zero-padding)
  const normalized = `${year}/${sequence.toString().padStart(3, '0')}`;

  return {
    isValid: true,
    normalized,
    metadata: {
      year,
      sequence,
      type: 'parliamentary',
    },
  };
}

/**
 * Parse bill number into components
 * 
 * @param billNumber - The bill number to parse
 * @returns Parsed components or null if invalid
 */
export function parseBillNumber(billNumber: string): {
  year: number;
  sequence: number;
  formatted: string;
} | null {
  const result = validateBillNumber(billNumber);
  
  if (!result.isValid || !result.metadata) {
    return null;
  }

  return {
    year: result.metadata.year!,
    sequence: result.metadata.sequence!,
    formatted: result.normalized!,
  };
}

/**
 * Format bill number for display
 * 
 * @param billNumber - The bill number to format
 * @param includePrefix - Whether to include "Bill No." prefix
 * @returns Formatted bill number
 */
export function formatBillNumber(
  billNumber: string,
  includePrefix = false
): string {
  const result = validateBillNumber(billNumber);
  
  if (!result.isValid || !result.normalized) {
    return billNumber; // Return original if invalid
  }

  return includePrefix 
    ? `Bill No. ${result.normalized}` 
    : result.normalized;
}

/**
 * Compare two bill numbers
 * 
 * @param a - First bill number
 * @param b - Second bill number
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareBillNumbers(a: string, b: string): number {
  const parsedA = parseBillNumber(a);
  const parsedB = parseBillNumber(b);

  if (!parsedA || !parsedB) {
    return 0; // Can't compare invalid numbers
  }

  // Compare by year first
  if (parsedA.year !== parsedB.year) {
    return parsedA.year - parsedB.year;
  }

  // Then by sequence
  return parsedA.sequence - parsedB.sequence;
}
