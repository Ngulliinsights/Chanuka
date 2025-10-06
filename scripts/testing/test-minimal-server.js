import fetch from 'node-fetch';

async function testEndpoints() {
  const baseUrl = 'http://localhost:4200';
  
  console.log('🧪 Testing minimal server endpoints...\n');
  
  // Test health endpoint
  try {
    console.log('Testing /api/health...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health endpoint working');
    console.log('Status:', healthData.status);
    console.log('Database mode:', healthData.database.mode);
    console.log('Fallback active:', healthData.fallback.active);
    console.log('');
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }
  
  // Test bills endpoint
  try {
    console.log('Testing /api/bills...');
    const billsResponse = await fetch(`${baseUrl}/api/bills`);
    const billsData = await billsResponse.json();
    console.log('✅ Bills endpoint working');
    console.log('Success:', billsData.success);
    console.log('Source:', billsData.source);
    console.log('Bills count:', billsData.data.length);
    console.log('');
  } catch (error) {
    console.log('❌ Bills endpoint failed:', error.message);
  }
  
  // Test specific bill endpoint
  try {
    console.log('Testing /api/bills/1...');
    const billResponse = await fetch(`${baseUrl}/api/bills/1`);
    const billData = await billResponse.json();
    console.log('✅ Bill detail endpoint working');
    console.log('Success:', billData.success);
    console.log('Source:', billData.source);
    console.log('Bill title:', billData.data?.title);
    console.log('');
  } catch (error) {
    console.log('❌ Bill detail endpoint failed:', error.message);
  }
  
  // Test root API endpoint
  try {
    console.log('Testing /api...');
    const apiResponse = await fetch(`${baseUrl}/api`);
    const apiData = await apiResponse.json();
    console.log('✅ Root API endpoint working');
    console.log('Message:', apiData.message);
    console.log('Version:', apiData.version);
    console.log('');
  } catch (error) {
    console.log('❌ Root API endpoint failed:', error.message);
  }
}

testEndpoints().catch(console.error);