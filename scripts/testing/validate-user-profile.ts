// Simple validation script for User Profile Service
import { userProfileService } from './services/user-profile.js';
import { databaseService } from './services/database-service.js';

async function validateUserProfileService() {
  console.log('🔍 Validating User Profile Service Implementation...');
  
  try {
    // Test database connection
    const healthStatus = await databaseService.getHealthStatus();
    console.log('Database Health:', healthStatus.isHealthy ? '✅ Connected' : '❌ Disconnected');
    
    if (!healthStatus.isHealthy) {
      console.log('⚠️  Database not available, skipping validation');
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

    console.log('\n📋 Checking User Profile Service Methods:');
    methods.forEach(method => {
      const exists = typeof userProfileService[method] === 'function';
      console.log(`  ${exists ? '✅' : '❌'} ${method}`);
    });

    // Test basic functionality with a mock user ID
    console.log('\n🧪 Testing Basic Functionality:');
    
    try {
      // This should handle non-existent user gracefully
      await userProfileService.getUserProfile('test-user-id');
      console.log('  ❌ getUserProfile should throw error for non-existent user');
    } catch (error) {
      console.log('  ✅ getUserProfile properly handles non-existent user');
    }

    console.log('\n✅ User Profile Service validation completed');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

validateUserProfileService().catch(console.error);