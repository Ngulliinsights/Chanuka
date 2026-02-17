import { SourceFile, SyntaxKind, Node, PropertySignature, TypeNode, UnionTypeNode, TypeChecker, Program } from 'typescript';
import { ErrorFixer, TypeScriptError, FixResult, CodeChange, ProcessingContext } from '../types/core';

/**
 * Fixer for exactOptionalPropertyTypes TypeScript errors (TS2375)
 * 
 * This fixer handles cases where optional properties need `| undefined` union types
 * to work correctly with the exactOptionalPropertyTypes compiler option.
 * 
 * Common patterns in Chanuka project:
 * - Interface properties with optional modifiers
 * - Configuration object properties
 * - Validation middleware optional parameters
 * - API response optional fields
 */
export class ExactOptionalPropertyFixer implements ErrorFixer {
  canHandle(error: TypeScriptError): boolean {
    return error.code === 2375; // TS2375: Type is missing the following properties from type
  }

  fix(error: TypeScriptError, sourceFile: SourceFile, context?: ProcessingContext): FixResult {
    try {
      // Find the node at the error position
      const errorNode = this.findNodeAtPosition(sourceFile, error.start);
      if (!errorNode) {
        return {
          success: false,
          changes: [],
          message: 'Could not locate error node',
          error: 'Node not found at error position'
        };
      }

      // For TS2375 errors, we need to find optional properties and add | undefined
      // Let's try a more direct approach - find all optional properties in the file
      const optionalProperties = this.findAllOptionalProperties(sourceFile);
      const changes: CodeChange[] = [];

      for (const property of optionalProperties) {
        if (property.type && !this.typeIncludesUndefined(property.type, sourceFile)) {
          const originalType = property.type.getText(sourceFile);
          const newType = `${originalType} | undefined`;
          
          changes.push({
            type: 'replace',
            start: property.type.getStart(sourceFile),
            end: property.type.getEnd(),
            newText: newType,
            description: `Add | undefined to optional property type`,
            originalText: originalType
          });
        }
      }

      if (changes.length === 0) {
        return {
          success: false,
          changes: [],
          message: 'No optional properties found to fix',
          error: 'No fixable properties found'
        };
      }

      return {
        success: true,
        changes,
        message: `Fixed ${changes.length} optional properties by adding | undefined`
      };

    } catch (fixError) {
      return {
        success: false,
        changes: [],
        message: 'Failed to apply exactOptionalPropertyTypes fix',
        error: fixError instanceof Error ? fixError.message : String(fixError)
      };
    }
  }

  getDescription(): string {
    return 'Fixes exactOptionalPropertyTypes issues by adding | undefined to optional property types';
  }

  getPriority(): number {
    return 70; // High priority for type safety
  }

  private findNodeAtPosition(sourceFile: SourceFile, position: number): Node | undefined {
    function visit(node: Node): Node | undefined {
      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      
      if (position >= start && position < end) {
        // Try to find a more specific child node first
        const childResult = node.forEachChild(visit);
        return childResult || node;
      }
      return undefined;
    }
    return visit(sourceFile);
  }

  private detectFixType(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): string {
    const errorText = error.message.toLowerCase();
    const nodeText = errorNode.getText(sourceFile).toLowerCase();
    const fileText = sourceFile.getText().toLowerCase();
    
    // Check for interface property patterns first
    if (this.isInterfaceProperty(errorNode)) {
      return 'interface-property';
    }
    
    // Check for configuration object patterns
    if (errorText.includes('config') || nodeText.includes('config') || 
        errorText.includes('options') || nodeText.includes('options') ||
        fileText.includes('validationoptions') || fileText.includes('requestvalidationconfig')) {
      return 'configuration-object';
    }
    
    // Check for validation middleware patterns
    if (errorText.includes('validation') || nodeText.includes('validation') ||
        errorText.includes('middleware') || nodeText.includes('middleware') ||
        fileText.includes('validationmiddleware')) {
      return 'validation-middleware';
    }
    
    // Check for API response patterns
    if (errorText.includes('api') || nodeText.includes('api') ||
        errorText.includes('response') || nodeText.includes('response') ||
        fileText.includes('apiresponse')) {
      return 'api-response';
    }
    
    return 'generic';
  }

  private isInterfaceProperty(node: Node): boolean {
    return node.kind === SyntaxKind.PropertySignature ||
           (node.parent && node.parent.kind === SyntaxKind.PropertySignature);
  }

  private fixInterfaceProperty(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): FixResult {
    const changes: CodeChange[] = [];
    
    // Find the property signature
    let propertyNode = errorNode;
    while (propertyNode && propertyNode.kind !== SyntaxKind.PropertySignature) {
      propertyNode = propertyNode.parent;
    }
    
    if (!propertyNode || propertyNode.kind !== SyntaxKind.PropertySignature) {
      return {
        success: false,
        changes: [],
        message: 'Could not find property signature',
        error: 'Property signature not found'
      };
    }
    
    const property = propertyNode as PropertySignature;
    
    // Check if property is optional and has a type annotation
    if (property.questionToken && property.type) {
      const typeNode = property.type;
      
      // Check if type already includes undefined
      if (this.typeIncludesUndefined(typeNode, sourceFile)) {
        return {
          success: false,
          changes: [],
          message: 'Property type already includes undefined',
          warnings: ['Type already has undefined union']
        };
      }
      
      // Add | undefined to the type
      const originalType = typeNode.getText(sourceFile);
      const newType = `${originalType} | undefined`;
      
      changes.push({
        type: 'replace',
        start: typeNode.getStart(sourceFile),
        end: typeNode.getEnd(),
        newText: newType,
        description: `Add | undefined to optional property type`,
        originalText: originalType
      });
      
      return {
        success: true,
        changes,
        message: `Added | undefined to optional property type: ${originalType} -> ${newType}`
      };
    }
    
    return {
      success: false,
      changes: [],
      message: 'Property is not optional or has no type annotation',
      error: 'Cannot fix non-optional property'
    };
  }

  private fixConfigurationObject(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): FixResult {
    // Handle configuration object patterns common in Chanuka project
    return this.fixOptionalPropertiesInObject(error, errorNode, sourceFile, 'configuration object');
  }

  private fixValidationMiddleware(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): FixResult {
    // Handle validation middleware patterns
    const changes: CodeChange[] = [];
    
    // Look for validation-specific patterns
    const nodeText = errorNode.getText(sourceFile);
    
    // Check for ValidationOptions, RequestValidationConfig, etc.
    if (nodeText.includes('ValidationOptions') || nodeText.includes('RequestValidationConfig')) {
      return this.fixOptionalPropertiesInObject(error, errorNode, sourceFile, 'validation middleware');
    }
    
    // Check for middleware function parameters
    if (this.isMiddlewareParameter(errorNode, sourceFile)) {
      return this.fixMiddlewareParameter(error, errorNode, sourceFile);
    }
    
    return this.fixGenericOptionalProperty(error, errorNode, sourceFile);
  }

  private fixApiResponse(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): FixResult {
    // Handle API response patterns
    return this.fixOptionalPropertiesInObject(error, errorNode, sourceFile, 'API response');
  }

  private fixGenericOptionalProperty(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): FixResult {
    // Try to find and fix any optional property in the vicinity
    const changes: CodeChange[] = [];
    
    // First try to fix the specific node if it's a property
    if (this.isInterfaceProperty(errorNode)) {
      return this.fixInterfaceProperty(error, errorNode, sourceFile);
    }
    
    // Otherwise, look for optional properties in the containing scope
    return this.fixOptionalPropertiesInObject(error, errorNode, sourceFile, 'optional property');
  }

  private fixOptionalPropertiesInObject(
    error: TypeScriptError, 
    errorNode: Node, 
    sourceFile: SourceFile, 
    context: string
  ): FixResult {
    const changes: CodeChange[] = [];
    
    // Find all optional properties in the containing interface or type
    const optionalProperties = this.findOptionalPropertiesInScope(errorNode, sourceFile);
    
    for (const property of optionalProperties) {
      if (property.type && !this.typeIncludesUndefined(property.type, sourceFile)) {
        const originalType = property.type.getText(sourceFile);
        const newType = `${originalType} | undefined`;
        
        changes.push({
          type: 'replace',
          start: property.type.getStart(sourceFile),
          end: property.type.getEnd(),
          newText: newType,
          description: `Add | undefined to optional ${context} property`,
          originalText: originalType
        });
      }
    }
    
    if (changes.length === 0) {
      return {
        success: false,
        changes: [],
        message: `No optional properties found to fix in ${context}`,
        error: 'No fixable properties found'
      };
    }
    
    return {
      success: true,
      changes,
      message: `Fixed ${changes.length} optional properties in ${context}`
    };
  }

  private findOptionalPropertiesInScope(node: Node, sourceFile: SourceFile): PropertySignature[] {
    const properties: PropertySignature[] = [];
    
    // Traverse up to find the containing interface or type literal
    let current = node;
    while (current && 
           current.kind !== SyntaxKind.InterfaceDeclaration && 
           current.kind !== SyntaxKind.TypeLiteral) {
      current = current.parent;
    }
    
    if (!current) {
      return properties;
    }
    
    // Find all optional properties in the interface/type
    function visit(node: Node) {
      if (node.kind === SyntaxKind.PropertySignature) {
        const property = node as PropertySignature;
        if (property.questionToken) {
          properties.push(property);
        }
      }
      node.forEachChild(visit);
    }
    
    visit(current);
    return properties;
  }

  private typeIncludesUndefined(typeNode: TypeNode, sourceFile: SourceFile): boolean {
    // Check if the type is already a union that includes undefined
    if (typeNode.kind === SyntaxKind.UnionType) {
      const unionType = typeNode as UnionTypeNode;
      return unionType.types.some(type => 
        type.kind === SyntaxKind.UndefinedKeyword ||
        type.getText(sourceFile).trim() === 'undefined'
      );
    }
    
    // Check if the type is just 'undefined'
    if (typeNode.kind === SyntaxKind.UndefinedKeyword) {
      return true;
    }
    
    // Check if the type text includes 'undefined'
    const typeText = typeNode.getText(sourceFile);
    return typeText.includes('undefined');
  }

  private isMiddlewareParameter(node: Node, sourceFile: SourceFile): boolean {
    // Check if this is a parameter in a middleware function
    let current = node;
    while (current && current.kind !== SyntaxKind.Parameter) {
      current = current.parent;
    }
    
    if (!current) {
      return false;
    }
    
    // Check if the function has middleware-like signature
    const functionNode = current.parent;
    if (functionNode && 
        (functionNode.kind === SyntaxKind.FunctionDeclaration || 
         functionNode.kind === SyntaxKind.ArrowFunction ||
         functionNode.kind === SyntaxKind.FunctionExpression)) {
      
      const functionText = functionNode.getText(sourceFile);
      return functionText.includes('req') && 
             functionText.includes('res') && 
             functionText.includes('next');
    }
    
    return false;
  }

  private fixMiddlewareParameter(error: TypeScriptError, errorNode: Node, sourceFile: SourceFile): FixResult {
    // Specific handling for middleware parameters
    const changes: CodeChange[] = [];
    
    // Find the parameter node
    let paramNode = errorNode;
    while (paramNode && paramNode.kind !== SyntaxKind.Parameter) {
      paramNode = paramNode.parent;
    }
    
    if (paramNode && paramNode.kind === SyntaxKind.Parameter) {
      // Handle optional middleware parameters
      const parameter = paramNode as unknown; // Parameter type
      if (parameter.questionToken && parameter.type) {
        const typeNode = parameter.type;
        
        if (!this.typeIncludesUndefined(typeNode, sourceFile)) {
          const originalType = typeNode.getText(sourceFile);
          const newType = `${originalType} | undefined`;
          
          changes.push({
            type: 'replace',
            start: typeNode.getStart(sourceFile),
            end: typeNode.getEnd(),
            newText: newType,
            description: 'Add | undefined to optional middleware parameter',
            originalText: originalType
          });
        }
      }
    }
    
    if (changes.length === 0) {
      return {
        success: false,
        changes: [],
        message: 'No middleware parameters to fix',
        error: 'No fixable middleware parameters found'
      };
    }
    
    return {
      success: true,
      changes,
      message: `Fixed ${changes.length} middleware parameters`
    };
  }

  private findAllOptionalProperties(sourceFile: SourceFile): PropertySignature[] {
    const properties: PropertySignature[] = [];
    
    function visit(node: Node) {
      if (node.kind === SyntaxKind.PropertySignature) {
        const property = node as PropertySignature;
        if (property.questionToken) {
          properties.push(property);
        }
      }
      node.forEachChild(visit);
    }
    
    visit(sourceFile);
    return properties;
  }
}