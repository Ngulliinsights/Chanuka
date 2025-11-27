import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ProjectStructure } from '@shared/types/core';
import { SchemaDefinitionParser } from './schema-parser';
import { DatabasePatternDetector } from './database-pattern-detector';

/**
 * Analyzes the Chanuka project structure to understand import patterns,
 * schema organization, and available utilities
 */
export class ProjectAnalyzer {
  private projectRoot: string;
  private schemaParser: SchemaDefinitionParser;
  private databaseDetector: DatabasePatternDetector;

  constructor(projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
    this.schemaParser = new SchemaDefinitionParser();
    this.databaseDetector = new DatabasePatternDetector(this.projectRoot);
  }

  /**
   * Performs a complete analysis of the Chanuka project structure
   */
  async analyzeProject(): Promise<ProjectStructure> {
    const tsConfigPath = this.findTsConfig();
    const compilerOptions = this.loadCompilerOptions(tsConfigPath);
    const sourceFiles = await this.findSourceFiles();

    return {
      rootPath: this.projectRoot,
      tsConfigPath,
      sourceFiles,
      excludePatterns: this.getDefaultExcludePatterns(),
      compilerOptions,
      schema: await this.analyzeSchemaStructure(),
      sharedCore: await this.analyzeSharedCoreStructure(),
      database: await this.analyzeDatabasePatterns(),
    };
  }

  /**
   * Finds the main TypeScript configuration file
   */
  private findTsConfig(): string {
    const possiblePaths = [
      path.join(this.projectRoot, 'tsconfig.json'),
      path.join(this.projectRoot, 'tsconfig.server.json'),
    ];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    throw new Error('No TypeScript configuration file found');
  }

  /**
   * Loads TypeScript compiler options from the config file
   */
  private loadCompilerOptions(tsConfigPath: string): any {
    try {
      const configContent = fs.readFileSync(tsConfigPath, 'utf-8');
      const config = JSON.parse(configContent);
      return config.compilerOptions || {};
    } catch (error) {
      console.warn(`Failed to load TypeScript config from ${tsConfigPath}:`, error);
      return {};
    }
  }

  /**
   * Finds all TypeScript source files in the project
   */
  private async findSourceFiles(): Promise<string[]> {
    const patterns = [
      'server/**/*.ts',
      'client/src/**/*.ts',
      'client/src/**/*.tsx',
      'shared/**/*.ts',
      'scripts/**/*.ts',
    ];

    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ];

    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: excludePatterns,
        absolute: true,
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  /**
   * Analyzes the schema structure to understand available tables and properties
   */
  private async analyzeSchemaStructure(): Promise<ProjectStructure['schema']> {
    const schemaDir = path.join(this.projectRoot, 'shared', 'schema');
    const tables: Record<string, string[]> = {};
    const importPaths: Record<string, string> = {};

    if (!fs.existsSync(schemaDir)) {
      console.warn('Schema directory not found at:', schemaDir);
      return { tables, importPaths };
    }

    try {
      const schemaFiles = await glob('*.ts', { 
        cwd: schemaDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts']
      });

      for (const file of schemaFiles) {
        const filePath = path.join(schemaDir, file);
        
        // Use the enhanced schema parser
        const parsedTables = this.schemaParser.parseSchemaFile(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract table name from filename
        const moduleName = path.basename(file, '.ts');
        
        // Get all exportable items using the enhanced parser
        const exportableItems = this.schemaParser.extractExportableItems(content);
        tables[moduleName] = exportableItems;

        // Set up import path
        importPaths[moduleName] = `@shared/schema/${moduleName}`;
        
        // Add individual table imports for parsed tables
        for (const table of parsedTables) {
          if (!tables[table.name]) {
            tables[table.name] = [table.name];
            importPaths[table.name] = `@shared/schema/${moduleName}`;
          }
        }
      }

      // Add common Drizzle ORM imports
      importPaths['drizzle-orm'] = 'drizzle-orm';
      importPaths['drizzle-helpers'] = 'drizzle-orm';
      
      // Add common Drizzle functions
      tables['drizzle-orm'] = ['eq', 'and', 'or', 'desc', 'asc', 'sql', 'count', 'sum', 'avg', 'max', 'min', 'like', 'ilike', 'not', 'isNull', 'isNotNull'];

    } catch (error) {
      console.warn('Error analyzing schema structure:', error);
    }

    return { tables, importPaths };
  }



  /**
   * Analyzes the shared/core structure to understand available utilities
   */
  private async analyzeSharedCoreStructure(): Promise<ProjectStructure['sharedCore']> {
    const sharedCoreDir = path.join(this.projectRoot, 'shared', 'core', 'src');
    const utilities: Record<string, string[]> = {};
    const importPaths: Record<string, string> = {};

    if (!fs.existsSync(sharedCoreDir)) {
      console.warn('Shared core directory not found at:', sharedCoreDir);
      return { utilities, importPaths };
    }

    try {
      // Find all TypeScript files in shared/core/src, excluding tests
      const coreFiles = await glob('**/*.ts', { 
        cwd: sharedCoreDir,
        ignore: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**']
      });

      for (const file of coreFiles) {
        const filePath = path.join(sharedCoreDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Create module key based on directory structure
        const moduleKey = this.getModuleKeyFromPath(file);

        // Extract exported items
        const exports = this.extractExports(content);
        if (exports.length > 0) {
          utilities[moduleKey] = exports;

          // Set up import path
          const relativePath = file.replace(/\.ts$/, '').replace(/\\/g, '/');
          importPaths[moduleKey] = `@shared/core/src/${relativePath}`;
        }
      }

      // Analyze index files for re-exports
      await this.analyzeIndexFiles(sharedCoreDir, utilities, importPaths);

      // Add known common utilities based on Chanuka project patterns
      this.addKnownSharedUtilities(utilities, importPaths);

    } catch (error) {
      console.warn('Error analyzing shared core structure:', error);
    }

    return { utilities, importPaths };
  }

  /**
   * Extracts module name from file path
   */
  private getModuleNameFromPath(filePath: string): string {
    return path.basename(filePath, '.ts');
  }

  /**
   * Creates a module key based on the directory structure
   */
  private getModuleKeyFromPath(filePath: string): string {
    const parts = filePath.replace(/\.ts$/, '').split(/[/\\]/);
    
    // For index files, use the parent directory name
    if (parts[parts.length - 1] === 'index') {
      return parts[parts.length - 2] || 'index';
    }
    
    // For nested files, create a meaningful key
    if (parts.length > 1) {
      return `${parts[0]}-${parts[parts.length - 1]}`;
    }
    
    return parts[0];
  }

  /**
   * Analyzes index files to understand re-exports
   */
  private async analyzeIndexFiles(
    sharedCoreDir: string, 
    utilities: Record<string, string[]>, 
    importPaths: Record<string, string>
  ): Promise<void> {
    const indexFiles = await glob('**/index.ts', { cwd: sharedCoreDir });
    
    for (const indexFile of indexFiles) {
      const filePath = path.join(sharedCoreDir, indexFile);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract re-exports
      const reExports = this.extractReExports(content);
      const dirName = path.dirname(indexFile);
      const moduleKey = dirName === '.' ? 'core' : dirName.replace(/[/\\]/g, '-');
      
      if (reExports.length > 0) {
        utilities[moduleKey] = [...(utilities[moduleKey] || []), ...reExports];
        importPaths[moduleKey] = `@shared/core/src${dirName === '.' ? '' : '/' + dirName.replace(/\\/g, '/')}`;
      }
    }
  }

  /**
   * Extracts re-exported items from index files
   */
  private extractReExports(content: string): string[] {
    const reExports: string[] = [];
    
    // Look for re-export patterns
    const patterns = [
      /export\s*{\s*([^}]+)\s*}\s*from/g, // export { item } from './module'
      /export\s*\*\s*from/g, // export * from './module'
      /export\s*{\s*([^}]+)\s*}/g, // export { item } (local re-export)
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const exports = match[1].split(',').map(exp => {
            const cleaned = exp.trim().split(' as ')[0].trim();
            return cleaned;
          });
          reExports.push(...exports);
        }
      }
    }

    return [...new Set(reExports)];
  }

  /**
   * Extracts exported items from a TypeScript file
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Look for various export patterns
    const patterns = [
      /export\s+(?:const|let|var)\s+(\w+)/g,
      /export\s+function\s+(\w+)/g,
      /export\s+class\s+(\w+)/g,
      /export\s+interface\s+(\w+)/g,
      /export\s+type\s+(\w+)/g,
      /export\s+enum\s+(\w+)/g,
      /export\s*{\s*([^}]+)\s*}/g, // Named exports
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (pattern.source.includes('{')) {
          // Handle named exports - split by comma and clean up
          const namedExports = match[1].split(',').map(exp => exp.trim().split(' as ')[0].trim());
          exports.push(...namedExports);
        } else {
          exports.push(match[1]);
        }
      }
    }

    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Adds known shared utilities based on Chanuka project patterns
   */
  private addKnownSharedUtilities(
    utilities: Record<string, string[]>,
    importPaths: Record<string, string>
  ): void {
    // Common utilities observed in the Chanuka project structure
    const knownUtilities = {
      // Observability utilities
      'observability-logging': ['logger', 'createLogger', 'LogLevel', 'LogContext'],
      'observability-metrics': ['metrics', 'MetricsCollector', 'PerformanceMetrics'],
      'observability-tracing': ['tracing', 'TraceContext', 'createTracer'],
      'observability-health': ['HealthChecker', 'HealthStatus'],
      'observability-error-management': ['ErrorHandler', 'ErrorBoundary', 'createErrorHandler'],
      
      // Caching utilities
      'caching': ['CacheManager', 'CacheFactory', 'cacheKeys'],
      'caching-decorators': ['Cache', 'CacheEvict', 'Cacheable'],
      'caching-interfaces': ['ICacheAdapter', 'CacheConfig'],
      
      // Validation utilities
      'validation': ['validateRequest', 'ValidationError', 'ValidationService'],
      'validation-middleware': ['validationMiddleware', 'createValidator'],
      'validation-schemas': ['ValidationSchema', 'SchemaValidator'],
      
      // Middleware utilities
      'middleware': ['MiddlewareFactory', 'createMiddleware'],
      'middleware-auth': ['authMiddleware', 'AuthContext'],
      'middleware-rate-limit': ['rateLimitMiddleware', 'RateLimiter'],
      'middleware-error-handler': ['errorHandlerMiddleware', 'ErrorMiddleware'],
      
      // Utility functions
      'utils-api': ['ApiSuccess', 'ApiError', 'ApiValidationError', 'ApiResponseWrapper'],
      'utils-response-helpers': ['createResponse', 'formatError', 'handleApiResponse'],
      'utils-async': ['asyncHandler', 'promiseTimeout', 'retryAsync'],
      'utils-security': ['sanitizeInput', 'validateToken', 'hashPassword'],
      'utils-performance': ['measurePerformance', 'PerformanceMonitor'],
      
      // Configuration utilities
      'config': ['ConfigManager', 'loadConfig', 'validateConfig'],
      
      // Rate limiting utilities
      'rate-limiting': ['RateLimiter', 'TokenBucket', 'SlidingWindow'],
      
      // Performance utilities
      'performance': ['PerformanceBudget', 'PerformanceMonitor', 'methodTiming'],
      
      // Types
      'types': ['ServiceTypes', 'AuthTypes', 'ValidationTypes'],
    };

    for (const [module, exports] of Object.entries(knownUtilities)) {
      if (!utilities[module]) {
        utilities[module] = exports;
        // Map to the most likely import path based on the module name
        const pathParts = module.split('-');
        if (pathParts.length > 1) {
          importPaths[module] = `@shared/core/src/${pathParts[0]}/${pathParts.slice(1).join('/')}`;
        } else {
          importPaths[module] = `@shared/core/src/${module}`;
        }
      }
    }
  }

  /**
   * Analyzes database connection patterns used in the project
   */
  private async analyzeDatabasePatterns(): Promise<ProjectStructure['database']> {
    try {
      const analysis = await this.databaseDetector.analyzePatterns();
      
      return {
        connectionPatterns: analysis.connectionPatterns,
        servicePatterns: analysis.servicePatterns,
        detectedUsages: analysis.detectedUsages,
        commonImports: analysis.commonImports,
      };
    } catch (error) {
      console.warn('Error analyzing database patterns:', error);
      
      // Fallback to default patterns
      return {
        connectionPatterns: [
          '@shared/database/connection',
          '../database/connection',
          '../../shared/database/connection',
        ],
        servicePatterns: [
          'databaseService',
          'db',
          'connection',
          'dbConnection',
        ],
        detectedUsages: [],
        commonImports: {},
      };
    }
  }

  /**
   * Returns default patterns to exclude from processing
   */
  private getDefaultExcludePatterns(): string[] {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.d.ts',
      '**/coverage/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.git/**',
      '**/.cache/**',
    ];
  }
}