/**
 * Error Analyzer
 * 
 * Analyzes TypeScript errors and categorizes them for remediation.
 */

import * as ts from 'typescript';
import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import {
  ErrorReport,
  TypeScriptError,
  ErrorCategory,
  Severity,
  ModuleRelocationMap,
  PathMigrationMap,
  FSDLocation,
  FixPhase,
  MigrationPattern
} from '../types';
import { RemediationConfig } from '../config';

export class ErrorAnalyzer {
  private project: Project | null = null;
  private config: RemediationConfig;

  constructor(config: RemediationConfig) {
    this.config = config;
  }

  /**
   * Get or create the ts-morph Project
   */
  private getProject(): Project {
    if (!this.project) {
      this.project = new Project({
        tsConfigFilePath: this.config.tsconfigPath
      });
    }
    return this.project;
  }

  /**
   * Scan codebase for TypeScript errors
   */
  async analyzeErrors(): Promise<ErrorReport> {
    // Get all source files from the project
    const sourceFiles = this.getProject().getSourceFiles();
    
    // Collect all diagnostics
    const allDiagnostics: any[] = [];
    
    // Get pre-emit diagnostics for each source file
    for (const sourceFile of sourceFiles) {
      const compilerNode = sourceFile.compilerNode;
      const program = this.getProject().getProgram().compilerObject;
      
      // Get semantic diagnostics
      const semanticDiagnostics = program.getSemanticDiagnostics(compilerNode);
      allDiagnostics.push(...semanticDiagnostics);
      
      // Get syntactic diagnostics
      const syntacticDiagnostics = program.getSyntacticDiagnostics(compilerNode);
      allDiagnostics.push(...syntacticDiagnostics);
    }
    
    // Also get global diagnostics
    const program = this.getProject().getProgram().compilerObject;
    const globalDiagnostics = program.getGlobalDiagnostics();
    allDiagnostics.push(...globalDiagnostics);
    
    const errors = this.parseDiagnostics(allDiagnostics);
    
    return {
      totalErrors: errors.length,
      errorsByCategory: this.groupByCategory(errors),
      errorsByFile: this.groupByFile(errors),
      errorsBySeverity: this.groupBySeverity(errors)
    };
  }

  /**
   * Group errors by category
   */
  categorizeErrors(errors: TypeScriptError[]): Map<ErrorCategory, TypeScriptError[]> {
    return this.groupByCategory(errors);
  }

  /**
   * Determine fix order based on dependencies
   */
  determineDependencyOrder(errorReport: ErrorReport): FixPhase[] {
    // Return phases in dependency order
    return [
      FixPhase.MODULE_LOCATION_DISCOVERY,
      FixPhase.IMPORT_PATH_UPDATES,
      FixPhase.TYPE_STANDARDIZATION,
      FixPhase.INTERFACE_COMPLETION,
      FixPhase.TYPE_SAFETY,
      FixPhase.IMPORT_CLEANUP_AND_VALIDATION
    ];
  }

  /**
   * Discover module relocations in FSD structure
   */
  async discoverModuleRelocations(missingModules: string[]): Promise<ModuleRelocationMap> {
    const relocations = new Map<string, FSDLocation>();
    const deletedModules: string[] = [];
    const consolidations = new Map<string, string[]>();

    for (const modulePath of missingModules) {
      // Extract module name from path
      const moduleName = this.extractModuleName(modulePath);
      
      // Search for the module in FSD structure
      const foundLocations = await this.searchFSDStructure(moduleName);
      
      if (foundLocations.length === 0) {
        // Module not found - likely deleted
        deletedModules.push(modulePath);
      } else if (foundLocations.length === 1) {
        // Single match - direct relocation
        relocations.set(modulePath, foundLocations[0]);
      } else {
        // Multiple matches - potential consolidation
        const bestMatch = this.selectBestMatch(moduleName, foundLocations);
        relocations.set(modulePath, bestMatch);
        
        // Track other locations as potential consolidation targets
        const otherPaths = foundLocations
          .filter((loc: FSDLocation) => loc.path !== bestMatch.path)
          .map((loc: FSDLocation) => loc.path);
        
        if (otherPaths.length > 0) {
          consolidations.set(bestMatch.path, otherPaths);
        }
      }
    }

    return {
      relocations,
      deletedModules,
      consolidations
    };
  }

  /**
   * Map old paths to new FSD paths
   */
  async mapOldPathsToFSD(oldPaths: string[]): Promise<PathMigrationMap> {
    const migrations = new Map<string, string>();
    const confidence = new Map<string, number>();
    const ambiguous = new Map<string, string[]>();

    for (const oldPath of oldPaths) {
      const moduleName = this.extractModuleName(oldPath);
      const foundLocations = await this.searchFSDStructure(moduleName);
      
      if (foundLocations.length === 0) {
        // No match found
        confidence.set(oldPath, 0);
      } else if (foundLocations.length === 1) {
        // Single match - high confidence
        migrations.set(oldPath, foundLocations[0].path);
        confidence.set(oldPath, 1.0);
      } else {
        // Multiple matches - calculate confidence for each
        const bestMatch = this.selectBestMatch(moduleName, foundLocations);
        migrations.set(oldPath, bestMatch.path);
        
        // Calculate confidence based on similarity
        const similarity = this.calculateSimilarity(moduleName, path.basename(bestMatch.path, path.extname(bestMatch.path)));
        confidence.set(oldPath, similarity);
        
        // Track ambiguous matches if confidence is below threshold
        if (similarity < this.config.moduleResolution.fuzzyMatchThreshold) {
          ambiguous.set(oldPath, foundLocations.map((loc: FSDLocation) => loc.path));
        }
      }
    }

    return {
      migrations,
      confidence,
      ambiguous
    };
  }

  private parseDiagnostics(diagnostics: any[]): TypeScriptError[] {
    return diagnostics.map(diagnostic => {
      const file = diagnostic.file?.fileName || 'unknown';
      const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start || 0);
      
      return {
        code: `TS${diagnostic.code}`,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        file,
        line: position?.line || 0,
        column: position?.character || 0,
        severity: this.mapSeverity(diagnostic.category),
        category: this.categorizeError(`TS${diagnostic.code}`, diagnostic.messageText.toString())
      };
    });
  }

  private mapSeverity(category: ts.DiagnosticCategory): Severity {
    switch (category) {
      case ts.DiagnosticCategory.Error:
        return Severity.CRITICAL;
      case ts.DiagnosticCategory.Warning:
        return Severity.MEDIUM;
      default:
        return Severity.LOW;
    }
  }

  private categorizeError(code: string, message: string): ErrorCategory {
    // Categorize based on error code
    if (code === 'TS2307') return ErrorCategory.MODULE_RESOLUTION;
    if (['TS2305', 'TS2724', 'TS2614'].includes(code)) return ErrorCategory.EXPORT_PATH;
    if (code === 'TS2367' && message.includes('id')) return ErrorCategory.ID_TYPE;
    if (['TS2339', 'TS2353'].includes(code)) return ErrorCategory.INTERFACE_COMPLETION;
    if (['TS7006', 'TS7053'].includes(code)) return ErrorCategory.EXPLICIT_TYPES;
    if (code === 'TS2367') return ErrorCategory.TYPE_COMPARISON;
    if (code === 'TS2430') return ErrorCategory.INTERFACE_COMPATIBILITY;
    if (code === 'TS2308') return ErrorCategory.EXPORT_DISAMBIGUATION;
    if (code === 'TS18048') return ErrorCategory.UNDEFINED_SAFETY;
    
    return ErrorCategory.TYPE_ASSERTION;
  }

  private groupByCategory(errors: TypeScriptError[]): Map<ErrorCategory, TypeScriptError[]> {
    const grouped = new Map<ErrorCategory, TypeScriptError[]>();
    
    for (const error of errors) {
      const category = error.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(error);
    }
    
    return grouped;
  }

  private groupByFile(errors: TypeScriptError[]): Map<string, TypeScriptError[]> {
    const grouped = new Map<string, TypeScriptError[]>();
    
    for (const error of errors) {
      if (!grouped.has(error.file)) {
        grouped.set(error.file, []);
      }
      grouped.get(error.file)!.push(error);
    }
    
    return grouped;
  }

  private groupBySeverity(errors: TypeScriptError[]): Map<Severity, TypeScriptError[]> {
    const grouped = new Map<Severity, TypeScriptError[]>();
    
    for (const error of errors) {
      if (!grouped.has(error.severity)) {
        grouped.set(error.severity, []);
      }
      grouped.get(error.severity)!.push(error);
    }
    
    return grouped;
  }

  /**
   * Extract module name from import path
   */
  private extractModuleName(modulePath: string): string {
    // Handle path aliases like @client/config/gestures
    if (modulePath.startsWith('@')) {
      const parts = modulePath.split('/');
      return parts[parts.length - 1];
    }
    
    // Handle relative paths like ../utils/logger
    const basename = path.basename(modulePath);
    return basename.replace(/\.(ts|tsx|js|jsx)$/, '');
  }

  /**
   * Search FSD structure for a module by name
   */
  private async searchFSDStructure(moduleName: string): Promise<FSDLocation[]> {
    const locations: FSDLocation[] = [];
    const threshold = this.config.moduleResolution.fuzzyMatchThreshold;
    
    // Search in each FSD layer
    for (const [layer, layerPath] of Object.entries(this.config.fsdLayers)) {
      const foundPaths = await this.searchDirectory(
        layerPath,
        moduleName,
        threshold,
        this.config.moduleResolution.searchDepth
      );
      
      for (const foundPath of foundPaths) {
        locations.push(this.createFSDLocation(foundPath, layer as FSDLocation['layer']));
      }
    }
    
    return locations;
  }

  /**
   * Recursively search directory for files matching module name
   */
  private async searchDirectory(
    dirPath: string,
    moduleName: string,
    threshold: number,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<string[]> {
    const results: string[] = [];
    
    if (currentDepth > maxDepth) {
      return results;
    }
    
    try {
      if (!fs.existsSync(dirPath)) {
        return results;
      }
      
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          
          // Recursively search subdirectories
          const subResults = await this.searchDirectory(
            fullPath,
            moduleName,
            threshold,
            maxDepth,
            currentDepth + 1
          );
          results.push(...subResults);
        } else if (entry.isFile()) {
          // Check if file name matches module name
          const fileName = path.basename(entry.name, path.extname(entry.name));
          const similarity = this.calculateSimilarity(moduleName, fileName);
          
          if (similarity >= threshold) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore errors (e.g., permission denied)
      console.warn(`Warning: Could not search directory ${dirPath}:`, error);
    }
    
    return results;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a value between 0 and 1, where 1 is identical
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1.0;
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str1.length][str2.length];
  }

  /**
   * Create FSDLocation from file path and layer
   */
  private createFSDLocation(filePath: string, layer: FSDLocation['layer']): FSDLocation {
    const location: FSDLocation = {
      path: filePath,
      layer
    };
    
    // Extract feature and segment for features layer
    if (layer === 'features') {
      const parts = filePath.split(path.sep);
      const featuresIndex = parts.findIndex(p => p === 'features');
      
      if (featuresIndex >= 0 && featuresIndex + 1 < parts.length) {
        location.feature = parts[featuresIndex + 1];
        
        if (featuresIndex + 2 < parts.length) {
          location.segment = parts[featuresIndex + 2];
        }
      }
    }
    
    // Extract segment for other layers
    if (layer !== 'features' && layer !== 'shared') {
      const parts = filePath.split(path.sep);
      const layerIndex = parts.findIndex(p => p === layer);
      
      if (layerIndex >= 0 && layerIndex + 1 < parts.length) {
        location.segment = parts[layerIndex + 1];
      }
    }
    
    return location;
  }

  /**
   * Select best match from multiple locations
   */
  private selectBestMatch(moduleName: string, locations: FSDLocation[]): FSDLocation {
    // Prefer locations based on type consolidation preference
    const preference = this.config.typeStandardization.typeConsolidationPreference;
    
    for (const preferredLayer of preference) {
      const match = locations.find(loc => loc.layer === preferredLayer);
      if (match) {
        return match;
      }
    }
    
    // If no preference match, return the first location with highest similarity
    let bestMatch = locations[0];
    let bestSimilarity = this.calculateSimilarity(
      moduleName,
      path.basename(bestMatch.path, path.extname(bestMatch.path))
    );
    
    for (const location of locations.slice(1)) {
      const similarity = this.calculateSimilarity(
        moduleName,
        path.basename(location.path, path.extname(location.path))
      );
      
      if (similarity > bestSimilarity) {
        bestMatch = location;
        bestSimilarity = similarity;
      }
    }
    
    return bestMatch;
  }

  /**
   * Analyze ID usage patterns across codebase
   * Returns the canonical ID type based on 60%+ usage threshold
   */
  analyzeIdTypes(idUsages?: Array<{ file: string; idType: 'string' | 'number'; occurrences: number }>): {
    canonicalType: 'string' | 'number' | null;
    stringOccurrences: number;
    numberOccurrences: number;
    totalOccurrences: number;
    stringFrequency: number;
    numberFrequency: number;
    usagesByFile: Map<string, { string: number; number: number }>;
  } {
    // If test data is provided, use it
    if (idUsages) {
      const totalOccurrences = idUsages.reduce((sum, u) => sum + u.occurrences, 0);
      const stringOccurrences = idUsages
        .filter(u => u.idType === 'string')
        .reduce((sum, u) => sum + u.occurrences, 0);
      const numberOccurrences = totalOccurrences - stringOccurrences;
      
      const stringFreq = totalOccurrences > 0 ? stringOccurrences / totalOccurrences : 0;
      const numberFreq = totalOccurrences > 0 ? numberOccurrences / totalOccurrences : 0;
      
      let canonicalType: 'string' | 'number' | null = null;
      if (stringFreq >= 0.6) {
        canonicalType = 'string';
      } else if (numberFreq >= 0.6) {
        canonicalType = 'number';
      }
      
      const usagesByFile = new Map<string, { string: number; number: number }>();
      for (const usage of idUsages) {
        if (!usagesByFile.has(usage.file)) {
          usagesByFile.set(usage.file, { string: 0, number: 0 });
        }
        const fileUsage = usagesByFile.get(usage.file)!;
        if (usage.idType === 'string') {
          fileUsage.string += usage.occurrences;
        } else {
          fileUsage.number += usage.occurrences;
        }
      }
      
      return {
        canonicalType,
        stringOccurrences,
        numberOccurrences,
        totalOccurrences,
        stringFrequency: stringFreq,
        numberFrequency: numberFreq,
        usagesByFile
      };
    }
    
    // Analyze actual codebase
    let stringOccurrences = 0;
    let numberOccurrences = 0;
    const usagesByFile = new Map<string, { string: number; number: number }>();
    
    const sourceFiles = this.getProject().getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      
      // Skip test files and node_modules
      if (filePath.includes('node_modules') || 
          filePath.includes('.test.') || 
          filePath.includes('.spec.')) {
        continue;
      }
      
      const fileUsage = { string: 0, number: 0 };
      
      // Find all interface and type declarations with 'id' properties
      const interfaces = sourceFile.getInterfaces();
      for (const iface of interfaces) {
        const idProp = iface.getProperty('id');
        if (idProp) {
          const typeNode = idProp.getTypeNode();
          if (typeNode) {
            const typeText = typeNode.getText();
            if (typeText === 'string' || typeText.includes('string')) {
              fileUsage.string++;
              stringOccurrences++;
            } else if (typeText === 'number' || typeText.includes('number')) {
              fileUsage.number++;
              numberOccurrences++;
            }
          }
        }
      }
      
      // Find all type aliases with 'id' in the name
      const typeAliases = sourceFile.getTypeAliases();
      for (const typeAlias of typeAliases) {
        const name = typeAlias.getName().toLowerCase();
        if (name.includes('id')) {
          const typeNode = typeAlias.getTypeNode();
          if (typeNode) {
            const typeText = typeNode.getText();
            if (typeText === 'string' || typeText.includes('string')) {
              fileUsage.string++;
              stringOccurrences++;
            } else if (typeText === 'number' || typeText.includes('number')) {
              fileUsage.number++;
              numberOccurrences++;
            }
          }
        }
      }
      
      if (fileUsage.string > 0 || fileUsage.number > 0) {
        usagesByFile.set(filePath, fileUsage);
      }
    }
    
    const totalOccurrences = stringOccurrences + numberOccurrences;
    const stringFreq = totalOccurrences > 0 ? stringOccurrences / totalOccurrences : 0;
    const numberFreq = totalOccurrences > 0 ? numberOccurrences / totalOccurrences : 0;
    
    let canonicalType: 'string' | 'number' | null = null;
    if (stringFreq >= 0.6) {
      canonicalType = 'string';
    } else if (numberFreq >= 0.6) {
      canonicalType = 'number';
    }
    
    return {
      canonicalType,
      stringOccurrences,
      numberOccurrences,
      totalOccurrences,
      stringFrequency: stringFreq,
      numberFrequency: numberFreq,
      usagesByFile
    };
  }

  /**
   * Generate ID type standardization fixes
   */
  generateIdTypeStandardizationFixes(
    canonicalType: 'string' | 'number',
    usagesByFile: Map<string, { string: number; number: number }>
  ): Array<{
    file: string;
    conversionsNeeded: number;
    fromType: 'string' | 'number';
    toType: 'string' | 'number';
  }> {
    const fixes: Array<{
      file: string;
      conversionsNeeded: number;
      fromType: 'string' | 'number';
      toType: 'string' | 'number';
    }> = [];
    
    for (const [file, usage] of usagesByFile.entries()) {
      if (canonicalType === 'string' && usage.number > 0) {
        fixes.push({
          file,
          conversionsNeeded: usage.number,
          fromType: 'number',
          toType: 'string'
        });
      } else if (canonicalType === 'number' && usage.string > 0) {
        fixes.push({
          file,
          conversionsNeeded: usage.string,
          fromType: 'string',
          toType: 'number'
        });
      }
    }
    
    return fixes;
  }

  /**
   * Create migration pattern for ID type standardization
   */
  createIdTypeMigrationPattern(
    fromType: 'string' | 'number',
    toType: 'string' | 'number'
  ): MigrationPattern {
    if (fromType === 'number' && toType === 'string') {
      return {
        name: 'ID Type Standardization: Number to String',
        description: 'Convert number IDs to string IDs for consistency',
        before: `interface Bill {
  id: number;
}
const billId: number = 123;
const bill = bills.find(b => b.id === billId);`,
        after: `interface Bill {
  id: string;
}
const billId: string = "123";
const bill = bills.find(b => b.id === billId);`,
        automated: true
      };
    } else {
      return {
        name: 'ID Type Standardization: String to Number',
        description: 'Convert string IDs to number IDs for consistency',
        before: `interface Bill {
  id: string;
}
const billId: string = "123";
const bill = bills.find(b => b.id === billId);`,
        after: `interface Bill {
  id: number;
}
const billId: number = 123;
const bill = bills.find(b => b.id === Number(billId));`,
        automated: true
      };
    }
  }

  /**
   * Identify duplicate type definitions across the codebase
   * Returns a map of type name to array of file paths where it's defined
   */
  identifyDuplicateTypes(typeNames?: string[]): Map<string, string[]> {
    const duplicates = new Map<string, string[]>();
    
    // If specific type names are provided, search for those
    const targetTypes = typeNames || [
      'DashboardPreferences',
      'UserDashboardPreferences',
      'BillAnalytics',
      'DashboardData',
      'PerformanceMetrics',
      'ApiResponse',
      'ValidationResult',
      'QueryParams'
    ];
    
    const sourceFiles = this.getProject().getSourceFiles();
    
    for (const typeName of targetTypes) {
      const locations: string[] = [];
      
      for (const sourceFile of sourceFiles) {
        const filePath = sourceFile.getFilePath();
        
        // Skip test files and node_modules
        if (filePath.includes('node_modules') || 
            filePath.includes('.test.') || 
            filePath.includes('.spec.')) {
          continue;
        }
        
        // Check for interface declarations
        const interfaces = sourceFile.getInterfaces();
        for (const iface of interfaces) {
          if (iface.getName() === typeName) {
            locations.push(filePath);
            break;
          }
        }
        
        // Check for type alias declarations
        const typeAliases = sourceFile.getTypeAliases();
        for (const typeAlias of typeAliases) {
          if (typeAlias.getName() === typeName) {
            locations.push(filePath);
            break;
          }
        }
      }
      
      // Only add to duplicates if found in multiple locations
      if (locations.length > 1) {
        duplicates.set(typeName, locations);
      }
    }
    
    return duplicates;
  }

  /**
   * Determine canonical location for a type based on FSD preferences
   * Preference order: shared/types > client/src/lib/types > client/src/core
   */
  determineCanonicalLocation(
    typeName: string,
    locations: string[]
  ): string {
    const preference = this.config.typeStandardization.typeConsolidationPreference;
    
    // Check each preference level
    for (const preferredLayer of preference) {
      for (const location of locations) {
        if (location.includes(`${preferredLayer}/types`) || 
            location.includes(`${preferredLayer}\\types`)) {
          return location;
        }
      }
    }
    
    // If no preference match, return the first location in shared
    for (const location of locations) {
      if (location.includes('shared/') || location.includes('shared\\')) {
        return location;
      }
    }
    
    // If no shared location, return first location in lib
    for (const location of locations) {
      if (location.includes('/lib/') || location.includes('\\lib\\')) {
        return location;
      }
    }
    
    // If no lib location, return first location in core
    for (const location of locations) {
      if (location.includes('/core/') || location.includes('\\core\\')) {
        return location;
      }
    }
    
    // Fallback to first location
    return locations[0];
  }

  /**
   * Generate type consolidation fixes
   * Returns information about which types to consolidate and where
   */
  generateTypeConsolidationPlan(): Array<{
    typeName: string;
    canonicalLocation: string;
    duplicateLocations: string[];
    affectedImports: Array<{
      file: string;
      currentImportPath: string;
      newImportPath: string;
    }>;
  }> {
    const plan: Array<{
      typeName: string;
      canonicalLocation: string;
      duplicateLocations: string[];
      affectedImports: Array<{
        file: string;
        currentImportPath: string;
        newImportPath: string;
      }>;
    }> = [];
    
    // Identify duplicate types
    const duplicates = this.identifyDuplicateTypes();
    
    // For each duplicate type, create a consolidation plan
    for (const [typeName, locations] of duplicates.entries()) {
      const canonicalLocation = this.determineCanonicalLocation(typeName, locations);
      const duplicateLocations = locations.filter(loc => loc !== canonicalLocation);
      
      // Find all files that import this type from duplicate locations
      const affectedImports = this.findAffectedImports(typeName, duplicateLocations);
      
      plan.push({
        typeName,
        canonicalLocation,
        duplicateLocations,
        affectedImports
      });
    }
    
    return plan;
  }

  /**
   * Find all files that import a type from specific locations
   */
  private findAffectedImports(
    typeName: string,
    sourceLocations: string[]
  ): Array<{
    file: string;
    currentImportPath: string;
    newImportPath: string;
  }> {
    const affectedImports: Array<{
      file: string;
      currentImportPath: string;
      newImportPath: string;
    }> = [];
    
    const sourceFiles = this.getProject().getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      
      // Skip test files and node_modules
      if (filePath.includes('node_modules') || 
          filePath.includes('.test.') || 
          filePath.includes('.spec.')) {
        continue;
      }
      
      // Check all import declarations
      const importDeclarations = sourceFile.getImportDeclarations();
      
      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        
        // Check if this import is from one of the duplicate locations
        for (const sourceLocation of sourceLocations) {
          // Convert file path to import path
          const importPath = this.filePathToImportPath(sourceLocation);
          
          if (moduleSpecifier.includes(importPath) || 
              this.resolveImportPath(filePath, moduleSpecifier) === sourceLocation) {
            
            // Check if this import includes the type we're looking for
            const namedImports = importDecl.getNamedImports();
            const hasType = namedImports.some(ni => ni.getName() === typeName);
            
            if (hasType) {
              affectedImports.push({
                file: filePath,
                currentImportPath: moduleSpecifier,
                newImportPath: '' // Will be filled in during consolidation
              });
            }
          }
        }
      }
    }
    
    return affectedImports;
  }

  /**
   * Convert file path to import path
   */
  private filePathToImportPath(filePath: string): string {
    // Remove file extension
    let importPath = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Convert to relative path from client root
    if (importPath.includes('client/src/')) {
      importPath = importPath.substring(importPath.indexOf('client/src/') + 'client/src/'.length);
      importPath = '@client/' + importPath;
    } else if (importPath.includes('shared/')) {
      importPath = importPath.substring(importPath.indexOf('shared/'));
      importPath = '@/' + importPath;
    }
    
    // Normalize path separators
    importPath = importPath.replace(/\\/g, '/');
    
    return importPath;
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string): string {
    // This is a simplified implementation
    // In a real implementation, this would use TypeScript's module resolution
    
    if (importPath.startsWith('@client/')) {
      const relativePath = importPath.replace('@client/', '');
      return path.join(this.config.clientRoot, 'src', relativePath);
    } else if (importPath.startsWith('@/')) {
      const relativePath = importPath.replace('@/', '');
      return path.join(this.config.clientRoot, '..', relativePath);
    } else if (importPath.startsWith('.')) {
      return path.resolve(path.dirname(fromFile), importPath);
    }
    
    return importPath;
  }

  /**
   * Identify pagination interface inconsistencies
   * Returns files that use non-standard pagination interfaces
   */
  identifyPaginationInconsistencies(): Array<{
    file: string;
    interfaceName: string;
    properties: string[];
    isStandard: boolean;
  }> {
    const inconsistencies: Array<{
      file: string;
      interfaceName: string;
      properties: string[];
      isStandard: boolean;
    }> = [];
    
    const sourceFiles = this.getProject().getSourceFiles();
    
    // Standard pagination property names
    const standardParamProps = ['page', 'pageSize', 'total'];
    const standardResponseProps = ['data', 'pagination'];
    
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      
      // Skip test files and node_modules
      if (filePath.includes('node_modules') || 
          filePath.includes('.test.') || 
          filePath.includes('.spec.')) {
        continue;
      }
      
      // Check all interfaces
      const interfaces = sourceFile.getInterfaces();
      
      for (const iface of interfaces) {
        const name = iface.getName();
        
        // Check if this looks like a pagination interface
        if (name.toLowerCase().includes('paginat') || 
            name.toLowerCase().includes('page')) {
          
          const properties = iface.getProperties().map(p => p.getName());
          
          // Check if it matches standard pagination params
          const hasStandardParams = standardParamProps.every(prop => 
            properties.includes(prop)
          );
          
          // Check if it matches standard pagination response
          const hasStandardResponse = standardResponseProps.every(prop => 
            properties.includes(prop)
          );
          
          const isStandard = hasStandardParams || hasStandardResponse;
          
          if (!isStandard) {
            inconsistencies.push({
              file: filePath,
              interfaceName: name,
              properties,
              isStandard: false
            });
          }
        }
      }
    }
    
    return inconsistencies;
  }

  /**
   * Generate canonical pagination interfaces
   */
  generateCanonicalPaginationInterfaces(): {
    PaginationParams: string;
    PaginatedResponse: string;
  } {
    return {
      PaginationParams: `export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}`,
      PaginatedResponse: `export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}`
    };
  }

  /**
   * Identify HTTP status code type inconsistencies
   * Returns files that use non-standard HttpStatusCode types
   */
  identifyHttpStatusCodeInconsistencies(): Array<{
    file: string;
    typeName: string;
    currentType: string;
    shouldBeType: string;
  }> {
    const inconsistencies: Array<{
      file: string;
      typeName: string;
      currentType: string;
      shouldBeType: string;
    }> = [];
    
    const sourceFiles = this.getProject().getSourceFiles();
    
    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      
      // Skip test files and node_modules
      if (filePath.includes('node_modules') || 
          filePath.includes('.test.') || 
          filePath.includes('.spec.')) {
        continue;
      }
      
      // Check all type aliases
      const typeAliases = sourceFile.getTypeAliases();
      
      for (const typeAlias of typeAliases) {
        const name = typeAlias.getName();
        
        // Check if this is an HTTP status code type
        if (name.toLowerCase().includes('httpstatus') || 
            name.toLowerCase().includes('statuscode')) {
          
          const typeNode = typeAlias.getTypeNode();
          if (typeNode) {
            const typeText = typeNode.getText();
            
            // Check if it's not using number type
            if (typeText !== 'number' && !typeText.includes('number')) {
              inconsistencies.push({
                file: filePath,
                typeName: name,
                currentType: typeText,
                shouldBeType: 'number'
              });
            }
          }
        }
      }
      
      // Check interfaces with status code properties
      const interfaces = sourceFile.getInterfaces();
      
      for (const iface of interfaces) {
        const statusProp = iface.getProperty('statusCode') || 
                          iface.getProperty('status');
        
        if (statusProp) {
          const typeNode = statusProp.getTypeNode();
          if (typeNode) {
            const typeText = typeNode.getText();
            
            // Check if it's not using number type
            if (typeText !== 'number' && !typeText.includes('number')) {
              inconsistencies.push({
                file: filePath,
                typeName: `${iface.getName()}.${statusProp.getName()}`,
                currentType: typeText,
                shouldBeType: 'number'
              });
            }
          }
        }
      }
    }
    
    return inconsistencies;
  }

  /**
   * Generate canonical HTTP status code type
   */
  generateCanonicalHttpStatusCodeType(): string {
    return `export type HttpStatusCode = number;`;
  }
}
