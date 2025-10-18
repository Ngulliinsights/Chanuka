import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { logger } from '../../observability/logging';
import {
  AnalysisResult,
  AnalysisType,
  Finding,
  FindingType,
  FindingSeverity,
  Recommendation,
  RecommendedAction,
  TaskPriority,
  AnalysisMetrics,
  ModernizationError,
  ModernizationPhase
} from '../types';

export interface CleanupPlan {
  id: string;
  timestamp: Date;
  filesToRemove: FileOperation[];
  filesToMove: FileMove[];
  filesToConsolidate: FileConsolidation[];
  scriptsToMerge: ScriptMerge[];
  safetyChecks: SafetyCheck[];
}

export interface FileOperation {
  path: string;
  reason: string;
  category: FileCategory;
  size: number;
  lastModified: Date;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FileMove {
  source: string;
  destination: string;
  reason: string;
  category: FileCategory;
  createDirectory: boolean;
}

export interface FileConsolidation {
  sources: string[];
  target: string;
  strategy: 'merge' | 'replace' | 'combine';
  reason: string;
}

export interface ScriptMerge {
  scripts: string[];
  targetScript: string;
  functionality: string[];
  conflicts: string[];
}

export interface SafetyCheck {
  type: 'import_validation' | 'dependency_check' | 'build_test' | 'backup_verification';
  description: string;
  critical: boolean;
}

export enum FileCategory {
  REDUNDANT_SCRIPT = 'redundant_script',
  OBSOLETE_DOCUMENTATION = 'obsolete_documentation',
  TEMPORARY_FILE = 'temporary_file',
  DUPLICATE_CONFIG = 'duplicate_config',
  ANALYSIS_FILE = 'analysis_file',
  MIGRATION_SCRIPT = 'migration_script',
  TEST_FILE = 'test_file',
  ESSENTIAL_CONFIG = 'essential_config',
  CORE_DOCUMENTATION = 'core_documentation',
  BUILD_SCRIPT = 'build_script'
}

export interface CleanupResult {
  id: string;
  planId: string;
  timestamp: Date;
  success: boolean;
  filesProcessed: number;
  spaceSaved: number;
  errors: CleanupError[];
  warnings: string[];
  backupLocation?: string;
}

export interface CleanupError {
  file: string;
  operation: string;
  error: string;
  recoverable: boolean;
}

export class CleanupOrchestrator {
  private readonly rootPath: string;
  private readonly preservePatterns: RegExp[];
  private readonly removePatterns: RegExp[];

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
    
    // Patterns for files to preserve (essential files)
    this.preservePatterns = [
      /^package\.json$/,
      /^package-lock\.json$/,
      /^tsconfig.*\.json$/,
      /^\.gitignore$/,
      /^README\.md$/,
      /^LICENSE$/,
      /^CHANGELOG\.md$/,
      /^CONTRIBUTING\.md$/,
      /^CODE_OF_CONDUCT\.md$/,
      /^vercel\.json$/,
      /^firebase\.json$/,
      /^drizzle\.config\.ts$/,
      /^vite\.config\.ts$/,
      /^tailwind\.config\.ts$/,
      /^postcss\.config\.js$/,
      /^eslint\.config\.js$/,
      /^playwright\.config\.ts$/,
      /^vitest\.workspace\.ts$/,
      /^\.env\.example$/,
      /^index\.html$/
    ];

    // Patterns for files to remove (redundant/obsolete files)
    this.removePatterns = [
      /^migrate-.*\.(sh|ts)$/,
      /^.*-analysis\.md$/,
      /^.*-summary\.md$/,
      /^.*-plan\.md$/,
      /^.*-strategy\.md$/,
      /^.*-report\.md$/,
      /^test-.*\.(js|ts|cjs|tsx)$/,
      /^debug-.*\.sh$/,
      /^execute-.*\.sh$/,
      /^generate-.*\.sh$/,
      /^organize-.*\.sh$/,
      /^run-.*\.sh$/,
      /^update-.*\.sh$/,
      /^validate-.*\.ts$/,
      /^fix-.*\.(js|sh)$/,
      /^.*\.html$/ // except index.html which is preserved
    ];
  }

  async analyzeRootDirectory(): Promise<AnalysisResult> {
    try {
      const files = await this.scanRootDirectory();
      const categorizedFiles = await this.categorizeFiles(files);
      const findings = this.generateFindings(categorizedFiles);
      const recommendations = this.generateRecommendations(findings);
      const metrics = this.calculateMetrics(categorizedFiles, findings);

      return {
        id: `cleanup-analysis-${Date.now()}`,
        timestamp: new Date(),
        type: AnalysisType.ROOT_DIRECTORY_CLEANUP,
        scope: [this.rootPath],
        findings,
        recommendations,
        metrics
      };
    } catch (error) {
      throw new ModernizationError(
        `Failed to analyze root directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_ERROR',
        ModernizationPhase.ANALYSIS,
        true,
        { rootPath: this.rootPath }
      );
    }
  }

  async createCleanupPlan(analysisResult: AnalysisResult): Promise<CleanupPlan> {
    const filesToRemove: FileOperation[] = [];
    const filesToMove: FileMove[] = [];
    const filesToConsolidate: FileConsolidation[] = [];
    const scriptsToMerge: ScriptMerge[] = [];

    // Process findings to create operations
    for (const finding of analysisResult.findings) {
      switch (finding.type) {
        case FindingType.REDUNDANT_FILE:
          filesToRemove.push(await this.createRemoveOperation(finding));
          break;
        case FindingType.OBSOLETE_CODE:
          // Analysis files should be consolidated, not just moved
          if (finding.metadata?.category === FileCategory.ANALYSIS_FILE) {
            filesToRemove.push(await this.createRemoveOperation(finding));
          } else if (finding.location.endsWith('.md')) {
            filesToMove.push(this.createMoveOperation(finding));
          } else {
            filesToRemove.push(await this.createRemoveOperation(finding));
          }
          break;
      }
    }

    // Enhanced script consolidation system
    await this.planScriptConsolidation(filesToRemove, scriptsToMerge);

    // Enhanced documentation organization
    await this.planDocumentationOrganization(filesToRemove, filesToMove, filesToConsolidate);

    // Enhanced configuration file cleanup
    await this.planConfigurationCleanup(filesToRemove, filesToConsolidate);

    const safetyChecks: SafetyCheck[] = [
      {
        type: 'backup_verification',
        description: 'Verify backup creation before cleanup',
        critical: true
      },
      {
        type: 'import_validation',
        description: 'Check for import references to files being removed',
        critical: true
      },
      {
        type: 'dependency_check',
        description: 'Verify no critical dependencies on files being removed',
        critical: true
      },
      {
        type: 'build_test',
        description: 'Ensure build still works after cleanup',
        critical: false
      }
    ];

    return {
      id: `cleanup-plan-${Date.now()}`,
      timestamp: new Date(),
      filesToRemove,
      filesToMove,
      filesToConsolidate,
      scriptsToMerge,
      safetyChecks
    };
  }

  /**
   * Plan script consolidation to merge duplicate functionality
   */
  private async planScriptConsolidation(
    filesToRemove: FileOperation[], 
    scriptsToMerge: ScriptMerge[]
  ): Promise<void> {
    // Group scripts by functionality
    const migrationScripts = filesToRemove.filter(op => 
      op.category === FileCategory.MIGRATION_SCRIPT
    );
    
    const testScripts = filesToRemove.filter(op => 
      op.category === FileCategory.TEST_FILE && op.path.endsWith('.sh')
    );

    const debugScripts = filesToRemove.filter(op => 
      op.path.startsWith('debug-') && op.path.endsWith('.sh')
    );

    const executeScripts = filesToRemove.filter(op => 
      op.path.startsWith('execute-') && op.path.endsWith('.sh')
    );

    const updateScripts = filesToRemove.filter(op => 
      op.path.startsWith('update-') && op.path.endsWith('.sh')
    );

    // Consolidate migration scripts
    if (migrationScripts.length > 1) {
      scriptsToMerge.push({
        scripts: migrationScripts.map(s => s.path),
        targetScript: 'scripts/migration/consolidated-migration.sh',
        functionality: ['database migration', 'schema updates', 'data validation'],
        conflicts: await this.detectScriptConflicts(migrationScripts.map(s => s.path))
      });
    }

    // Consolidate test scripts
    if (testScripts.length > 1) {
      scriptsToMerge.push({
        scripts: testScripts.map(s => s.path),
        targetScript: 'scripts/testing/consolidated-test.sh',
        functionality: ['integration testing', 'endpoint testing', 'validation testing'],
        conflicts: await this.detectScriptConflicts(testScripts.map(s => s.path))
      });
    }

    // Consolidate debug scripts
    if (debugScripts.length > 1) {
      scriptsToMerge.push({
        scripts: debugScripts.map(s => s.path),
        targetScript: 'scripts/debug/consolidated-debug.sh',
        functionality: ['debugging utilities', 'diagnostic tools', 'troubleshooting'],
        conflicts: await this.detectScriptConflicts(debugScripts.map(s => s.path))
      });
    }

    // Consolidate execution scripts
    if (executeScripts.length > 1) {
      scriptsToMerge.push({
        scripts: executeScripts.map(s => s.path),
        targetScript: 'scripts/execution/consolidated-execute.sh',
        functionality: ['automated execution', 'batch operations', 'deployment tasks'],
        conflicts: await this.detectScriptConflicts(executeScripts.map(s => s.path))
      });
    }

    // Consolidate update scripts
    if (updateScripts.length > 1) {
      scriptsToMerge.push({
        scripts: updateScripts.map(s => s.path),
        targetScript: 'scripts/updates/consolidated-update.sh',
        functionality: ['dependency updates', 'configuration updates', 'import updates'],
        conflicts: await this.detectScriptConflicts(updateScripts.map(s => s.path))
      });
    }
  }

  /**
   * Plan documentation organization to move files to docs/ directory
   */
  private async planDocumentationOrganization(
    filesToRemove: FileOperation[],
    filesToMove: FileMove[],
    filesToConsolidate: FileConsolidation[]
  ): Promise<void> {
    // Group documentation files by type
    const analysisFiles = filesToRemove.filter(op => 
      op.category === FileCategory.ANALYSIS_FILE
    );

    const summaryFiles = filesToRemove.filter(op => 
      op.path.includes('summary') || op.path.includes('SUMMARY')
    );

    const planFiles = filesToRemove.filter(op => 
      op.path.includes('plan') || op.path.includes('PLAN')
    );

    const strategyFiles = filesToRemove.filter(op => 
      op.path.includes('strategy') || op.path.includes('STRATEGY')
    );

    const reportFiles = filesToRemove.filter(op => 
      op.path.includes('report') || op.path.includes('REPORT')
    );

    // Consolidate analysis documents
    if (analysisFiles.length > 0) {
      filesToConsolidate.push({
        sources: analysisFiles.map(f => f.path),
        target: 'docs/analysis/consolidated-analysis.md',
        strategy: 'merge',
        reason: 'Consolidate analysis documents into organized documentation structure'
      });
    }

    // Consolidate summary documents
    if (summaryFiles.length > 0) {
      filesToConsolidate.push({
        sources: summaryFiles.map(f => f.path),
        target: 'docs/summaries/project-summaries.md',
        strategy: 'merge',
        reason: 'Consolidate project summaries into single reference document'
      });
    }

    // Consolidate planning documents
    if (planFiles.length > 0) {
      filesToConsolidate.push({
        sources: planFiles.map(f => f.path),
        target: 'docs/planning/consolidated-plans.md',
        strategy: 'merge',
        reason: 'Consolidate planning documents for better organization'
      });
    }

    // Consolidate strategy documents
    if (strategyFiles.length > 0) {
      filesToConsolidate.push({
        sources: strategyFiles.map(f => f.path),
        target: 'docs/strategy/project-strategies.md',
        strategy: 'merge',
        reason: 'Consolidate strategic documents into unified strategy guide'
      });
    }

    // Consolidate report documents
    if (reportFiles.length > 0) {
      filesToConsolidate.push({
        sources: reportFiles.map(f => f.path),
        target: 'docs/reports/project-reports.md',
        strategy: 'merge',
        reason: 'Consolidate project reports into organized reporting structure'
      });
    }

    // Move standalone documentation files
    const standaloneDocFiles = filesToRemove.filter(op => 
      op.category === FileCategory.OBSOLETE_DOCUMENTATION &&
      !analysisFiles.includes(op) &&
      !summaryFiles.includes(op) &&
      !planFiles.includes(op) &&
      !strategyFiles.includes(op) &&
      !reportFiles.includes(op)
    );

    for (const docFile of standaloneDocFiles) {
      filesToMove.push({
        source: docFile.path,
        destination: `docs/archive/${docFile.path}`,
        reason: 'Move standalone documentation to archive for preservation',
        category: FileCategory.OBSOLETE_DOCUMENTATION,
        createDirectory: true
      });
    }
  }

  /**
   * Plan configuration file cleanup to remove unused env and config files
   */
  private async planConfigurationCleanup(
    filesToRemove: FileOperation[],
    filesToConsolidate: FileConsolidation[]
  ): Promise<void> {
    // Identify duplicate environment files
    const envFiles = await this.scanEnvironmentFiles();
    const duplicateEnvFiles = this.identifyDuplicateEnvFiles(envFiles);

    // Add duplicate env files to removal list
    for (const duplicateFile of duplicateEnvFiles) {
      const stats = await this.getFileStats(duplicateFile);
      filesToRemove.push({
        path: duplicateFile,
        reason: 'Duplicate environment configuration file',
        category: FileCategory.DUPLICATE_CONFIG,
        size: stats.size,
        lastModified: stats.mtime,
        dependencies: [],
        riskLevel: 'medium'
      });
    }

    // Identify obsolete configuration files
    const obsoleteConfigs = await this.identifyObsoleteConfigs();
    for (const configFile of obsoleteConfigs) {
      const stats = await this.getFileStats(configFile);
      filesToRemove.push({
        path: configFile,
        reason: 'Obsolete configuration file no longer used',
        category: FileCategory.DUPLICATE_CONFIG,
        size: stats.size,
        lastModified: stats.mtime,
        dependencies: [],
        riskLevel: 'low'
      });
    }

    // Plan configuration consolidation
    const configGroups = await this.groupRelatedConfigs();
    for (const group of configGroups) {
      if (group.files.length > 1) {
        filesToConsolidate.push({
          sources: group.files,
          target: group.target,
          strategy: 'combine',
          reason: `Consolidate ${group.type} configuration files`
        });
      }
    }
  }

  /**
   * Detect conflicts between scripts that will be merged
   */
  private async detectScriptConflicts(scriptPaths: string[]): Promise<string[]> {
    const conflicts: string[] = [];
    
    for (const scriptPath of scriptPaths) {
      try {
        const content = await fs.readFile(join(this.rootPath, scriptPath), 'utf-8');
        
        // Check for conflicting patterns
        if (content.includes('set -e') && content.includes('set +e')) {
          conflicts.push(`${scriptPath}: Conflicting error handling modes`);
        }
        
        if (content.includes('#!/bin/bash') && content.includes('#!/bin/sh')) {
          conflicts.push(`${scriptPath}: Mixed shell interpreters`);
        }
        
        // Check for conflicting environment variables
        const envVarPattern = /export\s+(\w+)=/g;
        const envVars = [...content.matchAll(envVarPattern)].map(match => match[1]);
        const duplicateVars = envVars.filter((item, index) => envVars.indexOf(item) !== index);
        
        if (duplicateVars.length > 0) {
          conflicts.push(`${scriptPath}: Duplicate environment variables: ${duplicateVars.join(', ')}`);
        }
        
      } catch (error) {
        conflicts.push(`${scriptPath}: Could not analyze for conflicts`);
      }
    }
    
    return conflicts;
  }

  /**
   * Scan for environment files in the root directory
   */
  private async scanEnvironmentFiles(): Promise<string[]> {
    const files = await fs.readdir(this.rootPath);
    return files.filter(file => file.startsWith('.env'));
  }

  /**
   * Identify duplicate environment files
   */
  private identifyDuplicateEnvFiles(envFiles: string[]): string[] {
    const duplicates: string[] = [];
    const baseFiles = new Set<string>();
    
    for (const file of envFiles) {
      // Keep .env.example as it's the template
      if (file === '.env.example') {
        continue;
      }
      
      // Check for environment-specific duplicates
      const basePattern = file.replace(/\.(production|staging|development|local)$/, '');
      
      if (baseFiles.has(basePattern)) {
        // This is a potential duplicate
        const existingFiles = envFiles.filter(f => f.startsWith(basePattern));
        
        // If we have both .env.production and .env.staging, keep both
        // But if we have .env.production.example and .env.production, remove the example
        if (existingFiles.some(f => f.endsWith('.example'))) {
          duplicates.push(...existingFiles.filter(f => f.endsWith('.example') && f !== '.env.example'));
        }
      }
      
      baseFiles.add(basePattern);
    }
    
    return duplicates;
  }

  /**
   * Identify obsolete configuration files
   */
  private async identifyObsoleteConfigs(): Promise<string[]> {
    const obsoleteConfigs: string[] = [];
    const files = await fs.readdir(this.rootPath);
    
    // Check for old configuration files that are no longer used
    const obsoletePatterns = [
      /^webpack\.config\.(old|backup|bak)\.js$/,
      /^babel\.config\.(old|backup|bak)\.js$/,
      /^\.eslintrc\.(old|backup|bak)$/,
      /^tsconfig\.(old|backup|bak)\.json$/,
      /^package\.(old|backup|bak)\.json$/
    ];
    
    for (const file of files) {
      if (obsoletePatterns.some(pattern => pattern.test(file))) {
        obsoleteConfigs.push(file);
      }
    }
    
    return obsoleteConfigs;
  }

  /**
   * Group related configuration files for consolidation
   */
  private async groupRelatedConfigs(): Promise<Array<{type: string, files: string[], target: string}>> {
    const groups: Array<{type: string, files: string[], target: string}> = [];
    const files = await fs.readdir(this.rootPath);
    
    // Group TypeScript config files
    const tsConfigs = files.filter(f => f.startsWith('tsconfig.') && f.endsWith('.json'));
    if (tsConfigs.length > 3) { // Keep main tsconfig.json and a few specialized ones
      groups.push({
        type: 'TypeScript',
        files: tsConfigs.slice(3), // Keep first 3, consolidate the rest
        target: 'config/consolidated-tsconfig.json'
      });
    }
    
    // Group test configuration files
    const testConfigs = files.filter(f => 
      (f.includes('test') || f.includes('spec')) && 
      (f.endsWith('.config.js') || f.endsWith('.config.ts'))
    );
    if (testConfigs.length > 1) {
      groups.push({
        type: 'Testing',
        files: testConfigs,
        target: 'config/test-configs.json'
      });
    }
    
    return groups;
  }

  /**
   * Get file statistics
   */
  private async getFileStats(filePath: string): Promise<{size: number, mtime: Date}> {
    try {
      const stats = await fs.stat(join(this.rootPath, filePath));
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch {
      return {
        size: 0,
        mtime: new Date()
      };
    }
  }

  private async scanRootDirectory(): Promise<string[]> {
    const files = await fs.readdir(this.rootPath);
    return files.filter(file => {
      // Only include files, not directories
      return !file.startsWith('.') || ['.env.example', '.gitignore'].includes(file);
    });
  }

  private async categorizeFiles(files: string[]): Promise<Map<string, FileCategory>> {
    const categorized = new Map<string, FileCategory>();

    for (const file of files) {
      const category = await this.categorizeFile(file);
      categorized.set(file, category);
    }

    return categorized;
  }

  private async categorizeFile(file: string): Promise<FileCategory> {
    const filePath = join(this.rootPath, file);
    
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        return FileCategory.ESSENTIAL_CONFIG; // Skip directories for now
      }

      // Check if file should be preserved
      if (this.preservePatterns.some(pattern => pattern.test(file))) {
        if (file.endsWith('.md')) {
          return FileCategory.CORE_DOCUMENTATION;
        }
        if (file.endsWith('.json') || file.endsWith('.ts') || file.endsWith('.js')) {
          return FileCategory.ESSENTIAL_CONFIG;
        }
        return FileCategory.BUILD_SCRIPT;
      }

      // Check if file should be removed
      if (this.removePatterns.some(pattern => pattern.test(file))) {
        // Check for analysis files first (more specific)
        if (file.includes('analysis') || file.includes('summary') || file.includes('plan')) {
          return FileCategory.ANALYSIS_FILE;
        }
        if (file.includes('migrate') || file.includes('migration')) {
          return FileCategory.MIGRATION_SCRIPT;
        }
        if (file.includes('test-') && !file.endsWith('.md')) {
          return FileCategory.TEST_FILE;
        }
        if (file.endsWith('.sh')) {
          return FileCategory.REDUNDANT_SCRIPT;
        }
        if (file.endsWith('.md')) {
          return FileCategory.OBSOLETE_DOCUMENTATION;
        }
        return FileCategory.TEMPORARY_FILE;
      }

      // Handle .env files
      if (file.startsWith('.env.') && file !== '.env.example') {
        return FileCategory.DUPLICATE_CONFIG;
      }

      // Default categorization
      if (file.endsWith('.md')) {
        return FileCategory.OBSOLETE_DOCUMENTATION;
      }

      return FileCategory.TEMPORARY_FILE;
    } catch (error) {
      return FileCategory.TEMPORARY_FILE;
    }
  }

  private generateFindings(categorizedFiles: Map<string, FileCategory>): Finding[] {
    const findings: Finding[] = [];
    let findingId = 1;

    for (const [file, category] of categorizedFiles) {
      if (this.shouldRemoveCategory(category)) {
        findings.push({
          id: `finding-${findingId++}`,
          type: this.getCategoryFindingType(category),
          severity: this.getCategorySeverity(category),
          description: this.getCategoryDescription(category, file),
          location: file,
          impact: this.getCategoryImpact(category),
          effort: this.getCategoryEffort(category),
          metadata: { category, fileType: extname(file) }
        });
      }
    }

    return findings;
  }

  private generateRecommendations(findings: Finding[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const groupedFindings = this.groupFindingsByType(findings);

    for (const [type, typeFindings] of groupedFindings) {
      recommendations.push({
        id: `rec-${type}-${Date.now()}`,
        title: this.getRecommendationTitle(type),
        description: this.getRecommendationDescription(type, typeFindings.length),
        action: this.getRecommendedAction(type),
        priority: this.getRecommendationPriority(type),
        estimatedEffort: typeFindings.reduce((sum, f) => sum + f.effort, 0),
        benefits: this.getRecommendationBenefits(type),
        risks: this.getRecommendationRisks(type)
      });
    }

    return recommendations;
  }

  private calculateMetrics(
    categorizedFiles: Map<string, FileCategory>, 
    findings: Finding[]
  ): AnalysisMetrics {
    const totalFiles = categorizedFiles.size;
    const issuesFound = findings.length;
    
    // Estimate savings
    const redundantFiles = findings.filter(f => 
      f.type === FindingType.REDUNDANT_FILE || f.type === FindingType.OBSOLETE_CODE
    );
    
    return {
      filesAnalyzed: totalFiles,
      issuesFound,
      estimatedSavings: {
        diskSpace: redundantFiles.length * 50, // KB estimate
        buildTime: redundantFiles.length * 2, // seconds estimate
        complexity: Math.floor(redundantFiles.length * 0.1) // complexity points
      },
      riskScore: this.calculateRiskScore(findings)
    };
  }

  private shouldRemoveCategory(category: FileCategory): boolean {
    return [
      FileCategory.REDUNDANT_SCRIPT,
      FileCategory.OBSOLETE_DOCUMENTATION,
      FileCategory.TEMPORARY_FILE,
      FileCategory.DUPLICATE_CONFIG,
      FileCategory.ANALYSIS_FILE,
      FileCategory.MIGRATION_SCRIPT,
      FileCategory.TEST_FILE
    ].includes(category);
  }

  private getCategoryFindingType(category: FileCategory): FindingType {
    switch (category) {
      case FileCategory.REDUNDANT_SCRIPT:
      case FileCategory.MIGRATION_SCRIPT:
      case FileCategory.TEST_FILE:
        return FindingType.REDUNDANT_FILE;
      case FileCategory.OBSOLETE_DOCUMENTATION:
        return FindingType.OBSOLETE_CODE;
      case FileCategory.ANALYSIS_FILE:
        return FindingType.OBSOLETE_CODE;
      case FileCategory.DUPLICATE_CONFIG:
        return FindingType.DEPENDENCY_CONFLICT;
      default:
        return FindingType.REDUNDANT_FILE;
    }
  }

  private getCategorySeverity(category: FileCategory): FindingSeverity {
    switch (category) {
      case FileCategory.DUPLICATE_CONFIG:
        return FindingSeverity.MEDIUM;
      case FileCategory.REDUNDANT_SCRIPT:
      case FileCategory.MIGRATION_SCRIPT:
        return FindingSeverity.LOW;
      default:
        return FindingSeverity.INFO;
    }
  }

  private getCategoryDescription(category: FileCategory, file: string): string {
    switch (category) {
      case FileCategory.REDUNDANT_SCRIPT:
        return `Redundant script file: ${file}`;
      case FileCategory.OBSOLETE_DOCUMENTATION:
        return `Obsolete documentation file: ${file}`;
      case FileCategory.ANALYSIS_FILE:
        return `Analysis file that should be moved to docs/: ${file}`;
      case FileCategory.MIGRATION_SCRIPT:
        return `Migration script that can be consolidated: ${file}`;
      case FileCategory.TEST_FILE:
        return `Temporary test file: ${file}`;
      case FileCategory.DUPLICATE_CONFIG:
        return `Duplicate configuration file: ${file}`;
      default:
        return `Temporary file: ${file}`;
    }
  }

  private getCategoryImpact(category: FileCategory): string {
    switch (category) {
      case FileCategory.REDUNDANT_SCRIPT:
        return 'Reduces codebase clutter and maintenance overhead';
      case FileCategory.OBSOLETE_DOCUMENTATION:
        return 'Improves documentation organization and clarity';
      case FileCategory.DUPLICATE_CONFIG:
        return 'Prevents configuration conflicts and confusion';
      default:
        return 'Reduces repository size and complexity';
    }
  }

  private getCategoryEffort(category: FileCategory): number {
    switch (category) {
      case FileCategory.DUPLICATE_CONFIG:
        return 3; // Higher effort due to potential dependencies
      case FileCategory.MIGRATION_SCRIPT:
        return 2; // Medium effort for consolidation
      default:
        return 1; // Low effort for simple removal
    }
  }

  private async createRemoveOperation(finding: Finding): Promise<FileOperation> {
    const filePath = join(this.rootPath, finding.location);
    let stats;
    
    try {
      stats = await fs.stat(filePath);
    } catch {
      stats = { size: 0, mtime: new Date() };
    }

    return {
      path: finding.location,
      reason: finding.description,
      category: finding.metadata?.category as FileCategory || FileCategory.TEMPORARY_FILE,
      size: stats.size,
      lastModified: stats.mtime,
      dependencies: [],
      riskLevel: finding.severity === FindingSeverity.HIGH ? 'high' : 
                 finding.severity === FindingSeverity.MEDIUM ? 'medium' : 'low'
    };
  }

  private createMoveOperation(finding: Finding): FileMove {
    const source = finding.location;
    const destination = source.endsWith('.md') ? 
      `docs/analysis/${basename(source)}` : 
      `archive/${basename(source)}`;

    return {
      source,
      destination,
      reason: finding.description,
      category: finding.metadata?.category as FileCategory || FileCategory.OBSOLETE_DOCUMENTATION,
      createDirectory: true
    };
  }

  private groupFindingsByType(findings: Finding[]): Map<FindingType, Finding[]> {
    const grouped = new Map<FindingType, Finding[]>();
    
    for (const finding of findings) {
      if (!grouped.has(finding.type)) {
        grouped.set(finding.type, []);
      }
      grouped.get(finding.type)!.push(finding);
    }
    
    return grouped;
  }

  private getRecommendationTitle(type: FindingType): string {
    switch (type) {
      case FindingType.REDUNDANT_FILE:
        return 'Remove Redundant Files';
      case FindingType.OBSOLETE_CODE:
        return 'Clean Up Obsolete Documentation';
      case FindingType.DEPENDENCY_CONFLICT:
        return 'Resolve Configuration Conflicts';
      default:
        return 'General Cleanup';
    }
  }

  private getRecommendationDescription(type: FindingType, count: number): string {
    switch (type) {
      case FindingType.REDUNDANT_FILE:
        return `Remove ${count} redundant files to reduce codebase clutter`;
      case FindingType.OBSOLETE_CODE:
        return `Move or remove ${count} obsolete documentation files`;
      case FindingType.DEPENDENCY_CONFLICT:
        return `Resolve ${count} configuration conflicts`;
      default:
        return `Address ${count} cleanup issues`;
    }
  }

  private getRecommendedAction(type: FindingType): RecommendedAction {
    switch (type) {
      case FindingType.REDUNDANT_FILE:
        return RecommendedAction.REMOVE;
      case FindingType.OBSOLETE_CODE:
        return RecommendedAction.MOVE;
      case FindingType.DEPENDENCY_CONFLICT:
        return RecommendedAction.CONSOLIDATE;
      default:
        return RecommendedAction.REMOVE;
    }
  }

  private getRecommendationPriority(type: FindingType): TaskPriority {
    switch (type) {
      case FindingType.DEPENDENCY_CONFLICT:
        return TaskPriority.HIGH;
      case FindingType.REDUNDANT_FILE:
        return TaskPriority.MEDIUM;
      default:
        return TaskPriority.LOW;
    }
  }

  private getRecommendationBenefits(type: FindingType): string[] {
    switch (type) {
      case FindingType.REDUNDANT_FILE:
        return [
          'Reduced repository size',
          'Cleaner project structure',
          'Faster builds and deployments',
          'Easier navigation'
        ];
      case FindingType.OBSOLETE_CODE:
        return [
          'Better documentation organization',
          'Reduced confusion',
          'Improved maintainability'
        ];
      case FindingType.DEPENDENCY_CONFLICT:
        return [
          'Resolved configuration conflicts',
          'Consistent environment setup',
          'Reduced deployment issues'
        ];
      default:
        return ['General cleanup benefits'];
    }
  }

  private getRecommendationRisks(type: FindingType): string[] {
    switch (type) {
      case FindingType.REDUNDANT_FILE:
        return [
          'Potential loss of historical information',
          'Risk of removing files with hidden dependencies'
        ];
      case FindingType.OBSOLETE_CODE:
        return [
          'Loss of analysis context',
          'Potential reference breaks'
        ];
      case FindingType.DEPENDENCY_CONFLICT:
        return [
          'Configuration changes may affect deployments',
          'Potential environment-specific issues'
        ];
      default:
        return ['General cleanup risks'];
    }
  }

  private calculateRiskScore(findings: Finding[]): number {
    let score = 0;
    
    for (const finding of findings) {
      switch (finding.severity) {
        case FindingSeverity.CRITICAL:
          score += 10;
          break;
        case FindingSeverity.HIGH:
          score += 5;
          break;
        case FindingSeverity.MEDIUM:
          score += 2;
          break;
        case FindingSeverity.LOW:
          score += 1;
          break;
        default:
          score += 0.5;
      }
    }
    
    return Math.min(score, 100); // Cap at 100
  }
}






