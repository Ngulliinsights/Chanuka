/**
 * TypeScript Program Loader
 * 
 * Handles loading and managing TypeScript programs using the TypeScript Compiler API
 * specifically configured for the Chanuka project structure.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { ProjectStructure, Configuration } from '../types/core';

export interface ProgramLoadResult {
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  sourceFiles: ts.SourceFile[];
  compilerOptions: ts.CompilerOptions;
  configPath: string;
}

export class TypeScriptProgramLoader {
  private projectRoot: string;
  private config: Configuration;

  constructor(projectRoot: string, config: Configuration) {
    this.projectRoot = projectRoot;
    this.config = config;
  }

  /**
   * Loads the TypeScript program for the Chanuka project
   */
  async loadProgram(): Promise<ProgramLoadResult> {
    const configPath = this.findTsConfig();
    const { compilerOptions, fileNames } = this.loadTsConfig(configPath);
    
    // Create TypeScript program
    const program = ts.createProgram({
      rootNames: fileNames,
      options: compilerOptions,
      configFileParsingDiagnostics: []
    });

    const typeChecker = program.getTypeChecker();
    const sourceFiles = program.getSourceFiles().filter(sf => 
      !sf.isDeclarationFile && 
      this.isProjectFile(sf.fileName)
    );

    return {
      program,
      typeChecker,
      sourceFiles,
      compilerOptions,
      configPath
    };
  }

  /**
   * Finds the TypeScript configuration file
   */
  private findTsConfig(): string {
    // Check if explicitly configured
    if (this.config.chanukaSettings.tsConfigPath) {
      const explicitPath = path.resolve(this.projectRoot, this.config.chanukaSettings.tsConfigPath);
      if (ts.sys.fileExists(explicitPath)) {
        return explicitPath;
      }
    }

    // Search for tsconfig.json in project root and common locations
    const searchPaths = [
      path.join(this.projectRoot, 'tsconfig.json'),
      path.join(this.projectRoot, 'tsconfig.server.json'),
      path.join(this.projectRoot, 'server', 'tsconfig.json'),
      path.join(this.projectRoot, 'client', 'tsconfig.json')
    ];

    for (const searchPath of searchPaths) {
      if (ts.sys.fileExists(searchPath)) {
        return searchPath;
      }
    }

    throw new Error(`Could not find tsconfig.json in project root: ${this.projectRoot}`);
  }

  /**
   * Loads and parses TypeScript configuration
   */
  private loadTsConfig(configPath: string): { compilerOptions: ts.CompilerOptions; fileNames: string[] } {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    
    if (configFile.error) {
      throw new Error(`Error reading tsconfig.json: ${ts.formatDiagnostic(configFile.error, {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getCanonicalFileName: fileName => fileName,
        getNewLine: () => ts.sys.newLine
      })}`);
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath),
      undefined,
      configPath
    );

    if (parsedConfig.errors.length > 0) {
      const errorMessages = parsedConfig.errors.map(error => 
        ts.formatDiagnostic(error, {
          getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
          getCanonicalFileName: fileName => fileName,
          getNewLine: () => ts.sys.newLine
        })
      ).join('\n');
      throw new Error(`Error parsing tsconfig.json: ${errorMessages}`);
    }

    // Enhance compiler options for better error detection
    const enhancedOptions: ts.CompilerOptions = {
      ...parsedConfig.options,
      // Ensure we get all possible diagnostics
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
      // Enable module resolution for Chanuka project structure
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      // Ensure we can resolve path mappings
      baseUrl: parsedConfig.options.baseUrl || this.projectRoot,
      paths: {
        ...parsedConfig.options.paths,
        '@shared/*': ['shared/*'],
        '@server/*': ['server/*'],
        '@client/*': ['client/*']
      }
    };

    return {
      compilerOptions: enhancedOptions,
      fileNames: parsedConfig.fileNames.filter(fileName => this.shouldIncludeFile(fileName))
    };
  }

  /**
   * Determines if a file should be included in processing
   */
  private shouldIncludeFile(fileName: string): boolean {
    const relativePath = path.relative(this.projectRoot, fileName);
    
    // Check include patterns
    if (this.config.includePatterns.length > 0) {
      const included = this.config.includePatterns.some(pattern => 
        this.matchesPattern(relativePath, pattern)
      );
      if (!included) return false;
    }

    // Check exclude patterns
    if (this.config.excludePatterns.length > 0) {
      const excluded = this.config.excludePatterns.some(pattern => 
        this.matchesPattern(relativePath, pattern)
      );
      if (excluded) return false;
    }

    // Default Chanuka project exclusions
    const defaultExclusions = [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
      'tests/**',
      'test/**',
      '__tests__/**'
    ];

    const isExcluded = defaultExclusions.some(pattern => 
      this.matchesPattern(relativePath, pattern)
    );

    return !isExcluded;
  }

  /**
   * Checks if a file is part of the project (not external dependencies)
   */
  private isProjectFile(fileName: string): boolean {
    const relativePath = path.relative(this.projectRoot, fileName);
    return !relativePath.startsWith('..') && 
           !relativePath.includes('node_modules') &&
           !fileName.includes('node_modules');
  }

  /**
   * Simple glob pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath.replace(/\\/g, '/'));
  }

  /**
   * Reloads the program with updated files
   */
  async reloadProgram(changedFiles?: string[]): Promise<ProgramLoadResult> {
    // For now, just reload the entire program
    // In the future, we could implement incremental compilation
    return this.loadProgram();
  }

  /**
   * Gets compiler options with Chanuka-specific enhancements
   */
  getEnhancedCompilerOptions(baseOptions: ts.CompilerOptions): ts.CompilerOptions {
    return {
      ...baseOptions,
      // Enable all strict checks for better error detection
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noImplicitThis: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
      
      // Module resolution for Chanuka project
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      
      // Path mapping for Chanuka aliases
      baseUrl: this.projectRoot,
      paths: {
        '@shared/*': ['shared/*'],
        '@server/*': ['server/*'],
        '@client/*': ['client/*'],
        ...baseOptions.paths
      }
    };
  }
}