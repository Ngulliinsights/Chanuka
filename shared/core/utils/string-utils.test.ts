/**
 * Unit Tests for String Manipulation Utilities
 * 
 * Tests string validation, formatting, transformation, and analysis functions.
 * 
 * **Validates: Requirements 7.1**
 */

import { StringUtils } from './string-utils';

describe('String Manipulation Utilities', () => {
  describe('String Validation', () => {
    describe('hasConsecutiveChars', () => {
      it('should detect consecutive characters', () => {
        expect(StringUtils.hasConsecutiveChars('hello', 'l')).toBe(true);
        expect(StringUtils.hasConsecutiveChars('aaa', 'a')).toBe(true);
      });

      it('should return false for non-consecutive characters', () => {
        expect(StringUtils.hasConsecutiveChars('hello', 'e')).toBe(false);
        expect(StringUtils.hasConsecutiveChars('abc', 'a')).toBe(false);
      });

      it('should handle empty strings', () => {
        expect(StringUtils.hasConsecutiveChars('', 'a')).toBe(false);
        expect(StringUtils.hasConsecutiveChars('hello', '')).toBe(false);
      });

      it('should handle special regex characters', () => {
        expect(StringUtils.hasConsecutiveChars('a..b', '.')).toBe(true);
        expect(StringUtils.hasConsecutiveChars('a**b', '*')).toBe(true);
      });
    });

    describe('containsIgnoreCase', () => {
      it('should find substring case-insensitively', () => {
        expect(StringUtils.containsIgnoreCase('Hello World', 'hello')).toBe(true);
        expect(StringUtils.containsIgnoreCase('Hello World', 'WORLD')).toBe(true);
      });

      it('should return false when substring not found', () => {
        expect(StringUtils.containsIgnoreCase('Hello World', 'goodbye')).toBe(false);
      });

      it('should handle empty strings', () => {
        expect(StringUtils.containsIgnoreCase('', 'test')).toBe(false);
        expect(StringUtils.containsIgnoreCase('test', '')).toBe(false);
      });
    });

    describe('equalsIgnoreCase', () => {
      it('should compare strings case-insensitively', () => {
        expect(StringUtils.equalsIgnoreCase('Hello', 'hello')).toBe(true);
        expect(StringUtils.equalsIgnoreCase('WORLD', 'world')).toBe(true);
      });

      it('should return false for different strings', () => {
        expect(StringUtils.equalsIgnoreCase('Hello', 'World')).toBe(false);
      });

      it('should handle exact matches', () => {
        expect(StringUtils.equalsIgnoreCase('test', 'test')).toBe(true);
      });

      it('should handle empty strings', () => {
        expect(StringUtils.equalsIgnoreCase('', '')).toBe(true);
        expect(StringUtils.equalsIgnoreCase('test', '')).toBe(false);
      });
    });

    describe('hasContent', () => {
      it('should return true for strings with content', () => {
        expect(StringUtils.hasContent('hello')).toBe(true);
        expect(StringUtils.hasContent('  test  ')).toBe(true);
      });

      it('should return false for empty or whitespace strings', () => {
        expect(StringUtils.hasContent('')).toBe(false);
        expect(StringUtils.hasContent('   ')).toBe(false);
        expect(StringUtils.hasContent('\t\n')).toBe(false);
      });
    });

    describe('hasValidLength', () => {
      it('should validate string length within bounds', () => {
        expect(StringUtils.hasValidLength('hello', 3, 10)).toBe(true);
        expect(StringUtils.hasValidLength('test', 4, 4)).toBe(true);
      });

      it('should return false for strings outside bounds', () => {
        expect(StringUtils.hasValidLength('hi', 3, 10)).toBe(false);
        expect(StringUtils.hasValidLength('verylongstring', 3, 10)).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(StringUtils.hasValidLength('', 0, 10)).toBe(true);
        expect(StringUtils.hasValidLength('test', -1, 10)).toBe(false);
        expect(StringUtils.hasValidLength('test', 10, 5)).toBe(false);
      });
    });

    describe('containsAnyChar', () => {
      it('should detect if string contains any specified characters', () => {
        expect(StringUtils.containsAnyChar('hello', ['e', 'x'])).toBe(true);
        expect(StringUtils.containsAnyChar('test', ['a', 'e', 'i'])).toBe(true);
      });

      it('should return false when no characters found', () => {
        expect(StringUtils.containsAnyChar('hello', ['x', 'y', 'z'])).toBe(false);
      });

      it('should handle empty arrays', () => {
        expect(StringUtils.containsAnyChar('hello', [])).toBe(false);
      });
    });
  });

  describe('String Formatting', () => {
    describe('format', () => {
      it('should convert to uppercase', () => {
        const result = StringUtils.format('hello', { case: 'upper' });
        expect(result).toBe('HELLO');
      });

      it('should convert to lowercase', () => {
        const result = StringUtils.format('HELLO', { case: 'lower' });
        expect(result).toBe('hello');
      });

      it('should convert to title case', () => {
        const result = StringUtils.format('hello world', { case: 'title' });
        expect(result).toBe('Hello World');
      });

      it('should add prefix and suffix', () => {
        const result = StringUtils.format('test', { prefix: '[', suffix: ']' });
        expect(result).toBe('[test]');
      });

      it('should truncate long strings', () => {
        const result = StringUtils.format('verylongstring', { truncate: 8 });
        expect(result).toBe('verylong...');
      });

      it('should apply multiple transformations', () => {
        const result = StringUtils.format('hello', {
          case: 'upper',
          prefix: '>>',
          suffix: '<<'
        });
        expect(result).toBe('>>HELLO<<');
      });
    });

    describe('toTitleCase', () => {
      it('should convert to title case', () => {
        expect(StringUtils.toTitleCase('hello world')).toBe('Hello World');
        expect(StringUtils.toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
      });

      it('should handle single word', () => {
        expect(StringUtils.toTitleCase('hello')).toBe('Hello');
      });
    });

    describe('toCamelCase', () => {
      it('should convert to camelCase', () => {
        expect(StringUtils.toCamelCase('hello world')).toBe('helloWorld');
        expect(StringUtils.toCamelCase('the quick brown fox')).toBe('theQuickBrownFox');
      });

      it('should handle single word', () => {
        expect(StringUtils.toCamelCase('hello')).toBe('hello');
      });
    });

    describe('toPascalCase', () => {
      it('should convert to PascalCase', () => {
        expect(StringUtils.toPascalCase('hello world')).toBe('HelloWorld');
        expect(StringUtils.toPascalCase('the quick brown fox')).toBe('TheQuickBrownFox');
      });

      it('should handle single word', () => {
        expect(StringUtils.toPascalCase('hello')).toBe('Hello');
      });
    });

    describe('toSnakeCase', () => {
      it('should convert to snake_case', () => {
        expect(StringUtils.toSnakeCase('hello world')).toBe('hello_world');
        expect(StringUtils.toSnakeCase('HelloWorld')).toBe('hello_world');
      });

      it('should handle camelCase input', () => {
        expect(StringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
      });
    });

    describe('toKebabCase', () => {
      it('should convert to kebab-case', () => {
        expect(StringUtils.toKebabCase('hello world')).toBe('hello-world');
        expect(StringUtils.toKebabCase('HelloWorld')).toBe('hello-world');
      });

      it('should handle camelCase input', () => {
        expect(StringUtils.toKebabCase('helloWorld')).toBe('hello-world');
      });
    });
  });

  describe('String Manipulation', () => {
    describe('normalize', () => {
      it('should trim and lowercase', () => {
        expect(StringUtils.normalize('  Hello World  ')).toBe('hello world');
      });

      it('should handle empty strings', () => {
        expect(StringUtils.normalize('')).toBe('');
      });
    });

    describe('trim', () => {
      it('should trim whitespace', () => {
        expect(StringUtils.trim('  hello  ')).toBe('hello');
      });

      it('should handle empty strings', () => {
        expect(StringUtils.trim('')).toBe('');
      });
    });

    describe('countOccurrences', () => {
      it('should count string occurrences', () => {
        expect(StringUtils.countOccurrences('hello hello world', 'hello')).toBe(2);
      });

      it('should count regex pattern occurrences', () => {
        expect(StringUtils.countOccurrences('test123test456', /\d+/)).toBe(2);
      });

      it('should return 0 for no matches', () => {
        expect(StringUtils.countOccurrences('hello', 'world')).toBe(0);
      });
    });

    describe('removeChars', () => {
      it('should remove specified characters', () => {
        expect(StringUtils.removeChars('hello-world', '-')).toBe('helloworld');
      });

      it('should remove regex pattern', () => {
        expect(StringUtils.removeChars('test123', /\d/g)).toBe('test');
      });

      it('should handle empty strings', () => {
        expect(StringUtils.removeChars('', 'x')).toBe('');
      });
    });

    describe('extractBeforePattern', () => {
      it('should extract substring before pattern', () => {
        const result = StringUtils.extractBeforePattern('hello-world', /-/);
        expect(result).toBe('hello');
      });

      it('should return null if pattern not found', () => {
        const result = StringUtils.extractBeforePattern('hello', /-/);
        expect(result).toBeNull();
      });
    });

    describe('joinWithOxfordComma', () => {
      it('should join two items with "and"', () => {
        expect(StringUtils.joinWithOxfordComma(['apple', 'banana'])).toBe('apple and banana');
      });

      it('should join three items with Oxford comma', () => {
        expect(StringUtils.joinWithOxfordComma(['apple', 'banana', 'cherry']))
          .toBe('apple, banana, and cherry');
      });

      it('should handle single item', () => {
        expect(StringUtils.joinWithOxfordComma(['apple'])).toBe('apple');
      });
    });
  });

  describe('String Analysis', () => {
    describe('levenshteinDistance', () => {
      it('should calculate edit distance', () => {
        expect(StringUtils.levenshteinDistance('kitten', 'sitting')).toBe(3);
        expect(StringUtils.levenshteinDistance('hello', 'hello')).toBe(0);
      });

      it('should handle empty strings', () => {
        expect(StringUtils.levenshteinDistance('', 'hello')).toBe(5);
        expect(StringUtils.levenshteinDistance('hello', '')).toBe(5);
      });
    });

    describe('similarity', () => {
      it('should calculate similarity score', () => {
        expect(StringUtils.similarity('hello', 'hello')).toBe(1);
        expect(StringUtils.similarity('hello', 'hallo')).toBeGreaterThan(0.5);
      });

      it('should return 1 for empty strings', () => {
        expect(StringUtils.similarity('', '')).toBe(1);
      });
    });

    describe('extractWords', () => {
      it('should extract words from string', () => {
        const words = StringUtils.extractWords('hello world test');
        expect(words).toEqual(['hello', 'world', 'test']);
      });

      it('should handle punctuation', () => {
        const words = StringUtils.extractWords('hello, world! test.');
        expect(words).toEqual(['hello', 'world', 'test']);
      });

      it('should return empty array for no words', () => {
        expect(StringUtils.extractWords('!!!')).toEqual([]);
      });
    });

    describe('countWords', () => {
      it('should count words', () => {
        expect(StringUtils.countWords('hello world test')).toBe(3);
      });

      it('should handle empty strings', () => {
        expect(StringUtils.countWords('')).toBe(0);
      });
    });
  });

  describe('String Validation', () => {
    describe('validate', () => {
      it('should validate with minLength', () => {
        const result = StringUtils.validate('hello', { minLength: 3 });
        expect(result.isValid).toBe(true);
      });

      it('should fail validation for too short strings', () => {
        const result = StringUtils.validate('hi', { minLength: 5 });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('String must be at least 5 characters long');
      });

      it('should validate with maxLength', () => {
        const result = StringUtils.validate('hello', { maxLength: 10 });
        expect(result.isValid).toBe(true);
      });

      it('should fail validation for too long strings', () => {
        const result = StringUtils.validate('verylongstring', { maxLength: 5 });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('String must be no more than 5 characters long');
      });

      it('should validate empty strings when allowed', () => {
        const result = StringUtils.validate('', { allowEmpty: true });
        expect(result.isValid).toBe(true);
      });

      it('should fail validation for empty strings when not allowed', () => {
        const result = StringUtils.validate('', { allowEmpty: false });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('String cannot be empty');
      });
    });

    describe('isValidEmail', () => {
      it('should validate correct email addresses', () => {
        expect(StringUtils.isValidEmail('test@example.com')).toBe(true);
        expect(StringUtils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(StringUtils.isValidEmail('invalid')).toBe(false);
        expect(StringUtils.isValidEmail('test@')).toBe(false);
        expect(StringUtils.isValidEmail('@example.com')).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        expect(StringUtils.isValidUrl('https://example.com')).toBe(true);
        expect(StringUtils.isValidUrl('http://test.org/path')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(StringUtils.isValidUrl('not-a-url')).toBe(false);
        expect(StringUtils.isValidUrl('htp://wrong')).toBe(false);
      });
    });

    describe('isAlphanumeric', () => {
      it('should validate alphanumeric strings', () => {
        expect(StringUtils.isAlphanumeric('abc123')).toBe(true);
        expect(StringUtils.isAlphanumeric('Test123')).toBe(true);
      });

      it('should reject non-alphanumeric strings', () => {
        expect(StringUtils.isAlphanumeric('test-123')).toBe(false);
        expect(StringUtils.isAlphanumeric('hello world')).toBe(false);
      });
    });

    describe('isNumeric', () => {
      it('should validate numeric strings', () => {
        expect(StringUtils.isNumeric('123')).toBe(true);
        expect(StringUtils.isNumeric('0')).toBe(true);
      });

      it('should reject non-numeric strings', () => {
        expect(StringUtils.isNumeric('12.3')).toBe(false);
        expect(StringUtils.isNumeric('abc')).toBe(false);
      });
    });
  });
});
