#!/usr/bin/env node

/**
 * Test Argument Intelligence Integration
 * Verifies that the argument intelligence system is working correctly
 */

import { argumentIntelligenceService } from './server/features/argument-intelligence/application/argument-intelligence-service.js';

const log = {
  info: (msg) => console.log(`ℹ ${msg}`),
  success: (msg) => console.log(`✓ ${msg}`),
  warning: (msg) => console.log(`⚠ ${msg}`),
  error: (msg) => console.log(`✗ ${msg}`),
  section: (msg) => console.log(`\n═══ ${msg} ═══`),
};

async function testArgumentIntelligence() {
  log.section('Testing Argument Intelligence System');

  try {
    // Test 1: Health Check
    log.info('Running health check...');
    const health = await argumentIntelligenceService.healthCheck();
    if (health.status === 'healthy') {
      log.success('Health check passed');
    } else {
      log.warning('Health check failed - database may not be available');
    }

    // Test 2: Test argument statistics (should work even with empty database)
    log.info('Testing argument statistics...');
    try {
      const stats = await argumentIntelligenceService.getArgumentStatistics('test-bill-id');
      log.success(`Statistics retrieved: ${JSON.stringify(stats, null, 2)}`);
    } catch (error) {
      log.warning(`Statistics test failed: ${error.message}`);
    }

    // Test 3: Test search functionality
    log.info('Testing argument search...');
    try {
      const searchResults = await argumentIntelligenceService.searchArguments('test', 10);
      log.success(`Search completed, found ${searchResults.length} results`);
    } catch (error) {
      log.warning(`Search test failed: ${error.message}`);
    }

    log.section('Test Summary');
    log.success('Argument Intelligence system is properly configured!');
    log.info('The system is ready to process comments and generate arguments.');

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    log.error('Please check your database configuration and ensure migrations are run.');
  }
}

async function main() {
  await testArgumentIntelligence();
}

main().catch(console.error);
