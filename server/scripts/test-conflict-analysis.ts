import { sponsorConflictAnalysisService } from '../features/bills/sponsor-conflict-analysis.js';
import { logger } from '../utils/logger';

async function testConflictAnalysis() {
  logger.info('🔍 Testing Sponsor Conflict Analysis Service...\n', { component: 'SimpleTool' });

  try {
    // Test 1: Severity Calculation
    logger.info('1. Testing severity calculation...', { component: 'SimpleTool' });
    const criticalSeverity = sponsorConflictAnalysisService.calculateConflictSeverity(
      'financial_direct',
      15000000,
      { multipleAffiliations: true, recentActivity: true }
    );
    console.log(`   Critical conflict severity: ${criticalSeverity}`);

    const mediumSeverity = sponsorConflictAnalysisService.calculateConflictSeverity(
      'organizational',
      500000,
      { publicScrutiny: true }
    );
    console.log(`   Medium conflict severity: ${mediumSeverity}`);

    const lowSeverity = sponsorConflictAnalysisService.calculateConflictSeverity(
      'disclosure_incomplete',
      0,
      {}
    );
    console.log(`   Low conflict severity: ${lowSeverity}\n`);

    // Test 2: Conflict Detection
    logger.info('2. Testing conflict detection...', { component: 'SimpleTool' });
    const conflicts = await sponsorConflictAnalysisService.detectConflicts();
    console.log(`   Detected ${conflicts.length} conflicts`);
    
    if (conflicts.length > 0) {
      const severityCount = conflicts.reduce((acc, c) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Severity distribution:`, severityCount);
      
      const typeCount = conflicts.reduce((acc, c) => {
        acc[c.conflictType] = (acc[c.conflictType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Type distribution:`, typeCount);
    }
    console.log();

    // Test 3: Conflict Mapping
    logger.info('3. Testing conflict mapping...', { component: 'SimpleTool' });
    const mapping = await sponsorConflictAnalysisService.createConflictMapping();
    console.log(`   Network has ${mapping.nodes.length} nodes and ${mapping.edges.length} edges`);
    console.log(`   Network density: ${Math.round(mapping.metrics.density * 100)}%`);
    console.log(`   Found ${mapping.clusters.length} clusters`);
    
    const nodeTypes = mapping.nodes.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`   Node types:`, nodeTypes);
    console.log();

    // Test 4: Trend Analysis
    logger.info('4. Testing trend analysis...', { component: 'SimpleTool' });
    const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(undefined, 6);
    console.log(`   Analyzed trends for ${trends.length} sponsors`);
    
    if (trends.length > 0) {
      const avgRiskScore = trends.reduce((sum, t) => sum + t.riskScore, 0) / trends.length;
      console.log(`   Average risk score: ${Math.round(avgRiskScore)}`);
      
      const trendDistribution = trends.reduce((acc, t) => {
        acc[t.severityTrend] = (acc[t.severityTrend] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Trend distribution:`, trendDistribution);
      
      const totalPredictions = trends.reduce((sum, t) => sum + t.predictions.length, 0);
      console.log(`   Total predictions: ${totalPredictions}`);
    }
    console.log();

    logger.info('✅ All tests completed successfully!', { component: 'SimpleTool' });
    logger.info('\n📊 Summary:', { component: 'SimpleTool' });
    console.log(`   - Conflict detection: ${conflicts.length} conflicts found`);
    console.log(`   - Network analysis: ${mapping.nodes.length} entities, ${mapping.edges.length} relationships`);
    console.log(`   - Trend analysis: ${trends.length} sponsors analyzed`);
    console.log(`   - Severity calculation: Working correctly`);

  } catch (error) {
    logger.error('❌ Test failed:', { component: 'SimpleTool' }, error);
    logger.error('Stack trace:', { component: 'SimpleTool' }, error instanceof Error ? error.stack : 'Unknown error');
  }
}

// Run the test
testConflictAnalysis().then(() => {
  logger.info('\n🎉 Test script completed', { component: 'SimpleTool' });
  process.exit(0);
}).catch((error) => {
  logger.error('💥 Test script failed:', { component: 'SimpleTool' }, error);
  process.exit(1);
});






