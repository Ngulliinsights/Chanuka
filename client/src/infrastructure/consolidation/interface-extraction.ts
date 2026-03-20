/**
 * Interface Extraction Strategy
 * 
 * This module provides functionality to identify shared interfaces between
 * circular modules and extract them to separate files to break circular dependencies.
 * 
 * Requirements: 2.3
 */

import type { Project, SourceFile, InterfaceDeclaration, TypeAliasDeclaration } from 'ts-morph';

/**
 * Represents a shared interface between modules
 */
export interface SharedInterface {
  /** Name of the interface or type */
  name: string;
  /** Full TypeScript definition */
  definition: string;
  /** Modules that use this interface */
  usedBy: string[];
  /** Source file where interface is currently defined */
  sourceFile: string;
  /** Whether this is an interface or type alias */
  kind: 'interface' | 'type';
}

/**
 * Strategy for extracting interfaces to break circular dependencies
 */
export interface InterfaceExtractionStrategy {
  /** Interfaces to extract */
  interfaces: SharedInterface[];
  /** Target file path for extracted interfaces */
  targetFile: string;
  /** Modules affected by this extraction */
  affectedModules: string[];
  /** Import updates required */
  importUpdates: ImportUpdate[];
}

/**
 * Describes an import update required after interface extraction
 */
export interface ImportUpdate {
  /** File that needs import update */
  file: string;
  /** Old import statement */
  oldImport: string;
  /** New import statement */
  newImport: string;
}

/**
 * Identifies shared interfaces between circular modules
 * 
 * @param project - ts-morph Project instance
 * @param circularModules - Array of module paths that form a circular dependency
 * @returns Array of shared interfaces found between the modules
 */
export function identifySharedInterfaces(
  project: Project,
  circularModules: string[]
): SharedInterface[] {
  const sharedInterfaces: SharedInterface[] = [];
  const interfaceUsage = new Map<string, Set<string>>();

  // Analyze each module to find interfaces and their usage
  for (const modulePath of circularModules) {
    const sourceFile = project.getSourceFile(modulePath);
    if (!sourceFile) continue;

    // Find all interface declarations
    const interfaces = sourceFile.getInterfaces();
    for (const iface of interfaces) {
      const name = iface.getName();
      if (!interfaceUsage.has(name)) {
        interfaceUsage.set(name, new Set());
      }
      interfaceUsage.get(name)!.add(modulePath);
    }

    // Find all type alias declarations
    const typeAliases = sourceFile.getTypeAliases();
    for (const typeAlias of typeAliases) {
      const name = typeAlias.getName();
      if (!interfaceUsage.has(name)) {
        interfaceUsage.set(name, new Set());
      }
      interfaceUsage.get(name)!.add(modulePath);
    }
  }

  // Check for cross-module references
  for (const modulePath of circularModules) {
    const sourceFile = project.getSourceFile(modulePath);
    if (!sourceFile) continue;

    // Find all imports from other circular modules
    const imports = sourceFile.getImportDeclarations();
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Check if this import is from another circular module
      const importedModule = circularModules.find(m => 
        moduleSpecifier.includes(m) || m.includes(moduleSpecifier)
      );
      
      if (importedModule && importedModule !== modulePath) {
        // Get imported names
        const namedImports = importDecl.getNamedImports();
        for (const namedImport of namedImports) {
          const importedName = namedImport.getName();
          
          // If this name is an interface/type, mark it as shared
          if (interfaceUsage.has(importedName)) {
            interfaceUsage.get(importedName)!.add(modulePath);
          }
        }
      }
    }
  }

  // Identify interfaces used by multiple modules
  for (const [name, modules] of interfaceUsage.entries()) {
    if (modules.size > 1) {
      // Find the source file where this interface is defined
      let definition = '';
      let sourceFile = '';
      let kind: 'interface' | 'type' = 'interface';

      for (const modulePath of modules) {
        const file = project.getSourceFile(modulePath);
        if (!file) continue;

        const iface = file.getInterface(name);
        if (iface) {
          definition = iface.getText();
          sourceFile = modulePath;
          kind = 'interface';
          break;
        }

        const typeAlias = file.getTypeAlias(name);
        if (typeAlias) {
          definition = typeAlias.getText();
          sourceFile = modulePath;
          kind = 'type';
          break;
        }
      }

      if (definition) {
        sharedInterfaces.push({
          name,
          definition,
          usedBy: Array.from(modules),
          sourceFile,
          kind,
        });
      }
    }
  }

  return sharedInterfaces;
}

/**
 * Generates TypeScript interface definitions for extracted interfaces
 * 
 * @param interfaces - Array of shared interfaces to extract
 * @returns TypeScript code containing all interface definitions
 */
export function generateInterfaceDefinitions(interfaces: SharedInterface[]): string {
  const lines: string[] = [
    '/**',
    ' * Extracted interfaces to break circular dependencies',
    ' * ',
    ' * This file contains interfaces that were shared between modules',
    ' * that had circular dependencies. By extracting them to a separate',
    ' * file, we break the circular dependency chain.',
    ' */',
    '',
  ];

  for (const iface of interfaces) {
    lines.push(`// Used by: ${iface.usedBy.join(', ')}`);
    lines.push(iface.definition);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Creates a strategy to extract interfaces to separate files
 * 
 * @param project - ts-morph Project instance
 * @param circularModules - Array of module paths that form a circular dependency
 * @param targetFile - Path where extracted interfaces should be placed
 * @returns Interface extraction strategy
 */
export function createInterfaceExtractionStrategy(
  project: Project,
  circularModules: string[],
  targetFile: string
): InterfaceExtractionStrategy {
  const interfaces = identifySharedInterfaces(project, circularModules);
  const importUpdates: ImportUpdate[] = [];

  // Generate import updates for each affected module
  for (const modulePath of circularModules) {
    const sourceFile = project.getSourceFile(modulePath);
    if (!sourceFile) continue;

    // Find imports from other circular modules that import extracted interfaces
    const imports = sourceFile.getImportDeclarations();
    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Check if this import is from another circular module
      const importedModule = circularModules.find(m => 
        moduleSpecifier.includes(m) || m.includes(moduleSpecifier)
      );
      
      if (importedModule && importedModule !== modulePath) {
        const namedImports = importDecl.getNamedImports();
        const extractedNames: string[] = [];
        const remainingNames: string[] = [];

        for (const namedImport of namedImports) {
          const importedName = namedImport.getName();
          
          // Check if this is an extracted interface
          if (interfaces.some(iface => iface.name === importedName)) {
            extractedNames.push(importedName);
          } else {
            remainingNames.push(importedName);
          }
        }

        if (extractedNames.length > 0) {
          const oldImport = importDecl.getText();
          
          // Build new import statements
          const newImports: string[] = [];
          
          // Import extracted interfaces from target file
          newImports.push(
            `import type { ${extractedNames.join(', ')} } from '${targetFile}';`
          );
          
          // Keep remaining imports from original module
          if (remainingNames.length > 0) {
            newImports.push(
              `import { ${remainingNames.join(', ')} } from '${moduleSpecifier}';`
            );
          }

          importUpdates.push({
            file: modulePath,
            oldImport,
            newImport: newImports.join('\n'),
          });
        }
      }
    }
  }

  return {
    interfaces,
    targetFile,
    affectedModules: circularModules,
    importUpdates,
  };
}

/**
 * Applies an interface extraction strategy to the project
 * 
 * @param project - ts-morph Project instance
 * @param strategy - Interface extraction strategy to apply
 */
export function applyInterfaceExtraction(
  project: Project,
  strategy: InterfaceExtractionStrategy
): void {
  // Create the target file with extracted interfaces
  const interfaceDefinitions = generateInterfaceDefinitions(strategy.interfaces);
  const targetFile = project.createSourceFile(strategy.targetFile, interfaceDefinitions, {
    overwrite: true,
  });

  // Apply import updates
  for (const update of strategy.importUpdates) {
    const sourceFile = project.getSourceFile(update.file);
    if (!sourceFile) continue;

    // Find and replace the old import
    const imports = sourceFile.getImportDeclarations();
    for (const importDecl of imports) {
      if (importDecl.getText() === update.oldImport) {
        importDecl.replaceWithText(update.newImport);
        break;
      }
    }
  }

  // Remove extracted interfaces from their original locations
  for (const iface of strategy.interfaces) {
    const sourceFile = project.getSourceFile(iface.sourceFile);
    if (!sourceFile) continue;

    if (iface.kind === 'interface') {
      const interfaceDecl = sourceFile.getInterface(iface.name);
      if (interfaceDecl) {
        interfaceDecl.remove();
      }
    } else {
      const typeAlias = sourceFile.getTypeAlias(iface.name);
      if (typeAlias) {
        typeAlias.remove();
      }
    }
  }

  // Save all changes
  project.saveSync();
}
