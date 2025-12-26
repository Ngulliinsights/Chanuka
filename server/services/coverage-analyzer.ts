import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CoverageMetrics {
  total: number;
  covered: number;
  percentage: number;
}

interface CoverageReport {
  lines: CoverageMetrics;
  functions: CoverageMetrics;
  branches: CoverageMetrics;
  statements: CoverageMetrics;
  uncoveredFiles: string[];
  uncoveredFunctions: string[];
  uncoveredLines: Array<{ file: string; lines: number[] }>;
}

interface CoverageGap {
  type: 'function' | 'statement' | 'branch' | 'line';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  location?: string;
  description: string;
  impact: string;
}

interface FullCoverageReport {
  timestamp: Date;
  serverCoverage: CoverageReport;
  clientCoverage: CoverageReport;
  integrationCoverage?: CoverageReport;
  overallCoverage: { lines: number; functions: number; branches: number; statements: number };
  gaps: CoverageGap[];
  recommendations: string[];
}

export class CoverageAnalyzer {
  private readonly coverageDir = 'coverage';
  private readonly serverCoverageFile = path.join(this.coverageDir, 'coverage-server.json');
  private readonly clientCoverageFile = path.join(this.coverageDir, 'coverage-client.json');
  private readonly integrationCoverageFile = path.join(this.coverageDir, 'coverage-integration.json');

  async analyzeServerCoverage(): Promise<CoverageReport> {
    try {
      // Run server tests with coverage
      await execAsync('npm run test:server:coverage', { cwd: process.cwd() });

      return await this.parseCoverageFile(this.serverCoverageFile);
    } catch (error) {
      console.error('Error analyzing server coverage:', error);
      return this.getEmptyCoverageReport();
    }
  }

  async analyzeClientCoverage(): Promise<CoverageReport> {
    try {
      // Run client tests with coverage
      await execAsync('npm run test:client:coverage', { cwd: process.cwd() });

      return await this.parseCoverageFile(this.clientCoverageFile);
    } catch (error) {
      console.error('Error analyzing client coverage:', error);
      return this.getEmptyCoverageReport();
    }
  }

  async analyzeIntegrationCoverage(): Promise<CoverageReport> {
    try {
      // Run integration tests with coverage
      await execAsync('npm run test:integration:coverage', { cwd: process.cwd() });

      return await this.parseCoverageFile(this.integrationCoverageFile);
    } catch (error) {
      console.error('Error analyzing integration coverage:', error);
      return this.getEmptyCoverageReport();
    }
  }

  async identifyGaps(reports: CoverageReport[]): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = [];

    for (const report of reports) {
      // Identify function gaps
      for (const func of report.uncoveredFunctions) {
        const severity = this.determineSeverity(func);
        gaps.push({
          type: 'function',
          severity,
          file: func.split(':')[0],
          location: func.split(':')[1],
          description: `Uncovered function: ${func}`,
          impact: this.getImpactDescription('function', severity)
        });
      }

      // Identify statement gaps
      for (const lineGap of report.uncoveredLines) {
        gaps.push({
          type: 'statement',
          severity: lineGap.lines.length > 10 ? 'high' : 'medium',
          file: lineGap.file,
          description: `Uncovered statements (${lineGap.lines.length}) in ${lineGap.file}`,
          impact: 'Code statements not executed during tests'
        });
      }

      // Identify branch coverage gaps
      if (report.branches.percentage < 80) {
        gaps.push({
          type: 'branch',
          severity: report.branches.percentage < 60 ? 'critical' : 'high',
          file: 'overall',
          description: `Low branch coverage: ${report.branches.percentage}%`,
          impact: 'Conditional logic not fully tested'
        });
      }
    }

    return gaps;
  }

  async generateCoverageReport(): Promise<FullCoverageReport> {
    const [serverCoverage, clientCoverage, integrationCoverage] = await Promise.all([
      this.analyzeServerCoverage(),
      this.analyzeClientCoverage(),
      this.analyzeIntegrationCoverage()
    ]);

    const reports = [serverCoverage, clientCoverage, integrationCoverage].filter(r => r.lines.total > 0);

    const overallCoverage = this.calculateOverallCoverage(reports);
    const gaps = await this.identifyGaps(reports);
    const recommendations = this.generateRecommendations(gaps, overallCoverage);

    return {
      timestamp: new Date(),
      serverCoverage,
      clientCoverage,
      integrationCoverage,
      overallCoverage,
      gaps,
      recommendations
    };
  }

  private async parseCoverageFile(filePath: string): Promise<CoverageReport> {
    try {
      await fs.access(filePath);
      const data = await fs.readFile(filePath, 'utf-8');
      const coverageData = JSON.parse(data);

      return this.processCoverageData(coverageData);
    } catch (error) {
      console.warn(`Coverage file not found: ${filePath}`);
      return this.getEmptyCoverageReport();
    }
  }

  private processCoverageData(coverageData: any): CoverageReport {
    let totalLines = 0, coveredLines = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalStatements = 0, coveredStatements = 0;

    const uncoveredFiles: string[] = [];
    const uncoveredFunctions: string[] = [];
    const uncoveredLines: Array<{ file: string; lines: number[] }> = [];

    for (const [file, fileCoverage] of Object.entries(coverageData) as [string, any][]) {
      if (fileCoverage.l) {
        const lines = Object.values(fileCoverage.l) as number[];
        totalLines += lines.length;
        coveredLines += lines.filter(l => l > 0).length;

        const uncoveredLineNumbers = Object.entries(fileCoverage.l)
          .filter(([_, hits]) => (hits as number) === 0)
          .map(([line]) => parseInt(line));

        if (uncoveredLineNumbers.length > 0) {
          uncoveredLines.push({ file, lines: uncoveredLineNumbers });
        }
      }

      if (fileCoverage.f) {
        const functions = Object.values(fileCoverage.f) as number[];
        totalFunctions += functions.length;
        coveredFunctions += functions.filter(f => f > 0).length;

        const uncoveredFuncNames = Object.entries(fileCoverage.f)
          .filter(([_, hits]) => (hits as number) === 0)
          .map(([name]) => `${file}:${name}`);

        uncoveredFunctions.push(...uncoveredFuncNames);
      }

      if (fileCoverage.b) {
        for (const branch of Object.values(fileCoverage.b) as number[][]) {
          totalBranches += branch.length;
          coveredBranches += branch.filter(b => b > 0).length;
        }
      }

      if (fileCoverage.s) {
        const statements = Object.values(fileCoverage.s) as number[];
        totalStatements += statements.length;
        coveredStatements += statements.filter(s => s > 0).length;
      }

      // Check if file has low coverage
      const fileLines = fileCoverage.l ? Object.values(fileCoverage.l) as number[] : [];
      const fileCoveragePercent = fileLines.length > 0 ?
        (fileLines.filter(l => l > 0).length / fileLines.length) * 100 : 0;

      if (fileCoveragePercent < 50) {
        uncoveredFiles.push(file);
      }
    }

    return {
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0
      },
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0
      },
      uncoveredFiles,
      uncoveredFunctions,
      uncoveredLines
    };
  }

  private getEmptyCoverageReport(): CoverageReport {
    return {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 },
      uncoveredFiles: [],
      uncoveredFunctions: [],
      uncoveredLines: []
    };
  }

  private calculateOverallCoverage(reports: CoverageReport[]): { lines: number; functions: number; branches: number; statements: number } {
    if (reports.length === 0) {
      return { lines: 0, functions: 0, branches: 0, statements: 0 };
    }

    const totalLines = reports.reduce((sum, r) => sum + r.lines.total, 0);
    const coveredLines = reports.reduce((sum, r) => sum + r.lines.covered, 0);

    const totalFunctions = reports.reduce((sum, r) => sum + r.functions.total, 0);
    const coveredFunctions = reports.reduce((sum, r) => sum + r.functions.covered, 0);

    const totalBranches = reports.reduce((sum, r) => sum + r.branches.total, 0);
    const coveredBranches = reports.reduce((sum, r) => sum + r.branches.covered, 0);

    const totalStatements = reports.reduce((sum, r) => sum + r.statements.total, 0);
    const coveredStatements = reports.reduce((sum, r) => sum + r.statements.covered, 0);

    return {
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0
    };
  }

  private determineSeverity(functionName: string): 'critical' | 'high' | 'medium' | 'low' {
    const lowerName = functionName.toLowerCase();

    if (lowerName.includes('auth') || lowerName.includes('security') || lowerName.includes('validate')) {
      return 'critical';
    }
    if (lowerName.includes('api') || lowerName.includes('database') || lowerName.includes('error')) {
      return 'high';
    }
    if (lowerName.includes('util') || lowerName.includes('helper')) {
      return 'low';
    }
    return 'medium';
  }

  private getImpactDescription(type: string, severity: string): string {
    switch (severity) {
      case 'critical': return `Critical ${type} coverage gap affecting core functionality`;
      case 'high': return `High impact ${type} coverage gap`;
      case 'medium': return `Medium impact ${type} coverage gap`;
      case 'low': return `Low impact ${type} coverage gap`;
      default: return `${type} coverage gap`;
    }
  }

  private generateRecommendations(gaps: CoverageGap[], overallCoverage: any): string[] {
    const recommendations: string[] = [];

    if (overallCoverage.percentage < 80) {
      recommendations.push('Overall line coverage is below 80%. Focus on increasing test coverage.');
    }

    if (overallCoverage.branches < 75) {
      recommendations.push('Branch coverage is low. Add tests for conditional logic and edge cases.');
    }

    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(`Address ${criticalGaps.length} critical coverage gaps, especially in authentication and security functions.`);
    }

    if (gaps.some(g => g.type === 'function' && g.severity === 'high')) {
      recommendations.push('Prioritize testing of high-impact functions that handle API calls and data processing.');
    }

    recommendations.push('Consider adding integration tests to cover end-to-end scenarios.');
    recommendations.push('Review and update test cases to cover recently added or modified code.');

    return recommendations;
  }
}

