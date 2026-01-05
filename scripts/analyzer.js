#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const MODES = {
  FAST: 'fast',      // Pattern only
  FULL: 'full',      // Pattern + Compilation
  COMPILE: 'compile' // Compilation only
};

class CodebaseAnalyzer {
  constructor(mode = MODES.FULL) {
    this.mode = mode;
    this.results = {
      pattern: null,
      compilation: null,
      combined: null
    };
  }

  async runPythonAnalysis() {
    console.log('🔍 Running pattern analysis...');

    // Check if Python script exists
    try {
      await fs.access('chanuka_error_extractor.py');
    } catch {
      throw new Error('chanuka_error_extractor.py not found in current directory');
    }

    return this.runCommand('python3', [
      'chanuka_error_extractor.py',
      '.',
      'pattern_errors.json'
    ], 'Python');
  }

  async runNodeAnalysis() {
    console.log('🔧 Running compilation analysis...');

    // Check if Node script exists
    try {
      await fs.access('extract_errors_monorepo.mjs');
    } catch {
      throw new Error('extract_errors_monorepo.mjs not found in current directory');
    }

    return this.runCommand('node', [
      'extract_errors_monorepo.mjs'
    ], 'Node');
  }

  async runCommand(command, args, label) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      const proc = spawn(command, args);

      // Capture output
      proc.stdout?.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output);
        stdout += output;
      });

      proc.stderr?.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(output);
        stderr += output;
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code === 0) {
          console.log(`✅ ${label} analysis completed in ${(duration / 1000).toFixed(2)}s\n`);
          resolve({ duration, success: true, stdout, stderr });
        } else {
          console.error(`❌ ${label} analysis failed with code ${code}\n`);
          // Don't reject - we want to continue even if one fails
          resolve({ duration, success: false, code, stdout, stderr });
        }
      });

      proc.on('error', (err) => {
        console.error(`❌ ${label} analysis error: ${err.message}\n`);
        resolve({ duration: 0, success: false, error: err.message });
      });
    });
  }

  async loadResults() {
    const results = {};

    try {
      const patternData = await fs.readFile('pattern_errors.json', 'utf8');
      results.pattern = JSON.parse(patternData);
      console.log(`📄 Loaded pattern results: ${results.pattern.errors?.length || 0} issues`);
    } catch (e) {
      console.warn('⚠️  Pattern results not available:', e.message);
    }

    try {
      const compilationData = await fs.readFile('codebase_errors.json', 'utf8');
      results.compilation = JSON.parse(compilationData);
      console.log(`📄 Loaded compilation results: ${results.compilation.errors?.length || 0} issues`);
    } catch (e) {
      console.warn('⚠️  Compilation results not available:', e.message);
    }

    return results;
  }

  combineResults(patternData, compilationData) {
    const combined = {
      metadata: {
        analyzedAt: new Date().toISOString(),
        mode: this.mode,
        tools: [],
        platform: process.platform,
        nodeVersion: process.version
      },
      summary: {
        total: 0,
        byTool: {},
        bySeverity: {},
        byModule: {},
        byType: {}
      },
      errors: []
    };

    // Add pattern errors
    if (patternData?.errors && Array.isArray(patternData.errors)) {
      combined.metadata.tools.push('pattern-scanner');
      combined.errors.push(...patternData.errors.map(e => ({
        ...e,
        source: 'pattern-scanner'
      })));
      combined.summary.byTool['pattern-scanner'] = patternData.errors.length;
    }

    // Add compilation errors
    if (compilationData?.errors && Array.isArray(compilationData.errors)) {
      combined.metadata.tools.push('typescript', 'eslint');
      combined.errors.push(...compilationData.errors.map(e => ({
        ...e,
        source: e.tool
      })));

      combined.summary.byTool['typescript'] =
        compilationData.errors.filter(e => e.tool === 'typescript').length;
      combined.summary.byTool['eslint'] =
        compilationData.errors.filter(e => e.tool === 'eslint').length;
    }

    // Calculate aggregates
    combined.summary.total = combined.errors.length;

    // Group by severity
    combined.errors.forEach(error => {
      const sev = error.severity || 'unknown';
      combined.summary.bySeverity[sev] = (combined.summary.bySeverity[sev] || 0) + 1;

      const mod = error.module || error.scope || 'unknown';
      combined.summary.byModule[mod] = (combined.summary.byModule[mod] || 0) + 1;

      const type = error.error_type || error.code || 'unknown';
      combined.summary.byType[type] = (combined.summary.byType[type] || 0) + 1;
    });

    return combined;
  }

  async analyze() {
    console.log('🚀 Chanuka Platform Code Analysis');
    console.log('=====================================');
    console.log(`Mode: ${this.mode.toUpperCase()}`);
    console.log(`Time: ${new Date().toLocaleString()}\n`);

    const startTime = Date.now();
    const timings = {};
    const results = { pattern: null, compilation: null };

    // Run based on mode
    try {
      if (this.mode === MODES.FAST || this.mode === MODES.FULL) {
        const patternResult = await this.runPythonAnalysis();
        timings.pattern = patternResult.duration;

        if (!patternResult.success) {
          console.error('⚠️  Pattern analysis had issues but continuing...');
        }
      }

      if (this.mode === MODES.COMPILE || this.mode === MODES.FULL) {
        const compileResult = await this.runNodeAnalysis();
        timings.compilation = compileResult.duration;

        if (!compileResult.success) {
          console.error('⚠️  Compilation analysis had issues but continuing...');
        }
      }

      // Load and combine results
      console.log('\n📊 Combining results...');
      const loadedResults = await this.loadResults();
      const combined = this.combineResults(loadedResults.pattern, loadedResults.compilation);

      // Save combined report
      await fs.writeFile(
        'combined_analysis.json',
        JSON.stringify(combined, null, 2)
      );
      console.log('✅ Combined report saved\n');

      // Print summary
      this.printSummary(combined, timings, Date.now() - startTime);

      return combined;
    } catch (error) {
      console.error('\n❌ Analysis failed:', error.message);
      throw error;
    }
  }

  printSummary(combined, timings, totalTime) {
    console.log('=====================================');
    console.log('📊 ANALYSIS COMPLETE');
    console.log('=====================================\n');

    console.log('⏱️  Execution Times:');
    if (timings.pattern) {
      console.log(`  Pattern scan: ${(timings.pattern / 1000).toFixed(2)}s`);
    }
    if (timings.compilation) {
      console.log(`  Compilation: ${(timings.compilation / 1000).toFixed(2)}s`);
    }
    console.log(`  Total: ${(totalTime / 1000).toFixed(2)}s\n`);

    console.log('📈 Results:');
    console.log(`  Total Issues: ${combined.summary.total}`);

    if (Object.keys(combined.summary.byTool).length > 0) {
      console.log('\n  By Tool:');
      Object.entries(combined.summary.byTool)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tool, count]) => {
          const percentage = ((count / combined.summary.total) * 100).toFixed(1);
          console.log(`    ${tool}: ${count} (${percentage}%)`);
        });
    }

    if (Object.keys(combined.summary.bySeverity).length > 0) {
      console.log('\n  By Severity:');
      const severityOrder = ['critical', 'error', 'warning', 'info', 'unknown'];
      const sortedSeverities = Object.entries(combined.summary.bySeverity)
        .sort((a, b) => {
          const orderA = severityOrder.indexOf(a[0]);
          const orderB = severityOrder.indexOf(b[0]);
          return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
        });

      sortedSeverities.forEach(([sev, count]) => {
        const icon = {
          critical: '🔴',
          error: '🟠',
          warning: '🟡',
          info: '🔵'
        }[sev] || '⚪';
        const percentage = ((count / combined.summary.total) * 100).toFixed(1);
        console.log(`    ${icon} ${sev}: ${count} (${percentage}%)`);
      });
    }

    if (Object.keys(combined.summary.byModule).length > 0) {
      console.log('\n  Top 5 Modules by Issue Count:');
      const sorted = Object.entries(combined.summary.byModule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      sorted.forEach(([mod, count]) => {
        const percentage = ((count / combined.summary.total) * 100).toFixed(1);
        console.log(`    ${mod}: ${count} (${percentage}%)`);
      });

      if (Object.keys(combined.summary.byModule).length > 5) {
        console.log(`    ... and ${Object.keys(combined.summary.byModule).length - 5} more`);
      }
    }

    console.log('\n📁 Output Files:');
    if (this.mode !== MODES.COMPILE) {
      console.log('  • pattern_errors.json');
    }
    if (this.mode !== MODES.FAST) {
      console.log('  • codebase_errors.json');
    }
    console.log('  • combined_analysis.json (unified report)');
    console.log('\n=====================================\n');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Chanuka Platform Code Analyzer

Usage:
  node analyzer.js [mode] [options]

Modes:
  fast     Pattern analysis only (fastest, ~30s)
  full     Pattern + Compilation (recommended, ~2-3min)
  compile  Compilation only (slowest, ~2min)

Options:
  -h, --help     Show this help message
  --version      Show version

Examples:
  node analyzer.js              # Run full analysis
  node analyzer.js fast         # Quick pattern scan
  node analyzer.js compile      # Deep compilation check

Output Files:
  pattern_errors.json       Pattern-based issues
  codebase_errors.json      TypeScript/ESLint issues
  combined_analysis.json    Unified report
    `);
    process.exit(0);
  }

  if (args.includes('--version')) {
    console.log('Chanuka Analyzer v2.0.0');
    process.exit(0);
  }

  const mode = args[0] || MODES.FULL;

  if (!Object.values(MODES).includes(mode)) {
    console.error(`❌ Invalid mode: ${mode}`);
    console.log('\nValid modes: fast, full, compile');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  const analyzer = new CodebaseAnalyzer(mode);

  try {
    await analyzer.analyze();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();