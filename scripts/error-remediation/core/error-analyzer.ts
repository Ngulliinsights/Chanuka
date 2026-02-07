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
  FixPhase
} from '../types';
import { RemediationConfig } from '../config';

export class ErrorAnalyzer {
  private project: Project;
  private config: RemediationConfig;

  constructor(config: RemediationConfig) {
    this.config = config;
    this.project = new Project({
      tsConfigFilePath: config.tsconfigPath
    });
  }

  /**
   * Scan codebase for TypeScript errors
   */
  async analyzeErrors(): Promise<ErrorReport> {
    // Get all source files from the project
    const sourceFiles = this.project.getSourceFiles();
    
    // Collect all diagnostics
    const allDiagnostics: any[] = [];
    
    // Get pre-emit diagnostics for each source file
    for (const sourceFile of sourceFiles) {
      const compilerNode = sourceFile.compilerNode;
      const program = this.project.getProgram().compilerObject;
      
      // Get semantic diagnostics
      const semanticDiagnostics = program.getSemanticDiagnostics(compilerNode);
      allDiagnostics.push(...semanticDiagnostics);
      
      // Get syntactic diagnostics
      const syntacticDiagnostics = program.getSyntacticDiagnostics(compilerNode);
      allDiagnostics.push(...syntacticDiagnostics);
    }
    
    // Also get global diagnostics
    const program = this.project.getProgram().compilerObject;
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
}
