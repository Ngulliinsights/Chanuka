/**
 * Run Type Assertion Analysis - Phase 6 Task 16.3
 * 
 * Identifies and validates type assertions in the codebase.
 */

import { TypeAssertionAnalyzer } from './core/type-assertion-analyzer';
import { RemediationConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

async function runTypeAssertionAnalysis() {
  console.log('='.repeat(80));
  console.log('Phase 6: Import Cleanup and Validation - Task 16.3');
  console.log('Type Assertion Strategic Analysis');
  console.log('='.repeat(80));
  console.log();

  // Load configuration
  const config = new RemediationConfig();
  
  // Initialize analyzer
  const analyzer = new TypeAssertionAnalyzer(config);

  console.log('Step 1: Analyzing type assertions...');
  console.log('-'.repeat(80));
  
  const analysisResult = await analyzer.analyzeTypeAssertions();
  
  console.log(`Total locations analyzed: ${analysisResult.locations.length}`);
  console.log(`Safe and necessary assertions: ${analysisResult.safeAssertions.length}`);
  console.log(`Unsafe assertions: ${analysisResult.unsafeAssertions.length}`);
  console.log(`Unnecessary assertions: ${analysisResult.unnecessaryAssertions.length}`);
  console.log();

  // Save analysis report
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const analysisReportPath = path.join(reportDir, 'type-assertion-analysis-report.json');
  fs.writeFileSync(
    analysisReportPath,
    JSON.stringify(analysisResult, null, 2)
  );
  console.log(`Analysis report saved to: ${analysisReportPath}`);
  console.log();

  // Generate recommendations
  console.log('Step 2: Generating recommendations...');
  console.log('-'.repeat(80));
  
  const recommendations = analyzer.generateRecommendations(analysisResult);
  
  console.log(`Total recommendations: ${recommendations.length}`);
  console.log();

  // Group recommendations by action
  const byAction = new Map<string, typeof recommendations>();
  for (const rec of recommendations) {
    if (!byAction.has(rec.action)) {
      byAction.set(rec.action, []);
    }
    byAction.get(rec.action)!.push(rec);
  }

  // Display recommendations
  for (const [action, recs] of byAction.entries()) {
    console.log(`\n${action.toUpperCase()} (${recs.length}):`);
    console.log('-'.repeat(80));
    
    for (const rec of recs.slice(0, 10)) { // Show first 10 of each type
      const relativePath = path.relative(process.cwd(), rec.file);
      console.log(`\n${relativePath}:${rec.line}`);
      console.log(`  Reason: ${rec.reason}`);
      if (rec.suggestedCode) {
        console.log(`  Suggested code:`);
        const lines = rec.suggestedCode.split('\n');
        for (const line of lines.slice(0, 5)) { // Show first 5 lines
          console.log(`    ${line}`);
        }
        if (lines.length > 5) {
          console.log(`    ... (${lines.length - 5} more lines)`);
        }
      }
    }
    
    if (recs.length > 10) {
      console.log(`\n  ... and ${recs.length - 10} more`);
    }
  }
  console.log();

  // Save recommendations
  const recommendationsPath = path.join(reportDir, 'type-assertion-recommendations.json');
  fs.writeFileSync(
    recommendationsPath,
    JSON.stringify(recommendations, null, 2)
  );
  console.log(`Recommendations saved to: ${recommendationsPath}`);
  console.log();

  // Display safe and necessary assertions
  if (analysisResult.safeAssertions.length > 0) {
    console.log('Safe and Necessary Assertions:');
    console.log('-'.repeat(80));
    console.log('These assertions should be kept with justification comments:');
    console.log();
    
    for (const assertion of analysisResult.safeAssertions.slice(0, 5)) {
      const relativePath = path.relative(process.cwd(), assertion.file);
      console.log(`${relativePath}:${assertion.line}`);
      console.log(`  Expression: ${assertion.expression}`);
      console.log(`  Type: ${assertion.currentType} -> ${assertion.targetType}`);
      console.log(`  Reason: ${assertion.reason}`);
      if (assertion.justification) {
        console.log(`  Justification:`);
        const lines = assertion.justification.split('\n');
        for (const line of lines) {
          console.log(`    ${line}`);
        }
      }
      console.log();
    }
    
    if (analysisResult.safeAssertions.length > 5) {
      console.log(`... and ${analysisResult.safeAssertions.length - 5} more`);
      console.log();
    }
  }

  // Display unsafe assertions
  if (analysisResult.unsafeAssertions.length > 0) {
    console.log('Unsafe Assertions:');
    console.log('-'.repeat(80));
    console.log('⚠️  These assertions require runtime validation or type guards:');
    console.log();
    
    for (const assertion of analysisResult.unsafeAssertions.slice(0, 5)) {
      const relativePath = path.relative(process.cwd(), assertion.file);
      console.log(`${relativePath}:${assertion.line}`);
      console.log(`  Expression: ${assertion.expression}`);
      console.log(`  Type: ${assertion.currentType} -> ${assertion.targetType}`);
      console.log(`  Reason: ${assertion.reason}`);
      console.log();
    }
    
    if (analysisResult.unsafeAssertions.length > 5) {
      console.log(`... and ${analysisResult.unsafeAssertions.length - 5} more`);
      console.log();
    }
  }

  // Display unnecessary assertions
  if (analysisResult.unnecessaryAssertions.length > 0) {
    console.log('Unnecessary Assertions:');
    console.log('-'.repeat(80));
    console.log('These assertions can be removed or replaced with better typing:');
    console.log();
    
    for (const assertion of analysisResult.unnecessaryAssertions.slice(0, 5)) {
      const relativePath = path.relative(process.cwd(), assertion.file);
      console.log(`${relativePath}:${assertion.line}`);
      console.log(`  Expression: ${assertion.expression}`);
      console.log(`  Type: ${assertion.currentType} -> ${assertion.targetType}`);
      console.log(`  Reason: ${assertion.reason}`);
      console.log();
    }
    
    if (analysisResult.unnecessaryAssertions.length > 5) {
      console.log(`... and ${analysisResult.unnecessaryAssertions.length - 5} more`);
      console.log();
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('Type Assertion Analysis Complete');
  console.log('='.repeat(80));
  console.log(`Total assertions analyzed: ${analysisResult.locations.length}`);
  console.log(`✅ Safe and necessary: ${analysisResult.safeAssertions.length}`);
  console.log(`⚠️  Unsafe: ${analysisResult.unsafeAssertions.length}`);
  console.log(`ℹ️  Unnecessary: ${analysisResult.unnecessaryAssertions.length}`);
  console.log();
  console.log('Next steps:');
  console.log('1. Review unsafe assertions and add runtime validation');
  console.log('2. Remove unnecessary assertions');
  console.log('3. Add justification comments to safe assertions');
  console.log();
}

// Run the analysis
runTypeAssertionAnalysis().catch(error => {
  console.error('Error running type assertion analysis:', error);
  process.exit(1);
});
