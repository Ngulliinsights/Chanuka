#!/usr/bin/env node
/**
 * Phase 2 Automated Test Migration Analysis Script
 * 
 * Purpose: Analyzes existing test structure and generates a comprehensive
 * migration plan for standardizing test locations according to Phase 2 guidelines.
 * 
 * This script provides:
 * - Complete inventory of all test files and their locations
 * - Intelligent categorization of tests by type and purpose
 * - Migration commands organized into logical batches
 * - Validation steps to ensure migration success
 * - Progress tracking and detailed reporting
 * 
 * Usage: node analyze-phase2.js
 * Output: 
 *   - migrate-phase2.sh (executable migration script)
 *   - phase2-migration-details.json (detailed plan data)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define workspace structure - these paths are relative to the workspace root
const WORKSPACE_ROOT = process.cwd();
const CLIENT_SRC = path.join(WORKSPACE_ROOT, 'client', 'src');
const SERVER_SRC = path.join(WORKSPACE_ROOT, 'server', 'src');
const SHARED_SRC = path.join(WORKSPACE_ROOT, 'shared', 'src');

/**
 * Main analyzer class that orchestrates the entire Phase 2 migration analysis.
 * This class discovers test files, categorizes them, generates migration plans,
 * and produces executable scripts to perform the migration safely.
 */
class Phase2Analyzer {
  constructor() {
    // Track discovered tests organized by their category
    this.testsByCategory = {
      unit: [],          // Unit tests that should be colocated
      integration: [],   // Integration tests that stay in __tests__
      performance: [],   // Performance tests with special naming
      a11y: []          // Accessibility tests with special naming
    };
    
    // Store metadata about discovered test directories
    this.discoveredDirs = [];
  }

  /**
   * Recursively finds all __tests__ directories within a given base path.
   * This method uses the system 'find' command for efficiency, but falls back
   * gracefully if the command fails or the directory doesn't exist.
   * 
   * @param {string} basePath - Root directory to search from
   * @returns {Array} Array of objects containing test directory metadata
   */
  findTestDirectories(basePath) {
    const results = [];
    
    // First verify the base path exists before attempting to search
    if (!fs.existsSync(basePath)) {
      console.warn(`⚠️  Path does not exist: ${basePath}`);
      return results;
    }

    try {
      // Use find command for efficient recursive directory search
      // The 2>/dev/null suppresses permission errors, || true prevents script exit on no matches
      const findCmd = `find "${basePath}" -type d -name "__tests__" 2>/dev/null || true`;
      const output = execSync(findCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      
      // Process each discovered __tests__ directory
      output.split('\n')
        .filter(line => line.trim())
        .forEach(testDir => {
          try {
            // Read all test files in this directory
            const files = fs.readdirSync(testDir)
              .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));
            
            // Calculate the relative path from workspace root for cleaner output
            const relativePath = path.relative(WORKSPACE_ROOT, testDir);
            
            results.push({
              path: testDir,
              relativePath: relativePath,
              files: files,
              count: files.length,
              parent: path.dirname(testDir),
              type: this.categorizeTestDirectory(testDir)
            });
          } catch (readError) {
            console.warn(`⚠️  Could not read directory: ${testDir}`, readError.message);
          }
        });
    } catch (error) {
      // Handle cases where find command fails entirely
      console.warn(`⚠️  Search failed for ${basePath}:`, error.message);
    }

    return results;
  }

  /**
   * Determines the primary category of a test directory based on its path.
   * This helps organize tests according to their architectural layer.
   * 
   * @param {string} testDirPath - Full path to the __tests__ directory
   * @returns {string} Category name
   */
  categorizeTestDirectory(testDirPath) {
    // Check path segments to determine the type of code being tested
    if (testDirPath.includes('/components/')) return 'components';
    if (testDirPath.includes('/hooks/')) return 'hooks';
    if (testDirPath.includes('/utils/') || testDirPath.includes('/utilities/')) return 'utilities';
    if (testDirPath.includes('/features/')) return 'features';
    if (testDirPath.includes('/lib/')) return 'lib';
    if (testDirPath.includes('/services/')) return 'services';
    
    return 'other';
  }

  /**
   * Analyzes a test filename to determine what type of test it contains.
   * This classification drives the migration strategy for each file.
   * 
   * The categorization looks for explicit markers in filenames:
   * - 'integration' → Integration test
   * - 'performance' or 'perf' → Performance test  
   * - 'a11y' or 'accessibility' → Accessibility test
   * - Otherwise → Unit test (default)
   * 
   * @param {string} filename - Name of the test file
   * @returns {string} Test category
   */
  categorizeTestFile(filename) {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('integration')) return 'integration';
    if (lowerFilename.includes('performance') || lowerFilename.includes('perf')) return 'performance';
    if (lowerFilename.includes('a11y') || lowerFilename.includes('accessibility')) return 'a11y';
    
    // Default to unit test - these should be colocated with source
    return 'unit';
  }

  /**
   * Generates a comprehensive migration plan by analyzing all discovered test files.
   * The plan categorizes each file into an appropriate migration action.
   * 
   * Migration actions:
   * - colocate: Move unit tests next to source files
   * - rename: Keep in __tests__ but add type suffix
   * - delete: Remove empty __tests__ directories after migration
   * 
   * @param {Array} testDirs - Array of test directory metadata
   * @returns {Object} Migration plan organized by action type
   */
  generateMigrationPlan(testDirs) {
    const plan = {
      colocate: [],   // Unit tests moving to source directories
      rename: [],     // Tests staying in __tests__ but renaming
      delete: []      // Empty directories to remove
    };

    testDirs.forEach(testDir => {
      // Track how many files will be moved out of this directory
      let filesRemaining = testDir.files.length;

      testDir.files.forEach(file => {
        const category = this.categorizeTestFile(file);
        const sourcePath = path.join(testDir.path, file);
        const sourceRelative = path.relative(WORKSPACE_ROOT, sourcePath);

        if (category === 'unit') {
          // Unit tests should be colocated with their source files
          const targetPath = path.join(testDir.parent, file);
          const targetRelative = path.relative(WORKSPACE_ROOT, targetPath);
          
          plan.colocate.push({
            source: sourcePath,
            target: targetPath,
            sourceRelative: sourceRelative,
            targetRelative: targetRelative,
            file: file,
            type: testDir.type,
            dirCategory: testDir.type
          });
          
          filesRemaining--;
        } else {
          // Non-unit tests stay in __tests__ but get renamed with type suffix
          const newName = this.generateNewTestName(file, category);
          const targetPath = path.join(testDir.path, newName);
          const targetRelative = path.relative(WORKSPACE_ROOT, targetPath);
          
          // Only add to rename plan if the name actually changes
          if (newName !== file) {
            plan.rename.push({
              source: sourcePath,
              target: targetPath,
              sourceRelative: sourceRelative,
              targetRelative: targetRelative,
              file: file,
              newName: newName,
              category: category
            });
          }
        }
      });

      // Mark directory for deletion if all files will be moved out
      if (filesRemaining === 0) {
        const dirRelative = path.relative(WORKSPACE_ROOT, testDir.path);
        plan.delete.push({
          path: testDir.path,
          relativePath: dirRelative
        });
      }
    });

    return plan;
  }

  /**
   * Generates the new filename for a test that needs type-specific naming.
   * Ensures consistent naming patterns across all test types.
   * 
   * @param {string} currentName - Current filename
   * @param {string} category - Test category (integration, performance, a11y)
   * @returns {string} New filename with appropriate suffix
   */
  generateNewTestName(currentName, category) {
    // Remove existing .test. portion to rebuild the name
    const baseName = currentName.replace(/\.test\.(ts|tsx)$/, '');
    const extension = currentName.endsWith('.tsx') ? '.tsx' : '.ts';
    
    // Add category-specific suffix before .test
    return `${baseName}.${category}.test${extension}`;
  }

  /**
   * Converts the migration plan into concrete shell commands.
   * Commands are organized by operation type for easier batch execution.
   * 
   * @param {Object} plan - Migration plan from generateMigrationPlan
   * @returns {Object} Shell commands organized by operation type
   */
  generateCommands(plan) {
    const commands = {
      colocate: [],
      rename: [],
      delete: [],
      verify: []
    };

    // Generate copy commands for unit test colocation
    // Using cp instead of mv initially for safety - allows rollback
    plan.colocate.forEach(item => {
      commands.colocate.push({
        type: 'colocate',
        file: item.file,
        testType: item.type,
        dirCategory: item.dirCategory,
        command: `cp "${item.sourceRelative}" "${item.targetRelative}"`,
        sourceRelative: item.sourceRelative,
        targetRelative: item.targetRelative
      });
    });

    // Generate move commands for test renaming
    plan.rename.forEach(item => {
      commands.rename.push({
        type: 'rename',
        file: item.file,
        newName: item.newName,
        category: item.category,
        command: `mv "${item.sourceRelative}" "${item.targetRelative}"`,
        sourceRelative: item.sourceRelative,
        targetRelative: item.targetRelative
      });
    });

    // Generate removal commands for empty directories
    plan.delete.forEach(item => {
      commands.delete.push({
        type: 'delete',
        path: item.relativePath,
        command: `rmdir "${item.relativePath}"`
      });
    });

    // Define validation commands to run after migration
    commands.verify = [
      'echo "Running unit tests..."',
      'pnpm test --project=client-unit',
      'echo "Running integration tests..."',
      'pnpm test --project=client-integration',
      'echo "Running coverage analysis..."',
      'pnpm test --coverage'
    ];

    return commands;
  }

  /**
   * Creates a comprehensive report of the analysis and migration plan.
   * This report helps reviewers understand the scope and impact of the migration.
   * 
   * @param {Array} testDirs - Discovered test directories
   * @param {Object} plan - Generated migration plan
   * @param {Object} commands - Generated shell commands
   * @returns {Object} Structured report data
   */
  generateReport(testDirs, plan, commands) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTestDirectories: testDirs.length,
        totalTestFiles: testDirs.reduce((sum, d) => sum + d.files.length, 0),
        byDirectoryType: {},
        byTestCategory: {}
      },
      migration: {
        toColocate: plan.colocate.length,
        toRename: plan.rename.length,
        toDelete: plan.delete.length
      },
      commands: {
        colocate: commands.colocate.length,
        rename: commands.rename.length,
        delete: commands.delete.length
      },
      breakdown: {}
    };

    // Count files by directory type (components, hooks, etc.)
    testDirs.forEach(dir => {
      if (!report.summary.byDirectoryType[dir.type]) {
        report.summary.byDirectoryType[dir.type] = 0;
      }
      report.summary.byDirectoryType[dir.type] += dir.files.length;
    });

    // Count files by test category (unit, integration, etc.)
    commands.colocate.forEach(cmd => {
      if (!report.breakdown[cmd.dirCategory]) {
        report.breakdown[cmd.dirCategory] = { unit: 0 };
      }
      report.breakdown[cmd.dirCategory].unit++;
    });

    commands.rename.forEach(cmd => {
      const category = cmd.category;
      if (!report.summary.byTestCategory[category]) {
        report.summary.byTestCategory[category] = 0;
      }
      report.summary.byTestCategory[category]++;
    });

    return report;
  }

  /**
   * Writes an executable bash script that performs the migration.
   * The script includes safety checks, progress indicators, and is organized
   * into logical sections for easier manual execution and review.
   * 
   * @param {Object} commands - Generated shell commands
   * @param {string} filename - Output filename for the script
   * @returns {string} Path to the created script file
   */
  writeMigrationScript(commands, filename = 'migrate-phase2.sh') {
    const script = `#!/bin/bash
#
# Phase 2 Test Migration Script
# Auto-generated: ${new Date().toISOString()}
#
# IMPORTANT: Review this script before execution
# Consider running in batches for better control
#
# This script performs:
# 1. Collocates unit tests with source files
# 2. Renames integration/performance/a11y tests  
# 3. Removes empty __tests__ directories
# 4. Validates all tests still pass
#

set -e  # Exit immediately if any command fails
set -u  # Treat unset variables as errors

echo "========================================"
echo "Phase 2: Test Location Standardization"
echo "========================================"
echo ""

# Verify we're in the workspace root
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "❌ Error: Not in workspace root directory"
  echo "   Please run this script from the workspace root"
  exit 1
fi

echo "✅ Workspace root verified"
echo ""

# Create a backup marker file with timestamp
BACKUP_MARKER=".migration-phase2-backup-$(date +%Y%m%d-%H%M%S)"
touch "$BACKUP_MARKER"
echo "📝 Created backup marker: $BACKUP_MARKER"
echo ""

# Phase 2a: Colocate Unit Tests
echo "========================================="
echo "Phase 2a: Collocating Unit Tests"
echo "========================================="
echo "Moving ${commands.colocate.length} unit test files to source directories"
echo ""

${this.generateGroupedCommands(commands.colocate, 'dirCategory')}

echo "✅ Unit test colocation complete"
echo ""

# Phase 2b: Rename Non-Unit Tests  
echo "========================================="
echo "Phase 2b: Renaming Integration Tests"
echo "========================================="
echo "Renaming ${commands.rename.length} test files with type suffixes"
echo ""

${this.generateGroupedCommands(commands.rename, 'category')}

echo "✅ Test renaming complete"
echo ""

# Phase 2c: Cleanup Empty Directories
echo "========================================="
echo "Phase 2c: Cleaning Up"
echo "========================================="
echo "Removing ${commands.delete.length} empty directories"
echo ""

${commands.delete.map(cmd => `echo "  📁 ${cmd.path}"\n${cmd.command}`).join('\n')}

echo ""
echo "✅ Cleanup complete"
echo ""

# Phase 2d: Validation
echo "========================================="
echo "Phase 2d: Validating Migration"
echo "========================================="
echo ""

${commands.verify.join('\n')}

echo ""
echo "========================================="
echo "✅ Migration Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review test output above"
echo "2. Commit changes if all tests pass"
echo "3. Remove old test files from __tests__"
echo "4. Update documentation"
echo ""
`;

    // Write script with executable permissions
    fs.writeFileSync(filename, script, { mode: 0o755 });
    return filename;
  }

  /**
   * Groups commands by a specified property and generates formatted
   * bash commands with section headers.
   * 
   * @param {Array} commands - Array of command objects
   * @param {string} groupBy - Property name to group by
   * @returns {string} Formatted bash commands with headers
   */
  generateGroupedCommands(commands, groupBy) {
    const grouped = {};
    
    // Group commands by the specified property
    commands.forEach(cmd => {
      const key = cmd[groupBy] || 'other';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(cmd);
    });

    let script = '';
    
    // Generate commands for each group with a descriptive header
    Object.keys(grouped).sort().forEach(groupName => {
      const groupCommands = grouped[groupName];
      script += `\n# ${groupName.toUpperCase()} (${groupCommands.length} files)\n`;
      script += `echo "  📦 ${groupName}: ${groupCommands.length} files"\n`;
      
      groupCommands.forEach(cmd => {
        script += `${cmd.command}\n`;
      });
    });

    return script;
  }

  /**
   * Main execution method that orchestrates the entire analysis process.
   * This method discovers all tests, generates the migration plan,
   * creates executable scripts, and produces detailed reports.
   */
  run() {
    console.log('\n📊 Phase 2 Migration Analysis');
    console.log('='.repeat(60));
    console.log(`Started: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));

    // Discover all test files across the workspace
    console.log('\n🔍 Discovering test files...\n');
    
    const clientTestDirs = this.findTestDirectories(CLIENT_SRC);
    console.log(`📁 client/src:`);
    console.log(`   Found ${clientTestDirs.length} test directories`);
    console.log(`   Total ${clientTestDirs.reduce((sum, d) => sum + d.files.length, 0)} test files`);
    
    const serverTestDirs = this.findTestDirectories(SERVER_SRC);
    console.log(`\n📁 server/src:`);
    console.log(`   Found ${serverTestDirs.length} test directories`);
    console.log(`   Total ${serverTestDirs.reduce((sum, d) => sum + d.files.length, 0)} test files`);
    
    const sharedTestDirs = this.findTestDirectories(SHARED_SRC);
    console.log(`\n📁 shared/src:`);
    console.log(`   Found ${sharedTestDirs.length} test directories`);
    console.log(`   Total ${sharedTestDirs.reduce((sum, d) => sum + d.files.length, 0)} test files`);

    const allTestDirs = [...clientTestDirs, ...serverTestDirs, ...sharedTestDirs];
    
    if (allTestDirs.length === 0) {
      console.log('\n⚠️  No test directories found. Nothing to migrate.');
      return;
    }

    // Generate migration plan
    console.log('\n📋 Generating migration plan...');
    const plan = this.generateMigrationPlan(allTestDirs);
    console.log(`   ↔️  Colocate: ${plan.colocate.length} unit tests`);
    console.log(`   ✏️  Rename: ${plan.rename.length} non-unit tests`);
    console.log(`   🗑️  Delete: ${plan.delete.length} empty directories`);

    // Generate executable commands
    console.log('\n⚙️  Generating migration commands...');
    const commands = this.generateCommands(plan);
    console.log(`   Generated ${commands.colocate.length} colocation commands`);
    console.log(`   Generated ${commands.rename.length} rename commands`);
    console.log(`   Generated ${commands.delete.length} cleanup commands`);

    // Create comprehensive report
    console.log('\n📈 Generating analysis report...');
    const report = this.generateReport(allTestDirs, plan, commands);
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total test files: ${report.summary.totalTestFiles}`);
    console.log(`   Total directories: ${report.summary.totalTestDirectories}`);
    console.log(`\n   By directory type:`);
    Object.entries(report.summary.byDirectoryType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count} files`);
    });

    // Write migration script
    console.log('\n📝 Writing migration script...');
    const scriptFile = this.writeMigrationScript(commands);
    console.log(`   ✅ Created: ${scriptFile}`);

    // Save detailed JSON report
    const detailsFile = 'phase2-migration-details.json';
    const detailedOutput = {
      metadata: {
        timestamp: report.timestamp,
        workspaceRoot: WORKSPACE_ROOT
      },
      summary: report,
      plan,
      commands,
      directories: allTestDirs
    };
    
    fs.writeFileSync(detailsFile, JSON.stringify(detailedOutput, null, 2));
    console.log(`   ✅ Created: ${detailsFile}`);

    // Display next steps
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(60));
    console.log('\n📋 Next Steps:\n');
    console.log('   1. Review the detailed plan in phase2-migration-details.json');
    console.log('   2. Examine the generated migrate-phase2.sh script');
    console.log('   3. Consider running migrations in batches for safety');
    console.log('   4. Create a git branch before executing migration');
    console.log('   5. Run: git checkout -b test-migration-phase2');
    console.log('   6. Execute: ./migrate-phase2.sh');
    console.log('   7. Validate: pnpm test --coverage');
    console.log('   8. Commit and create pull request for review\n');
    console.log('⚠️  Recommendation: Test on a small batch first!\n');
  }
}

// Script entry point - create analyzer instance and run
if (require.main === module) {
  try {
    const analyzer = new Phase2Analyzer();
    analyzer.run();
  } catch (error) {
    console.error('\n❌ Fatal error during analysis:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = Phase2Analyzer;