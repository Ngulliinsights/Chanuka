/**
 * Validation Schemas - Main Exports
 * 
 * Centralized export of all validation schemas and utilities
 */

// Common schemas
export * from './common';
export { commonSchemas } from './common';

// Authentication schemas
export * from './auth';
export { authSchemas } from './auth';

// Property schemas
export * from './property';
export { propertySchemas } from './property';

// Schema composition utilities
export {
  createOptionalSchema,
  createArraySchema,
  createNullableSchema,
  createPartialSchema,
  SchemaVersionManager,
  schemaVersionManager,
} from './common';

// All schemas collection for easy access
export const allSchemas = {
  common: () => import('./common').then(m => m.commonSchemas),
  auth: () => import('./auth').then(m => m.authSchemas),
  property: () => import('./property').then(m => m.propertySchemas),
} as const;

/**
 * Schema registry for dynamic schema access
 */
export class SchemaRegistry {
  private static instance: SchemaRegistry;
  private schemas = new Map<string, any>();

  private constructor() {
    this.registerDefaultSchemas();
  }

  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }

  private async registerDefaultSchemas(): Promise<void> {
    // Register common schemas
    const { commonSchemas } = await import('./common');
    Object.entries(commonSchemas).forEach(([name, schema]) => {
      this.schemas.set(`common.${name}`, schema);
    });

    // Register auth schemas
    const { authSchemas } = await import('./auth');
    Object.entries(authSchemas).forEach(([name, schema]) => {
      this.schemas.set(`auth.${name}`, schema);
    });

    // Register property schemas
    const { propertySchemas } = await import('./property');
    Object.entries(propertySchemas).forEach(([name, schema]) => {
      this.schemas.set(`property.${name}`, schema);
    });
  }

  registerSchema(name: string, schema: any): void {
    this.schemas.set(name, schema);
  }

  getSchema(name: string): any | undefined {
    return this.schemas.get(name);
  }

  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  hasSchema(name: string): boolean {
    return this.schemas.has(name);
  }
}

/**
 * Global schema registry instance
 */
export const schemaRegistry = SchemaRegistry.getInstance();

/**
 * Utility function to get schema by name
 */
export function getSchemaByName(name: string) {
  return schemaRegistry.getSchema(name);
}

/**
 * Utility function to check if schema exists
 */
export function hasSchema(name: string): boolean {
  return schemaRegistry.hasSchema(name);
}

/**
 * Utility function to list all available schemas
 */
export function listAvailableSchemas(): string[] {
  return schemaRegistry.listSchemas();
}











































