/**
 * Migration Compatibility Layer
 *
 * Provides backward compatibility during the migration from legacy lib/ to FSD structure
 */

import {
  useFormBuilder,
  withFormBuilder,
  createFormBuilder
} from '@client/shared/lib/form-builder';

import {
  validationPatterns,
  billValidationSchemas,
  userValidationSchemas,
  formValidationSchemas,
  allValidationSchemas,
} from '@client/shared/lib/validation';

import {
  queryClient,
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  cacheUtils,
  configureOfflineSupport,
  setupGlobalErrorHandler,
  devUtils,
} from '@client/shared/lib/query-client';

import {
  cn,
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  truncateText,
  debounce,
  isValidEmail,
  isValidKenyaPhoneNumber,
  generateId,
  capitalize,
  slugify,
} from '@client/shared/lib/utils';

// Legacy exports for backward compatibility
export {
  useFormBuilder,
  withFormBuilder,
  createFormBuilder,
  validationPatterns,
  billValidationSchemas,
  userValidationSchemas,
  formValidationSchemas,
  allValidationSchemas,
  queryClient,
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  cacheUtils,
  configureOfflineSupport,
  setupGlobalErrorHandler,
  devUtils,
  cn,
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  truncateText,
  debounce,
  isValidEmail,
  isValidKenyaPhoneNumber,
  generateId,
  capitalize,
  slugify,
};

// Legacy type exports
export type {
  FormBuilderOptions,
  FormBuilderReturn,
  FormValidationContext,
  FormSubmissionResult,
  FormFieldConfig,
  FormConfig,
  FormBuilderService,
  FormBuilderFactoryConfig,
} from '@client/shared/lib/form-builder';

export type {
  ValidationContext,
  ValidationResult,
  FieldValidationConfig,
  FormValidationConfig,
  ValidationService,
  ValidationFactoryConfig,
  ValidationMiddleware,
  ValidationCache,
  ValidationRule,
  ValidationGroup,
} from '@client/shared/lib/validation';

export type {
  ApiRequestConfig,
  ApiResponse,
  QueryFunctionConfig,
  QueryClientConfigFSD,
  QueryKeyFactory,
  QueryCacheUtils,
  OfflineSupportConfig,
  ErrorHandlingConfig,
  DevUtilsConfig,
} from '@client/shared/lib/query-client';

export type {
  QueryKeyFactory,
  QueryCacheUtils,
  OfflineSupportConfig,
  ErrorHandlingConfig,
  DevUtilsConfig,
} from '@client/shared/lib/query-client';

// Migration utilities
export const migrationUtils = {
  /**
   * Logs a deprecation warning for legacy imports
   */
  logDeprecationWarning: (oldImport: string, newImport: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`
DEPRECATED IMPORT DETECTED

Old import: ${oldImport}
New import: ${newImport}

Please update your imports to use the new FSD structure.
This will be removed in a future version.
      `);
    }
  },

  /**
   * Checks if a component is using legacy imports
   */
  checkLegacyUsage: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`
LEGACY COMPONENT DETECTED: ${componentName}

This component is using legacy imports. Please update to use the new FSD structure.
      `);
    }
  },

  /**
   * Provides migration path information
   */
  getMigrationPath: (oldPath: string) => {
    const migrationMap: Record<string, string> = {
      '@client/lib/form-builder': '@client/shared/lib/form-builder',
      '@client/lib/validation-schemas': '@client/shared/lib/validation',
      '@client/lib/queryClient': '@client/shared/lib/query-client',
      '@client/lib/utils': '@client/shared/lib/utils',
      '@client/lib': '@client/shared/lib',
    };

    return migrationMap[oldPath] || `Please check the migration guide for ${oldPath}`;
  },
};

// Re-export everything for compatibility
export * from '@client/shared/lib/form-builder';
export * from '@client/shared/lib/validation';
export * from '@client/shared/lib/query-client';
export * from '@client/shared/lib/utils';

// Default export for legacy compatibility
export default {
  useFormBuilder,
  withFormBuilder,
  createFormBuilder,
  validationPatterns,
  billValidationSchemas,
  userValidationSchemas,
  formValidationSchemas,
  allValidationSchemas,
  queryClient,
  queryKeys,
  invalidateQueries,
  prefetchQueries,
  cacheUtils,
  configureOfflineSupport,
  setupGlobalErrorHandler,
  devUtils,
  cn,
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  truncateText,
  debounce,
  isValidEmail,
  isValidKenyaPhoneNumber,
  generateId,
  capitalize,
  slugify,
  migrationUtils,
};
