/**
 * Base Transformers
 * Common transformation patterns and utilities
 * 
 * Requirements: 4.1, 4.2
 */

import type { Transformer, PartialTransformer, TransformationContext, TransformationOptions } from './types';

/**
 * Identity transformer - returns input unchanged
 * Useful for testing and as a default transformer
 */
export function createIdentityTransformer<T>(): Transformer<T, T> {
  return {
    transform: (source: T) => source,
    reverse: (target: T) => target,
  };
}

/**
 * Helper function to validate if a Date object is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Date serialization transformer
 * Converts Date objects to ISO strings and vice versa
 * Validates dates to prevent Invalid Date errors
 */
export const dateToStringTransformer: Transformer<Date, string> = {
  transform: (date: Date): string => {
    if (!isValidDate(date)) {
      throw new Error(`Cannot transform invalid date: ${date}`);
    }
    return date.toISOString();
  },
  reverse: (str: string): Date => {
    const date = new Date(str);
    if (!isValidDate(date)) {
      throw new Error(`Cannot parse invalid date string: ${str}`);
    }
    return date;
  },
};

/**
 * Optional date serialization transformer
 * Handles null/undefined dates
 * Validates dates to prevent Invalid Date errors
 */
export const optionalDateToStringTransformer: Transformer<Date | null | undefined, string | null> = {
  transform: (date: Date | null | undefined): string | null => {
    if (!date) return null;
    if (!isValidDate(date)) {
      throw new Error(`Cannot transform invalid date: ${date}`);
    }
    return date.toISOString();
  },
  reverse: (str: string | null): Date | null => {
    if (!str) return null;
    const date = new Date(str);
    if (!isValidDate(date)) {
      throw new Error(`Cannot parse invalid date string: ${str}`);
    }
    return date;
  },
};

/**
 * Enum transformer
 * Converts between enum values and strings
 */
export function createEnumTransformer<TEnum extends string>(
  enumValues: readonly TEnum[]
): Transformer<TEnum, string> {
  return {
    transform: (value: TEnum): string => value,
    reverse: (str: string): TEnum => {
      if (!enumValues.includes(str as TEnum)) {
        throw new Error(`Invalid enum value: ${str}. Expected one of: ${enumValues.join(', ')}`);
      }
      return str as TEnum;
    },
  };
}

/**
 * Array transformer
 * Applies a transformer to each element in an array
 */
export function createArrayTransformer<TSource, TTarget>(
  elementTransformer: Transformer<TSource, TTarget>
): Transformer<TSource[], TTarget[]> {
  return {
    transform: (sources: TSource[]): TTarget[] => {
      return sources.map(source => elementTransformer.transform(source));
    },
    reverse: (targets: TTarget[]): TSource[] => {
      return targets.map(target => elementTransformer.reverse(target));
    },
  };
}

/**
 * Optional array transformer
 * Handles null/undefined arrays
 */
export function createOptionalArrayTransformer<TSource, TTarget>(
  elementTransformer: Transformer<TSource, TTarget>
): Transformer<TSource[] | null | undefined, TTarget[] | null> {
  return {
    transform: (sources: TSource[] | null | undefined): TTarget[] | null => {
      return sources ? sources.map(source => elementTransformer.transform(source)) : null;
    },
    reverse: (targets: TTarget[] | null): TSource[] | null => {
      return targets ? targets.map(target => elementTransformer.reverse(target)) : null;
    },
  };
}

/**
 * Optional field transformer
 * Handles null/undefined values
 */
export function createOptionalTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>
): Transformer<TSource | null | undefined, TTarget | null> {
  return {
    transform: (source: TSource | null | undefined): TTarget | null => {
      return source != null ? transformer.transform(source) : null;
    },
    reverse: (target: TTarget | null): TSource | null => {
      return target != null ? transformer.reverse(target) : null;
    },
  };
}

/**
 * Field mapping transformer
 * Renames fields during transformation
 */
export function createFieldMappingTransformer<TSource extends Record<string, unknown>, TTarget extends Record<string, unknown>>(
  fieldMappings: Record<string, string>
): PartialTransformer<TSource, TTarget> {
  return {
    transform: (source: TSource): TTarget => {
      const result: Record<string, unknown> = {};

      for (const [sourceKey, targetKey] of Object.entries(fieldMappings)) {
        if (sourceKey in source) {
          result[targetKey] = source[sourceKey];
        }
      }

      return result as TTarget;
    },
  };
}

/**
 * Compose two transformers into a single transformer
 * Useful for creating transformation pipelines
 */
export function composeTransformers<T1, T2, T3>(
  first: Transformer<T1, T2>,
  second: Transformer<T2, T3>
): Transformer<T1, T3> {
  return {
    transform: (source: T1): T3 => {
      const intermediate = first.transform(source);
      return second.transform(intermediate);
    },
    reverse: (target: T3): T1 => {
      const intermediate = second.reverse(target);
      return first.reverse(intermediate);
    },
  };
}

/**
 * Create a transformer with validation
 * Validates data before and after transformation
 */
export function createValidatingTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>,
  validateSource?: (source: TSource) => boolean,
  validateTarget?: (target: TTarget) => boolean
): Transformer<TSource, TTarget> {
  return {
    transform: (source: TSource): TTarget => {
      if (validateSource && !validateSource(source)) {
        throw new Error('Source validation failed');
      }

      const target = transformer.transform(source);

      if (validateTarget && !validateTarget(target)) {
        throw new Error('Target validation failed');
      }

      return target;
    },
    reverse: (target: TTarget): TSource => {
      if (validateTarget && !validateTarget(target)) {
        throw new Error('Target validation failed');
      }

      const source = transformer.reverse(target);

      if (validateSource && !validateSource(source)) {
        throw new Error('Source validation failed');
      }

      return source;
    },
  };
}

/**
 * Create a transformer with context support
 * Allows passing additional context during transformation
 */
export function createContextualTransformer<TSource, TTarget>(
  transform: (source: TSource, context?: TransformationContext) => TTarget,
  reverse: (target: TTarget, context?: TransformationContext) => TSource
): {
  transform: (source: TSource, context?: TransformationContext) => TTarget;
  reverse: (target: TTarget, context?: TransformationContext) => TSource;
} {
  return {
    transform,
    reverse,
  };
}

/**
 * Apply transformation options to a transformer
 * Filters fields based on options
 */
export function applyTransformationOptions<T extends Record<string, unknown>>(
  data: T,
  options?: TransformationOptions
): T {
  if (!options) {
    return data;
  }

  let result = { ...data };

  // Apply field exclusions
  if (options.excludeFields) {
    for (const field of options.excludeFields) {
      delete result[field];
    }
  }

  // Apply field inclusions (if specified, only include these fields)
  if (options.includeFields) {
    const filtered: Record<string, unknown> = {};
    for (const field of options.includeFields) {
      if (field in result) {
        filtered[field] = result[field];
      }
    }
    result = filtered as T;
  }

  // Handle null fields
  if (!options.includeNullFields) {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result)) {
      if (value != null) {
        filtered[key] = value;
      }
    }
    result = filtered as T;
  }

  return result;
}

/**
 * Create a safe transformer that catches errors
 * Returns null on transformation failure instead of throwing
 */
export function createSafeTransformer<TSource, TTarget>(
  transformer: Transformer<TSource, TTarget>
): Transformer<TSource, TTarget | null> {
  return {
    transform: (source: TSource): TTarget | null => {
      try {
        return transformer.transform(source);
      } catch {
        return null;
      }
    },
    reverse: (target: TTarget | null): TSource | null => {
      if (target === null) {
        return null;
      }
      try {
        return transformer.reverse(target);
      } catch {
        return null;
      }
    },
  };
}
