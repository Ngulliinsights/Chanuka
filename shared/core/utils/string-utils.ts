/**
 * String Utilities Module
 *
 * Provides comprehensive utilities for string manipulation, validation,
 * formatting, and processing operations.
 *
 * This module consolidates string-related utilities from various sources
 * into a unified, framework-agnostic interface.
 */


// ==================== Type Definitions ====================

export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  trim?: boolean;
}

export interface StringFormatOptions {
  case?: 'upper' | 'lower' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab';
  prefix?: string;
  suffix?: string;
  truncate?: number;
}

// ==================== String Validation ====================

export class StringUtils {
  /**
   * Checks if a string contains consecutive occurrences of a character
   */
  static hasConsecutiveChars(value: string, char: string): boolean {
    if (!value || !char || char.length !== 1) return false;
    const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escapedChar}{2,}`).test(value);
  }

  /**
   * Case-insensitive substring check
   */
  static containsIgnoreCase(value: string, searchStr: string): boolean {
    if (!value || !searchStr) return false;
    return value.toLowerCase().includes(searchStr.toLowerCase());
  }

  /**
   * Case-insensitive equality check
   */
  static equalsIgnoreCase(value: string, otherValue: string): boolean {
    if (value === otherValue) return true;
    if (!value || !otherValue) return false;
    return value.toLowerCase() === otherValue.toLowerCase();
  }

  /**
   * Normalizes a string by trimming and converting to lowercase
   */
  static normalize(value: string): string {
    return value ? value.trim().toLowerCase() : '';
  }

  /**
   * Checks if a string has non-whitespace content
   */
  static hasContent(value: string): boolean {
    return Boolean(value && value.trim().length > 0);
  }

  /**
   * Enhanced trim that handles null/undefined
   */
  static trim(value: string): string {
    return value ? value.trim() : '';
  }

  /**
   * Validates string length within bounds
   */
  static hasValidLength(value: string, min: number, max: number): boolean {
    if (!value || typeof min !== 'number' || typeof max !== 'number') return false;
    if (min < 0 || max < min) return false;
    const length = value.length;
    return length >= min && length <= max;
  }

  /**
   * Checks if string contains any of the specified characters
   */
  static containsAnyChar(value: string, chars: string[]): boolean {
    if (!value || !Array.isArray(chars)) return false;
    return chars.some(char => char && value.includes(char));
  }

  /**
   * Counts occurrences of a pattern in a string
   */
  static countOccurrences(value: string, pattern: string | RegExp): number {
    if (!value || !pattern) return 0;
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(pattern, 'g');
    return (value.match(regex) || []).length;
  }

  /**
   * Removes specified characters from a string
   */
  static removeChars(value: string, pattern: RegExp | string): string {
    if (!value) return '';
    if (typeof pattern === 'string') {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return value.replace(new RegExp(escapedPattern, 'g'), '');
    }
    return value.replace(pattern, '');
  }

  /**
   * Extracts substring before a pattern match
   */
  static extractBeforePattern(value: string, pattern: RegExp): string | null {
    if (!value || !pattern) return null;
    const match = value.match(pattern);
    return match?.index !== undefined ? value.slice(0, match.index) : null;
  }

  /**
   * Checks if string starts or ends with a character
   */
  static startsOrEndsWith(value: string, char: string): boolean {
    return value.startsWith(char) || value.endsWith(char);
  }

  static joinWithOxfordComma(items: string[]): string {
    if (items.length <= 2) return items.join(' and ');
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }

  // ==================== Enhanced String Formatting ====================

  /**
   * Formats a string according to specified options.
   */
  static format(value: string, options: StringFormatOptions = {}): string {
    if (!value) return value;

    let formatted = value;

    // Apply case transformation
    if (options.case) {
      switch (options.case) {
        case 'upper':
          formatted = formatted.toUpperCase();
          break;
        case 'lower':
          formatted = formatted.toLowerCase();
          break;
        case 'title':
          formatted = this.toTitleCase(formatted);
          break;
        case 'camel':
          formatted = this.toCamelCase(formatted);
          break;
        case 'pascal':
          formatted = this.toPascalCase(formatted);
          break;
        case 'snake':
          formatted = this.toSnakeCase(formatted);
          break;
        case 'kebab':
          formatted = this.toKebabCase(formatted);
          break;
      }
    }

    // Apply prefix and suffix
    if (options.prefix) {
      formatted = options.prefix + formatted;
    }
    if (options.suffix) {
      formatted = formatted + options.suffix;
    }

    // Apply truncation
    if (options.truncate && formatted.length > options.truncate) {
      formatted = formatted.substring(0, options.truncate) + '...';
    }

    return formatted;
  }

  /**
   * Converts string to title case.
   */
  static toTitleCase(value: string): string {
    return value.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Converts string to camelCase.
   */
  static toCamelCase(value: string): string {
    return value
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  }

  /**
   * Converts string to PascalCase.
   */
  static toPascalCase(value: string): string {
    return value
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '');
  }

  /**
   * Converts string to snake_case.
   */
  static toSnakeCase(value: string): string {
    return value
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('_');
  }

  /**
   * Converts string to kebab-case.
   */
  static toKebabCase(value: string): string {
    return value
      .replace(/\W+/g, ' ')
      .split(/ |\B(?=[A-Z])/)
      .map(word => word.toLowerCase())
      .join('-');
  }

  // ==================== String Analysis ====================

  /**
   * Calculates the Levenshtein distance between two strings.
   */
  static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) {
      if (matrix[0]) matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j++) {
      if (matrix[j]) matrix[j]![0] = j;
    }

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        if (matrix[j] && matrix[j - 1]) {
          matrix[j]![i] = Math.min(
            (matrix[j]![i - 1] ?? 0) + 1,     // deletion
            (matrix[j - 1]![i] ?? 0) + 1,     // insertion
            (matrix[j - 1]![i - 1] ?? 0) + indicator // substitution
          );
        }
      }
    }

    return matrix[b.length]?.[a.length] ?? 0;
  }

  /**
   * Calculates similarity between two strings (0-1).
   */
  static similarity(a: string, b: string): number {
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1;
    const distance = this.levenshteinDistance(a, b);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Extracts words from a string.
   */
  static extractWords(value: string): string[] {
    return value.match(/\b\w+\b/g) || [];
  }

  /**
   * Counts words in a string.
   */
  static countWords(value: string): number {
    return this.extractWords(value).length;
  }

  // ==================== String Validation ====================

  /**
   * Validates a string against comprehensive options.
   */
  static validate(value: string, options: StringValidationOptions = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.trim !== false) {
      value = value.trim();
    }

    if (!options.allowEmpty && !value) {
      errors.push('String cannot be empty');
    }

    if (options.minLength && value.length < options.minLength) {
      errors.push(`String must be at least ${options.minLength} characters long`);
    }

    if (options.maxLength && value.length > options.maxLength) {
      errors.push(`String must be no more than ${options.maxLength} characters long`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Checks if string is a valid email (basic validation).
   */
  static isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Checks if string is a valid URL.
   */
  static isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if string contains only alphanumeric characters.
   */
  static isAlphanumeric(value: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(value);
  }

  /**
   * Checks if string contains only numeric characters.
   */
  static isNumeric(value: string): boolean {
    return /^\d+$/.test(value);
  }
}
















































