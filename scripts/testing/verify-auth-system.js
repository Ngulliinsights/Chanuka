import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

const BASE_URL = 'http://localhost:4200/api/auth';

async function testAuthSystem() {
  logger.info('🧪 Testing Authentication System...\n', { component: 'SimpleTool' });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    // Test 1: Registration
    logger.info('1. Testing Registration...', { component: 'SimpleTool' });
    const registerResponse = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      logger.info('✅ Registration successful', { component: 'SimpleTool' });
      console.log(`   User ID: ${registerData.data?.user?.id}`);
      console.log(`   Token: ${registerData.data?.token ? 'Generated' : 'Missing'}`);
      console.log(`   Requires Verification: ${registerData.data?.requiresVerification}`);

      const token = registerData.data?.token;
      const refreshToken = registerData.data?.refreshToken;

      // Test 2: Token Verification
      logger.info('\n2. Testing Token Verification...', { component: 'SimpleTool' });
      const verifyResponse = await fetch(`${BASE_URL}/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (verifyResponse.ok) {
        logger.info('✅ Token verification successful', { component: 'SimpleTool' });
      } else {
        logger.info('❌ Token verification failed', { component: 'SimpleTool' });
      }

      // Test 3: Login
      logger.info('\n3. Testing Login...', { component: 'SimpleTool' });
      const loginResponse = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      if (loginResponse.ok) {
        logger.info('✅ Login successful', { component: 'SimpleTool' });
      } else {
        const loginError = await loginResponse.text();
        logger.info('❌ Login failed:', { component: 'SimpleTool' }, loginError);
      }

      // Test 4: Password Reset Request
      logger.info('\n4. Testing Password Reset Request...', { component: 'SimpleTool' });
      const resetResponse = await fetch(`${BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });

      if (resetResponse.ok) {
        logger.info('✅ Password reset request successful', { component: 'SimpleTool' });
      } else {
        logger.info('❌ Password reset request failed', { component: 'SimpleTool' });
      }

      // Test 5: Token Refresh
      if (refreshToken) {
        logger.info('\n5. Testing Token Refresh...', { component: 'SimpleTool' });
        const refreshResponse = await fetch(`${BASE_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          logger.info('✅ Token refresh successful', { component: 'SimpleTool' });
        } else {
          logger.info('❌ Token refresh failed', { component: 'SimpleTool' });
        }
      }

      // Test 6: Logout
      logger.info('\n6. Testing Logout...', { component: 'SimpleTool' });
      const logoutResponse = await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (logoutResponse.ok) {
        logger.info('✅ Logout successful', { component: 'SimpleTool' });
      } else {
        logger.info('❌ Logout failed', { component: 'SimpleTool' });
      }

    } else {
      const error = await registerResponse.text();
      logger.info('❌ Registration failed:', { component: 'SimpleTool' }, error);
    }

  } catch (error) {
    logger.error('❌ Test failed with error:', { component: 'SimpleTool' }, error.message);
    logger.info('\n💡 Make sure the server is running on http://localhost:4200', { component: 'SimpleTool' });
  }

  logger.info('\n🏁 Authentication system test completed', { component: 'SimpleTool' });
}

testAuthSystem();