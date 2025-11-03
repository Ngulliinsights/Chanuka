import * as ts from 'typescript';
import { TypeScriptError, ProjectStructure } from '../types/core';

/**
 * Represents a detected Drizzle ORM pattern issue
 */
export interface DrizzlePatternIssue {
  type: 'missing_drizzle_import' | 'incorrect_query_syntax' | 'missing_table_reference' | 'invalid_column_reference';
  functionName: string;
  tableName?: string;
  columnName?: string;
  suggestedFix: string;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
  context: string;
}

/**
 * Detects Drizzle ORM usage patterns and identifies missing imports or incorrect syntax
 */
export class DrizzlePatternDetector {
  private projectStructure: ProjectStructure;
  private drizzleCoreFunctions: Set<string>;
  private drizzleHelperFunctions: Set<string>;
  private drizzleOperators: Set<string>;

  constructor(projectStructure: ProjectStructure) {
    this.projectStructure = projectStructure;
    
    // Core Drizzle ORM functions that need to be imported
    this.drizzleCoreFunctions = new Set([
      'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
      'and', 'or', 'not',
      'isNull', 'isNotNull',
      'inArray', 'notInArray',
      'between', 'notBetween',
      'like', 'ilike', 'notLike', 'notIlike',
      'exists', 'notExists',
      'sql'
    ]);

    // Helper functions for aggregation and ordering
    this.drizzleHelperFunctions = new Set([
      'count', 'sum', 'avg', 'max', 'min',
      'desc', 'asc',
      'distinct',
      'placeholder'
    ]);

    // SQL operators that might be used incorrectly
    this.drizzleOperators = new Set([
      '=', '!=', '<>', '>', '>=', '<', '<=',
      'AND', 'OR', 'NOT',
      'IS NULL', 'IS NOT NULL',
      'IN', 'NOT IN',
      'BETWEEN', 'NOT BETWEEN',
      'LIKE', 'ILIKE', 'NOT LIKE', 'NOT ILIKE'
    ]);
  }

  /**
   * Detects Drizzle ORM pattern issues in a TypeScript source file
   */
  detectDrizzlePatternIssues(sourceFile: ts.SourceFile): DrizzlePatternIssue[] {
    const issues: DrizzlePatternIssue[] = [];
    const existingImports = this.extractDrizzleImports(sourceFile);
    const usedFunctions = new Set<string>();

    const visit = (node: ts.Node) => {
      // Check for function calls that might be Drizzle functions
      if (ts.isCallExpression(node)) {
        this.checkDrizzleFunctionCall(node, sourceFile, issues, usedFunctions);
      }

      // Check for binary expressions that might need Drizzle operators
      if (ts.isBinaryExpression(node)) {
        this.checkBinaryExpression(node, sourceFile, issues);
      }

      // Check for property access that might be table.column references
      if (ts.isPropertyAccessExpression(node)) {
        this.checkTableColumnReference(node, sourceFile, issues);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Check for missing imports
    this.checkMissingDrizzleImports(usedFunctions, existingImports, issues);

    return issues;
  }

  /**
   * Checks if a function call is a Drizzle ORM function and validates its usage
   */
  private checkDrizzleFunctionCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[],
    usedFunctions: Set<string>
  ): void {
    const functionName = this.getFunctionName(node.expression);
    
    if (!functionName) return;

    // Track usage of Drizzle functions
    if (this.drizzleCoreFunctions.has(functionName) || this.drizzleHelperFunctions.has(functionName)) {
      usedFunctions.add(functionName);
    }

    // Validate specific function patterns
    switch (functionName) {
      case 'eq':
      case 'ne':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        this.validateComparisonFunction(node, functionName, sourceFile, issues);
        break;
      
      case 'and':
      case 'or':
        this.validateLogicalFunction(node, functionName, sourceFile, issues);
        break;
      
      case 'inArray':
      case 'notInArray':
        this.validateArrayFunction(node, functionName, sourceFile, issues);
        break;
      
      case 'like':
      case 'ilike':
      case 'notLike':
      case 'notIlike':
        this.validateLikeFunction(node, functionName, sourceFile, issues);
        break;
      
      case 'between':
      case 'notBetween':
        this.validateBetweenFunction(node, functionName, sourceFile, issues);
        break;
    }
  }

  /**
   * Validates comparison function usage (eq, ne, gt, etc.)
   */
  private validateComparisonFunction(
    node: ts.CallExpression,
    functionName: string,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    // Don't validate if there are spread arguments
    const hasSpreadArguments = node.arguments.some(arg => ts.isSpreadElement(arg));
    
    if (!hasSpreadArguments && node.arguments.length !== 2) {
      const position = this.getNodePosition(node, sourceFile);
      issues.push({
        type: 'incorrect_query_syntax',
        functionName,
        suggestedFix: `${functionName}(column, value) - requires exactly 2 arguments`,
        position,
        context: this.getNodeContext(node, sourceFile)
      });
    }
  }

  /**
   * Validates logical function usage (and, or)
   */
  private validateLogicalFunction(
    node: ts.CallExpression,
    functionName: string,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    // Don't validate if there are spread arguments
    const hasSpreadArguments = node.arguments.some(arg => ts.isSpreadElement(arg));
    
    if (!hasSpreadArguments && node.arguments.length < 2) {
      const position = this.getNodePosition(node, sourceFile);
      issues.push({
        type: 'incorrect_query_syntax',
        functionName,
        suggestedFix: `${functionName}(condition1, condition2, ...) - requires at least 2 arguments`,
        position,
        context: this.getNodeContext(node, sourceFile)
      });
    }
  }

  /**
   * Validates array function usage (inArray, notInArray)
   */
  private validateArrayFunction(
    node: ts.CallExpression,
    functionName: string,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    // Don't validate if there are spread arguments
    const hasSpreadArguments = node.arguments.some(arg => ts.isSpreadElement(arg));
    
    if (!hasSpreadArguments && node.arguments.length !== 2) {
      const position = this.getNodePosition(node, sourceFile);
      issues.push({
        type: 'incorrect_query_syntax',
        functionName,
        suggestedFix: `${functionName}(column, array) - requires exactly 2 arguments`,
        position,
        context: this.getNodeContext(node, sourceFile)
      });
    }
  }

  /**
   * Validates LIKE function usage
   */
  private validateLikeFunction(
    node: ts.CallExpression,
    functionName: string,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    // Don't validate if there are spread arguments
    const hasSpreadArguments = node.arguments.some(arg => ts.isSpreadElement(arg));
    
    if (!hasSpreadArguments && node.arguments.length !== 2) {
      const position = this.getNodePosition(node, sourceFile);
      issues.push({
        type: 'incorrect_query_syntax',
        functionName,
        suggestedFix: `${functionName}(column, pattern) - requires exactly 2 arguments`,
        position,
        context: this.getNodeContext(node, sourceFile)
      });
    }
  }

  /**
   * Validates BETWEEN function usage
   */
  private validateBetweenFunction(
    node: ts.CallExpression,
    functionName: string,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    // Don't validate if there are spread arguments
    const hasSpreadArguments = node.arguments.some(arg => ts.isSpreadElement(arg));
    
    if (!hasSpreadArguments && node.arguments.length !== 3) {
      const position = this.getNodePosition(node, sourceFile);
      issues.push({
        type: 'incorrect_query_syntax',
        functionName,
        suggestedFix: `${functionName}(column, min, max) - requires exactly 3 arguments`,
        position,
        context: this.getNodeContext(node, sourceFile)
      });
    }
  }

  /**
   * Checks binary expressions for potential Drizzle operator usage
   */
  private checkBinaryExpression(
    node: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    // Check if this looks like a database query condition using raw operators
    const operator = node.operatorToken.getText(sourceFile);
    
    // If we see raw SQL operators in what looks like a query context, suggest Drizzle functions
    if (this.isInQueryContext(node) && this.shouldUseDrizzleOperator(operator)) {
      const position = this.getNodePosition(node, sourceFile);
      const drizzleFunction = this.getDrizzleFunctionForOperator(operator);
      
      if (drizzleFunction) {
        issues.push({
          type: 'incorrect_query_syntax',
          functionName: drizzleFunction,
          suggestedFix: `Use ${drizzleFunction}() instead of '${operator}' operator`,
          position,
          context: this.getNodeContext(node, sourceFile)
        });
      }
    }
  }

  /**
   * Checks table.column references for validity
   */
  private checkTableColumnReference(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    issues: DrizzlePatternIssue[]
  ): void {
    const tableName = this.getIdentifierName(node.expression);
    const columnName = node.name.text;

    if (tableName && this.isKnownSchemaTable(tableName)) {
      // Check if the column exists on the table
      const tableColumns = this.projectStructure.schema.tables[tableName];
      if (tableColumns && !tableColumns.includes(columnName)) {
        const position = this.getNodePosition(node, sourceFile);
        const suggestions = this.findSimilarColumns(columnName, tableColumns);
        
        issues.push({
          type: 'invalid_column_reference',
          functionName: 'column_reference',
          tableName,
          columnName,
          suggestedFix: suggestions.length > 0 
            ? `Did you mean: ${suggestions.join(', ')}?`
            : `Column '${columnName}' does not exist on table '${tableName}'`,
          position,
          context: this.getNodeContext(node, sourceFile)
        });
      }
    }
  }

  /**
   * Checks for missing Drizzle imports
   */
  private checkMissingDrizzleImports(
    usedFunctions: Set<string>,
    existingImports: Set<string>,
    issues: DrizzlePatternIssue[]
  ): void {
    const missingFunctions = Array.from(usedFunctions).filter(func => !existingImports.has(func));
    
    if (missingFunctions.length > 0) {
      issues.push({
        type: 'missing_drizzle_import',
        functionName: 'import',
        suggestedFix: `import { ${missingFunctions.join(', ')} } from 'drizzle-orm';`,
        position: { start: 0, end: 0, line: 1, column: 1 },
        context: `Missing Drizzle ORM imports: ${missingFunctions.join(', ')}`
      });
    }
  }

  /**
   * Extracts existing Drizzle imports from the source file
   */
  private extractDrizzleImports(sourceFile: ts.SourceFile): Set<string> {
    const imports = new Set<string>();

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        
        if (moduleSpecifier === 'drizzle-orm' || moduleSpecifier.startsWith('drizzle-orm/')) {
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            for (const element of node.importClause.namedBindings.elements) {
              imports.add(element.name.text);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Gets the function name from a call expression
   */
  private getFunctionName(expression: ts.Expression): string | undefined {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      return expression.name.text;
    }
    return undefined;
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
   * Checks if a table name is a known schema table
   */
  private isKnownSchemaTable(tableName: string): boolean {
    return Object.keys(this.projectStructure.schema.tables).includes(tableName);
  }

  /**
   * Finds similar column names using string similarity
   */
  private findSimilarColumns(columnName: string, availableColumns: string[]): string[] {
    return availableColumns
      .filter(col => this.calculateSimilarity(columnName, col) > 0.6)
      .sort((a, b) => this.calculateSimilarity(columnName, b) - this.calculateSimilarity(columnName, a))
      .slice(0, 3);
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

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Checks if a node is in a query context (inside a database query)
   */
  private isInQueryContext(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
      // Look for common query method calls
      if (ts.isCallExpression(parent)) {
        const functionName = this.getFunctionName(parent.expression);
        if (functionName && ['select', 'where', 'having', 'update', 'delete'].includes(functionName)) {
          return true;
        }
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Checks if an operator should use a Drizzle function instead
   */
  private shouldUseDrizzleOperator(operator: string): boolean {
    return ['===', '==', '!==', '!=', '>', '>=', '<', '<='].includes(operator);
  }

  /**
   * Gets the corresponding Drizzle function for an operator
   */
  private getDrizzleFunctionForOperator(operator: string): string | undefined {
    const operatorMap: Record<string, string> = {
      '===': 'eq',
      '==': 'eq',
      '!==': 'ne',
      '!=': 'ne',
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte'
    };
    return operatorMap[operator];
  }

  /**
   * Gets the position information for a node
   */
  private getNodePosition(node: ts.Node, sourceFile: ts.SourceFile): DrizzlePatternIssue['position'] {
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
}