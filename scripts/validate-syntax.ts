#!/usr/bin/env tsx

import * as path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';

interface Issue {
  file: string;
  line: number;
  column: number;
  message: string;
  type: 'syntax' | 'regex' | 'import' | 'other';
  severity: 'error' | 'warning';
}

/**
 * Validates TypeScript/JavaScript files in the client directory for:
 * - Syntax errors and type issues
 * - Invalid regex patterns
 * - Import paths with backslashes (Windows path separators)
 * 
 * This tool helps catch common issues before they reach production,
 * particularly cross-platform path problems that can break builds.
 */
async function validateSyntax(): Promise<void> {
  const clientDir = path.join(process.cwd(), 'client');
  const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  
  // Gather all matching files from the client directory
  const files = await gatherFiles(clientDir, patterns);
  
  if (files.length === 0) {
    console.log('No files found to validate.');
    process.exit(0);
  }

  console.log(`Validating ${files.length} file(s)...`);
  
  const issues: Issue[] = [];
  
  // Create TypeScript program with proper configuration
  const program = createTypeScriptProgram(files);
  
  // Collect syntax and type errors from TypeScript compiler
  collectCompilerDiagnostics(program, issues);
  
  // Perform custom validations on each source file
  for (const file of files) {
    const sourceFile = program.getSourceFile(file);
    if (!sourceFile) continue;
    
    validateSourceFile(sourceFile, file, issues);
  }

  // Report results with detailed statistics
  reportResults(issues, files.length);
}

/**
 * Gathers all files matching the given patterns in the specified directory.
 * Uses glob patterns with sensible defaults to exclude common build artifacts
 * and dependencies that don't need validation.
 */
async function gatherFiles(baseDir: string, patterns: string[]): Promise<string[]> {
  const allFiles = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, { 
      cwd: baseDir, 
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**']
    });
    
    // Use Set to automatically handle duplicates if patterns overlap
    for (const match of matches) {
      allFiles.add(match);
    }
  }
  
  return Array.from(allFiles).sort();
}

/**
 * Creates a TypeScript program with appropriate compiler options.
 * These settings mirror typical modern React/TypeScript projects
 * and ensure the validation matches what developers expect.
 */
function createTypeScriptProgram(files: string[]): ts.Program {
  const clientDir = path.join(process.cwd(), 'client');
  
  return ts.createProgram({
    rootNames: files,
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      allowJs: true,
      resolveJsonModule: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: true,
      baseUrl: clientDir,
      paths: {
        '@/*': ['src/*'],
        '@client/*': ['src/*'],
        '@shared': ['../shared'],
        '@shared/*': ['../shared/*']
      },
      // Suppress certain noisy diagnostics that don't affect runtime
      suppressExcessPropertyErrors: false,
      suppressImplicitAnyIndexErrors: false
    }
  });
}

/**
 * Collects all compiler diagnostics and converts them to Issue objects.
 * Filters out library definition file errors since we're only checking
 * the project source code, not third-party type definitions.
 */
function collectCompilerDiagnostics(program: ts.Program, issues: Issue[]): void {
  const diagnostics = ts.getPreEmitDiagnostics(program);
  
  for (const diag of diagnostics) {
    // Skip diagnostics that don't have a source file or position
    if (!diag.file || diag.start === undefined) continue;
    
    // Skip diagnostics from node_modules and type definition files
    const fileName = diag.file.fileName;
    if (fileName.includes('node_modules') || fileName.endsWith('.d.ts')) {
      continue;
    }
    
    const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    
    // Determine severity based on TypeScript's category
    const severity = diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning';
    
    issues.push({
      file: path.relative(process.cwd(), fileName),
      line: line + 1,
      column: character + 1,
      message,
      type: 'syntax',
      severity
    });
  }
}

/**
 * Validates a single source file for custom issues like invalid regex
 * and import paths. This visitor pattern allows us to traverse the
 * entire abstract syntax tree (AST) efficiently.
 */
function validateSourceFile(sourceFile: ts.SourceFile, filePath: string, issues: Issue[]): void {
  const relativeFilePath = path.relative(process.cwd(), filePath);
  
  // Recursive visitor function that checks each node in the syntax tree
  function visit(node: ts.Node): void {
    // Check for invalid regex patterns that would fail at runtime
    if (ts.isRegularExpressionLiteral(node)) {
      validateRegexLiteral(node, sourceFile, relativeFilePath, issues);
    }
    
    // Check for static import statements with backslashes
    if (ts.isImportDeclaration(node)) {
      validateImportDeclaration(node, sourceFile, relativeFilePath, issues);
    }
    
    // Check for dynamic import() calls with backslashes
    if (ts.isCallExpression(node)) {
      validateDynamicImport(node, sourceFile, relativeFilePath, issues);
    }
    
    // Check for require() calls with backslashes (CommonJS imports)
    if (ts.isCallExpression(node)) {
      validateRequireCall(node, sourceFile, relativeFilePath, issues);
    }
    
    // Recursively visit all child nodes
    ts.forEachChild(node, visit);
  }
  
  ts.forEachChild(sourceFile, visit);
}

/**
 * Validates that a regex literal can be compiled without errors.
 * We do this by attempting to construct the RegExp - if it throws,
 * we know the pattern is invalid and would fail at runtime.
 */
function validateRegexLiteral(
  node: ts.RegularExpressionLiteral, 
  sourceFile: ts.SourceFile, 
  filePath: string, 
  issues: Issue[]
): void {
  try {
    // Extract the pattern from the literal (removing the slashes and flags)
    const regexText = node.text;
    
    // Attempt to construct the regex to verify it's valid
    new RegExp(regexText);
  } catch (error) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    issues.push({
      file: filePath,
      line: line + 1,
      column: character + 1,
      message: `Invalid regex pattern: ${node.text} - ${errorMessage}`,
      type: 'regex',
      severity: 'error'
    });
  }
}

/**
 * Validates that import declarations use forward slashes, not backslashes.
 * Backslashes in import paths cause issues on non-Windows systems and
 * with most bundlers, even though Windows file paths use backslashes.
 */
function validateImportDeclaration(
  node: ts.ImportDeclaration, 
  sourceFile: ts.SourceFile, 
  filePath: string, 
  issues: Issue[]
): void {
  const moduleSpecifier = node.moduleSpecifier;
  
  if (!ts.isStringLiteral(moduleSpecifier)) return;
  
  const importPath = moduleSpecifier.text;
  
  if (importPath.includes('\\')) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.getStart());
    const fixedPath = importPath.replace(/\\/g, '/');
    
    issues.push({
      file: filePath,
      line: line + 1,
      column: character + 1,
      message: `Import path uses backslashes (should use forward slashes): "${importPath}" → "${fixedPath}"`,
      type: 'import',
      severity: 'error'
    });
  }
}

/**
 * Validates that dynamic import() calls use forward slashes, not backslashes.
 * Dynamic imports are increasingly common with code-splitting and lazy loading,
 * so catching these path issues is important.
 */
function validateDynamicImport(
  node: ts.CallExpression, 
  sourceFile: ts.SourceFile, 
  filePath: string, 
  issues: Issue[]
): void {
  // Check if this is an import() call (not just any function call)
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return;
  
  const args = node.arguments;
  if (args.length === 0) return;
  
  const firstArg = args[0];
  if (!ts.isStringLiteral(firstArg)) return;
  
  const importPath = firstArg.text;
  
  if (importPath.includes('\\')) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(firstArg.getStart());
    const fixedPath = importPath.replace(/\\/g, '/');
    
    issues.push({
      file: filePath,
      line: line + 1,
      column: character + 1,
      message: `Dynamic import path uses backslashes (should use forward slashes): "${importPath}" → "${fixedPath}"`,
      type: 'import',
      severity: 'error'
    });
  }
}

/**
 * Validates that require() calls use forward slashes, not backslashes.
 * While require() is CommonJS and less common in modern code, it's
 * still worth checking for consistency.
 */
function validateRequireCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
  issues: Issue[]
): void {
  // Check if this is a require() call
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'require') {
    return;
  }
  
  const args = node.arguments;
  if (args.length === 0) return;
  
  const firstArg = args[0];
  if (!ts.isStringLiteral(firstArg)) return;
  
  const requirePath = firstArg.text;
  
  if (requirePath.includes('\\')) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(firstArg.getStart());
    const fixedPath = requirePath.replace(/\\/g, '/');
    
    issues.push({
      file: filePath,
      line: line + 1,
      column: character + 1,
      message: `require() path uses backslashes (should use forward slashes): "${requirePath}" → "${fixedPath}"`,
      type: 'import',
      severity: 'error'
    });
  }
}

/**
 * Reports validation results and exits with appropriate status code.
 * Provides detailed statistics to help developers understand the scope
 * of issues found and where to focus their attention.
 */
function reportResults(issues: Issue[], totalFiles: number): void {
  if (issues.length === 0) {
    console.log(`✓ No issues found in ${totalFiles} file(s).`);
    process.exit(0);
  }
  
  // Separate errors and warnings for clearer reporting
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  console.error(`\n✗ Found ${issues.length} issue(s) in ${totalFiles} file(s):`);
  console.error(`  ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  
  // Group issues by type for better readability
  const issuesByType = groupIssuesByType(issues);
  
  for (const [type, typeIssues] of Object.entries(issuesByType)) {
    const typeErrors = typeIssues.filter(i => i.severity === 'error');
    const typeWarnings = typeIssues.filter(i => i.severity === 'warning');
    
    console.error(`${type.toUpperCase()} (${typeIssues.length} - ${typeErrors.length} errors, ${typeWarnings.length} warnings):`);
    
    // Sort issues by file, then line number for easier navigation
    const sortedIssues = typeIssues.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    });
    
    for (const issue of sortedIssues) {
      const severityIcon = issue.severity === 'error' ? '✗' : '⚠';
      console.error(`  ${severityIcon} ${issue.file}:${issue.line}:${issue.column}`);
      console.error(`    ${issue.message}\n`);
    }
  }
  
  // Exit with error code only if there are actual errors (not just warnings)
  process.exit(errors.length > 0 ? 1 : 0);
}

/**
 * Groups issues by their type for organized reporting.
 * This makes it easier to see patterns in the codebase,
 * like "we have 20 import path issues" vs scattered individual problems.
 */
function groupIssuesByType(issues: Issue[]): Record<string, Issue[]> {
  const grouped: Record<string, Issue[]> = {};
  
  for (const issue of issues) {
    if (!grouped[issue.type]) {
      grouped[issue.type] = [];
    }
    grouped[issue.type].push(issue);
  }
  
  return grouped;
}

// Run validation and handle any unexpected errors gracefully
validateSyntax().catch((error) => {
  console.error('Unexpected error during validation:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});