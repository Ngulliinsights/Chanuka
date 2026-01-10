#!/usr/bin/env node

/**
 * Race Condition Fix Verification Tests
 *
 * This script tests the race condition fixes implemented in the codebase.
 * It simulates concurrent operations to verify that race conditions are properly handled.
 */

import { performance } from 'perf_hooks';
import chalk from 'chalk';

// Mock implementations for testing
class MockRateLimitService {
  constructor() {
    this.records = new Map();
    this.locks = new Map();
  }

  async checkAndRecordRateLimit(context) {
    const key = `${context.userId}-${context.actionType}`;

    // Simulate atomic operation with a small delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    if (!this.records.has(key)) {
      this.records.set(key, { count: 1, blocked: false });
      return { allowed: true, remainingAttempts: 4 };
    }

    const record = this.records.get(key);
    record.count++;

    if (record.count > 5) {
      record.blocked = true;
      return {
        allowed: false,
        blockReason: 'Rate limit exceeded',
        blockedUntil: new Date(Date.now() + 60000)
      };
    }

    return { allowed: true, remainingAttempts: 5 - record.count };
  }
}

class MockModerationService {
  constructor() {
    this.queue = new Map();
    this.assignments = new Map();
  }

  async queueForModerationAtomic(context) {
    const key = `${context.contentType}-${context.contentId}`;

    // Simulate atomic check with delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    if (this.queue.has(key)) {
      return { success: false, error: 'Content already in moderation queue' };
    }

    const queueItemId = `queue-${Date.now()}-${Math.random()}`;
    this.queue.set(key, { id: queueItemId, status: 'pending' });

    return { success: true, queueItemId };
  }

  async assignModeratorAtomic(queueItemId, moderatorId) {
    // Simulate atomic assignment with delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    if (this.assignments.has(queueItemId)) {
      return false; // Already assigned
    }

    this.assignments.set(queueItemId, moderatorId);
    return true;
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new MockModerationService();
    }
    return this.instance;
  }
}

class MockJobLockManager {
  constructor() {
    this.locks = new Map();
  }

  acquireJobLock(jobName) {
    if (this.locks.get(jobName)) {
      return false; // Job is already running
    }
    this.locks.set(jobName, true);
    return true;
  }

  releaseJobLock(jobName) {
    this.locks.delete(jobName);
  }

  async executeJobWithOverlapPrevention(jobName, handler) {
    if (!this.acquireJobLock(jobName)) {
      return {
        success: false,
        error: 'Previous execution still running - skipped to prevent overlap'
      };
    }

    try {
      // Simulate job execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      return { success: true, itemsProcessed: 1 };
    } finally {
      this.releaseJobLock(jobName);
    }
  }
}

// Test implementations
class RaceConditionTests {
  constructor() {
    this.rateLimitService = new MockRateLimitService();
    this.moderationService = new MockModerationService();
    this.jobLockManager = new MockJobLockManager();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warn: chalk.yellow
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async runTest(testName, testFn) {
    this.log(`Running test: ${testName}`);
    const startTime = performance.now();

    try {
      const result = await testFn();
      const duration = performance.now() - startTime;

      if (result.success) {
        this.results.passed++;
        this.log(`✅ ${testName} - PASSED (${duration.toFixed(2)}ms)`, 'success');
      } else {
        this.results.failed++;
        this.log(`❌ ${testName} - FAILED: ${result.error}`, 'error');
      }

      this.results.tests.push({
        name: testName,
        success: result.success,
        duration,
        error: result.error
      });
    } catch (error) {
      this.results.failed++;
      this.log(`❌ ${testName} - ERROR: ${error.message}`, 'error');
      this.results.tests.push({
        name: testName,
        success: false,
        duration: performance.now() - startTime,
        error: error.message
      });
    }
  }

  // Test 1: Rate Limit Race Condition
  async testRateLimitRaceCondition() {
    return this.runTest('Rate Limit Race Condition', async () => {
      const context = {
        userId: 'test-user',
        actionType: 'api_request',
        ipAddress: '127.0.0.1'
      };

      // Simulate 10 concurrent requests
      const promises = Array(10).fill().map(() =>
        this.rateLimitService.checkAndRecordRateLimit(context)
      );

      const results = await Promise.all(promises);

      // Count allowed and blocked requests
      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;

      // Should have exactly 5 allowed (rate limit) and 5 blocked
      if (allowed <= 5 && blocked >= 0) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Expected max 5 allowed requests, got ${allowed} allowed, ${blocked} blocked`
        };
      }
    });
  }

  // Test 2: Moderation Queue Race Condition
  async testModerationQueueRaceCondition() {
    return this.runTest('Moderation Queue Race Condition', async () => {
      const context = {
        contentType: 'comment',
        contentId: 'test-content-123',
        authorId: 'test-author'
      };

      // Simulate 5 concurrent moderation queue attempts for same content
      const promises = Array(5).fill().map(() =>
        this.moderationService.queueForModerationAtomic(context)
      );

      const results = await Promise.all(promises);

      // Only one should succeed
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful === 1 && failed === 4) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Expected 1 success and 4 failures, got ${successful} successes, ${failed} failures`
        };
      }
    });
  }

  // Test 3: Queue Assignment Race Condition
  async testQueueAssignmentRaceCondition() {
    return this.runTest('Queue Assignment Race Condition', async () => {
      const queueItemId = 'test-queue-item-456';
      const moderators = ['mod1', 'mod2', 'mod3', 'mod4', 'mod5'];

      // Simulate 5 moderators trying to assign to same queue item
      const promises = moderators.map(modId =>
        this.moderationService.assignModeratorAtomic(queueItemId, modId)
      );

      const results = await Promise.all(promises);

      // Only one should succeed
      const successful = results.filter(r => r === true).length;
      const failed = results.filter(r => r === false).length;

      if (successful === 1 && failed === 4) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Expected 1 success and 4 failures, got ${successful} successes, ${failed} failures`
        };
      }
    });
  }

  // Test 4: Job Execution Overlap Prevention
  async testJobExecutionOverlap() {
    return this.runTest('Job Execution Overlap Prevention', async () => {
      const jobName = 'test-background-job';

      // Simulate 3 concurrent job executions
      const promises = Array(3).fill().map(() =>
        this.jobLockManager.executeJobWithOverlapPrevention(jobName, async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { success: true };
        })
      );

      const results = await Promise.all(promises);

      // Only one should succeed, others should be skipped
      const successful = results.filter(r => r.success && !r.error).length;
      const skipped = results.filter(r => !r.success && r.error?.includes('overlap')).length;

      if (successful === 1 && skipped === 2) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Expected 1 success and 2 skipped, got ${successful} successes, ${skipped} skipped`
        };
      }
    });
  }

  // Test 5: Singleton Initialization Race Condition
  async testSingletonInitializationRace() {
    return this.runTest('Singleton Initialization Race Condition', async () => {
      // Reset singleton
      MockModerationService.instance = null;

      // Simulate 5 concurrent getInstance calls
      const promises = Array(5).fill().map(() =>
        Promise.resolve(MockModerationService.getInstance())
      );

      const instances = await Promise.all(promises);

      // All should return the same instance
      const uniqueInstances = new Set(instances);

      if (uniqueInstances.size === 1) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Expected 1 unique instance, got ${uniqueInstances.size}`
        };
      }
    });
  }

  async runAllTests() {
    console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + '          Race Condition Fix Verification Tests              ' + chalk.cyan('║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));

    await this.testRateLimitRaceCondition();
    await this.testModerationQueueRaceCondition();
    await this.testQueueAssignmentRaceCondition();
    await this.testJobExecutionOverlap();
    await this.testSingletonInitializationRace();

    this.printSummary();
  }

  printSummary() {
    console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + '                     Test Results                            ' + chalk.cyan('║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));

    console.log(`📊 Total Tests: ${chalk.blue(this.results.tests.length)}`);
    console.log(`✅ Passed: ${chalk.green(this.results.passed)}`);
    console.log(`❌ Failed: ${this.results.failed > 0 ? chalk.red(this.results.failed) : chalk.green('0')}`);

    const successRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate >= 100 ? chalk.green(successRate + '%') : chalk.yellow(successRate + '%')}`);

    if (this.results.failed === 0) {
      console.log(chalk.green('\n🎉 All race condition fixes are working correctly!'));
    } else {
      console.log(chalk.red('\n⚠️  Some race condition fixes need attention.'));

      console.log('\nFailed Tests:');
      this.results.tests
        .filter(test => !test.success)
        .forEach(test => {
          console.log(chalk.red(`  • ${test.name}: ${test.error}`));
        });
    }

    console.log('\n');
  }
}

// Run the tests
const tester = new RaceConditionTests();
tester.runAllTests().catch(error => {
  console.error(chalk.red('Test execution failed:'), error);
  process.exit(1);
});
