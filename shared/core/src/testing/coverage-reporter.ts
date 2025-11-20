import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * Comprehensive test coverage reporting and analysis
 * Provides detailed coverage metrics, trends, and recommendations
 */
export class CoverageReporter extends EventEmitter {
  private coverageData: CoverageData[] = [];
  private baselineCoverage: CoverageBaseline | null = null;
  private coverageHistory: CoverageHistoryEntry[] = [];

  constructor(private config: CoverageReporterConfig = {}) {
    super();
  }

  /**
   * Generate comprehensive coverage report
   */
  async generateReport(coverageFiles: string[]): Promise<CoverageReport> {
    this.emit('report:start', { files: coverageFiles.length });

    try {
      // Load coverage data
      const coverageData = await this.loadCoverageData(coverageFiles);

      // Analyze coverage
      const analysis = this.analyzeCoverage(coverageData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(analysis);

      // Calculate trends
      const trends = this.calculateTrends(coverageData);

      const report: CoverageReport = {
        timestamp: new Date(),
        summary: this.generateSummary(analysis),
        analysis,
        recommendations,
        trends,
        files: coverageData,
        config: this.config
      };

      this.emit('report:complete', report);
      return report;

    } catch (error) {
      this.emit('report:error', error);
      throw error;
    }
  }

  /**
   * Load coverage data from various formats
   */
  private async loadCoverageData(files: string[]): Promise<CoverageData[]> {
    const coverageData: CoverageData[] = [];

    for (const file of files) {
      try {
        const data = await this.parseCoverageFile(file);
        coverageData.push(data);
      } catch (error) {
        this.emit('coverage:load:error', { file, error });
      }
    }

    return coverageData;
  }

  /**
   * Parse coverage file based on format
   */
  private async parseCoverageFile(filePath: string): Promise<CoverageData> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);

    switch (ext) {
      case '.json':
        return this.parseIstanbulCoverage(JSON.parse(content));
      case '.lcov':
        return this.parseLcovCoverage(content);
      default:
        throw new Error(`Unsupported coverage format: ${ext}`);
    }
  }

  /**
   * Parse Istanbul JSON coverage format
   */
  private parseIstanbulCoverage(data: any): CoverageData {
    const fileCoverage: FileCoverage[] = [];

    for (const [filePath, coverage] of Object.entries(data)) {
      const fileCov = coverage as any;
      const statements = this.calculateCoverage(fileCov.s);
      const branches = this.calculateCoverage(fileCov.b);
      const functions = this.calculateCoverage(fileCov.f);
      const lines = this.calculateCoverage(fileCov.l);

      fileCoverage.push({
        file: filePath,
        statements,
        branches,
        functions,
        lines,
        uncoveredLines: this.findUncoveredLines(fileCov.l)
      });
    }

    return {
      format: 'istanbul',
      files: fileCoverage,
      summary: this.calculateOverallCoverage(fileCoverage)
    };
  }

  /**
   * Parse LCOV coverage format
   */
  private parseLcovCoverage(content: string): CoverageData {
    const lines = content.split('\n');
    const fileCoverage: FileCoverage[] = [];
    let currentFile: Partial<FileCoverage> | null = null;

    for (const line of lines) {
      if (line.startsWith('SF:')) {
        if (currentFile) {
          fileCoverage.push(currentFile as FileCoverage);
        }
        currentFile = {
          file: line.substring(3),
          statements: { covered: 0, total: 0, percentage: 0 },
          branches: { covered: 0, total: 0, percentage: 0 },
          functions: { covered: 0, total: 0, percentage: 0 },
          lines: { covered: 0, total: 0, percentage: 0 },
          uncoveredLines: []
        };
      } else if (currentFile) {
        if (line.startsWith('LH:')) {
          currentFile.lines!.covered = parseInt(line.substring(3));
        } else if (line.startsWith('LF:')) {
          currentFile.lines!.total = parseInt(line.substring(3));
        } else if (line.startsWith('FNH:')) {
          currentFile.functions!.covered = parseInt(line.substring(4));
        } else if (line.startsWith('FNF:')) {
          currentFile.functions!.total = parseInt(line.substring(4));
        } else if (line.startsWith('BRH:')) {
          currentFile.branches!.covered = parseInt(line.substring(4));
        } else if (line.startsWith('BRF:')) {
          currentFile.branches!.total = parseInt(line.substring(4));
        }
      }
    }

    if (currentFile) {
      fileCoverage.push(currentFile as FileCoverage);
    }

    // Calculate percentages
    for (const file of fileCoverage) {
      file.lines!.percentage = file.lines!.total > 0 ? (file.lines!.covered / file.lines!.total) * 100 : 0;
      file.functions!.percentage = file.functions!.total > 0 ? (file.functions!.covered / file.functions!.total) * 100 : 0;
      file.branches!.percentage = file.branches!.total > 0 ? (file.branches!.covered / file.branches!.total) * 100 : 0;
      file.statements = file.lines; // Approximation
    }

    return {
      format: 'lcov',
      files: fileCoverage,
      summary: this.calculateOverallCoverage(fileCoverage)
    };
  }

  /**
   * Calculate coverage metrics from raw data
   */
  private calculateCoverage(data: any): CoverageMetrics {
    if (Array.isArray(data)) {
      const covered = data.filter((count: number) => count > 0).length;
      const total = data.length;
      return {
        covered,
        total,
        percentage: total > 0 ? (covered / total) * 100 : 0
      };
    } else if (typeof data === 'object') {
      let covered = 0;
      let total = 0;

      for (const value of Object.values(data)) {
        if (Array.isArray(value)) {
          covered += value.filter((count: number) => count > 0).length;
          total += value.length;
        } else if (typeof value === 'number') {
          if (value > 0) covered++;
          total++;
        }
      }

      return {
        covered,
        total,
        percentage: total > 0 ? (covered / total) * 100 : 0
      };
    }

    return { covered: 0, total: 0, percentage: 0 };
  }

  /**
   * Find uncovered lines
   */
  private findUncoveredLines(lineCoverage: any): number[] {
    const uncovered: number[] = [];

    if (typeof lineCoverage === 'object') {
      for (const [line, hits] of Object.entries(lineCoverage)) {
        if ((hits as number) === 0) {
          uncovered.push(parseInt(line));
        }
      }
    }

    return uncovered;
  }

  /**
   * Calculate overall coverage across all files
   */
  private calculateOverallCoverage(files: FileCoverage[]): CoverageSummary {
    const totals = {
      statements: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
      lines: { covered: 0, total: 0 }
    };

    for (const file of files) {
      totals.statements.covered += file.statements.covered;
      totals.statements.total += file.statements.total;
      totals.branches.covered += file.branches.covered;
      totals.branches.total += file.branches.total;
      totals.functions.covered += file.functions.covered;
      totals.functions.total += file.functions.total;
      totals.lines.covered += file.lines.covered;
      totals.lines.total += file.lines.total;
    }

    return {
      statements: {
        covered: totals.statements.covered,
        total: totals.statements.total,
        percentage: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
      },
      branches: {
        covered: totals.branches.covered,
        total: totals.branches.total,
        percentage: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0
      },
      functions: {
        covered: totals.functions.covered,
        total: totals.functions.total,
        percentage: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0
      },
      lines: {
        covered: totals.lines.covered,
        total: totals.lines.total,
        percentage: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
      },
      files: files.length,
      filesCovered: files.filter(f => f.lines.percentage > 0).length
    };
  }

  /**
   * Analyze coverage data for insights
   */
  private analyzeCoverage(coverageData: CoverageData[]): CoverageAnalysis {
    const allFiles = coverageData.flatMap(data => data.files);
    const summary = this.calculateOverallCoverage(allFiles);

    // Identify files with low coverage
    const lowCoverageFiles = allFiles
      .filter(file => file.lines.percentage < (this.config.lowCoverageThreshold || 80))
      .sort((a, b) => a.lines.percentage - b.lines.percentage);

    // Identify uncovered functions
    const uncoveredFunctions = allFiles
      .filter(file => file.functions.percentage < 100)
      .map(file => ({
        file: file.file,
        uncoveredCount: file.functions.total - file.functions.covered,
        coverage: file.functions.percentage
      }))
      .sort((a, b) => b.uncoveredCount - a.uncoveredCount);

    // Identify uncovered branches
    const uncoveredBranches = allFiles
      .filter(file => file.branches.percentage < 100)
      .map(file => ({
        file: file.file,
        uncoveredCount: file.branches.total - file.branches.covered,
        coverage: file.branches.percentage
      }))
      .sort((a, b) => b.uncoveredCount - a.uncoveredCount);

    // Calculate coverage distribution
    const coverageRanges = {
      excellent: allFiles.filter(f => f.lines.percentage >= 95).length,
      good: allFiles.filter(f => f.lines.percentage >= 80 && f.lines.percentage < 95).length,
      fair: allFiles.filter(f => f.lines.percentage >= 60 && f.lines.percentage < 80).length,
      poor: allFiles.filter(f => f.lines.percentage < 60).length
    };

    return {
      summary,
      lowCoverageFiles,
      uncoveredFunctions,
      uncoveredBranches,
      coverageDistribution: coverageRanges,
      riskAssessment: this.assessCoverageRisk(summary, coverageRanges)
    };
  }

  /**
   * Generate coverage recommendations
   */
  private generateRecommendations(analysis: CoverageAnalysis): CoverageRecommendation[] {
    const recommendations: CoverageRecommendation[] = [];

    // Overall coverage recommendations
    if (analysis.summary.lines.percentage < 80) {
      recommendations.push({
        type: 'overall-coverage',
        priority: 'high',
        message: `Overall line coverage is ${analysis.summary.lines.percentage.toFixed(1)}%. Target is ≥95%.`,
        action: 'Increase test coverage by adding more comprehensive tests'
      });
    }

    // Branch coverage recommendations
    if (analysis.summary.branches.percentage < 90) {
      recommendations.push({
        type: 'branch-coverage',
        priority: 'medium',
        message: `Branch coverage is ${analysis.summary.branches.percentage.toFixed(1)}%. Consider testing edge cases.`,
        action: 'Add tests for conditional branches and error paths'
      });
    }

    // Function coverage recommendations
    if (analysis.summary.functions.percentage < 95) {
      recommendations.push({
        type: 'function-coverage',
        priority: 'medium',
        message: `Function coverage is ${analysis.summary.functions.percentage.toFixed(1)}%. Some functions are untested.`,
        action: 'Ensure all exported functions have corresponding tests'
      });
    }

    // File-specific recommendations
    for (const file of analysis.lowCoverageFiles.slice(0, 10)) {
      recommendations.push({
        type: 'file-coverage',
        priority: file.lines.percentage < 50 ? 'high' : 'medium',
        message: `${file.file} has ${file.lines.percentage.toFixed(1)}% line coverage`,
        action: `Add comprehensive tests for ${path.basename(file.file)}`,
        file: file.file
      });
    }

    // Risk-based recommendations
    if (analysis.riskAssessment.overall === 'high') {
      recommendations.push({
        type: 'risk-mitigation',
        priority: 'critical',
        message: 'High risk due to low coverage. Critical paths may be untested.',
        action: 'Prioritize testing of business-critical functionality'
      });
    }

    return recommendations;
  }

  /**
   * Calculate coverage trends
   */
  private calculateTrends(coverageData: CoverageData[]): CoverageTrends {
    const currentSummary = this.calculateOverallCoverage(coverageData.flatMap(d => d.files));

    // This would typically load historical data from storage
    const previousLines = this.baselineCoverage?.lines ?? currentSummary.lines.percentage;
    const previousBranches = this.baselineCoverage?.branches ?? currentSummary.branches.percentage;
    const previousFunctions = this.baselineCoverage?.functions ?? currentSummary.functions.percentage;

    return {
      lines: {
        current: currentSummary.lines.percentage,
        previous: previousLines,
        change: currentSummary.lines.percentage - previousLines
      },
      branches: {
        current: currentSummary.branches.percentage,
        previous: previousBranches,
        change: currentSummary.branches.percentage - previousBranches
      },
      functions: {
        current: currentSummary.functions.percentage,
        previous: previousFunctions,
        change: currentSummary.functions.percentage - previousFunctions
      },
      trend: this.determineTrend(currentSummary.lines.percentage, previousLines)
    };
  }

  /**
   * Assess coverage risk
   */
  private assessCoverageRisk(summary: CoverageSummary, distribution: any): CoverageRiskAssessment {
    let overall: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (summary.lines.percentage < 60 || distribution.poor > distribution.excellent) {
      overall = 'critical';
    } else if (summary.lines.percentage < 75 || distribution.poor > 0) {
      overall = 'high';
    } else if (summary.lines.percentage < 85) {
      overall = 'medium';
    }

    return {
      overall,
      factors: {
        lowLineCoverage: summary.lines.percentage < 80,
        lowBranchCoverage: summary.branches.percentage < 90,
        manyUncoveredFiles: distribution.poor > 5,
        criticalPathsUncovered: distribution.poor > 0 // Simplified
      }
    };
  }

  /**
   * Determine coverage trend
   */
  private determineTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
    const diff = current - previous;
    if (diff > 1) return 'improving';
    if (diff < -1) return 'declining';
    return 'stable';
  }

  /**
   * Generate report summary
   */
  private generateSummary(analysis: CoverageAnalysis): CoverageReportSummary {
    const { summary, riskAssessment } = analysis;

    return {
      overallCoverage: summary.lines.percentage,
      targetMet: summary.lines.percentage >= (this.config.targetCoverage || 95),
      riskLevel: riskAssessment.overall,
      filesAnalyzed: summary.files,
      filesFullyCovered: summary.filesCovered,
      recommendationsCount: 0, // Will be set by caller
      trend: 'stable' // Will be set by caller
    };
  }

  /**
   * Set baseline coverage for trend analysis
   */
  setBaseline(baseline: CoverageBaseline): void {
    this.baselineCoverage = baseline;
  }

  /**
   * Save coverage history
   */
  saveHistory(entry: CoverageHistoryEntry): void {
    this.coverageHistory.push(entry);
    // In a real implementation, this would save to persistent storage
  }
}

// Type definitions
export interface CoverageReporterConfig {
  targetCoverage?: number;
  lowCoverageThreshold?: number;
  includeUncoveredLines?: boolean;
  outputFormat?: 'json' | 'html' | 'text';
}

export interface CoverageData {
  format: 'istanbul' | 'lcov';
  files: FileCoverage[];
  summary: CoverageSummary;
}

export interface FileCoverage {
  file: string;
  statements: CoverageMetrics;
  branches: CoverageMetrics;
  functions: CoverageMetrics;
  lines: CoverageMetrics;
  uncoveredLines: number[];
}

export interface CoverageMetrics {
  covered: number;
  total: number;
  percentage: number;
}

export interface CoverageSummary {
  statements: CoverageMetrics;
  branches: CoverageMetrics;
  functions: CoverageMetrics;
  lines: CoverageMetrics;
  files: number;
  filesCovered: number;
}

export interface CoverageAnalysis {
  summary: CoverageSummary;
  lowCoverageFiles: FileCoverage[];
  uncoveredFunctions: Array<{
    file: string;
    uncoveredCount: number;
    coverage: number;
  }>;
  uncoveredBranches: Array<{
    file: string;
    uncoveredCount: number;
    coverage: number;
  }>;
  coverageDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  riskAssessment: CoverageRiskAssessment;
}

export interface CoverageRiskAssessment {
  overall: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    lowLineCoverage: boolean;
    lowBranchCoverage: boolean;
    manyUncoveredFiles: boolean;
    criticalPathsUncovered: boolean;
  };
}

export interface CoverageRecommendation {
  type: 'overall-coverage' | 'branch-coverage' | 'function-coverage' | 'file-coverage' | 'risk-mitigation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: string;
  file?: string;
}

export interface CoverageTrends {
  lines: TrendMetrics;
  branches: TrendMetrics;
  functions: TrendMetrics;
  trend: 'improving' | 'declining' | 'stable';
}

export interface TrendMetrics {
  current: number;
  previous: number;
  change: number;
}

export interface CoverageReport {
  timestamp: Date;
  summary: CoverageReportSummary;
  analysis: CoverageAnalysis;
  recommendations: CoverageRecommendation[];
  trends: CoverageTrends;
  files: CoverageData[];
  config: CoverageReporterConfig;
}

export interface CoverageReportSummary {
  overallCoverage: number;
  targetMet: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  filesAnalyzed: number;
  filesFullyCovered: number;
  recommendationsCount: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface CoverageBaseline {
  lines: number;
  branches: number;
  functions: number;
  timestamp: Date;
}

export interface CoverageHistoryEntry {
  timestamp: Date;
  summary: CoverageSummary;
  commit?: string;
  branch?: string;
}


