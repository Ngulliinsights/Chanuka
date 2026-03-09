#!/usr/bin/env tsx
/**
 * Test Script for Server Startup Fixes
 * 
 * Tests:
 * 1. Module resolution with @server/* aliases
 * 2. Port conflict detection and handling
 * 3. Pre-flight checks
 */

import { checkPort, findAvailablePort, getPortPid } from './utils/port-manager.js';
import { runPreflightChecks, printPreflightResults } from './utils/preflight-check.js';

async function testModuleResolution() {
  console.log('🧪 Testing Module Resolution...\n');
  
  try {
    // Try to import a module using @server alias
    const { logger } = await import('@server/infrastructure/observability');
    console.log('✅ Successfully imported @server/infrastructure/observability');
    console.log('✅ Module resolution is working correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Module resolution failed:', error);
    console.error('❌ @server/* path aliases are not resolving\n');
    return false;
  }
}

async function testPortManagement() {
  console.log('🧪 Testing Port Management...\n');
  
  const testPort = 4200;
  
  try {
    // Check port status
    console.log(`Checking port ${testPort}...`);
    const portInfo = await checkPort(testPort);
    
    if (portInfo.available) {
      console.log(`✅ Port ${testPort} is available`);
    } else {
      console.log(`⚠️  Port ${testPort} is in use`);
      if (portInfo.pid) {
        console.log(`   Process ID: ${portInfo.pid}`);
      }
      
      // Try to find an alternative port
      console.log('\nSearching for available port...');
      const availablePort = await findAvailablePort(testPort + 1);
      console.log(`✅ Found available port: ${availablePort}`);
    }
    
    console.log('✅ Port management utilities are working correctly\n');
    return true;
  } catch (error) {
    console.error('❌ Port management test failed:', error);
    return false;
  }
}

async function testPreflightChecks() {
  console.log('🧪 Testing Pre-flight Checks...\n');
  
  try {
    const result = await runPreflightChecks(4200);
    printPreflightResults(result);
    
    if (result.success) {
      console.log('✅ Pre-flight checks passed\n');
      return true;
    } else {
      console.log('⚠️  Pre-flight checks found issues (see above)\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Pre-flight checks failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Server Startup Fixes - Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const results = {
    moduleResolution: false,
    portManagement: false,
    preflightChecks: false,
  };
  
  // Test 1: Module Resolution
  results.moduleResolution = await testModuleResolution();
  
  // Test 2: Port Management
  results.portManagement = await testPortManagement();
  
  // Test 3: Pre-flight Checks
  results.preflightChecks = await testPreflightChecks();
  
  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Test Results Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('Module Resolution:', results.moduleResolution ? '✅ PASS' : '❌ FAIL');
  console.log('Port Management:  ', results.portManagement ? '✅ PASS' : '❌ FAIL');
  console.log('Pre-flight Checks:', results.preflightChecks ? '✅ PASS' : '⚠️  WARNINGS');
  
  const allPassed = results.moduleResolution && results.portManagement;
  
  console.log('\n' + '═══════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('✅ All critical tests passed! Server startup fixes are working.');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
  }
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
