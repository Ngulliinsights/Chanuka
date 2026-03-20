/**
 * Module Consolidation Algorithm
 * 
 * Implements the core consolidation logic for merging, nesting, and refactoring modules.
 * Supports three strategies: MERGE, NEST, and REFACTOR.
 * 
 * Requirements: 3.5, 8.1
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConsolidationStrategy, ConsolidationMapping } from './types';

/**
 * Represents a module's structure and content
 */
export interface Module {
  name: string;
  path: string;
  exports: ModuleExport[];
  types: TypeDefinition[];
  implementations: Implementation[];
  subModules?: Module[];
}

/**
 * Represents an exported member from a module
 */
export interface ModuleExport {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'variable';
  signature: string;
  isDefault: boolean;
}

/**
 * Represents a type definition
 */
export interface TypeDefinition {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  definition: string;
}

/**
 * Represents an implementation (function or class)
 */
export interface Implementation {
  name: string;
  kind: 'function' | 'class' | 'const';
  code: string;
}

/**
 * Standard module structure layout
 */
export interface ModuleStructure {
  name: string;
  path: string;
  indexTs: string;
  typesDir: string;
  readmeMd: string;
  testsDir: string;
  subModules: SubModule[];
  core?: string; // For REFACTOR strategy
}

/**
 * Sub-module structure
 */
export interface SubModule {
  name: string;
  path: string;
  exports: ModuleExport[];
  types: TypeDefinition[];
  implementations: Implementation[];
}

/**
 * Result of a consolidation operation
 */
export interface ConsolidationResult {
  success: boolean;
  module?: ModuleStructure;
  error?: string;
}

/**
 * Creates a standard module structure with required directories and files
 * 
 * @param moduleName - Name of the module to create
 * @param basePath - Base path where the module should be created
 * @returns Standard module structure
 */
export function createStandardModuleStructure(
  moduleName: string,
  basePath: string = 'client/src/infrastructure'
): ModuleStructure {
  const modulePath = path.join(basePath, moduleName);
  
  return {
    name: moduleName,
    path: modulePath,
    indexTs: path.join(modulePath, 'index.ts'),
    typesDir: path.join(modulePath, 'types'),
    readmeMd: path.join(modulePath, 'README.md'),
    testsDir: path.join(modulePath, '__tests__'),
    subModules: [],
  };
}

/**
 * Merges exports from multiple modules into a single list
 * Handles naming conflicts by prefixing with source module name
 * 
 * @param targetStructure - Target module structure
 * @param sourceExports - Exports from source module
 * @param sourceModuleName - Name of source module (for conflict resolution)
 */
export function mergeExports(
  targetStructure: ModuleStructure,
  sourceExports: ModuleExport[],
  sourceModuleName: string
): void {
  // Track existing export names to detect conflicts
  const existingNames = new Set<string>();
  
  for (const subModule of targetStructure.subModules) {
    for (const exp of subModule.exports) {
      existingNames.add(exp.name);
    }
  }
  
  // Add source exports, handling conflicts
  const processedExports: ModuleExport[] = [];
  
  for (const exp of sourceExports) {
    if (existingNames.has(exp.name)) {
      // Conflict detected - prefix with source module name
      processedExports.push({
        ...exp,
        name: `${sourceModuleName}_${exp.name}`,
      });
    } else {
      processedExports.push(exp);
      existingNames.add(exp.name);
    }
  }
  
  // Add to first sub-module or create new one
  if (targetStructure.subModules.length === 0) {
    targetStructure.subModules.push({
      name: 'main',
      path: path.join(targetStructure.path, 'main'),
      exports: processedExports,
      types: [],
      implementations: [],
    });
  } else {
    targetStructure.subModules[0].exports.push(...processedExports);
  }
}

/**
 * Merges type definitions from multiple modules
 * Handles naming conflicts by prefixing with source module name
 * 
 * @param targetStructure - Target module structure
 * @param sourceTypes - Type definitions from source module
 * @param sourceModuleName - Name of source module (for conflict resolution)
 */
export function mergeTypes(
  targetStructure: ModuleStructure,
  sourceTypes: TypeDefinition[],
  sourceModuleName: string
): void {
  // Track existing type names
  const existingNames = new Set<string>();
  
  for (const subModule of targetStructure.subModules) {
    for (const type of subModule.types) {
      existingNames.add(type.name);
    }
  }
  
  // Add source types, handling conflicts
  const processedTypes: TypeDefinition[] = [];
  
  for (const type of sourceTypes) {
    if (existingNames.has(type.name)) {
      // Conflict detected - prefix with source module name
      processedTypes.push({
        ...type,
        name: `${sourceModuleName}_${type.name}`,
      });
    } else {
      processedTypes.push(type);
      existingNames.add(type.name);
    }
  }
  
  // Add to first sub-module or create new one
  if (targetStructure.subModules.length === 0) {
    targetStructure.subModules.push({
      name: 'main',
      path: path.join(targetStructure.path, 'main'),
      exports: [],
      types: processedTypes,
      implementations: [],
    });
  } else {
    targetStructure.subModules[0].types.push(...processedTypes);
  }
}

/**
 * Merges implementations from multiple modules
 * 
 * @param targetStructure - Target module structure
 * @param sourceImplementations - Implementations from source module
 */
export function mergeImplementations(
  targetStructure: ModuleStructure,
  sourceImplementations: Implementation[]
): void {
  // Add to first sub-module or create new one
  if (targetStructure.subModules.length === 0) {
    targetStructure.subModules.push({
      name: 'main',
      path: path.join(targetStructure.path, 'main'),
      exports: [],
      types: [],
      implementations: sourceImplementations,
    });
  } else {
    targetStructure.subModules[0].implementations.push(...sourceImplementations);
  }
}

/**
 * Creates a sub-module structure for NEST strategy
 * 
 * @param sourceName - Name of the source module
 * @param targetPath - Path to the target module
 * @returns Sub-module structure
 */
export function createSubModule(
  sourceName: string,
  targetPath: string
): SubModule {
  return {
    name: sourceName,
    path: path.join(targetPath, sourceName),
    exports: [],
    types: [],
    implementations: [],
  };
}

/**
 * Extracts common code from multiple modules for REFACTOR strategy
 * 
 * @param sourceModules - Array of source modules
 * @returns Common implementations found across modules
 */
export function extractCommonCode(sourceModules: Module[]): Implementation[] {
  if (sourceModules.length === 0) {
    return [];
  }
  
  // Simple heuristic: find implementations with same name across modules
  const implementationsByName = new Map<string, Implementation[]>();
  
  for (const module of sourceModules) {
    for (const impl of module.implementations) {
      if (!implementationsByName.has(impl.name)) {
        implementationsByName.set(impl.name, []);
      }
      implementationsByName.get(impl.name)!.push(impl);
    }
  }
  
  // Common code = implementations that appear in multiple modules
  const commonCode: Implementation[] = [];
  
  for (const [name, impls] of implementationsByName.entries()) {
    if (impls.length > 1) {
      // Use the first implementation as the common one
      commonCode.push(impls[0]);
    }
  }
  
  return commonCode;
}

/**
 * Extracts module-specific code (not common) for REFACTOR strategy
 * 
 * @param sourceModule - Source module
 * @param commonCode - Common implementations to exclude
 * @returns Module-specific implementations
 */
export function extractSpecificCode(
  sourceModule: Module,
  commonCode: Implementation[]
): Implementation[] {
  const commonNames = new Set(commonCode.map(impl => impl.name));
  
  return sourceModule.implementations.filter(
    impl => !commonNames.has(impl.name)
  );
}

/**
 * Main consolidation algorithm
 * Consolidates multiple source modules into a single target module
 * 
 * @param sourceModules - Array of source modules to consolidate
 * @param targetModule - Name of the target module
 * @param strategy - Consolidation strategy to use
 * @param basePath - Base path for module creation
 * @returns Consolidation result
 */
export function consolidateModules(
  sourceModules: Module[],
  targetModule: string,
  strategy: ConsolidationStrategy,
  basePath: string = 'client/src/infrastructure'
): ConsolidationResult {
  try {
    // Validate inputs
    if (sourceModules.length === 0) {
      return {
        success: false,
        error: 'No source modules provided',
      };
    }
    
    if (!targetModule) {
      return {
        success: false,
        error: 'Target module name is required',
      };
    }
    
    // Step 1: Create target module structure
    const targetStructure = createStandardModuleStructure(targetModule, basePath);
    
    // Step 2: Apply consolidation strategy
    switch (strategy) {
      case ConsolidationStrategy.MERGE:
        // Merge all exports, types, and implementations into single module
        for (const source of sourceModules) {
          mergeExports(targetStructure, source.exports, source.name);
          mergeTypes(targetStructure, source.types, source.name);
          mergeImplementations(targetStructure, source.implementations);
        }
        break;
        
      case ConsolidationStrategy.NEST:
        // Create sub-modules for each source module
        for (const source of sourceModules) {
          const subModule = createSubModule(source.name, targetStructure.path);
          subModule.exports = source.exports;
          subModule.types = source.types;
          subModule.implementations = source.implementations;
          targetStructure.subModules.push(subModule);
        }
        break;
        
      case ConsolidationStrategy.REFACTOR:
        // Extract common code to core, create sub-modules for specific code
        const commonCode = extractCommonCode(sourceModules);
        targetStructure.core = path.join(targetStructure.path, 'core');
        
        // Create core sub-module for common code
        if (commonCode.length > 0) {
          const coreSubModule = createSubModule('core', targetStructure.path);
          coreSubModule.implementations = commonCode;
          targetStructure.subModules.push(coreSubModule);
        }
        
        // Create sub-modules for module-specific code
        for (const source of sourceModules) {
          const specificCode = extractSpecificCode(source, commonCode);
          if (specificCode.length > 0) {
            const subModule = createSubModule(source.name, targetStructure.path);
            subModule.exports = source.exports;
            subModule.types = source.types;
            subModule.implementations = specificCode;
            targetStructure.subModules.push(subModule);
          }
        }
        break;
        
      default:
        return {
          success: false,
          error: `Unsupported consolidation strategy: ${strategy}`,
        };
    }
    
    return {
      success: true,
      module: targetStructure,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
