#!/usr/bin/env node

import { CleanupOrchestrator } from './orchestrator';
import { CleanupExecutor } from './executor';
import { logger } from '../../observability/logging';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rootPath = args[1] || process.cwd();

  const orchestrator = new CleanupOrchestrator(rootPath);

  try {
    switch (command) {
      case 'analyze':
        logger.info('🔍 Analyzing root directory...', { component: 'Chanuka' });
        const analysis = await orchestrator.analyzeRootDirectory();
        
        logger.info('\n📊 Analysis Results:', { component: 'Chanuka' });
        console.log(`Files analyzed: ${analysis.metrics.filesAnalyzed}`);
        console.log(`Issues found: ${analysis.metrics.issuesFound}`);
        console.log(`Risk score: ${analysis.metrics.riskScore}/100`);
        
        logger.info('\n🔍 Findings:', { component: 'Chanuka' });
        analysis.findings.forEach((finding, index) => {
          console.log(`${index + 1}. [${finding.severity.toUpperCase()}] ${finding.description}`);
          console.log(`   Location: ${finding.location}`);
          console.log(`   Impact: ${finding.impact}`);
          logger.info('', { component: 'Chanuka' });
        });
        
        logger.info('💡 Recommendations:', { component: 'Chanuka' });
        analysis.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.title} (Priority: ${rec.priority})`);
          console.log(`   ${rec.description}`);
          console.log(`   Estimated effort: ${rec.estimatedEffort} points`);
          logger.info('', { component: 'Chanuka' });
        });
        break;

      case 'plan':
        logger.info('📋 Creating cleanup plan...', { component: 'Chanuka' });
        const planAnalysis = await orchestrator.analyzeRootDirectory();
        const plan = await orchestrator.createCleanupPlan(planAnalysis);
        
        logger.info('\n📋 Cleanup Plan:', { component: 'Chanuka' });
        console.log(`Plan ID: ${plan.id}`);
        console.log(`Files to remove: ${plan.filesToRemove.length}`);
        console.log(`Files to move: ${plan.filesToMove.length}`);
        console.log(`Files to consolidate: ${plan.filesToConsolidate.length}`);
        
        if (plan.filesToRemove.length > 0) {
          logger.info('\n🗑️  Files to remove:', { component: 'Chanuka' });
          plan.filesToRemove.forEach(op => {
            console.log(`  - ${op.path} (${op.reason})`);
          });
        }
        
        if (plan.filesToMove.length > 0) {
          logger.info('\n📁 Files to move:', { component: 'Chanuka' });
          plan.filesToMove.forEach(op => {
            console.log(`  - ${op.source} → ${op.destination}`);
          });
        }
        
        if (plan.filesToConsolidate.length > 0) {
          logger.info('\n📄 Files to consolidate:', { component: 'Chanuka' });
          plan.filesToConsolidate.forEach(op => {
            console.log(`  - ${op.sources.length} files → ${op.target}`);
          });
        }
        
        logger.info('\n🛡️  Safety checks:', { component: 'Chanuka' });
        plan.safetyChecks.forEach(check => {
          const icon = check.critical ? '🚨' : '⚠️';
          console.log(`  ${icon} ${check.description}`);
        });
        break;

      case 'execute':
        const dryRun = args.includes('--dry-run');
        const skipBackup = args.includes('--no-backup');
        
        console.log(`🚀 Executing cleanup${dryRun ? ' (DRY RUN)' : ''}...`);
        
        const execAnalysis = await orchestrator.analyzeRootDirectory();
        const execPlan = await orchestrator.createCleanupPlan(execAnalysis);
        
        const executor = new CleanupExecutor(rootPath, {
          dryRun,
          createBackups: !skipBackup,
          validateBeforeExecution: true,
          validateAfterExecution: true
        });
        
        const result = await executor.executeCleanup(execPlan);
        
        logger.info('\n✅ Cleanup Results:', { component: 'Chanuka' });
        console.log(`Success: ${result.success ? 'Yes' : 'No'}`);
        console.log(`Files processed: ${result.filesProcessed}`);
        console.log(`Space saved: ${Math.round(result.spaceSaved / 1024)} KB`);
        
        if (result.backupLocation) {
          console.log(`Backup created: ${result.backupLocation}`);
        }
        
        if (result.errors.length > 0) {
          logger.info('\n❌ Errors:', { component: 'Chanuka' });
          result.errors.forEach(error => {
            console.log(`  - ${error.file}: ${error.error}`);
          });
        }
        
        if (result.warnings.length > 0) {
          logger.info('\n⚠️  Warnings:', { component: 'Chanuka' });
          result.warnings.forEach(warning => {
            console.log(`  - ${warning}`);
          });
        }
        break;

      default:
        logger.info('🧹 Cleanup CLI Tool', { component: 'Chanuka' });
        logger.info('', { component: 'Chanuka' });
        logger.info('Usage:', { component: 'Chanuka' });
        logger.info('  cleanup analyze [path]     - Analyze root directory', { component: 'Chanuka' });
        logger.info('  cleanup plan [path]        - Create cleanup plan', { component: 'Chanuka' });
        logger.info('  cleanup execute [path]     - Execute cleanup', { component: 'Chanuka' });
        logger.info('', { component: 'Chanuka' });
        logger.info('Options:', { component: 'Chanuka' });
        logger.info('  --dry-run                  - Show what would be done without executing', { component: 'Chanuka' });
        logger.info('  --no-backup                - Skip backup creation', { component: 'Chanuka' });
        logger.info('', { component: 'Chanuka' });
        logger.info('Examples:', { component: 'Chanuka' });
        logger.info('  cleanup analyze', { component: 'Chanuka' });
        logger.info('  cleanup plan /path/to/project', { component: 'Chanuka' });
        logger.info('  cleanup execute --dry-run', { component: 'Chanuka' });
        break;
    }
  } catch (error) {
    logger.error('❌ Error:', { component: 'Chanuka' }, error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };






