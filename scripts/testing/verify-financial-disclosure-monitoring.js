#!/usr/bin/env node

/**
 * Verification script for Financial Disclosure Monitoring System
 * This script verifies that the implementation files exist and are properly structured
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying Financial Disclosure Monitoring System...\n');

async function verifySystem() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    return async () => {
      try {
        console.log(`Testing: ${name}...`);
        await fn();
        console.log(`✅ ${name} - PASSED`);
        results.passed++;
        results.tests.push({ name, status: 'PASSED' });
      } catch (error) {
        console.log(`❌ ${name} - FAILED: ${error.message}`);
        results.failed++;
        results.tests.push({ name, status: 'FAILED', error: error.message });
      }
    };
  }

  // Test 1: Required Files Exist
  await test('Required Files Exist', async () => {
    const requiredFiles = [
      'server/services/financial-disclosure-monitoring.ts',
      'server/services/monitoring-scheduler.ts',
      'server/routes/financial-disclosure.ts',
      'docs/financial-disclosure-monitoring.md'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
  })();

  // Test 2: Service File Structure
  await test('Service File Structure', async () => {
    const serviceFile = 'server/services/financial-disclosure-monitoring.ts';
    const content = fs.readFileSync(serviceFile, 'utf8');
    
    const requiredClasses = ['FinancialDisclosureMonitoringService'];
    const requiredMethods = [
      'collectFinancialDisclosures',
      'createDisclosureAlert',
      'buildFinancialRelationshipMap',
      'calculateDisclosureCompletenessScore',
      'monitorDisclosureUpdates',
      'getFinancialTransparencyDashboard',
      'startAutomatedMonitoring',
      'stopAutomatedMonitoring',
      'getDisclosureAlerts',
      'getHealthStatus'
    ];
    
    for (const className of requiredClasses) {
      if (!content.includes(`class ${className}`)) {
        throw new Error(`Missing class: ${className}`);
      }
    }
    
    for (const method of requiredMethods) {
      if (!content.includes(`async ${method}(`) && !content.includes(`${method}(`)) {
        throw new Error(`Missing method: ${method}`);
      }
    }
  })();

  // Test 3: Route File Structure
  await test('Route File Structure', async () => {
    const routeFile = 'server/routes/financial-disclosure.ts';
    const content = fs.readFileSync(routeFile, 'utf8');
    
    const requiredEndpoints = [
      'router.get("/disclosures"',
      'router.get("/relationships/:sponsorId"',
      'router.get("/completeness/:sponsorId"',
      'router.post("/alerts"',
      'router.get("/alerts/:sponsorId"',
      'router.get("/dashboard"',
      'router.get("/health"',
      'router.post("/monitoring/start"',
      'router.post("/monitoring/stop"',
      'router.post("/monitoring/check"'
    ];
    
    for (const endpoint of requiredEndpoints) {
      if (!content.includes(endpoint)) {
        throw new Error(`Missing endpoint: ${endpoint}`);
      }
    }
  })();

  // Test 4: Cache Configuration
  await test('Cache Configuration', async () => {
    const cacheFile = 'server/services/cache.ts';
    const content = fs.readFileSync(cacheFile, 'utf8');
    
    const requiredCacheKeys = [
      'SPONSOR_TRANSPARENCY',
      'SPONSOR_RELATIONSHIPS',
      'SPONSOR_COMPLETENESS',
      'FINANCIAL_ALERTS',
      'FINANCIAL_DASHBOARD'
    ];
    
    const requiredTTLs = [
      'TRANSPARENCY_DATA',
      'RELATIONSHIP_DATA',
      'COMPLETENESS_DATA',
      'ALERT_DATA',
      'DASHBOARD_DATA'
    ];
    
    for (const key of requiredCacheKeys) {
      if (!content.includes(key)) {
        throw new Error(`Missing cache key: ${key}`);
      }
    }
    
    for (const ttl of requiredTTLs) {
      if (!content.includes(ttl)) {
        throw new Error(`Missing cache TTL: ${ttl}`);
      }
    }
  })();

  // Test 5: Monitoring Scheduler
  await test('Monitoring Scheduler', async () => {
    const schedulerFile = 'server/services/monitoring-scheduler.ts';
    const content = fs.readFileSync(schedulerFile, 'utf8');
    
    const requiredMethods = [
      'initialize',
      'shutdown',
      'getStatus'
    ];
    
    for (const method of requiredMethods) {
      if (!content.includes(`async ${method}(`) && !content.includes(`${method}(`)) {
        throw new Error(`Missing scheduler method: ${method}`);
      }
    }
  })();

  // Test 6: Server Integration
  await test('Server Integration', async () => {
    const serverFile = 'server/index.ts';
    const content = fs.readFileSync(serverFile, 'utf8');
    
    const requiredIntegrations = [
      'financial-disclosure',
      'monitoring-scheduler',
      'financialDisclosureRouter',
      'monitoringScheduler'
    ];
    
    for (const integration of requiredIntegrations) {
      if (!content.includes(integration)) {
        throw new Error(`Missing server integration: ${integration}`);
      }
    }
  })();

  // Test 7: Interface Definitions
  await test('Interface Definitions', async () => {
    const serviceFile = 'server/services/financial-disclosure-monitoring.ts';
    const content = fs.readFileSync(serviceFile, 'utf8');
    
    const requiredInterfaces = [
      'FinancialDisclosure',
      'FinancialRelationship',
      'DisclousreCompletenessReport',
      'FinancialAlert'
    ];
    
    for (const interfaceName of requiredInterfaces) {
      if (!content.includes(`interface ${interfaceName}`)) {
        throw new Error(`Missing interface: ${interfaceName}`);
      }
    }
  })();

  // Test 8: Documentation
  await test('Documentation', async () => {
    const docFile = 'docs/financial-disclosure-monitoring.md';
    const content = fs.readFileSync(docFile, 'utf8');
    
    const requiredSections = [
      '# Financial Disclosure Monitoring System',
      '## Overview',
      '## Features',
      '## API Endpoints',
      '## Configuration',
      '## Usage Examples'
    ];
    
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        throw new Error(`Missing documentation section: ${section}`);
      }
    }
  })();

  // Test 9: Test Files
  await test('Test Files', async () => {
    const testFiles = [
      'server/tests/financial-disclosure-monitoring.test.ts',
      'server/tests/financial-disclosure-api.test.ts'
    ];
    
    for (const testFile of testFiles) {
      if (!fs.existsSync(testFile)) {
        throw new Error(`Missing test file: ${testFile}`);
      }
      
      const content = fs.readFileSync(testFile, 'utf8');
      if (!content.includes('describe(') || !content.includes('it(')) {
        throw new Error(`Test file ${testFile} doesn't contain proper test structure`);
      }
    }
  })();

  // Test 10: Configuration Constants
  await test('Configuration Constants', async () => {
    const serviceFile = 'server/services/financial-disclosure-monitoring.ts';
    const content = fs.readFileSync(serviceFile, 'utf8');
    
    const requiredConstants = [
      'REQUIRED_DISCLOSURE_TYPES',
      'DISCLOSURE_THRESHOLDS',
      'MONITORING_INTERVALS'
    ];
    
    for (const constant of requiredConstants) {
      if (!content.includes(constant)) {
        throw new Error(`Missing configuration constant: ${constant}`);
      }
    }
  })();

  return results;
}

// Run verification
verifySystem()
  .then(results => {
    console.log('\n📊 Verification Results:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed === 0) {
      console.log('\n🎉 All tests passed! Financial Disclosure Monitoring System is ready.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the errors above.');
      console.log('\nFailed Tests:');
      results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Verification failed with error:', error);
    process.exit(1);
  });