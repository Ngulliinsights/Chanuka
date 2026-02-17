/**
 * Generate Final Remediation Report - Phase 6 Task 16.6
 * 
 * Documents all fixes applied, statistics, and migration guidance.
 */

import { ProgressTracker } from './core/progress-tracker';
import { ErrorAnalyzer } from './core/error-analyzer';
import { RemediationConfig } from './config';
import { FixPhase } from './types';
import * as fs from 'fs';
import * as path from 'path';

interface FinalReport {
  metadata: {
    generatedAt: Date;
    totalDuration: string;
    phases: number;
  };
  summary: {
    initialErrors: number;
    finalErrors: number;
    errorsFixed: number;
    fixRate: string;
  };
  phaseBreakdown: Array<{
    phase: string;
    errorsAtStart: number;
    errorsFixed: number;
    errorsRemaining: number;
    status: string;
    duration?: string;
  }>;
  errorsByCategory: Record<string, {
    initial: number;
    fixed: number;
    remaining: number;
  }>;
  filesModified: {
    total: number;
    byPhase: Record<string, number>;
    list: string[];
  };
  typeConsolidation: {
    typesConsolidated: number;
    canonicalLocations: Record<string, string>;
    duplicatesRemoved: number;
  };
  newModulesCreated: {
    count: number;
    list: string[];
    note: string;
  };
  breakingChanges: Array<{
    type: string;
    description: string;
    affectedFiles: string[];
    migrationPattern: string;
  }>;
  manualFixesRequired: Array<{
    file: string;
    issue: string;
    guidance: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
}

async function generateFinalReport() {
  console.log('='.repeat(80));
  console.log('Phase 6: Import Cleanup and Validation - Task 16.6');
  console.log('Generate Final Remediation Report');
  console.log('='.repeat(80));
  console.log();

  // Load configuration
  const config = new RemediationConfig();
  
  // Initialize components
  const progressTracker = new ProgressTracker(config);
  const errorAnalyzer = new ErrorAnalyzer(config);

  const report: FinalReport = {
    metadata: {
      generatedAt: new Date(),
      totalDuration: 'N/A',
      phases: 6
    },
    summary: {
      initialErrors: 0,
      finalErrors: 0,
      errorsFixed: 0,
      fixRate: '0%'
    },
    phaseBreakdown: [],
    errorsByCategory: {},
    filesModified: {
      total: 0,
      byPhase: {},
      list: []
    },
    typeConsolidation: {
      typesConsolidated: 0,
      canonicalLocations: {},
      duplicatesRemoved: 0
    },
    newModulesCreated: {
      count: 0,
      list: [],
      note: 'Per design principle, no new modules or compatibility layers were created'
    },
    breakingChanges: [],
    manualFixesRequired: [],
    recommendations: []
  };

  // Step 1: Load progress data
  console.log('Step 1: Loading progress data...');
  console.log('-'.repeat(80));
  
  const status = progressTracker.getStatus();
  const progressReport = progressTracker.generateReport();
  
  report.summary.initialErrors = status.totalErrors;
  report.summary.finalErrors = status.errorsRemaining;
  report.summary.errorsFixed = status.errorsFixed;
  report.summary.fixRate = status.totalErrors > 0 
    ? `${((status.errorsFixed / status.totalErrors) * 100).toFixed(1)}%`
    : '0%';
  
  console.log(`Initial errors: ${report.summary.initialErrors}`);
  console.log(`Final errors: ${report.summary.finalErrors}`);
  console.log(`Errors fixed: ${report.summary.errorsFixed}`);
  console.log(`Fix rate: ${report.summary.fixRate}`);
  console.log();

  // Step 2: Build phase breakdown
  console.log('Step 2: Building phase breakdown...');
  console.log('-'.repeat(80));
  
  const phaseNames: Record<number, string> = {
    [FixPhase.MODULE_LOCATION_DISCOVERY]: 'Phase 1: Module Location Discovery',
    [FixPhase.IMPORT_PATH_UPDATES]: 'Phase 2: Import Path Updates',
    [FixPhase.TYPE_STANDARDIZATION]: 'Phase 3: Type Standardization',
    [FixPhase.INTERFACE_COMPLETION]: 'Phase 4: Interface Completion',
    [FixPhase.TYPE_SAFETY]: 'Phase 5: Type Safety',
    [FixPhase.IMPORT_CLEANUP_AND_VALIDATION]: 'Phase 6: Import Cleanup & Validation'
  };
  
  for (const [phase, phaseStatus] of status.phaseProgress.entries()) {
    report.phaseBreakdown.push({
      phase: phaseNames[phase] || `Phase ${phase}`,
      errorsAtStart: phaseStatus.errorsAtStart,
      errorsFixed: phaseStatus.errorsFixed,
      errorsRemaining: phaseStatus.errorsRemaining,
      status: phaseStatus.status
    });
    
    console.log(`${phaseNames[phase]}:`);
    console.log(`  Status: ${phaseStatus.status}`);
    console.log(`  Errors at start: ${phaseStatus.errorsAtStart}`);
    console.log(`  Errors fixed: ${phaseStatus.errorsFixed}`);
    console.log(`  Errors remaining: ${phaseStatus.errorsRemaining}`);
  }
  console.log();

  // Step 3: Analyze errors by category
  console.log('Step 3: Analyzing errors by category...');
  console.log('-'.repeat(80));
  
  const currentErrors = await errorAnalyzer.analyzeErrors();
  
  // Load initial error report if available
  const reportDir = path.join(__dirname, 'reports');
  const initialReportPath = path.join(reportDir, 'initial-error-report.json');
  
  if (fs.existsSync(initialReportPath)) {
    const initialReport = JSON.parse(fs.readFileSync(initialReportPath, 'utf-8'));
    
    // Compare initial and current errors by category
    for (const [category, errors] of Object.entries(initialReport.errorsByCategory || {})) {
      const initialCount = Array.isArray(errors) ? errors.length : 0;
      const currentCount = currentErrors.errorsByCategory.get(category as any)?.length || 0;
      
      report.errorsByCategory[category] = {
        initial: initialCount,
        fixed: initialCount - currentCount,
        remaining: currentCount
      };
    }
  }
  
  console.log('Errors by category:');
  for (const [category, stats] of Object.entries(report.errorsByCategory)) {
    console.log(`  ${category}:`);
    console.log(`    Initial: ${stats.initial}`);
    console.log(`    Fixed: ${stats.fixed}`);
    console.log(`    Remaining: ${stats.remaining}`);
  }
  console.log();

  // Step 4: Collect files modified
  console.log('Step 4: Collecting modified files...');
  console.log('-'.repeat(80));
  
  // Load phase reports to get modified files
  const phaseReports = [
    'phase-1-2-completion-report.json',
    'phase-3-4-completion-report.json',
    'import-analysis-report.json'
  ];
  
  const modifiedFiles = new Set<string>();
  
  for (const reportFile of phaseReports) {
    const reportPath = path.join(reportDir, reportFile);
    if (fs.existsSync(reportPath)) {
      try {
        const phaseReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        
        // Extract modified files from report
        if (phaseReport.filesModified) {
          for (const file of phaseReport.filesModified) {
            modifiedFiles.add(file);
          }
        }
      } catch (error) {
        console.log(`  Warning: Could not parse ${reportFile}`);
      }
    }
  }
  
  report.filesModified.total = modifiedFiles.size;
  report.filesModified.list = Array.from(modifiedFiles);
  
  console.log(`Total files modified: ${report.filesModified.total}`);
  console.log();

  // Step 5: Document type consolidation
  console.log('Step 5: Documenting type consolidation...');
  console.log('-'.repeat(80));
  
  // Load type consolidation data
  const typeConsolidationPath = path.join(reportDir, 'type-consolidation-report.json');
  if (fs.existsSync(typeConsolidationPath)) {
    try {
      const consolidationReport = JSON.parse(fs.readFileSync(typeConsolidationPath, 'utf-8'));
      
      report.typeConsolidation.typesConsolidated = consolidationReport.typesConsolidated || 0;
      report.typeConsolidation.canonicalLocations = consolidationReport.canonicalLocations || {};
      report.typeConsolidation.duplicatesRemoved = consolidationReport.duplicatesRemoved || 0;
      
      console.log(`Types consolidated: ${report.typeConsolidation.typesConsolidated}`);
      console.log(`Duplicates removed: ${report.typeConsolidation.duplicatesRemoved}`);
      console.log();
      console.log('Canonical locations:');
      for (const [typeName, location] of Object.entries(report.typeConsolidation.canonicalLocations)) {
        console.log(`  ${typeName}: ${location}`);
      }
    } catch (error) {
      console.log('  Warning: Could not parse type consolidation report');
    }
  } else {
    console.log('  No type consolidation report found');
  }
  console.log();

  // Step 6: Identify breaking changes
  console.log('Step 6: Identifying breaking changes...');
  console.log('-'.repeat(80));
  
  // Check for breaking changes from migration patterns
  const migrationPatternsPath = path.join(reportDir, 'migration-patterns.json');
  if (fs.existsSync(migrationPatternsPath)) {
    try {
      const patterns = JSON.parse(fs.readFileSync(migrationPatternsPath, 'utf-8'));
      
      for (const pattern of patterns) {
        if (pattern.breaking) {
          report.breakingChanges.push({
            type: pattern.type || 'type_change',
            description: pattern.description,
            affectedFiles: pattern.affectedFiles || [],
            migrationPattern: pattern.pattern || 'See documentation'
          });
        }
      }
      
      console.log(`Breaking changes identified: ${report.breakingChanges.length}`);
      for (const change of report.breakingChanges) {
        console.log(`  ${change.type}: ${change.description}`);
        console.log(`    Affected files: ${change.affectedFiles.length}`);
      }
    } catch (error) {
      console.log('  Warning: Could not parse migration patterns');
    }
  } else {
    console.log('  No breaking changes identified');
  }
  console.log();

  // Step 7: Identify manual fixes required
  console.log('Step 7: Identifying manual fixes required...');
  console.log('-'.repeat(80));
  
  // Check for errors that couldn't be automatically fixed
  if (report.summary.finalErrors > 0) {
    // Group remaining errors by file
    const errorsByFile = new Map<string, unknown[]>();
    
    for (const [file, errors] of currentErrors.errorsByFile.entries()) {
      const relativePath = path.relative(process.cwd(), file);
      errorsByFile.set(relativePath, errors);
    }
    
    // Create manual fix guidance for top error files
    const sortedFiles = Array.from(errorsByFile.entries())
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10);
    
    for (const [file, errors] of sortedFiles) {
      const errorCodes = [...new Set(errors.map(e => e.code))];
      
      report.manualFixesRequired.push({
        file,
        issue: `${errors.length} TypeScript errors (${errorCodes.join(', ')})`,
        guidance: generateFixGuidance(errorCodes),
        priority: errors.length > 10 ? 'high' : errors.length > 5 ? 'medium' : 'low'
      });
    }
    
    console.log(`Manual fixes required: ${report.manualFixesRequired.length}`);
    for (const fix of report.manualFixesRequired) {
      console.log(`  [${fix.priority.toUpperCase()}] ${fix.file}`);
      console.log(`    Issue: ${fix.issue}`);
      console.log(`    Guidance: ${fix.guidance}`);
    }
  } else {
    console.log('  No manual fixes required - all errors resolved!');
  }
  console.log();

  // Step 8: Generate recommendations
  console.log('Step 8: Generating recommendations...');
  console.log('-'.repeat(80));
  
  report.recommendations = [
    'Continue monitoring TypeScript errors with regular compilation checks',
    'Run the test suite regularly to catch regressions early',
    'Use the type consolidation patterns established in this remediation',
    'Follow the FSD structure for new modules and types',
    'Prefer shared/types for cross-cutting type definitions',
    'Add runtime validation for type assertions from any/unknown',
    'Use type guards instead of type assertions where possible',
    'Document any necessary type assertions with justification comments',
    'Keep import paths clean by removing unused imports regularly',
    'Validate backward compatibility when making type changes'
  ];
  
  console.log('Recommendations:');
  for (const rec of report.recommendations) {
    console.log(`  - ${rec}`);
  }
  console.log();

  // Step 9: Save final report
  console.log('Step 9: Saving final report...');
  console.log('-'.repeat(80));
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Save JSON report
  const jsonReportPath = path.join(reportDir, 'final-remediation-report.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  console.log(`JSON report saved to: ${jsonReportPath}`);
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  const mdReportPath = path.join(reportDir, 'FINAL-REMEDIATION-REPORT.md');
  fs.writeFileSync(mdReportPath, markdownReport);
  console.log(`Markdown report saved to: ${mdReportPath}`);
  console.log();

  // Final summary
  console.log('='.repeat(80));
  console.log('Final Remediation Report Generated');
  console.log('='.repeat(80));
  console.log();
  console.log(`📊 Summary:`);
  console.log(`   Initial errors: ${report.summary.initialErrors}`);
  console.log(`   Final errors: ${report.summary.finalErrors}`);
  console.log(`   Errors fixed: ${report.summary.errorsFixed}`);
  console.log(`   Fix rate: ${report.summary.fixRate}`);
  console.log();
  console.log(`📁 Files modified: ${report.filesModified.total}`);
  console.log(`🔄 Types consolidated: ${report.typeConsolidation.typesConsolidated}`);
  console.log(`⚠️  Breaking changes: ${report.breakingChanges.length}`);
  console.log(`🔧 Manual fixes required: ${report.manualFixesRequired.length}`);
  console.log();
  console.log(`📄 Reports available:`);
  console.log(`   - ${jsonReportPath}`);
  console.log(`   - ${mdReportPath}`);
  console.log();
}

function generateFixGuidance(errorCodes: string[]): string {
  const guidance: string[] = [];
  
  for (const code of errorCodes) {
    switch (code) {
      case 'TS2307':
        guidance.push('Check module paths and ensure imports are correct');
        break;
      case 'TS2339':
        guidance.push('Add missing properties to interfaces or check property names');
        break;
      case 'TS2367':
        guidance.push('Ensure type compatibility in comparisons');
        break;
      case 'TS7006':
        guidance.push('Add explicit type annotations to parameters');
        break;
      default:
        guidance.push(`Review ${code} errors and apply appropriate fixes`);
    }
  }
  
  return guidance.join('; ');
}

function generateMarkdownReport(report: FinalReport): string {
  const lines: string[] = [];
  
  lines.push('# Final Remediation Report');
  lines.push('');
  lines.push(`Generated: ${report.metadata.generatedAt.toISOString()}`);
  lines.push('');
  
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Initial Errors**: ${report.summary.initialErrors}`);
  lines.push(`- **Final Errors**: ${report.summary.finalErrors}`);
  lines.push(`- **Errors Fixed**: ${report.summary.errorsFixed}`);
  lines.push(`- **Fix Rate**: ${report.summary.fixRate}`);
  lines.push('');
  
  lines.push('## Phase Breakdown');
  lines.push('');
  for (const phase of report.phaseBreakdown) {
    lines.push(`### ${phase.phase}`);
    lines.push('');
    lines.push(`- Status: ${phase.status}`);
    lines.push(`- Errors at start: ${phase.errorsAtStart}`);
    lines.push(`- Errors fixed: ${phase.errorsFixed}`);
    lines.push(`- Errors remaining: ${phase.errorsRemaining}`);
    lines.push('');
  }
  
  lines.push('## Errors by Category');
  lines.push('');
  lines.push('| Category | Initial | Fixed | Remaining |');
  lines.push('|----------|---------|-------|-----------|');
  for (const [category, stats] of Object.entries(report.errorsByCategory)) {
    lines.push(`| ${category} | ${stats.initial} | ${stats.fixed} | ${stats.remaining} |`);
  }
  lines.push('');
  
  lines.push('## Files Modified');
  lines.push('');
  lines.push(`Total files modified: ${report.filesModified.total}`);
  lines.push('');
  
  lines.push('## Type Consolidation');
  lines.push('');
  lines.push(`- Types consolidated: ${report.typeConsolidation.typesConsolidated}`);
  lines.push(`- Duplicates removed: ${report.typeConsolidation.duplicatesRemoved}`);
  lines.push('');
  lines.push('### Canonical Locations');
  lines.push('');
  for (const [typeName, location] of Object.entries(report.typeConsolidation.canonicalLocations)) {
    lines.push(`- **${typeName}**: \`${location}\``);
  }
  lines.push('');
  
  if (report.breakingChanges.length > 0) {
    lines.push('## Breaking Changes');
    lines.push('');
    for (const change of report.breakingChanges) {
      lines.push(`### ${change.type}`);
      lines.push('');
      lines.push(change.description);
      lines.push('');
      lines.push(`Affected files: ${change.affectedFiles.length}`);
      lines.push('');
      lines.push('**Migration Pattern:**');
      lines.push('```');
      lines.push(change.migrationPattern);
      lines.push('```');
      lines.push('');
    }
  }
  
  if (report.manualFixesRequired.length > 0) {
    lines.push('## Manual Fixes Required');
    lines.push('');
    for (const fix of report.manualFixesRequired) {
      lines.push(`### [${fix.priority.toUpperCase()}] ${fix.file}`);
      lines.push('');
      lines.push(`**Issue**: ${fix.issue}`);
      lines.push('');
      lines.push(`**Guidance**: ${fix.guidance}`);
      lines.push('');
    }
  }
  
  lines.push('## Recommendations');
  lines.push('');
  for (const rec of report.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push('');
  
  lines.push('## New Modules Created');
  lines.push('');
  lines.push(`Count: ${report.newModulesCreated.count}`);
  lines.push('');
  lines.push(`Note: ${report.newModulesCreated.note}`);
  lines.push('');
  
  return lines.join('\n');
}

// Run the report generation
generateFinalReport().catch(error => {
  console.error('Error generating final report:', error);
  process.exit(1);
});
