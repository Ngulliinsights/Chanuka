#!/usr/bin/env tsx

/**
 * ML Service Migration Demo Script
 * 
 * Demonstrates the ML service migration with feature flags and A/B testing.
 */

import { MLServiceAdapter } from '../ml-adapter.service';
import { initializeMLFeatureFlag, enableMLServiceRollout, getMLServiceStatus } from '../ml-feature-flag.config';
import { realMLAnalysisService } from '../real-ml.service';

// Mock logger for demo
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || '')
};

// Mock the logger import
(global as any).mockLogger = logger;

const testBillContent = `
The Digital Privacy Protection Act establishes comprehensive data protection standards
for technology companies operating in the digital marketplace. This legislation requires
explicit user consent for data collection, mandates data portability rights, and establishes
penalties for privacy violations. The bill is supported by consumer advocacy groups and
privacy organizations, while facing opposition from some technology industry associations.
Small businesses will benefit from reduced compliance costs, while large corporations
may face increased regulatory oversight. The estimated compliance cost is $1.2 billion
industry-wide, with consumer benefits estimated at $3.5 billion over five years.
`;

async function runMLServiceDemo() {
  console.log('🚀 ML Service Migration Demo\n');

  try {
    // Initialize services
    console.log('1. Initializing services...');
    await realMLAnalysisService.initialize();
    initializeMLFeatureFlag();
    
    // Show initial status
    console.log('2. Initial ML service status:');
    const initialStatus = getMLServiceStatus();
    console.log(`   - Enabled: ${initialStatus.enabled}`);
    console.log(`   - Rollout: ${initialStatus.rolloutPercentage}%`);
    console.log(`   - Fallback: ${initialStatus.fallbackEnabled}\n`);

    // Test with different users to show A/B testing
    console.log('3. Testing A/B routing with different users:');
    const testUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];
    
    for (const user_id of testUsers) {
      const startTime = Date.now();
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(testBillContent, user_id);
      const responseTime = Date.now() - startTime;
      
      console.log(`   User ${user_id}: ${result.metadata?.serviceUsed} service (${responseTime}ms, confidence: ${result.confidence.toFixed(3)})`);
    }

    // Show service health
    console.log('\n4. Service health check:');
    const health = await MLServiceAdapter.getServiceHealth();
    console.log(`   - Mock service: ${health.mockService}`);
    console.log(`   - Real ML service: ${health.realMLService}`);
    console.log(`   - Feature flag active: ${health.featureFlagStatus}`);

    // Demonstrate rollout increase
    console.log('\n5. Increasing rollout to 50%...');
    await enableMLServiceRollout(50);
    
    const updatedStatus = getMLServiceStatus();
    console.log(`   New rollout percentage: ${updatedStatus.rolloutPercentage}%`);

    // Test again with higher rollout
    console.log('\n6. Testing with increased rollout:');
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await MLServiceAdapter.analyzeStakeholderInfluence(testBillContent, `test-user-${i}`);
      results.push(result.metadata?.serviceUsed);
    }
    
    const realMLCount = results.filter(service => service === 'real-ml').length;
    const mockCount = results.filter(service => service === 'mock').length;
    
    console.log(`   Results: ${realMLCount} real ML, ${mockCount} mock (${results.length} total)`);
    console.log(`   Actual rollout: ${(realMLCount / results.length * 100).toFixed(1)}%`);

    // Performance comparison
    console.log('\n7. Performance comparison:');
    const mockTimes = [];
    const realTimes = [];
    
    // Test mock service directly
    const { MLAnalysisService } = await import('./ml-service-demo');
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await MLAnalysisService.analyzeStakeholderInfluence(testBillContent);
      mockTimes.push(Date.now() - startTime);
    }
    
    // Test real ML service directly
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);
      realTimes.push(Date.now() - startTime);
    }
    
    const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
    const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;
    
    console.log(`   Mock service average: ${mockAvg.toFixed(2)}ms`);
    console.log(`   Real ML service average: ${realAvg.toFixed(2)}ms`);
    console.log(`   Performance ratio: ${mockAvg > 0 ? (realAvg / mockAvg).toFixed(2) : 'N/A'}x`);

    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  } finally {
    // Cleanup
    await realMLAnalysisService.cleanup();
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runMLServiceDemo().catch(console.error);
}

export { runMLServiceDemo };