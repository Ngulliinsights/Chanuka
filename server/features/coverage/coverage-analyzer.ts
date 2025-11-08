import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger   } from '../../../shared/core/src/index.js';

const execAsync = promisify(exec);

export interface CoverageReport {
  lines: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
  uncoveredFiles: string[];
  uncoveredFunctions: string[];
  uncoveredLines: { file: string; lines: number[] }[];
}

export interface CoverageGap {
  type: 'function' | 'branch' | 'statement' | 'integration';
  file: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestedTest: string;
}

export interface ComprehensiveCoverageReport {
  timestamp: Date;
  serverCoverage: CoverageReport;
  clientCoverage: CoverageReport;
  integrationCoverage: CoverageReport;
  overallCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  gaps: CoverageGap[];
  recommendations: string[];
}

export class CoverageAnalyzer {
  private readonly coverageThresholds = {
    lines: 80,
    functions: 70,
    branches: 70,
    statements: 80
  };

  async analyzeServerCoverage(): Promise<CoverageReport> {
    try {
      // Run Jest with coverage for server-side code
      const { stdout } = await execAsync('npm run test:coverage -- --silent --json');
      const coverageData = JSON.parse(stdout);
      
      return this.parseCoverageData(coverageData, 'server');
    } catch (error) {
      logger.error('Error analyzing server coverage:', { component: 'Chanuka' }, error);
      return this.getEmptyCoverageReport();
    }
  }

  async analyzeClientCoverage(): Promise<CoverageReport> {
    try {
      // Run Vitest with coverage for client-side code
      const { stdout } = await execAsync('npm run test:client:coverage -- --reporter=json');
      const coverageData = JSON.parse(stdout);
      
      return this.parseCoverageData(coverageData, 'client');
    } catch (error) {
      logger.error('Error analyzing client coverage:', { component: 'Chanuka' }, error);
      return this.getEmptyCoverageReport();
    }
  }

  async analyzeIntegrationCoverage(): Promise<CoverageReport> {
    try {
      // Run integration tests with coverage
      const { stdout } = await execAsync('npm run test:integration -- --coverage --json');
      const coverageData = JSON.parse(stdout);
      
      return this.parseCoverageData(coverageData, 'integration');
    } catch (error) {
      logger.error('Error analyzing integration coverage:', { component: 'Chanuka' }, error);
      return this.getEmptyCoverageReport();
    }
  }

  async identifyGaps(reports: CoverageReport[]): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = [];

    for (const report of reports) {
      // Identify uncovered functions
      for (const func of report.uncoveredFunctions) {
        gaps.push({
          type: 'function',
          file: this.extractFileFromFunction(func),
          location: func,
          severity: this.calculateSeverity('function', func),
          description: `Function '${func}' is not covered by tests`,
          suggestedTest: this.generateTestSuggestion('function', func)
        });
      }

      // Identify uncovered lines
      for (const uncoveredLine of report.uncoveredLines) {
        for (const lineNum of uncoveredLine.lines) {
          gaps.push({
            type: 'statement',
            file: uncoveredLine.file,
            location: `${uncoveredLine.file}:${lineNum}`,
            severity: this.calculateSeverity('statement', uncoveredLine.file),
            description: `Line ${lineNum} in ${uncoveredLine.file} is not covered`,
            suggestedTest: this.generateTestSuggestion('statement', uncoveredLine.file)
          });
        }
      }

      // Identify branch coverage gaps
      if (report.branches.percentage < this.coverageThresholds.branches) {
        gaps.push({
          type: 'branch',
          file: 'multiple',
          location: 'various',
          severity: 'high',
          description: `Branch coverage is ${report.branches.percentage}%, below threshold of ${this.coverageThresholds.branches}%`,
          suggestedTest: 'Add tests for conditional logic and error handling paths'
        });
      }
    }

    return gaps.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
  }

  async generateCoverageReport(): Promise<ComprehensiveCoverageReport> {
    const serverCoverage = await this.analyzeServerCoverage();
    const clientCoverage = await this.analyzeClientCoverage();
    const integrationCoverage = await this.analyzeIntegrationCoverage();

    const reports = [serverCoverage, clientCoverage, integrationCoverage];
    const gaps = await this.identifyGaps(reports);

    const overallCoverage = this.calculateOverallCoverage([serverCoverage, clientCoverage]);

    return {
      timestamp: new Date(),
      serverCoverage,
      clientCoverage,
      integrationCoverage,
      overallCoverage,
      gaps,
      recommendations: this.generateRecommendations(gaps, overallCoverage)
    };
  }

  private parseCoverageData(coverageData: any, type: string): CoverageReport {
    // Parse coverage data from Jest/Vitest output
    const summary = coverageData.coverageMap || coverageData.summary || {};
    
    return {
      lines: {
        total: summary.lines?.total || 0,
        covered: summary.lines?.covered || 0,
        percentage: summary.lines?.pct || 0
      },
      functions: {
        total: summary.functions?.total || 0,
        covered: summary.functions?.covered || 0,
        percentage: summary.functions?.pct || 0
      },
      branches: {
        total: summary.branches?.total || 0,
        covered: summary.branches?.covered || 0,
        percentage: summary.branches?.pct || 0
      },
      statements: {
        total: summary.statements?.total || 0,
        covered: summary.statements?.covered || 0,
        percentage: summary.statements?.pct || 0
      },
      uncoveredFiles: this.extractUncoveredFiles(coverageData),
      uncoveredFunctions: this.extractUncoveredFunctions(coverageData),
      uncoveredLines: this.extractUncoveredLines(coverageData)
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

  private extractUncoveredFiles(coverageData: any): string[] {
    const files: string[] = [];
    if (coverageData.coverageMap) {
      Object.keys(coverageData.coverageMap).forEach(file => {
        const fileCoverage = coverageData.coverageMap[file];
        if (fileCoverage.lines?.pct === 0) {
          files.push(file);
        }
      });
    }
    return files;
  }

  private extractUncoveredFunctions(coverageData: any): string[] {
    const functions: string[] = [];
    if (coverageData.coverageMap) {
      Object.keys(coverageData.coverageMap).forEach(file => {
        const fileCoverage = coverageData.coverageMap[file];
        if (fileCoverage.functions) {
          Object.keys(fileCoverage.functions).forEach(func => {
            if (fileCoverage.functions[func].count === 0) {
              functions.push(`${file}:${func}`);
            }
          });
        }
      });
    }
    return functions;
  }

  private extractUncoveredLines(coverageData: any): { file: string; lines: number[] }[] {
    const uncoveredLines: { file: string; lines: number[] }[] = [];
    if (coverageData.coverageMap) {
      Object.keys(coverageData.coverageMap).forEach(file => {
        const fileCoverage = coverageData.coverageMap[file];
        const lines: number[] = [];
        
        if (fileCoverage.statementMap) {
          Object.keys(fileCoverage.statementMap).forEach(stmt => {
            if (fileCoverage.s[stmt] === 0) {
              const line = fileCoverage.statementMap[stmt].start.line;
              if (!lines.includes(line)) {
                lines.push(line);
              }
            }
          });
        }
        
        if (lines.length > 0) {
          uncoveredLines.push({ file, lines: lines.sort((a, b) => a - b) });
        }
      });
    }
    return uncoveredLines;
  }

  private extractFileFromFunction(func: string): string {
    return func.split(':')[0] || 'unknown';
  }

  private calculateSeverity(type: string, location: string): 'critical' | 'high' | 'medium' | 'low' {
    // Determine severity based on file importance and function criticality
    const criticalPaths = ['/auth/', '/security/', '/payment/', '/api/'];
    const highPaths = ['/services/', '/middleware/', '/database/'];
    
    if (criticalPaths.some(path => location.includes(path))) {
      return 'critical';
    }
    if (highPaths.some(path => location.includes(path))) {
      return 'high';
    }
    if (type === 'function') {
      return 'medium';
    }
    return 'low';
  }

  private generateTestSuggestion(type: string, location: string): string {
    switch (type) {
      case 'function':
        return `Create unit test for function in ${location}`;
      case 'statement':
        return `Add test case to cover statement in ${location}`;
      case 'branch':
        return `Add tests for conditional branches in ${location}`;
      default:
        return `Add appropriate test coverage for ${location}`;
    }
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private calculateOverallCoverage(reports: CoverageReport[]) {
    const totalLines = reports.reduce((sum, report) => sum + report.lines.total, 0);
    const coveredLines = reports.reduce((sum, report) => sum + report.lines.covered, 0);
    
    const totalFunctions = reports.reduce((sum, report) => sum + report.functions.total, 0);
    const coveredFunctions = reports.reduce((sum, report) => sum + report.functions.covered, 0);
    
    const totalBranches = reports.reduce((sum, report) => sum + report.branches.total, 0);
    const coveredBranches = reports.reduce((sum, report) => sum + report.branches.covered, 0);
    
    const totalStatements = reports.reduce((sum, report) => sum + report.statements.total, 0);
    const coveredStatements = reports.reduce((sum, report) => sum + report.statements.covered, 0);

    return {
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0
    };
  }

  private generateRecommendations(gaps: CoverageGap[], overallCoverage: any): string[] {
    const recommendations: string[] = [];

    if (overallCoverage.lines < this.coverageThresholds.lines) {
      recommendations.push(`Increase line coverage from ${overallCoverage.lines}% to ${this.coverageThresholds.lines}%`);
    }

    if (overallCoverage.functions < this.coverageThresholds.functions) {
      recommendations.push(`Increase function coverage from ${overallCoverage.functions}% to ${this.coverageThresholds.functions}%`);
    }

    const criticalGaps = gaps.filter(gap => gap.severity === 'critical').length;
    if (criticalGaps > 0) {
      recommendations.push(`Address ${criticalGaps} critical coverage gaps immediately`);
    }

    const highGaps = gaps.filter(gap => gap.severity === 'high').length;
    if (highGaps > 0) {
      recommendations.push(`Address ${highGaps} high-priority coverage gaps`);
    }

    if (gaps.length > 50) {
      recommendations.push('Consider implementing automated test generation for uncovered code paths');
    }

    return recommendations;
  }

  async saveCoverageReport(report: ComprehensiveCoverageReport): Promise<string> {
    const reportPath = path.join(process.cwd(), 'coverage', 'comprehensive-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }
}









