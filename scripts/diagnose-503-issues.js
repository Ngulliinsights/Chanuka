#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:4200';
const TIMEOUT = 5000;

// Test endpoints to check
const TEST_ENDPOINTS = [
  '/api/service-status',
  '/api/frontend-health',
  '/api',
  '/src/main.tsx',
  '/src/index.css',
  '/favicon.svg',
  '/manifest.webmanifest'
];

async function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const req = http.get(`${SERVER_URL}${endpoint}`, { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) // First 200 chars
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 'ERROR',
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint,
        status: 'TIMEOUT',
        error: 'Request timed out'
      });
    });
  });
}

async function checkFileExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function diagnose() {
  console.log('🔍 Diagnosing 503 Service Unavailable Issues...\n');

  // Check if server is running
  console.log('1. Testing server connectivity...');
  const healthCheck = await makeRequest('/api/service-status');
  
  if (healthCheck.status === 'ERROR' || healthCheck.status === 'TIMEOUT') {
    console.log('❌ Server is not responding. Please start the server with: npm run dev');
    return;
  }

  console.log(`✅ Server is running (Status: ${healthCheck.status})\n`);

  // Test all endpoints
  console.log('2. Testing endpoints...');
  const results = await Promise.all(
    TEST_ENDPOINTS.map(endpoint => makeRequest(endpoint))
  );

  results.forEach(result => {
    const status = result.status === 200 ? '✅' : 
                  result.status === 404 ? '⚠️' : 
                  result.status === 503 ? '❌' : '❓';
    
    console.log(`${status} ${result.endpoint}: ${result.status}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.status === 503) {
      console.log(`   Response: ${result.data}`);
    }
  });

  // Check critical files
  console.log('\n3. Checking critical files...');
  const criticalFiles = [
    'client/index.html',
    'client/src/main.tsx',
    'client/src/App.tsx',
    'client/src/index.css',
    'server/index.ts',
    'server/vite.ts'
  ];

  for (const file of criticalFiles) {
    const exists = await checkFileExists(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  }

  // Check middleware status
  console.log('\n4. Checking middleware configuration...');
  const serverIndexPath = 'server/index.ts';
  
  try {
    const serverContent = await fs.promises.readFile(serverIndexPath, 'utf8');
    
    const hasServiceMiddleware = serverContent.includes('serviceAvailabilityMiddleware');
    const hasResourceMiddleware = serverContent.includes('resourceAvailabilityMiddleware');
    const middlewareDisabled = serverContent.includes('// app.use(serviceAvailabilityMiddleware)');
    
    console.log(`Service Availability Middleware: ${hasServiceMiddleware ? (middlewareDisabled ? '🔧 Disabled' : '⚠️ Enabled') : '✅ Not Found'}`);
    console.log(`Resource Availability Middleware: ${hasResourceMiddleware ? (middlewareDisabled ? '🔧 Disabled' : '⚠️ Enabled') : '✅ Not Found'}`);
    
    if (hasServiceMiddleware && !middlewareDisabled) {
      console.log('\n⚠️  WARNING: Service availability middleware is enabled and may be causing 503 errors.');
      console.log('   Consider disabling it temporarily to resolve the issue.');
    }
    
  } catch (error) {
    console.log(`❌ Could not read ${serverIndexPath}: ${error.message}`);
  }

  // Summary
  console.log('\n📋 Summary:');
  const errorCount = results.filter(r => r.status === 503).length;
  
  if (errorCount === 0) {
    console.log('✅ No 503 errors detected. The server appears to be working correctly.');
  } else {
    console.log(`❌ Found ${errorCount} endpoints returning 503 errors.`);
    console.log('\n🔧 Recommended fixes:');
    console.log('1. Disable service availability middleware (already done)');
    console.log('2. Restart the development server: npm run dev');
    console.log('3. Clear browser cache and reload the page');
    console.log('4. Check server logs for detailed error messages');
  }
}

// Run diagnosis
diagnose().catch(error => {
  console.error('❌ Diagnosis failed:', error.message);
  process.exit(1);
});