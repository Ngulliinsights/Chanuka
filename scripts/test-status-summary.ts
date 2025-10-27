#!/usr/bin/env tsx

/**
 * Test Status Summary Script
 * 
 * Provides a comprehensive overview of the current test status
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import { glob } from 'glob';

class TestStatusSummary {
  async generateSummary(): Promise<void> {
    console.log('📊 Generating Test Status Summary...\n');

    const summary = {
      timestamp: new Date().toISOString(),
      testFiles: await this.countTestFiles(),
      testResults: await this.runTestSample(),
      recommendations: this.generateRecommendations(),
    };

    await this.displaySummary(summary);
    await this.saveSummary(summary);
  }

  private async countTestFiles(): Promise<any> {
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', {
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });

    const byType = {
      unit: testFiles.filter(f => f.includes('/unit/') || f.includes('.unit.')).length,
      integration: testFiles.filter(f => f.includes('/integration/') || f.includes('.integration.')).length,
      e2e: testFiles.filter(f => f.includes('/e2e/') || f.includes('.e2e.')).length,
      component: testFiles.filter(f => f.endsWith('.tsx')).length,
      service: testFiles.filter(f => f.includes('/services/') || f.includes('service.test')).length,
      other: 0,
    };

    byType.other = testFiles.length - Object.values(byType).reduce((a, b) => a + b, 0) + byType.other;

    return {
      total: testFiles.length,
      byType,
      files: testFiles.slice(0, 10), // Sample of files
    };
  }

  private async runTestSample(): Promise<any> {
    try {
      console.log('🧪 Running test sample...');
      
      // Run a small subset of tests to get status
      const result = execSync('npm run test:run -- --run --reporter=json --maxConcurrency=1', {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: 'pipe'
      });

      const testResult = JSON.parse(result);
      
      return {
        success: true,
        numTotalTests: testResult.numTotalTests || 0,
        numPassedTests: testResult.numPassedTests || 0,
        numFailedTests: testResult.numFailedTests || 0,
        numPendingTests: testResult.numPendingTests || 0,
        testResults: testResult.testResults?.slice(0, 5) || [], // Sample results
      };
    } catch (error) {
      console.log('   ⚠️ Test execution had issues, getting basic info...');
      
      return {
        success: false,
        error: error.message,
        note: 'Tests are configured but some may have runtime issues'
      };
    }
  }

  private generateRecommendations(): string[] {
    return [
      'Run `npm run fix-tests` to address common test issues',
      'Run `npm run verify-structure` to ensure project structure alignment',
      'Consider running tests in smaller batches to identify specific issues',
      'Update test dependencies if needed: `npm install --save-dev @testing-library/react @testing-library/jest-dom`',
      'Check that all import paths are correctly configured in tsconfig.json',
      'Review failing tests individually to address specific issues',
    ];
  }

  private async displaySummary(summary: any): Promise<void> {
    console.log('📋 TEST STATUS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Generated: ${summary.timestamp}`);
    console.log();

    console.log('📁 Test Files:');
    console.log(`   Total: ${summary.testFiles.total}`);
    console.log(`   Unit Tests: ${summary.testFiles.byType.unit}`);
    console.log(`   Integration Tests: ${summary.testFiles.byType.integration}`);
    console.log(`   E2E Tests: ${summary.testFiles.byType.e2e}`);
    console.log(`   Component Tests: ${summary.testFiles.byType.component}`);
    console.log(`   Service Tests: ${summary.testFiles.byType.service}`);
    console.log(`   Other Tests: ${summary.testFiles.byType.other}`);
    console.log();

    if (summary.testResults.success) {
      console.log('✅ Test Execution Results:');
      console.log(`   Total Tests: ${summary.testResults.numTotalTests}`);
      console.log(`   Passed: ${summary.testResults.numPassedTests}`);
      console.log(`   Failed: ${summary.testResults.numFailedTests}`);
      console.log(`   Pending: ${summary.testResults.numPendingTests}`);
      
      const passRate = summary.testResults.numTotalTests > 0 
        ? ((summary.testResults.numPassedTests / summary.testResults.numTotalTests) * 100).toFixed(1)
        : '0';
      console.log(`   Pass Rate: ${passRate}%`);
    } else {
      console.log('⚠️ Test Execution:');
      console.log(`   Status: ${summary.testResults.note}`);
      console.log(`   Issue: ${summary.testResults.error?.substring(0, 100)}...`);
    }
    console.log();

    console.log('💡 Recommendations:');
    summary.recommendations.forEach((rec: string, i: number) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    console.log();

    console.log('🔧 Available Commands:');
    console.log('   npm run test:run          - Run all tests');
    console.log('   npm run test:coverage     - Run tests with coverage');
    console.log('   npm run fix-tests         - Fix common test issues');
    console.log('   npm run verify-structure  - Verify project structure');
    console.log('   npm run test:ui           - Run tests with UI');
    console.log();
  }

  private async saveSummary(summary: any): Promise<void> {
    const reportPath = 'TEST_STATUS_SUMMARY.md';
    
    const markdown = `# Test Status Summary

Generated: ${summary.timestamp}

## Test Files Overview

- **Total Test Files**: ${summary.testFiles.total}
- **Unit Tests**: ${summary.testFiles.byType.unit}
- **Integration Tests**: ${summary.testFiles.byType.integration}
- **E2E Tests**: ${summary.testFiles.byType.e2e}
- **Component Tests**: ${summary.testFiles.byType.component}
- **Service Tests**: ${summary.testFiles.byType.service}
- **Other Tests**: ${summary.testFiles.byType.other}

## Test Execution Status

${summary.testResults.success ? `
- **Total Tests**: ${summary.testResults.numTotalTests}
- **Passed**: ${summary.testResults.numPassedTests}
- **Failed**: ${summary.testResults.numFailedTests}
- **Pending**: ${summary.testResults.numPendingTests}
- **Pass Rate**: ${summary.testResults.numTotalTests > 0 ? ((summary.testResults.numPassedTests / summary.testResults.numTotalTests) * 100).toFixed(1) : '0'}%
` : `
- **Status**: ${summary.testResults.note}
- **Issue**: Tests are configured but may have runtime issues
`}

## Recommendations

${summary.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}

## Available Commands

- \`npm run test:run\` - Run all tests
- \`npm run test:coverage\` - Run tests with coverage
- \`npm run fix-tests\` - Fix common test issues
- \`npm run verify-structure\` - Verify project structure
- \`npm run test:ui\` - Run tests with UI

## Sample Test Files

${summary.testFiles.files.slice(0, 10).map((file: string) => `- ${file}`).join('\n')}
`;

    fs.writeFileSync(reportPath, markdown);
    console.log(`📄 Summary saved to: ${reportPath}`);
  }
}

// Main execution
async function main(): Promise<void> {
  const summary = new TestStatusSummary();
  await summary.generateSummary();
}

// Run the script
main().catch(console.error);

export { TestStatusSummary };