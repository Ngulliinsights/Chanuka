#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Orchestrates all test types and generates consolidated reports
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

import { coverageConfig, testCategories, qualityGates } from '../coverage/coverage-config';

interface TestResult {
  type: string;
  passed: boolean;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  testCount: number;
  failureCount: number;
  errors: string[];
}

interface ConsolidatedReport {
  timestamp: string;
  overallPassed: boolean;
  totalDuration: number;
  results: TestResult[];
  coverageSummary: {
    overall: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
    meetsThreshold: boolean;
  };
  qualityGates: {
    passed: boolean;
    failures: string[];
  };
}

class ComprehensiveTestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      'test-results',
      'coverage',
      'coverage/unit',
      'coverage/integration',
      'coverage/performance',
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private runCommand(command: string, description: string): { success: boolean; output: string; duration: number } {
    console.log(`\n🚀 ${description}...`);
    const startTime = Date.now();
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${description} completed in ${duration}ms`);
      
      return { success: true, output, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${description} failed in ${duration}ms`);
      console.error(error.stdout || error.message);
      
      return { success: false, output: error.stdout || error.message, duration };
    }
  }

  private parseCoverageReport(reportPath: string): any {
    try {
      if (existsSync(reportPath)) {
        const content = readFileSync(reportPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Failed to parse coverage report: ${reportPath}`);
    }
    return null;
  }

  private extractTestMetrics(output: string): { testCount: number; failureCount: number; errors: string[] } {
    const testCount = (output.match(/(\d+) passed/g) || []).length;
    const failureCount = (output.match(/(\d+) failed/g) || []).length;
    const errors = output.split('\n').filter(line => 
      line.includes('FAIL') || line.includes('ERROR') || line.includes('✗')
    );

    return { testCount, failureCount, errors };
  }

  async runUnitTests(): Promise<TestResult> {
    console.log('\n📋 Running Unit Tests');
    
    const result = this.runCommand(
      'npm run test:unit',
      'Unit Tests'
    );

    const coverage = this.parseCoverageReport('coverage/coverage-summary.json');
    const metrics = this.extractTestMetrics(result.output);

    const testResult: TestResult = {
      type: 'unit',
      passed: result.success,
      duration: result.duration,
      coverage: coverage?.total ? {
        lines: coverage.total.lines.pct,
        functions: coverage.total.functions.pct,
        branches: coverage.total.branches.pct,
        statements: coverage.total.statements.pct,
      } : undefined,
      testCount: metrics.testCount,
      failureCount: metrics.failureCount,
      errors: metrics.errors,
    };

    this.results.push(testResult);
    return testResult;
  }

  async runIntegrationTests(): Promise<TestResult> {
    console.log('\n🔗 Running Integration Tests');
    
    const result = this.runCommand(
      'npm run test:integration',
      'Integration Tests'
    );

    const coverage = this.parseCoverageReport('coverage/integration/coverage-summary.json');
    const metrics = this.extractTestMetrics(result.output);

    const testResult: TestResult = {
      type: 'integration',
      passed: result.success,
      duration: result.duration,
      coverage: coverage?.total ? {
        lines: coverage.total.lines.pct,
        functions: coverage.total.functions.pct,
        branches: coverage.total.branches.pct,
        statements: coverage.total.statements.pct,
      } : undefined,
      testCount: metrics.testCount,
      failureCount: metrics.failureCount,
      errors: metrics.errors,
    };

    this.results.push(testResult);
    return testResult;
  }

  async runE2ETests(): Promise<TestResult> {
    console.log('\n🌐 Running E2E Tests');
    
    const result = this.runCommand(
      'npm run test:e2e',
      'E2E Tests'
    );

    const metrics = this.extractTestMetrics(result.output);

    const testResult: TestResult = {
      type: 'e2e',
      passed: result.success,
      duration: result.duration,
      testCount: metrics.testCount,
      failureCount: metrics.failureCount,
      errors: metrics.errors,
    };

    this.results.push(testResult);
    return testResult;
  }

  async runPerformanceTests(): Promise<TestResult> {
    console.log('\n⚡ Running Performance Tests');
    
    const result = this.runCommand(
      'npm run test:performance',
      'Performance Tests'
    );

    const metrics = this.extractTestMetrics(result.output);

    const testResult: TestResult = {
      type: 'performance',
      passed: result.success,
      duration: result.duration,
      testCount: metrics.testCount,
      failureCount: metrics.failureCount,
      errors: metrics.errors,
    };

    this.results.push(testResult);
    return testResult;
  }

  async runAccessibilityTests(): Promise<TestResult> {
    console.log('\n♿ Running Accessibility Tests');
    
    const result = this.runCommand(
      'npm run test:a11y',
      'Accessibility Tests'
    );

    const metrics = this.extractTestMetrics(result.output);

    const testResult: TestResult = {
      type: 'accessibility',
      passed: result.success,
      duration: result.duration,
      testCount: metrics.testCount,
      failureCount: metrics.failureCount,
      errors: metrics.errors,
    };

    this.results.push(testResult);
    return testResult;
  }

  async runVisualRegressionTests(): Promise<TestResult> {
    console.log('\n👁️ Running Visual Regression Tests');
    
    const result = this.runCommand(
      'npm run test:visual',
      'Visual Regression Tests'
    );

    const metrics = this.extractTestMetrics(result.output);

    const testResult: TestResult = {
      type: 'visual',
      passed: result.success,
      duration: result.duration,
      testCount: metrics.testCount,
      failureCount: metrics.failureCount,
      errors: metrics.errors,
    };

    this.results.push(testResult);
    return testResult;
  }

  private calculateOverallCoverage(): any {
    const unitResult = this.results.find(r => r.type === 'unit');
    const integrationResult = this.results.find(r => r.type === 'integration');

    if (!unitResult?.coverage) {
      return null;
    }

    // Combine unit and integration coverage (weighted average)
    const unitWeight = 0.7;
    const integrationWeight = 0.3;

    const overall = {
      lines: Math.round(
        (unitResult.coverage.lines * unitWeight) + 
        ((integrationResult?.coverage?.lines || 0) * integrationWeight)
      ),
      functions: Math.round(
        (unitResult.coverage.functions * unitWeight) + 
        ((integrationResult?.coverage?.functions || 0) * integrationWeight)
      ),
      branches: Math.round(
        (unitResult.coverage.branches * unitWeight) + 
        ((integrationResult?.coverage?.branches || 0) * integrationWeight)
      ),
      statements: Math.round(
        (unitResult.coverage.statements * unitWeight) + 
        ((integrationResult?.coverage?.statements || 0) * integrationWeight)
      ),
    };

    const meetsThreshold = 
      overall.lines >= coverageConfig.global.lines &&
      overall.functions >= coverageConfig.global.functions &&
      overall.branches >= coverageConfig.global.branches &&
      overall.statements >= coverageConfig.global.statements;

    return { overall, meetsThreshold };
  }

  private checkQualityGates(): { passed: boolean; failures: string[] } {
    const failures: string[] = [];

    // Check minimum test counts
    Object.entries(qualityGates.minimumTests).forEach(([testType, minCount]) => {
      const result = this.results.find(r => r.type === testType);
      if (!result || result.testCount < minCount) {
        failures.push(`${testType} tests: ${result?.testCount || 0} < ${minCount} (minimum required)`);
      }
    });

    // Check test durations
    this.results.forEach(result => {
      if (result.duration > qualityGates.performance.maxSuiteDuration) {
        failures.push(`${result.type} test suite duration: ${result.duration}ms > ${qualityGates.performance.maxSuiteDuration}ms (maximum allowed)`);
      }
    });

    // Check coverage thresholds
    const coverage = this.calculateOverallCoverage();
    if (coverage && !coverage.meetsThreshold) {
      failures.push(`Code coverage below threshold: ${JSON.stringify(coverage.overall)} < ${JSON.stringify(coverageConfig.global)}`);
    }

    // Check failure rates
    this.results.forEach(result => {
      if (result.failureCount > 0) {
        failures.push(`${result.type} tests have ${result.failureCount} failures`);
      }
    });

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  private generateConsolidatedReport(): ConsolidatedReport {
    const totalDuration = Date.now() - this.startTime;
    const overallPassed = this.results.every(r => r.passed);
    const coverageSummary = this.calculateOverallCoverage();
    const qualityGates = this.checkQualityGates();

    return {
      timestamp: new Date().toISOString(),
      overallPassed: overallPassed && qualityGates.passed,
      totalDuration,
      results: this.results,
      coverageSummary: coverageSummary || {
        overall: { lines: 0, functions: 0, branches: 0, statements: 0 },
        meetsThreshold: false,
      },
      qualityGates,
    };
  }

  private saveReport(report: ConsolidatedReport): void {
    const reportPath = join('test-results', 'comprehensive-test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = join('test-results', 'comprehensive-test-report.html');
    writeFileSync(htmlPath, htmlReport);

    console.log(`\n📊 Reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  private generateHTMLReport(report: ConsolidatedReport): string {
    const statusIcon = report.overallPassed ? '✅' : '❌';
    const statusColor = report.overallPassed ? '#22c55e' : '#ef4444';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .passed { color: #22c55e; }
        .failed { color: #ef4444; }
        .coverage-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%); }
        .errors { background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 10px; margin: 10px 0; }
        .timestamp { color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon} Comprehensive Test Report</h1>
            <div class="status">Status: ${report.overallPassed ? 'PASSED' : 'FAILED'}</div>
            <div class="timestamp">Generated: ${report.timestamp}</div>
            <div class="timestamp">Duration: ${Math.round(report.totalDuration / 1000)}s</div>
        </div>

        <div class="grid">
            ${report.results.map(result => `
                <div class="card">
                    <h3>${result.type.toUpperCase()} Tests ${result.passed ? '✅' : '❌'}</h3>
                    <div class="metric">
                        <span>Tests:</span>
                        <span class="${result.failureCount > 0 ? 'failed' : 'passed'}">${result.testCount} (${result.failureCount} failed)</span>
                    </div>
                    <div class="metric">
                        <span>Duration:</span>
                        <span>${Math.round(result.duration / 1000)}s</span>
                    </div>
                    ${result.coverage ? `
                        <div class="metric">
                            <span>Coverage:</span>
                            <span>${result.coverage.lines}%</span>
                        </div>
                        <div class="coverage-bar">
                            <div class="coverage-fill" style="width: ${result.coverage.lines}%"></div>
                        </div>
                    ` : ''}
                    ${result.errors.length > 0 ? `
                        <div class="errors">
                            <strong>Errors:</strong>
                            <ul>
                                ${result.errors.slice(0, 5).map(error => `<li>${error}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="card" style="margin-top: 20px;">
            <h3>Coverage Summary</h3>
            <div class="grid">
                <div>
                    <div class="metric">
                        <span>Lines:</span>
                        <span class="${report.coverageSummary.overall.lines >= 80 ? 'passed' : 'failed'}">${report.coverageSummary.overall.lines}%</span>
                    </div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.coverageSummary.overall.lines}%"></div>
                    </div>
                </div>
                <div>
                    <div class="metric">
                        <span>Functions:</span>
                        <span class="${report.coverageSummary.overall.functions >= 80 ? 'passed' : 'failed'}">${report.coverageSummary.overall.functions}%</span>
                    </div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.coverageSummary.overall.functions}%"></div>
                    </div>
                </div>
                <div>
                    <div class="metric">
                        <span>Branches:</span>
                        <span class="${report.coverageSummary.overall.branches >= 80 ? 'passed' : 'failed'}">${report.coverageSummary.overall.branches}%</span>
                    </div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.coverageSummary.overall.branches}%"></div>
                    </div>
                </div>
                <div>
                    <div class="metric">
                        <span>Statements:</span>
                        <span class="${report.coverageSummary.overall.statements >= 80 ? 'passed' : 'failed'}">${report.coverageSummary.overall.statements}%</span>
                    </div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${report.coverageSummary.overall.statements}%"></div>
                    </div>
                </div>
            </div>
        </div>

        ${!report.qualityGates.passed ? `
            <div class="card" style="margin-top: 20px; border-left: 4px solid #ef4444;">
                <h3>❌ Quality Gate Failures</h3>
                <ul>
                    ${report.qualityGates.failures.map(failure => `<li>${failure}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('=====================================');

    try {
      // Run all test types
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runE2ETests();
      await this.runPerformanceTests();
      await this.runAccessibilityTests();
      await this.runVisualRegressionTests();

      // Generate consolidated report
      const report = this.generateConsolidatedReport();
      this.saveReport(report);

      // Print summary
      console.log('\n📊 Test Summary');
      console.log('================');
      console.log(`Overall Status: ${report.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Total Duration: ${Math.round(report.totalDuration / 1000)}s`);
      console.log(`Coverage: ${report.coverageSummary.overall.lines}% lines, ${report.coverageSummary.overall.functions}% functions`);
      
      this.results.forEach(result => {
        console.log(`${result.type}: ${result.passed ? '✅' : '❌'} (${result.testCount} tests, ${Math.round(result.duration / 1000)}s)`);
      });

      if (!report.qualityGates.passed) {
        console.log('\n❌ Quality Gate Failures:');
        report.qualityGates.failures.forEach(failure => {
          console.log(`   - ${failure}`);
        });
      }

      // Exit with appropriate code
      process.exit(report.overallPassed ? 0 : 1);

    } catch (error) {
      console.error('\n💥 Test suite failed with error:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runAll();
}

export default ComprehensiveTestRunner;