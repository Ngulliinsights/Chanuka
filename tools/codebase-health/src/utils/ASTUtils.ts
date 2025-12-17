// AST Utility Functions for TypeScript parsing
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

export interface ModuleResolutionResult {
  resolvedModule?: ts.ResolvedModule;
  failedLookupLocations: string[];
}

export interface ImportInfo {
  moduleSpecifier: string;
  importClause?: ts.ImportClause;
  isTypeOnly: boolean;
  namedImports: string[];
  defaultImport?: string;
  namespaceImport?: string;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  isTypeOnly: boolean;
  exportClause?: ts.NamedExports;
  moduleSpecifier?: string;
}

export interface TypeAnnotationInfo {
  node: ts.Node;
  typeText: string;
  isExplicit: boolean;
  hasAnyType: boolean;
  hasNonNullAssertion: boolean;
}

export class ASTUtils {
  private static compilerHost: ts.CompilerHost | undefined;

  static createProgram(filePaths: string[], compilerOptions?: ts.CompilerOptions): ts.Program {
    const defaultOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      allowSyntheticDefaultImports: true,
      ...compilerOptions
    };

    // Create compiler host for module resolution
    this.compilerHost = ts.createCompilerHost(defaultOptions);
    return ts.createProgram(filePaths, defaultOptions, this.compilerHost);
  }

  static createProgramFromDirectory(rootDir: string, compilerOptions?: ts.CompilerOptions): ts.Program {
    const filePaths = this.findTypeScriptFiles(rootDir);
    return this.createProgram(filePaths, compilerOptions);
  }

  static findTypeScriptFiles(rootDir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
    const files: string[] = [];
    
    function traverse(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          traverse(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(rootDir);
    return files;
  }

  static resolveModuleSpecifier(
    moduleSpecifier: string, 
    containingFile: string, 
    compilerOptions: ts.CompilerOptions
  ): ModuleResolutionResult {
    const result = ts.resolveModuleName(
      moduleSpecifier,
      containingFile,
      compilerOptions,
      this.compilerHost || ts.sys
    );

    return {
      resolvedModule: result.resolvedModule,
      failedLookupLocations: result.failedLookupLocations || []
    };
  }

  static getSourceFile(program: ts.Program, filePath: string): ts.SourceFile | undefined {
    return program.getSourceFile(filePath);
  }

  static findImportDeclarations(sourceFile: ts.SourceFile): ts.ImportDeclaration[] {
    const imports: ts.ImportDeclaration[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        imports.push(node);
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return imports;
  }

  static parseImportInfo(importDeclaration: ts.ImportDeclaration): ImportInfo {
    const moduleSpecifier = (importDeclaration.moduleSpecifier as ts.StringLiteral).text;
    const importClause = importDeclaration.importClause;
    const isTypeOnly = !!(importDeclaration.importClause?.isTypeOnly);
    
    const namedImports: string[] = [];
    let defaultImport: string | undefined;
    let namespaceImport: string | undefined;

    if (importClause) {
      // Default import
      if (importClause.name) {
        defaultImport = importClause.name.text;
      }

      // Named imports
      if (importClause.namedBindings) {
        if (ts.isNamedImports(importClause.namedBindings)) {
          for (const element of importClause.namedBindings.elements) {
            namedImports.push(element.name.text);
          }
        } else if (ts.isNamespaceImport(importClause.namedBindings)) {
          namespaceImport = importClause.namedBindings.name.text;
        }
      }
    }

    return {
      moduleSpecifier,
      importClause,
      isTypeOnly,
      namedImports,
      defaultImport,
      namespaceImport
    };
  }

  static findExportDeclarations(sourceFile: ts.SourceFile): ts.ExportDeclaration[] {
    const exports: ts.ExportDeclaration[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isExportDeclaration(node)) {
        exports.push(node);
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return exports;
  }

  static findAllExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    function visit(node: ts.Node) {
      // Export declarations (export { ... } from '...')
      if (ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier ? (node.moduleSpecifier as ts.StringLiteral).text : undefined;
        const isTypeOnly = !!node.isTypeOnly;
        
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            exports.push({
              name: element.name.text,
              isDefault: false,
              isTypeOnly,
              exportClause: node.exportClause,
              moduleSpecifier
            });
          }
        }
      }
      
      // Export assignments (export = ...)
      else if (ts.isExportAssignment(node)) {
        exports.push({
          name: 'default',
          isDefault: true,
          isTypeOnly: false
        });
      }
      
      // Function declarations with export modifier
      else if (ts.isFunctionDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
        exports.push({
          name: isDefault ? 'default' : (node.name?.text || 'anonymous'),
          isDefault,
          isTypeOnly: false
        });
      }
      
      // Variable declarations with export modifier
      else if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            exports.push({
              name: isDefault ? 'default' : declaration.name.text,
              isDefault,
              isTypeOnly: false
            });
          }
        }
      }
      
      // Class declarations with export modifier
      else if (ts.isClassDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
        exports.push({
          name: isDefault ? 'default' : (node.name?.text || 'anonymous'),
          isDefault,
          isTypeOnly: false
        });
      }
      
      // Interface declarations with export modifier
      else if (ts.isInterfaceDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isTypeOnly: true
        });
      }
      
      // Type alias declarations with export modifier
      else if (ts.isTypeAliasDeclaration(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.push({
          name: node.name.text,
          isDefault: false,
          isTypeOnly: true
        });
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return exports;
  }

  static findFunctionDeclarations(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
    const functions: ts.FunctionDeclaration[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node)) {
        functions.push(node);
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return functions;
  }

  static isAsyncFunction(node: ts.FunctionDeclaration): boolean {
    return !!(node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword));
  }

  static hasExplicitReturnType(node: ts.FunctionDeclaration): boolean {
    return !!node.type;
  }

  static getTypeAnnotations(sourceFile: ts.SourceFile): TypeAnnotationInfo[] {
    const typeAnnotations: TypeAnnotationInfo[] = [];
    const typeChecker = this.createTypeChecker([sourceFile.fileName]);
    
    function visit(node: ts.Node) {
      let typeInfo: TypeAnnotationInfo | undefined;
      
      // Function declarations
      if (ts.isFunctionDeclaration(node)) {
        const type = typeChecker?.getTypeAtLocation(node);
        const typeText = type ? typeChecker.typeToString(type) : 'unknown';
        
        typeInfo = {
          node,
          typeText,
          isExplicit: !!node.type,
          hasAnyType: typeText.includes('any'),
          hasNonNullAssertion: false
        };
      }
      
      // Variable declarations
      else if (ts.isVariableDeclaration(node)) {
        const type = typeChecker?.getTypeAtLocation(node);
        const typeText = type ? typeChecker.typeToString(type) : 'unknown';
        
        typeInfo = {
          node,
          typeText,
          isExplicit: !!node.type,
          hasAnyType: typeText.includes('any'),
          hasNonNullAssertion: false
        };
      }
      
      // Non-null assertions
      else if (ts.isNonNullExpression(node)) {
        const type = typeChecker?.getTypeAtLocation(node);
        const typeText = type ? typeChecker.typeToString(type) : 'unknown';
        
        typeInfo = {
          node,
          typeText,
          isExplicit: false,
          hasAnyType: typeText.includes('any'),
          hasNonNullAssertion: true
        };
      }
      
      if (typeInfo) {
        typeAnnotations.push(typeInfo);
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return typeAnnotations;
  }

  static findAnyTypeUsages(sourceFile: ts.SourceFile): ts.Node[] {
    const anyUsages: ts.Node[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === 'any') {
        anyUsages.push(node);
      } else if (node.kind === ts.SyntaxKind.AnyKeyword) {
        anyUsages.push(node);
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return anyUsages;
  }

  static findNonNullAssertions(sourceFile: ts.SourceFile): ts.NonNullExpression[] {
    const assertions: ts.NonNullExpression[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isNonNullExpression(node)) {
        assertions.push(node);
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return assertions;
  }

  static findAsyncFunctionsWithoutReturnType(sourceFile: ts.SourceFile): ts.FunctionDeclaration[] {
    const functions: ts.FunctionDeclaration[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && this.isAsyncFunction(node) && !this.hasExplicitReturnType(node)) {
        functions.push(node);
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return functions;
  }

  private static createTypeChecker(filePaths: string[]): ts.TypeChecker | undefined {
    try {
      const program = this.createProgram(filePaths);
      return program.getTypeChecker();
    } catch (error) {
      console.warn('Failed to create type checker:', error);
      return undefined;
    }
  }

  static getNodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
    return node.getFullText(sourceFile).trim();
  }

  static getNodePosition(node: ts.Node, sourceFile: ts.SourceFile): { line: number; character: number } {
    const position = ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile));
    return { line: position.line + 1, character: position.character + 1 };
  }
}