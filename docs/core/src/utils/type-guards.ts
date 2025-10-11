/**
 * Type guard utilities for type checking
 */
export class TypeGuards {
  static isNullOrUndefined(value: any): value is null | undefined {
    return value === null || value === undefined;
  }

  static isString(value: any): value is string {
    return typeof value === 'string';
  }

  static isNonEmptyString(value: any): value is string {
    return this.isString(value) && value.trim().length > 0;
  }

  static isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  static isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
  }

  static isArray(value: any): value is any[] {
    return Array.isArray(value);
  }

  static isObject(value: any): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}







