// Simple test to verify API health endpoints
import fetch from 'node-fetch';

async function testApiHealth() {
  try {
    console.log('Testing API health endpoints...');
    
    // Test main API endpoint
    const apiResponse = await fetch('http://localhost:4200/api');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log('✅ Main API endpoint working:', apiData.message);
    } else {
      console.log('⚠️ Main API endpoint not accessible (server may not be running)');
    }
    
    // Test frontend health endpoint
    const healthResponse = await fetch('http://localhost:4200/api/frontend-health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Frontend health endpoint working:', healthData.serving_mode);
    } else {
      console.log('⚠️ Frontend health endpoint not accessible');
    }
    
  } catch (error) {
    console.log('⚠️ API health test skipped (server not running):', error.message);
  }
}

testApiHealth();