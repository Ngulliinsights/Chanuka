#!/usr/bin/env tsx

/**
 * Project Structure Verification Script
 * 
 * This script verifies that all files, including tests, align with the current
 * project structure as documented in docs/project-structure.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface StructureIssue {
  type: 'missing_file' | 'outdated_import' | 'wrong_location' | 'missing_test' | 'orphaned_test';
  file: string;
  expected?: string;
  actual?: string;
  suggestion: string;
}

interface ProjectStructure {
  directories: Set<string>;
  files: Set<string>;
  testFiles: Set<string>;
  sourceFiles: Set<string>;
}

class ProjectStructureVerifier {
  private issues: StructureIssue[] = [];
  private currentStructure: ProjectStructure;
  private expectedStructure: ProjectStructure;

  constructor() {
    this.currentStructure = {
      directories: new Set(),
      files: new Set(),
      testFiles: new Set(),
      sourceFiles: new Set()
    };
    this.expectedStructure = {
      directories: new Set(),
      files: new Set(),
      testFiles: new Set(),
      sourceFiles: new Set()
    };
  }

  async verify(): Promise<void> {
    console.log('🔍 Starting project structure verification...\n');

    // Step 1: Scan current project structure
    await this.scanCurrentStructure();
    
    // Step 2: Load expected structure from docs
    await this.loadExpectedStructure();
    
    // Step 3: Compare structures
    await this.compareStructures();
    
    // Step 4: Verify test files
    await this.verifyTestFiles();
    
    // Step 5: Check import paths
    await this.verifyImportPaths();
    
    // Step 6: Generate report
    this.generateReport();
    
    // Step 7: Generate fix script
    await this.generateFixScript();
  }

  private async scanCurrentStructure(): Promise<void> {
    console.log('📁 Scanning current project structure...');
    
    const allFiles = await glob('**/*', {
      ignore: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '*.log',
        '.env*'
      ],
      dot: false
    });

    for (const file of allFiles) {
      const fullPath = path.resolve(file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        this.currentStructure.directories.add(file);
      } else {
        this.currentStructure.files.add(file);
        
        if (this.isTestFile(file)) {
          this.currentStructure.testFiles.add(file);
        } else if (this.isSourceFile(file)) {
          this.currentStructure.sourceFiles.add(file);
        }
      }
    }
    
    console.log(`   Found ${this.currentStructure.files.size} files`);
    console.log(`   Found ${this.currentStructure.testFiles.size} test files`);
    console.log(`   Found ${this.currentStructure.sourceFiles.size} source files\n`);
  }

  private async loadExpectedStructure(): Promise<void> {
    console.log('📋 Loading expected structure from documentation...');
    
    try {
      const structureDoc = fs.readFileSync('docs/project-structure.md', 'utf-8');
      this.parseStructureDoc(structureDoc);
      console.log(`   Loaded expected structure with ${this.expectedStructure.files.size} files\n`);
    } catch (error) {
      console.warn('⚠️  Could not load project-structure.md, using current structure as baseline\n');
      this.expectedStructure = { ...this.currentStructure };
    }
  }

  private parseStructureDoc(content: string): void {
    const lines = content.split('\n');
    let currentPath = '';
    
    for (const line of lines) {
      if (line.includes('├──') || line.includes('└──')) {
        const match = line.match(/[├└]── (.+)/);
        if (match) {
          const item = match[1];
          const fullPath = currentPath ? `${currentPath}/${item}` : item;
          
          if (item.endsWith('/')) {
            this.expectedStructure.directories.add(fullPath.slice(0, -1));
          } else {
            this.expectedStructure.files.add(fullPath);
            if (this.isTestFile(fullPath)) {
              this.expectedStructure.testFiles.add(fullPath);
            } else if (this.isSourceFile(fullPath)) {
              this.expectedStructure.sourceFiles.add(fullPath);
            }
          }
        }
      } else if (line.match(/^[a-zA-Z]/)) {
        const match = line.match(/^([^/]+)\//);
        if (match) {
          currentPath = match[1];
        }
      }
    }
  }

  private async compareStructures(): Promise<void> {
    console.log('🔄 Comparing current vs expected structure...');
    
    // Check for missing files
    for (const expectedFile of this.expectedStructure.files) {
      if (!this.currentStructure.files.has(expectedFile)) {
        this.issues.push({
          type: 'missing_file',
          file: expectedFile,
          suggestion: `Create missing file: ${expectedFile}`
        });
      }
    }
    
    // Check for files in wrong locations
    for (const currentFile of this.currentStructure.files) {
      if (!this.expectedStructure.files.has(currentFile)) {
        const suggestion = this.suggestCorrectLocation(currentFile);
        if (suggestion) {
          this.issues.push({
            type: 'wrong_location',
            file: currentFile,
            expected: suggestion,
            suggestion: `Move ${currentFile} to ${suggestion}`
          });
        }
      }
    }
    
    console.log(`   Found ${this.issues.length} structure issues\n`);
  }

  private async verifyTestFiles(): Promise<void> {
    console.log('🧪 Verifying test files...');
    
    let testIssues = 0;
    
    // Check for missing test files
    for (const sourceFile of this.currentStructure.sourceFiles) {
      if (this.shouldHaveTest(sourceFile)) {
        const expectedTestFile = this.getExpectedTestPath(sourceFile);
        if (!this.currentStructure.testFiles.has(expectedTestFile)) {
          this.issues.push({
            type: 'missing_test',
            file: sourceFile,
            expected: expectedTestFile,
            suggestion: `Create test file: ${expectedTestFile}`
          });
          testIssues++;
        }
      }
    }
    
    // Check for orphaned test files
    for (const testFile of this.currentStructure.testFiles) {
      const sourceFile = this.getSourceFileForTest(testFile);
      if (sourceFile && !this.currentStructure.sourceFiles.has(sourceFile)) {
        this.issues.push({
          type: 'orphaned_test',
          file: testFile,
          expected: sourceFile,
          suggestion: `Remove orphaned test or create source file: ${sourceFile}`
        });
        testIssues++;
      }
    }
    
    console.log(`   Found ${testIssues} test-related issues\n`);
  }

  private async verifyImportPaths(): Promise<void> {
    console.log('📦 Verifying import paths...');
    
    let importIssues = 0;
    
    for (const file of this.currentStructure.sourceFiles) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const imports = this.extractImports(content);
          
          for (const importPath of imports) {
            if (this.isRelativeImport(importPath)) {
              const resolvedPath = this.resolveImportPath(file, importPath);
              if (!this.currentStructure.files.has(resolvedPath)) {
                this.issues.push({
                  type: 'outdated_import',
                  file,
                  actual: importPath,
                  expected: this.suggestCorrectImport(file, importPath),
                  suggestion: `Fix import in ${file}: ${importPath}`
                });
                importIssues++;
              }
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    
    console.log(`   Found ${importIssues} import issues\n`);
  }

  private generateReport(): void {
    console.log('📊 VERIFICATION REPORT');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('✅ No issues found! Project structure is aligned.\n');
      return;
    }
    
    const issuesByType = this.groupIssuesByType();
    
    for (const [type, issues] of Object.entries(issuesByType)) {
      console.log(`\n${this.getIssueTypeIcon(type)} ${this.getIssueTypeTitle(type)} (${issues.length})`);
      console.log('-'.repeat(30));
      
      for (const issue of issues.slice(0, 10)) { // Show first 10 of each type
        console.log(`  • ${issue.suggestion}`);
      }
      
      if (issues.length > 10) {
        console.log(`  ... and ${issues.length - 10} more`);
      }
    }
    
    console.log(`\n📈 SUMMARY: ${this.issues.length} total issues found\n`);
  }

  private async generateFixScript(): Promise<void> {
    console.log('🔧 Generating fix script...');
    
    const fixScript = this.generateFixScriptContent();
    fs.writeFileSync('scripts/fix-project-structure.ts', fixScript);
    
    console.log('   Created: scripts/fix-project-structure.ts');
    console.log('   Run with: npm run fix-structure\n');
  }

  private generateFixScriptContent(): string {
    return `#!/usr/bin/env tsx

/**
 * Auto-generated Project Structure Fix Script
 * Generated on: ${new Date().toISOString()}
 */

import * as fs from 'fs';
import * as path from 'path';

async function fixProjectStructure(): Promise<void> {
  console.log('🔧 Fixing project structure issues...');
  
  ${this.generateFixCommands()}
  
  console.log('✅ Project structure fixes completed!');
}

${this.generateHelperFunctions()}

// Run the fix script
fixProjectStructure().catch(console.error);
`;
  }

  private generateFixCommands(): string {
    const commands: string[] = [];
    
    for (const issue of this.issues) {
      switch (issue.type) {
        case 'missing_file':
          commands.push(`  await createMissingFile('${issue.file}');`);
          break;
        case 'wrong_location':
          commands.push(`  await moveFile('${issue.file}', '${issue.expected}');`);
          break;
        case 'missing_test':
          commands.push(`  await createTestFile('${issue.expected}', '${issue.file}');`);
          break;
        case 'orphaned_test':
          commands.push(`  await removeOrphanedTest('${issue.file}');`);
          break;
        case 'outdated_import':
          commands.push(`  await fixImport('${issue.file}', '${issue.actual}', '${issue.expected}');`);
          break;
      }
    }
    
    return commands.join('\n');
  }

  private generateHelperFunctions(): string {
    return `
async function createMissingFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const template = getFileTemplate(filePath);
  fs.writeFileSync(filePath, template);
  console.log(\`Created: \${filePath}\`);
}

async function moveFile(from: string, to: string): Promise<void> {
  if (fs.existsSync(from)) {
    const dir = path.dirname(to);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(from, to);
    console.log(\`Moved: \${from} → \${to}\`);
  }
}

async function createTestFile(testPath: string, sourcePath: string): Promise<void> {
  const dir = path.dirname(testPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const template = generateTestTemplate(sourcePath);
  fs.writeFileSync(testPath, template);
  console.log(\`Created test: \${testPath}\`);
}

async function removeOrphanedTest(testPath: string): Promise<void> {
  if (fs.existsSync(testPath)) {
    fs.unlinkSync(testPath);
    console.log(\`Removed orphaned test: \${testPath}\`);
  }
}

async function fixImport(filePath: string, oldImport: string, newImport: string): Promise<void> {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(oldImport, newImport);
    fs.writeFileSync(filePath, content);
    console.log(\`Fixed import in: \${filePath}\`);
  }
}

function getFileTemplate(filePath: string): string {
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) {
    return generateTestTemplate(filePath);
  }
  
  if (filePath.endsWith('.tsx')) {
    return \`import React from 'react';

export default function Component() {
  return <div>Component</div>;
}
\`;
  }
  
  if (filePath.endsWith('.ts')) {
    return \`// TODO: Implement \${path.basename(filePath, '.ts')}

export {};
\`;
  }
  
  return '';
}

function generateTestTemplate(sourcePath: string): string {
  const componentName = path.basename(sourcePath, path.extname(sourcePath));
  
  return \`import { describe, it, expect } from 'vitest';

describe('\${componentName}', () => {
  it('should be implemented', () => {
    // TODO: Add tests for \${componentName}
    expect(true).toBe(true);
  });
});
\`;
}
`;
  }

  // Helper methods
  private isTestFile(file: string): boolean {
    return file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__');
  }

  private isSourceFile(file: string): boolean {
    return (file.endsWith('.ts') || file.endsWith('.tsx')) && !this.isTestFile(file);
  }

  private shouldHaveTest(sourceFile: string): boolean {
    // Skip certain files that don't need tests
    const skipPatterns = [
      'index.ts',
      'types.ts',
      'constants.ts',
      '.d.ts',
      'config/',
      'utils/logger'
    ];
    
    return !skipPatterns.some(pattern => sourceFile.includes(pattern));
  }

  private getExpectedTestPath(sourceFile: string): string {
    const dir = path.dirname(sourceFile);
    const name = path.basename(sourceFile, path.extname(sourceFile));
    const ext = sourceFile.endsWith('.tsx') ? '.test.tsx' : '.test.ts';
    
    // Check if there's already a __tests__ directory
    const testsDir = path.join(dir, '__tests__');
    if (fs.existsSync(testsDir)) {
      return path.join(testsDir, name + ext);
    }
    
    return path.join(dir, name + ext);
  }

  private getSourceFileForTest(testFile: string): string | null {
    const dir = path.dirname(testFile);
    const name = path.basename(testFile)
      .replace('.test.', '.')
      .replace('.spec.', '.');
    
    // Check if test is in __tests__ directory
    if (dir.endsWith('__tests__')) {
      const sourceDir = path.dirname(dir);
      return path.join(sourceDir, name);
    }
    
    return path.join(dir, name);
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private isRelativeImport(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  private resolveImportPath(fromFile: string, importPath: string): string {
    const fromDir = path.dirname(fromFile);
    const resolved = path.resolve(fromDir, importPath);
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      if (fs.existsSync(resolved + ext)) {
        return path.relative('.', resolved + ext);
      }
    }
    
    // Try index files
    for (const ext of extensions) {
      const indexPath = path.join(resolved, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return path.relative('.', indexPath);
      }
    }
    
    return path.relative('.', resolved);
  }

  private suggestCorrectLocation(file: string): string | null {
    // Implement logic to suggest correct file locations
    // This is a simplified version - you can expand based on your conventions
    return null;
  }

  private suggestCorrectImport(fromFile: string, importPath: string): string | null {
    // Implement logic to suggest correct import paths
    return null;
  }

  private groupIssuesByType(): Record<string, StructureIssue[]> {
    const groups: Record<string, StructureIssue[]> = {};
    
    for (const issue of this.issues) {
      if (!groups[issue.type]) {
        groups[issue.type] = [];
      }
      groups[issue.type].push(issue);
    }
    
    return groups;
  }

  private getIssueTypeIcon(type: string): string {
    const icons = {
      missing_file: '📄',
      outdated_import: '📦',
      wrong_location: '📁',
      missing_test: '🧪',
      orphaned_test: '🗑️'
    };
    return icons[type] || '❓';
  }

  private getIssueTypeTitle(type: string): string {
    const titles = {
      missing_file: 'Missing Files',
      outdated_import: 'Outdated Imports',
      wrong_location: 'Files in Wrong Location',
      missing_test: 'Missing Test Files',
      orphaned_test: 'Orphaned Test Files'
    };
    return titles[type] || type;
  }
}

// Main execution
async function main(): Promise<void> {
  const verifier = new ProjectStructureVerifier();
  await verifier.verify();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProjectStructureVerifier };