import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

async function testEndpoints() {
  const baseUrl = 'http://localhost:4200';
  
  logger.info('🧪 Testing minimal server endpoints...\n', { component: 'SimpleTool' });
  
  // Test health endpoint
  try {
    logger.info('Testing /api/health...', { component: 'SimpleTool' });
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    logger.info('✅ Health endpoint working', { component: 'SimpleTool' });
    logger.info('Status:', { component: 'SimpleTool' }, healthData.status);
    logger.info('Database mode:', { component: 'SimpleTool' }, healthData.database.mode);
    logger.info('Fallback active:', { component: 'SimpleTool' }, healthData.fallback.active);
    logger.info('', { component: 'SimpleTool' });
  } catch (error) {
    logger.info('❌ Health endpoint failed:', { component: 'SimpleTool' }, error.message);
  }
  
  // Test bills endpoint
  try {
    logger.info('Testing /api/bills...', { component: 'SimpleTool' });
    const billsResponse = await fetch(`${baseUrl}/api/bills`);
    const billsData = await billsResponse.json();
    logger.info('✅ Bills endpoint working', { component: 'SimpleTool' });
    logger.info('Success:', { component: 'SimpleTool' }, billsData.success);
    logger.info('Source:', { component: 'SimpleTool' }, billsData.source);
    logger.info('Bills count:', { component: 'SimpleTool' }, billsData.data.length);
    logger.info('', { component: 'SimpleTool' });
  } catch (error) {
    logger.info('❌ Bills endpoint failed:', { component: 'SimpleTool' }, error.message);
  }
  
  // Test specific bill endpoint
  try {
    logger.info('Testing /api/bills/1...', { component: 'SimpleTool' });
    const billResponse = await fetch(`${baseUrl}/api/bills/1`);
    const billData = await billResponse.json();
    logger.info('✅ Bill detail endpoint working', { component: 'SimpleTool' });
    logger.info('Success:', { component: 'SimpleTool' }, billData.success);
    logger.info('Source:', { component: 'SimpleTool' }, billData.source);
    logger.info('Bill title:', { component: 'SimpleTool' }, billData.data?.title);
    logger.info('', { component: 'SimpleTool' });
  } catch (error) {
    logger.info('❌ Bill detail endpoint failed:', { component: 'SimpleTool' }, error.message);
  }
  
  // Test root API endpoint
  try {
    logger.info('Testing /api...', { component: 'SimpleTool' });
    const apiResponse = await fetch(`${baseUrl}/api`);
    const apiData = await apiResponse.json();
    logger.info('✅ Root API endpoint working', { component: 'SimpleTool' });
    logger.info('Message:', { component: 'SimpleTool' }, apiData.message);
    logger.info('Version:', { component: 'SimpleTool' }, apiData.version);
    logger.info('', { component: 'SimpleTool' });
  } catch (error) {
    logger.info('❌ Root API endpoint failed:', { component: 'SimpleTool' }, error.message);
  }
}

testEndpoints().catch(console.error);