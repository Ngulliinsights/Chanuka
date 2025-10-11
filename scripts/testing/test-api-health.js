// Simple test to verify API health endpoints
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

async function testApiHealth() {
  try {
    logger.info('Testing API health endpoints...', { component: 'SimpleTool' });
    
    // Test main API endpoint
    const apiResponse = await fetch('http://localhost:4200/api');
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      logger.info('✅ Main API endpoint working:', { component: 'SimpleTool' }, apiData.message);
    } else {
      logger.info('⚠️ Main API endpoint not accessible (server may not be running)', { component: 'SimpleTool' });
    }
    
    // Test frontend health endpoint
    const healthResponse = await fetch('http://localhost:4200/api/frontend-health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      logger.info('✅ Frontend health endpoint working:', { component: 'SimpleTool' }, healthData.serving_mode);
    } else {
      logger.info('⚠️ Frontend health endpoint not accessible', { component: 'SimpleTool' });
    }
    
  } catch (error) {
    logger.info('⚠️ API health test skipped (server not running):', { component: 'SimpleTool' }, error.message);
  }
}

testApiHealth();