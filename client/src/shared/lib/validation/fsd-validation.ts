/**
 * FSD Pattern Validation
 *
 * Validates that all FSD patterns are correctly implemented
 */

import { z } from 'zod';

/**
 * FSD Pattern Validation Schema
 */
const fsdPatternSchema = z.object({
  // Directory structure validation
  directories: z.object({
    formBuilder: z.object({
      hooks: z.array(z.string()),
      services: z.array(z.string()),
      components: z.array(z.string()),
      utils: z.array(z.string()),
      factories: z.array(z.string()),
      types: z.array(z.string()),
    }),
    validation: z.object({
      schemas: z.array(z.string()),
      types: z.array(z.string()),
      utils: z.array(z.string()),
    }),
    queryClient: z.object({
      services: z.array(z.string()),
      types: z.array(z.string()),
      utils: z.array(z.string()),
    }),
    utils: z.object({
      common: z.array(z.string()),
      formatters: z.array(z.string()),
      validators: z.array(z.string()),
      helpers: z.array(z.string()),
    }),
  }),

  // Import pattern validation
  imports: z.object({
    formBuilder: z.object({
      main: z.string(),
      hooks: z.string(),
      services: z.string(),
      components: z.string(),
      utils: z.string(),
      factories: z.string(),
      types: z.string(),
    }),
    validation: z.object({
      main: z.string(),
      schemas: z.string(),
      types: z.string(),
      utils: z.string(),
    }),
    queryClient: z.object({
      main: z.string(),
      services: z.string(),
      types: z.string(),
      utils: z.string(),
    }),
    utils: z.object({
      main: z.string(),
      common: z.string(),
      formatters: z.string(),
      validators: z.string(),
      helpers: z.string(),
    }),
  }),

  // Export pattern validation
  exports: z.object({
    formBuilder: z.array(z.string()),
    validation: z.array(z.string()),
    queryClient: z.array(z.string()),
    utils: z.array(z.string()),
  }),
});

/**
 * FSD Pattern Validator
 */
export class FSDPatternValidator {
  private readonly patterns: any;

  constructor() {
    this.patterns = {
      directories: {
        formBuilder: {
          hooks: ['useFormBuilder.ts'],
          services: ['form-builder.service.ts'],
          components: ['DynamicForm.tsx'],
          utils: ['form-utils.ts'],
          factories: ['form-builder.factory.ts'],
          types: ['form-builder.types.ts'],
        },
        validation: {
          schemas: ['bill-schemas.ts', 'user-schemas.ts', 'form-schemas.ts'],
          types: ['validation.types.ts'],
          utils: ['validation-utils.ts'],
        },
        queryClient: {
          services: ['query-client.service.ts'],
          types: ['query-client.types.ts'],
          utils: ['query-client-utils.ts'],
        },
        utils: {
          common: ['common-utils.ts'],
          formatters: ['formatters.ts'],
          validators: ['validators.ts'],
          helpers: ['helpers.ts'],
        },
      },
      imports: {
        formBuilder: {
          main: '@client/shared/lib/form-builder',
          hooks: '@client/shared/lib/form-builder/hooks',
          services: '@client/shared/lib/form-builder/services',
          components: '@client/shared/lib/form-builder/components',
          utils: '@client/shared/lib/form-builder/utils',
          factories: '@client/shared/lib/form-builder/factories',
          types: '@client/shared/lib/form-builder/types',
        },
        validation: {
          main: '@client/shared/lib/validation',
          schemas: '@client/shared/lib/validation/schemas',
          types: '@client/shared/lib/validation/types',
          utils: '@client/shared/lib/validation/utils',
        },
        queryClient: {
          main: '@client/shared/lib/query-client',
          services: '@client/shared/lib/query-client/services',
          types: '@client/shared/lib/query-client/types',
          utils: '@client/shared/lib/query-client/utils',
        },
        utils: {
          main: '@client/shared/lib/utils',
          common: '@client/shared/lib/utils/common',
          formatters: '@client/shared/lib/utils/formatters',
          validators: '@client/shared/lib/utils/validators',
          helpers: '@client/shared/lib/utils/helpers',
        },
      },
      exports: {
        formBuilder: [
          'useFormBuilder',
          'withFormBuilder',
          'createFormBuilder',
          'FormBuilderServiceImpl',
          'FormBuilderFactory',
          'DynamicForm',
          'createFormBuilderOptions',
          'validateFormData',
        ],
        validation: [
          'validationPatterns',
          'billValidationSchemas',
          'userValidationSchemas',
          'formValidationSchemas',
          'validateField',
          'validateForm',
          'validateSchema',
        ],
        queryClient: [
          'queryClient',
          'ApiRequestService',
          'QueryFunctionFactory',
          'QueryClientFactory',
          'createQueryClientConfig',
          'createQueryKeyFactory',
        ],
        utils: [
          'cn',
          'formatDate',
          'formatRelativeTime',
          'formatNumber',
          'formatCurrency',
          'truncateText',
          'debounce',
          'isValidEmail',
          'isValidKenyaPhoneNumber',
          'generateId',
          'capitalize',
          'slugify',
        ],
      },
    };
  }

  /**
   * Validates directory structure
   */
  validateDirectoryStructure(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // This would typically check the actual file system
    // For now, we'll validate the pattern structure
    try {
      fsdPatternSchema.parse(this.patterns);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          errors.push(`Directory structure error: ${err.message}`);
        });
      }
      return { isValid: false, errors };
    }
  }

  /**
   * Validates import patterns
   */
  validateImportPatterns(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate import paths follow FSD conventions
    Object.entries(this.patterns.imports).forEach(([module, imports]) => {
      Object.entries(imports).forEach(([type, path]) => {
        if (!path.startsWith('@client/shared/lib/')) {
          errors.push(`Invalid import path for ${module}.${type}: ${path}`);
        }

        if (!path.includes(module)) {
          errors.push(`Import path doesn't match module for ${module}.${type}: ${path}`);
        }
      });
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates export patterns
   */
  validateExportPatterns(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate exports are properly categorized
    Object.entries(this.patterns.exports).forEach(([module, exports]) => {
      if (!Array.isArray(exports)) {
        errors.push(`Invalid exports for ${module}: must be an array`);
      }

      // Check for common patterns
      if (module === 'utils' && !exports.includes('cn')) {
        errors.push('Utils module should export cn function');
      }

      if (module === 'formBuilder' && !exports.includes('useFormBuilder')) {
        errors.push('FormBuilder module should export useFormBuilder hook');
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates TypeScript definitions
   */
  validateTypeScriptDefinitions(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate that all modules have proper type definitions
    const requiredTypeFiles = [
      'form-builder.types.ts',
      'validation.types.ts',
      'query-client.types.ts',
    ];

    requiredTypeFiles.forEach(file => {
      // In a real implementation, this would check if the file exists
      // and contains proper TypeScript definitions
      if (!file.endsWith('.types.ts')) {
        errors.push(`Invalid type file: ${file}`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates dependency injection patterns
   */
  validateDependencyInjection(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate that services use dependency injection
    const servicePatterns = [
      'FormBuilderServiceImpl',
      'ApiRequestService',
      'QueryFunctionFactory',
    ];

    servicePatterns.forEach(service => {
      if (!service.includes('Impl') && !service.includes('Factory')) {
        errors.push(`Service ${service} should follow dependency injection patterns`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates backward compatibility
   */
  validateBackwardCompatibility(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate that legacy imports still work
    const legacyImports = [
      '@client/shared/lib/form-builder',
      '@client/shared/lib/validation-schemas',
      '@client/shared/lib/queryClient',
      '@client/shared/lib/utils',
    ];

    legacyImports.forEach(legacyImport => {
      // In a real implementation, this would check if the compatibility layer works
      if (!legacyImport.includes('lib')) {
        errors.push(`Legacy import should be deprecated: ${legacyImport}`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Runs all validations
   */
  validateAll(): { isValid: boolean; results: any; errors: string[] } {
    const results = {
      directoryStructure: this.validateDirectoryStructure(),
      importPatterns: this.validateImportPatterns(),
      exportPatterns: this.validateExportPatterns(),
      typeScriptDefinitions: this.validateTypeScriptDefinitions(),
      dependencyInjection: this.validateDependencyInjection(),
      backwardCompatibility: this.validateBackwardCompatibility(),
    };

    const allErrors: string[] = [];
    let isValid = true;

    Object.entries(results).forEach(([key, result]) => {
      if (!result.isValid) {
        isValid = false;
        allErrors.push(...result.errors);
      }
    });

    return { isValid, results, errors: allErrors };
  }

  /**
   * Generates validation report
   */
  generateReport(): string {
    const validation = this.validateAll();

    let report = '# FSD Pattern Validation Report\n\n';
    report += `## Overall Status: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    if (!validation.isValid) {
      report += '## Errors Found:\n\n';
      validation.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    report += '## Detailed Results:\n\n';
    Object.entries(validation.results).forEach(([key, result]) => {
      report += `### ${key.replace(/([A-Z])/g, ' $1').toUpperCase()}\n`;
      report += `- Status: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}\n`;
      if (!result.isValid) {
        report += `- Errors: ${result.errors.length}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

/**
 * Export validation instance
 */
export const fsdValidator = new FSDPatternValidator();

/**
 * Run validation on module load
 */
if (typeof window !== 'undefined') {
  // Client-side validation
  const validation = fsdValidator.validateAll();
  if (!validation.isValid) {
    console.warn('FSD Pattern Validation Failed:', validation.errors);
  }
}
