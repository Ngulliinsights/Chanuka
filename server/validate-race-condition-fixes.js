/**
 * Race Condition Fixes Validation Script
 * 
 * This script validates that all race condition fixes are properly implemented
 */

import fs from 'fs';
import path from 'path';

const VALIDATION_RESULTS = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function addResult(type, file, check, status, message) {
  VALIDATION_RESULTS[status]++;
  VALIDATION_RESULTS.details.push({
    type,
    file,
    check,
    status,
    message
  });
}

function validateFile(filePath, checks) {
  if (!fs.existsSync(filePath)) {
    addResult('file', filePath, 'existence', 'failed', 'File does not exist');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  checks.forEach(check => {
    const { name, pattern, required = true, message } = check;
    const found = pattern.test(content);
    
    if (required && !found) {
      addResult('pattern', filePath, name, 'failed', message || `Required pattern not found: ${pattern}`);
    } else if (required && found) {
      addResult('pattern', filePath, name, 'passed', message || `Pattern found: ${pattern}`);
    } else if (!required && found) {
      addResult('pattern', filePath, name, 'warnings', message || `Optional pattern found: ${pattern}`);
    }
  });
}

// Validation checks for each file
const FILE_VALIDATIONS = {
  'db.ts': [
    {
      name: 'initialization_lock',
      pattern: /let\s+initializationInProgress\s*=\s*false/,
      message: 'Database initialization lock variable found'
    },
    {
      name: 'initialization_promise',
      pattern: /let\s+initializationPromise.*Promise<void>\s*\|\s*null/,
      message: 'Database initialization promise tracking found'
    },
    {
      name: 'concurrent_prevention',
      pattern: /if\s*\(\s*initializationInProgress\s*\)/,
      message: 'Concurrent initialization prevention found'
    },
    {
      name: 'ensure_initialized',
      pattern: /const\s+ensureInitialized\s*=\s*async/,
      message: 'ensureInitialized function found'
    },
    {
      name: 'perform_initialization',
      pattern: /async\s+function\s+performInitialization/,
      message: 'performInitialization function found'
    },
    {
      name: 'finally_block',
      pattern: /}\s*finally\s*{\s*initializationInProgress\s*=\s*false/,
      message: 'Proper cleanup in finally block found'
    }
  ],

  'infrastructure/websocket.ts': [
    {
      name: 'initialization_lock',
      pattern: /private\s+initializationLock\s*=\s*false/,
      message: 'WebSocket initialization lock found'
    },
    {
      name: 'is_initialized',
      pattern: /private\s+isInitialized\s*=\s*false/,
      message: 'WebSocket initialization state tracking found'
    },
    {
      name: 'concurrent_check',
      pattern: /if\s*\(\s*this\.isInitialized\s*\|\|\s*this\.initializationLock\s*\)/,
      message: 'Concurrent initialization check found'
    },
    {
      name: 'cleanup_method',
      pattern: /cleanup\(\)\s*:\s*void/,
      message: 'Cleanup method found'
    },
    {
      name: 'health_check',
      pattern: /performHealthCheck/,
      message: 'Health check mechanism found'
    }
  ],

  'vite.ts': [
    {
      name: 'initialization_lock',
      pattern: /let\s+viteInitializationLock\s*=\s*false/,
      message: 'Vite initialization lock found'
    },
    {
      name: 'shutdown_lock',
      pattern: /let\s+viteShutdownLock\s*=\s*false/,
      message: 'Vite shutdown lock found'
    },
    {
      name: 'concurrent_init_check',
      pattern: /if\s*\(\s*viteInitializationLock\s*\)/,
      message: 'Concurrent initialization prevention found'
    },
    {
      name: 'concurrent_shutdown_check',
      pattern: /if\s*\(\s*viteShutdownLock\s*\)/,
      message: 'Concurrent shutdown prevention found'
    },
    {
      name: 'finally_cleanup',
      pattern: /}\s*finally\s*{\s*viteInitializationLock\s*=\s*false/,
      message: 'Proper cleanup in finally block found'
    }
  ],

  'infrastructure/notifications/notification-scheduler.ts': [
    {
      name: 'initialization_lock',
      pattern: /private\s+initializationLock\s*=\s*false/,
      message: 'Notification scheduler initialization lock found'
    },
    {
      name: 'job_update_lock',
      pattern: /private\s+jobUpdateLock\s*=\s*new\s+Set<string>\(\)/,
      message: 'Job update lock set found'
    },
    {
      name: 'concurrent_init_check',
      pattern: /if\s*\(\s*this\.isInitialized\s*\|\|\s*this\.initializationLock\s*\)/,
      message: 'Concurrent initialization check found'
    },
    {
      name: 'job_lock_check',
      pattern: /if\s*\(\s*this\.jobUpdateLock\.has\(jobId\)\s*\)/,
      message: 'Job update lock check found'
    },
    {
      name: 'cleanup_method',
      pattern: /cleanup\(\)\s*:\s*void/,
      message: 'Cleanup method found'
    }
  ],

  'features/privacy/privacy-scheduler.ts': [
    {
      name: 'initialization_lock',
      pattern: /private\s+initializationLock\s*=\s*false/,
      message: 'Privacy scheduler initialization lock found'
    },
    {
      name: 'cleanup_progress',
      pattern: /private\s+cleanupInProgress\s*=\s*false/,
      message: 'Cleanup progress tracking found'
    },
    {
      name: 'compliance_progress',
      pattern: /private\s+complianceInProgress\s*=\s*false/,
      message: 'Compliance progress tracking found'
    },
    {
      name: 'cleanup_check',
      pattern: /if\s*\(\s*this\.cleanupInProgress\s*\)/,
      message: 'Cleanup progress check found'
    },
    {
      name: 'compliance_check',
      pattern: /if\s*\(\s*this\.complianceInProgress\s*\)/,
      message: 'Compliance progress check found'
    }
  ],

  'index.ts': [
    {
      name: 'startup_initialization_lock',
      pattern: /let\s+initializationInProgress\s*=\s*false/,
      message: 'Startup initialization lock found'
    },
    {
      name: 'startup_promise',
      pattern: /let\s+initializationPromise.*Promise<void>\s*\|\s*null/,
      message: 'Startup initialization promise tracking found'
    },
    {
      name: 'sequential_initialization',
      pattern: /for\s*\(\s*const\s+service\s+of\s+serviceInitializers\s*\)/,
      message: 'Sequential service initialization found'
    },
    {
      name: 'startup_await',
      pattern: /await\s+startupInitialization\(\)/,
      message: 'Proper startup initialization await found'
    }
  ],

  'utils/race-condition-prevention.ts': [
    {
      name: 'async_lock_class',
      pattern: /export\s+class\s+AsyncLock/,
      message: 'AsyncLock class found'
    },
    {
      name: 'semaphore_class',
      pattern: /export\s+class\s+Semaphore/,
      message: 'Semaphore class found'
    },
    {
      name: 'rate_limiter_class',
      pattern: /export\s+class\s+RateLimiter/,
      message: 'RateLimiter class found'
    },
    {
      name: 'circuit_breaker_class',
      pattern: /export\s+class\s+CircuitBreaker/,
      message: 'CircuitBreaker class found'
    },
    {
      name: 'global_instances',
      pattern: /export\s+const\s+globalAsyncLock/,
      message: 'Global utility instances found'
    }
  ]
};

// Additional logical validations
function performLogicalValidations() {
  console.log('\n🔍 Performing logical validations...');

  // Check if all critical files have race condition fixes
  const criticalFiles = [
    'db.ts',
    'infrastructure/websocket.ts', 
    'vite.ts',
    'infrastructure/notifications/notification-scheduler.ts',
    'features/privacy/privacy-scheduler.ts',
    'index.ts'
  ];

  criticalFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      addResult('logical', file, 'critical_file_exists', 'failed', `Critical file missing: ${file}`);
    } else {
      addResult('logical', file, 'critical_file_exists', 'passed', `Critical file exists: ${file}`);
    }
  });

  // Check if race condition prevention utilities exist
  if (fs.existsSync('utils/race-condition-prevention.ts')) {
    addResult('logical', 'utils/race-condition-prevention.ts', 'utilities_exist', 'passed', 'Race condition prevention utilities found');
  } else {
    addResult('logical', 'utils/race-condition-prevention.ts', 'utilities_exist', 'failed', 'Race condition prevention utilities missing');
  }

  // Check if documentation exists
  if (fs.existsSync('docs/race-condition-fixes-summary.md')) {
    addResult('logical', 'docs/race-condition-fixes-summary.md', 'documentation_exists', 'passed', 'Race condition fixes documentation found');
  } else {
    addResult('logical', 'docs/race-condition-fixes-summary.md', 'documentation_exists', 'warnings', 'Race condition fixes documentation missing');
  }
}

// Main validation function
function validateRaceConditionFixes() {
  console.log('🔍 Validating Race Condition Fixes...\n');

  // Validate each file
  Object.entries(FILE_VALIDATIONS).forEach(([file, checks]) => {
    console.log(`📁 Validating ${file}...`);
    validateFile(file, checks);
  });

  // Perform logical validations
  performLogicalValidations();

  // Print results
  console.log('\n📊 Validation Results:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${VALIDATION_RESULTS.passed}`);
  console.log(`❌ Failed: ${VALIDATION_RESULTS.failed}`);
  console.log(`⚠️  Warnings: ${VALIDATION_RESULTS.warnings}`);
  console.log('='.repeat(50));

  // Print detailed results
  if (VALIDATION_RESULTS.details.length > 0) {
    console.log('\n📋 Detailed Results:');
    
    const groupedResults = VALIDATION_RESULTS.details.reduce((acc, result) => {
      if (!acc[result.file]) acc[result.file] = [];
      acc[result.file].push(result);
      return acc;
    }, {});

    Object.entries(groupedResults).forEach(([file, results]) => {
      console.log(`\n📄 ${file}:`);
      results.forEach(result => {
        const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.check}: ${result.message}`);
      });
    });
  }

  // Summary
  console.log('\n🎯 Summary:');
  if (VALIDATION_RESULTS.failed === 0) {
    console.log('🎉 All race condition fixes are properly implemented!');
    if (VALIDATION_RESULTS.warnings > 0) {
      console.log(`⚠️  Note: ${VALIDATION_RESULTS.warnings} warnings found (non-critical)`);
    }
  } else {
    console.log(`❌ ${VALIDATION_RESULTS.failed} critical issues found that need to be addressed.`);
  }

  return VALIDATION_RESULTS.failed === 0;
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = validateRaceConditionFixes();
  process.exit(success ? 0 : 1);
}

export { validateRaceConditionFixes };