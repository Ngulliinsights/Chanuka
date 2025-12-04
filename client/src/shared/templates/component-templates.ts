/**
 * Component template system for standardized component scaffolding
 * Following navigation component patterns for consistent structure
 */

export interface ComponentTemplateConfig {
  componentName: string;
  directory: string;
  hasValidation?: boolean;
  hasErrorHandling?: boolean;
  hasHooks?: boolean;
  hasUtils?: boolean;
  hasConfig?: boolean;
  hasUI?: boolean;
  hasCore?: boolean;
  description?: string;
}

export interface TemplateFile {
  path: string;
  content: string;
}

export class ComponentTemplateGenerator {
  private config: ComponentTemplateConfig;

  constructor(config: ComponentTemplateConfig) {
    this.config = config;
  }

  generateAllFiles(): TemplateFile[] {
    const files: TemplateFile[] = [];

    // Always generate these core files
    files.push(this.generateIndexFile());
    files.push(this.generateTypesFile());

    // Conditional files based on config
    if (this.config.hasValidation) {
      files.push(this.generateValidationFile());
    }

    if (this.config.hasErrorHandling) {
      files.push(this.generateErrorsFile());
      files.push(this.generateRecoveryFile());
    }

    if (this.config.hasHooks) {
      files.push(this.generateHooksIndexFile());
      files.push(this.generateMainHookFile());
    }

    if (this.config.hasUtils) {
      files.push(this.generateUtilsIndexFile());
      files.push(this.generateMainUtilFile());
    }

    if (this.config.hasConfig) {
      files.push(this.generateConfigFile());
    }

    if (this.config.hasUI) {
      files.push(this.generateUIIndexFile());
      files.push(this.generateMainUIFile());
    }

    if (this.config.hasCore) {
      files.push(this.generateCoreFile());
    }

    // Always generate test files
    files.push(this.generateMainTestFile());

    if (this.config.hasHooks) {
      files.push(this.generateHooksTestFile());
    }

    if (this.config.hasUtils) {
      files.push(this.generateUtilsTestFile());
    }

    return files;
  }

  private generateIndexFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const exports = [`export * from './types';`];
    
    if (this.config.hasValidation) {
      exports.push(`export * from './validation';`);
    }
    
    if (this.config.hasErrorHandling) {
      exports.push(`export * from './errors';`, `export * from './recovery';`);
    }
    
    if (this.config.hasHooks) {
      exports.push(`export * from './hooks';`);
    }
    
    if (this.config.hasUtils) {
      exports.push(`export * from './utils';`);
    }
    
    if (this.config.hasUI) {
      exports.push(`export * from './ui';`);
    }
    
    if (this.config.hasCore) {
      exports.push(`export * from './core/${this.toCamelCase(componentName)}Core';`);
    }

    const content = `/**
 * ${pascalName} component barrel exports
 * ${this.config.description || `Standardized ${componentName} component following navigation patterns`}
 */

${exports.join('\n')}
`;

    return {
      path: `${directory}/index.ts`,
      content,
    };
  }

  private generateTypesFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `/**
 * ${pascalName} component type definitions
 */

export interface ${pascalName}Props {
  id?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: ${pascalName}Error;
  onError?: (error: ${pascalName}Error) => void;
  onSuccess?: (data: any) => void;
}

export interface ${pascalName}State {
  data: ${pascalName}Data | null;
  loading: boolean;
  error: ${pascalName}Error | null;
}

export interface ${pascalName}Data {
  id: string;
  // Add specific data properties here
}

export interface ${pascalName}Config {
  enabled: boolean;
  debug: boolean;
  maxRetries: number;
  timeout: number;
  // Add specific config properties here
}

export interface ${pascalName}Error {
  type: ${pascalName}ErrorType;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export enum ${pascalName}ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
}

export interface Use${pascalName}Options {
  enabled?: boolean;
  onError?: (error: ${pascalName}Error) => void;
  onSuccess?: (data: ${pascalName}Data) => void;
}

export interface Use${pascalName}Result {
  data: ${pascalName}Data | null;
  loading: boolean;
  error: ${pascalName}Error;
  actions: {
    refresh: () => Promise<void>;
    reset: () => void;
  };
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };
}
`;

    return {
      path: `${directory}/types.ts`,
      content,
    };
  }

  private generateValidationFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import { z } from 'zod';
import { ${pascalName}ValidationError } from './errors';

/**
 * ${pascalName} validation schemas and utilities
 */

export const ${pascalName}DataSchema = z.object({
  id: z.string().min(1, 'ID cannot be empty'),
  // Add specific validation rules here
});

export const ${pascalName}ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  debug: z.boolean().default(false),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(100).max(30000).default(5000),
  // Add specific config validation here
});

export const ${pascalName}PropsSchema = z.object({
  id: z.string().optional(),
  className: z.string().optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
  // Add specific props validation here
});

/**
 * Validation utility functions
 */

export function validate${pascalName}Data(data: unknown): any {
  try {
    return ${pascalName}DataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid ${componentName} data';
      throw new ${pascalName}ValidationError(message, field, data, { zodError: error });
    }
    throw new ${pascalName}ValidationError('${pascalName} data validation failed', 'data', data);
  }
}

export function validate${pascalName}Config(config: unknown): any {
  try {
    return ${pascalName}ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid ${componentName} config';
      throw new ${pascalName}ValidationError(message, field, config, { zodError: error });
    }
    throw new ${pascalName}ValidationError('${pascalName} config validation failed', 'config', config);
  }
}

export function validate${pascalName}Props(props: unknown): any {
  try {
    return ${pascalName}PropsSchema.parse(props);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = error.errors[0]?.path.join('.') || 'unknown';
      const message = error.errors[0]?.message || 'Invalid ${componentName} props';
      throw new ${pascalName}ValidationError(message, field, props, { zodError: error });
    }
    throw new ${pascalName}ValidationError('${pascalName} props validation failed', 'props', props);
  }
}

/**
 * Safe validation functions that return validation results
 */

export function safeValidate${pascalName}Data(data: unknown): { success: boolean; data?: any; error?: ${pascalName}ValidationError } {
  try {
    const validatedData = validate${pascalName}Data(data);
    return { success: true, data: validatedData };
  } catch (error) {
    return { success: false, error: error as ${pascalName}ValidationError };
  }
}

export function safeValidate${pascalName}Config(config: unknown): { success: boolean; data?: any; error?: ${pascalName}ValidationError } {
  try {
    const validatedConfig = validate${pascalName}Config(config);
    return { success: true, data: validatedConfig };
  } catch (error) {
    return { success: false, error: error as ${pascalName}ValidationError };
  }
}
`;

    return {
      path: `${directory}/validation.ts`,
      content,
    };
  }

  private generateErrorsFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `/**
 * ${pascalName}-specific error types
 * Following navigation component error patterns
 */

export enum ${pascalName}ErrorType {
  ${pascalName.toUpperCase()}_ERROR = '${pascalName.toUpperCase()}_ERROR',
  ${pascalName.toUpperCase()}_VALIDATION_ERROR = '${pascalName.toUpperCase()}_VALIDATION_ERROR',
  ${pascalName.toUpperCase()}_CONFIGURATION_ERROR = '${pascalName.toUpperCase()}_CONFIGURATION_ERROR',
  ${pascalName.toUpperCase()}_RUNTIME_ERROR = '${pascalName.toUpperCase()}_RUNTIME_ERROR',
}

export class ${pascalName}Error extends Error {
  public readonly type: ${pascalName}ErrorType;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ${pascalName}ErrorType = ${pascalName}ErrorType.${pascalName.toUpperCase()}_ERROR,
    statusCode: number = 400,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = '${pascalName}Error';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ${pascalName}Error);
    }
  }
}

export class ${pascalName}ValidationError extends ${pascalName}Error {
  constructor(message: string, field: string, value: any, details?: Record<string, any>) {
    super(
      message,
      ${pascalName}ErrorType.${pascalName.toUpperCase()}_VALIDATION_ERROR,
      422,
      { field, value, ...details }
    );
  }
}

export class ${pascalName}ConfigurationError extends ${pascalName}Error {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      ${pascalName}ErrorType.${pascalName.toUpperCase()}_CONFIGURATION_ERROR,
      500,
      details
    );
  }
}

export class ${pascalName}RuntimeError extends ${pascalName}Error {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      ${pascalName}ErrorType.${pascalName.toUpperCase()}_RUNTIME_ERROR,
      500,
      details
    );
  }
}
`;

    return {
      path: `${directory}/errors.ts`,
      content,
    };
  }

  private generateRecoveryFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import { ${pascalName}Error, ${pascalName}ErrorType } from './errors';

/**
 * ${pascalName} error recovery strategies
 */

export interface ${pascalName}RecoveryContext {
  error: ${pascalName}Error;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptTime: number;
}

export interface ${pascalName}RecoveryStrategy {
  canRecover(context: ${pascalName}RecoveryContext): boolean;
  recover(context: ${pascalName}RecoveryContext): Promise<boolean>;
  getSuggestions(context: ${pascalName}RecoveryContext): string[];
}

export class ${pascalName}ValidationRecovery implements ${pascalName}RecoveryStrategy {
  canRecover(context: ${pascalName}RecoveryContext): boolean {
    return context.error.type === ${pascalName}ErrorType.${pascalName.toUpperCase()}_VALIDATION_ERROR;
  }

  async recover(context: ${pascalName}RecoveryContext): Promise<boolean> {
    // Implement validation error recovery logic
    return false; // Manual recovery required
  }

  getSuggestions(context: ${pascalName}RecoveryContext): string[] {
    const suggestions = [
      'Check the input data format',
      'Verify required fields are provided',
      'Ensure data types match expected schema',
    ];

    if (context.error.details?.field) {
      suggestions.unshift(\`Fix the '\${context.error.details.field}' field\`);
    }

    return suggestions;
  }
}

export class ${pascalName}ConfigurationRecovery implements ${pascalName}RecoveryStrategy {
  canRecover(context: ${pascalName}RecoveryContext): boolean {
    return context.error.type === ${pascalName}ErrorType.${pascalName.toUpperCase()}_CONFIGURATION_ERROR;
  }

  async recover(context: ${pascalName}RecoveryContext): Promise<boolean> {
    // Implement configuration error recovery logic
    try {
      // Reset to default configuration
      return true;
    } catch {
      return false;
    }
  }

  getSuggestions(context: ${pascalName}RecoveryContext): string[] {
    return [
      'Check ${componentName} configuration settings',
      'Verify environment variables are set',
      'Reset to default configuration',
      'Contact system administrator',
    ];
  }
}

export class ${pascalName}RuntimeRecovery implements ${pascalName}RecoveryStrategy {
  canRecover(context: ${pascalName}RecoveryContext): boolean {
    return (
      context.error.type === ${pascalName}ErrorType.${pascalName.toUpperCase()}_RUNTIME_ERROR &&
      context.attemptCount < context.maxAttempts
    );
  }

  async recover(context: ${pascalName}RecoveryContext): Promise<boolean> {
    // Implement runtime error recovery logic
    const delay = Math.min(1000 * Math.pow(2, context.attemptCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    return true; // Retry
  }

  getSuggestions(context: ${pascalName}RecoveryContext): string[] {
    return [
      'Retry the operation',
      'Check network connectivity',
      'Verify service availability',
      'Try again later',
    ];
  }
}

export class ${pascalName}RecoveryManager {
  private strategies: ${pascalName}RecoveryStrategy[] = [
    new ${pascalName}ValidationRecovery(),
    new ${pascalName}ConfigurationRecovery(),
    new ${pascalName}RuntimeRecovery(),
  ];

  async attemptRecovery(context: ${pascalName}RecoveryContext): Promise<{
    recovered: boolean;
    suggestions: string[];
  }> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(context)) {
        const recovered = await strategy.recover(context);
        const suggestions = strategy.getSuggestions(context);
        
        return { recovered, suggestions };
      }
    }

    return {
      recovered: false,
      suggestions: ['Unknown error type - manual intervention required'],
    };
  }

  getSuggestions(error: ${pascalName}Error): string[] {
    const context: ${pascalName}RecoveryContext = {
      error,
      attemptCount: 0,
      maxAttempts: 3,
      lastAttemptTime: Date.now(),
    };

    for (const strategy of this.strategies) {
      if (strategy.canRecover(context)) {
        return strategy.getSuggestions(context);
      }
    }

    return ['Unknown error - please try again or contact support'];
  }
}

export const ${this.toCamelCase(componentName)}RecoveryManager = new ${pascalName}RecoveryManager();
`;

    return {
      path: `${directory}/recovery.ts`,
      content,
    };
  }

  private generateHooksIndexFile(): TemplateFile {
    const { componentName, directory } = this.config;
    
    const content = `/**
 * ${this.toPascalCase(componentName)} hooks barrel exports
 */

export * from './use${this.toPascalCase(componentName)}';
`;

    return {
      path: `${directory}/hooks/index.ts`,
      content,
    };
  }

  private generateMainHookFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    const camelName = this.toCamelCase(componentName);
    
    const content = `import { useState, useEffect, useCallback } from 'react';
import { ${pascalName}Data, ${pascalName}Error, Use${pascalName}Options, Use${pascalName}Result } from '@client/types';
${this.config.hasValidation ? `import { validate${pascalName}Data } from '@shared/validation';` : ''}
${this.config.hasErrorHandling ? `import { ${camelName}RecoveryManager } from '@shared/recovery';` : ''}

/**
 * Main ${componentName} hook following navigation component patterns
 */

export function use${pascalName}(options: Use${pascalName}Options = {}): Use${pascalName}Result {
  const [data, setData] = useState<${pascalName}Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<${pascalName}Error | null>(null);

  const handleError = useCallback((err: ${pascalName}Error) => {
    setError(err);
    setLoading(false);
    options.onError?.(err);
  }, [options]);

  const handleSuccess = useCallback((newData: ${pascalName}Data) => {
    setData(newData);
    setError(null);
    setLoading(false);
    options.onSuccess?.(newData);
  }, [options]);

  const refresh = useCallback(async () => {
    if (!options.enabled) return;
    
    setLoading(true);
    setError(null);

    try {
      // Implement data fetching logic here
      const fetchedData: ${pascalName}Data = {
        id: 'example-id',
        // Add actual data fetching
      };

      ${this.config.hasValidation ? `
      const validatedData = validate${pascalName}Data(fetchedData);
      handleSuccess(validatedData);
      ` : `
      handleSuccess(fetchedData);
      `}
    } catch (err) {
      const ${camelName}Error: ${pascalName}Error = {
        type: 'RUNTIME_ERROR' as any,
        message: err instanceof Error ? err.message : 'Unknown error',
        details: { originalError: err },
      };
      handleError(${camelName}Error);
    }
  }, [options.enabled, handleSuccess, handleError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const recover = useCallback(async (): Promise<boolean> => {
    if (!error) return false;

    ${this.config.hasErrorHandling ? `
    const context = {
      error,
      attemptCount: 0,
      maxAttempts: 3,
      lastAttemptTime: Date.now(),
    };

    const { recovered } = await ${camelName}RecoveryManager.attemptRecovery(context);
    
    if (recovered) {
      await refresh();
      return true;
    }
    
    return false;
    ` : `
    // Implement recovery logic
    return false;
    `}
  }, [error, refresh]);

  const getSuggestions = useCallback((): string[] => {
    if (!error) return [];

    ${this.config.hasErrorHandling ? `
    return ${camelName}RecoveryManager.getSuggestions(error);
    ` : `
    return ['Try refreshing the data', 'Check your connection'];
    `}
  }, [error]);

  useEffect(() => {
    if (options.enabled !== false) {
      refresh();
    }
  }, [refresh, options.enabled]);

  return {
    data,
    loading,
    error,
    actions: {
      refresh,
      reset,
    },
    recovery: {
      canRecover: !!error,
      suggestions: getSuggestions(),
      recover,
    },
  };
}
`;

    return {
      path: `${directory}/hooks/use${pascalName}.ts`,
      content,
    };
  }

  private generateUtilsIndexFile(): TemplateFile {
    const { componentName, directory } = this.config;
    
    const content = `/**
 * ${this.toPascalCase(componentName)} utilities barrel exports
 */

export * from './${this.toCamelCase(componentName)}-utils';
`;

    return {
      path: `${directory}/utils/index.ts`,
      content,
    };
  }

  private generateMainUtilFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import { ${pascalName}Data, ${pascalName}Config } from '@client/types';

/**
 * ${pascalName} utility functions
 */

export function format${pascalName}Data(data: ${pascalName}Data): string {
  // Implement data formatting logic
  return JSON.stringify(data, null, 2);
}

export function is${pascalName}DataValid(data: unknown): data is ${pascalName}Data {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as any).id === 'string'
  );
}

export function merge${pascalName}Config(
  defaultConfig: ${pascalName}Config,
  userConfig: Partial<${pascalName}Config>
): ${pascalName}Config {
  return {
    ...defaultConfig,
    ...userConfig,
  };
}

export function create${pascalName}Id(): string {
  return \`${componentName}-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;
}

export function compare${pascalName}Data(
  a: ${pascalName}Data,
  b: ${pascalName}Data
): boolean {
  return a.id === b.id;
}

export function clone${pascalName}Data(data: ${pascalName}Data): ${pascalName}Data {
  return JSON.parse(JSON.stringify(data));
}

export function get${pascalName}DisplayName(data: ${pascalName}Data): string {
  // Implement display name logic
  return data.id;
}

export function is${pascalName}Loading(loading: boolean): boolean {
  return loading;
}

export function has${pascalName}Error(error: unknown): boolean {
  return error !== null && error !== undefined;
}
`;

    return {
      path: `${directory}/utils/${this.toCamelCase(componentName)}-utils.ts`,
      content,
    };
  }

  private generateConfigFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `# ${pascalName} Configuration

## Overview

This document describes the configuration options for the ${pascalName} component.

## Configuration Schema

The ${pascalName} component accepts the following configuration options:

### Basic Configuration

- **enabled** (boolean, default: true): Whether the component is enabled
- **debug** (boolean, default: false): Enable debug logging
- **maxRetries** (number, default: 3): Maximum number of retry attempts
- **timeout** (number, default: 5000): Timeout in milliseconds

### Advanced Configuration

Add component-specific configuration options here.

## Usage Examples

\`\`\`typescript
import { ${pascalName}Config } from './${this.toCamelCase(componentName)}';

const config: ${pascalName}Config = {
  enabled: true,
  debug: false,
  maxRetries: 3,
  timeout: 5000,
};
\`\`\`

## Environment Variables

List any environment variables that affect the component configuration:

- \`${componentName.toUpperCase()}_ENABLED\`: Override the enabled setting
- \`${componentName.toUpperCase()}_DEBUG\`: Override the debug setting
- \`${componentName.toUpperCase()}_TIMEOUT\`: Override the timeout setting

## Validation

The configuration is validated using Zod schemas. Invalid configurations will throw validation errors with specific field information.

## Best Practices

1. Use environment variables for deployment-specific settings
2. Keep debug mode disabled in production
3. Set appropriate timeout values based on expected operation duration
4. Monitor retry attempts to identify potential issues

## Troubleshooting

### Common Configuration Issues

1. **Invalid timeout values**: Ensure timeout is between 100ms and 30 seconds
2. **Invalid retry count**: Ensure maxRetries is between 0 and 10
3. **Type mismatches**: Ensure all configuration values match expected types

### Recovery Strategies

The component includes automatic recovery for configuration errors:

1. Reset to default values
2. Validate environment variable overrides
3. Provide clear error messages for manual correction
`;

    return {
      path: `${directory}/config/${this.toCamelCase(componentName)}-config.md`,
      content,
    };
  }

  private generateUIIndexFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `/**
 * ${pascalName} UI components barrel exports
 */

export * from './${pascalName}UI';
`;

    return {
      path: `${directory}/ui/index.ts`,
      content,
    };
  }

  private generateMainUIFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import React from 'react';
import { ${pascalName}Props } from '@client/types';
${this.config.hasHooks ? `import { use${pascalName} } from '@client/hooks';` : ''}

/**
 * ${pascalName} UI component
 */

export const ${pascalName}UI: React.FC<${pascalName}Props> = ({
  id,
  className = '',
  disabled = false,
  loading = false,
  error = null,
  onError,
  onSuccess,
  ...props
}) => {
  ${this.config.hasHooks ? `
  const {
    data,
    loading: hookLoading,
    error: hookError,
    actions,
    recovery,
  } = use${pascalName}({
    enabled: !disabled,
    onError,
    onSuccess,
  });

  const isLoading = loading || hookLoading;
  const currentError = error || hookError;
  ` : `
  const isLoading = loading;
  const currentError = error;
  `}

  if (isLoading) {
    return (
      <div 
        className={\`${this.toCamelCase(componentName)}-loading \${className}\`}
        data-testid="${this.toCamelCase(componentName)}-loading"
      >
        Loading ${componentName}...
      </div>
    );
  }

  if (currentError) {
    return (
      <div 
        className={\`${this.toCamelCase(componentName)}-error \${className}\`}
        data-testid="${this.toCamelCase(componentName)}-error"
        role="alert"
      >
        <p>Error: {currentError.message}</p>
        ${this.config.hasHooks ? `
        {recovery.canRecover && (
          <div className="${this.toCamelCase(componentName)}-recovery">
            <button 
              onClick={recovery.recover}
              className="${this.toCamelCase(componentName)}-recovery-button"
            >
              Try Again
            </button>
            <ul className="${this.toCamelCase(componentName)}-suggestions">
              {recovery.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        ` : ''}
      </div>
    );
  }

  return (
    <div 
      id={id}
      className={\`${this.toCamelCase(componentName)} \${className}\`}
      data-testid="${this.toCamelCase(componentName)}"
      {...props}
    >
      {/* Implement component UI here */}
      <h2>${pascalName} Component</h2>
      ${this.config.hasHooks ? `
      {data && (
        <div className="${this.toCamelCase(componentName)}-content">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      
      <div className="${this.toCamelCase(componentName)}-actions">
        <button 
          onClick={actions.refresh}
          disabled={isLoading}
          className="${this.toCamelCase(componentName)}-refresh-button"
        >
          Refresh
        </button>
        <button 
          onClick={actions.reset}
          className="${this.toCamelCase(componentName)}-reset-button"
        >
          Reset
        </button>
      </div>
      ` : `
      <p>Implement ${componentName} content here</p>
      `}
    </div>
  );
};

export default ${pascalName}UI;
`;

    return {
      path: `${directory}/ui/${pascalName}UI.tsx`,
      content,
    };
  }

  private generateCoreFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    const camelName = this.toCamelCase(componentName);
    
    const content = `import { ${pascalName}Data, ${pascalName}Config, ${pascalName}Error } from '@client/types';
${this.config.hasValidation ? `import { validate${pascalName}Data, validate${pascalName}Config } from '@shared/validation';` : ''}

/**
 * ${pascalName} core business logic
 */

export class ${pascalName}Core {
  private config: ${pascalName}Config;
  private data: ${pascalName}Data | null = null;

  constructor(config: ${pascalName}Config) {
    ${this.config.hasValidation ? `
    this.config = validate${pascalName}Config(config);
    ` : `
    this.config = config;
    `}
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('${pascalName} is not enabled');
    }

    // Implement initialization logic
  }

  async loadData(): Promise<${pascalName}Data> {
    // Implement data loading logic
    const rawData = {
      id: \`${camelName}-\${Date.now()}\`,
      // Add actual data loading
    };

    ${this.config.hasValidation ? `
    const validatedData = validate${pascalName}Data(rawData);
    this.data = validatedData;
    return validatedData;
    ` : `
    this.data = rawData as ${pascalName}Data;
    return this.data;
    `}
  }

  async saveData(data: ${pascalName}Data): Promise<void> {
    ${this.config.hasValidation ? `
    const validatedData = validate${pascalName}Data(data);
    ` : `
    const validatedData = data;
    `}

    // Implement data saving logic
    this.data = validatedData;
  }

  getData(): ${pascalName}Data | null {
    return this.data;
  }

  updateConfig(newConfig: Partial<${pascalName}Config>): void {
    const updatedConfig = { ...this.config, ...newConfig };
    
    ${this.config.hasValidation ? `
    this.config = validate${pascalName}Config(updatedConfig);
    ` : `
    this.config = updatedConfig;
    `}
  }

  getConfig(): ${pascalName}Config {
    return { ...this.config };
  }

  reset(): void {
    this.data = null;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isDebugMode(): boolean {
    return this.config.debug;
  }
}

export const create${pascalName}Core = (config: ${pascalName}Config): ${pascalName}Core => {
  return new ${pascalName}Core(config);
};
`;

    return {
      path: `${directory}/core/${camelName}Core.ts`,
      content,
    };
  }

  private generateMainTestFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import { render, screen } from '@testing-library/react';
import { ${pascalName}UI } from '@shared/ui/${pascalName}UI';
import { ComponentTestHelper } from 'shared/testing';

describe('${pascalName}UI Component', () => {
  it('should render without errors', () => {
    const props = ComponentTestHelper.createMockProps();
    
    render(<${pascalName}UI {...props} />);
    
    expect(screen.getByTestId('${this.toCamelCase(componentName)}')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    const props = ComponentTestHelper.createMockProps({ loading: true });
    
    render(<${pascalName}UI {...props} />);
    
    expect(screen.getByTestId('${this.toCamelCase(componentName)}-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading ${componentName}...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = ComponentTestHelper.createMockError('Test error message');
    const props = ComponentTestHelper.createMockProps({ error });
    
    render(<${pascalName}UI {...props} />);
    
    expect(screen.getByTestId('${this.toCamelCase(componentName)}-error')).toBeInTheDocument();
    expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    const props = ComponentTestHelper.createMockProps({ disabled: true });
    
    render(<${pascalName}UI {...props} />);
    
    const component = screen.getByTestId('${this.toCamelCase(componentName)}');
    expect(component).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const props = ComponentTestHelper.createMockProps({ className: 'custom-class' });
    
    render(<${pascalName}UI {...props} />);
    
    const component = screen.getByTestId('${this.toCamelCase(componentName)}');
    expect(component).toHaveClass('custom-class');
  });

  it('should call onError when error occurs', () => {
    const onError = jest.fn();
    const error = ComponentTestHelper.createMockError();
    const props = ComponentTestHelper.createMockProps({ error, onError });
    
    render(<${pascalName}UI {...props} />);
    
    // Error handling is typically triggered by hooks or user interactions
    // Add specific test logic based on component behavior
  });

  it('should call onSuccess when operation succeeds', () => {
    const onSuccess = jest.fn();
    const props = ComponentTestHelper.createMockProps({ onSuccess });
    
    render(<${pascalName}UI {...props} />);
    
    // Success handling is typically triggered by hooks or user interactions
    // Add specific test logic based on component behavior
  });
});
`;

    return {
      path: `${directory}/__tests__/${this.toCamelCase(componentName)}.test.tsx`,
      content,
    };
  }

  private generateHooksTestFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import { renderHook, act } from '@testing-library/react';
import { use${pascalName} } from '@client/hooks/use${pascalName}';

describe('use${pascalName} Hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => use${pascalName}());
    
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.actions).toBeDefined();
    expect(result.current.recovery).toBeDefined();
  });

  it('should handle enabled option', () => {
    const { result } = renderHook(() => use${pascalName}({ enabled: false }));
    
    expect(result.current.loading).toBe(false);
  });

  it('should call onError when error occurs', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => use${pascalName}({ onError }));
    
    // Trigger error condition
    await act(async () => {
      // Add logic to trigger error
    });
    
    // Verify error handling
    // expect(onError).toHaveBeenCalled();
  });

  it('should call onSuccess when operation succeeds', async () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => use${pascalName}({ onSuccess }));
    
    // Trigger success condition
    await act(async () => {
      // Add logic to trigger success
    });
    
    // Verify success handling
    // expect(onSuccess).toHaveBeenCalled();
  });

  it('should refresh data', async () => {
    const { result } = renderHook(() => use${pascalName}());
    
    await act(async () => {
      await result.current.actions.refresh();
    });
    
    // Verify refresh behavior
  });

  it('should reset state', () => {
    const { result } = renderHook(() => use${pascalName}());
    
    act(() => {
      result.current.actions.reset();
    });
    
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should attempt recovery', async () => {
    const { result } = renderHook(() => use${pascalName}());
    
    // Set up error state first
    // Then test recovery
    
    await act(async () => {
      const recovered = await result.current.recovery.recover();
      // Verify recovery behavior
    });
  });

  it('should provide recovery suggestions', () => {
    const { result } = renderHook(() => use${pascalName}());
    
    expect(Array.isArray(result.current.recovery.suggestions)).toBe(true);
  });
});
`;

    return {
      path: `${directory}/__tests__/use${pascalName}.test.ts`,
      content,
    };
  }

  private generateUtilsTestFile(): TemplateFile {
    const { componentName, directory } = this.config;
    const pascalName = this.toPascalCase(componentName);
    
    const content = `import {
  format${pascalName}Data,
  is${pascalName}DataValid,
  merge${pascalName}Config,
  create${pascalName}Id,
  compare${pascalName}Data,
  clone${pascalName}Data,
  get${pascalName}DisplayName,
  is${pascalName}Loading,
  has${pascalName}Error,
} from '@shared/utils/${this.toCamelCase(componentName)}-utils';
import { ${pascalName}Data, ${pascalName}Config } from '@client/types';

describe('${this.toCamelCase(componentName)}-utils', () => {
  const mockData: ${pascalName}Data = {
    id: 'test-id',
  };

  const mockConfig: ${pascalName}Config = {
    enabled: true,
    debug: false,
    maxRetries: 3,
    timeout: 5000,
  };

  describe('format${pascalName}Data', () => {
    it('should format data as JSON string', () => {
      const result = format${pascalName}Data(mockData);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('test-id');
    });
  });

  describe('is${pascalName}DataValid', () => {
    it('should return true for valid data', () => {
      expect(is${pascalName}DataValid(mockData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      expect(is${pascalName}DataValid(null)).toBe(false);
      expect(is${pascalName}DataValid({})).toBe(false);
      expect(is${pascalName}DataValid({ id: 123 })).toBe(false);
    });
  });

  describe('merge${pascalName}Config', () => {
    it('should merge configurations', () => {
      const userConfig = { debug: true, timeout: 10000 };
      const result = merge${pascalName}Config(mockConfig, userConfig);
      
      expect(result.enabled).toBe(true); // from default
      expect(result.debug).toBe(true); // from user
      expect(result.timeout).toBe(10000); // from user
      expect(result.maxRetries).toBe(3); // from default
    });
  });

  describe('create${pascalName}Id', () => {
    it('should create unique IDs', () => {
      const id1 = create${pascalName}Id();
      const id2 = create${pascalName}Id();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toContain('${componentName}');
    });
  });

  describe('compare${pascalName}Data', () => {
    it('should return true for same data', () => {
      const data1 = { id: 'same-id' };
      const data2 = { id: 'same-id' };
      
      expect(compare${pascalName}Data(data1, data2)).toBe(true);
    });

    it('should return false for different data', () => {
      const data1 = { id: 'id-1' };
      const data2 = { id: 'id-2' };
      
      expect(compare${pascalName}Data(data1, data2)).toBe(false);
    });
  });

  describe('clone${pascalName}Data', () => {
    it('should create deep copy of data', () => {
      const cloned = clone${pascalName}Data(mockData);
      
      expect(cloned).toEqual(mockData);
      expect(cloned).not.toBe(mockData);
    });
  });

  describe('get${pascalName}DisplayName', () => {
    it('should return display name', () => {
      const display_name = get${pascalName}DisplayName(mockData);
      
      expect(display_name).toBe('test-id');
    });
  });

  describe('is${pascalName}Loading', () => {
    it('should return loading state', () => {
      expect(is${pascalName}Loading(true)).toBe(true);
      expect(is${pascalName}Loading(false)).toBe(false);
    });
  });

  describe('has${pascalName}Error', () => {
    it('should detect error presence', () => {
      expect(has${pascalName}Error(new Error('test'))).toBe(true);
      expect(has${pascalName}Error('error string')).toBe(true);
      expect(has${pascalName}Error(null)).toBe(false);
      expect(has${pascalName}Error(undefined)).toBe(false);
    });
  });
});
`;

    return {
      path: `${directory}/__tests__/${this.toCamelCase(componentName)}-utils.test.ts`,
      content,
    };
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

// Template validation utilities
export class TemplateValidator {
  static validateConfig(config: ComponentTemplateConfig): string[] {
    const errors: string[] = [];

    if (!config.componentName || config.componentName.trim() === '') {
      errors.push('Component name is required');
    }

    if (!config.directory || config.directory.trim() === '') {
      errors.push('Directory is required');
    }

    if (config.componentName && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(config.componentName)) {
      errors.push('Component name must start with a letter and contain only letters, numbers, hyphens, and underscores');
    }

    return errors;
  }

  static validateDirectoryStructure(files: TemplateFile[]): string[] {
    const errors: string[] = [];
    const requiredFiles = ['index.ts', 'types.ts'];
    const filePaths = files.map(f => f.path);

    requiredFiles.forEach(required => {
      if (!filePaths.some(path => path.endsWith(required))) {
        errors.push(`Missing required file: ${required}`);
      }
    });

    return errors;
  }
}

// Template generation helper
export function generateComponentTemplate(config: ComponentTemplateConfig): {
  files: TemplateFile[];
  errors: string[];
} {
  const configErrors = TemplateValidator.validateConfig(config);
  if (configErrors.length > 0) {
    return { files: [], errors: configErrors };
  }

  const generator = new ComponentTemplateGenerator(config);
  const files = generator.generateAllFiles();
  
  const structureErrors = TemplateValidator.validateDirectoryStructure(files);
  
  return { files, errors: structureErrors };
}

