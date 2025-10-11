// Test API endpoints
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

const BASE_URL = 'http://localhost:4200';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint}:`, response.status, data.success ? 'SUCCESS' : 'FAILED');
    return data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  logger.info('🧪 Testing API endpoints...', { component: 'SimpleTool' });
  
  // Test health endpoint
  await testEndpoint('/api/health');
  
  // Test root API endpoint
  await testEndpoint('/api');
  
  // Test bills endpoint
  await testEndpoint('/api/bills');
  
  // Test specific bill endpoint
  await testEndpoint('/api/bills/1');
  
  // Test comments endpoint
  await testEndpoint('/api/bills/1/comments');
  
  // Test user registration
  await testEndpoint('/api/auth/register', 'POST', {
    email: 'test@example.com',
    password: 'testpassword',
    name: 'Test User'
  });
  
  // Test user login
  await testEndpoint('/api/auth/login', 'POST', {
    email: 'demo@example.com',
    password: 'testpassword'
  });
  
  logger.info('✅ API endpoint tests completed', { component: 'SimpleTool' });
}

// Wait a moment for server to start, then run tests
setTimeout(runTests, 2000);