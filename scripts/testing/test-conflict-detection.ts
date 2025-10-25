// Test file for conflict detection service implementation
import { ConflictDetectionService } from './services/conflict-detection.js';
import { logger } from '@shared/core';

async function testConflictDetection() {
  const service = new ConflictDetectionService();
  
  try {
    // Test financial conflict analysis
    logger.info('Testing financial conflict analysis...', { component: 'Chanuka' });
    const financialConflicts = await service.analyzeFinancialConflicts(1);
    logger.info('Financial conflicts found:', { component: 'Chanuka' }, financialConflicts.length);
    
    // Test professional conflict analysis
    logger.info('Testing professional conflict analysis...', { component: 'Chanuka' });
    const professionalConflicts = await service.analyzeProfessionalConflicts(1);
    logger.info('Professional conflicts found:', { component: 'Chanuka' }, professionalConflicts.length);
    
    // Test voting pattern analysis
    logger.info('Testing voting pattern analysis...', { component: 'Chanuka' });
    const votingAnomalies = await service.analyzeVotingPatternInconsistencies(1);
    logger.info('Voting anomalies found:', { component: 'Chanuka' }, votingAnomalies.length);
    
    // Test comprehensive analysis
    logger.info('Testing comprehensive analysis...', { component: 'Chanuka' });
    const analysis = await service.performComprehensiveConflictAnalysis(1);
    logger.info('Analysis completed:', { component: 'Chanuka' }, analysis.sponsorName, 'Risk Level:', analysis.riskLevel);
    
    logger.info('✅ All conflict detection tests passed!', { component: 'Chanuka' });
  } catch (error) {
    logger.error('❌ Test failed:', { component: 'Chanuka' }, error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConflictDetection();
}

export { testConflictDetection };











































