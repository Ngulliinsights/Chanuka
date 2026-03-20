/**
 * API Documentation Validation Script
 * 
 * Validates that all infrastructure modules have:
 * - README.md files
 * - JSDoc comments on all exports
 * - Complete documentation coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';

interface ValidationResult {
  module: string;
  hasReadme: boolean;
  indexFile: string;
  exports: ExportInfo[];
  coverage: number;
  issues: string[];
}

interface ExportInfo {
  name: string;
  type: string;
  hasJSDoc: boolean;
  hasDescription: boolean;
  hasExample: boolean;
  line: number;
}

const INFRASTRUCTURE_DIR = path.join(process.cwd(), 'client/src/infrastructure');

/**
 * Get all infrastructure module directories
 */
function getModuleDirectories(): string[] {
  const entries = fs.readdirSync(INFRASTRUCTURE_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'scripts')
    .map(entry => entry.name);
}

/**
 * Check if module has README.md
 */
function hasReadme(modulePath: string): boolean {
  const readmePath = path.join(modulePath, 'README.md');
  return fs.existsSync(readmePath);
}

/**
 * Analyze exports in index.ts file
 */
function analyzeExports(sourceFile: SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];

  // Get all export declarations
  const exportDeclarations = sourceFile.getExportDeclarations();
  
  for (const exportDecl of exportDeclarations) {
    const namedExports = exportDecl.getNamedExports();
    
    for (const namedExport of namedExports) {
      const name = namedExport.getName();
      const jsDocs = namedExport.getJsDocs();
      
      exports.push({
        name,
        type: 'named-export',
        hasJSDoc: jsDocs.length > 0,
        hasDescription: jsDocs.length > 0 && jsDocs[0].getDescription().trim().length > 0,
        hasExample: jsDocs.some(doc => doc.getTags().some(tag => tag.getTagName() === 'example')),
        line: namedExport.getStartLineNumber()
      });
    }
  }

  // Get all exported functions
  const functions = sourceFile.getFunctions().filter(f => f.isExported());
  for (const func of functions) {
    const jsDocs = func.getJsDocs();
    exports.push({
      name: func.getName() || 'anonymous',
      type: 'function',
      hasJSDoc: jsDocs.length > 0,
      hasDescription: jsDocs.length > 0 && jsDocs[0].getDescription().trim().length > 0,
      hasExample: jsDocs.some(doc => doc.getTags().some(tag => tag.getTagName() === 'example')),
      line: func.getStartLineNumber()
    });
  }

  // Get all exported classes
  const classes = sourceFile.getClasses().filter(c => c.isExported());
  for (const cls of classes) {
    const jsDocs = cls.getJsDocs();
    exports.push({
      name: cls.getName() || 'anonymous',
      type: 'class',
      hasJSDoc: jsDocs.length > 0,
      hasDescription: jsDocs.length > 0 && jsDocs[0].getDescription().trim().length > 0,
      hasExample: jsDocs.some(doc => doc.getTags().some(tag => tag.getTagName() === 'example')),
      line: cls.getStartLineNumber()
    });
  }

  // Get all exported variables/constants
  const variables = sourceFile.getVariableStatements().filter(v => v.isExported());
  for (const varStmt of variables) {
    const declarations = varStmt.getDeclarations();
    for (const decl of declarations) {
      const jsDocs = varStmt.getJsDocs();
      exports.push({
        name: decl.getName(),
        type: 'variable',
        hasJSDoc: jsDocs.length > 0,
        hasDescription: jsDocs.length > 0 && jsDocs[0].getDescription().trim().length > 0,
        hasExample: jsDocs.some(doc => doc.getTags().some(tag => tag.getTagName() === 'example')),
        line: varStmt.getStartLineNumber()
      });
    }
  }

  return exports;
}

/**
 * Validate a single module
 */
function validateModule(moduleName: string, project: Project): ValidationResult {
  const modulePath = path.join(INFRASTRUCTURE_DIR, moduleName);
  const indexPath = path.join(modulePath, 'index.ts');
  const issues: string[] = [];

  // Check README
  const hasReadmeFile = hasReadme(modulePath);
  if (!hasReadmeFile) {
    issues.push('Missing README.md file');
  }

  // Check index.ts exists
  if (!fs.existsSync(indexPath)) {
    return {
      module: moduleName,
      hasReadme: hasReadmeFile,
      indexFile: indexPath,
      exports: [],
      coverage: 0,
      issues: [...issues, 'Missing index.ts file']
    };
  }

  // Analyze exports
  const sourceFile = project.getSourceFile(indexPath);
  if (!sourceFile) {
    return {
      module: moduleName,
      hasReadme: hasReadmeFile,
      indexFile: indexPath,
      exports: [],
      coverage: 0,
      issues: [...issues, 'Could not parse index.ts file']
    };
  }

  const exports = analyzeExports(sourceFile);
  
  // Check for undocumented exports
  const undocumented = exports.filter(e => !e.hasJSDoc || !e.hasDescription);
  if (undocumented.length > 0) {
    issues.push(`${undocumented.length} exports missing JSDoc comments`);
    undocumented.forEach(exp => {
      issues.push(`  - ${exp.name} (${exp.type}) at line ${exp.line}`);
    });
  }

  // Calculate coverage
  const documented = exports.filter(e => e.hasJSDoc && e.hasDescription).length;
  const coverage = exports.length > 0 ? (documented / exports.length) * 100 : 100;

  return {
    module: moduleName,
    hasReadme: hasReadmeFile,
    indexFile: indexPath,
    exports,
    coverage,
    issues
  };
}

/**
 * Generate coverage report
 */
function generateReport(results: ValidationResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('API DOCUMENTATION COVERAGE REPORT');
  console.log('='.repeat(80) + '\n');

  const totalModules = results.length;
  const modulesWithReadme = results.filter(r => r.hasReadme).length;
  const totalExports = results.reduce((sum, r) => sum + r.exports.length, 0);
  const documentedExports = results.reduce((sum, r) => 
    sum + r.exports.filter(e => e.hasJSDoc && e.hasDescription).length, 0
  );
  const overallCoverage = totalExports > 0 ? (documentedExports / totalExports) * 100 : 100;

  console.log('SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Modules: ${totalModules}`);
  console.log(`Modules with README: ${modulesWithReadme}/${totalModules} (${((modulesWithReadme/totalModules)*100).toFixed(1)}%)`);
  console.log(`Total Exports: ${totalExports}`);
  console.log(`Documented Exports: ${documentedExports}/${totalExports} (${overallCoverage.toFixed(1)}%)`);
  console.log(`Overall Coverage: ${overallCoverage.toFixed(1)}%\n`);

  // Module-by-module breakdown
  console.log('MODULE BREAKDOWN');
  console.log('-'.repeat(80));
  
  results.sort((a, b) => a.coverage - b.coverage);
  
  for (const result of results) {
    const status = result.coverage === 100 && result.hasReadme ? '✅' : '⚠️';
    console.log(`\n${status} ${result.module}`);
    console.log(`   README: ${result.hasReadme ? '✅' : '❌'}`);
    console.log(`   Exports: ${result.exports.length}`);
    console.log(`   Coverage: ${result.coverage.toFixed(1)}%`);
    
    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      result.issues.forEach(issue => console.log(`     ${issue}`));
    }
  }

  // Modules needing attention
  const needsAttention = results.filter(r => r.coverage < 100 || !r.hasReadme);
  if (needsAttention.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('MODULES NEEDING ATTENTION');
    console.log('='.repeat(80));
    needsAttention.forEach(r => {
      console.log(`\n${r.module}:`);
      r.issues.forEach(issue => console.log(`  - ${issue}`));
    });
  }

  // Success criteria
  console.log('\n' + '='.repeat(80));
  console.log('SUCCESS CRITERIA');
  console.log('='.repeat(80));
  console.log(`✅ All modules have README.md: ${modulesWithReadme === totalModules ? 'PASS' : 'FAIL'}`);
  console.log(`✅ 100% JSDoc coverage: ${overallCoverage === 100 ? 'PASS' : 'FAIL'}`);
  console.log(`✅ All exports documented: ${documentedExports === totalExports ? 'PASS' : 'FAIL'}`);
  
  const allPass = modulesWithReadme === totalModules && overallCoverage === 100;
  console.log(`\n${allPass ? '✅ ALL CHECKS PASSED' : '⚠️ SOME CHECKS FAILED'}\n`);

  // Exit with appropriate code
  process.exit(allPass ? 0 : 1);
}

/**
 * Main validation function
 */
async function main() {
  console.log('Validating API documentation coverage...\n');

  // Initialize TypeScript project
  const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), 'client/tsconfig.json'),
    skipAddingFilesFromTsConfig: true
  });

  // Get all modules
  const modules = getModuleDirectories();
  console.log(`Found ${modules.length} infrastructure modules\n`);

  // Validate each module
  const results: ValidationResult[] = [];
  for (const module of modules) {
    const result = validateModule(module, project);
    results.push(result);
  }

  // Generate report
  generateReport(results);
}

// Run validation
main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
