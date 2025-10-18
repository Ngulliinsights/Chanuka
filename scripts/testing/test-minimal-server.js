import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

async function testEndpoints() {
  const baseUrl = 'http://localhost:4200';
  
  logger.info('🧪 Testing minimal server endpoints...\n', { component: 'Chanuka' });
  
  // Test health endpoint
  try {
    logger.info('Testing /api/health...', { component: 'Chanuka' });
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    logger.info('✅ Health endpoint working', { component: 'Chanuka' });
    logger.info('Status:', { component: 'Chanuka' }, healthData.status);
    logger.info('Database mode:', { component: 'Chanuka' }, healthData.database.mode);
    logger.info('Fallback active:', { component: 'Chanuka' }, healthData.fallback.active);
    logger.info('', { component: 'Chanuka' });
  } catch (error) {
    logger.info('❌ Health endpoint failed:', { component: 'Chanuka' }, error.message);
  }
  
  // Test bills endpoint
  try {
    logger.info('Testing /api/bills...', { component: 'Chanuka' });
    const billsResponse = await fetch(`${baseUrl}/api/bills`);
    const billsData = await billsResponse.json();
    logger.info('✅ Bills endpoint working', { component: 'Chanuka' });
    logger.info('Success:', { component: 'Chanuka' }, billsData.success);
    logger.info('Source:', { component: 'Chanuka' }, billsData.source);
    logger.info('Bills count:', { component: 'Chanuka' }, billsData.data.length);
    logger.info('', { component: 'Chanuka' });
  } catch (error) {
    logger.info('❌ Bills endpoint failed:', { component: 'Chanuka' }, error.message);
  }
  
  // Test specific bill endpoint
  try {
    logger.info('Testing /api/bills/1...', { component: 'Chanuka' });
    const billResponse = await fetch(`${baseUrl}/api/bills/1`);
    const billData = await billResponse.json();
    logger.info('✅ Bill detail endpoint working', { component: 'Chanuka' });
    logger.info('Success:', { component: 'Chanuka' }, billData.success);
    logger.info('Source:', { component: 'Chanuka' }, billData.source);
    logger.info('Bill title:', { component: 'Chanuka' }, billData.data?.title);
    logger.info('', { component: 'Chanuka' });
  } catch (error) {
    logger.info('❌ Bill detail endpoint failed:', { component: 'Chanuka' }, error.message);
  }
  
  // Test root API endpoint
  try {
    logger.info('Testing /api...', { component: 'Chanuka' });
    const apiResponse = await fetch(`${baseUrl}/api`);
    const apiData = await apiResponse.json();
    logger.info('✅ Root API endpoint working', { component: 'Chanuka' });
    logger.info('Message:', { component: 'Chanuka' }, apiData.message);
    logger.info('Version:', { component: 'Chanuka' }, apiData.version);
    logger.info('', { component: 'Chanuka' });
  } catch (error) {
    logger.info('❌ Root API endpoint failed:', { component: 'Chanuka' }, error.message);
  }
}

testEndpoints().catch(console.error);
