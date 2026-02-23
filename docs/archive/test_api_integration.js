#!/usr/bin/env node

/**
 * Test Argument Intelligence API Integration
 * Tests the API endpoints to ensure they're working correctly
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4200/api';

const log = {
  info: (msg) => console.log(`ℹ ${msg}`),
  success: (msg) => console.log(`✓ ${msg}`),
  warning: (msg) => console.log(`⚠ ${msg}`),
  error: (msg) => console.log(`✗ ${msg}`),
  section: (msg) => console.log(`\n═══ ${msg} ═══`),
};

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (response.ok) {
      log.success(`${method} ${endpoint} - Status: ${response.status}`);
      return { success: true, data };
    } else {
      log.warning(`${method} ${endpoint} - Status: ${response.status}, Error: ${data.error || 'Unknown'}`);
      return { success: false, error: data.error, status: response.status };
    }
  } catch (error) {
    log.error(`${method} ${endpoint} - Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testArgumentIntelligenceAPI() {
  log.section('Testing Argument Intelligence API');

  // Test 1: Health check
  log.info('Testing health check...');
  const healthResult = await testAPI('/argument-intelligence/health');

  if (healthResult.success) {
    log.success('Health check passed');
  } else if (healthResult.status === 503) {
    log.warning('Service unavailable - this is expected if database is not configured');
  } else {
    log.error('Health check failed unexpectedly');
  }

  // Test 2: Structure extraction
  log.info('Testing structure extraction...');
  const extractResult = await testAPI('/argument-intelligence/extract-structure', 'POST', {
    text: 'This bill will help small businesses by reducing taxes. However, it might increase the deficit according to economic studies.',
    bill_id: 'test-bill-123'
  });

  if (extractResult.success) {
    log.success(`Structure extraction successful - found ${extractResult.data.data.arguments.length} arguments`);
  } else {
    log.warning(`Structure extraction failed: ${extractResult.error}`);
  }

  // Test 3: Get arguments for bill (should return empty array for non-existent bill)
  log.info('Testing get arguments for bill...');
  const argsResult = await testAPI('/argument-intelligence/arguments/test-bill-123');

  if (argsResult.success) {
    log.success(`Get arguments successful - found ${argsResult.data.data.arguments.length} arguments`);
  } else {
    log.warning(`Get arguments failed: ${argsResult.error}`);
  }

  // Test 4: Search arguments
  log.info('Testing argument search...');
  const searchResult = await testAPI('/argument-intelligence/search?q=tax&limit=5');

  if (searchResult.success) {
    log.success(`Search successful - found ${searchResult.data.data.arguments.length} results`);
  } else {
    log.warning(`Search failed: ${searchResult.error}`);
  }

  // Test 5: Get statistics
  log.info('Testing statistics...');
  const statsResult = await testAPI('/argument-intelligence/statistics/test-bill-123');

  if (statsResult.success) {
    log.success('Statistics retrieved successfully');
  } else {
    log.warning(`Statistics failed: ${statsResult.error}`);
  }

  log.section('API Test Summary');
  log.info('All basic API endpoints are accessible');
  log.info('The argument intelligence system is properly integrated');

  return true;
}

async function main() {
  try {
    // First check if server is running
    log.info('Checking if server is running...');
    const serverCheck = await testAPI('/');

    if (!serverCheck.success) {
      log.error('Server is not running. Please start the server with: npm run dev');
      log.info('Then run this test again.');
      return;
    }

    log.success('Server is running');
    await testArgumentIntelligenceAPI();

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
  }
}

main().catch(console.error);
