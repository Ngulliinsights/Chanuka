/**
 * Run Final Validation - Phase 6 Task 16.5
 * 
 * Runs full TypeScript compilation and validates zero errors remain.
 */

import { TypeValidator } from './core/type-validator';
import { ErrorAnalyzer } from './core/error-analyzer';
import { RemediationConfig } from './config';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationReport {
  timestamp: Date;
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByFile: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  regressions: Array<{
    file: string;
    error: string;
    isNew: boolean;
  }>;
  testResults: {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    errors: string[];
  };
}

async function runFinalValidation() {
  console.log('='.repeat(80));
  console.log('Phase 6: Import Cleanup and Validation - Task 16.5');
  console.log('Final Validation');
  console.log('='.repeat(80));
  console.log();

  // Load configuration
  const config = new RemediationConfig();
  
  // Initialize validators
  const typeValidator = new TypeValidator(config);
  const errorAnalyzer = new ErrorAnalyzer(config);

  const report: ValidationReport = {
    timestamp: new Date(),
    totalErrors: 0,
    errorsByCategory: {},
    errorsByFile: {},
    errorsBySeverity: {},
    regressions: [],
    testResults: {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    }
  };

  // Step 1: Load initial error report (if exists)
  console.log('Step 1: Loading initial error report...');
  console.log('-'.repeat(80));
  
  const reportDir = path.join(__dirname, 'reports');
  const initialReportPath = path.join(reportDir, 'initial-error-report.json');
  
  let initialErrorReport: any = null;
  if (fs.existsSync(initialReportPath)) {
    initialErrorReport = JSON.parse(fs.readFileSync(initialReportPath, 'utf-8'));
    console.log(`Initial error count: ${initialErrorReport.totalErrors}`);
  } else {
    console.log('No initial error report found - will create baseline');
  }
  console.log();

  // Step 2: Run full TypeScript compilation
  console.log('Step 2: Running full TypeScript compilation...');
  console.log('-'.repeat(80));
  
  const validationResult = await typeValidator.validateTypeScript();
  
  report.totalErrors = validationResult.errorCount;
  console.log(`Total errors: ${validationResult.errorCount}`);
  console.log();

  // Step 3: Analyze errors
  console.log('Step 3: Analyzing errors...');
  console.log('-'.repeat(80));
  
  const errorReport = await errorAnalyzer.analyzeErrors();
  
  // Group by category
  for (const [category, errors] of errorReport.errorsByCategory.entries()) {
    report.errorsByCategory[category] = errors.length;
  }
  
  // Group by file
  for (const [file, errors] of errorReport.errorsByFile.entries()) {
    const relativePath = path.relative(process.cwd(), file);
    report.errorsByFile[relativePath] = errors.length;
  }
  
  // Group by severity
  for (const [severity, errors] of errorReport.errorsBySeverity.entries()) {
    report.errorsBySeverity[severity] = errors.length;
  }
  
  console.log('Errors by category:');
  for (const [category, count] of Object.entries(report.errorsByCategory)) {
    console.log(`  ${category}: ${count}`);
  }
  console.log();
  
  console.log('Errors by severity:');
  for (const [severity, count] of Object.entries(report.errorsBySeverity)) {
    console.log(`  ${severity}: ${count}`);
  }
  console.log();

  // Step 4: Check for regressions
  console.log('Step 4: Checking for regressions...');
  console.log('-'.repeat(80));
  
  if (initialErrorReport) {
    const newErrors = await typeValidator.detectNewErrors(
      initialErrorReport,
      errorReport
    );
    
    if (newErrors.length > 0) {
      console.log(`⚠️  WARNING: ${newErrors.length} new errors detected!`);
      
      for (const error of newErrors.slice(0, 10)) {
        const relativePath = path.relative(process.cwd(), error.file);
        report.regressions.push({
          file: relativePath,
          error: `${error.code}: ${error.message}`,
          isNew: true
        });
        
        console.log(`  ${relativePath}:${error.line}`);
        console.log(`    ${error.code}: ${error.message}`);
      }
      
      if (newErrors.length > 10) {
        console.log(`  ... and ${newErrors.length - 10} more`);
      }
    } else {
      console.log('✅ No regressions detected');
    }
    
    // Calculate progress
    const errorDelta = report.totalErrors - initialErrorReport.totalErrors;
    if (errorDelta < 0) {
      console.log(`✅ ${Math.abs(errorDelta)} errors fixed since initial report`);
    } else if (errorDelta > 0) {
      console.log(`⚠️  ${errorDelta} more errors than initial report`);
    } else {
      console.log('ℹ️  Error count unchanged');
    }
  } else {
    console.log('No initial report to compare against');
  }
  console.log();

  // Step 5: Run existing test suite
  console.log('Step 5: Running existing test suite...');
  console.log('-'.repeat(80));
  
  try {
    // Try to run tests
    const testCommand = 'npm test -- --run';
    console.log(`Running: ${testCommand}`);
    
    const testOutput = execSync(testCommand, {
      cwd: config.clientRoot,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(testOutput);
    
    // Parse test results (simplified - would need to parse actual test output)
    report.testResults.passed = true;
    report.testResults.totalTests = 0; // Would parse from output
    report.testResults.passedTests = 0; // Would parse from output
    report.testResults.failedTests = 0;
    
    console.log('✅ All tests passed');
  } catch (error: any) {
    console.log('⚠️  Some tests failed or test command not available');
    console.log(error.message);
    
    report.testResults.passed = false;
    report.testResults.errors.push(error.message);
  }
  console.log();

  // Step 6: Display top error files
  console.log('Step 6: Top files with errors...');
  console.log('-'.repeat(80));
  
  const sortedFiles = Object.entries(report.errorsByFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
  
  if (sortedFiles.length > 0) {
    console.log('Files with most errors:');
    for (const [file, count] of sortedFiles) {
      console.log(`  ${count.toString().padStart(3)} errors - ${file}`);
    }
  } else {
    console.log('✅ No files with errors!');
  }
  console.log();

  // Step 7: Display specific errors (if any)
  if (validationResult.errors.length > 0) {
    console.log('Step 7: Sample errors...');
    console.log('-'.repeat(80));
    
    const sampleErrors = validationResult.errors.slice(0, 10);
    for (const error of sampleErrors) {
      const relativePath = path.relative(process.cwd(), error.file);
      console.log(`${relativePath}:${error.line}:${error.column}`);
      console.log(`  ${error.code}: ${error.message}`);
      console.log();
    }
    
    if (validationResult.errors.length > 10) {
      console.log(`... and ${validationResult.errors.length - 10} more errors`);
      console.log();
    }
  }

  // Step 8: Save validation report
  console.log('Step 8: Saving validation report...');
  console.log('-'.repeat(80));
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'final-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Validation report saved to: ${reportPath}`);
  console.log();

  // Final summary
  console.log('='.repeat(80));
  console.log('Final Validation Complete');
  console.log('='.repeat(80));
  console.log();
  
  if (report.totalErrors === 0) {
    console.log('🎉 SUCCESS! Zero TypeScript errors in the codebase!');
    console.log();
    console.log('✅ Full TypeScript compilation passed');
    console.log('✅ No regressions detected');
    if (report.testResults.passed) {
      console.log('✅ All tests passed');
    }
  } else {
    console.log(`⚠️  ${report.totalErrors} TypeScript errors remain`);
    console.log();
    console.log('Errors by category:');
    for (const [category, count] of Object.entries(report.errorsByCategory)) {
      console.log(`  ${category}: ${count}`);
    }
    console.log();
    console.log('Next steps:');
    console.log('1. Review error report for remaining issues');
    console.log('2. Focus on high-severity errors first');
    console.log('3. Check for any regressions that need to be addressed');
  }
  console.log();

  // Exit with appropriate code
  if (report.totalErrors === 0 && report.testResults.passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run the validation
runFinalValidation().catch(error => {
  console.error('Error running final validation:', error);
  process.exit(1);
});
