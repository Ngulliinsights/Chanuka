// Test file for conflict detection service implementation
import { ConflictDetectionService } from './services/conflict-detection.js';
import { logger } from '../utils/logger';

async function testConflictDetection() {
  const service = new ConflictDetectionService();
  
  try {
    // Test financial conflict analysis
    logger.info('Testing financial conflict analysis...', { component: 'SimpleTool' });
    const financialConflicts = await service.analyzeFinancialConflicts(1);
    logger.info('Financial conflicts found:', { component: 'SimpleTool' }, financialConflicts.length);
    
    // Test professional conflict analysis
    logger.info('Testing professional conflict analysis...', { component: 'SimpleTool' });
    const professionalConflicts = await service.analyzeProfessionalConflicts(1);
    logger.info('Professional conflicts found:', { component: 'SimpleTool' }, professionalConflicts.length);
    
    // Test voting pattern analysis
    logger.info('Testing voting pattern analysis...', { component: 'SimpleTool' });
    const votingAnomalies = await service.analyzeVotingPatternInconsistencies(1);
    logger.info('Voting anomalies found:', { component: 'SimpleTool' }, votingAnomalies.length);
    
    // Test comprehensive analysis
    logger.info('Testing comprehensive analysis...', { component: 'SimpleTool' });
    const analysis = await service.performComprehensiveConflictAnalysis(1);
    logger.info('Analysis completed:', { component: 'SimpleTool' }, analysis.sponsorName, 'Risk Level:', analysis.riskLevel);
    
    logger.info('✅ All conflict detection tests passed!', { component: 'SimpleTool' });
  } catch (error) {
    logger.error('❌ Test failed:', { component: 'SimpleTool' }, error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConflictDetection();
}

export { testConflictDetection };






