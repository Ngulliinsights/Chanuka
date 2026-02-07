/**
 * Run Error Analysis
 * 
 * This script runs the error analysis on the client codebase and generates a report.
 */

import { ErrorAnalyzer } from './core/error-analyzer';
import { defaultConfig } from './config';
import { ErrorCategory } from './types';
import * as fs from 'fs';
import * as path from 'path';

async function runAnalysis() {
  console.log('Starting error analysis...\n');
  
  const analyzer = new ErrorAnalyzer(defaultConfig);
  
  // Step 1: Analyze errors
  console.log('Step 1: Analyzing TypeScript errors...');
  const errorReport = await analyzer.analyzeErrors();
  
  console.log(`\nTotal errors found: ${errorReport.totalErrors}`);
  
  // Step 2: Display errors by category
  console.log('\n=== Errors by Category ===');
  const categoryEntries = Array.from(errorReport.errorsByCategory.entries());
  categoryEntries.sort((a, b) => b[1].length - a[1].length);
  
  for (const [category, errors] of categoryEntries) {
    console.log(`${category}: ${errors.length} errors`);
  }
  
  // Step 3: Display errors by severity
  console.log('\n=== Errors by Severity ===');
  for (const [severity, errors] of errorReport.errorsBySeverity.entries()) {
    console.log(`${severity}: ${errors.length} errors`);
  }
  
  // Step 4: Display top files with most errors
  console.log('\n=== Top 10 Files with Most Errors ===');
  const fileEntries = Array.from(errorReport.errorsByFile.entries());
  fileEntries.sort((a, b) => b[1].length - a[1].length);
  
  for (let i = 0; i < Math.min(10, fileEntries.length); i++) {
    const [file, errors] = fileEntries[i];
    const relativePath = path.relative(process.cwd(), file);
    console.log(`${relativePath}: ${errors.length} errors`);
  }
  
  // Step 5: Discover module relocations for MODULE_RESOLUTION errors
  const moduleResolutionErrors = errorReport.errorsByCategory.get(ErrorCategory.MODULE_RESOLUTION) || [];
  
  if (moduleResolutionErrors.length > 0) {
    console.log('\n=== Module Resolution Analysis ===');
    console.log(`Found ${moduleResolutionErrors.length} module resolution errors`);
    
    // Extract missing module paths
    const missingModules = moduleResolutionErrors
      .map(error => {
        const match = error.message.match(/Cannot find module '([^']+)'/);
        return match ? match[1] : null;
      })
      .filter((m): m is string => m !== null);
    
    const uniqueModules = Array.from(new Set(missingModules));
    console.log(`Unique missing modules: ${uniqueModules.length}`);
    
    console.log('\nDiscovering module relocations...');
    const relocations = await analyzer.discoverModuleRelocations(uniqueModules);
    
    console.log(`\nRelocations found: ${relocations.relocations.size}`);
    console.log(`Deleted modules: ${relocations.deletedModules.length}`);
    console.log(`Potential consolidations: ${relocations.consolidations.size}`);
    
    if (relocations.relocations.size > 0) {
      console.log('\n=== Discovered Relocations ===');
      for (const [oldPath, location] of relocations.relocations.entries()) {
        console.log(`${oldPath} -> ${location.path}`);
        console.log(`  Layer: ${location.layer}${location.feature ? `, Feature: ${location.feature}` : ''}${location.segment ? `, Segment: ${location.segment}` : ''}`);
      }
    }
    
    if (relocations.deletedModules.length > 0) {
      console.log('\n=== Deleted Modules (No Relocation Found) ===');
      for (const module of relocations.deletedModules) {
        console.log(`- ${module}`);
      }
    }
    
    if (relocations.consolidations.size > 0) {
      console.log('\n=== Potential Consolidations ===');
      for (const [canonical, duplicates] of relocations.consolidations.entries()) {
        console.log(`${canonical}:`);
        for (const duplicate of duplicates) {
          console.log(`  - ${duplicate}`);
        }
      }
    }
  }
  
  // Step 6: Generate detailed report
  console.log('\n=== Generating Detailed Report ===');
  const reportDir = defaultConfig.progressTracking.reportDirectory;
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `error-analysis-${timestamp}.json`);
  
  // Convert Maps to objects for JSON serialization
  const reportData = {
    timestamp: new Date().toISOString(),
    totalErrors: errorReport.totalErrors,
    errorsByCategory: Object.fromEntries(
      Array.from(errorReport.errorsByCategory.entries()).map(([category, errors]) => [
        category,
        {
          count: errors.length,
          errors: errors.map(e => ({
            code: e.code,
            message: e.message,
            file: path.relative(process.cwd(), e.file),
            line: e.line,
            column: e.column,
            severity: e.severity
          }))
        }
      ])
    ),
    errorsBySeverity: Object.fromEntries(
      Array.from(errorReport.errorsBySeverity.entries()).map(([severity, errors]) => [
        severity,
        errors.length
      ])
    ),
    topFiles: fileEntries.slice(0, 20).map(([file, errors]) => ({
      file: path.relative(process.cwd(), file),
      errorCount: errors.length,
      errors: errors.map(e => ({
        code: e.code,
        message: e.message,
        line: e.line,
        column: e.column
      }))
    }))
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`Report saved to: ${reportPath}`);
  
  // Step 7: Summary
  console.log('\n=== Analysis Summary ===');
  console.log(`Total errors: ${errorReport.totalErrors}`);
  console.log(`Files affected: ${errorReport.errorsByFile.size}`);
  console.log(`Categories: ${errorReport.errorsByCategory.size}`);
  
  // Check if we're close to the expected 360 errors
  const expectedErrors = 360;
  const tolerance = 50; // Allow some variance
  
  if (Math.abs(errorReport.totalErrors - expectedErrors) <= tolerance) {
    console.log(`\n✓ Error count is within expected range (${expectedErrors} ± ${tolerance})`);
  } else {
    console.log(`\n⚠ Error count differs from expected ${expectedErrors} errors`);
    console.log(`  Difference: ${errorReport.totalErrors - expectedErrors}`);
  }
  
  return errorReport;
}

// Run the analysis
runAnalysis()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Analysis failed:', error);
    process.exit(1);
  });
