/**
 * Standard module structure definitions and validation
 * 
 * This module defines the standard structure that all infrastructure
 * modules must follow after consolidation.
 */

/**
 * Type of API export
 */
export enum APIType {
  FUNCTION = 'FUNCTION',
  CLASS = 'CLASS',
  INTERFACE = 'INTERFACE',
  CONSTANT = 'CONSTANT',
  TYPE = 'TYPE',
}

/**
 * Definition of a public API export
 */
export interface APIDefinition {
  /** Name of the exported member */
  name: string;
  /** Type of export */
  type: APIType;
  /** TypeScript signature */
  signature: string;
  /** JSDoc description */
  description: string;
  /** Usage examples */
  examples: string[];
}

/**
 * Metadata for an infrastructure module
 */
export interface ModuleMetadata {
  /** Module name (kebab-case) */
  name: string;
  /** Semantic version */
  version: string;
  /** List of module dependencies */
  dependencies: string[];
  /** List of exported member names */
  exports: string[];
  /** Public API definitions */
  publicAPI: APIDefinition[];
  /** Module documentation (from README.md) */
  documentation: string;
}

/**
 * Standard module structure requirements
 */
export interface ModuleStructure {
  /** Module root directory path */
  path: string;
  /** Whether index.ts exists */
  hasIndex: boolean;
  /** Whether types.ts or types/ directory exists */
  hasTypes: boolean;
  /** Whether README.md exists */
  hasReadme: boolean;
  /** Whether __tests__/ directory exists */
  hasTests: boolean;
  /** List of sub-module directories */
  subModules: string[];
}

/**
 * Validation result for module structure
 */
export interface ModuleStructureValidation {
  /** Whether the module structure is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** The validated structure */
  structure: ModuleStructure;
}

/**
 * Standard folder structure for a module
 */
export const STANDARD_MODULE_STRUCTURE = {
  /** Main export file */
  INDEX_FILE: 'index.ts',
  /** Type definitions file */
  TYPES_FILE: 'types.ts',
  /** Type definitions directory (alternative to types.ts) */
  TYPES_DIR: 'types',
  /** Documentation file */
  README_FILE: 'README.md',
  /** Test directory */
  TESTS_DIR: '__tests__',
} as const;

/**
 * Validates that a module follows the standard structure
 * 
 * @param modulePath - Path to the module directory
 * @param fs - File system interface for checking file existence
 * @returns Validation result
 */
export function validateModuleStructure(
  modulePath: string,
  fs: {
    existsSync: (path: string) => boolean;
    readdirSync: (path: string) => string[];
  }
): ModuleStructureValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required files
  const indexPath = `${modulePath}/${STANDARD_MODULE_STRUCTURE.INDEX_FILE}`;
  const hasIndex = fs.existsSync(indexPath);
  if (!hasIndex) {
    errors.push(`Missing required file: ${STANDARD_MODULE_STRUCTURE.INDEX_FILE}`);
  }

  const typesFilePath = `${modulePath}/${STANDARD_MODULE_STRUCTURE.TYPES_FILE}`;
  const typesDirPath = `${modulePath}/${STANDARD_MODULE_STRUCTURE.TYPES_DIR}`;
  const hasTypes = fs.existsSync(typesFilePath) || fs.existsSync(typesDirPath);
  if (!hasTypes) {
    warnings.push(
      `Missing types definition: ${STANDARD_MODULE_STRUCTURE.TYPES_FILE} or ${STANDARD_MODULE_STRUCTURE.TYPES_DIR}/`
    );
  }

  const readmePath = `${modulePath}/${STANDARD_MODULE_STRUCTURE.README_FILE}`;
  const hasReadme = fs.existsSync(readmePath);
  if (!hasReadme) {
    errors.push(`Missing required file: ${STANDARD_MODULE_STRUCTURE.README_FILE}`);
  }

  const testsPath = `${modulePath}/${STANDARD_MODULE_STRUCTURE.TESTS_DIR}`;
  const hasTests = fs.existsSync(testsPath);
  if (!hasTests) {
    warnings.push(
      `Missing test directory: ${STANDARD_MODULE_STRUCTURE.TESTS_DIR}/`
    );
  }

  // Find sub-modules (directories that don't start with __ or .)
  let subModules: string[] = [];
  try {
    const entries = fs.readdirSync(modulePath);
    subModules = entries.filter((entry) => {
      const entryPath = `${modulePath}/${entry}`;
      return (
        fs.existsSync(entryPath) &&
        !entry.startsWith('__') &&
        !entry.startsWith('.') &&
        entry !== 'node_modules' &&
        !entry.endsWith('.ts') &&
        !entry.endsWith('.md')
      );
    });
  } catch (error) {
    errors.push(`Failed to read module directory: ${error}`);
  }

  const structure: ModuleStructure = {
    path: modulePath,
    hasIndex,
    hasTypes,
    hasReadme,
    hasTests,
    subModules,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    structure,
  };
}

/**
 * Validates module metadata
 * 
 * @param metadata - Module metadata to validate
 * @returns Validation result
 */
export function validateModuleMetadata(
  metadata: ModuleMetadata
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name format (kebab-case)
  const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (!kebabCaseRegex.test(metadata.name)) {
    errors.push(`Module name "${metadata.name}" must be in kebab-case format`);
  }

  // Validate version format (semver)
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  if (!semverRegex.test(metadata.version)) {
    errors.push(
      `Module version "${metadata.version}" must follow semantic versioning`
    );
  }

  // Validate exports match public API
  const apiNames = metadata.publicAPI.map((api) => api.name);
  const missingFromAPI = metadata.exports.filter(
    (exp) => !apiNames.includes(exp)
  );
  if (missingFromAPI.length > 0) {
    warnings.push(
      `Exports not documented in public API: ${missingFromAPI.join(', ')}`
    );
  }

  // Validate public API has descriptions
  for (const api of metadata.publicAPI) {
    if (!api.description || api.description.trim() === '') {
      warnings.push(`API member "${api.name}" is missing description`);
    }
    if (api.examples.length === 0) {
      warnings.push(`API member "${api.name}" has no usage examples`);
    }
  }

  // Validate documentation exists
  if (!metadata.documentation || metadata.documentation.trim() === '') {
    errors.push('Module documentation cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates a template README.md content for a module
 * 
 * @param metadata - Module metadata
 * @returns README.md content
 */
export function createModuleReadmeTemplate(metadata: ModuleMetadata): string {
  const apiByType = metadata.publicAPI.reduce(
    (acc, api) => {
      if (!acc[api.type]) {
        acc[api.type] = [];
      }
      acc[api.type].push(api);
      return acc;
    },
    {} as Record<APIType, APIDefinition[]>
  );

  let readme = `# ${metadata.name}\n\n`;
  readme += `Version: ${metadata.version}\n\n`;
  readme += `## Overview\n\n`;
  readme += `${metadata.documentation}\n\n`;

  if (metadata.dependencies.length > 0) {
    readme += `## Dependencies\n\n`;
    for (const dep of metadata.dependencies) {
      readme += `- \`${dep}\`\n`;
    }
    readme += `\n`;
  }

  readme += `## Public API\n\n`;

  for (const [type, apis] of Object.entries(apiByType)) {
    if (apis.length === 0) continue;

    readme += `### ${type}S\n\n`;

    for (const api of apis) {
      readme += `#### \`${api.name}\`\n\n`;
      readme += `${api.description}\n\n`;
      readme += `**Signature:**\n\`\`\`typescript\n${api.signature}\n\`\`\`\n\n`;

      if (api.examples.length > 0) {
        readme += `**Examples:**\n\n`;
        for (const example of api.examples) {
          readme += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
        }
      }
    }
  }

  return readme;
}

/**
 * Creates a template index.ts content for a module
 * 
 * @param metadata - Module metadata
 * @returns index.ts content
 */
export function createModuleIndexTemplate(metadata: ModuleMetadata): string {
  let content = `/**\n`;
  content += ` * ${metadata.name} module\n`;
  content += ` * \n`;
  content += ` * ${metadata.documentation.split('\n')[0]}\n`;
  content += ` * \n`;
  content += ` * @module ${metadata.name}\n`;
  content += ` * @version ${metadata.version}\n`;
  content += ` */\n\n`;

  // Export types
  content += `// Type exports\n`;
  content += `export * from './types';\n\n`;

  // Export sub-modules if any
  const subModules = metadata.exports.filter((exp) =>
    metadata.publicAPI.some((api) => api.name === exp && api.type === APIType.CLASS)
  );

  if (subModules.length > 0) {
    content += `// Sub-module exports\n`;
    for (const subModule of subModules) {
      content += `export * from './${subModule}';\n`;
    }
    content += `\n`;
  }

  return content;
}
