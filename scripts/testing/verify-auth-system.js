import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4200/api/auth';

async function testAuthSystem() {
  console.log('🧪 Testing Authentication System...\n');

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    // Test 1: Registration
    console.log('1. Testing Registration...');
    const registerResponse = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log(`   User ID: ${registerData.data?.user?.id}`);
      console.log(`   Token: ${registerData.data?.token ? 'Generated' : 'Missing'}`);
      console.log(`   Requires Verification: ${registerData.data?.requiresVerification}`);

      const token = registerData.data?.token;
      const refreshToken = registerData.data?.refreshToken;

      // Test 2: Token Verification
      console.log('\n2. Testing Token Verification...');
      const verifyResponse = await fetch(`${BASE_URL}/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (verifyResponse.ok) {
        console.log('✅ Token verification successful');
      } else {
        console.log('❌ Token verification failed');
      }

      // Test 3: Login
      console.log('\n3. Testing Login...');
      const loginResponse = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      if (loginResponse.ok) {
        console.log('✅ Login successful');
      } else {
        const loginError = await loginResponse.text();
        console.log('❌ Login failed:', loginError);
      }

      // Test 4: Password Reset Request
      console.log('\n4. Testing Password Reset Request...');
      const resetResponse = await fetch(`${BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });

      if (resetResponse.ok) {
        console.log('✅ Password reset request successful');
      } else {
        console.log('❌ Password reset request failed');
      }

      // Test 5: Token Refresh
      if (refreshToken) {
        console.log('\n5. Testing Token Refresh...');
        const refreshResponse = await fetch(`${BASE_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          console.log('✅ Token refresh successful');
        } else {
          console.log('❌ Token refresh failed');
        }
      }

      // Test 6: Logout
      console.log('\n6. Testing Logout...');
      const logoutResponse = await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (logoutResponse.ok) {
        console.log('✅ Logout successful');
      } else {
        console.log('❌ Logout failed');
      }

    } else {
      const error = await registerResponse.text();
      console.log('❌ Registration failed:', error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n💡 Make sure the server is running on http://localhost:4200');
  }

  console.log('\n🏁 Authentication system test completed');
}

testAuthSystem();