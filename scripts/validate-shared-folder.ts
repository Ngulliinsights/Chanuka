#!/usr/bin/env tsx

/**
 * Shared Folder Validation Script
 * 
 * Validates the entire client/src/shared folder for:
 * - Internal consistency
 * - Proper module organization
 * - Export/import alignment
 * - Architectural compliance
 * - Missing dependencies
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ModuleInfo {
  name: string;
  path: string;
  type: 'design-system' | 'infrastructure' | 'ui' | 'types' | 'services' | 'validation' | 'testing' | 'templates' | 'interfaces';
  exports: string[];
  imports: string[];
  submodules: string[];
  hasIndex: boolean;
  isComplete: boolean;
}

interface ValidationResult {
  type: 'structure' | 'exports' | 'imports' | 'consistency' | 'architecture';
  severity: 'error' | 'warning' | 'info';
  module: string;
  file?: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

class SharedFolderValidator {
  private sharedDir = 'client/src/shared';
  private modules: Map<string, ModuleInfo> = new Map();
  private issues: ValidationResult[] = [];
  private dependencyGraph: Map<string, Set<string>> = new Map();

  async run(): Promise<void> {
    console.log('🏗️  Validating Shared Folder Structure...\n');

    await this.analyzeModules();
    await this.validateArchitecture();
    await this.validateExports();
    await this.validateImports();
    await this.validateConsistency();
    await this.buildDependencyGraph();
    await this.validateDependencies();
    
    this.generateReport();
    await this.generateFixScript();
  }

  private async analyzeModules(): Promise<void> {
    console.log('📊 Analyzing shared modules...');

    const moduleDirectories = await this.getDirectories(this.sharedDir);
    
    for (const moduleDir of moduleDirectories) {
      const moduleName = path.basename(moduleDir);
      const moduleInfo = await this.analyzeModule(moduleName, moduleDir);
      this.modules.set(moduleName, moduleInfo);
    }

    console.log(`✅ Analyzed ${this.modules.size} modules`);
  }

  private async analyzeModule(name: string, modulePath: string): Promise<ModuleInfo> {
    const indexPath = path.join(modulePath, 'index.ts');
    const hasIndex = await this.fileExists(indexPath);
    
    let exports: string[] = [];
    let imports: string[] = [];
    
    if (hasIndex) {
      const content = await fs.readFile(indexPath, 'utf-8');
      exports = this.extractExports(content);
      imports = this.extractImports(content);
    }

    const submodules = await this.getSubmodules(modulePath);
    const type = this.determineModuleType(name);
    const isComplete = await this.checkModuleCompleteness(modulePath, type);

    return {
      name,
      path: modulePath,
      type,
      exports,
      imports,
      submodules,
      hasIndex,
      isComplete
    };
  }

  private async getDirectories(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(dirPath, entry.name));
    } catch {
      return [];
    }
  }

  private async getSubmodules(modulePath: string): Promise<string[]> {
    const directories = await this.getDirectories(modulePath);
    return directories.map(dir => path.basename(dir));
  }

  private determineModuleType(name: string): ModuleInfo['type'] {
    const typeMap: Record<string, ModuleInfo['type']> = {
      'design-system': 'design-system',
      'infrastructure': 'infrastructure',
      'ui': 'ui',
      'types': 'types',
      'services': 'services',
      'validation': 'validation',
      'testing': 'testing',
      'templates': 'templates',
      'interfaces': 'interfaces'
    };
    
    return typeMap[name] || 'ui';
  }

  private async checkModuleCompleteness(modulePath: string, type: ModuleInfo['type']): Promise<boolean> {
    const indexExists = await this.fileExists(path.join(modulePath, 'index.ts'));
    
    switch (type) {
      case 'design-system':
        return indexExists && 
               await this.fileExists(path.join(modulePath, 'tokens', 'index.ts')) &&
               await this.fileExists(path.join(modulePath, 'themes', 'index.ts'));
      
      case 'infrastructure':
        return indexExists;
      
      case 'ui':
        return indexExists;
      
      case 'types':
        return indexExists;
      
      default:
        return indexExists;
    }
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Export * from statements
    const reExportRegex = /export\s+\*\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = reExportRegex.exec(content)) !== null) {
      exports.push(`* from ${match[1]}`);
    }

    // Named exports
    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const namedExports = match[1].split(',').map(e => e.trim());
      exports.push(...namedExports);
    }

    // Direct exports
    const directExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    while ((match = directExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
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

  private async validateArchitecture(): Promise<void> {
    console.log('🏛️  Validating architecture...');

    // Expected modules for a complete shared folder
    const expectedModules = [
      'design-system',
      'infrastructure', 
      'ui',
      'types',
      'services'
    ];

    for (const expectedModule of expectedModules) {
      if (!this.modules.has(expectedModule)) {
        this.issues.push({
          type: 'architecture',
          severity: 'warning',
          module: 'shared',
          description: `Missing expected module: ${expectedModule}`,
          suggestion: `Create ${expectedModule} module with proper structure`,
          autoFixable: true
        });
      }
    }

    // Validate module completeness
    for (const [name, module] of this.modules) {
      if (!module.hasIndex) {
        this.issues.push({
          type: 'structure',
          severity: 'error',
          module: name,
          file: path.join(module.path, 'index.ts'),
          description: `Module ${name} missing index.ts`,
          suggestion: `Create index.ts with proper exports`,
          autoFixable: true
        });
      }

      if (!module.isComplete) {
        this.issues.push({
          type: 'structure',
          severity: 'warning',
          module: name,
          description: `Module ${name} appears incomplete`,
          suggestion: `Review module structure and add missing components`,
          autoFixable: false
        });
      }
    }
  }

  private async validateExports(): Promise<void> {
    console.log('📤 Validating exports...');

    // Check main shared index
    const mainIndexPath = path.join(this.sharedDir, 'index.ts');
    if (await this.fileExists(mainIndexPath)) {
      const content = await fs.readFile(mainIndexPath, 'utf-8');
      
      // Check if all modules are exported
      for (const [name, module] of this.modules) {
        if (!content.includes(`from './${name}'`) && !content.includes(`'./${name}'`)) {
          this.issues.push({
            type: 'exports',
            severity: 'warning',
            module: 'shared',
            file: mainIndexPath,
            description: `Main index missing export for ${name} module`,
            suggestion: `Add: export * from './${name}';`,
            autoFixable: true
          });
        }
      }
    } else {
      this.issues.push({
        type: 'structure',
        severity: 'error',
        module: 'shared',
        file: mainIndexPath,
        description: 'Missing main shared index.ts',
        suggestion: 'Create main index.ts with module exports',
        autoFixable: true
      });
    }

    // Validate individual module exports
    for (const [name, module] of this.modules) {
      if (module.hasIndex && module.submodules.length > 0) {
        const indexContent = await fs.readFile(path.join(module.path, 'index.ts'), 'utf-8');
        
        for (const submodule of module.submodules) {
          const submoduleIndexPath = path.join(module.path, submodule, 'index.ts');
          if (await this.fileExists(submoduleIndexPath)) {
            if (!indexContent.includes(`from './${submodule}'`)) {
              this.issues.push({
                type: 'exports',
                severity: 'warning',
                module: name,
                file: path.join(module.path, 'index.ts'),
                description: `Module ${name} missing export for submodule ${submodule}`,
                suggestion: `Add: export * from './${submodule}';`,
                autoFixable: true
              });
            }
          }
        }
      }
    }
  }

  private async validateImports(): Promise<void> {
    console.log('📥 Validating imports...');

    for (const [name, module] of this.modules) {
      if (!module.hasIndex) continue;

      const indexPath = path.join(module.path, 'index.ts');
      const content = await fs.readFile(indexPath, 'utf-8');
      
      for (const importPath of module.imports) {
        if (importPath.startsWith('.') || importPath.startsWith('@client/shared')) {
          const resolvedPath = await this.resolveImportPath(importPath, indexPath);
          if (!resolvedPath || !(await this.fileExists(resolvedPath))) {
            this.issues.push({
              type: 'imports',
              severity: 'error',
              module: name,
              file: indexPath,
              description: `Broken import: ${importPath}`,
              suggestion: `Fix import path or create missing file`,
              autoFixable: false
            });
          }
        }
      }
    }
  }

  private async validateConsistency(): Promise<void> {
    console.log('🔄 Validating consistency...');

    // Check for consistent naming patterns
    for (const [name, module] of this.modules) {
      // Check if module follows naming conventions
      if (name.includes('_') || name.includes(' ')) {
        this.issues.push({
          type: 'consistency',
          severity: 'info',
          module: name,
          description: `Module name uses non-standard characters: ${name}`,
          suggestion: `Consider using kebab-case or camelCase`,
          autoFixable: false
        });
      }

      // Check for consistent submodule structure
      if (module.type === 'design-system' || module.type === 'ui') {
        const expectedSubmodules = module.type === 'design-system' 
          ? ['tokens', 'themes', 'interactive', 'feedback']
          : ['components', 'layouts'];
        
        for (const expected of expectedSubmodules) {
          if (!module.submodules.includes(expected)) {
            this.issues.push({
              type: 'consistency',
              severity: 'info',
              module: name,
              description: `Missing expected submodule: ${expected}`,
              suggestion: `Consider adding ${expected} submodule for consistency`,
              autoFixable: false
            });
          }
        }
      }
    }
  }

  private async buildDependencyGraph(): Promise<void> {
    console.log('🔗 Building dependency graph...');

    for (const [name, module] of this.modules) {
      if (!this.dependencyGraph.has(name)) {
        this.dependencyGraph.set(name, new Set());
      }

      for (const importPath of module.imports) {
        if (importPath.startsWith('@client/shared/')) {
          const dependencyModule = importPath.split('/')[2];
          if (dependencyModule && dependencyModule !== name) {
            this.dependencyGraph.get(name)!.add(dependencyModule);
          }
        }
      }
    }
  }

  private async validateDependencies(): Promise<void> {
    console.log('🔍 Validating dependencies...');

    // Check for circular dependencies
    for (const [moduleName, dependencies] of this.dependencyGraph) {
      for (const dependency of dependencies) {
        if (this.hasCircularDependency(moduleName, dependency, new Set())) {
          this.issues.push({
            type: 'architecture',
            severity: 'error',
            module: moduleName,
            description: `Circular dependency detected: ${moduleName} ↔ ${dependency}`,
            suggestion: `Refactor to remove circular dependency`,
            autoFixable: false
          });
        }
      }
    }

    // Check for missing dependencies
    for (const [moduleName, dependencies] of this.dependencyGraph) {
      for (const dependency of dependencies) {
        if (!this.modules.has(dependency)) {
          this.issues.push({
            type: 'imports',
            severity: 'error',
            module: moduleName,
            description: `Dependency not found: ${dependency}`,
            suggestion: `Create missing module or fix import path`,
            autoFixable: false
          });
        }
      }
    }
  }

  private hasCircularDependency(start: string, current: string, visited: Set<string>): boolean {
    if (visited.has(current)) {
      return current === start;
    }

    visited.add(current);
    const dependencies = this.dependencyGraph.get(current) || new Set();
    
    for (const dependency of dependencies) {
      if (this.hasCircularDependency(start, dependency, new Set(visited))) {
        return true;
      }
    }

    return false;
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

    if (importPath.startsWith('@client/shared/')) {
      const relativePath = importPath.replace('@client/shared/', 'client/src/shared/');
      
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

  private generateReport(): void {
    console.log('\n📊 Shared Folder Validation Report\n');
    console.log('='.repeat(60));

    // Summary
    const errorCount = this.issues.filter(i => i.severity === 'error').length;
    const warningCount = this.issues.filter(i => i.severity === 'warning').length;
    const infoCount = this.issues.filter(i => i.severity === 'info').length;
    const autoFixableCount = this.issues.filter(i => i.autoFixable).length;

    console.log(`\n📈 Summary:`);
    console.log(`  Modules Analyzed: ${this.modules.size}`);
    console.log(`  Issues Found: ${this.issues.length}`);
    console.log(`    Errors: ${errorCount}`);
    console.log(`    Warnings: ${warningCount}`);
    console.log(`    Info: ${infoCount}`);
    console.log(`  Auto-fixable: ${autoFixableCount}`);

    // Module breakdown
    console.log(`\n🏗️  Module Breakdown:`);
    for (const [name, module] of this.modules) {
      const status = module.isComplete ? '✅' : '⚠️';
      const indexStatus = module.hasIndex ? '📄' : '❌';
      console.log(`  ${status} ${name} (${module.type}) ${indexStatus} ${module.submodules.length} submodules`);
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

    // Dependency graph
    console.log(`\n🔗 Module Dependencies:`);
    for (const [moduleName, dependencies] of this.dependencyGraph) {
      if (dependencies.size > 0) {
        console.log(`  ${moduleName} → ${Array.from(dependencies).join(', ')}`);
      }
    }

    // Top issues
    if (this.issues.length > 0) {
      console.log(`\n📋 Top Issues:`);
      this.issues.slice(0, 10).forEach((issue, index) => {
        const severity = issue.severity === 'error' ? '🔴' : 
                        issue.severity === 'warning' ? '🟡' : '🔵';
        const fixable = issue.autoFixable ? '🔧' : '👤';
        console.log(`\n  ${index + 1}. ${severity} ${fixable} ${issue.type.toUpperCase()}`);
        console.log(`     Module: ${issue.module}`);
        if (issue.file) console.log(`     File: ${issue.file}`);
        console.log(`     Issue: ${issue.description}`);
        console.log(`     Fix: ${issue.suggestion}`);
      });
    }

    // Architecture health
    console.log(`\n🏛️  Architecture Health:`);
    const completeness = Array.from(this.modules.values()).filter(m => m.isComplete).length / this.modules.size * 100;
    const indexCoverage = Array.from(this.modules.values()).filter(m => m.hasIndex).length / this.modules.size * 100;
    
    console.log(`  Module Completeness: ${completeness.toFixed(1)}%`);
    console.log(`  Index Coverage: ${indexCoverage.toFixed(1)}%`);
    console.log(`  Circular Dependencies: ${this.countCircularDependencies()}`);

    console.log('\n' + '='.repeat(60));
  }

  private countCircularDependencies(): number {
    let count = 0;
    for (const [moduleName, dependencies] of this.dependencyGraph) {
      for (const dependency of dependencies) {
        if (this.hasCircularDependency(moduleName, dependency, new Set())) {
          count++;
        }
      }
    }
    return count / 2; // Each circular dependency is counted twice
  }

  private async generateFixScript(): Promise<void> {
    console.log('\n🔧 Generating fix script...');

    const autoFixableIssues = this.issues.filter(i => i.autoFixable);
    
    const fixScript = `#!/usr/bin/env tsx

/**
 * Shared Folder Auto-Fix Script
 * Generated by shared folder validation
 */

import { promises as fs } from 'fs';
import path from 'path';

async function fixSharedFolder(): Promise<void> {
  console.log('🔧 Applying shared folder fixes...');

${this.generateAutoFixes(autoFixableIssues)}

  console.log('✅ Shared folder fixes applied!');
}

fixSharedFolder().catch(console.error);
`;

    await fs.writeFile('scripts/fix-shared-folder.ts', fixScript);
    console.log(`✅ Fix script generated: scripts/fix-shared-folder.ts (${autoFixableIssues.length} auto-fixes)`);
  }

  private generateAutoFixes(issues: ValidationResult[]): string {
    const fixes: string[] = [];

    for (const issue of issues) {
      switch (issue.type) {
        case 'structure':
          if (issue.description.includes('missing index.ts')) {
            fixes.push(`
  // Create missing index.ts for ${issue.module}
  try {
    const indexPath = '${issue.file}';
    const content = '// ${issue.module} module exports\\nexport * from \\'.\\';\\n';
    await fs.writeFile(indexPath, content);
    console.log('✅ Created index.ts for ${issue.module}');
  } catch (error) {
    console.warn('Failed to create index for ${issue.module}:', error);
  }`);
          }
          break;

        case 'exports':
          if (issue.suggestion.includes('export * from')) {
            fixes.push(`
  // Add missing export to ${issue.file}
  try {
    const content = await fs.readFile('${issue.file}', 'utf-8');
    if (!content.includes('${issue.suggestion}')) {
      await fs.appendFile('${issue.file}', '\\n${issue.suggestion}\\n');
      console.log('✅ Added export to ${issue.module}');
    }
  } catch (error) {
    console.warn('Failed to add export to ${issue.module}:', error);
  }`);
          }
          break;

        case 'architecture':
          if (issue.description.includes('Missing expected module')) {
            const moduleName = issue.description.split(': ')[1];
            fixes.push(`
  // Create missing module: ${moduleName}
  try {
    const modulePath = 'client/src/shared/${moduleName}';
    await fs.mkdir(modulePath, { recursive: true });
    await fs.writeFile(path.join(modulePath, 'index.ts'), '// ${moduleName} module\\n');
    console.log('✅ Created module: ${moduleName}');
  } catch (error) {
    console.warn('Failed to create module ${moduleName}:', error);
  }`);
          }
          break;
      }
    }

    return fixes.join('\n');
  }
}

// Run the validator
const validator = new SharedFolderValidator();
validator.run().catch(console.error);