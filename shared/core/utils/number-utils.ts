/**
 * Number utility functions for validation and calculations
 */
export class NumberUtils {
  static parseNumber(value: unknown): number {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    if (typeof value === 'number') {
      return value;
    }
    return NaN;
  }

  static isValidNumber(value: unknown): boolean {
    const num = this.parseNumber(value);
    return typeof num === 'number' && !isNaN(num) && isFinite(num);
  }

  static isGreaterOrEqual(value: number, min: number): boolean {
    return this.isValidNumber(value) && value >= min;
  }

  static isLessOrEqual(value: number, max: number): boolean {
    return this.isValidNumber(value) && value <= max;
  }

  static isInteger(value: number): boolean {
    return this.isValidNumber(value) && Number.isInteger(value);
  }

  static isPositive(value: number): boolean {
    return this.isValidNumber(value) && value >= 0;
  }

  static hasMaxDecimalPlaces(value: number, maxPlaces: number): boolean {
    if (!this.isValidNumber(value)) return false;
    const str = value.toString();
    const decimalIndex = str.indexOf('.');
    if (decimalIndex === -1) return true;
    return str.length - decimalIndex - 1 <= maxPlaces;
  }

  static isMultipleOfStep(value: number, min: number, step: number): boolean {
    if (!this.isValidNumber(value) || !this.isValidNumber(min) || !this.isValidNumber(step)) {
      return false;
    }
    const remainder = (value - min) % step;
    return Math.abs(remainder) < 1e-10; // Account for floating point precision
  }
}
















































