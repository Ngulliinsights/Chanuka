/**
 * Module Structure Validation Script
 * 
 * This script validates the infrastructure module count and structure compliance.
 * Requirements: 3.4, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ModuleValidation {
  name: string;
  path: string;
  hasIndexTs: boolean;
  hasTypes: boolean;
  hasReadme: boolean;
  hasTests: boolean;
  isCompliant: boolean;
  missingItems: string[];
}

interface ValidationReport {
  totalModules: number;
  compliantModules: number;
  nonCompliantModules: number;
  targetRange: { min: number; max: number };
  inTargetRange: boolean;
  modules: ModuleValidation[];
}

const INFRASTRUCTURE_PATH = path.join(__dirname, '..');
const TARGET_MIN = 18;
const TARGET_MAX = 22;

/**
 * Check if a path is a module directory (not a script/utility directory)
 */
function isModuleDirectory(dirPath: string, dirName: string): boolean {
  // Exclude non-module directories
  const excludedDirs = ['scripts', '__tests__', 'types', 'utils', 'config', 'constants'];
  if (excludedDirs.includes(dirName)) {
    return false;
  }

  // Must have at least an index.ts file to be considered a module
  const indexPath = path.join(dirPath, 'index.ts');
  return fs.existsSync(indexPath);
}

/**
 * Validate a single module's structure
 */
function validateModule(modulePath: string, moduleName: string): ModuleValidation {
  const validation: ModuleValidation = {
    name: moduleName,
    path: modulePath,
    hasIndexTs: false,
    hasTypes: false,
    hasReadme: false,
    hasTests: false,
    isCompliant: false,
    missingItems: [],
  };

  // Check for index.ts
  const indexPath = path.join(modulePath, 'index.ts');
  validation.hasIndexTs = fs.existsSync(indexPath);
  if (!validation.hasIndexTs) {
    validation.missingItems.push('index.ts');
  }

  // Check for types (types.ts or types/ directory)
  const typesFilePath = path.join(modulePath, 'types.ts');
  const typesDirPath = path.join(modulePath, 'types');
  validation.hasTypes = fs.existsSync(typesFilePath) || fs.existsSync(typesDirPath);
  if (!validation.hasTypes) {
    validation.missingItems.push('types.ts or types/');
  }

  // Check for README.md
  const readmePath = path.join(modulePath, 'README.md');
  validation.hasReadme = fs.existsSync(readmePath);
  if (!validation.hasReadme) {
    validation.missingItems.push('README.md');
  }

  // Check for __tests__/ directory
  const testsPath = path.join(modulePath, '__tests__');
  validation.hasTests = fs.existsSync(testsPath);
  if (!validation.hasTests) {
    validation.missingItems.push('__tests__/');
  }

  // Module is compliant if it has all required items
  validation.isCompliant = validation.missingItems.length === 0;

  return validation;
}

/**
 * Scan infrastructure directory and validate all modules
 */
function validateInfrastructure(): ValidationReport {
  const modules: ModuleValidation[] = [];

  // Read all directories in infrastructure
  const entries = fs.readdirSync(INFRASTRUCTURE_PATH, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const modulePath = path.join(INFRASTRUCTURE_PATH, entry.name);
      
      // Check if this is a module directory
      if (isModuleDirectory(modulePath, entry.name)) {
        const validation = validateModule(modulePath, entry.name);
        modules.push(validation);
      }
    }
  }

  // Sort modules by name for consistent reporting
  modules.sort((a, b) => a.name.localeCompare(b.name));

  const totalModules = modules.length;
  const compliantModules = modules.filter(m => m.isCompliant).length;
  const nonCompliantModules = totalModules - compliantModules;
  const inTargetRange = totalModules >= TARGET_MIN && totalModules <= TARGET_MAX;

  return {
    totalModules,
    compliantModules,
    nonCompliantModules,
    targetRange: { min: TARGET_MIN, max: TARGET_MAX },
    inTargetRange,
    modules,
  };
}

/**
 * Generate a formatted report
 */
function generateReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('# Infrastructure Module Validation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Modules**: ${report.totalModules}`);
  lines.push(`- **Target Range**: ${report.targetRange.min}-${report.targetRange.max} modules`);
  lines.push(`- **In Target Range**: ${report.inTargetRange ? '✅ YES' : '❌ NO'}`);
  lines.push(`- **Compliant Modules**: ${report.compliantModules} (${Math.round(report.compliantModules / report.totalModules * 100)}%)`);
  lines.push(`- **Non-Compliant Modules**: ${report.nonCompliantModules}`);
  lines.push('');

  if (!report.inTargetRange) {
    if (report.totalModules < report.targetRange.min) {
      lines.push(`⚠️ **Warning**: Module count (${report.totalModules}) is below target minimum (${report.targetRange.min})`);
    } else {
      lines.push(`⚠️ **Warning**: Module count (${report.totalModules}) exceeds target maximum (${report.targetRange.max})`);
    }
    lines.push('');
  }

  lines.push('## Module List');
  lines.push('');
  lines.push('| Module | index.ts | types | README.md | __tests__/ | Status |');
  lines.push('|--------|----------|-------|-----------|------------|--------|');

  for (const module of report.modules) {
    const status = module.isCompliant ? '✅ Compliant' : '❌ Non-Compliant';
    lines.push(
      `| ${module.name} | ${module.hasIndexTs ? '✅' : '❌'} | ${module.hasTypes ? '✅' : '❌'} | ${module.hasReadme ? '✅' : '❌'} | ${module.hasTests ? '✅' : '❌'} | ${status} |`
    );
  }
  lines.push('');

  if (report.nonCompliantModules > 0) {
    lines.push('## Non-Compliant Modules');
    lines.push('');
    
    const nonCompliant = report.modules.filter(m => !m.isCompliant);
    for (const module of nonCompliant) {
      lines.push(`### ${module.name}`);
      lines.push('');
      lines.push('Missing items:');
      for (const item of module.missingItems) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  lines.push('## Requirements Validation');
  lines.push('');
  lines.push('- **Requirement 3.4**: Module count between 18-22 modules');
  lines.push(`  - Status: ${report.inTargetRange ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`  - Actual: ${report.totalModules} modules`);
  lines.push('');
  lines.push('- **Requirement 4.1**: All modules have index.ts');
  lines.push(`  - Status: ${report.modules.every(m => m.hasIndexTs) ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`  - Compliant: ${report.modules.filter(m => m.hasIndexTs).length}/${report.totalModules}`);
  lines.push('');
  lines.push('- **Requirement 4.2**: All modules have types.ts or types/');
  lines.push(`  - Status: ${report.modules.every(m => m.hasTypes) ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`  - Compliant: ${report.modules.filter(m => m.hasTypes).length}/${report.totalModules}`);
  lines.push('');
  lines.push('- **Requirement 4.3**: All modules have README.md');
  lines.push(`  - Status: ${report.modules.every(m => m.hasReadme) ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`  - Compliant: ${report.modules.filter(m => m.hasReadme).length}/${report.totalModules}`);
  lines.push('');
  lines.push('- **Requirement 4.4**: All modules have __tests__/');
  lines.push(`  - Status: ${report.modules.every(m => m.hasTests) ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`  - Compliant: ${report.modules.filter(m => m.hasTests).length}/${report.totalModules}`);
  lines.push('');
  lines.push('- **Requirement 4.5**: 100% standard structure compliance');
  lines.push(`  - Status: ${report.compliantModules === report.totalModules ? '✅ PASS' : '❌ FAIL'}`);
  lines.push(`  - Compliant: ${report.compliantModules}/${report.totalModules} (${Math.round(report.compliantModules / report.totalModules * 100)}%)`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('Validating infrastructure module structure...\n');

  const report = validateInfrastructure();
  const reportText = generateReport(report);

  // Write report to file
  const reportPath = path.join(INFRASTRUCTURE_PATH, 'MODULE_VALIDATION_REPORT.md');
  fs.writeFileSync(reportPath, reportText, 'utf-8');

  // Print summary to console
  console.log('Summary:');
  console.log(`- Total Modules: ${report.totalModules}`);
  console.log(`- Target Range: ${report.targetRange.min}-${report.targetRange.max}`);
  console.log(`- In Target Range: ${report.inTargetRange ? 'YES ✅' : 'NO ❌'}`);
  console.log(`- Compliant Modules: ${report.compliantModules}/${report.totalModules} (${Math.round(report.compliantModules / report.totalModules * 100)}%)`);
  console.log('');
  console.log(`Full report written to: ${reportPath}`);

  // Exit with error code if validation fails
  if (!report.inTargetRange || report.nonCompliantModules > 0) {
    console.log('\n❌ Validation FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ Validation PASSED');
    process.exit(0);
  }
}

// Run if executed directly
main();

export { validateInfrastructure, generateReport, type ValidationReport, type ModuleValidation };
