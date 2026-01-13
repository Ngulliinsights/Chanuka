// ============================================================================
// DOCUMENTATION GENERATION FROM TYPES
// ============================================================================
// System for generating comprehensive documentation from TypeScript types

import { GeneratedType, SchemaDefinition } from './type-generation';
import { GeneratedValidationSchema } from './validation-schemas';

/**
 * Documentation format types
 */
export type DocumentationFormat = 'markdown' | 'html' | 'json' | 'typedoc' | 'custom';

/**
 * Documentation generation configuration
 */
export interface DocumentationConfig {
  format: DocumentationFormat;
  outputDir: string;
  title?: string;
  description?: string;
  includeExamples?: boolean;
  includeValidation?: boolean;
  includeRelationships?: boolean;
  generateIndex?: boolean;
  template?: string;
}

/**
 * Generated documentation file
 */
export interface GeneratedDocumentation {
  name: string;
  content: string;
  filePath: string;
  format: DocumentationFormat;
  metadata: {
    sourceType: string;
    generatedAt: string;
    version: string;
  };
}

/**
 * Documentation generation result
 */
export interface DocumentationGenerationResult {
  success: boolean;
  generatedDocs: GeneratedDocumentation[];
  warnings: string[];
  errors: string[];
  stats: {
    totalFiles: number;
    totalTypes: number;
    totalFields: number;
    generationTimeMs: number;
  };
}

/**
 * Documentation service interface
 */
export interface DocumentationService {
  generateFromTypeDefinition(typeDef: GeneratedType, config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  generateFromSchemaDefinition(schema: SchemaDefinition, config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  generateFromValidationSchema(schema: GeneratedValidationSchema, config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  generateCompleteDocumentation(types: GeneratedType[], schemas: GeneratedValidationSchema[], config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  validateGeneratedDocumentation(docs: GeneratedDocumentation[]): Promise<DocumentationValidationResult>;
}

/**
 * Documentation validation result
 */
export interface DocumentationValidationResult {
  valid: boolean;
  errors: DocumentationValidationError[];
  warnings: DocumentationValidationWarning[];
}

/**
 * Documentation validation error
 */
export interface DocumentationValidationError {
  docName: string;
  message: string;
  severity: 'error' | 'critical';
  code: string;
}

/**
 * Documentation validation warning
 */
export interface DocumentationValidationWarning {
  docName: string;
  message: string;
  severity: 'warning' | 'info';
  code: string;
}

/**
 * Base documentation generator
 */
export abstract class BaseDocumentationGenerator implements DocumentationService {
  protected format: DocumentationFormat;

  constructor(format: DocumentationFormat) {
    this.format = format;
  }

  protected getFileExtension(): string {
    const extensions: Record<DocumentationFormat, string> = {
      'markdown': '.md',
      'html': '.html',
      'json': '.json',
      'typedoc': '.md',
      'custom': '.doc'
    };

    return extensions[this.format];
  }

  protected generateMarkdownDocumentation(typeDef: GeneratedType, config: DocumentationConfig): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${typeDef.name}`);
    lines.push('');

    // Description
    lines.push(`**Type**: ${typeDef.name}`);
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push(`**Source**: ${typeDef.metadata.source}`);
    lines.push('');

    // Table of contents
    lines.push('## Table of Contents');
    lines.push('- [Overview](#overview)');
    lines.push('- [Properties](#properties)');
    if (config.includeValidation) {
      lines.push('- [Validation](#validation)');
    }
    if (config.includeExamples) {
      lines.push('- [Examples](#examples)');
    }
    lines.push('');

    // Overview section
    lines.push('## Overview');
    lines.push('');
    lines.push('This documentation provides detailed information about the `' + typeDef.name + '` type.');
    lines.push('');

    // Properties section
    lines.push('## Properties');
    lines.push('');
    lines.push('| Property | Type | Required | Description |');
    lines.push('|----------|------|----------|-------------|');

    // Parse fields from type definition
    const fields = this.parseFieldsFromTypeDefinition(typeDef.content);
    fields.forEach(field => {
      const required = field.required ? 'Yes' : 'No';
      lines.push(`| \`${field.name}\` | \`${field.type}\` | ${required} | ${field.description || '-'}|`);
    });

    lines.push('');

    // Validation section
    if (config.includeValidation) {
      lines.push('## Validation');
      lines.push('');
      lines.push('This type includes runtime validation. Refer to the validation schema for details.');
      lines.push('');
    }

    // Examples section
    if (config.includeExamples) {
      lines.push('## Examples');
      lines.push('');
      lines.push('### Basic Usage');
      lines.push('');
      lines.push('```typescript');
      lines.push(`const example: ${typeDef.name} = {`);
      fields.forEach(field => {
        if (field.required) {
          lines.push(`  ${field.name}: ${this.getExampleValue(field.type)},`);
        }
      });
      lines.push('};');
      lines.push('```');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('Generated by the Type Documentation System');
    lines.push(`Generated at: ${new Date().toISOString()}`);

    return lines.join('\n');
  }

  protected parseFieldsFromTypeDefinition(content: string): { name: string; type: string; required: boolean; description?: string }[] {
    const fieldRegex = /\s+(\w+)\??:\s*([^;]+);/g;
    const fields: { name: string; type: string; required: boolean; description?: string }[] = [];

    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2]?.trim() || 'unknown';
      const isRequired = !match[0].includes('?');

      fields.push({
        name: fieldName,
        type: fieldType,
        required: isRequired,
        description: `The ${fieldName} property`
      });
    }

    return fields;
  }

  protected getExampleValue(fieldType: string): string {
    if (fieldType.includes('string')) return `'example'`;
    if (fieldType.includes('number')) return '42';
    if (fieldType.includes('boolean')) return 'true';
    if (fieldType.includes('Date')) return 'new Date()';
    if (fieldType.includes('Record') || fieldType.includes('{')) return '{}';
    if (fieldType.includes('[]')) return '[]';
    return `'value'`;
  }

  protected generateHtmlDocumentation(typeDef: GeneratedType, config: DocumentationConfig): string {
    const fields = this.parseFieldsFromTypeDefinition(typeDef.content);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeDef.name} Documentation</title>
  <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }
      h1, h2, h3 { color: #2c3e50; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
      th { background-color: #f2f2f2; }
      code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
      .required { color: #e74c3c; font-weight: bold; }
      .optional { color: #27ae60; font-style: italic; }
  </style>
</head>
<body>
  <h1>${typeDef.name}</h1>
  <p><strong>Type:</strong> ${typeDef.name}</p>
  <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
  <p><strong>Source:</strong> ${typeDef.metadata.source}</p>

  <h2>Properties</h2>
  <table>
      <thead>
          <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
          </tr>
      </thead>
      <tbody>
          ${fields.map(field => `
          <tr>
              <td><code>${field.name}</code></td>
              <td><code>${field.type}</code></td>
              <td class="${field.required ? 'required' : 'optional'}">${field.required ? 'Yes' : 'No'}</td>
              <td>${field.description || '-'}</td>
          </tr>
          `).join('')}
      </tbody>
  </table>

  ${config.includeExamples ? `
  <h2>Examples</h2>
  <h3>Basic Usage</h3>
  <pre><code>const example: ${typeDef.name} = {
${fields.filter(f => f.required).map(f => `${f.name}: ${this.getExampleValue(f.type)}`).join(',\n  ')}
};</code></pre>
  ` : ''}

  <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #7f8c8d;">
      Generated by the Type Documentation System<br>
      Generated at: ${new Date().toISOString()}
  </footer>
</body>
</html>`;
  }

  protected generateJsonDocumentation(typeDef: GeneratedType, config: DocumentationConfig): string {
    const fields = this.parseFieldsFromTypeDefinition(typeDef.content);

    const doc = {
      name: typeDef.name,
      type: 'type',
      generatedAt: new Date().toISOString(),
      source: typeDef.metadata.source,
      properties: fields.map(field => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description || `The ${field.name} property`
      })),
      metadata: typeDef.metadata
    };

    return JSON.stringify(doc, null, 2);
  }

  // Abstract methods to be implemented by concrete generators
  abstract generateFromTypeDefinition(typeDef: GeneratedType, config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  abstract generateFromSchemaDefinition(schema: SchemaDefinition, config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  abstract generateFromValidationSchema(schema: GeneratedValidationSchema, config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  abstract generateCompleteDocumentation(types: GeneratedType[], schemas: GeneratedValidationSchema[], config: DocumentationConfig): Promise<DocumentationGenerationResult>;
  abstract validateGeneratedDocumentation(docs: GeneratedDocumentation[]): Promise<DocumentationValidationResult>;
}

/**
 * Markdown documentation generator implementation
 */
export class MarkdownDocumentationGenerator extends BaseDocumentationGenerator {
  constructor() {
    super('markdown');
  }

  async generateFromTypeDefinition(typeDef: GeneratedType, config: DocumentationConfig): Promise<DocumentationGenerationResult> {
    const startTime = Date.now();
    const result: DocumentationGenerationResult = {
      success: true,
      generatedDocs: [],
      warnings: [],
      errors: [],
      stats: {
        totalFiles: 0,
        totalTypes: 0,
        totalFields: 0,
        generationTimeMs: 0
      }
    };

    try {
      const docContent = this.generateMarkdownDocumentation(typeDef, config);
      const filePath = `${config.outputDir}/${typeDef.name}${this.getFileExtension()}`;

      const generatedDoc: GeneratedDocumentation = {
        name: `${typeDef.name}-docs`,
        content: docContent,
        filePath: filePath,
        format: 'markdown',
        metadata: {
          sourceType: 'type-definition',
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedDocs.push(generatedDoc);
      result.stats.totalFiles = 1;
      result.stats.totalTypes = 1;
      result.stats.totalFields = this.parseFieldsFromTypeDefinition(typeDef.content).length;
      result.stats.generationTimeMs = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.errors.push(`Documentation generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  async generateFromSchemaDefinition(schema: SchemaDefinition, config: DocumentationConfig): Promise<DocumentationGenerationResult> {
    const startTime = Date.now();
    const result: DocumentationGenerationResult = {
      success: true,
      generatedDocs: [],
      warnings: [],
      errors: [],
      stats: {
        totalFiles: 0,
        totalTypes: 0,
        totalFields: 0,
        generationTimeMs: 0
      }
    };

    try {
      const fields = schema.fields.map(field => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description || `The ${field.name} field`
      }));

      const lines: string[] = [];
      lines.push(`# ${schema.name}`);
      lines.push('');
      lines.push(`**Description**: ${schema.description || 'No description provided'}`);
      lines.push('');

      lines.push('## Fields');
      lines.push('');
      lines.push('| Field | Type | Required | Description |');
      lines.push('|-------|------|----------|-------------|');

      fields.forEach(field => {
        const required = field.required ? 'Yes' : 'No';
        lines.push(`| \`${field.name}\` | \`${field.type}\` | ${required} | ${field.description} |`);
      });

      const docContent = lines.join('\n');
      const filePath = `${config.outputDir}/${schema.name}${this.getFileExtension()}`;

      const generatedDoc: GeneratedDocumentation = {
        name: `${schema.name}-docs`,
        content: docContent,
        filePath: filePath,
        format: 'markdown',
        metadata: {
          sourceType: 'schema-definition',
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedDocs.push(generatedDoc);
      result.stats.totalFiles = 1;
      result.stats.totalTypes = 1;
      result.stats.totalFields = fields.length;
      result.stats.generationTimeMs = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.errors.push(`Documentation generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  async generateFromValidationSchema(schema: GeneratedValidationSchema, config: DocumentationConfig): Promise<DocumentationGenerationResult> {
    const startTime = Date.now();
    const result: DocumentationGenerationResult = {
      success: true,
      generatedDocs: [],
      warnings: [],
      errors: [],
      stats: {
        totalFiles: 0,
        totalTypes: 0,
        totalFields: 0,
        generationTimeMs: 0
      }
    };

    try {
      const lines: string[] = [];
      lines.push(`# ${schema.name} Validation Schema`);
      lines.push('');
      lines.push(`**Schema Type**: ${schema.schemaType}`);
      lines.push(`**Generated**: ${new Date().toISOString()}`);
      lines.push('');

      lines.push('## Schema Details');
      lines.push('');
      lines.push('```typescript');
      lines.push(schema.content);
      lines.push('```');

      const docContent = lines.join('\n');
      const filePath = `${config.outputDir}/${schema.name}-validation${this.getFileExtension()}`;

      const generatedDoc: GeneratedDocumentation = {
        name: `${schema.name}-validation-docs`,
        content: docContent,
        filePath: filePath,
        format: 'markdown',
        metadata: {
          sourceType: 'validation-schema',
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      result.generatedDocs.push(generatedDoc);
      result.stats.totalFiles = 1;
      result.stats.totalTypes = 1;
      result.stats.generationTimeMs = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.errors.push(`Documentation generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  async generateCompleteDocumentation(types: GeneratedType[], schemas: GeneratedValidationSchema[], config: DocumentationConfig): Promise<DocumentationGenerationResult> {
    const startTime = Date.now();
    const result: DocumentationGenerationResult = {
      success: true,
      generatedDocs: [],
      warnings: [],
      errors: [],
      stats: {
        totalFiles: 0,
        totalTypes: 0,
        totalFields: 0,
        generationTimeMs: 0
      }
    };

    try {
      // Generate index file
      if (config.generateIndex) {
        const indexContent = this.generateIndexDocumentation(types, schemas, config);
        const indexFilePath = `${config.outputDir}/index${this.getFileExtension()}`;

        result.generatedDocs.push({
          name: 'index-docs',
          content: indexContent,
          filePath: indexFilePath,
          format: 'markdown',
          metadata: {
            sourceType: 'complete-documentation',
            generatedAt: new Date().toISOString(),
            version: '1.0.0'
          }
        });
      }

      // Generate documentation for each type
      for (const type of types) {
        const typeResult = await this.generateFromTypeDefinition(type, config);
        result.generatedDocs.push(...typeResult.generatedDocs);
        result.stats.totalTypes += typeResult.stats.totalTypes;
        result.stats.totalFields += typeResult.stats.totalFields;
        result.warnings.push(...typeResult.warnings);
        result.errors.push(...typeResult.errors);
      }

      // Generate documentation for each schema
      for (const schema of schemas) {
        const schemaResult = await this.generateFromValidationSchema(schema, config);
        result.generatedDocs.push(...schemaResult.generatedDocs);
        result.warnings.push(...schemaResult.warnings);
        result.errors.push(...schemaResult.errors);
      }

      result.stats.totalFiles = result.generatedDocs.length;
      result.stats.generationTimeMs = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.errors.push(`Complete documentation generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.stats.generationTimeMs = Date.now() - startTime;
    }

    return result;
  }

  protected generateIndexDocumentation(types: GeneratedType[], schemas: GeneratedValidationSchema[], config: DocumentationConfig): string {
    const lines: string[] = [];

    lines.push(`# ${config.title || 'Type System Documentation'}`);
    lines.push('');
    lines.push(config.description || 'Comprehensive documentation for the type system');
    lines.push('');

    lines.push('## Table of Contents');
    lines.push('');

    // Types section
    lines.push('### Types');
    types.forEach(type => {
      lines.push(`- [${type.name}](${type.name}.md)`);
    });
    lines.push('');

    // Validation Schemas section
    if (schemas.length > 0) {
      lines.push('### Validation Schemas');
      schemas.forEach(schema => {
        lines.push(`- [${schema.name} Validation](${schema.name}-validation.md)`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(`**Total Types**: ${types.length}`);
    lines.push(`**Total Validation Schemas**: ${schemas.length}`);
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('Generated by the Type Documentation System');

    return lines.join('\n');
  }

  async validateGeneratedDocumentation(docs: GeneratedDocumentation[]): Promise<DocumentationValidationResult> {
    const result: DocumentationValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Basic validation
    const docNames = new Set<string>();

    for (const doc of docs) {
      if (docNames.has(doc.name)) {
        result.valid = false;
        result.errors.push({
          docName: doc.name,
          message: `Duplicate documentation name: ${doc.name}`,
          severity: 'error',
          code: 'DUPLICATE_DOCUMENTATION'
        });
      }
      docNames.add(doc.name);

      // Check content is not empty
      if (!doc.content || doc.content.trim().length === 0) {
        result.valid = false;
        result.errors.push({
          docName: doc.name,
          message: `Empty documentation content for ${doc.name}`,
          severity: 'error',
          code: 'EMPTY_DOCUMENTATION'
        });
      }
    }

    return result;
  }
}

/**
 * Documentation factory
 */
export function createDocumentationGenerator(format: DocumentationFormat = 'markdown'): DocumentationService {
  switch (format) {
    case 'markdown':
      return new MarkdownDocumentationGenerator();
    case 'html':
    case 'json':
    case 'typedoc':
    case 'custom':
    default:
      // For other formats, return markdown generator as default
      return new MarkdownDocumentationGenerator();
  }
}

/**
 * Documentation utilities
 */
const DocumentationUtils: {
  createDefaultConfig: (outputDir: string, format?: DocumentationFormat) => DocumentationConfig;
  generateCompleteTypeDocumentation: (types: GeneratedType[], schemas: GeneratedValidationSchema[], config?: DocumentationConfig) => Promise<DocumentationGenerationResult>;
} = {

  /**
   * Create a basic documentation configuration
   */
  createDefaultConfig(outputDir: string, format: DocumentationFormat = 'markdown'): DocumentationConfig {
    return {
      format,
      outputDir,
      title: 'Type System Documentation',
      description: 'Automatically generated documentation for the type system',
      includeExamples: true,
      includeValidation: true,
      includeRelationships: true,
      generateIndex: true
    };
  },

  /**
   * Generate complete documentation for a type system
   */
  async generateCompleteTypeDocumentation(
    types: GeneratedType[],
    schemas: GeneratedValidationSchema[],
    config: DocumentationConfig = DocumentationUtils.createDefaultConfig('docs/types')
  ): Promise<DocumentationGenerationResult> {
    const generator = createDocumentationGenerator(config.format);
    return generator.generateCompleteDocumentation(types, schemas, config);
  }
};
