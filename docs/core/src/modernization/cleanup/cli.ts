#!/usr/bin/env node

import { CleanupOrchestrator } from './orchestrator';
import { CleanupExecutor } from './executor';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const rootPath = args[1] || process.cwd();

  const orchestrator = new CleanupOrchestrator(rootPath);

  try {
    switch (command) {
      case 'analyze':
        console.log('🔍 Analyzing root directory...');
        const analysis = await orchestrator.analyzeRootDirectory();
        
        console.log('\n📊 Analysis Results:');
        console.log(`Files analyzed: ${analysis.metrics.filesAnalyzed}`);
        console.log(`Issues found: ${analysis.metrics.issuesFound}`);
        console.log(`Risk score: ${analysis.metrics.riskScore}/100`);
        
        console.log('\n🔍 Findings:');
        analysis.findings.forEach((finding, index) => {
          console.log(`${index + 1}. [${finding.severity.toUpperCase()}] ${finding.description}`);
          console.log(`   Location: ${finding.location}`);
          console.log(`   Impact: ${finding.impact}`);
          console.log('');
        });
        
        console.log('💡 Recommendations:');
        analysis.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.title} (Priority: ${rec.priority})`);
          console.log(`   ${rec.description}`);
          console.log(`   Estimated effort: ${rec.estimatedEffort} points`);
          console.log('');
        });
        break;

      case 'plan':
        console.log('📋 Creating cleanup plan...');
        const planAnalysis = await orchestrator.analyzeRootDirectory();
        const plan = await orchestrator.createCleanupPlan(planAnalysis);
        
        console.log('\n📋 Cleanup Plan:');
        console.log(`Plan ID: ${plan.id}`);
        console.log(`Files to remove: ${plan.filesToRemove.length}`);
        console.log(`Files to move: ${plan.filesToMove.length}`);
        console.log(`Files to consolidate: ${plan.filesToConsolidate.length}`);
        
        if (plan.filesToRemove.length > 0) {
          console.log('\n🗑️  Files to remove:');
          plan.filesToRemove.forEach(op => {
            console.log(`  - ${op.path} (${op.reason})`);
          });
        }
        
        if (plan.filesToMove.length > 0) {
          console.log('\n📁 Files to move:');
          plan.filesToMove.forEach(op => {
            console.log(`  - ${op.source} → ${op.destination}`);
          });
        }
        
        if (plan.filesToConsolidate.length > 0) {
          console.log('\n📄 Files to consolidate:');
          plan.filesToConsolidate.forEach(op => {
            console.log(`  - ${op.sources.length} files → ${op.target}`);
          });
        }
        
        console.log('\n🛡️  Safety checks:');
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
        
        console.log('\n✅ Cleanup Results:');
        console.log(`Success: ${result.success ? 'Yes' : 'No'}`);
        console.log(`Files processed: ${result.filesProcessed}`);
        console.log(`Space saved: ${Math.round(result.spaceSaved / 1024)} KB`);
        
        if (result.backupLocation) {
          console.log(`Backup created: ${result.backupLocation}`);
        }
        
        if (result.errors.length > 0) {
          console.log('\n❌ Errors:');
          result.errors.forEach(error => {
            console.log(`  - ${error.file}: ${error.error}`);
          });
        }
        
        if (result.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          result.warnings.forEach(warning => {
            console.log(`  - ${warning}`);
          });
        }
        break;

      default:
        console.log('🧹 Cleanup CLI Tool');
        console.log('');
        console.log('Usage:');
        console.log('  cleanup analyze [path]     - Analyze root directory');
        console.log('  cleanup plan [path]        - Create cleanup plan');
        console.log('  cleanup execute [path]     - Execute cleanup');
        console.log('');
        console.log('Options:');
        console.log('  --dry-run                  - Show what would be done without executing');
        console.log('  --no-backup                - Skip backup creation');
        console.log('');
        console.log('Examples:');
        console.log('  cleanup analyze');
        console.log('  cleanup plan /path/to/project');
        console.log('  cleanup execute --dry-run');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };