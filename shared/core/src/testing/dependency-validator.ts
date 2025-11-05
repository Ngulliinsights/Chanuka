import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * Dependency validation and hygiene tools
 * Detects circular dependencies, enforces layer boundaries, and validates architecture rules
 */
export class DependencyValidator extends EventEmitter {
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private layerDefinitions: Map<string, LayerDefinition> = new Map();
  private validationResults: any[] = [];

  constructor(private config: DependencyValidationConfig = {}) {
    super();
  }

  /**
   * Analyze project dependencies and build dependency graph
   */
  async analyzeDependencies(rootPath: string): Promise<DependencyAnalysisResult> {
    this.emit('analysis:start', { rootPath });

    try {
      // Build dependency graph
      await this.buildDependencyGraph(rootPath);

      // Analyze for issues
      const circularDeps = this.detectCircularDependencies();
      const layerViolations = this.detectLayerViolations();
      const hygieneIssues = await this.analyzeDependencyHygiene();

      const result: DependencyAnalysisResult = {
        timestamp: new Date(),
        rootPath,
        dependencyGraph: this.serializeDependencyGraph(),
        circularDependencies: circularDeps,
        layerViolations,
        hygieneIssues,
        summary: this.generateAnalysisSummary(circularDeps, layerViolations, hygieneIssues)
      };

      this.emit('analysis:complete', result);
      return result;

    } catch (error) {
      this.emit('analysis:error', error);
      throw error;
    }
  }

  /**
   * Build dependency graph from source files
   */
  private async buildDependencyGraph(rootPath: string): Promise<void> {
    const files = await this.findSourceFiles(rootPath);

    for (const file of files) {
      const dependencies = await this.extractDependencies(file);
      this.dependencyGraph.set(this.normalizePath(file), dependencies);
    }
  }

  /**
   * Find all source files in the project
   */
  private async findSourceFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = this.config.fileExtensions || ['.ts', '.js', '.tsx', '.jsx'];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and other excluded directories
        if (entry.isDirectory()) {
          if (!this.shouldSkipDirectory(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    await walk(rootPath);
    return files;
  }

  /**
   * Extract dependencies from a source file
   */
  private async extractDependencies(filePath: string): Promise<Set<string>> {
    const dependencies = new Set<string>();

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const importRegex = /(?:import|require)\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.add(this.resolveImportPath(match[1], filePath));
      }

      while ((match = dynamicImportRegex.exec(content)) !== null) {
        dependencies.add(this.resolveImportPath(match[1], filePath));
      }
    } catch (error) {
      this.emit('dependency:extraction:error', { file: filePath, error });
    }

    return dependencies;
  }

  /**
   * Resolve import path to absolute path
   */
  private resolveImportPath(importPath: string, fromFile: string): string {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(fromFile), importPath);
      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return this.normalizePath(withExt);
        }
        // Try index files
        const indexFile = path.join(resolved, 'index' + ext);
        if (fs.existsSync(indexFile)) {
          return this.normalizePath(indexFile);
        }
      }
      return this.normalizePath(resolved);
    }

    // For absolute imports, just normalize
    return this.normalizePath(importPath);
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  private detectCircularDependencies(): CircularDependency[] {
    const circularDeps: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        // Found circular dependency
        const cycleStart = path.indexOf(node);
        const cycle = [...path.slice(cycleStart), node];
        circularDeps.push({
          cycle,
          severity: cycle.length > 3 ? 'high' : 'medium',
          impact: this.assessCircularDependencyImpact(cycle)
        });
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);

      const dependencies = this.dependencyGraph.get(node);
      if (dependencies) {
        for (const dep of Array.from(dependencies)) {
          if (dfs(dep, [...path, node])) {
            return true;
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of Array.from(this.dependencyGraph.keys())) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return circularDeps;
  }

  /**
   * Detect layer boundary violations
   */
  private detectLayerViolations(): LayerViolation[] {
    const violations: LayerViolation[] = [];

    for (const [file, dependencies] of Array.from(this.dependencyGraph.entries())) {
      const fileLayer = this.getFileLayer(file);

      for (const dep of Array.from(dependencies)) {
        const depLayer = this.getFileLayer(dep);

        if (fileLayer && depLayer) {
          const violation = this.checkLayerBoundary(fileLayer, depLayer);
          if (violation) {
            violations.push({
              from: file,
              to: dep,
              fromLayer: fileLayer.name,
              toLayer: depLayer.name,
              rule: violation.rule,
              severity: violation.severity
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Analyze dependency hygiene issues
   */
  private async analyzeDependencyHygiene(): Promise<HygieneIssue[]> {
    const issues: HygieneIssue[] = [];

    // Check for unused dependencies
    issues.push(...await this.detectUnusedDependencies());

    // Check for missing dependencies
    issues.push(...await this.detectMissingDependencies());

    // Check for deprecated dependencies
    issues.push(...await this.detectDeprecatedDependencies());

    // Check for security vulnerabilities
    issues.push(...await this.detectSecurityIssues());

    return issues;
  }

  /**
   * Detect unused dependencies
   */
  private async detectUnusedDependencies(): Promise<HygieneIssue[]> {
    const issues: HygieneIssue[] = [];

    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const [dep, version] of Object.entries(dependencies)) {
        if (!await this.isDependencyUsed(dep)) {
          issues.push({
            type: 'unused-dependency',
            package: dep,
            severity: 'low',
            message: `Unused dependency: ${dep}@${version}`,
            suggestion: 'Remove unused dependency to reduce bundle size'
          });
        }
      }
    } catch (error) {
      // Package.json might not exist or be readable
    }

    return issues;
  }

  /**
   * Detect missing dependencies
   */
  private async detectMissingDependencies(): Promise<HygieneIssue[]> {
    const issues: HygieneIssue[] = [];

    for (const [file, dependencies] of Array.from(this.dependencyGraph.entries())) {
      for (const dep of Array.from(dependencies)) {
        if (dep.startsWith('@') || dep.includes('/')) {
          // External dependency
          if (!await this.isExternalDependencyInstalled(dep)) {
            issues.push({
              type: 'missing-dependency',
              file,
              dependency: dep,
              severity: 'high',
              message: `Missing dependency: ${dep}`,
              suggestion: 'Install the missing dependency'
            });
          }
        } else {
          // Local file dependency
          if (!fs.existsSync(dep)) {
            issues.push({
              type: 'missing-file',
              file,
              dependency: dep,
              severity: 'high',
              message: `Missing file: ${dep}`,
              suggestion: 'Check file path and ensure file exists'
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Detect deprecated dependencies
   */
  private async detectDeprecatedDependencies(): Promise<HygieneIssue[]> {
    const issues: HygieneIssue[] = [];

    try {
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // This would typically check against an external API or database
      // For now, we'll check for known deprecated packages
      const deprecatedPackages = ['left-pad', 'flatten']; // Example

      for (const dep of Object.keys(dependencies)) {
        if (deprecatedPackages.includes(dep)) {
          issues.push({
            type: 'deprecated-dependency',
            package: dep,
            severity: 'medium',
            message: `Deprecated dependency: ${dep}`,
            suggestion: 'Replace with maintained alternative'
          });
        }
      }
    } catch (error) {
      // Ignore errors reading package.json
    }

    return issues;
  }

  /**
   * Detect security issues in dependencies
   */
  private async detectSecurityIssues(): Promise<HygieneIssue[]> {
    const issues: HygieneIssue[] = [];

    try {
      // This would typically run security audit tools like npm audit
      // For now, we'll simulate basic checks
      const packageJson = await this.readPackageJson();
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for known vulnerable packages (simplified)
      const vulnerablePackages = ['vulnerable-package']; // Example

      for (const dep of Object.keys(dependencies)) {
        if (vulnerablePackages.includes(dep)) {
          issues.push({
            type: 'security-vulnerability',
            package: dep,
            severity: 'critical',
            message: `Security vulnerability in: ${dep}`,
            suggestion: 'Update to patched version immediately'
          });
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return issues;
  }

  // Helper methods
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private normalizePath(filePath: string): string {
    return path.resolve(filePath).replace(/\\/g, '/');
  }

  private assessCircularDependencyImpact(cycle: string[]): 'low' | 'medium' | 'high' {
    // Simple heuristic: longer cycles are more problematic
    if (cycle.length > 5) return 'high';
    if (cycle.length > 3) return 'medium';
    return 'low';
  }

  private getFileLayer(filePath: string): LayerDefinition | null {
    // Simple layer detection based on path
    if (filePath.includes('/presentation/') || filePath.includes('/ui/')) {
      return { name: 'presentation', level: 1, allowedImports: ['application', 'domain', 'infrastructure'] };
    }
    if (filePath.includes('/application/') || filePath.includes('/services/')) {
      return { name: 'application', level: 2, allowedImports: ['domain', 'infrastructure'] };
    }
    if (filePath.includes('/domain/') || filePath.includes('/entities/')) {
      return { name: 'domain', level: 3, allowedImports: ['infrastructure'] };
    }
    if (filePath.includes('/infrastructure/') || filePath.includes('/repositories/')) {
      return { name: 'infrastructure', level: 4, allowedImports: [] };
    }
    return null;
  }

  private checkLayerBoundary(fromLayer: LayerDefinition, toLayer: LayerDefinition): LayerBoundaryViolation | null {
    if (fromLayer.level <= toLayer.level && !fromLayer.allowedImports.includes(toLayer.name)) {
      return {
        rule: `${fromLayer.name} layer cannot import from ${toLayer.name} layer`,
        severity: fromLayer.level - toLayer.level > 1 ? 'high' : 'medium'
      };
    }
    return null;
  }

  private async readPackageJson(): Promise<any> {
    const packagePath = path.join(process.cwd(), 'package.json');
    const content = await fs.promises.readFile(packagePath, 'utf-8');
    return JSON.parse(content);
  }

  private async isDependencyUsed(dep: string): Promise<boolean> {
    // Simple check - look for imports in source files
    for (const [file, dependencies] of Array.from(this.dependencyGraph.entries())) {
      for (const fileDep of Array.from(dependencies)) {
        if (fileDep.includes(dep)) {
          return true;
        }
      }
    }
    return false;
  }

  private async isExternalDependencyInstalled(dep: string): Promise<boolean> {
    try {
      const packageJson = await this.readPackageJson();
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      return dep in allDeps;
    } catch {
      return false;
    }
  }

  private serializeDependencyGraph(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [file, deps] of Array.from(this.dependencyGraph.entries())) {
      result[file] = Array.from(deps);
    }
    return result;
  }

  private generateAnalysisSummary(
    circularDeps: CircularDependency[],
    layerViolations: LayerViolation[],
    hygieneIssues: HygieneIssue[]
  ): AnalysisSummary {
    const totalIssues = circularDeps.length + layerViolations.length + hygieneIssues.length;
    const criticalIssues = [
      ...circularDeps.filter(d => d.severity === 'high'),
      ...layerViolations.filter(v => v.severity === 'high'),
      ...hygieneIssues.filter(i => i.severity === 'critical')
    ].length;

    return {
      totalIssues,
      criticalIssues,
      circularDependenciesCount: circularDeps.length,
      layerViolationsCount: layerViolations.length,
      hygieneIssuesCount: hygieneIssues.length,
      healthScore: Math.max(0, 100 - (totalIssues * 5) - (criticalIssues * 20))
    };
  }
}

// Type definitions
export interface DependencyValidationConfig {
  fileExtensions?: string[];
  excludePatterns?: string[];
  layerDefinitions?: Record<string, LayerDefinition>;
}

export interface LayerDefinition {
  name: string;
  level: number;
  allowedImports: string[];
}

export interface DependencyAnalysisResult {
  timestamp: Date;
  rootPath: string;
  dependencyGraph: Record<string, string[]>;
  circularDependencies: CircularDependency[];
  layerViolations: LayerViolation[];
  hygieneIssues: HygieneIssue[];
  summary: AnalysisSummary;
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface LayerViolation {
  from: string;
  to: string;
  fromLayer: string;
  toLayer: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
}

export interface HygieneIssue {
  type: 'unused-dependency' | 'missing-dependency' | 'missing-file' | 'deprecated-dependency' | 'security-vulnerability';
  package?: string;
  file?: string;
  dependency?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
}

export interface AnalysisSummary {
  totalIssues: number;
  criticalIssues: number;
  circularDependenciesCount: number;
  layerViolationsCount: number;
  hygieneIssuesCount: number;
  healthScore: number;
}

interface LayerBoundaryViolation {
  rule: string;
  severity: 'low' | 'medium' | 'high';
}





































