/**
 * Fix Generator
 * 
 * Generates fixes for TypeScript errors based on error category.
 */

import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import {
  ErrorCategory,
  TypeScriptError,
  Fix,
  ImportPathFix,
  TypeConsolidationFix,
  TypeFix,
  InterfaceFix,
  ModuleRelocationMap,
  FSDLocation,
  FixResult,
  PropertyDefinition,
  CodeLocation,
  MigrationPattern
} from '../types';
import { RemediationConfig } from '../config';

export class FixGenerator {
  private project: Project;
  private config: RemediationConfig;

  constructor(config: RemediationConfig) {
    this.config = config;
    this.project = new Project({
      tsConfigFilePath: config.tsconfigPath
    });
  }

  /**
   * Generate fixes for a specific error category
   */
  generateFixes(category: ErrorCategory, errors: TypeScriptError[]): Fix[] {
    switch (category) {
      case ErrorCategory.MODULE_RESOLUTION:
      case ErrorCategory.EXPORT_PATH:
        // These require module relocation map, handled by generateImportPathUpdateFixes
        return [];
      
      case ErrorCategory.ID_TYPE:
      case ErrorCategory.TYPE_COMPARISON:
        return this.generateTypeStandardizationFixes(errors);
      
      case ErrorCategory.INTERFACE_COMPLETION:
      case ErrorCategory.ERROR_CONSTRUCTOR:
        return this.generateInterfaceCompletionFixes(errors);
      
      case ErrorCategory.EXPLICIT_TYPES:
      case ErrorCategory.UNDEFINED_SAFETY:
      case ErrorCategory.INTERFACE_COMPATIBILITY:
      case ErrorCategory.ENUM_LITERAL:
        return this.generateTypeSafetyFixes(errors);
      
      case ErrorCategory.EXPORT_DISAMBIGUATION:
      case ErrorCategory.NAMING_CONSISTENCY:
        // Handled by type consolidation
        return [];
      
      default:
        return [];
    }
  }

  /**
   * Generate import path update fixes
   */
  generateImportPathUpdateFixes(
    relocations: ModuleRelocationMap,
    errors: TypeScriptError[]
  ): ImportPathFix[] {
    const fixes: ImportPathFix[] = [];
    const processedCombinations = new Set<string>();

    // Get all source files to scan for imports
    const sourceFiles = this.project.getSourceFiles();

    // Process each source file
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      
      // Skip files in node_modules, dist, etc.
      if (this.shouldSkipFile(filePath)) continue;

      // Find all import declarations
      const imports = sourceFile.getImportDeclarations();

      for (const importDecl of imports) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        // Check if this import needs to be updated
        const relocation = relocations.relocations.get(moduleSpecifier);
        if (!relocation) continue;

        // Create unique key to avoid duplicate fixes
        const key = `${filePath}:${moduleSpecifier}`;
        if (processedCombinations.has(key)) continue;
        processedCombinations.add(key);

        // Get imported names
        const namedImports = importDecl.getNamedImports();
        const importedNames = namedImports.map(ni => ni.getName());
        
        // Handle default imports
        const defaultImport = importDecl.getDefaultImport();
        if (defaultImport) {
          importedNames.push(defaultImport.getText());
        }

        // Handle namespace imports
        const namespaceImport = importDecl.getNamespaceImport();
        if (namespaceImport) {
          importedNames.push(`* as ${namespaceImport.getText()}`);
        }

        // Calculate new import path
        const newImportPath = this.calculateNewImportPath(filePath, relocation);

        fixes.push({
          id: `import-path-${fixes.length}`,
          category: ErrorCategory.MODULE_RESOLUTION,
          description: `Update import path from '${moduleSpecifier}' to '${newImportPath}' in ${path.basename(filePath)}`,
          file: filePath,
          oldImportPath: moduleSpecifier,
          newImportPath,
          importedNames,
          apply: async () => this.applyImportPathFix(filePath, moduleSpecifier, newImportPath)
        });
      }
    }

    return fixes;
  }

  /**
   * Calculate new import path based on relocation
   */
  private calculateNewImportPath(fromFile: string, relocation: FSDLocation): string {
    // Normalize paths
    const normalizedFromFile = fromFile.replace(/\\/g, '/');
    const normalizedToFile = relocation.path.replace(/\\/g, '/');

    // If the relocated file is in a different major directory (e.g., shared vs client),
    // we might want to use a path alias instead of a relative path
    const fromParts = normalizedFromFile.split('/');
    const toParts = normalizedToFile.split('/');

    // Check if we're crossing major boundaries (client <-> shared)
    const fromRoot = fromParts[0];
    const toRoot = toParts[0];

    if (fromRoot !== toRoot && (fromRoot === 'client' || fromRoot === 'shared')) {
      // Use path alias for cross-boundary imports
      if (toRoot === 'shared') {
        // Import from shared - use @shared alias if available
        const sharedRelativePath = toParts.slice(1).join('/');
        return `@shared/${sharedRelativePath}`.replace(/\.(ts|tsx|js|jsx)$/, '');
      } else if (toRoot === 'client') {
        // Import from client - use @client alias if available
        const clientRelativePath = toParts.slice(1).join('/');
        return `@client/${clientRelativePath}`.replace(/\.(ts|tsx|js|jsx)$/, '');
      }
    }

    // Otherwise, use relative path
    return this.calculateRelativeImportPath(fromFile, relocation.path);
  }

  /**
   * Check if file should be skipped
   */
  private shouldSkipFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    const skipPatterns = [
      '/node_modules/',
      '/dist/',
      '/.cleanup-backup/',
      '/.design-system-backup/',
      '/archive/',
      '.test.ts',
      '.test.tsx',
      '.spec.ts',
      '.spec.tsx'
    ];

    return skipPatterns.some(pattern => normalizedPath.includes(pattern));
  }

  /**
   * Generate type consolidation fixes
   */
  generateTypeConsolidationFixes(
    duplicateTypes: Map<string, string[]>
  ): TypeConsolidationFix[] {
    const fixes: TypeConsolidationFix[] = [];

    for (const [canonicalName, duplicatePaths] of duplicateTypes) {
      // Determine canonical location based on preference
      const canonicalPath = this.selectCanonicalLocation(duplicatePaths);
      
      // Find all files importing these types
      const affectedImports = this.findTypeImports(canonicalName, duplicatePaths);

      fixes.push({
        id: `type-consolidation-${fixes.length}`,
        category: ErrorCategory.NAMING_CONSISTENCY,
        description: `Consolidate type '${canonicalName}' to ${canonicalPath}`,
        canonicalPath,
        canonicalName,
        duplicates: duplicatePaths
          .filter(p => p !== canonicalPath)
          .map(p => ({ path: p, name: canonicalName })),
        affectedImports,
        apply: async () => this.applyTypeConsolidationFix(
          canonicalPath,
          canonicalName,
          duplicatePaths,
          affectedImports
        )
      });
    }

    return fixes;
  }

  /**
   * Generate type standardization fixes (ID types, type comparisons)
   */
  generateTypeStandardizationFixes(errors: TypeScriptError[]): TypeFix[] {
    const fixes: TypeFix[] = [];

    for (const error of errors) {
      const sourceFile = this.project.getSourceFile(error.file);
      if (!sourceFile) continue;

      // Analyze the error to determine the fix
      if (error.category === ErrorCategory.ID_TYPE) {
        const fix = this.generateIdTypeFix(error, sourceFile);
        if (fix) fixes.push(fix);
      } else if (error.category === ErrorCategory.TYPE_COMPARISON) {
        const fix = this.generateTypeComparisonFix(error, sourceFile);
        if (fix) fixes.push(fix);
      }
    }

    return fixes;
  }

  /**
   * Generate interface completion fixes
   */
  generateInterfaceCompletionFixes(errors: TypeScriptError[]): InterfaceFix[] {
    const fixes: InterfaceFix[] = [];
    const processedInterfaces = new Set<string>();

    for (const error of errors) {
      // Extract interface name from error message
      const interfaceName = this.extractInterfaceName(error.message);
      if (!interfaceName) continue;

      const key = `${error.file}:${interfaceName}`;
      if (processedInterfaces.has(key)) continue;
      processedInterfaces.add(key);

      // Find the interface definition
      const interfaceFile = this.findInterfaceDefinition(interfaceName);
      if (!interfaceFile) continue;

      // Determine missing properties
      const missingProperties = this.determineMissingProperties(
        interfaceName,
        error,
        interfaceFile
      );

      if (missingProperties.length === 0) continue;

      fixes.push({
        id: `interface-completion-${fixes.length}`,
        category: ErrorCategory.INTERFACE_COMPLETION,
        description: `Add missing properties to ${interfaceName}`,
        interfaceName,
        file: interfaceFile,
        properties: missingProperties,
        apply: async () => this.applyInterfaceCompletionFix(
          interfaceFile,
          interfaceName,
          missingProperties
        )
      });
    }

    return fixes;
  }

  /**
   * Generate type safety fixes (explicit types, undefined safety, etc.)
   */
  private generateTypeSafetyFixes(errors: TypeScriptError[]): TypeFix[] {
    const fixes: TypeFix[] = [];

    for (const error of errors) {
      const sourceFile = this.project.getSourceFile(error.file);
      if (!sourceFile) continue;

      if (error.category === ErrorCategory.EXPLICIT_TYPES) {
        const fix = this.generateExplicitTypeFix(error, sourceFile);
        if (fix) fixes.push(fix);
      } else if (error.category === ErrorCategory.UNDEFINED_SAFETY) {
        const fix = this.generateUndefinedSafetyFix(error, sourceFile);
        if (fix) fixes.push(fix);
      }
    }

    return fixes;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Apply import path fix
   */
  private async applyImportPathFix(
    filePath: string,
    oldPath: string,
    newPath: string
  ): Promise<FixResult> {
    try {
      const sourceFile = this.project.getSourceFile(filePath);
      if (!sourceFile) {
        return {
          success: false,
          filesModified: [],
          errorsFixed: [],
          newErrors: [`Could not find source file: ${filePath}`]
        };
      }

      // Find and update the import declaration
      const imports = sourceFile.getImportDeclarations();
      let updated = false;

      for (const importDecl of imports) {
        if (importDecl.getModuleSpecifierValue() === oldPath) {
          importDecl.setModuleSpecifier(newPath);
          updated = true;
        }
      }

      if (updated) {
        await sourceFile.save();
        return {
          success: true,
          filesModified: [filePath],
          errorsFixed: [`Updated import from '${oldPath}' to '${newPath}'`],
          newErrors: []
        };
      }

      return {
        success: false,
        filesModified: [],
        errorsFixed: [],
        newErrors: [`Import '${oldPath}' not found in ${filePath}`]
      };
    } catch (error) {
      return {
        success: false,
        filesModified: [],
        errorsFixed: [],
        newErrors: [`Error applying fix: ${error}`]
      };
    }
  }

  /**
   * Apply type consolidation fix
   */
  private async applyTypeConsolidationFix(
    canonicalPath: string,
    canonicalName: string,
    duplicatePaths: string[],
    affectedImports: Array<{ file: string; oldImport: string; newImport: string }>
  ): Promise<FixResult> {
    const filesModified: string[] = [];
    const errorsFixed: string[] = [];
    const newErrors: string[] = [];

    try {
      // Update all imports to use canonical location
      for (const { file, oldImport, newImport } of affectedImports) {
        const sourceFile = this.project.getSourceFile(file);
        if (!sourceFile) continue;

        const imports = sourceFile.getImportDeclarations();
        for (const importDecl of imports) {
          if (importDecl.getModuleSpecifierValue() === oldImport) {
            importDecl.setModuleSpecifier(newImport);
            filesModified.push(file);
          }
        }

        await sourceFile.save();
      }

      // Remove duplicate type definitions
      for (const duplicatePath of duplicatePaths) {
        if (duplicatePath === canonicalPath) continue;

        const sourceFile = this.project.getSourceFile(duplicatePath);
        if (!sourceFile) continue;

        // Find and remove the type/interface
        const interfaces = sourceFile.getInterfaces();
        const typeAliases = sourceFile.getTypeAliases();

        for (const iface of interfaces) {
          if (iface.getName() === canonicalName) {
            iface.remove();
            filesModified.push(duplicatePath);
            errorsFixed.push(`Removed duplicate interface ${canonicalName} from ${duplicatePath}`);
          }
        }

        for (const typeAlias of typeAliases) {
          if (typeAlias.getName() === canonicalName) {
            typeAlias.remove();
            filesModified.push(duplicatePath);
            errorsFixed.push(`Removed duplicate type ${canonicalName} from ${duplicatePath}`);
          }
        }

        await sourceFile.save();
      }

      return {
        success: true,
        filesModified: Array.from(new Set(filesModified)),
        errorsFixed,
        newErrors
      };
    } catch (error) {
      return {
        success: false,
        filesModified,
        errorsFixed,
        newErrors: [`Error consolidating type: ${error}`]
      };
    }
  }

  /**
   * Apply interface completion fix
   */
  private async applyInterfaceCompletionFix(
    filePath: string,
    interfaceName: string,
    properties: PropertyDefinition[]
  ): Promise<FixResult> {
    try {
      const sourceFile = this.project.getSourceFile(filePath);
      if (!sourceFile) {
        return {
          success: false,
          filesModified: [],
          errorsFixed: [],
          newErrors: [`Could not find source file: ${filePath}`]
        };
      }

      // Find the interface
      const iface = sourceFile.getInterface(interfaceName);
      if (!iface) {
        return {
          success: false,
          filesModified: [],
          errorsFixed: [],
          newErrors: [`Interface ${interfaceName} not found in ${filePath}`]
        };
      }

      // Add missing properties
      for (const prop of properties) {
        iface.addProperty({
          name: prop.name,
          type: prop.type,
          hasQuestionToken: prop.optional,
          docs: prop.description ? [prop.description] : undefined
        });
      }

      await sourceFile.save();

      return {
        success: true,
        filesModified: [filePath],
        errorsFixed: [`Added ${properties.length} properties to ${interfaceName}`],
        newErrors: []
      };
    } catch (error) {
      return {
        success: false,
        filesModified: [],
        errorsFixed: [],
        newErrors: [`Error completing interface: ${error}`]
      };
    }
  }

  /**
   * Calculate relative import path
   */
  private calculateRelativeImportPath(fromFile: string, toFile: string): string {
    // Normalize paths to use forward slashes
    const normalizedFromFile = fromFile.replace(/\\/g, '/');
    const normalizedToFile = toFile.replace(/\\/g, '/');
    
    const fromDir = path.dirname(normalizedFromFile);
    let relativePath = path.relative(fromDir, normalizedToFile);
    
    // Remove file extension
    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Ensure relative path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    // Convert Windows paths to Unix-style
    relativePath = relativePath.replace(/\\/g, '/');
    
    return relativePath;
  }

  /**
   * Select canonical location based on preference
   */
  private selectCanonicalLocation(paths: string[]): string {
    const preference = this.config.typeStandardization.typeConsolidationPreference;
    
    for (const layer of preference) {
      const match = paths.find(p => p.includes(`/${layer}/`));
      if (match) return match;
    }
    
    return paths[0];
  }

  /**
   * Find all files importing a specific type
   */
  private findTypeImports(
    typeName: string,
    typePaths: string[]
  ): Array<{ file: string; oldImport: string; newImport: string }> {
    const imports: Array<{ file: string; oldImport: string; newImport: string }> = [];
    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const importDecls = sourceFile.getImportDeclarations();
      
      for (const importDecl of importDecls) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        // Check if importing from one of the duplicate paths
        if (typePaths.some(p => moduleSpecifier.includes(p) || p.includes(moduleSpecifier))) {
          const namedImports = importDecl.getNamedImports();
          const hasType = namedImports.some(ni => ni.getName() === typeName);
          
          if (hasType) {
            imports.push({
              file: sourceFile.getFilePath(),
              oldImport: moduleSpecifier,
              newImport: '' // Will be calculated later
            });
          }
        }
      }
    }

    return imports;
  }

  /**
   * Generate ID type fix
   */
  private generateIdTypeFix(error: TypeScriptError, sourceFile: SourceFile): TypeFix | null {
    // Determine canonical ID type
    const canonicalIdType = this.config.typeStandardization.canonicalIdType === 'auto'
      ? this.determineCanonicalIdType()
      : this.config.typeStandardization.canonicalIdType;

    return {
      id: `id-type-${error.file}-${error.line}`,
      category: ErrorCategory.ID_TYPE,
      description: `Standardize ID type to ${canonicalIdType}`,
      file: error.file,
      location: {
        line: error.line,
        column: error.column
      },
      oldType: canonicalIdType === 'string' ? 'number' : 'string',
      newType: canonicalIdType,
      apply: async () => this.applyIdTypeFix(error, sourceFile, canonicalIdType)
    };
  }

  /**
   * Generate type comparison fix
   */
  private generateTypeComparisonFix(error: TypeScriptError, sourceFile: SourceFile): TypeFix | null {
    return {
      id: `type-comparison-${error.file}-${error.line}`,
      category: ErrorCategory.TYPE_COMPARISON,
      description: `Fix type comparison in ${path.basename(error.file)}`,
      file: error.file,
      location: {
        line: error.line,
        column: error.column
      },
      oldType: 'incompatible',
      newType: 'compatible',
      apply: async () => this.applyTypeComparisonFix(error, sourceFile)
    };
  }

  /**
   * Generate explicit type fix
   */
  private generateExplicitTypeFix(error: TypeScriptError, sourceFile: SourceFile): TypeFix | null {
    return {
      id: `explicit-type-${error.file}-${error.line}`,
      category: ErrorCategory.EXPLICIT_TYPES,
      description: `Add explicit type annotation in ${path.basename(error.file)}`,
      file: error.file,
      location: {
        line: error.line,
        column: error.column
      },
      oldType: 'any',
      newType: 'explicit',
      apply: async () => this.applyExplicitTypeFix(error, sourceFile)
    };
  }

  /**
   * Generate undefined safety fix
   */
  private generateUndefinedSafetyFix(error: TypeScriptError, sourceFile: SourceFile): TypeFix | null {
    return {
      id: `undefined-safety-${error.file}-${error.line}`,
      category: ErrorCategory.UNDEFINED_SAFETY,
      description: `Add undefined safety check in ${path.basename(error.file)}`,
      file: error.file,
      location: {
        line: error.line,
        column: error.column
      },
      oldType: 'unsafe',
      newType: 'safe',
      apply: async () => this.applyUndefinedSafetyFix(error, sourceFile)
    };
  }

  /**
   * Apply ID type fix
   */
  private async applyIdTypeFix(
    error: TypeScriptError,
    sourceFile: SourceFile,
    canonicalIdType: string
  ): Promise<FixResult> {
    // This is a placeholder - actual implementation would need to:
    // 1. Find the specific location in the code
    // 2. Determine if it's a variable, parameter, or property
    // 3. Update the type annotation or add type conversion
    
    return {
      success: false,
      filesModified: [],
      errorsFixed: [],
      newErrors: ['ID type fix not yet implemented']
    };
  }

  /**
   * Apply type comparison fix
   */
  private async applyTypeComparisonFix(
    error: TypeScriptError,
    sourceFile: SourceFile
  ): Promise<FixResult> {
    // Placeholder implementation
    return {
      success: false,
      filesModified: [],
      errorsFixed: [],
      newErrors: ['Type comparison fix not yet implemented']
    };
  }

  /**
   * Apply explicit type fix
   */
  private async applyExplicitTypeFix(
    error: TypeScriptError,
    sourceFile: SourceFile
  ): Promise<FixResult> {
    // Placeholder implementation
    return {
      success: false,
      filesModified: [],
      errorsFixed: [],
      newErrors: ['Explicit type fix not yet implemented']
    };
  }

  /**
   * Apply undefined safety fix
   */
  private async applyUndefinedSafetyFix(
    error: TypeScriptError,
    sourceFile: SourceFile
  ): Promise<FixResult> {
    // Placeholder implementation
    return {
      success: false,
      filesModified: [],
      errorsFixed: [],
      newErrors: ['Undefined safety fix not yet implemented']
    };
  }

  /**
   * Determine canonical ID type by analyzing usage
   */
  private determineCanonicalIdType(): 'string' | 'number' {
    // Analyze all ID usages in the codebase
    const sourceFiles = this.project.getSourceFiles();
    let stringCount = 0;
    let numberCount = 0;

    for (const sourceFile of sourceFiles) {
      // Look for properties named 'id' or ending with 'Id'
      const interfaces = sourceFile.getInterfaces();
      const typeAliases = sourceFile.getTypeAliases();

      for (const iface of interfaces) {
        for (const prop of iface.getProperties()) {
          const name = prop.getName();
          if (name === 'id' || name.endsWith('Id')) {
            const type = prop.getType().getText();
            if (type === 'string') stringCount++;
            else if (type === 'number') numberCount++;
          }
        }
      }
    }

    // Return the more common type
    return stringCount >= numberCount ? 'string' : 'number';
  }

  /**
   * Extract interface name from error message
   */
  private extractInterfaceName(message: string): string | null {
    // Try to extract interface name from common error patterns
    const patterns = [
      /Property '.*' does not exist on type '(.+)'/,
      /Type '.*' is not assignable to type '(.+)'/,
      /Argument of type '.*' is not assignable to parameter of type '(.+)'/
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Find interface definition file
   */
  private findInterfaceDefinition(interfaceName: string): string | null {
    const sourceFiles = this.project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const iface = sourceFile.getInterface(interfaceName);
      if (iface) {
        return sourceFile.getFilePath();
      }
    }

    return null;
  }

  /**
   * Determine missing properties for an interface
   */
  private determineMissingProperties(
    interfaceName: string,
    error: TypeScriptError,
    interfaceFile: string
  ): PropertyDefinition[] {
    // Extract property name from error message
    const propertyMatch = error.message.match(/Property '(.+)' does not exist/);
    if (!propertyMatch) return [];

    const propertyName = propertyMatch[1];

    // For now, return a basic property definition
    // In a real implementation, we would analyze usage to determine the type
    return [{
      name: propertyName,
      type: 'unknown',
      optional: true,
      description: `Property added to fix TS${error.code}`
    }];
  }
}
