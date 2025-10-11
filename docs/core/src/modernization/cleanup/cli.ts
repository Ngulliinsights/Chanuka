#!/usr/bin/env node

import { CleanupOrchestrator } from './orchestrator';
import { CleanupExecutor } from './executor';
import { logger } from '../utils/logger';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rootPath = args[1] || process.cwd();

  const orchestrator = new CleanupOrchestrator(rootPath);

  try {
    switch (command) {
      case 'analyze':
        logger.info('🔍 Analyzing root directory...', { component: 'SimpleTool' });
        const analysis = await orchestrator.analyzeRootDirectory();
        
        logger.info('\n📊 Analysis Results:', { component: 'SimpleTool' });
        console.log(`Files analyzed: ${analysis.metrics.filesAnalyzed}`);
        console.log(`Issues found: ${analysis.metrics.issuesFound}`);
        console.log(`Risk score: ${analysis.metrics.riskScore}/100`);
        
        logger.info('\n🔍 Findings:', { component: 'SimpleTool' });
        analysis.findings.forEach((finding, index) => {
          console.log(`${index + 1}. [${finding.severity.toUpperCase()}] ${finding.description}`);
          console.log(`   Location: ${finding.location}`);
          console.log(`   Impact: ${finding.impact}`);
          logger.info('', { component: 'SimpleTool' });
        });
        
        logger.info('💡 Recommendations:', { component: 'SimpleTool' });
        analysis.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.title} (Priority: ${rec.priority})`);
          console.log(`   ${rec.description}`);
          console.log(`   Estimated effort: ${rec.estimatedEffort} points`);
          logger.info('', { component: 'SimpleTool' });
        });
        break;

      case 'plan':
        logger.info('📋 Creating cleanup plan...', { component: 'SimpleTool' });
        const planAnalysis = await orchestrator.analyzeRootDirectory();
        const plan = await orchestrator.createCleanupPlan(planAnalysis);
        
        logger.info('\n📋 Cleanup Plan:', { component: 'SimpleTool' });
        console.log(`Plan ID: ${plan.id}`);
        console.log(`Files to remove: ${plan.filesToRemove.length}`);
        console.log(`Files to move: ${plan.filesToMove.length}`);
        console.log(`Files to consolidate: ${plan.filesToConsolidate.length}`);
        
        if (plan.filesToRemove.length > 0) {
          logger.info('\n🗑️  Files to remove:', { component: 'SimpleTool' });
          plan.filesToRemove.forEach(op => {
            console.log(`  - ${op.path} (${op.reason})`);
          });
        }
        
        if (plan.filesToMove.length > 0) {
          logger.info('\n📁 Files to move:', { component: 'SimpleTool' });
          plan.filesToMove.forEach(op => {
            console.log(`  - ${op.source} → ${op.destination}`);
          });
        }
        
        if (plan.filesToConsolidate.length > 0) {
          logger.info('\n📄 Files to consolidate:', { component: 'SimpleTool' });
          plan.filesToConsolidate.forEach(op => {
            console.log(`  - ${op.sources.length} files → ${op.target}`);
          });
        }
        
        logger.info('\n🛡️  Safety checks:', { component: 'SimpleTool' });
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
        
        logger.info('\n✅ Cleanup Results:', { component: 'SimpleTool' });
        console.log(`Success: ${result.success ? 'Yes' : 'No'}`);
        console.log(`Files processed: ${result.filesProcessed}`);
        console.log(`Space saved: ${Math.round(result.spaceSaved / 1024)} KB`);
        
        if (result.backupLocation) {
          console.log(`Backup created: ${result.backupLocation}`);
        }
        
        if (result.errors.length > 0) {
          logger.info('\n❌ Errors:', { component: 'SimpleTool' });
          result.errors.forEach(error => {
            console.log(`  - ${error.file}: ${error.error}`);
          });
        }
        
        if (result.warnings.length > 0) {
          logger.info('\n⚠️  Warnings:', { component: 'SimpleTool' });
          result.warnings.forEach(warning => {
            console.log(`  - ${warning}`);
          });
        }
        break;

      default:
        logger.info('🧹 Cleanup CLI Tool', { component: 'SimpleTool' });
        logger.info('', { component: 'SimpleTool' });
        logger.info('Usage:', { component: 'SimpleTool' });
        logger.info('  cleanup analyze [path]     - Analyze root directory', { component: 'SimpleTool' });
        logger.info('  cleanup plan [path]        - Create cleanup plan', { component: 'SimpleTool' });
        logger.info('  cleanup execute [path]     - Execute cleanup', { component: 'SimpleTool' });
        logger.info('', { component: 'SimpleTool' });
        logger.info('Options:', { component: 'SimpleTool' });
        logger.info('  --dry-run                  - Show what would be done without executing', { component: 'SimpleTool' });
        logger.info('  --no-backup                - Skip backup creation', { component: 'SimpleTool' });
        logger.info('', { component: 'SimpleTool' });
        logger.info('Examples:', { component: 'SimpleTool' });
        logger.info('  cleanup analyze', { component: 'SimpleTool' });
        logger.info('  cleanup plan /path/to/project', { component: 'SimpleTool' });
        logger.info('  cleanup execute --dry-run', { component: 'SimpleTool' });
        break;
    }
  } catch (error) {
    logger.error('❌ Error:', { component: 'SimpleTool' }, error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };






