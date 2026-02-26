/**
 * Enhanced Dependency Report Generator
 * 
 * Combines ts-morph analysis with madge for accurate circular dependency detection
 */

import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// Data Structures
// ============================================================================

interface ModuleAnalysis {
  name: string;
  path: string;
  exports: string[];
  dependencies: string[];
  usedBy: string[];
  exportCount: number;
  dependencyCount: number;
  usedByCount: number;
}

interface CircularDependency {
  modules: string[];
  path: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface DependencyReport {
  summary: {
    totalModules: number;
    totalDependencies: number;
    circularDependencies: number;
    timestamp: string;
  };
  modules: ModuleAnalysis[];
  circularDependencies: CircularDependency[];
}

// ============================================================================
// Module Analyzer
// ============================================================================

class EnhancedDependencyAnalyzer {
  private project: Project;
  private infrastructurePath: string;
  private modules: Map<string, ModuleAnalysis>;

  constructor(infrastructurePath: string) {
    this.infrastructurePath = path.resolve(infrastructurePath);
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'client', 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });
    this.modules = new Map();
  }

  async analyze(): Promise<DependencyReport> {
    console.log('🔍 Analyzing infrastructure modules...\n');
    
    // Step 1: Discover and analyze all modules
    const modulePaths = this.discoverModules();
    console.log(`Found ${modulePaths.length} modules\n`);
    
    for (const modulePath of modulePaths) {
      this.analyzeModule(modulePath);
    }
    
    // Step 2: Build dependency relationships
    this.buildDependencyRelationships();
    
    // Step 3: Detect circular dependencies using madge
    const circularDeps = this.detectCircularDependencies();
    
    // Step 4: Generate report
    const report: DependencyReport = {
      summary: {
        totalModules: this.modules.size,
        totalDependencies: this.calculateTotalDependencies(),
        circularDependencies: circularDeps.length,
        timestamp: new Date().toISOString(),
      },
      modules: Array.from(this.modules.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      ),
      circularDependencies: circularDeps,
    };
    
    return report;
  }

  private discoverModules(): string[] {
    const modules: string[] = [];
    const entries = fs.readdirSync(this.infrastructurePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const modulePath = path.join(this.infrastructurePath, entry.name);
        const indexPath = path.join(modulePath, 'index.ts');
        
        if (fs.existsSync(indexPath)) {
          modules.push(modulePath);
        }
      }
    }
    
    return modules.sort();
  }

  private analyzeModule(modulePath: string): void {
    const moduleName = path.basename(modulePath);
    const indexPath = path.join(modulePath, 'index.ts');
    
    console.log(`  Analyzing: ${moduleName}`);
    
    const sourceFile = this.project.addSourceFileAtPath(indexPath);
    
    // Extract exports
    const exports = this.extractExports(sourceFile);
    
    // Extract dependencies (only to other infrastructure modules)
    const dependencies = this.extractDependencies(sourceFile, moduleName);
    
    this.modules.set(moduleName, {
      name: moduleName,
      path: modulePath,
      exports,
      dependencies,
      usedBy: [],
      exportCount: exports.length,
      dependencyCount: dependencies.length,
      usedByCount: 0,
    });
  }

  private extractExports(sourceFile: any): string[] {
    const exports: string[] = [];
    
    // Named exports
    sourceFile.getExportDeclarations().forEach((exportDecl: any) => {
      exportDecl.getNamedExports().forEach((namedExport: any) => {
        exports.push(namedExport.getName());
      });
    });
    
    // Export assignments
    if (sourceFile.getExportAssignments().length > 0) {
      exports.push('default');
    }
    
    // Exported declarations
    sourceFile.getFunctions().forEach((func: any) => {
      if (func.isExported()) {
        const name = func.getName();
        if (name) exports.push(name);
      }
    });
    
    sourceFile.getClasses().forEach((cls: any) => {
      if (cls.isExported()) {
        const name = cls.getName();
        if (name) exports.push(name);
      }
    });
    
    sourceFile.getInterfaces().forEach((iface: any) => {
      if (iface.isExported()) {
        exports.push(iface.getName());
      }
    });
    
    sourceFile.getTypeAliases().forEach((typeAlias: any) => {
      if (typeAlias.isExported()) {
        exports.push(typeAlias.getName());
      }
    });
    
    sourceFile.getVariableStatements().forEach((varStmt: any) => {
      if (varStmt.isExported()) {
        varStmt.getDeclarations().forEach((decl: any) => {
          exports.push(decl.getName());
        });
      }
    });
    
    return [...new Set(exports)];
  }

  private extractDependencies(sourceFile: any, currentModule: string): string[] {
    const dependencies = new Set<string>();
    
    sourceFile.getImportDeclarations().forEach((importDecl: any) => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      
      // Check if it's an infrastructure module import
      if (moduleSpecifier.includes('@client/infrastructure/')) {
        const match = moduleSpecifier.match(/@client\/infrastructure\/([^/]+)/);
        if (match && match[1] !== currentModule) {
          dependencies.add(match[1]);
        }
      } else if (moduleSpecifier.startsWith('../')) {
        // Handle relative imports
        const resolved = this.resolveRelativeImport(moduleSpecifier, currentModule);
        if (resolved && resolved !== currentModule) {
          dependencies.add(resolved);
        }
      }
    });
    
    return Array.from(dependencies).sort();
  }

  private resolveRelativeImport(importPath: string, fromModule: string): string | null {
    // Simple resolution for relative imports within infrastructure
    const parts = importPath.split('/').filter(p => p !== '.' && p !== '..');
    if (parts.length > 0) {
      return parts[0];
    }
    return null;
  }

  private buildDependencyRelationships(): void {
    console.log('\n📊 Building dependency relationships...\n');
    
    // Build "usedBy" relationships
    for (const module of this.modules.values()) {
      for (const dep of module.dependencies) {
        const depModule = this.modules.get(dep);
        if (depModule) {
          depModule.usedBy.push(module.name);
          depModule.usedByCount++;
        }
      }
    }
  }

  private detectCircularDependencies(): CircularDependency[] {
    console.log('🔄 Detecting circular dependencies using madge...\n');
    
    try {
      // Run madge to detect circular dependencies
      const output = execSync(
        'npx madge --circular --extensions ts,tsx --json client/src/infrastructure',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      
      const madgeResult = JSON.parse(output);
      
      if (Array.isArray(madgeResult) && madgeResult.length === 0) {
        console.log('  ✅ No circular dependencies found!\n');
        return [];
      }
      
      // Convert madge output to our format
      const circularDeps: CircularDependency[] = [];
      
      for (const cycle of madgeResult) {
        if (Array.isArray(cycle) && cycle.length > 0) {
          // Extract module names from file paths
          const modules = cycle.map((filePath: string) => {
            const match = filePath.match(/infrastructure\/([^/]+)\//);
            return match ? match[1] : null;
          }).filter((m: string | null): m is string => m !== null);
          
          const uniqueModules = [...new Set(modules)];
          
          if (uniqueModules.length > 1) {
            circularDeps.push({
              modules: uniqueModules,
              path: modules,
              severity: this.calculateSeverity(uniqueModules.length),
            });
          }
        }
      }
      
      console.log(`  Found ${circularDeps.length} circular dependencies\n`);
      return circularDeps;
      
    } catch (error) {
      console.error('  ⚠️  Error running madge:', error);
      return [];
    }
  }

  private calculateSeverity(moduleCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (moduleCount === 2) return 'high';
    if (moduleCount === 3) return 'medium';
    if (moduleCount <= 5) return 'low';
    return 'critical';
  }

  private calculateTotalDependencies(): number {
    let total = 0;
    for (const module of this.modules.values()) {
      total += module.dependencyCount;
    }
    return total;
  }
}

// ============================================================================
// Report Generators
// ============================================================================

function generateTextReport(report: DependencyReport): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('INFRASTRUCTURE DEPENDENCY ANALYSIS REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Generated: ${new Date(report.summary.timestamp).toLocaleString()}`);
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total Modules: ${report.summary.totalModules}`);
  lines.push(`Total Dependencies: ${report.summary.totalDependencies}`);
  lines.push(`Circular Dependencies: ${report.summary.circularDependencies}`);
  lines.push('');
  
  // Module list
  lines.push('MODULES');
  lines.push('-'.repeat(80));
  lines.push('Module Name'.padEnd(30) + ' | Exports | Deps | Used By');
  lines.push('-'.repeat(80));
  
  for (const module of report.modules) {
    lines.push(
      module.name.padEnd(30) + 
      ' | ' + module.exportCount.toString().padStart(7) + 
      ' | ' + module.dependencyCount.toString().padStart(4) + 
      ' | ' + module.usedByCount.toString().padStart(7)
    );
  }
  lines.push('');
  
  // Circular dependencies
  if (report.circularDependencies.length > 0) {
    lines.push('CIRCULAR DEPENDENCIES');
    lines.push('-'.repeat(80));
    lines.push('');
    
    report.circularDependencies.forEach((cycle, index) => {
      lines.push(`${index + 1}. Severity: ${cycle.severity.toUpperCase()}`);
      lines.push(`   Modules: ${cycle.modules.join(' ↔ ')}`);
      lines.push(`   Path: ${cycle.path.join(' → ')}`);
      lines.push('');
    });
  } else {
    lines.push('✅ NO CIRCULAR DEPENDENCIES FOUND!');
    lines.push('');
  }
  
  // Detailed module information
  lines.push('DETAILED MODULE INFORMATION');
  lines.push('-'.repeat(80));
  lines.push('');
  
  for (const module of report.modules) {
    lines.push(`${module.name}`);
    lines.push(`  Exports (${module.exportCount}): ${module.exports.slice(0, 10).join(', ')}${module.exports.length > 10 ? '...' : ''}`);
    lines.push(`  Dependencies (${module.dependencyCount}): ${module.dependencies.join(', ') || 'none'}`);
    lines.push(`  Used by (${module.usedByCount}): ${module.usedBy.join(', ') || 'none'}`);
    lines.push('');
  }
  
  lines.push('='.repeat(80));
  lines.push('END OF REPORT');
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

function generateMermaidDiagram(report: DependencyReport): string {
  const lines: string[] = [];
  
  lines.push('# Infrastructure Dependency Graph');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('');
  
  // Add nodes
  for (const module of report.modules) {
    const nodeId = module.name.toUpperCase().replace(/-/g, '_');
    lines.push(`    ${nodeId}[${module.name}]`);
  }
  lines.push('');
  
  // Add edges
  const cycleModules = new Set<string>();
  report.circularDependencies.forEach(cycle => {
    cycle.modules.forEach(m => cycleModules.add(m));
  });
  
  for (const module of report.modules) {
    const fromId = module.name.toUpperCase().replace(/-/g, '_');
    
    for (const dep of module.dependencies) {
      const toId = dep.toUpperCase().replace(/-/g, '_');
      const isCyclic = cycleModules.has(module.name) && cycleModules.has(dep);
      const style = isCyclic ? '-.->|circular|' : '-->';
      
      lines.push(`    ${fromId} ${style} ${toId}`);
    }
  }
  
  // Add styling for circular dependencies
  if (cycleModules.size > 0) {
    lines.push('');
    lines.push('    %% Highlight circular dependencies');
    for (const moduleName of cycleModules) {
      const nodeId = moduleName.toUpperCase().replace(/-/g, '_');
      lines.push(`    style ${nodeId} fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px`);
    }
  }
  
  lines.push('```');
  lines.push('');
  
  if (report.circularDependencies.length === 0) {
    lines.push('✅ **No circular dependencies detected!**');
  } else {
    lines.push(`⚠️ **${report.circularDependencies.length} circular dependencies detected**`);
  }
  
  return lines.join('\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 Enhanced Infrastructure Dependency Analysis\n');
  console.log('='.repeat(80));
  console.log('');
  
  const infrastructurePath = path.join(process.cwd(), 'client', 'src', 'infrastructure');
  
  // Analyze dependencies
  const analyzer = new EnhancedDependencyAnalyzer(infrastructurePath);
  const report = await analyzer.analyze();
  
  // Generate reports
  console.log('📝 Generating reports...\n');
  
  const outputDir = path.join(process.cwd(), 'analysis-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Text report
  const textReport = generateTextReport(report);
  const textPath = path.join(outputDir, 'dependency-report.txt');
  fs.writeFileSync(textPath, textReport);
  console.log(`  ✅ Text report: ${textPath}`);
  
  // Mermaid diagram
  const mermaidDiagram = generateMermaidDiagram(report);
  const mermaidPath = path.join(outputDir, 'dependency-graph.md');
  fs.writeFileSync(mermaidPath, mermaidDiagram);
  console.log(`  ✅ Mermaid diagram: ${mermaidPath}`);
  
  // JSON report
  const jsonPath = path.join(outputDir, 'dependency-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`  ✅ JSON report: ${jsonPath}`);
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log(`\nTotal Modules: ${report.summary.totalModules}`);
  console.log(`Total Dependencies: ${report.summary.totalDependencies}`);
  console.log(`Circular Dependencies: ${report.summary.circularDependencies}`);
  
  if (report.circularDependencies.length > 0) {
    console.log('\n⚠️  Circular dependencies detected:');
    report.circularDependencies.forEach((cycle, index) => {
      console.log(`  ${index + 1}. [${cycle.severity.toUpperCase()}] ${cycle.modules.join(' ↔ ')}`);
    });
  } else {
    console.log('\n✅ No circular dependencies found!');
  }
  
  console.log('\n📁 Reports saved to:', outputDir);
  console.log('');
}

main().catch(error => {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
});
