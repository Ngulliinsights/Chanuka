#!/usr/bin/env tsx

import { BugDetector } from './scripts/testing/bug-detector.ts';

async function main() {
  const detector = new BugDetector();
  
  console.log('🔍 Starting comprehensive bug detection...');
  
  try {
    const result = await detector.detectBugs();
    
    console.log('\n📊 Bug Detection Results:');
    console.log(`Total Bugs: ${result.totalBugs}`);
    console.log(`Critical: ${result.criticalBugs}`);
    console.log(`High Priority: ${result.highPriorityBugs}`);
    console.log(`Production Bugs: ${result.productionBugs.length}`);
    console.log(`Test Bugs: ${result.testBugs.length}`);
    
    if (result.totalBugs > 0) {
      console.log('\n📝 Generating detailed report...');
      const markdownReport = detector.generateMarkdownReport(result);
      
      // Write report to file
      const fs = await import('fs');
      fs.writeFileSync('bug-report.md', markdownReport);
      console.log('✅ Bug report saved to bug-report.md');
      
      // Show top issues
      console.log('\n🚨 Top Issues:');
      result.summary.topIssues.slice(0, 5).forEach((bug, index) => {
        console.log(`${index + 1}. [${bug.severity.toUpperCase()}] ${bug.description}`);
        console.log(`   File: ${bug.location.file}${bug.location.line ? `:${bug.location.line}` : ''}`);
        console.log(`   Fix: ${bug.fixSuggestion || 'No suggestion available'}`);
        console.log('');
      });
    } else {
      console.log('🎉 No bugs detected!');
    }
    
  } catch (error) {
    console.error('❌ Error running bug detection:', error);
    process.exit(1);
  }
}

main();