import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
// Use lightweight logger interface to avoid coupling to a specific runtime signature used across the codebase
type LoggerLike = {
  info: (meta: unknown, message?: string) => void;
  error: (err: unknown, message?: string) => void;
  debug?: (meta: unknown, message?: string) => void;
};

import type { AnalysisResult, Finding, Recommendation } from '/types';
import { AnalysisType, FindingType, FindingSeverity, RecommendedAction, TaskPriority, AnalysisError } from '/types';

export interface AnalysisEngineOptions {
  config: {
    enabled: boolean;
    types: AnalysisType[];
    parallel: boolean;
    timeout: number;
  };
  logger: LoggerLike;
  workingDirectory: string;
}

export class AnalysisEngine extends EventEmitter {
  private readonly config: AnalysisEngineOptions['config'];
  private readonly logger: LoggerLike;
  private readonly workingDirectory: string;

  constructor(options: AnalysisEngineOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger;
    this.workingDirectory = options.workingDirectory;
  }

  /**
   * Run comprehensive analysis across all enabled types
   */
  public async runComprehensiveAnalysis(): Promise<AnalysisResult[]> {
    this.logger.info({
      types: this.config.types,
      parallel: this.config.parallel
    }, 'Starting comprehensive analysis');

    const results: AnalysisResult[] = [];

    if (this.config.parallel) {
      const promises = this.config.types.map(type => this.runAnalysis(type));
      const analysisResults = await Promise.allSettled(promises);
      
      for (const result of analysisResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error(result.reason, 'Analysis failed');
          this.emit('analysis:error', result.reason);
        }
      }
    } else {
      for (const type of this.config.types) {
        try {
          const result = await this.runAnalysis(type);
          results.push(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error({ type, message }, 'Analysis failed');
          this.emit('analysis:error', error);
        }
      }
    }

    this.logger.info({ 
      resultsCount: results.length,
      totalFindings: results.reduce((sum, r) => sum + r.findings.length, 0),
      totalRecommendations: results.reduce((sum, r) => sum + r.recommendations.length, 0)
    }, 'Comprehensive analysis completed');

    return results;
  }

  /**
   * Run analysis for a specific type
   */
  public async runAnalysis(type: AnalysisType): Promise<AnalysisResult> {
    this.logger.info({}, `Starting analysis: ${type}`);
    this.emit('analysis:started', type);

    const startTime = Date.now();
    
  try {
      let result: AnalysisResult;
      
      switch (type) {
        case AnalysisType.ROOT_DIRECTORY_CLEANUP:
          result = await this.analyzeRootDirectoryCleanup();
          break;
        case AnalysisType.AI_INTEGRATION:
          result = await this.analyzeAiIntegration();
          break;
        case AnalysisType.UTILITIES_MIGRATION:
          result = await this.analyzeUtilitiesMigration();
          break;
        case AnalysisType.DEPENDENCY_ANALYSIS:
          result = await this.analyzeDependencies();
          break;
        case AnalysisType.PERFORMANCE_ANALYSIS:
          result = await this.analyzePerformance();
          break;
        default:
          throw new AnalysisError(`Unsupported analysis type: ${type}`, type);
      }

      const duration = Date.now() - startTime;
      this.logger.info({ 
        duration,
        findings: result.findings.length,
        recommendations: result.recommendations.length 
      }, `Analysis completed: ${type}`);
      
      this.emit('analysis:completed', result);
      return result;
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const analysisError = error instanceof AnalysisError
        ? error
        : new AnalysisError(`Analysis failed for ${type}: ${message}`, type);

      this.emit('analysis:error', analysisError);
      throw analysisError;
    }
  }

  private async analyzeRootDirectoryCleanup(): Promise<AnalysisResult> {
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];
    let filesAnalyzed = 0;

    try {
      const rootFiles = await fs.readdir(this.workingDirectory);
      filesAnalyzed = rootFiles.length;

      // Analyze each file in root directory
      for (const file of rootFiles) {
        const filePath = path.join(this.workingDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          const finding = await this.analyzeRootFile(file, filePath);
          if (finding) {
            findings.push(finding);
          }
        } else if (stats.isDirectory()) {
          const finding = await this.analyzeRootDirectory(file, filePath);
          if (finding) {
            findings.push(finding);
          }
        }
      }

      // Generate recommendations based on findings
      recommendations.push(...this.generateCleanupRecommendations(findings));

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AnalysisError(`Root directory analysis failed: ${message}`, AnalysisType.ROOT_DIRECTORY_CLEANUP);
    }

    return {
      id: `root-cleanup-${Date.now()}`,
      timestamp: new Date(),
      type: AnalysisType.ROOT_DIRECTORY_CLEANUP,
      scope: [this.workingDirectory],
      findings,
      recommendations,
      metrics: {
        filesAnalyzed,
        issuesFound: findings.length,
        estimatedSavings: {
          diskSpace: this.calculateDiskSpaceSavings(findings),
          buildTime: this.calculateBuildTimeSavings(findings),
          complexity: findings.length * 0.1
        },
        risk_score: this.calculateRiskScore(findings)
      }
    };
  }

  private async analyzeRootFile(fileName: string, filePath: string): Promise<Finding | null> {
    // Common files that should be in root
    const allowedRootFiles = [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'tsconfig.json', 'jsconfig.json', '.gitignore', '.gitattributes',
      'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md',
      '.env.example', '.nvmrc', '.node-version',
      'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
      'Makefile', 'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      '.eslintrc.js', '.eslintrc.json', '.prettierrc', '.editorconfig'
    ];

    // Files that are commonly misplaced in root
    const commonMisplacedFiles = [
      { pattern: /\.test\.(js|ts|jsx|tsx)$/, suggestion: 'Move to __tests__ or src/__tests__' },
      { pattern: /\.spec\.(js|ts|jsx|tsx)$/, suggestion: 'Move to __tests__ or src/__tests__' },
      { pattern: /\.(js|ts|jsx|tsx)$/, suggestion: 'Move to src/ directory' },
      { pattern: /\.css$/, suggestion: 'Move to src/styles/ or public/' },
      { pattern: /\.scss$/, suggestion: 'Move to src/styles/' },
      { pattern: /\.(png|jpg|jpeg|gif|svg|ico)$/, suggestion: 'Move to public/assets/ or src/assets/' },
      { pattern: /\.log$/, suggestion: 'Add to .gitignore and remove from repository' }
    ];

    if (allowedRootFiles.includes(fileName)) {
      return null; // File is appropriately placed
    }

    // Check for misplaced files
    for (const misplaced of commonMisplacedFiles) {
      if (misplaced.pattern.test(fileName)) {
        const stats = await fs.stat(filePath);
        return {
          id: `root-file-${fileName}`,
          type: FindingType.REDUNDANT_FILE,
          severity: FindingSeverity.MEDIUM,
          description: `File '${fileName}' should not be in root directory`,
          location: filePath,
          impact: misplaced.suggestion,
          effort: 1, // 1 minute to move file
          metadata: {
            fileSize: stats.size,
            suggestion: misplaced.suggestion,
            category: 'misplaced-file'
          }
        };
      }
    }

    // Check for obsolete files
    const obsoletePatterns = [
      /\.bak$/, /\.backup$/, /\.old$/, /\.orig$/,
      /^temp/, /^tmp/, /\.tmp$/,
      /^\.DS_Store$/, /^Thumbs\.db$/
    ];

    for (const pattern of obsoletePatterns) {
      if (pattern.test(fileName)) {
        const stats = await fs.stat(filePath);
        return {
          id: `obsolete-file-${fileName}`,
          type: FindingType.OBSOLETE_CODE,
          severity: FindingSeverity.LOW,
          description: `Obsolete file '${fileName}' can be safely removed`,
          location: filePath,
          impact: 'Reduces clutter and repository size',
          effort: 0.5, // 30 seconds to remove
          metadata: {
            fileSize: stats.size,
            category: 'obsolete-file'
          }
        };
      }
    }

    return null;
  }

  private async analyzeRootDirectory(dirName: string, dirPath: string): Promise<Finding | null> {
    // Common directories that should be in root
    const allowedRootDirs = [
      'src', 'lib', 'dist', 'build', 'public', 'static', 'assets',
      'docs', 'documentation', 'examples', 'demo',
      'test', 'tests', '__tests__', 'spec', '__specs__',
      'scripts', 'tools', 'config', 'configs',
      'node_modules', '.git', '.github', '.vscode',
      'coverage', '.nyc_output'
    ];

    if (allowedRootDirs.includes(dirName)) {
      return null;
    }

    // Check if directory is empty or contains only generated files
    try {
      const contents = await fs.readdir(dirPath);
      if (contents.length === 0) {
        return {
          id: `empty-dir-${dirName}`,
          type: FindingType.REDUNDANT_FILE,
          severity: FindingSeverity.LOW,
          description: `Empty directory '${dirName}' can be removed`,
          location: dirPath,
          impact: 'Reduces repository clutter',
          effort: 0.5,
          metadata: {
            category: 'empty-directory',
            isEmpty: true
          }
        };
      }
    } catch (_error) {
      // Directory might be inaccessible, skip analysis
      return null;
    }

    return null;
  }

  private async analyzeAiIntegration(): Promise<AnalysisResult> {
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];
    let filesAnalyzed = 0;

    try {
      // Check for existing AI-related files and configurations
      const aiPatterns = [
        'openai', 'anthropic', 'claude', 'gpt', 'llm', 'ai-',
        'machine-learning', 'ml-', 'neural', 'model'
      ];

      const searchResults = await this.searchForPatterns(aiPatterns);
      filesAnalyzed = searchResults.length;

      // Analyze current AI integration state
      const hasAiDependencies = await this.checkAiDependencies();
      const hasAiConfig = await this.checkAiConfiguration();
  const hasAiServices = await this.checkAiServices();

  if (!hasAiDependencies) {
        findings.push({
          id: 'missing-ai-deps',
          type: FindingType.MISSING_INTEGRATION,
          severity: FindingSeverity.HIGH,
          description: 'No AI service dependencies found',
          location: 'package.json',
          impact: 'Cannot integrate AI services without proper dependencies',
          effort: 5,
          metadata: { category: 'missing-dependencies' }
        });

        recommendations.push({
          id: 'add-ai-deps',
          title: 'Add AI Service Dependencies',
          description: 'Install necessary packages for AI service integration',
          action: RecommendedAction.CONFIGURE,
          priority: TaskPriority.HIGH,
          estimatedEffort: 10,
          benefits: ['Enable AI service integration', 'Support for multiple AI providers'],
          risks: ['Increased bundle size', 'Additional API costs']
        });
      }

      if (!hasAiConfig) {
        findings.push({
          id: 'missing-ai-config',
          type: FindingType.MISSING_INTEGRATION,
          severity: FindingSeverity.MEDIUM,
          description: 'No AI service configuration found',
          location: 'config/',
          impact: 'AI services cannot be properly configured',
          effort: 15,
          metadata: { category: 'missing-configuration' }
        });

        recommendations.push({
          id: 'add-ai-config',
          title: 'Create AI Configuration System',
          description: 'Set up configuration management for AI services',
          action: RecommendedAction.CONFIGURE,
          priority: TaskPriority.MEDIUM,
          estimatedEffort: 20,
          benefits: ['Centralized AI configuration', 'Environment-specific settings'],
          risks: ['Configuration complexity']
        });
      }

      if (!hasAiServices) {
        findings.push({
          id: 'missing-ai-services',
          type: FindingType.MISSING_INTEGRATION,
          severity: FindingSeverity.MEDIUM,
          description: 'No AI service implementations found in the codebase',
          location: this.workingDirectory,
          impact: 'No runtime hooks for AI providers',
          effort: 10,
          metadata: { category: 'missing-services' }
        });

        recommendations.push({
          id: 'implement-ai-services',
          title: 'Implement AI Service Stubs',
          description: 'Create service wrappers to interact with AI providers',
          action: RecommendedAction.CONFIGURE,
          priority: TaskPriority.MEDIUM,
          estimatedEffort: 20,
          benefits: ['Enables AI integrations', 'Standardized service interface'],
          risks: ['Service costs', 'Complexity']
        });
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AnalysisError(`AI integration analysis failed: ${message}`, AnalysisType.AI_INTEGRATION);
    }

    return {
      id: `ai-integration-${Date.now()}`,
      timestamp: new Date(),
      type: AnalysisType.AI_INTEGRATION,
      scope: [this.workingDirectory],
      findings,
      recommendations,
      metrics: {
        filesAnalyzed,
        issuesFound: findings.length,
        estimatedSavings: {
          diskSpace: 0,
          buildTime: 0,
          complexity: -findings.length * 0.2 // AI integration adds complexity
        },
        risk_score: this.calculateRiskScore(findings)
      }
    };
  }

  private async analyzeUtilitiesMigration(): Promise<AnalysisResult> {
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];
    let filesAnalyzed = 0;

    try {
      // Look for utility files that could be consolidated
      const utilityPatterns = [
        'utils', 'util', 'helpers', 'helper', 'common', 'shared',
        'lib', 'libs', 'tools', 'functions'
      ];

      const utilityFiles = await this.findUtilityFiles(utilityPatterns);
      filesAnalyzed = utilityFiles.length;

      // Analyze for consolidation opportunities
      const duplicateUtils = await this.findDuplicateUtilities(utilityFiles);
      const scatteredUtils = await this.findScatteredUtilities(utilityFiles);

      findings.push(...duplicateUtils, ...scatteredUtils);

      // Generate consolidation recommendations
      if (findings.length > 0) {
        recommendations.push({
          id: 'consolidate-utilities',
          title: 'Consolidate Utility Functions',
          description: 'Move scattered utility functions to centralized core module',
          action: RecommendedAction.CONSOLIDATE,
          priority: TaskPriority.MEDIUM,
          estimatedEffort: findings.length * 5,
          benefits: ['Reduced code duplication', 'Better maintainability', 'Consistent API'],
          risks: ['Breaking changes', 'Import path updates needed']
        });
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AnalysisError(`Utilities migration analysis failed: ${message}`, AnalysisType.UTILITIES_MIGRATION);
    }

    return {
      id: `utilities-migration-${Date.now()}`,
      timestamp: new Date(),
      type: AnalysisType.UTILITIES_MIGRATION,
      scope: [this.workingDirectory],
      findings,
      recommendations,
      metrics: {
        filesAnalyzed,
        issuesFound: findings.length,
        estimatedSavings: {
          diskSpace: findings.length * 1024, // Assume 1KB saved per consolidated utility
          buildTime: findings.length * 0.1, // Small build time improvement
          complexity: findings.length * 0.3 // Complexity reduction
        },
        risk_score: this.calculateRiskScore(findings)
      }
    };
  }

  private async analyzeDependencies(): Promise<AnalysisResult> {
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];
    let filesAnalyzed = 0;

    try {
      const packageJsonPath = path.join(this.workingDirectory, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {},
        ...packageJson.peerDependencies || {}
      };

      filesAnalyzed = Object.keys(allDeps).length;

      // Check for outdated dependencies
      const outdatedDeps = await this.checkOutdatedDependencies(allDeps);
      findings.push(...outdatedDeps);

      // Check for unused dependencies
      const unusedDeps = await this.checkUnusedDependencies(allDeps);
      findings.push(...unusedDeps);

      // Check for security vulnerabilities
      const vulnerableDeps = await this.checkVulnerableDependencies(allDeps);
      findings.push(...vulnerableDeps);

      // Generate recommendations
      if (findings.length > 0) {
        recommendations.push({
          id: 'update-dependencies',
          title: 'Update and Clean Dependencies',
          description: 'Update outdated packages and remove unused dependencies',
          action: RecommendedAction.UPGRADE,
          priority: TaskPriority.HIGH,
          estimatedEffort: findings.length * 2,
          benefits: ['Security improvements', 'Performance gains', 'Reduced bundle size'],
          risks: ['Breaking changes', 'Compatibility issues']
        });
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AnalysisError(`Dependency analysis failed: ${message}`, AnalysisType.DEPENDENCY_ANALYSIS);
    }

    return {
      id: `dependency-analysis-${Date.now()}`,
      timestamp: new Date(),
      type: AnalysisType.DEPENDENCY_ANALYSIS,
      scope: ['package.json'],
      findings,
      recommendations,
      metrics: {
        filesAnalyzed,
        issuesFound: findings.length,
        estimatedSavings: {
          diskSpace: findings.filter(f => f.type === FindingType.REDUNDANT_FILE).length * 1024,
          buildTime: findings.length * 0.5,
          complexity: findings.length * 0.2
        },
        risk_score: this.calculateRiskScore(findings)
      }
    };
  }

  private async analyzePerformance(): Promise<AnalysisResult> {
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];
    let filesAnalyzed = 0;

    try {
      // Analyze bundle size and build performance
      const performanceIssues = await this.checkPerformanceIssues();
      findings.push(...performanceIssues);
      filesAnalyzed = performanceIssues.length;

      // Generate performance recommendations
      if (findings.length > 0) {
        recommendations.push({
          id: 'optimize-performance',
          title: 'Optimize Build and Runtime Performance',
          description: 'Address performance bottlenecks and optimization opportunities',
          action: RecommendedAction.REFACTOR,
          priority: TaskPriority.MEDIUM,
          estimatedEffort: findings.length * 10,
          benefits: ['Faster build times', 'Smaller bundle size', 'Better runtime performance'],
          risks: ['Code complexity', 'Potential regressions']
        });
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AnalysisError(`Performance analysis failed: ${message}`, AnalysisType.PERFORMANCE_ANALYSIS);
    }

    return {
      id: `performance-analysis-${Date.now()}`,
      timestamp: new Date(),
      type: AnalysisType.PERFORMANCE_ANALYSIS,
      scope: [this.workingDirectory],
      findings,
      recommendations,
      metrics: {
        filesAnalyzed,
        issuesFound: findings.length,
        estimatedSavings: {
          diskSpace: 0,
          buildTime: findings.length * 2, // Assume 2 seconds saved per optimization
          complexity: 0
        },
        risk_score: this.calculateRiskScore(findings)
      }
    };
  }

  // Helper methods (simplified implementations)
  private generateCleanupRecommendations(findings: Finding[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const redundantFiles = findings.filter(f => f.type === FindingType.REDUNDANT_FILE);
    const obsoleteFiles = findings.filter(f => f.type === FindingType.OBSOLETE_CODE);

    if (redundantFiles.length > 0) {
      recommendations.push({
        id: 'cleanup-redundant-files',
        title: 'Clean Up Redundant Files',
        description: `Remove or relocate ${redundantFiles.length} redundant files from root directory`,
        action: RecommendedAction.MOVE,
        priority: TaskPriority.MEDIUM,
        estimatedEffort: redundantFiles.length * 2,
        benefits: ['Cleaner project structure', 'Reduced confusion'],
        risks: ['Potential import path changes']
      });
    }

    if (obsoleteFiles.length > 0) {
      recommendations.push({
        id: 'remove-obsolete-files',
        title: 'Remove Obsolete Files',
        description: `Delete ${obsoleteFiles.length} obsolete files`,
        action: RecommendedAction.REMOVE,
        priority: TaskPriority.LOW,
        estimatedEffort: obsoleteFiles.length,
        benefits: ['Reduced repository size', 'Less clutter'],
        risks: ['Minimal - files are obsolete']
      });
    }

    return recommendations;
  }

  private calculateDiskSpaceSavings(findings: Finding[]): number {
    return findings.reduce((total, finding) => {
      const fileSize = finding.metadata?.fileSize as number || 1024;
      return total + fileSize;
    }, 0);
  }

  private calculateBuildTimeSavings(findings: Finding[]): number {
    return findings.length * 0.1; // Assume 0.1 seconds saved per cleaned file
  }

  private calculateRiskScore(findings: Finding[]): number {
    const severityWeights = {
      [FindingSeverity.INFO]: 0.1,
      [FindingSeverity.LOW]: 0.2,
      [FindingSeverity.MEDIUM]: 0.5,
      [FindingSeverity.HIGH]: 0.8,
      [FindingSeverity.CRITICAL]: 1.0
    };

    const totalWeight = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity];
    }, 0);

    return Math.min(totalWeight / findings.length || 0, 1.0);
  }

  // Placeholder implementations for complex analysis methods
  private async searchForPatterns(patterns: string[]): Promise<string[]> {
    // Simplified implementation - would use proper file search
    // Reference patterns to avoid unused-parameter lint warning
    void patterns;
    return [];
  }

  private async checkAiDependencies(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workingDirectory, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      const aiPackages = ['openai', '@anthropic-ai/sdk', 'langchain', '@google/generative-ai'];
      return aiPackages.some(pkg => pkg in allDeps);
    } catch {
      return false;
    }
  }

  private async checkAiConfiguration(): Promise<boolean> {
    // Check for AI-related config files
    const configPaths = [
      'config/ai.json',
      'src/config/ai.ts',
      '.env.example'
    ];

    for (const configPath of configPaths) {
      try {
        await fs.access(path.join(this.workingDirectory, configPath));
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  private async checkAiServices(): Promise<boolean> {
    // Check for AI service files
    const servicePaths = [
      'src/services/ai',
      'src/ai',
      'lib/ai'
    ];

    for (const servicePath of servicePaths) {
      try {
        await fs.access(path.join(this.workingDirectory, servicePath));
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  private async findUtilityFiles(_patterns: string[]): Promise<string[]> {
    // Simplified implementation
    return [];
  }

  private async findDuplicateUtilities(_files: string[]): Promise<Finding[]> {
    // Simplified implementation
    return [];
  }

  private async findScatteredUtilities(_files: string[]): Promise<Finding[]> {
    // Simplified implementation
    return [];
  }

  private async checkOutdatedDependencies(_deps: Record<string, string>): Promise<Finding[]> {
    // Simplified implementation
    return [];
  }

  private async checkUnusedDependencies(_deps: Record<string, string>): Promise<Finding[]> {
    // Simplified implementation
    return [];
  }

  private async checkVulnerableDependencies(_deps: Record<string, string>): Promise<Finding[]> {
    // Simplified implementation
    return [];
  }

  private async checkPerformanceIssues(): Promise<Finding[]> {
    // Simplified implementation
    return [];
  }
}














































