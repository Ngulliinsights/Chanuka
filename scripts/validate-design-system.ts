#!/usr/bin/env tsx

/**
 * Design System Validation Script
 * 
 * Validates the shared/design-system structure for:
 * - Internal consistency
 * - Proper exports
 * - Component availability
 * - Import/export alignment
 * - Missing components
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ComponentInfo {
  name: string;
  path: string;
  exports: string[];
  imports: string[];
  category: 'interactive' | 'feedback' | 'media' | 'typography' | 'primitive' | 'token' | 'theme' | 'util';
  hasTypes: boolean;
  hasStories: boolean;
  hasTests: boolean;
}

interface ValidationIssue {
  type: 'missing-export' | 'broken-import' | 'missing-component' | 'inconsistent-structure' | 'duplicate-export';
  severity: 'error' | 'warning' | 'info';
  file: string;
  description: string;
  suggestion: string;
}

class DesignSystemValidator {
  private designSystemDir = 'client/src/shared/design-system';
  private components: Map<string, ComponentInfo> = new Map();
  private issues: ValidationIssue[] = [];
  private expectedComponents: Set<string> = new Set();
  private actualExports: Map<string, string[]> = new Map();

  async run(): Promise<void> {
    console.log('🎨 Validating Design System Structure...\n');

    await this.analyzeComponents();
    await this.validateStructure();
    await this.validateExports();
    await this.validateImports();
    await this.checkMissingComponents();
    await this.validateConsistency();
    
    this.generateReport();
    await this.generateFixScript();
  }

  private async analyzeComponents(): Promise<void> {
    console.log('📊 Analyzing design system components...');

    const componentFiles = await glob(`${this.designSystemDir}/**/*.{ts,tsx}`, {
      ignore: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/node_modules/**'
      ]
    });

    for (const file of componentFiles) {
      try {
        const component = await this.analyzeComponent(file);
        if (component) {
          this.components.set(component.name, component);
        }
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }

    console.log(`✅ Analyzed ${this.components.size} components`);
  }

  private async analyzeComponent(filePath: string): Promise<ComponentInfo | null> {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(this.designSystemDir, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Skip index files for individual analysis
    if (fileName === 'index') return null;

    const exports = this.extractExports(content);
    const imports = this.extractImports(content);
    const category = this.determineCategory(relativePath);

    // Check for related files
    const basePath = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    
    const hasTypes = await this.fileExists(path.join(basePath, `${baseName}.types.ts`));
    const hasStories = await this.fileExists(path.join(basePath, `${baseName}.stories.tsx`));
    const hasTests = await this.fileExists(path.join(basePath, `${baseName}.test.tsx`));

    return {
      name: fileName,
      path: filePath,
      exports,
      imports,
      category,
      hasTypes,
      hasStories,
      hasTests
    };
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Export statements
    const exportStatementRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportStatementRegex.exec(content)) !== null) {
      const namedExports = match[1].split(',').map(e => e.trim().split(' as ')[0].trim());
      exports.push(...namedExports);
    }

    // Default exports
    if (content.includes('export default')) {
      const defaultExportRegex = /export\s+default\s+(?:function\s+)?(\w+)/;
      const defaultMatch = defaultExportRegex.exec(content);
      if (defaultMatch) {
        exports.push(defaultMatch[1]);
      } else {
        exports.push('default');
      }
    }

    return exports;
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private determineCategory(relativePath: string): ComponentInfo['category'] {
    if (relativePath.includes('/interactive/')) return 'interactive';
    if (relativePath.includes('/feedback/')) return 'feedback';
    if (relativePath.includes('/media/')) return 'media';
    if (relativePath.includes('/typography/')) return 'typography';
    if (relativePath.includes('/primitives/')) return 'primitive';
    if (relativePath.includes('/tokens/')) return 'token';
    if (relativePath.includes('/themes/')) return 'theme';
    if (relativePath.includes('/utils/')) return 'util';
    return 'primitive';
  }

  private async validateStructure(): Promise<void> {
    console.log('🏗️  Validating design system structure...');

    const expectedDirectories = [
      'accessibility',
      'feedback',
      'interactive', 
      'media',
      'primitives',
      'styles',
      'themes',
      'tokens',
      'typography',
      'utils'
    ];

    for (const dir of expectedDirectories) {
      const dirPath = path.join(this.designSystemDir, dir);
      if (!(await this.directoryExists(dirPath))) {
        this.issues.push({
          type: 'inconsistent-structure',
          severity: 'error',
          file: dirPath,
          description: `Missing required directory: ${dir}`,
          suggestion: `Create directory: ${dir}`
        });
      } else {
        // Check for index file
        const indexPath = path.join(dirPath, 'index.ts');
        if (!(await this.fileExists(indexPath))) {
          this.issues.push({
            type: 'missing-export',
            severity: 'warning',
            file: indexPath,
            description: `Missing index file in ${dir}`,
            suggestion: `Create index.ts with proper exports`
          });
        }
      }
    }
  }

  private async validateExports(): Promise<void> {
    console.log('📤 Validating exports...');

    // Check main design system index
    const mainIndexPath = path.join(this.designSystemDir, 'index.ts');
    if (await this.fileExists(mainIndexPath)) {
      const content = await fs.readFile(mainIndexPath, 'utf-8');
      const exports = this.extractExports(content);
      this.actualExports.set('main', exports);

      // Check if all category directories are exported
      const expectedExports = ['feedback', 'interactive', 'media', 'typography', 'tokens', 'themes', 'accessibility', 'styles'];
      for (const expectedExport of expectedExports) {
        if (!content.includes(`from './${expectedExport}'`)) {
          this.issues.push({
            type: 'missing-export',
            severity: 'warning',
            file: mainIndexPath,
            description: `Main index missing export from ${expectedExport}`,
            suggestion: `Add: export * from './${expectedExport}';`
          });
        }
      }
    }

    // Validate category exports
    await this.validateCategoryExports();
  }

  private async validateCategoryExports(): Promise<void> {
    const categories = ['interactive', 'feedback', 'media', 'typography'];
    
    for (const category of categories) {
      const categoryPath = path.join(this.designSystemDir, category);
      const indexPath = path.join(categoryPath, 'index.ts');
      
      if (await this.fileExists(indexPath)) {
        const content = await fs.readFile(indexPath, 'utf-8');
        const exports = this.extractExports(content);
        this.actualExports.set(category, exports);

        // Find all components in this category
        const categoryComponents = Array.from(this.components.values())
          .filter(c => c.category === category);

        // Check if all components are exported
        for (const component of categoryComponents) {
          const componentExports = component.exports;
          const hasExport = componentExports.some(exp => 
            content.includes(exp) || content.includes(`from './${component.name}'`)
          );

          if (!hasExport) {
            this.issues.push({
              type: 'missing-export',
              severity: 'warning',
              file: indexPath,
              description: `${category} index missing export for ${component.name}`,
              suggestion: `Add export for ${component.name} component`
            });
          }
        }
      }
    }
  }

  private async validateImports(): Promise<void> {
    console.log('📥 Validating imports...');

    for (const [name, component] of this.components) {
      for (const importPath of component.imports) {
        if (importPath.startsWith('.') || importPath.startsWith('@client/shared/design-system')) {
          const resolvedPath = await this.resolveImportPath(importPath, component.path);
          if (!resolvedPath || !(await this.fileExists(resolvedPath))) {
            this.issues.push({
              type: 'broken-import',
              severity: 'error',
              file: component.path,
              description: `Broken import: ${importPath}`,
              suggestion: `Fix import path or create missing file`
            });
          }
        }
      }
    }
  }

  private async checkMissingComponents(): Promise<void> {
    console.log('🔍 Checking for missing components...');

    // Common UI components that should exist
    const expectedComponents = [
      'Button', 'Input', 'Card', 'Badge', 'Alert', 'Avatar', 'Progress',
      'Dialog', 'Popover', 'Select', 'Checkbox', 'Switch', 'Tabs',
      'Tooltip', 'Separator', 'Skeleton', 'Label', 'Textarea'
    ];

    for (const expectedComponent of expectedComponents) {
      this.expectedComponents.add(expectedComponent);
      
      const hasComponent = Array.from(this.components.values()).some(c => 
        c.exports.includes(expectedComponent) || c.name === expectedComponent
      );

      if (!hasComponent) {
        this.issues.push({
          type: 'missing-component',
          severity: 'warning',
          file: this.designSystemDir,
          description: `Missing common component: ${expectedComponent}`,
          suggestion: `Create ${expectedComponent} component or ensure it's properly exported`
        });
      }
    }
  }

  private async validateConsistency(): Promise<void> {
    console.log('🔄 Validating consistency...');

    // Check for duplicate exports
    const allExports = new Map<string, string[]>();
    
    for (const [name, component] of this.components) {
      for (const exportName of component.exports) {
        if (!allExports.has(exportName)) {
          allExports.set(exportName, []);
        }
        allExports.get(exportName)!.push(component.path);
      }
    }

    // Find duplicates
    for (const [exportName, paths] of allExports) {
      if (paths.length > 1) {
        this.issues.push({
          type: 'duplicate-export',
          severity: 'warning',
          file: paths.join(', '),
          description: `Duplicate export: ${exportName}`,
          suggestion: `Consolidate or rename duplicate exports`
        });
      }
    }

    // Check component naming consistency
    for (const [name, component] of this.components) {
      const fileName = path.basename(component.path, path.extname(component.path));
      const hasMatchingExport = component.exports.some(exp => 
        exp.toLowerCase() === fileName.toLowerCase()
      );

      if (!hasMatchingExport && component.exports.length > 0) {
        this.issues.push({
          type: 'inconsistent-structure',
          severity: 'info',
          file: component.path,
          description: `Component file name doesn't match exports`,
          suggestion: `Consider renaming file or exports for consistency`
        });
      }
    }
  }

  private async resolveImportPath(importPath: string, fromFile: string): Promise<string | null> {
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);
      
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const fullPath = resolved + ext;
        if (await this.fileExists(fullPath)) {
          return fullPath;
        }
      }
    }

    if (importPath.startsWith('@client/shared/design-system')) {
      const relativePath = importPath.replace('@client/shared/design-system', this.designSystemDir);
      
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const fullPath = relativePath + ext;
        if (await this.fileExists(fullPath)) {
          return fullPath;
        }
      }
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private generateReport(): void {
    console.log('\n📊 Design System Validation Report\n');
    console.log('='.repeat(50));

    // Summary
    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const warningCount = this.issues.filter(i => i.severity === 'warning').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;

    console.log(`\n📈 Summary:`);
    console.log(`  Components Analyzed: ${this.components.size}`);
    console.log(`  Issues Found: ${this.issues.length}`);
    console.log(`    Errors: ${errorCount}`);
    console.log(`    Warnings: ${warningCount}`);
    console.log(`    Info: ${infoCount}`);

    // Component breakdown
    console.log(`\n🧩 Component Breakdown:`);
    const categoryCount = new Map<string, number>();
    for (const component of this.components.values()) {
      categoryCount.set(component.category, (categoryCount.get(component.category) || 0) + 1);
    }

    for (const [category, count] of categoryCount) {
      console.log(`  ${category}: ${count} components`);
    }

    // Issues by type
    console.log(`\n🚨 Issues by Type:`);
    const issuesByType = new Map<string, number>();
    this.issues.forEach(issue => {
      issuesByType.set(issue.type, (issuesByType.get(issue.type) || 0) + 1);
    });

    for (const [type, count] of issuesByType) {
      console.log(`  ${type}: ${count}`);
    }

    // Detailed issues
    if (this.issues.length > 0) {
      console.log(`\n📋 Detailed Issues:`);
      this.issues.slice(0, 15).forEach((issue, index) => {
        const severity = issue.severity === 'error' ? '🔴' : 
                        issue.severity === 'warning' ? '🟡' : '🔵';
        console.log(`\n  ${index + 1}. ${severity} ${issue.type.toUpperCase()}`);
        console.log(`     File: ${issue.file}`);
        console.log(`     Issue: ${issue.description}`);
        console.log(`     Fix: ${issue.suggestion}`);
      });

      if (this.issues.length > 15) {
        console.log(`\n  ... and ${this.issues.length - 15} more issues`);
      }
    }

    // Component coverage
    console.log(`\n📊 Component Coverage:`);
    const expectedCount = this.expectedComponents.size;
    const actualCount = Array.from(this.components.values())
      .filter(c => Array.from(this.expectedComponents).some(exp => c.exports.includes(exp)))
      .length;
    
    const coverage = expectedCount > 0 ? (actualCount / expectedCount * 100) : 0;
    console.log(`  Expected Components: ${expectedCount}`);
    console.log(`  Found Components: ${actualCount}`);
    console.log(`  Coverage: ${coverage.toFixed(1)}%`);

    console.log('\n' + '='.repeat(50));
  }

  private async generateFixScript(): Promise<void> {
    console.log('\n🔧 Generating fix script...');

    const fixScript = `#!/usr/bin/env tsx

/**
 * Design System Auto-Fix Script
 * Generated by design system validation
 */

import { promises as fs } from 'fs';
import path from 'path';

async function fixDesignSystem(): Promise<void> {
  console.log('🔧 Applying design system fixes...');

${this.generateFixCommands()}

  console.log('✅ Design system fixes applied!');
}

fixDesignSystem().catch(console.error);
`;

    await fs.writeFile('scripts/fix-design-system.ts', fixScript);
    console.log('✅ Fix script generated: scripts/fix-design-system.ts');
  }

  private generateFixCommands(): string {
    const commands: string[] = [];

    for (const issue of this.issues) {
      switch (issue.type) {
        case 'missing-export':
          if (issue.file.endsWith('index.ts')) {
            commands.push(`
  // Fix missing export in ${issue.file}
  try {
    const content = await fs.readFile('${issue.file}', 'utf-8');
    if (!content.includes('${issue.suggestion}')) {
      await fs.appendFile('${issue.file}', '\\n${issue.suggestion}\\n');
      console.log('✅ Added export to ${issue.file}');
    }
  } catch (error) {
    console.warn('Failed to fix ${issue.file}:', error);
  }`);
          }
          break;

        case 'inconsistent-structure':
          if (issue.description.includes('Missing required directory')) {
            const dirName = issue.file.split('/').pop();
            commands.push(`
  // Create missing directory: ${dirName}
  try {
    await fs.mkdir('${issue.file}', { recursive: true });
    await fs.writeFile('${issue.file}/index.ts', '// ${dirName} exports\\n');
    console.log('✅ Created directory: ${dirName}');
  } catch (error) {
    console.warn('Failed to create ${issue.file}:', error);
  }`);
          }
          break;
      }
    }

    return commands.join('\n');
  }
}

// Run the validator
const validator = new DesignSystemValidator();
validator.run().catch(console.error);