#!/usr/bin/env node
/**
 * Modern Project Analyzer - Orchestrates existing tools
 * 
 * Philosophy: Don't reinvent the wheel. Use battle-tested tools and add
 * project-specific intelligence on top.
 * 
 * Usage: npx tsx modern-project-analyzer.ts [options]
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface AnalyzerConfig {
  rootDir: string;
  outputDir: string;
  tools: {
    madge: boolean;          // Circular dependencies
    jscpd: boolean;          // Code duplication
    knip: boolean;           // Dead code
    dependencyCruiser: boolean; // Import analysis
    tsMorph: boolean;        // Type analysis
  };
}

const CONFIG: AnalyzerConfig = {
  rootDir: process.cwd(),
  outputDir: path.join(process.cwd(), 'analysis-results'),
  tools: {
    madge: true,
    jscpd: true,
    knip: true,
    dependencyCruiser: true,
    tsMorph: true,
  },
};

// ============================================================================
// Tool Orchestration
// ============================================================================

class ProjectAnalyzer {
  private results: Map<string, any> = new Map();

  constructor(private config: AnalyzerConfig) {}

  async analyze(): Promise<void> {
    console.log('🔍 Modern Project Analysis Starting...\n');
    
    await this.ensureOutputDir();
    await this.checkDependencies();
    
    const analyses = [
      this.analyzeCircularDependencies(),
      this.analyzeCodeDuplication(),
      this.analyzeDeadCode(),
      this.analyzeTypes(),
      this.analyzeArchitecture(),
    ];

    await Promise.all(analyses);
    
    await this.generateUnifiedReport();
  }

  private async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking tool availability...\n');
    
    const tools = [
      { name: 'madge', check: 'madge --version' },
      { name: 'jscpd', check: 'jscpd --version' },
      { name: 'knip', check: 'knip --version' },
    ];

    for (const tool of tools) {
      try {
        execSync(tool.check, { stdio: 'ignore' });
        console.log(`✅ ${tool.name} available`);
      } catch {
        console.log(`⚠️  ${tool.name} not found. Install: npm install -g ${tool.name}`);
      }
    }
    console.log('');
  }

  // ========================================================================
  // Analysis Methods
  // ========================================================================

  private async analyzeCircularDependencies(): Promise<void> {
    if (!this.config.tools.madge) return;
    
    console.log('🔄 Analyzing circular dependencies (madge)...');
    
    try {
      const output = execSync(
        'madge --circular --json --extensions ts,tsx,js,jsx .',
        { cwd: this.config.rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      
      const cycles = JSON.parse(output);
      this.results.set('circularDependencies', {
        tool: 'madge',
        count: Object.keys(cycles).length,
        cycles,
      });
      
      console.log(`   Found ${Object.keys(cycles).length} circular dependencies\n`);
    } catch (error: unknown) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }
  }

  private async analyzeCodeDuplication(): Promise<void> {
    if (!this.config.tools.jscpd) return;
    
    console.log('📋 Analyzing code duplication (jscpd)...');
    
    try {
      const outputPath = path.join(this.config.outputDir, 'jscpd-report.json');
      
      execSync(
        `jscpd . --format json --output ${outputPath} --min-lines 5 --min-tokens 50 --ignore "**/node_modules/**,**/dist/**,**/build/**"`,
        { cwd: this.config.rootDir, stdio: 'ignore' }
      );
      
      const report = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      this.results.set('codeDuplication', {
        tool: 'jscpd',
        percentage: report.statistics?.total?.percentage || 0,
        duplicates: report.duplicates?.length || 0,
        report,
      });
      
      console.log(`   Duplication: ${report.statistics?.total?.percentage || 0}%\n`);
    } catch (error: unknown) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }
  }

  private async analyzeDeadCode(): Promise<void> {
    if (!this.config.tools.knip) return;
    
    console.log('💀 Analyzing dead code (knip)...');
    
    try {
      const output = execSync(
        'knip --reporter json',
        { cwd: this.config.rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      
      const report = JSON.parse(output);
      this.results.set('deadCode', {
        tool: 'knip',
        unusedFiles: report.files?.length || 0,
        unusedDependencies: report.dependencies?.length || 0,
        unusedExports: report.exports?.length || 0,
        report,
      });
      
      console.log(`   Unused files: ${report.files?.length || 0}`);
      console.log(`   Unused exports: ${report.exports?.length || 0}\n`);
    } catch (error: unknown) {
      // Knip exits with non-zero when it finds issues
      console.log(`   ⚠️  Error or issues found\n`);
    }
  }

  private async analyzeTypes(): Promise<void> {
    console.log('📝 Analyzing type system...');
    
    try {
      // Use custom lightweight analysis for project-specific patterns
      const typeAnalysis = await this.analyzeTypeSystemPatterns();
      this.results.set('typeSystem', typeAnalysis);
      
      console.log(`   Type locations: ${typeAnalysis.locations.length}`);
      console.log(`   Duplicate patterns: ${typeAnalysis.duplicatePatterns.length}\n`);
    } catch (error: unknown) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }
  }

  private async analyzeTypeSystemPatterns(): Promise<any> {
    // Lightweight pattern detection specific to the Chanuka project issues
    const typeDirectories = [
      '@types',
      'types',
      'shared/types',
      'shared/core/types',
      'client/src/types',
      'server/types',
    ];

    const locations = [];
    const duplicatePatterns = new Map<string, string[]>();

    for (const dir of typeDirectories) {
      const fullPath = path.join(this.config.rootDir, dir);
      try {
        await fs.access(fullPath);
        locations.push(dir);
        
        // Check for common type files
        const commonTypes = ['api.ts', 'user.ts', 'auth.ts', 'models.ts'];
        for (const typeFile of commonTypes) {
          try {
            await fs.access(path.join(fullPath, typeFile));
            if (!duplicatePatterns.has(typeFile)) {
              duplicatePatterns.set(typeFile, []);
            }
            duplicatePatterns.get(typeFile)!.push(dir);
          } catch {}
        }
      } catch {}
    }

    return {
      locations,
      duplicatePatterns: Array.from(duplicatePatterns.entries())
        .filter(([_, locs]) => locs.length > 1)
        .map(([file, locs]) => ({ file, locations: locs })),
    };
  }

  private async analyzeArchitecture(): Promise<void> {
    console.log('🏗️  Analyzing architecture patterns...');
    
    const issues = await this.detectArchitecturalIssues();
    this.results.set('architecture', issues);
    
    console.log(`   Issues detected: ${issues.length}\n`);
  }

  private async detectArchitecturalIssues(): Promise<unknown[]> {
    const issues: unknown[] = [];

    // Check for competing storage patterns (Chanuka-specific)
    const hasLegacyStorage = await this.directoryExists('server/storage');
    const hasModernPersistence = await this.directoryExists('server/persistence');
    
    if (hasLegacyStorage && hasModernPersistence) {
      issues.push({
        category: 'Data Layer',
        severity: 'critical',
        description: 'Competing storage patterns detected (legacy storage/ and modern persistence/)',
        recommendation: 'Complete migration to persistence/ pattern',
      });
    }

    // Check for scattered auth implementations
    const authLocations = [
      'client/src/core/auth',
      'server/core/auth',
      'server/features/users/application',
      'shared/core/services',
    ];
    
    const existingAuthLocations = [];
    for (const loc of authLocations) {
      if (await this.directoryExists(loc)) {
        existingAuthLocations.push(loc);
      }
    }
    
    if (existingAuthLocations.length > 2) {
      issues.push({
        category: 'Authentication',
        severity: 'major',
        description: `Auth logic fragmented across ${existingAuthLocations.length} locations`,
        locations: existingAuthLocations,
        recommendation: 'Consolidate to single auth feature module',
      });
    }

    // Check for root directory clutter
    try {
      const rootFiles = await fs.readdir(this.config.rootDir);
      const scriptFiles = rootFiles.filter(f => 
        f.includes('fix-') || 
        f.includes('migrate-') || 
        f.includes('analyze-')
      );
      
      if (scriptFiles.length > 10) {
        issues.push({
          category: 'Project Hygiene',
          severity: 'minor',
          description: `${scriptFiles.length} maintenance scripts in root directory`,
          recommendation: 'Move to scripts/ directory',
        });
      }
    } catch {}

    return issues;
  }

  // ========================================================================
  // Report Generation
  // ========================================================================

  private async generateUnifiedReport(): Promise<void> {
    console.log('📊 Generating unified report...\n');

    const report = {
      timestamp: new Date().toISOString(),
      project: path.basename(this.config.rootDir),
      summary: this.generateSummary(),
      details: Object.fromEntries(this.results),
      recommendations: this.generateRecommendations(),
    };

    // Save JSON report
    const jsonPath = path.join(this.config.outputDir, 'unified-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    
    // Save Markdown report
    const mdPath = path.join(this.config.outputDir, 'unified-report.md');
    await fs.writeFile(mdPath, this.generateMarkdownReport(report));

    console.log(`✅ Analysis complete!`);
    console.log(`📁 Reports saved to: ${this.config.outputDir}`);
    console.log(`   - ${path.basename(jsonPath)}`);
    console.log(`   - ${path.basename(mdPath)}`);
  }

  private generateSummary(): any {
    const circular = this.results.get('circularDependencies');
    const duplication = this.results.get('codeDuplication');
    const deadCode = this.results.get('deadCode');
    const architecture = this.results.get('architecture');

    return {
      circularDependencies: circular?.count || 0,
      duplicationPercentage: duplication?.percentage || 0,
      unusedFiles: deadCode?.unusedFiles || 0,
      architecturalIssues: architecture?.length || 0,
      overallHealth: this.calculateHealthScore(),
    };
  }

  private calculateHealthScore(): string {
    const circular = this.results.get('circularDependencies')?.count || 0;
    const duplication = this.results.get('codeDuplication')?.percentage || 0;
    const issues = this.results.get('architecture')?.length || 0;

    let score = 100;
    score -= circular * 5;
    score -= duplication * 2;
    score -= issues * 10;

    if (score > 80) return 'Good';
    if (score > 60) return 'Fair';
    if (score > 40) return 'Poor';
    return 'Critical';
  }

  private generateRecommendations(): unknown[] {
    const recommendations = [];
    
    const circular = this.results.get('circularDependencies');
    if (circular?.count > 5) {
      recommendations.push({
        priority: 'high',
        category: 'Dependencies',
        issue: `${circular.count} circular dependencies detected`,
        action: 'Break circular dependencies using interfaces or dependency inversion',
        effort: '1-2 weeks',
      });
    }

    const duplication = this.results.get('codeDuplication');
    if (duplication?.percentage > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'Code Quality',
        issue: `${duplication.percentage}% code duplication`,
        action: 'Extract common patterns into shared utilities',
        effort: '2-3 weeks',
      });
    }

    const architecture = this.results.get('architecture') || [];
    for (const issue of architecture) {
      if (issue.severity === 'critical') {
        recommendations.push({
          priority: 'high',
          category: issue.category,
          issue: issue.description,
          action: issue.recommendation,
          effort: '2-4 weeks',
        });
      }
    }

    return recommendations;
  }

  private generateMarkdownReport(report: unknown): string {
    const md: string[] = [];
    
    md.push('# Project Analysis Report');
    md.push(`\nGenerated: ${report.timestamp}`);
    md.push(`Project: ${report.project}\n`);
    
    md.push('## Summary\n');
    md.push(`- Overall Health: **${report.summary.overallHealth}**`);
    md.push(`- Circular Dependencies: ${report.summary.circularDependencies}`);
    md.push(`- Code Duplication: ${report.summary.duplicationPercentage}%`);
    md.push(`- Unused Files: ${report.summary.unusedFiles}`);
    md.push(`- Architectural Issues: ${report.summary.architecturalIssues}\n`);
    
    if (report.recommendations.length > 0) {
      md.push('## Recommendations\n');
      report.recommendations.forEach((rec: unknown, i: number) => {
        md.push(`### ${i + 1}. ${rec.category} (${rec.priority} priority)`);
        md.push(`**Issue:** ${rec.issue}`);
        md.push(`**Action:** ${rec.action}`);
        md.push(`**Estimated Effort:** ${rec.effort}\n`);
      });
    }
    
    md.push('## Detailed Results\n');
    
    // Circular Dependencies
    if (report.details.circularDependencies) {
      md.push('### Circular Dependencies\n');
      md.push(`Tool: ${report.details.circularDependencies.tool}`);
      md.push(`Count: ${report.details.circularDependencies.count}\n`);
    }
    
    // Code Duplication
    if (report.details.codeDuplication) {
      md.push('### Code Duplication\n');
      md.push(`Tool: ${report.details.codeDuplication.tool}`);
      md.push(`Percentage: ${report.details.codeDuplication.percentage}%`);
      md.push(`Duplicate blocks: ${report.details.codeDuplication.duplicates}\n`);
    }
    
    // Architecture Issues
    if (report.details.architecture) {
      md.push('### Architecture Issues\n');
      report.details.architecture.forEach((issue: unknown) => {
        md.push(`#### ${issue.category} (${issue.severity})`);
        md.push(`${issue.description}`);
        if (issue.locations) {
          md.push(`Locations: ${issue.locations.join(', ')}`);
        }
        md.push('');
      });
    }
    
    return md.join('\n');
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.config.rootDir, dir);
      const stat = await fs.stat(fullPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const analyzer = new ProjectAnalyzer(CONFIG);
  
  try {
    await analyzer.analyze();
  } catch (error: unknown) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main();
