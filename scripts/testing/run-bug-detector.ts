#!/usr/bin/env tsx

import { BugDetector } from './scripts/testing/bug-detector.ts';
import { logger } from '../../shared/core/src/observability/logging';

async function main() {
  const detector = new BugDetector();
  
  logger.info('🔍 Starting comprehensive bug detection...', { component: 'Chanuka' });
  
  try {
    const result = await detector.detectBugs();
    
    logger.info('\n📊 Bug Detection Results:', { component: 'Chanuka' });
    console.log(`Total Bugs: ${result.totalBugs}`);
    console.log(`Critical: ${result.criticalBugs}`);
    console.log(`High Priority: ${result.highPriorityBugs}`);
    console.log(`Production Bugs: ${result.productionBugs.length}`);
    console.log(`Test Bugs: ${result.testBugs.length}`);
    
    if (result.totalBugs > 0) {
      logger.info('\n📝 Generating detailed report...', { component: 'Chanuka' });
      const markdownReport = detector.generateMarkdownReport(result);
      
      // Write report to file
      const fs = await import('fs');
      fs.writeFileSync('bug-report.md', markdownReport);
      logger.info('✅ Bug report saved to bug-report.md', { component: 'Chanuka' });
      
      // Show top issues
      logger.info('\n🚨 Top Issues:', { component: 'Chanuka' });
      result.summary.topIssues.slice(0, 5).forEach((bug, index) => {
        console.log(`${index + 1}. [${bug.severity.toUpperCase()}] ${bug.description}`);
        console.log(`   File: ${bug.location.file}${bug.location.line ? `:${bug.location.line}` : ''}`);
        console.log(`   Fix: ${bug.fixSuggestion || 'No suggestion available'}`);
        logger.info('', { component: 'Chanuka' });
      });
    } else {
      logger.info('🎉 No bugs detected!', { component: 'Chanuka' });
    }
    
  } catch (error) {
    logger.error('❌ Error running bug detection:', { component: 'Chanuka' }, error);
    process.exit(1);
  }
}

main();











































