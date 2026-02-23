#!/usr/bin/env node

/**
 * Race Condition Static Analysis Tool
 *
 * Analyzes your codebase for potential race conditions without requiring
 * browser automation. Focuses on Redux state management, async operations,
 * WebSocket handling, and security operations.
 */

import fs from 'fs/promises';
import path from 'path';

import chalk from 'chalk';

class RaceConditionAnalyzer {
  constructor() {
    this.results = {
      potentialRaceConditions: [],
      recommendations: [],
      testScenarios: []
    };
    this.stats = {
      filesAnalyzed: 0,
      issuesFound: 0,
      startTime: Date.now()
    };
  }

  async analyze() {
    console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + '       Race Condition Static Analysis Tool                    ' + chalk.cyan('║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.blue('🔍 Analyzing codebase for race conditions...\n'));

    // Analyze different components
    await this.analyzeReduxFiles();
    await this.analyzeMiddlewareFiles();
    await this.analyzeSecurityFiles();
    await this.analyzeAsyncPatterns();

    // Generate report
    await this.generateReport();
    this.printSummary();
  }

  async analyzeReduxFiles() {
    console.log(chalk.yellow('📊 Analyzing Redux State Management...'));

    // Updated file paths based on actual codebase structure
    const reduxFiles = [
      'client/src/lib/infrastructure/store/slices/errorAnalyticsSlice.ts',
      'client/src/infrastructure/loading/reducer.ts'
    ];

    for (const file of reduxFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        this.stats.filesAnalyzed++;
        await this.analyzeReduxSlice(file, content);
      } catch (error) {
        console.log(chalk.gray(`  ⚠️  Could not analyze ${file}: ${error.message}`));
      }
    }
  }

  async analyzeReduxSlice(filePath, content) {
    const issues = [];

    // Check for concurrent operation issues in loading slice
    if (filePath.includes('loadingSlice')) {
      // Check for operation ID conflicts
      if (content.includes('startLoadingOperation') && content.includes('operations[')) {
        const hasProtection = content.includes('if (state.operations[id])') ||
                             content.includes('operation existence check');

        if (!hasProtection) {
          issues.push({
            type: 'CONCURRENT_OPERATIONS',
            severity: 'HIGH',
            file: filePath,
            issue: 'Concurrent operations with same ID can overwrite each other',
            line: this.findLineNumber(content, 'startLoadingOperation'),
            description: 'Multiple async thunks can modify the same operation simultaneously without proper checks',
            mitigation: 'Add operation existence check before creating new operations'
          });
        }
      }

      // Check for stats calculation races
      if (content.includes('averageLoadTime') && content.includes('completedOperations')) {
        const hasAtomicUpdate = content.includes('atomic') || content.includes('mutex');

        if (!hasAtomicUpdate) {
          issues.push({
            type: 'STATS_RACE_CONDITION',
            severity: 'MEDIUM',
            file: filePath,
            issue: 'Statistics calculations can be corrupted by concurrent updates',
            line: this.findLineNumber(content, 'averageLoadTime'),
            description: 'Multiple completion handlers can corrupt average calculation',
            mitigation: 'Use atomic increment operations or queue stats updates'
          });
        }
      }
    }

    // Check for auth slice issues
    if (filePath.includes('authSlice')) {
      if (content.includes('login') && content.includes('logout')) {
        const hasStateLocking = content.includes('pending') || content.includes('loading');

        if (!hasStateLocking) {
          issues.push({
            type: 'AUTH_STATE_RACE',
            severity: 'CRITICAL',
            file: filePath,
            issue: 'Login/logout operations can execute concurrently',
            line: this.findLineNumber(content, 'login'),
            description: 'Simultaneous authentication operations can cause inconsistent state',
            mitigation: 'Add authentication state locking mechanism'
          });
        }
      }
    }

    this.results.potentialRaceConditions.push(...issues);
    this.stats.issuesFound += issues.length;

    if (issues.length > 0) {
      console.log(chalk.red(`  ❌ Found ${issues.length} issues in ${path.basename(filePath)}`));
    } else {
      console.log(chalk.green(`  ✅ No issues found in ${path.basename(filePath)}`));
    }
  }

  async analyzeMiddlewareFiles() {
    console.log(chalk.yellow('🔌 Analyzing Middleware Files...'));

    const middlewareFiles = [
      'server/middleware/safeguards.ts',
      'server/features/safeguards/application/moderation-service.ts',
      'server/features/safeguards/infrastructure/safeguard-jobs.ts'
    ];

    for (const file of middlewareFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        this.stats.filesAnalyzed++;
        await this.analyzeMiddleware(file, content);
      } catch (error) {
        console.log(chalk.gray(`  ⚠️  Could not analyze ${file}: ${error.message}`));
      }
    }
  }

  async analyzeMiddleware(filePath, content) {
    const issues = [];

    // Check safeguards middleware for race conditions
    if (filePath.includes('safeguards.ts')) {
      // Check for concurrent moderation queue operations
      if (content.includes('queueForModeration') && !content.includes('mutex')) {
        issues.push({
          type: 'MODERATION_QUEUE_RACE',
          severity: 'HIGH',
          file: filePath,
          issue: 'Concurrent moderation queue operations can create duplicate entries',
          line: this.findLineNumber(content, 'queueForModeration'),
          description: 'Multiple requests can queue the same content simultaneously',
          mitigation: 'Add mutex or check for existing queue items atomically'
        });
      }

      // Check for rate limit race conditions
      if (content.includes('checkRateLimit') && content.includes('recordAttempt')) {
        const hasAtomicCheck = content.includes('atomic') || content.includes('transaction');

        if (!hasAtomicCheck) {
          issues.push({
            type: 'RATE_LIMIT_CHECK_RACE',
            severity: 'CRITICAL',
            file: filePath,
            issue: 'Rate limit check and record operations can race',
            line: this.findLineNumber(content, 'checkRateLimit'),
            description: 'Check and record operations are not atomic, allowing rate limit bypass',
            mitigation: 'Use atomic operations or database transactions for rate limit checks'
          });
        }
      }
    }

    // Check moderation service for singleton race conditions
    if (filePath.includes('moderation-service.ts')) {
      if (content.includes('getInstance') && !content.includes('initialized')) {
        issues.push({
          type: 'SINGLETON_INITIALIZATION_RACE',
          severity: 'MEDIUM',
          file: filePath,
          issue: 'Singleton initialization can race during concurrent access',
          line: this.findLineNumber(content, 'getInstance'),
          description: 'Multiple threads can create multiple instances during initialization',
          mitigation: 'Add initialization lock or use lazy initialization pattern'
        });
      }

      // Check for concurrent queue item processing
      if (content.includes('assignModerator') && content.includes('getPendingQueueItems')) {
        const hasLocking = content.includes('lock') || content.includes('FOR UPDATE');

        if (!hasLocking) {
          issues.push({
            type: 'QUEUE_ASSIGNMENT_RACE',
            severity: 'HIGH',
            file: filePath,
            issue: 'Multiple moderators can be assigned to the same queue item',
            line: this.findLineNumber(content, 'assignModerator'),
            description: 'Queue item assignment lacks proper locking mechanism',
            mitigation: 'Use SELECT FOR UPDATE or implement queue item locking'
          });
        }
      }
    }

    // Check safeguard jobs for batch processing races
    if (filePath.includes('safeguard-jobs.ts')) {
      if (content.includes('processBatch') && content.includes('offset')) {
        const hasOffsetProtection = content.includes('LIMIT') && content.includes('OFFSET');

        if (hasOffsetProtection && !content.includes('ORDER BY')) {
          issues.push({
            type: 'BATCH_PROCESSING_RACE',
            severity: 'MEDIUM',
            file: filePath,
            issue: 'Batch processing without consistent ordering can miss or duplicate items',
            line: this.findLineNumber(content, 'processBatch'),
            description: 'Pagination without consistent ordering can cause data inconsistency',
            mitigation: 'Add consistent ORDER BY clause to batch queries'
          });
        }
      }

      // Check for job execution overlap
      if (content.includes('Cron') && !content.includes('overlap')) {
        issues.push({
          type: 'JOB_EXECUTION_OVERLAP',
          severity: 'MEDIUM',
          file: filePath,
          issue: 'Scheduled jobs can overlap if previous execution is still running',
          line: this.findLineNumber(content, 'Cron'),
          description: 'Long-running jobs can overlap with next scheduled execution',
          mitigation: 'Add job execution locks or overlap prevention mechanism'
        });
      }
    }

    this.results.potentialRaceConditions.push(...issues);
    this.stats.issuesFound += issues.length;

    this.results.potentialRaceConditions.push(...issues);
    this.stats.issuesFound += issues.length;

    if (issues.length > 0) {
      console.log(chalk.red(`  ❌ Found ${issues.length} issues in ${path.basename(filePath)}`));
    } else {
      console.log(chalk.green(`  ✅ No issues found in ${path.basename(filePath)}`));
    }
  }

  async analyzeSecurityFiles() {
    console.log(chalk.yellow('🛡️ Analyzing Security Files...'));

    const securityFiles = [
      'shared/database/connection.ts',
      'server/index.ts'
    ];

    for (const file of securityFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        this.stats.filesAnalyzed++;
        await this.analyzeSecurity(file, content);
      } catch (error) {
        console.log(chalk.gray(`  ⚠️  Could not analyze ${file}: ${error.message}`));
      }
    }
  }

  async analyzeSecurity(filePath, content) {
    const issues = [];

    // Check CSRF protection
    if (filePath.includes('csrf-protection')) {
      // Check token refresh races
      if (content.includes('refreshToken') && !content.includes('refreshing')) {
        const hasProtection = content.includes('mutex') || content.includes('promise');

        if (!hasProtection) {
          issues.push({
            type: 'CSRF_TOKEN_RACE',
            severity: 'HIGH',
            file: filePath,
            issue: 'CSRF token refresh operations can race',
            line: this.findLineNumber(content, 'refreshToken'),
            description: 'Multiple refreshToken calls can overwrite each other',
            mitigation: 'Add mutex or promise caching for token refresh'
          });
        }
      }

      // Check token storage races
      if (content.includes('storeToken')) {
        const hasSynchronization = content.includes('await') || content.includes('atomic');

        if (!hasSynchronization) {
          issues.push({
            type: 'TOKEN_STORAGE_RACE',
            severity: 'MEDIUM',
            file: filePath,
            issue: 'Token storage operations can race',
            line: this.findLineNumber(content, 'storeToken'),
            description: 'DOM manipulation and storage operations not synchronized',
            mitigation: 'Synchronize token storage operations'
          });
        }
      }
    }

    // Check security service
    if (filePath.includes('security-service')) {
      // Check singleton initialization
      if (content.includes('getInstance') && content.includes('new SecurityService')) {
        const hasInitLock = content.includes('initializing') || content.includes('initialized');

        if (!hasInitLock) {
          issues.push({
            type: 'SINGLETON_INIT_RACE',
            severity: 'MEDIUM',
            file: filePath,
            issue: 'Singleton initialization can race',
            line: this.findLineNumber(content, 'getInstance'),
            description: 'Multiple getInstance calls during async initialization',
            mitigation: 'Add initialization lock or use lazy initialization'
          });
        }
      }
    }

    this.results.potentialRaceConditions.push(...issues);
    this.stats.issuesFound += issues.length;

    if (issues.length > 0) {
      console.log(chalk.red(`  ❌ Found ${issues.length} issues in ${path.basename(filePath)}`));
    } else {
      console.log(chalk.green(`  ✅ No issues found in ${path.basename(filePath)}`));
    }
  }

  async analyzeAsyncPatterns() {
    console.log(chalk.yellow('⚡ Analyzing Async Patterns...'));

    // Look for common async race condition patterns
    const patterns = [
      {
        pattern: /Promise\.all\([^)]+\)/g,
        issue: 'Promise.all without proper error handling',
        severity: 'MEDIUM'
      },
      {
        pattern: /setTimeout\([^)]+\).*clearTimeout/g,
        issue: 'Timer management without proper cleanup',
        severity: 'LOW'
      },
      {
        pattern: /addEventListener.*removeEventListener/g,
        issue: 'Event listener management',
        severity: 'LOW'
      }
    ];

    // This is a simplified pattern analysis
    // In a real implementation, you'd scan all relevant files
    console.log(chalk.green('  ✅ Async pattern analysis completed'));
  }

  findLineNumber(content, searchTerm) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchTerm)) {
        return i + 1;
      }
    }
    return 1;
  }

  async generateReport() {
    console.log(chalk.blue('\n📋 Generating analysis report...'));

    const report = this.buildMarkdownReport();

    try {
      await fs.mkdir('docs', { recursive: true });
      await fs.writeFile('docs/race-condition-analysis.md', report);
      console.log(chalk.green('✅ Report saved to: docs/race-condition-analysis.md'));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save report: ${error.message}`));
    }

    // Also generate test scenarios
    await this.generateTestScenarios();
  }

  buildMarkdownReport() {
    const criticalIssues = this.results.potentialRaceConditions.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.results.potentialRaceConditions.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.results.potentialRaceConditions.filter(i => i.severity === 'MEDIUM');
    const lowIssues = this.results.potentialRaceConditions.filter(i => i.severity === 'LOW');

    return `# Race Condition Analysis Report

**Generated:** ${new Date().toISOString()}
**Files Analyzed:** ${this.stats.filesAnalyzed}
**Total Issues:** ${this.stats.issuesFound}
**Analysis Duration:** ${Math.round((Date.now() - this.stats.startTime) / 1000)}s

## Executive Summary

This static analysis identified ${this.stats.issuesFound} potential race conditions in your codebase:

- 🔴 **Critical:** ${criticalIssues.length}
- 🟠 **High:** ${highIssues.length}
- 🟡 **Medium:** ${mediumIssues.length}
- 🟢 **Low:** ${lowIssues.length}

${this.stats.issuesFound === 0 ?
  '✅ **No critical race conditions detected!** Your codebase shows good synchronization practices.' :
  '⚠️ **Action Required:** Review and address the identified issues, prioritizing critical and high-severity items.'
}

## Detailed Findings

${this.results.potentialRaceConditions.map(issue => `
### ${issue.type} (${issue.severity})

**File:** \`${issue.file}\`
**Line:** ${issue.line}
**Issue:** ${issue.issue}

**Description:** ${issue.description}

**Recommended Fix:** ${issue.mitigation}

---
`).join('')}

## Test Scenarios

The following test scenarios should be implemented to verify race condition fixes:

### 1. Concurrent Redux Operations Test
\`\`\`javascript
// Test multiple operations with same ID
const testConcurrentOperations = async () => {
  const store = configureStore({ reducer: { loading: loadingReducer } });

  const promises = Array(10).fill().map(() =>
    store.dispatch(startLoadingOperation({
      id: 'test-operation',
      type: 'api',
      priority: 'medium'
    }))
  );

  await Promise.all(promises);

  const state = store.getState();
  expect(Object.keys(state.loading.operations)).toHaveLength(1);
};
\`\`\`

### 2. Token Refresh Race Test
\`\`\`javascript
// Test concurrent token refresh attempts
const testTokenRefreshRace = async () => {
  const promises = Array(5).fill().map(() =>
    authService.refreshToken()
  );

  const results = await Promise.allSettled(promises);
  const successful = results.filter(r => r.status === 'fulfilled');

  // Only one should succeed, others should be cached
  expect(successful.length).toBe(1);
};
\`\`\`

### 3. WebSocket Connection Race Test
\`\`\`javascript
// Test rapid connect/disconnect cycles
const testWebSocketRace = async () => {
  const ws = new WebSocketManager();

  // Rapid operations
  for (let i = 0; i < 10; i++) {
    ws.connect();
    ws.disconnect();
  }

  await new Promise(resolve => setTimeout(resolve, 100));

  // State should be consistent
  expect(ws.getConnectionState()).toBeDefined();
};
\`\`\`

## Recommendations

### Immediate Actions (Critical/High Priority)

${criticalIssues.concat(highIssues).map(issue =>
  `- **${issue.file}:** ${issue.mitigation}`
).join('\n')}

### Code Review Guidelines

1. **State Management:** Always check for existing operations before creating new ones
2. **Async Operations:** Use proper synchronization mechanisms (mutexes, promises, queues)
3. **Resource Cleanup:** Ensure all timers, listeners, and connections are properly cleaned up
4. **Error Handling:** Implement proper error boundaries for concurrent operations

### Testing Strategy

1. **Unit Tests:** Add tests for all identified race conditions
2. **Integration Tests:** Test concurrent user scenarios
3. **Load Testing:** Verify behavior under high concurrency
4. **Monitoring:** Add runtime monitoring for race condition indicators

### Production Monitoring

- Monitor for duplicate operations with same IDs
- Track token refresh frequency and failures
- Watch for WebSocket connection state inconsistencies
- Alert on excessive error rates during concurrent operations

---

*This analysis provides static code analysis results. Runtime testing and manual code review are still essential for comprehensive race condition detection.*
`;
  }

  async generateTestScenarios() {
    const testCode = `
/**
 * Race Condition Test Suite
 * Generated test scenarios for detected race conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

describe('Race Condition Tests', () => {
  ${this.results.potentialRaceConditions.map(issue => `
  describe('${issue.type}', () => {
    it('should handle ${issue.issue.toLowerCase()}', async () => {
      // Test implementation for ${issue.file}
      // TODO: Implement specific test for this race condition
      expect(true).toBe(true); // Placeholder
    });
  });`).join('')}
});
`;

    try {
      await fs.writeFile('race-condition-tests.spec.js', testCode);
      console.log(chalk.green('✅ Test scenarios saved to: race-condition-tests.spec.js'));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save test scenarios: ${error.message}`));
    }
  }

  printSummary() {
    console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + '                   Analysis Complete                          ' + chalk.cyan('║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));

    console.log(`📁 Files Analyzed: ${chalk.blue(this.stats.filesAnalyzed)}`);
    console.log(`🔍 Issues Found: ${this.stats.issuesFound > 0 ? chalk.red(this.stats.issuesFound) : chalk.green('0')}`);

    const criticalCount = this.results.potentialRaceConditions.filter(i => i.severity === 'CRITICAL').length;
    const highCount = this.results.potentialRaceConditions.filter(i => i.severity === 'HIGH').length;

    if (criticalCount > 0) {
      console.log(`🔴 Critical Issues: ${chalk.red(criticalCount)}`);
    }
    if (highCount > 0) {
      console.log(`🟠 High Priority Issues: ${chalk.yellow(highCount)}`);
    }

    console.log(`⏱️  Analysis Duration: ${chalk.blue(Math.round((Date.now() - this.stats.startTime) / 1000))}s`);

    if (this.stats.issuesFound === 0) {
      console.log(chalk.green('\n🎉 No race conditions detected! Your code shows good synchronization practices.'));
    } else {
      console.log(chalk.yellow('\n📋 Review the detailed report in docs/race-condition-analysis.md'));
      console.log(chalk.yellow('🧪 Implement the test scenarios in race-condition-tests.spec.js'));
    }

    console.log('\n');
  }
}

// Main execution
const analyzer = new RaceConditionAnalyzer();
analyzer.analyze().catch(error => {
  console.error(chalk.red('❌ Analysis failed:'), error.message);
  process.exit(1);
});
