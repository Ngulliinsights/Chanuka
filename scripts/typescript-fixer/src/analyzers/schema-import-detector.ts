import * as ts from 'typescript';
import * as path from 'path';
import { TypeScriptError, ProjectStructure, ProcessingContext } from '@shared/types/core';

/**
 * Represents a detected schema import issue
 */
export interface SchemaImportIssue {
  type: 'missing_import' | 'missing_property' | 'incorrect_import_path' | 'missing_drizzle_import';
  tableName: string;
  propertyName?: string;
  suggestedImport: string;
  suggestedImportPath: string;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
  context: string;
}

/**
 * Detects schema import errors and missing property references in TypeScript files
 */
export class SchemaImportDetector {
  private projectStructure: ProjectStructure;
  private knownSchemaTables: Set<string>;
  private schemaImportPaths: Map<string, string>;
  private drizzleOrmFunctions: Set<string>;

  constructor(projectStructure: ProjectStructure) {
    this.projectStructure = projectStructure;
    this.knownSchemaTables = new Set();
    this.schemaImportPaths = new Map();
    this.drizzleOrmFunctions = new Set([
      'eq', 'and', 'or', 'desc', 'asc', 'sql', 'count', 'sum', 'avg', 'max', 'min',
      'like', 'ilike', 'not', 'isNull', 'isNotNull', 'inArray', 'notInArray',
      'between', 'notBetween', 'exists', 'notExists'
    ]);

    this.initializeSchemaKnowledge();
  }

  /**
   * Initializes knowledge about available schema tables and their import paths
   */
  private initializeSchemaKnowledge(): void {
    // Add known schema tables from project structure
    for (const [tableName, properties] of Object.entries(this.projectStructure.schema.tables)) {
      this.knownSchemaTables.add(tableName);
      // Don't add individual properties as table names - they are column names
    }

    // Set up import paths
    for (const [tableName, importPath] of Object.entries(this.projectStructure.schema.importPaths)) {
      this.schemaImportPaths.set(tableName, importPath);
    }

    // Add known Chanuka schema tables based on the actual schema files
    const chanukaSchemaModules = [
      'foundation', 'citizen_participation', 'parliamentary_process',
      'constitutional_intelligence', 'argument_intelligence', 'advocacy_coordination',
      'universal_access', 'integrity_operations', 'platform_operations',
      'transparency_analysis', 'impact_measurement', 'enum'
    ];

    for (const module of chanukaSchemaModules) {
      this.schemaImportPaths.set(module, `@server/infrastructure/schema/${module}`);
    }

    // Add specific known tables from Chanuka project
    const knownTables = [
      'users', 'user_profiles', 'sponsors', 'committees', 'committee_members',
      'parliamentary_sessions', 'parliamentary_sittings', 'bills', 'sessions',
      'comments', 'comment_votes', 'bill_votes', 'bill_engagement',
      'bill_tracking_preferences', 'notifications', 'alert_preferences',
      'campaigns', 'action_items', 'arguments', 'claims', 'evidence'
    ];

    for (const table of knownTables) {
      this.knownSchemaTables.add(table);
      if (!this.schemaImportPaths.has(table)) {
        // Try to determine the most likely import path
        if (['users', 'user_profiles', 'sponsors', 'bills'].includes(table)) {
          this.schemaImportPaths.set(table, '@server/infrastructure/schema/foundation');
        } else if (['sessions', 'comments', 'notifications'].includes(table)) {
          this.schemaImportPaths.set(table, '@server/infrastructure/schema/citizen_participation');
        } else {
          this.schemaImportPaths.set(table, '@server/infrastructure/schema');
        }
      }
    }
  }

  /**
   * Detects schema import issues in a TypeScript source file
   */
  detectSchemaImportIssues(sourceFile: ts.SourceFile, context: ProcessingContext): SchemaImportIssue[] {
    const issues: SchemaImportIssue[] = [];
    const existingImports = this.extractExistingImports(sourceFile);
    const usedTables = new Set<string>();
    const usedDrizzleFunctions = new Set<string>();

    // Walk the AST to find schema table references and Drizzle ORM function usage
    const visit = (node: ts.Node) => {
      // Check for property access expressions (e.g., users.id, bills.title)
      if (ts.isPropertyAccessExpression(node)) {
        const objectName = this.getIdentifierName(node.expression);
        if (objectName && this.knownSchemaTables.has(objectName)) {
          usedTables.add(objectName);
          
          // Check if the property exists on the table (only for actual table columns)
          const propertyName = node.name.text;
          const tableProperties = this.projectStructure.schema.tables[objectName];
          
          // Only check properties if we have table schema info and it's not a method call
          if (tableProperties && !this.isMethodCall(node) && !this.isCommonTableMethod(propertyName)) {
            if (!tableProperties.includes(propertyName)) {
              const position = this.getNodePosition(node, sourceFile);
              issues.push({
                type: 'missing_property',
                tableName: objectName,
                propertyName,
                suggestedImport: objectName,
                suggestedImportPath: this.schemaImportPaths.get(objectName) || '@server/infrastructure/schema',
                position,
                context: this.getNodeContext(node, sourceFile)
              });
            }
          }
        }
      }

      // Check for function calls that might be Drizzle ORM functions
      if (ts.isCallExpression(node)) {
        const functionName = this.getIdentifierName(node.expression);
        if (functionName && this.drizzleOrmFunctions.has(functionName)) {
          usedDrizzleFunctions.add(functionName);
        }
      }

      // Check for identifier references to schema tables (but not in import declarations or property names)
      if (ts.isIdentifier(node) && !this.isInImportDeclaration(node) && !this.isPropertyName(node)) {
        const name = node.text;
        if (this.knownSchemaTables.has(name) && !this.drizzleOrmFunctions.has(name)) {
          usedTables.add(name);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Check for missing imports
    for (const tableName of usedTables) {
      if (!existingImports.has(tableName)) {
        const importPath = this.schemaImportPaths.get(tableName) || '@server/infrastructure/schema';
        issues.push({
          type: 'missing_import',
          tableName,
          suggestedImport: tableName,
          suggestedImportPath: importPath,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: `Missing import for schema table: ${tableName}`
        });
      }
    }

    // Check for missing Drizzle ORM imports
    if (usedDrizzleFunctions.size > 0) {
      const drizzleImports = Array.from(usedDrizzleFunctions);
      const missingDrizzleImports = drizzleImports.filter(func => !existingImports.has(func));
      
      if (missingDrizzleImports.length > 0) {
        issues.push({
          type: 'missing_drizzle_import',
          tableName: 'drizzle-orm',
          suggestedImport: missingDrizzleImports.join(', '),
          suggestedImportPath: 'drizzle-orm',
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: `Missing Drizzle ORM imports: ${missingDrizzleImports.join(', ')}`
        });
      }
    }

    return issues;
  }

  /**
   * Extracts existing imports from a source file
   */
  private extractExistingImports(sourceFile: ts.SourceFile): Set<string> {
    const imports = new Set<string>();

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.importClause) {
        // Handle named imports
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            imports.add(element.name.text);
          }
        }

        // Handle default imports
        if (node.importClause.name) {
          imports.add(node.importClause.name.text);
        }

        // Handle namespace imports
        if (node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
          imports.add(node.importClause.namedBindings.name.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Gets the identifier name from an expression
   */
  private getIdentifierName(expression: ts.Expression): string | undefined {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    return undefined;
  }

  /**
   * Gets the position information for a node
   */
  private getNodePosition(node: ts.Node, sourceFile: ts.SourceFile): SchemaImportIssue['position'] {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);

    return {
      start,
      end,
      line: lineAndChar.line + 1,
      column: lineAndChar.character + 1
    };
  }

  /**
   * Gets context around a node for better error reporting
   */
  private getNodeContext(node: ts.Node, sourceFile: ts.SourceFile): string {
    const start = Math.max(0, node.getStart(sourceFile) - 50);
    const end = Math.min(sourceFile.text.length, node.getEnd() + 50);
    return sourceFile.text.substring(start, end);
  }

  /**
   * Checks if a property access is a method call
   */
  private isMethodCall(node: ts.PropertyAccessExpression): boolean {
    return node.parent && ts.isCallExpression(node.parent) && node.parent.expression === node;
  }

  /**
   * Checks if a property name is a common table method (not a column)
   */
  private isCommonTableMethod(propertyName: string): boolean {
    const commonMethods = [
      'findFirst', 'findMany', 'findUnique', 'create', 'update', 'delete',
      'upsert', 'count', 'aggregate', 'groupBy', 'select', 'insert',
      'relations', '$inferSelect', '$inferInsert'
    ];
    return commonMethods.includes(propertyName);
  }

  /**
   * Checks if a node is inside an import declaration
   */
  private isInImportDeclaration(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
      if (ts.isImportDeclaration(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Checks if a node is a property name in a property access expression
   */
  private isPropertyName(node: ts.Node): boolean {
    return node.parent && ts.isPropertyAccessExpression(node.parent) && node.parent.name === node;
  }

  /**
   * Validates a schema table reference against known schema definitions
   */
  validateSchemaTableReference(tableName: string, propertyName?: string): {
    isValid: boolean;
    suggestions: string[];
    correctImportPath?: string;
  } {
    const isValidTable = this.knownSchemaTables.has(tableName);
    const suggestions: string[] = [];
    let correctImportPath: string | undefined;

    if (!isValidTable) {
      // Find similar table names
      const similarTables = Array.from(this.knownSchemaTables)
        .filter(table => this.calculateSimilarity(tableName, table) > 0.6)
        .sort((a, b) => this.calculateSimilarity(tableName, b) - this.calculateSimilarity(tableName, a))
        .slice(0, 3);
      
      suggestions.push(...similarTables);
    } else {
      correctImportPath = this.schemaImportPaths.get(tableName);
      
      if (propertyName) {
        const tableProperties = this.projectStructure.schema.tables[tableName];
        if (tableProperties && !tableProperties.includes(propertyName)) {
          // Find similar property names
          const similarProperties = tableProperties
            .filter(prop => this.calculateSimilarity(propertyName, prop) > 0.6)
            .sort((a, b) => this.calculateSimilarity(propertyName, b) - this.calculateSimilarity(propertyName, a))
            .slice(0, 3);
          
          suggestions.push(...similarProperties);
        }
      }
    }

    return {
      isValid: isValidTable,
      suggestions,
      correctImportPath
    };
  }

  /**
   * Calculates string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Generates import statement suggestions for missing schema imports
   */
  generateImportSuggestions(issues: SchemaImportIssue[]): Map<string, string[]> {
    const suggestions = new Map<string, string[]>();

    // Group issues by import path
    const importGroups = new Map<string, Set<string>>();
    
    for (const issue of issues) {
      if (!importGroups.has(issue.suggestedImportPath)) {
        importGroups.set(issue.suggestedImportPath, new Set());
      }
      importGroups.get(issue.suggestedImportPath)!.add(issue.suggestedImport);
    }

    // Generate import statements
    for (const [importPath, imports] of importGroups) {
      const importList = Array.from(imports).sort();
      const importStatement = `import { ${importList.join(', ')} } from '${importPath}';`;
      
      if (!suggestions.has(importPath)) {
        suggestions.set(importPath, []);
      }
      suggestions.get(importPath)!.push(importStatement);
    }

    return suggestions;
  }

  /**
   * Checks if a file likely contains database/schema operations
   */
  isSchemaRelatedFile(sourceFile: ts.SourceFile): boolean {
    const text = sourceFile.text.toLowerCase();
    
    // Check for common database operation patterns
    const dbPatterns = [
      'select', 'insert', 'update', 'delete', 'from', 'where',
      'drizzle', 'database', 'schema', 'table', 'query',
      'users.', 'bills.', 'comments.', 'sponsors.',
      'eq(', 'and(', 'or(', 'desc(', 'asc('
    ];

    return dbPatterns.some(pattern => text.includes(pattern));
  }
}