import fetch from 'node-fetch';
import { logger } from '@shared/core/src/observability/logging/index.js';

const BASE_URL = 'http://localhost:4200/api/auth';

async function testAuthSystem() {
  logger.info('🧪 Testing Authentication System...\n', { component: 'Chanuka' });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User'
  };

  try {
    // Test 1: Registration
    logger.info('1. Testing Registration...', { component: 'Chanuka' });
    const registerResponse = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      logger.info('✅ Registration successful', { component: 'Chanuka' });
      console.log(`   User ID: ${registerData.data?.user?.id}`);
      console.log(`   Token: ${registerData.data?.token ? 'Generated' : 'Missing'}`);
      console.log(`   Requires Verification: ${registerData.data?.requiresVerification}`);

      const token = registerData.data?.token;
      const refreshToken = registerData.data?.refreshToken;

      // Test 2: Token Verification
      logger.info('\n2. Testing Token Verification...', { component: 'Chanuka' });
      const verifyResponse = await fetch(`${BASE_URL}/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (verifyResponse.ok) {
        logger.info('✅ Token verification successful', { component: 'Chanuka' });
      } else {
        logger.info('❌ Token verification failed', { component: 'Chanuka' });
      }

      // Test 3: Login
      logger.info('\n3. Testing Login...', { component: 'Chanuka' });
      const loginResponse = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      if (loginResponse.ok) {
        logger.info('✅ Login successful', { component: 'Chanuka' });
      } else {
        const loginError = await loginResponse.text();
        logger.info('❌ Login failed:', { component: 'Chanuka' }, loginError);
      }

      // Test 4: Password Reset Request
      logger.info('\n4. Testing Password Reset Request...', { component: 'Chanuka' });
      const resetResponse = await fetch(`${BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });

      if (resetResponse.ok) {
        logger.info('✅ Password reset request successful', { component: 'Chanuka' });
      } else {
        logger.info('❌ Password reset request failed', { component: 'Chanuka' });
      }

      // Test 5: Token Refresh
      if (refreshToken) {
        logger.info('\n5. Testing Token Refresh...', { component: 'Chanuka' });
        const refreshResponse = await fetch(`${BASE_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          logger.info('✅ Token refresh successful', { component: 'Chanuka' });
        } else {
          logger.info('❌ Token refresh failed', { component: 'Chanuka' });
        }
      }

      // Test 6: Logout
      logger.info('\n6. Testing Logout...', { component: 'Chanuka' });
      const logoutResponse = await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (logoutResponse.ok) {
        logger.info('✅ Logout successful', { component: 'Chanuka' });
      } else {
        logger.info('❌ Logout failed', { component: 'Chanuka' });
      }

    } else {
      const error = await registerResponse.text();
      logger.info('❌ Registration failed:', { component: 'Chanuka' }, error);
    }

  } catch (error) {
    logger.error('❌ Test failed with error:', { component: 'Chanuka' }, error.message);
    logger.info('\n💡 Make sure the server is running on http://localhost:4200', { component: 'Chanuka' });
  }

  logger.info('\n🏁 Authentication system test completed', { component: 'Chanuka' });
}

testAuthSystem();





































