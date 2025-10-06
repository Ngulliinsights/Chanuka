/**
 * String utility functions for validation and data processing
 */
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
    return match && match.index !== undefined ? value.slice(0, match.index) : null;
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
}
