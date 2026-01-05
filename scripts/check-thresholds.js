#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

/**
 * Quality Gate Threshold Checker v2.0
 * Enforces code quality standards with configurable thresholds
 */

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // Global thresholds (applies to entire codebase)
  global: {
    critical: { max: 0, blocking: true },
    error: { max: 50, blocking: true },
    warning: { max: 200, blocking: false },
    info: { max: 500, blocking: false }
  },

  // Module-specific thresholds (overrides global for specific modules)
  modules: {
    shared: {
      critical: { max: 0, blocking: true },
      error: { max: 5, blocking: true },
      warning: { max: 20, blocking: true }
    },
    server: {
      critical: { max: 0, blocking: true },
      error: { max: 20, blocking: true },
      warning: { max: 50, blocking: false }
    },
    client: {
      critical: { max: 0, blocking: true },
      error: { max: 30, blocking: true },
      warning: { max: 100, blocking: false }
    }
  },

  // Error type thresholds (specific patterns to watch)
  errorTypes: {
    'TypeScript - any_usage': { max: 10, blocking: false },
    'TypeScript - ts_ignore': { max: 5, blocking: true },
    'TypeScript - non_null_assertion': { max: 20, blocking: false },
    'React - missing_key_prop': { max: 0, blocking: true },
    'React - direct_state_mutation': { max: 0, blocking: true },
    'Code Quality - FIXME': { max: 10, blocking: false },
    'Code Quality - BUG': { max: 0, blocking: true },
    'Code Quality - console.log': { max: 50, blocking: false }
  },

  // Trend thresholds (compared to baseline)
  trends: {
    enabled: true,
    baselineFile: 'quality-baseline.json',
    maxIncrease: {
      critical: 0,    // No new critical errors allowed
      error: 5,       // Max 5 new errors
      warning: 20,    // Max 20 new warnings
      total: 25       // Max 25 new issues total
    }
  },

  // Build configuration
  build: {
    failOnBlocking: true,
    createReport: true,
    reportFile: 'quality-gate-report.json',
    exitCode: {
      success: 0,
      nonBlocking: 0,
      blocking: 1
    }
  }
};

// ============================================================================
// QUALITY GATE CHECKER CLASS
// ============================================================================

class QualityGateChecker {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.violations = [];
    this.warnings = [];
    this.passed = true;
    this.stats = {
      checksRun: 0,
      checksPass: 0,
      checksFail: 0
    };
  }

  /**
   * Load analysis results
   */
  async loadResults(filePath = 'combined_analysis.json') {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const results = JSON.parse(data);

      if (!results.summary || !results.errors) {
        throw new Error('Invalid results format - missing summary or errors');
      }

      return results;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`❌ Results file not found: ${filePath}`);
        console.error('   Run the analyzer first: node analyzer.js');
      } else {
        console.error(`❌ Failed to load results: ${error.message}`);
      }
      process.exit(1);
    }
  }

  /**
   * Load baseline for trend comparison
   */
  async loadBaseline() {
    if (!this.config.trends.enabled) return null;

    try {
      const data = await fs.readFile(this.config.trends.baselineFile, 'utf8');
      const baseline = JSON.parse(data);
      console.log(`✅ Loaded baseline from: ${this.config.trends.baselineFile}\n`);
      return baseline;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`⚠️  No baseline found: ${this.config.trends.baselineFile}`);
        console.warn('   Create one with: cp combined_analysis.json quality-baseline.json\n');
      } else {
        console.warn(`⚠️  Failed to load baseline: ${error.message}\n`);
      }
      return null;
    }
  }

  /**
   * Check global severity thresholds
   */
  checkGlobalThresholds(results) {
    console.log('🔍 Checking global thresholds...');
    this.stats.checksRun++;

    const severities = results.summary.bySeverity || {};
    let passed = true;

    Object.entries(this.config.global).forEach(([severity, threshold]) => {
      const count = severities[severity] || 0;
      const status = count <= threshold.max ? '✅' : '❌';
      const trend = count <= threshold.max ? 'PASS' : 'FAIL';

      console.log(`   ${status} ${severity.padEnd(10)} ${count.toString().padStart(4)}/${threshold.max.toString().padStart(4)} [${trend}]`);

      if (count > threshold.max) {
        passed = false;
        const violation = {
          type: 'global',
          severity,
          current: count,
          max: threshold.max,
          excess: count - threshold.max,
          blocking: threshold.blocking
        };

        if (threshold.blocking) {
          this.violations.push(violation);
          this.passed = false;
        } else {
          this.warnings.push(violation);
        }
      }
    });

    if (passed) this.stats.checksPass++;
    else this.stats.checksFail++;
  }

  /**
   * Check module-specific thresholds
   */
  checkModuleThresholds(results) {
    console.log('\n🔍 Checking module-specific thresholds...');
    this.stats.checksRun++;

    const moduleErrors = this.groupErrorsByModule(results.errors || []);
    let passed = true;

    Object.entries(this.config.modules).forEach(([moduleName, thresholds]) => {
      const moduleData = moduleErrors[moduleName] || { bySeverity: {} };
      console.log(`\n   📦 ${moduleName}:`);

      Object.entries(thresholds).forEach(([severity, threshold]) => {
        const count = moduleData.bySeverity[severity] || 0;
        const status = count <= threshold.max ? '✅' : '❌';
        const trend = count <= threshold.max ? 'PASS' : 'FAIL';

        console.log(`      ${status} ${severity.padEnd(10)} ${count.toString().padStart(4)}/${threshold.max.toString().padStart(4)} [${trend}]`);

        if (count > threshold.max) {
          passed = false;
          const violation = {
            type: 'module',
            module: moduleName,
            severity,
            current: count,
            max: threshold.max,
            excess: count - threshold.max,
            blocking: threshold.blocking
          };

          if (threshold.blocking) {
            this.violations.push(violation);
            this.passed = false;
          } else {
            this.warnings.push(violation);
          }
        }
      });
    });

    if (passed) this.stats.checksPass++;
    else this.stats.checksFail++;
  }

  /**
   * Check specific error type thresholds
   */
  checkErrorTypeThresholds(results) {
    console.log('\n🔍 Checking error type thresholds...');
    this.stats.checksRun++;

    const errorTypes = results.summary.byType || {};
    let passed = true;
    let checkedTypes = 0;

    Object.entries(this.config.errorTypes).forEach(([errorType, threshold]) => {
      const count = errorTypes[errorType] || 0;

      if (count > 0 || count > threshold.max) {
        const status = count <= threshold.max ? '✅' : '❌';
        const trend = count <= threshold.max ? 'PASS' : 'FAIL';
        const shortType = errorType.length > 40 ? errorType.slice(0, 37) + '...' : errorType;

        console.log(`   ${status} ${shortType.padEnd(42)} ${count.toString().padStart(4)}/${threshold.max.toString().padStart(4)} [${trend}]`);
        checkedTypes++;
      }

      if (count > threshold.max) {
        passed = false;
        const violation = {
          type: 'errorType',
          errorType,
          current: count,
          max: threshold.max,
          excess: count - threshold.max,
          blocking: threshold.blocking
        };

        if (threshold.blocking) {
          this.violations.push(violation);
          this.passed = false;
        } else {
          this.warnings.push(violation);
        }
      }
    });

    if (checkedTypes === 0) {
      console.log('   ℹ️  No configured error types found in results');
    }

    if (passed) this.stats.checksPass++;
    else this.stats.checksFail++;
  }

  /**
   * Check trend thresholds (compared to baseline)
   */
  checkTrendThresholds(results, baseline) {
    if (!baseline || !this.config.trends.enabled) {
      console.log('\n⏭️  Skipping trend analysis (no baseline available)');
      return;
    }

    console.log('\n🔍 Checking quality trends vs baseline...');
    this.stats.checksRun++;

    const currentSeverities = results.summary.bySeverity || {};
    const baselineSeverities = baseline.summary?.bySeverity || {};
    let passed = true;

    Object.entries(this.config.trends.maxIncrease).forEach(([key, maxIncrease]) => {
      if (key === 'total') {
        const currentTotal = results.summary.total || 0;
        const baselineTotal = baseline.summary?.total || 0;
        const increase = currentTotal - baselineTotal;

        const status = increase <= maxIncrease ? '✅' : '❌';
        const trend = increase <= maxIncrease ? 'PASS' : 'FAIL';
        const sign = increase >= 0 ? '+' : '';

        console.log(`   ${status} Total        ${sign}${increase.toString().padStart(5)} (max: +${maxIncrease}) [${trend}]`);

        if (increase > maxIncrease) {
          passed = false;
          this.violations.push({
            type: 'trend',
            metric: 'total',
            baseline: baselineTotal,
            current: currentTotal,
            increase,
            maxIncrease,
            blocking: true
          });
          this.passed = false;
        }
      } else {
        const current = currentSeverities[key] || 0;
        const baselineValue = baselineSeverities[key] || 0;
        const increase = current - baselineValue;

        if (increase !== 0 || increase > maxIncrease) {
          const status = increase <= maxIncrease ? '✅' : '❌';
          const trend = increase <= maxIncrease ? 'PASS' : 'FAIL';
          const sign = increase >= 0 ? '+' : '';

          console.log(`   ${status} ${key.padEnd(12)} ${sign}${increase.toString().padStart(5)} (max: +${maxIncrease}) [${trend}]`);

          if (increase > maxIncrease) {
            passed = false;
            this.violations.push({
              type: 'trend',
              metric: key,
              baseline: baselineValue,
              current,
              increase,
              maxIncrease,
              blocking: true
            });
            this.passed = false;
          }
        }
      }
    });

    if (passed) this.stats.checksPass++;
    else this.stats.checksFail++;
  }

  /**
   * Group errors by module
   */
  groupErrorsByModule(errors) {
    const grouped = {};

    errors.forEach(error => {
      const module = error.module || error.scope || 'unknown';

      if (!grouped[module]) {
        grouped[module] = {
          total: 0,
          bySeverity: {},
          byType: {}
        };
      }

      grouped[module].total++;

      const severity = error.severity || 'unknown';
      grouped[module].bySeverity[severity] =
        (grouped[module].bySeverity[severity] || 0) + 1;

      const type = error.error_type || error.code || 'unknown';
      grouped[module].byType[type] =
        (grouped[module].byType[type] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Print detailed report
   */
  printReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 QUALITY GATE REPORT');
    console.log('='.repeat(70));

    // Summary statistics
    console.log('\n📈 Check Summary:');
    console.log(`   Total Checks: ${this.stats.checksRun}`);
    console.log(`   ✅ Passed: ${this.stats.checksPass}`);
    console.log(`   ❌ Failed: ${this.stats.checksFail}`);

    if (this.violations.length === 0 && this.warnings.length === 0) {
      console.log('\n🎉 All quality gates passed!');
      console.log('   No violations or warnings detected.');
    } else {
      if (this.violations.length > 0) {
        console.log('\n🚫 BLOCKING VIOLATIONS:');
        console.log('   The following violations must be fixed:\n');
        this.violations.forEach((v, i) => {
          console.log(`   ${i + 1}. ${this.formatViolation(v)}`);
        });
      }

      if (this.warnings.length > 0) {
        console.log('\n⚠️  NON-BLOCKING WARNINGS:');
        console.log('   Consider addressing these issues:\n');
        this.warnings.forEach((w, i) => {
          console.log(`   ${i + 1}. ${this.formatViolation(w)}`);
        });
      }
    }

    console.log('\n' + '='.repeat(70));

    if (!this.passed) {
      console.log('\n🚫 BUILD FAILED - Quality gates not met');
      console.log(`   Fix ${this.violations.length} blocking violation(s) above`);
    } else if (this.warnings.length > 0) {
      console.log('\n✅ BUILD PASSED - But please address warnings');
    } else {
      console.log('\n✅ BUILD PASSED - All quality gates met');
    }

    console.log('='.repeat(70) + '\n');
  }

  /**
   * Format violation for display
   */
  formatViolation(violation) {
    const lines = [];

    switch (violation.type) {
      case 'global':
        lines.push(`Global ${violation.severity} threshold exceeded`);
        lines.push(`      Current: ${violation.current} | Max: ${violation.max} | Excess: ${violation.excess}`);
        break;

      case 'module':
        lines.push(`Module '${violation.module}' ${violation.severity} threshold exceeded`);
        lines.push(`      Current: ${violation.current} | Max: ${violation.max} | Excess: ${violation.excess}`);
        break;

      case 'errorType':
        lines.push(`Error type '${violation.errorType}' threshold exceeded`);
        lines.push(`      Current: ${violation.current} | Max: ${violation.max} | Excess: ${violation.excess}`);
        break;

      case 'trend':
        lines.push(`Quality regression in '${violation.metric}'`);
        lines.push(`      Baseline: ${violation.baseline} | Current: ${violation.current}`);
        lines.push(`      Increase: +${violation.increase} (max allowed: +${violation.maxIncrease})`);
        break;

      default:
        lines.push(JSON.stringify(violation));
    }

    return lines.join('\n   ');
  }

  /**
   * Save detailed report to file
   */
  async saveReport(results, baseline) {
    if (!this.config.build.createReport) return;

    const report = {
      timestamp: new Date().toISOString(),
      passed: this.passed,
      summary: {
        totalViolations: this.violations.length,
        totalWarnings: this.warnings.length,
        blockingViolations: this.violations.filter(v => v.blocking).length,
        checksRun: this.stats.checksRun,
        checksPass: this.stats.checksPass,
        checksFail: this.stats.checksFail
      },
      violations: this.violations,
      warnings: this.warnings,
      configuration: this.config,
      results: {
        total: results.summary.total,
        bySeverity: results.summary.bySeverity,
        byModule: results.summary.byModule,
        byTool: results.summary.byTool
      },
      baseline: baseline ? {
        total: baseline.summary?.total,
        bySeverity: baseline.summary?.bySeverity
      } : null
    };

    try {
      await fs.writeFile(
        this.config.build.reportFile,
        JSON.stringify(report, null, 2)
      );
      console.log(`📄 Detailed report saved to: ${this.config.build.reportFile}`);
    } catch (error) {
      console.error(`⚠️  Failed to save report: ${error.message}`);
    }
  }

  /**
   * Run all checks
   */
  async check() {
    console.log('🚦 Starting Quality Gate Checks');
    console.log('='.repeat(70) + '\n');

    // Load results
    const results = await this.loadResults();
    console.log(`✅ Loaded analysis results: ${results.summary.total} total issues\n`);

    const baseline = await this.loadBaseline();

    // Run all checks
    this.checkGlobalThresholds(results);
    this.checkModuleThresholds(results);
    this.checkErrorTypeThresholds(results);
    this.checkTrendThresholds(results, baseline);

    // Print and save report
    this.printReport();
    await this.saveReport(results, baseline);

    // Determine exit code
    if (!this.passed && this.config.build.failOnBlocking) {
      return this.config.build.exitCode.blocking;
    } else if (this.warnings.length > 0) {
      return this.config.build.exitCode.nonBlocking;
    }
    return this.config.build.exitCode.success;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Quality Gate Threshold Checker v2.0

Usage:
  node check-thresholds.js [options]

Options:
  -c, --config <file>    Use custom configuration file
  -h, --help             Show this help message
  --version              Show version
  --init                 Create a sample config file

Examples:
  node check-thresholds.js
  node check-thresholds.js --config strict-config.json
  node check-thresholds.js --init

Configuration:
  Create a JSON file matching the DEFAULT_CONFIG structure.
  Use --init to generate a sample configuration file.

Exit Codes:
  0 - All checks passed (or only non-blocking warnings)
  1 - Blocking violations detected
    `);
    process.exit(0);
  }

  // Check for version flag
  if (args.includes('--version')) {
    console.log('Quality Gate Checker v2.0.0');
    process.exit(0);
  }

  // Check for init flag
  if (args.includes('--init')) {
    const configFile = 'quality-gate-config.json';
    try {
      await fs.writeFile(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.log(`✅ Created sample config: ${configFile}`);
      console.log('   Edit this file to customize your quality gates');
      process.exit(0);
    } catch (error) {
      console.error(`❌ Failed to create config: ${error.message}`);
      process.exit(1);
    }
  }

  // Load custom config if provided
  let config = DEFAULT_CONFIG;
  const configFlag = args.findIndex(arg => arg === '--config' || arg === '-c');

  if (configFlag !== -1 && args[configFlag + 1]) {
    try {
      const customConfigPath = args[configFlag + 1];
      const customConfigData = await fs.readFile(customConfigPath, 'utf8');
      config = JSON.parse(customConfigData);
      console.log(`✅ Loaded custom config: ${customConfigPath}\n`);
    } catch (error) {
      console.error(`❌ Failed to load custom config: ${error.message}`);
      process.exit(1);
    }
  }

  // Run checker
  const checker = new QualityGateChecker(config);

  try {
    const exitCode = await checker.check();
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
main();

export { QualityGateChecker, DEFAULT_CONFIG };