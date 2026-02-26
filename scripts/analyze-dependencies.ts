/**
 * Dependency Graph Analysis Script
 * 
 * This script analyzes all infrastructure modules to:
 * 1. Extract imports and exports from each module
 * 2. Build a complete dependency graph
 * 3. Detect circular dependencies
 * 4. Generate reports and visualizations
 */

import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Data Structures
// ============================================================================

interface ModuleNode {
  id: string;
  name: string;
  path: string;
  exports: string[];
  imports: ModuleImport[];
}

interface ModuleImport {
  from: string;
  specifiers: string[];
  isRelative: boolean;
  resolvedPath?: string;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'direct' | 'interface' | 'optional';
}

interface CircularDependency {
  modules: string[];
  path: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface DependencyGraph {
  nodes: Map<string, ModuleNode>;
  edges: DependencyEdge[];
  cycles: CircularDependency[];
}

// ============================================================================
// Module Analysis
// ============================================================================

class DependencyAnalyzer {
  private project: Project;
  private infrastructurePath: string;
  private graph: DependencyGraph;

  constructor(infrastructurePath: string) {
    this.infrastructurePath = path.resolve(infrastructurePath);
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'client', 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });
    
    this.graph = {
      nodes: new Map(),
      edges: [],
      cycles: [],
    };
  }

  /**
   * Analyze all modules in the infrastructure directory
   */
  async analyze(): Promise<DependencyGraph> {
    console.log('🔍 Analyzing infrastructure modules...\n');
    
    // Step 1: Discover all modules
    const modules = this.discoverModules();
    console.log(`Found ${modules.length} modules\n`);
    
    // Step 2: Analyze each module
    for (const modulePath of modules) {
      await this.analyzeModule(modulePath);
    }
    
    // Step 3: Build dependency edges
    this.buildDependencyEdges();
    
    // Step 4: Detect circular dependencies
    this.detectCircularDependencies();
    
    return this.graph;
  }

  /**
   * Discover all module directories in infrastructure
   */
  private discoverModules(): string[] {
    const modules: string[] = [];
    const entries = fs.readdirSync(this.infrastructurePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const modulePath = path.join(this.infrastructurePath, entry.name);
        const indexPath = path.join(modulePath, 'index.ts');
        
        // Check if module has an index.ts file
        if (fs.existsSync(indexPath)) {
          modules.push(modulePath);
        }
      }
    }
    
    return modules.sort();
  }

  /**
   * Analyze a single module
   */
  private async analyzeModule(modulePath: string): Promise<void> {
    const moduleName = path.basename(modulePath);
    const indexPath = path.join(modulePath, 'index.ts');
    
    console.log(`  Analyzing: ${moduleName}`);
    
    // Add source file to project
    const sourceFile = this.project.addSourceFileAtPath(indexPath);
    
    // Extract exports
    const exports = this.extractExports(sourceFile);
    
    // Extract imports
    const imports = this.extractImports(sourceFile, modulePath);
    
    // Create module node
    const node: ModuleNode = {
      id: moduleName,
      name: moduleName,
      path: modulePath,
      exports,
      imports,
    };
    
    this.graph.nodes.set(moduleName, node);
  }

  /**
   * Extract all exports from a source file
   */
  private extractExports(sourceFile: SourceFile): string[] {
    const exports: string[] = [];
    
    // Named exports
    sourceFile.getExportDeclarations().forEach(exportDecl => {
      exportDecl.getNamedExports().forEach(namedExport => {
        exports.push(namedExport.getName());
      });
    });
    
    // Export assignments
    sourceFile.getExportAssignments().forEach(exportAssign => {
      exports.push('default');
    });
    
    // Exported functions
    sourceFile.getFunctions().forEach(func => {
      if (func.isExported()) {
        const name = func.getName();
        if (name) exports.push(name);
      }
    });
    
    // Exported classes
    sourceFile.getClasses().forEach(cls => {
      if (cls.isExported()) {
        const name = cls.getName();
        if (name) exports.push(name);
      }
    });
    
    // Exported interfaces
    sourceFile.getInterfaces().forEach(iface => {
      if (iface.isExported()) {
        exports.push(iface.getName());
      }
    });
    
    // Exported type aliases
    sourceFile.getTypeAliases().forEach(typeAlias => {
      if (typeAlias.isExported()) {
        exports.push(typeAlias.getName());
      }
    });
    
    // Exported variables
    sourceFile.getVariableStatements().forEach(varStmt => {
      if (varStmt.isExported()) {
        varStmt.getDeclarations().forEach(decl => {
          exports.push(decl.getName());
        });
      }
    });
    
    return [...new Set(exports)]; // Remove duplicates
  }

  /**
   * Extract all imports from a source file
   */
  private extractImports(sourceFile: SourceFile, modulePath: string): ModuleImport[] {
    const imports: ModuleImport[] = [];
    
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const specifiers: string[] = [];
      
      // Named imports
      importDecl.getNamedImports().forEach(namedImport => {
        specifiers.push(namedImport.getName());
      });
      
      // Default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        specifiers.push('default');
      }
      
      // Namespace import
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        specifiers.push(`* as ${namespaceImport.getText()}`);
      }
      
      const isRelative = moduleSpecifier.startsWith('.');
      let resolvedPath: string | undefined;
      
      // Resolve relative imports to module names
      if (isRelative) {
        resolvedPath = this.resolveImportPath(moduleSpecifier, modulePath);
      }
      
      imports.push({
        from: moduleSpecifier,
        specifiers,
        isRelative,
        resolvedPath,
      });
    });
    
    return imports;
  }

  /**
   * Resolve a relative import path to a module name
   */
  private resolveImportPath(importPath: string, fromModulePath: string): string | undefined {
    try {
      const resolved = path.resolve(fromModulePath, importPath);
      
      // Check if it's within infrastructure
      if (resolved.startsWith(this.infrastructurePath)) {
        // Find the module directory
        let current = resolved;
        while (current !== this.infrastructurePath) {
          const indexPath = path.join(current, 'index.ts');
          if (fs.existsSync(indexPath)) {
            return path.basename(current);
          }
          current = path.dirname(current);
        }
      }
    } catch (error) {
      // Ignore resolution errors
    }
    
    return undefined;
  }

  /**
   * Build dependency edges from module imports
   */
  private buildDependencyEdges(): void {
    console.log('\n📊 Building dependency edges...\n');
    
    for (const [moduleName, node] of this.graph.nodes) {
      for (const imp of node.imports) {
        // Only track dependencies within infrastructure
        if (imp.resolvedPath && this.graph.nodes.has(imp.resolvedPath)) {
          this.graph.edges.push({
            from: moduleName,
            to: imp.resolvedPath,
            type: 'direct',
          });
        }
      }
    }
    
    console.log(`  Created ${this.graph.edges.length} dependency edges`);
  }

  /**
   * Detect circular dependencies using depth-first search
   */
  private detectCircularDependencies(): void {
    console.log('\n🔄 Detecting circular dependencies...\n');
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];
    
    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      pathStack.push(node);
      
      // Get all dependencies of this node
      const dependencies = this.graph.edges
        .filter(edge => edge.from === node)
        .map(edge => edge.to);
      
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (recursionStack.has(dep)) {
          // Found a cycle!
          const cycleStartIndex = pathStack.indexOf(dep);
          const cyclePath = pathStack.slice(cycleStartIndex);
          cyclePath.push(dep); // Complete the cycle
          
          // Check if we've already recorded this cycle
          const cycleKey = [...cyclePath].sort().join('->');
          const existingCycle = this.graph.cycles.find(c => 
            [...c.modules].sort().join('->') === cycleKey
          );
          
          if (!existingCycle) {
            this.graph.cycles.push({
              modules: [...new Set(cyclePath)],
              path: cyclePath,
              severity: this.calculateCycleSeverity(cyclePath),
            });
          }
        }
      }
      
      pathStack.pop();
      recursionStack.delete(node);
    };
    
    // Run DFS from each unvisited node
    for (const nodeName of this.graph.nodes.keys()) {
      if (!visited.has(nodeName)) {
        dfs(nodeName);
      }
    }
    
    console.log(`  Found ${this.graph.cycles.length} circular dependencies`);
  }

  /**
   * Calculate severity of a circular dependency
   */
  private calculateCycleSeverity(path: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const length = path.length - 1; // Subtract 1 because last element repeats first
    
    if (length === 2) return 'high'; // Direct circular dependency
    if (length === 3) return 'medium';
    if (length <= 5) return 'low';
    return 'critical'; // Very long cycles are critical
  }
}

// ============================================================================
// Report Generation
// ============================================================================

class ReportGenerator {
  /**
   * Generate a comprehensive text report
   */
  static generateTextReport(graph: DependencyGraph): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('INFRASTRUCTURE DEPENDENCY ANALYSIS REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    
    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(`Total Modules: ${graph.nodes.size}`);
    lines.push(`Total Dependencies: ${graph.edges.length}`);
    lines.push(`Circular Dependencies: ${graph.cycles.length}`);
    lines.push('');
    
    // Module list
    lines.push('MODULES');
    lines.push('-'.repeat(80));
    const sortedModules = Array.from(graph.nodes.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    for (const module of sortedModules) {
      const depCount = graph.edges.filter(e => e.from === module.id).length;
      const depByCount = graph.edges.filter(e => e.to === module.id).length;
      lines.push(`  ${module.name.padEnd(30)} | Exports: ${module.exports.length.toString().padStart(3)} | Deps: ${depCount.toString().padStart(3)} | Used by: ${depByCount.toString().padStart(3)}`);
    }
    lines.push('');
    
    // Circular dependencies
    if (graph.cycles.length > 0) {
      lines.push('CIRCULAR DEPENDENCIES');
      lines.push('-'.repeat(80));
      
      graph.cycles.forEach((cycle, index) => {
        lines.push(`\n${index + 1}. Severity: ${cycle.severity.toUpperCase()}`);
        lines.push(`   Modules involved: ${cycle.modules.join(', ')}`);
        lines.push(`   Dependency path: ${cycle.path.join(' → ')}`);
      });
      lines.push('');
    } else {
      lines.push('✅ No circular dependencies found!');
      lines.push('');
    }
    
    // Detailed module information
    lines.push('DETAILED MODULE INFORMATION');
    lines.push('-'.repeat(80));
    
    for (const module of sortedModules) {
      lines.push(`\n${module.name}`);
      lines.push(`  Path: ${module.path}`);
      lines.push(`  Exports (${module.exports.length}): ${module.exports.join(', ') || 'none'}`);
      
      const deps = graph.edges.filter(e => e.from === module.id);
      if (deps.length > 0) {
        lines.push(`  Dependencies (${deps.length}):`);
        deps.forEach(dep => {
          lines.push(`    - ${dep.to}`);
        });
      } else {
        lines.push(`  Dependencies: none`);
      }
    }
    
    lines.push('');
    lines.push('='.repeat(80));
    lines.push('END OF REPORT');
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  /**
   * Generate Mermaid diagram
   */
  static generateMermaidDiagram(graph: DependencyGraph): string {
    const lines: string[] = [];
    
    lines.push('```mermaid');
    lines.push('graph TD');
    lines.push('');
    
    // Add nodes
    const sortedModules = Array.from(graph.nodes.keys()).sort();
    for (const moduleName of sortedModules) {
      const nodeId = moduleName.toUpperCase().replace(/-/g, '_');
      lines.push(`    ${nodeId}[${moduleName}]`);
    }
    lines.push('');
    
    // Add edges
    const cycleModules = new Set<string>();
    graph.cycles.forEach(cycle => {
      cycle.modules.forEach(m => cycleModules.add(m));
    });
    
    for (const edge of graph.edges) {
      const fromId = edge.from.toUpperCase().replace(/-/g, '_');
      const toId = edge.to.toUpperCase().replace(/-/g, '_');
      
      // Highlight circular dependencies in red
      const isCyclic = cycleModules.has(edge.from) && cycleModules.has(edge.to);
      const style = isCyclic ? '-.->|circular|' : '-->';
      
      lines.push(`    ${fromId} ${style} ${toId}`);
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
    
    return lines.join('\n');
  }

  /**
   * Generate JSON report
   */
  static generateJSONReport(graph: DependencyGraph): string {
    const report = {
      summary: {
        totalModules: graph.nodes.size,
        totalDependencies: graph.edges.length,
        circularDependencies: graph.cycles.length,
        timestamp: new Date().toISOString(),
      },
      modules: Array.from(graph.nodes.values()).map(node => ({
        name: node.name,
        path: node.path,
        exports: node.exports,
        dependencies: graph.edges
          .filter(e => e.from === node.id)
          .map(e => e.to),
        usedBy: graph.edges
          .filter(e => e.to === node.id)
          .map(e => e.from),
      })),
      circularDependencies: graph.cycles.map(cycle => ({
        severity: cycle.severity,
        modules: cycle.modules,
        path: cycle.path,
      })),
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('🚀 Infrastructure Dependency Analysis\n');
  console.log('='.repeat(80));
  console.log('');
  
  const infrastructurePath = path.join(process.cwd(), 'client', 'src', 'infrastructure');
  
  // Analyze dependencies
  const analyzer = new DependencyAnalyzer(infrastructurePath);
  const graph = await analyzer.analyze();
  
  // Generate reports
  console.log('\n📝 Generating reports...\n');
  
  const outputDir = path.join(process.cwd(), 'analysis-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Text report
  const textReport = ReportGenerator.generateTextReport(graph);
  const textPath = path.join(outputDir, 'dependency-analysis.txt');
  fs.writeFileSync(textPath, textReport);
  console.log(`  ✅ Text report: ${textPath}`);
  
  // Mermaid diagram
  const mermaidDiagram = ReportGenerator.generateMermaidDiagram(graph);
  const mermaidPath = path.join(outputDir, 'dependency-graph.md');
  fs.writeFileSync(mermaidPath, mermaidDiagram);
  console.log(`  ✅ Mermaid diagram: ${mermaidPath}`);
  
  // JSON report
  const jsonReport = ReportGenerator.generateJSONReport(graph);
  const jsonPath = path.join(outputDir, 'dependency-analysis.json');
  fs.writeFileSync(jsonPath, jsonReport);
  console.log(`  ✅ JSON report: ${jsonPath}`);
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log(`\nTotal Modules: ${graph.nodes.size}`);
  console.log(`Total Dependencies: ${graph.edges.length}`);
  console.log(`Circular Dependencies: ${graph.cycles.length}`);
  
  if (graph.cycles.length > 0) {
    console.log('\n⚠️  Circular dependencies detected:');
    graph.cycles.forEach((cycle, index) => {
      console.log(`  ${index + 1}. [${cycle.severity.toUpperCase()}] ${cycle.modules.join(' ↔ ')}`);
    });
  } else {
    console.log('\n✅ No circular dependencies found!');
  }
  
  console.log('\n📁 Reports saved to:', outputDir);
  console.log('');
}

// Run the analysis
main().catch(error => {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
});
