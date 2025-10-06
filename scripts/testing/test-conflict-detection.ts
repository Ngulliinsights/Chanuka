// Test file for conflict detection service implementation
import { ConflictDetectionService } from './services/conflict-detection.js';

async function testConflictDetection() {
  const service = new ConflictDetectionService();
  
  try {
    // Test financial conflict analysis
    console.log('Testing financial conflict analysis...');
    const financialConflicts = await service.analyzeFinancialConflicts(1);
    console.log('Financial conflicts found:', financialConflicts.length);
    
    // Test professional conflict analysis
    console.log('Testing professional conflict analysis...');
    const professionalConflicts = await service.analyzeProfessionalConflicts(1);
    console.log('Professional conflicts found:', professionalConflicts.length);
    
    // Test voting pattern analysis
    console.log('Testing voting pattern analysis...');
    const votingAnomalies = await service.analyzeVotingPatternInconsistencies(1);
    console.log('Voting anomalies found:', votingAnomalies.length);
    
    // Test comprehensive analysis
    console.log('Testing comprehensive analysis...');
    const analysis = await service.performComprehensiveConflictAnalysis(1);
    console.log('Analysis completed:', analysis.sponsorName, 'Risk Level:', analysis.riskLevel);
    
    console.log('✅ All conflict detection tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConflictDetection();
}

export { testConflictDetection };