import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * Represents a detected database connection pattern
 */
export interface DatabaseConnectionPattern {
  type: 'import' | 'usage' | 'service';
  pattern: string;
  filePath: string;
  lineNumber: number;
  context: string;
}

/**
 * Represents database service usage information
 */
export interface DatabaseServiceUsage {
  serviceName: string;
  methods: string[];
  importPath: string;
  usageCount: number;
  files: string[];
}

/**
 * Detects database connection patterns and service usage throughout the codebase
 */
export class DatabasePatternDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyzes database patterns across the entire project
   */
  async analyzePatterns(): Promise<{
    connectionPatterns: string[];
    servicePatterns: string[];
    detectedUsages: DatabaseServiceUsage[];
    commonImports: Record<string, string>;
  }> {
    const connectionPatterns = new Set<string>();
    const servicePatterns = new Set<string>();
    const serviceUsages = new Map<string, DatabaseServiceUsage>();
    const commonImports: Record<string, string> = {};

    // Find all TypeScript files
    const files = await glob('**/*.ts', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      absolute: true,
    });

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(this.projectRoot, file);

        // Detect connection patterns
        this.detectConnectionPatterns(content, relativePath, connectionPatterns);

        // Detect service patterns
        this.detectServicePatterns(content, relativePath, servicePatterns, serviceUsages);

        // Detect common imports
        this.detectCommonImports(content, commonImports);

      } catch (error) {
        console.warn(`Error analyzing file ${file}:`, error);
      }
    }

    return {
      connectionPatterns: Array.from(connectionPatterns),
      servicePatterns: Array.from(servicePatterns),
      detectedUsages: Array.from(serviceUsages.values()),
      commonImports,
    };
  }

  /**
   * Detects database connection import patterns
   */
  private detectConnectionPatterns(content: string, filePath: string, patterns: Set<string>): void {
    // Database connection import patterns
    const connectionImportPatterns = [
      /@shared\/database\/connection/g,
      /\.\.\/.*database.*connection/g,
      /\.\.\/.*shared.*database/g,
      /from\s+['"`].*database.*['"`]/g,
      /import.*database.*from/g,
      /require\(['"`].*database.*['"`]\)/g,
    ];

    for (const pattern of connectionImportPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => patterns.add(match.replace(/['"]/g, '')));
      }
    }

    // Drizzle ORM specific patterns
    const drizzlePatterns = [
      /from\s+['"`]drizzle-orm['"]/g,
      /import.*\{.*(?:eq|and|or|desc|asc|sql|count|sum|avg|max|min).*\}.*from\s+['"`]drizzle-orm['"]/g,
      /drizzle\(.*\)/g,
    ];

    for (const pattern of drizzlePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => patterns.add(match));
      }
    }
  }

  /**
   * Detects database service usage patterns
   */
  private detectServicePatterns(
    content: string, 
    filePath: string, 
    patterns: Set<string>,
    serviceUsages: Map<string, DatabaseServiceUsage>
  ): void {
    // Common service variable names
    const serviceVariablePatterns = [
      /\b(db|database|connection|dbConnection|databaseService)\b/g,
      /\b(client|dbClient|pgClient|mysqlClient)\b/g,
      /\b(pool|connectionPool|dbPool)\b/g,
    ];

    for (const pattern of serviceVariablePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => patterns.add(match));
      }
    }

    // Detect service method calls
    const methodCallPatterns = [
      /\b(?:db|database|connection|databaseService)\.(\w+)\(/g,
      /\b(?:client|dbClient)\.(\w+)\(/g,
      /\bawait\s+(?:db|database|connection)\.(\w+)\(/g,
    ];

    for (const pattern of methodCallPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const serviceName = match[0].split('.')[0];
        const methodName = match[1];

        if (!serviceUsages.has(serviceName)) {
          serviceUsages.set(serviceName, {
            serviceName,
            methods: [],
            importPath: this.inferImportPath(content, serviceName),
            usageCount: 0,
            files: [],
          });
        }

        const usage = serviceUsages.get(serviceName)!;
        if (!usage.methods.includes(methodName)) {
          usage.methods.push(methodName);
        }
        usage.usageCount++;
        if (!usage.files.includes(filePath)) {
          usage.files.push(filePath);
        }
      }
    }

    // Detect Drizzle ORM query patterns
    const drizzleQueryPatterns = [
      /\.select\(\)/g,
      /\.insert\(\)/g,
      /\.update\(\)/g,
      /\.delete\(\)/g,
      /\.from\(/g,
      /\.where\(/g,
      /\.orderBy\(/g,
      /\.limit\(/g,
      /\.offset\(/g,
    ];

    for (const pattern of drizzleQueryPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => patterns.add(match.replace(/[()]/g, '')));
      }
    }
  }

  /**
   * Detects common database-related imports
   */
  private detectCommonImports(content: string, commonImports: Record<string, string>): void {
    // Extract import statements
    const importRegex = /import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const [, namedImports, namespaceImport, defaultImport, modulePath] = match;
      
      // Check if it's a database-related import
      if (this.isDatabaseRelatedImport(modulePath)) {
        if (namedImports) {
          const imports = namedImports.split(',').map(imp => imp.trim());
          imports.forEach(imp => {
            commonImports[imp] = modulePath;
          });
        } else if (namespaceImport) {
          commonImports[namespaceImport] = modulePath;
        } else if (defaultImport) {
          commonImports[defaultImport] = modulePath;
        }
      }
    }
  }

  /**
   * Checks if an import path is database-related
   */
  private isDatabaseRelatedImport(modulePath: string): boolean {
    const databaseKeywords = [
      'database',
      'drizzle',
      'pg',
      'mysql',
      'sqlite',
      'connection',
      'pool',
      'client',
      'orm',
    ];

    return databaseKeywords.some(keyword => 
      modulePath.toLowerCase().includes(keyword)
    );
  }

  /**
   * Infers the import path for a service based on the file content
   */
  private inferImportPath(content: string, serviceName: string): string {
    // Look for import statements that might contain the service
    const importRegex = new RegExp(`import\\s+(?:\\{[^}]*${serviceName}[^}]*\\}|\\*\\s+as\\s+${serviceName}|${serviceName})\\s+from\\s+['"\`]([^'"\`]+)['"\`]`, 'i');
    const match = content.match(importRegex);
    
    if (match) {
      return match[1];
    }

    // Common fallback patterns
    const commonPaths = [
      '@server/infrastructure/database/connection',
      '../database/connection',
      '../../shared/database/connection',
      './database',
      '../database',
    ];

    // Return the most likely path based on service name
    if (serviceName.includes('db') || serviceName.includes('database')) {
      return commonPaths[0];
    }

    return commonPaths[0]; // Default fallback
  }

  /**
   * Analyzes a specific file for database patterns
   */
  analyzeFile(filePath: string): DatabaseConnectionPattern[] {
    const patterns: DatabaseConnectionPattern[] = [];
    
    try {
      if (!fs.existsSync(filePath)) {
        return patterns;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for database imports
        if (this.isConnectionImport(line)) {
          patterns.push({
            type: 'import',
            pattern: line.trim(),
            filePath,
            lineNumber: index + 1,
            context: this.getLineContext(lines, index),
          });
        }
        
        // Check for database usage
        if (this.isDatabaseUsage(line)) {
          patterns.push({
            type: 'usage',
            pattern: line.trim(),
            filePath,
            lineNumber: index + 1,
            context: this.getLineContext(lines, index),
          });
        }
        
        // Check for service patterns
        if (this.isServicePattern(line)) {
          patterns.push({
            type: 'service',
            pattern: line.trim(),
            filePath,
            lineNumber: index + 1,
            context: this.getLineContext(lines, index),
          });
        }
      });
      
    } catch (error) {
      // Silently handle file read errors for tests
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`Error analyzing file ${filePath}:`, error);
      }
    }
    
    return patterns;
  }

  /**
   * Checks if a line contains a connection import
   */
  private isConnectionImport(line: string): boolean {
    return /import.*(?:database|connection|drizzle|pg|mysql|sqlite).*from/.test(line) ||
           /from\s+['"`].*(?:database|connection|drizzle).*['"`]/.test(line);
  }

  /**
   * Checks if a line contains database usage
   */
  private isDatabaseUsage(line: string): boolean {
    return /\b(?:db|database|connection|client)\.(?:select|insert|update|delete|query|execute)/.test(line) ||
           /await\s+(?:db|database|connection)\./.test(line);
  }

  /**
   * Checks if a line contains a service pattern
   */
  private isServicePattern(line: string): boolean {
    return /\b(?:databaseService|dbService|connectionService)\b/.test(line) ||
           /=\s*(?:db|database|connection)\b/.test(line);
  }

  /**
   * Gets context around a line (previous and next lines)
   */
  private getLineContext(lines: string[], index: number): string {
    const start = Math.max(0, index - 1);
    const end = Math.min(lines.length - 1, index + 1);
    
    return lines.slice(start, end + 1).join('\n');
  }
}