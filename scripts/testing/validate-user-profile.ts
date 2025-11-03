// Simple validation script for User Profile Service
import { user_profileservice } from './services/user-profile.js';
import { databaseService } from './services/database-service.js';
import { logger } from '@shared/core';

async function validateUserProfileService() {
  logger.info('🔍 Validating User Profile Service Implementation...', { component: 'Chanuka' });
  
  try {
    // Test database connection
    const healthStatus = await databaseService.getHealthStatus();
    logger.info('Database Health:', { component: 'Chanuka' }, healthStatus.isHealthy ? '✅ Connected' : '❌ Disconnected');
    
    if (!healthStatus.isHealthy) {
      logger.info('⚠️  Database not available, skipping validation', { component: 'Chanuka' });
      return;
    }

    // Test service methods exist
    const methods = [
      'getUserProfile',
      'updateUserProfile', 
      'updateUserInterests',
      'updateUserBasicInfo',
      'getUserPublicProfile',
      'searchUsers',
      'getUserPreferences',
      'updateUserPreferences',
      'updateUserVerificationStatus',
      'getUserVerificationStatus',
      'getUserEngagementHistory',
      'updateUserEngagement',
      'getCompleteUserProfile'
    ];

    logger.info('\n📋 Checking User Profile Service Methods:', { component: 'Chanuka' });
    methods.forEach(method => {
      const exists = typeof user_profileservice[method] === 'function';
      console.log(`  ${exists ? '✅' : '❌'} ${method}`);
    });

    // Test basic functionality with a mock user ID
    logger.info('\n🧪 Testing Basic Functionality:', { component: 'Chanuka' });
    
    try {
      // This should handle non-existent user gracefully
      await user_profileservice.getUserProfile('test-user-id');
      logger.info('  ❌ getUserProfile should throw error for non-existent user', { component: 'Chanuka' });
    } catch (error) {
      logger.info('  ✅ getUserProfile properly handles non-existent user', { component: 'Chanuka' });
    }

    logger.info('\n✅ User Profile Service validation completed', { component: 'Chanuka' });
    
  } catch (error) {
    logger.error('❌ Validation failed:', { component: 'Chanuka' }, error.message);
  }
}

validateUserProfileService().catch(console.error);












































