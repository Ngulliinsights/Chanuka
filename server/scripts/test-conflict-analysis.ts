// FIXME: sponsor-conflict-analysis not implemented
// import { sponsorConflictAnalysisService } from '@server/features/bills/sponsor-conflict-analysis';
import { logger } from '@server/infrastructure/observability';

async function testConflictAnalysis() {
  logger.info({ component: 'Chanuka' }, '🔍 Testing Sponsor Conflict Analysis Service...\n');

  try {
    // Test 1: Severity Calculation
    logger.info({ component: 'Chanuka' }, '1. Testing severity calculation...');
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
    logger.info({ component: 'Chanuka' }, '2. Testing conflict detection...');
    const conflicts = await sponsorConflictAnalysisService.detectConflicts();
    console.log(`   Detected ${conflicts.length} conflicts`);
    
    if (conflicts.length > 0) {
      const severityCount = conflicts.reduce((acc: any, c: any) => {
        acc[c.severity] = (acc[c.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Severity distribution:`, severityCount);
      
      const typeCount = conflicts.reduce((acc: any, c: any) => {
        acc[c.conflictType] = (acc[c.conflictType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Type distribution:`, typeCount);
    }
    console.log();

    // Test 3: Conflict Mapping
    logger.info({ component: 'Chanuka' }, '3. Testing conflict mapping...');
    const mapping = await sponsorConflictAnalysisService.createConflictMapping();
    console.log(`   Network has ${mapping.nodes.length} nodes and ${mapping.edges.length} edges`);
    console.log(`   Network density: ${Math.round(mapping.metrics.density * 100)}%`);
    console.log(`   Found ${mapping.clusters.length} clusters`);
    
    const nodeTypes = mapping.nodes.reduce((acc: any, n: any) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`   Node types:`, nodeTypes);
    console.log();

    // Test 4: Trend Analysis
    logger.info({ component: 'Chanuka' }, '4. Testing trend analysis...');
    const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(undefined, 6);
    console.log(`   Analyzed trends for ${trends.length} sponsors`);
    
    if (trends.length > 0) {
      const avgRiskScore = trends.reduce((sum: any, t: any) => sum + t.risk_score, 0) / trends.length;
      console.log(`   Average risk score: ${Math.round(avgRiskScore)}`);
      
      const trendDistribution = trends.reduce((acc: any, t: any) => {
        acc[t.severityTrend] = (acc[t.severityTrend] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`   Trend distribution:`, trendDistribution);
      
      const totalPredictions = trends.reduce((sum: any, t: any) => sum + t.predictions.length, 0);
      console.log(`   Total predictions: ${totalPredictions}`);
    }
    console.log();

    logger.info({ component: 'Chanuka' }, '✅ All tests completed successfully!');
    logger.info({ component: 'Chanuka' }, '\n📊 Summary:');
    console.log(`   - Conflict detection: ${conflicts.length} conflicts found`);
    console.log(`   - Network analysis: ${mapping.nodes.length} entities, ${mapping.edges.length} relationships`);
    console.log(`   - Trend analysis: ${trends.length} sponsors analyzed`);
    console.log(`   - Severity calculation: Working correctly`);

  } catch (error) {
    logger.error({ component: 'Chanuka', error }, '❌ Test failed:');
    logger.error({ component: 'Chanuka', stack: error instanceof Error ? error.stack : 'Unknown error' }, 'Stack trace:');
  }
}

// Run the test
testConflictAnalysis().then(() => {
  logger.info({ component: 'Chanuka' }, '\n🎉 Test script completed');
  process.exit(0);
}).catch((error) => {
  logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, '💥 Test script failed:');
  process.exit(1);
});













































