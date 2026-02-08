/**
 * Type Assertion Analyzer
 * 
 * Identifies locations where type assertions may be needed and validates their safety.
 */

import { Project, SourceFile, Node, SyntaxKind, Type } from 'ts-morph';
import { RemediationConfig } from '../config';

export interface TypeAssertionLocation {
  file: string;
  line: number;
  column: number;
  expression: string;
  currentType: string;
  targetType: string;
  isSafe: boolean;
  isNecessary: boolean;
  reason: string;
  justification?: string;
}

export interface TypeAssertionAnalysisResult {
  locations: TypeAssertionLocation[];
  safeAssertions: TypeAssertionLocation[];
  unsafeAssertions: TypeAssertionLocation[];
  unnecessaryAssertions: TypeAssertionLocation[];
}

export class TypeAssertionAnalyzer {
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
   * Analyze all potential type assertion locations
   */
  async analyzeTypeAssertions(): Promise<TypeAssertionAnalysisResult> {
    const locations: TypeAssertionLocation[] = [];
    const sourceFiles = this.getProject().getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || 
          filePath.includes('.test.') || 
          filePath.includes('.spec.')) {
        continue;
      }

      // Find existing type assertions
      const existingAssertions = this.findExistingTypeAssertions(sourceFile);
      locations.push(...existingAssertions);

      // Find potential locations that might need type assertions
      const potentialLocations = this.findPotentialTypeAssertionLocations(sourceFile);
      locations.push(...potentialLocations);
    }

    // Categorize assertions
    const safeAssertions = locations.filter(loc => loc.isSafe && loc.isNecessary);
    const unsafeAssertions = locations.filter(loc => !loc.isSafe);
    const unnecessaryAssertions = locations.filter(loc => loc.isSafe && !loc.isNecessary);

    return {
      locations,
      safeAssertions,
      unsafeAssertions,
      unnecessaryAssertions
    };
  }

  /**
   * Find existing type assertions in a source file
   */
  private findExistingTypeAssertions(sourceFile: SourceFile): TypeAssertionLocation[] {
    const assertions: TypeAssertionLocation[] = [];

    // Find 'as' type assertions
    const asExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.AsExpression);
    for (const asExpr of asExpressions) {
      const location = this.analyzeAsExpression(sourceFile, asExpr);
      if (location) {
        assertions.push(location);
      }
    }

    // Find angle bracket type assertions (TypeScript only)
    const typeAssertions = sourceFile.getDescendantsOfKind(SyntaxKind.TypeAssertionExpression);
    for (const typeAssertion of typeAssertions) {
      const location = this.analyzeTypeAssertion(sourceFile, typeAssertion);
      if (location) {
        assertions.push(location);
      }
    }

    return assertions;
  }

  /**
   * Analyze an 'as' expression
   */
  private analyzeAsExpression(sourceFile: SourceFile, asExpr: Node): TypeAssertionLocation | null {
    try {
      const expression = asExpr.getChildAtIndex(0);
      const typeNode = asExpr.getChildAtIndex(2);

      if (!expression || !typeNode) {
        return null;
      }

      const currentType = expression.getType();
      const targetTypeText = typeNode.getText();

      const { line, column } = sourceFile.getLineAndColumnAtPos(asExpr.getStart());

      const isSafe = this.isAssertionSafe(currentType, targetTypeText);
      const isNecessary = this.isAssertionNecessary(expression, targetTypeText);

      return {
        file: sourceFile.getFilePath(),
        line,
        column,
        expression: expression.getText(),
        currentType: currentType.getText(),
        targetType: targetTypeText,
        isSafe,
        isNecessary,
        reason: this.getAssertionReason(isSafe, isNecessary),
        justification: isNecessary ? this.generateJustification(expression, targetTypeText) : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze a type assertion expression (<Type>expression)
   */
  private analyzeTypeAssertion(sourceFile: SourceFile, typeAssertion: Node): TypeAssertionLocation | null {
    try {
      const typeNode = typeAssertion.getChildAtIndex(1);
      const expression = typeAssertion.getChildAtIndex(3);

      if (!expression || !typeNode) {
        return null;
      }

      const currentType = expression.getType();
      const targetTypeText = typeNode.getText();

      const { line, column } = sourceFile.getLineAndColumnAtPos(typeAssertion.getStart());

      const isSafe = this.isAssertionSafe(currentType, targetTypeText);
      const isNecessary = this.isAssertionNecessary(expression, targetTypeText);

      return {
        file: sourceFile.getFilePath(),
        line,
        column,
        expression: expression.getText(),
        currentType: currentType.getText(),
        targetType: targetTypeText,
        isSafe,
        isNecessary,
        reason: this.getAssertionReason(isSafe, isNecessary),
        justification: isNecessary ? this.generateJustification(expression, targetTypeText) : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Find potential locations that might need type assertions
   */
  private findPotentialTypeAssertionLocations(sourceFile: SourceFile): TypeAssertionLocation[] {
    const locations: TypeAssertionLocation[] = [];

    // Look for common patterns that might need type assertions:
    // 1. Array access with unknown index
    // 2. Object property access on union types
    // 3. Function returns with generic types
    // 4. API responses that need narrowing

    // Find element access expressions (array[index])
    const elementAccess = sourceFile.getDescendantsOfKind(SyntaxKind.ElementAccessExpression);
    for (const access of elementAccess) {
      const location = this.analyzeElementAccess(sourceFile, access);
      if (location) {
        locations.push(location);
      }
    }

    // Find property access on union types
    const propertyAccess = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    for (const access of propertyAccess) {
      const location = this.analyzePropertyAccess(sourceFile, access);
      if (location) {
        locations.push(location);
      }
    }

    return locations;
  }

  /**
   * Analyze element access expression
   */
  private analyzeElementAccess(sourceFile: SourceFile, access: Node): TypeAssertionLocation | null {
    try {
      const type = access.getType();
      const typeText = type.getText();

      // Check if the type is 'any' or includes 'undefined'
      if (typeText === 'any' || typeText.includes('undefined')) {
        const { line, column } = sourceFile.getLineAndColumnAtPos(access.getStart());

        // Determine if a type assertion would be safe
        const isSafe = false; // Element access is generally unsafe without runtime checks
        const isNecessary = typeText === 'any'; // Only necessary if type is 'any'

        return {
          file: sourceFile.getFilePath(),
          line,
          column,
          expression: access.getText(),
          currentType: typeText,
          targetType: 'unknown', // Would need context to determine
          isSafe,
          isNecessary,
          reason: 'Element access may return undefined - consider runtime check instead of type assertion',
          justification: undefined
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze property access expression
   */
  private analyzePropertyAccess(sourceFile: SourceFile, access: Node): TypeAssertionLocation | null {
    try {
      const expression = access.getChildAtIndex(0);
      if (!expression) {
        return null;
      }

      const type = expression.getType();
      const typeText = type.getText();

      // Check if accessing property on union type
      if (type.isUnion()) {
        const { line, column } = sourceFile.getLineAndColumnAtPos(access.getStart());

        // Type assertions on union types can be safe if we know the runtime type
        const isSafe = false; // Requires runtime type guard
        const isNecessary = false; // Should use type guard instead

        return {
          file: sourceFile.getFilePath(),
          line,
          column,
          expression: access.getText(),
          currentType: typeText,
          targetType: 'unknown', // Would need context to determine
          isSafe,
          isNecessary,
          reason: 'Property access on union type - consider type guard instead of type assertion',
          justification: undefined
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a type assertion is safe
   */
  private isAssertionSafe(currentType: Type, targetTypeText: string): boolean {
    const currentTypeText = currentType.getText();

    // Assertions are safe if:
    // 1. Narrowing from 'any' or 'unknown' (with runtime validation)
    // 2. Narrowing a union type to one of its members
    // 3. Asserting to a more specific type that's structurally compatible

    // Unsafe assertions:
    // 1. Widening types (e.g., string to any)
    // 2. Unrelated types (e.g., string to number)
    // 3. Assertions without runtime validation

    // Check for narrowing from any/unknown
    if (currentTypeText === 'any' || currentTypeText === 'unknown') {
      // This is potentially safe if there's runtime validation
      // For now, mark as unsafe to encourage runtime checks
      return false;
    }

    // Check for union type narrowing
    if (currentType.isUnion()) {
      const unionTypes = currentType.getUnionTypes();
      const targetMatches = unionTypes.some(t => t.getText() === targetTypeText);
      return targetMatches;
    }

    // Check for structural compatibility
    // This is a simplified check - a full implementation would use TypeScript's type checker
    return currentTypeText.includes(targetTypeText) || targetTypeText.includes(currentTypeText);
  }

  /**
   * Check if a type assertion is necessary
   */
  private isAssertionNecessary(expression: Node, targetTypeText: string): boolean {
    // An assertion is necessary if:
    // 1. The type system can't infer the correct type
    // 2. There's no better typing solution (e.g., type guards, generics)
    // 3. The assertion is required for API compatibility

    // An assertion is NOT necessary if:
    // 1. The type can be inferred correctly
    // 2. A type guard would be more appropriate
    // 3. The function signature can be improved

    const currentType = expression.getType();
    const currentTypeText = currentType.getText();

    // If current type already matches target, assertion is unnecessary
    if (currentTypeText === targetTypeText) {
      return false;
    }

    // If current type is 'any', assertion might be necessary
    // but a better solution would be to fix the source of 'any'
    if (currentTypeText === 'any') {
      return false; // Encourage fixing the root cause
    }

    // If it's a union type, a type guard would be better
    if (currentType.isUnion()) {
      return false; // Encourage type guards
    }

    // Otherwise, might be necessary
    return true;
  }

  /**
   * Get reason for assertion safety/necessity
   */
  private getAssertionReason(isSafe: boolean, isNecessary: boolean): string {
    if (!isSafe && !isNecessary) {
      return 'Unsafe and unnecessary - remove or use type guard';
    } else if (!isSafe && isNecessary) {
      return 'Unsafe - add runtime validation';
    } else if (isSafe && !isNecessary) {
      return 'Unnecessary - can be removed or replaced with better typing';
    } else {
      return 'Safe and necessary - keep with justification comment';
    }
  }

  /**
   * Generate justification comment for a type assertion
   */
  private generateJustification(expression: Node, targetTypeText: string): string {
    const currentType = expression.getType().getText();
    
    return `// Type assertion: ${currentType} -> ${targetTypeText}
// Justification: TypeScript cannot infer the specific type here, but we know from context
// that the runtime value will be ${targetTypeText}. This assertion is safe because [explain why].`;
  }

  /**
   * Generate recommendations for type assertions
   */
  generateRecommendations(analysisResult: TypeAssertionAnalysisResult): Array<{
    file: string;
    line: number;
    action: 'keep' | 'remove' | 'add_validation' | 'use_type_guard';
    reason: string;
    suggestedCode?: string;
  }> {
    const recommendations: Array<{
      file: string;
      line: number;
      action: 'keep' | 'remove' | 'add_validation' | 'use_type_guard';
      reason: string;
      suggestedCode?: string;
    }> = [];

    // Process safe and necessary assertions
    for (const assertion of analysisResult.safeAssertions) {
      recommendations.push({
        file: assertion.file,
        line: assertion.line,
        action: 'keep',
        reason: 'Safe and necessary type assertion',
        suggestedCode: assertion.justification
      });
    }

    // Process unsafe assertions
    for (const assertion of analysisResult.unsafeAssertions) {
      if (assertion.currentType === 'any' || assertion.currentType === 'unknown') {
        recommendations.push({
          file: assertion.file,
          line: assertion.line,
          action: 'add_validation',
          reason: 'Add runtime validation before type assertion',
          suggestedCode: this.generateValidationCode(assertion)
        });
      } else {
        recommendations.push({
          file: assertion.file,
          line: assertion.line,
          action: 'use_type_guard',
          reason: 'Use type guard instead of type assertion',
          suggestedCode: this.generateTypeGuardCode(assertion)
        });
      }
    }

    // Process unnecessary assertions
    for (const assertion of analysisResult.unnecessaryAssertions) {
      recommendations.push({
        file: assertion.file,
        line: assertion.line,
        action: 'remove',
        reason: 'Unnecessary type assertion - type can be inferred',
        suggestedCode: assertion.expression // Just the expression without assertion
      });
    }

    return recommendations;
  }

  /**
   * Generate runtime validation code
   */
  private generateValidationCode(assertion: TypeAssertionLocation): string {
    return `// Add runtime validation
if (typeof ${assertion.expression} !== '${assertion.targetType}') {
  throw new Error('Invalid type: expected ${assertion.targetType}');
}
const validated = ${assertion.expression} as ${assertion.targetType};`;
  }

  /**
   * Generate type guard code
   */
  private generateTypeGuardCode(assertion: TypeAssertionLocation): string {
    const guardName = `is${assertion.targetType.charAt(0).toUpperCase()}${assertion.targetType.slice(1)}`;
    
    return `// Use type guard instead
function ${guardName}(value: ${assertion.currentType}): value is ${assertion.targetType} {
  // Add appropriate type checking logic here
  return /* condition */;
}

if (${guardName}(${assertion.expression})) {
  // TypeScript now knows the type is ${assertion.targetType}
  const typed = ${assertion.expression};
}`;
  }
}
