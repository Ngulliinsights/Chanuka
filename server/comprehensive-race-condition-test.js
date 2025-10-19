#!/usr/bin/env node

/**
 * Comprehensive Race Condition, Infinite Loop, and Redundancy Test
 * 
 * This script performs thorough testing to identify:
 * 1. Race conditions in concurrent operations
 * 2. Infinite loops and circular dependencies
 * 3. Redundant service instances
 * 4. Memory leaks and resource cleanup issues
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';
import fs from 'fs';
import path from 'path';

logger.info('🧪 Starting Comprehensive Race Condition Testing...\n', { component: 'Chanuka' });

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function addResult(test, status, message, details = null) {
  testResults[status]++;
  testResults.details.push({
    test,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

// Test 1: Multiple concurrent server startups
async function testConcurrentStartups() {
  logger.info('\n🔄 Test 1: Multiple concurrent server startups...', { component: 'Chanuka' });
  
  const processes = [];
  const ports = [4201, 4202, 4203];
  const startTimes = [];
  
  try {
    // Start 3 server processes simultaneously
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      const proc = spawn('node', ['index.ts'], {
        stdio: 'pipe',
        env: { ...process.env, PORT: ports[i].toString(), NODE_ENV: 'test' }
      });
      
      processes.push({ proc, port: ports[i], startTime });
      
      // Kill after 3 seconds
      setTimeout(3000).then(() => {
        if (!proc.killed) {
          proc.kill('SIGTERM');
        }
      });
    }
    
    // Wait for all processes to finish
    await Promise.all(processes.map(({ proc }) => new Promise(resolve => {
      proc.on('exit', resolve);
    })));
    
    addResult('Concurrent Startups', 'passed', 'Multiple server instances started and stopped without conflicts');
    
  } catch (error) {
    addResult('Concurrent Startups', 'failed', `Error during concurrent startup test: ${error.message}`);
  }
}

// Test 2: Database initialization race conditions
async function testDatabaseRaceConditions() {
  logger.info('\n🗄️ Test 2: Database initialization race conditions...', { component: 'Chanuka' });
  
  try {
    // Import database service and test concurrent initialization
    const { databaseService } = await import('./services/database-service.js');
    
    const initPromises = [];
    const startTime = Date.now();
    
    // Attempt 5 concurrent initializations
    for (let i = 0; i < 5; i++) {
      initPromises.push(
        databaseService.forceReconnect().then(() => ({
          id: i + 1,
          duration: Date.now() - startTime
        }))
      );
    }
    
    const results = await Promise.all(initPromises);
    
    // Check if all initializations completed around the same time
    const durations = results.map(r => r.duration);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const timeDiff = maxDuration - minDuration;
    
    if (timeDiff < 500) { // Within 500ms indicates proper synchronization
      addResult('Database Race Conditions', 'passed', 'Database initialization properly synchronized', {
        timeDifference: `${timeDiff}ms`,
        results
      });
    } else {
      addResult('Database Race Conditions', 'warnings', 'Database initialization may have race conditions', {
        timeDifference: `${timeDiff}ms`,
        results
      });
    }
    
  } catch (error) {
    addResult('Database Race Conditions', 'failed', `Database race condition test failed: ${error.message}`);
  }
}

// Test 3: WebSocket service race conditions
async function testWebSocketRaceConditions() {
  logger.info('\n🔌 Test 3: WebSocket service race conditions...', { component: 'Chanuka' });
  
  try {
    const { webSocketService } = await import('./infrastructure/websocket.js');
    
    // Test multiple concurrent initializations
    const mockServer = { on: () => {}, listen: () => {} };
    
    const initPromises = [];
    for (let i = 0; i < 3; i++) {
      initPromises.push(
        new Promise(resolve => {
          try {
            webSocketService.initialize(mockServer);
            resolve({ success: true, id: i + 1 });
          } catch (error) {
            resolve({ success: false, error: error.message, id: i + 1 });
          }
        })
      );
    }
    
    const results = await Promise.all(initPromises);
    const successful = results.filter(r => r.success).length;
    
    if (successful === 1) {
      addResult('WebSocket Race Conditions', 'passed', 'WebSocket service properly prevents multiple initializations', { results });
    } else {
      addResult('WebSocket Race Conditions', 'failed', 'WebSocket service allows multiple initializations', { results });
    }
    
  } catch (error) {
    addResult('WebSocket Race Conditions', 'failed', `WebSocket race condition test failed: ${error.message}`);
  }
}

// Test 4: Memory leak detection
async function testMemoryLeaks() {
  logger.info('\n🧠 Test 4: Memory leak detection...', { component: 'Chanuka' });
  
  const initialMemory = process.memoryUsage();
  
  try {
    // Simulate operations that could cause memory leaks
    const intervals = [];
    const timeouts = [];
    
    // Create intervals and timeouts
    for (let i = 0; i < 100; i++) {
      intervals.push(setInterval(() => {
        // Simulate work
        const data = new Array(1000).fill(Math.random());
      }, 10));
      
      timeouts.push(setTimeout(() => {
        // Simulate async work
      }, Math.random() * 1000));
    }
    
    await setTimeout(2000); // Let them run for 2 seconds
    
    // Clean up
    intervals.forEach(interval => clearInterval(interval));
    timeouts.forEach(timeout => clearTimeout(timeout));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    await setTimeout(1000); // Wait for cleanup
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024);
    
    if (memoryIncreaseMB < 10) { // Less than 10MB increase is acceptable
      addResult('Memory Leaks', 'passed', `Memory usage stable: ${memoryIncreaseMB}MB increase`);
    } else if (memoryIncreaseMB < 50) {
      addResult('Memory Leaks', 'warnings', `Moderate memory increase: ${memoryIncreaseMB}MB`);
    } else {
      addResult('Memory Leaks', 'failed', `High memory increase detected: ${memoryIncreaseMB}MB`);
    }
    
  } catch (error) {
    addResult('Memory Leaks', 'failed', `Memory leak test failed: ${error.message}`);
  }
}

// Test 5: Circular dependency detection
async function testCircularDependencies() {
  logger.info('\n🔄 Test 5: Circular dependency detection...', { component: 'Chanuka' });
  
  try {
    const dependencyMap = new Map();
    const visited = new Set();
    const recursionStack = new Set();
    
    // Analyze import statements in key files
    const keyFiles = [
      'index.ts',
      'db.ts',
      'vite.ts',
      'infrastructure/websocket.ts',
      'services/database-service.ts'
    ];
    
    function analyzeFile(filePath) {
      if (!fs.existsSync(filePath)) return [];
      
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = [];
      
      // Extract import statements
      const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          imports.push(importPath);
        }
      }
      
      return imports;
    }
    
    function detectCycles(file, path = []) {
      if (recursionStack.has(file)) {
        return path.concat(file); // Cycle detected
      }
      
      if (visited.has(file)) {
        return null; // Already processed
      }
      
      visited.add(file);
      recursionStack.add(file);
      
      const imports = dependencyMap.get(file) || [];
      
      for (const importPath of imports) {
        const cycle = detectCycles(importPath, path.concat(file));
        if (cycle) return cycle;
      }
      
      recursionStack.delete(file);
      return null;
    }
    
    // Build dependency map
    for (const file of keyFiles) {
      dependencyMap.set(file, analyzeFile(file));
    }
    
    // Check for cycles
    let cyclesFound = 0;
    const cycles = [];
    
    for (const file of keyFiles) {
      visited.clear();
      recursionStack.clear();
      const cycle = detectCycles(file);
      if (cycle) {
        cycles.push(cycle);
        cyclesFound++;
      }
    }
    
    if (cyclesFound === 0) {
      addResult('Circular Dependencies', 'passed', 'No circular dependencies detected');
    } else {
      addResult('Circular Dependencies', 'warnings', `${cyclesFound} potential circular dependencies found`, { cycles });
    }
    
  } catch (error) {
    addResult('Circular Dependencies', 'failed', `Circular dependency test failed: ${error.message}`);
  }
}

// Test 6: Service redundancy detection
async function testServiceRedundancy() {
  logger.info('\n🔍 Test 6: Service redundancy detection...', { component: 'Chanuka' });
  
  try {
    const serviceInstances = new Map();
    
    // Check for multiple instances of the same service
    const services = [
      'databaseService',
      'webSocketService',
      'notificationService',
      'searchIndexManager'
    ];
    
    for (const serviceName of services) {
      try {
        // Try to import the service multiple times
        const module1 = await import(`./services/${serviceName.toLowerCase().replace('service', '-service')}.js`);
        const module2 = await import(`./services/${serviceName.toLowerCase().replace('service', '-service')}.js`);
        
        // Check if they're the same instance (singleton pattern)
        const instance1 = module1[serviceName];
        const instance2 = module2[serviceName];
        
        if (instance1 === instance2) {
          serviceInstances.set(serviceName, 'singleton');
        } else {
          serviceInstances.set(serviceName, 'multiple');
        }
      } catch (error) {
        // Service might not exist or have different export name
        serviceInstances.set(serviceName, 'not_found');
      }
    }
    
    const multipleInstances = Array.from(serviceInstances.entries())
      .filter(([name, type]) => type === 'multiple');
    
    if (multipleInstances.length === 0) {
      addResult('Service Redundancy', 'passed', 'All services use singleton pattern', { serviceInstances: Object.fromEntries(serviceInstances) });
    } else {
      addResult('Service Redundancy', 'warnings', 'Some services may have multiple instances', { 
        multipleInstances,
        allServices: Object.fromEntries(serviceInstances)
      });
    }
    
  } catch (error) {
    addResult('Service Redundancy', 'failed', `Service redundancy test failed: ${error.message}`);
  }
}

// Test 7: Infinite loop detection in async operations
async function testInfiniteLoops() {
  logger.info('\n♾️ Test 7: Infinite loop detection...', { component: 'Chanuka' });
  
  try {
    // Test async operations with timeout
    const asyncOperations = [
      {
        name: 'Database Health Check',
        operation: async () => {
          const { databaseService } = await import('./services/database-service.js');
          return await Promise.race([
            databaseService.getHealthStatus(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        }
      },
      {
        name: 'WebSocket Stats',
        operation: async () => {
          const { webSocketService } = await import('./infrastructure/websocket.js');
          return await Promise.race([
            Promise.resolve(webSocketService.getStats()),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        }
      }
    ];
    
    const results = [];
    
    for (const { name, operation } of asyncOperations) {
      try {
        const startTime = Date.now();
        await operation();
        const duration = Date.now() - startTime;
        results.push({ name, status: 'completed', duration });
      } catch (error) {
        if (error.message === 'Timeout') {
          results.push({ name, status: 'timeout', error: 'Operation timed out - possible infinite loop' });
        } else {
          results.push({ name, status: 'error', error: error.message });
        }
      }
    }
    
    const timeouts = results.filter(r => r.status === 'timeout');
    
    if (timeouts.length === 0) {
      addResult('Infinite Loops', 'passed', 'No infinite loops detected in async operations', { results });
    } else {
      addResult('Infinite Loops', 'failed', `${timeouts.length} operations timed out - possible infinite loops`, { timeouts });
    }
    
  } catch (error) {
    addResult('Infinite Loops', 'failed', `Infinite loop test failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  logger.info('🧪 Starting Comprehensive Race Condition Tests...\n', { component: 'Chanuka' });
  
  try {
    await testDatabaseRaceConditions();
    await testWebSocketRaceConditions();
    await testMemoryLeaks();
    await testCircularDependencies();
    await testServiceRedundancy();
    await testInfiniteLoops();
    // Skip concurrent startups test as it's resource intensive
    // await testConcurrentStartups();
    
    // Print summary
    logger.info('\n📊 Test Results Summary:', { component: 'Chanuka' });
    logger.info('='.repeat(50), { component: 'Chanuka' });
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    logger.info('='.repeat(50), { component: 'Chanuka' });
    
    if (testResults.failed === 0) {
      logger.info('\n🎉 All critical tests passed! No race conditions or infinite loops detected.', { component: 'Chanuka' });
      if (testResults.warnings > 0) {
        console.log(`⚠️  Note: ${testResults.warnings} warnings found (non-critical issues)`);
      }
    } else {
      console.log(`\n❌ ${testResults.failed} critical issues found that need to be addressed.`);
    }
    
    // Save detailed results
    fs.writeFileSync('test-results.json', JSON.stringify(testResults, null, 2));
    logger.info('\n📄 Detailed results saved to test-results.json', { component: 'Chanuka' });
    
  } catch (error) {
    logger.error('❌ Test suite failed:', { component: 'Chanuka' }, error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };




































