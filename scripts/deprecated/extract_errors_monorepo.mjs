#!/usr/bin/env node
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration for monorepo error extraction
 */
const CONFIG = {
  // Use --listFilesOnly to verify what TypeScript is checking
  tscCommand: 'npx tsc -b --noEmit --pretty false --extendedDiagnostics',

  // Explicitly specify file extensions and include all relevant directories
  eslintCommand: 'npx eslint "**/*.{js,jsx,ts,tsx,mjs,cjs}" --format json --max-warnings=0 --no-error-on-unmatched-pattern || true',

  outputFile: 'codebase_errors.json',
  debugFile: 'extraction_debug.log',
  maxBuffer: 1024 * 1024 * 100, // Increased to 100MB
  timeout: 600000, // 10 minutes
  validScopes: ['client', 'server', 'shared', 'drizzle', 'scripts', 'tools', 'tests', 'docs'],

  // Enable verbose logging
  verbose: true,
};

class ErrorExtractor {
  constructor() {
    this.startTime = Date.now();
    this.allErrors = [];
    this.debugLog = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logEntry);
    this.debugLog.push(logEntry);
  }

  identifyScope(filePath) {
    if (!filePath) return 'unknown';
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');

    // Check first part of path
    if (parts.length > 0 && CONFIG.validScopes.includes(parts[0])) {
      return parts[0];
    }

    // Deep check
    for (const scope of CONFIG.validScopes) {
      if (normalized.includes(`/${scope}/`) || normalized.startsWith(`${scope}/`)) {
        return scope;
      }
    }
    return 'root';
  }

  runCommand(cmd, label) {
    return new Promise((resolve) => {
      this.log(`Starting: ${label}`, 'info');
      this.log(`Command: ${cmd}`, 'debug');

      const startTime = Date.now();

      exec(cmd, {
        maxBuffer: CONFIG.maxBuffer,
        timeout: CONFIG.timeout,
        cwd: __dirname,
        // Ensure output is not buffered
        env: { ...process.env, FORCE_COLOR: '0' }
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;

        this.log(`Completed: ${label} in ${duration}ms`, 'info');
        this.log(`Stdout length: ${stdout.length} bytes`, 'debug');
        this.log(`Stderr length: ${stderr.length} bytes`, 'debug');

        if (CONFIG.verbose) {
          if (stdout.length > 0) {
            this.log(`First 500 chars of stdout: ${stdout.substring(0, 500).replace(/\n/g, '\\n')}`, 'debug');
          }
          if (stderr.length > 0) {
            this.log(`Stderr output: ${stderr.substring(0, 500).replace(/\n/g, '\\n')}`, 'debug');
          }
        }

        // Even if there's an error, we still want the output
        if (error && !stdout && !stderr) {
          this.log(`Command execution error: ${error.message}`, 'warn');
        }

        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          duration,
          exitCode: error?.code || 0
        });
      });
    });
  }

  parseTscOutput(output) {
    const errors = [];
    if (!output) {
      this.log('No TypeScript output to parse', 'warn');
      return errors;
    }

    const lines = output.split('\n');
    this.log(`Parsing ${lines.length} lines of TypeScript output`, 'debug');

    // Multiple regex patterns to catch different TSC output formats
    const patterns = [
      // Standard: path/to/file.ts(10,5): error TS2322: Message
      /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/,

      // Build Mode: path/to/file.ts:10:5 - error TS2322: Message
      /^(.+?):(\d+):(\d+)\s+-\s+(error|warning)\s+(TS\d+):\s+(.+)$/,

      // Compact format: file.ts(10,5): TS2322: Message
      /^(.+?)\((\d+),(\d+)\):\s+(TS\d+):\s+(.+)$/,

      // Without column: path/to/file.ts(10): error TS2322: Message
      /^(.+?)\((\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/,
    ];

    let matchedLines = 0;
    let skippedLines = 0;

    for (const line of lines) {
      const cleanLine = line.trim();

      // Skip empty lines and known non-error lines
      if (!cleanLine ||
          cleanLine.startsWith('>') ||
          cleanLine.startsWith('Projects in this build:') ||
          cleanLine.includes('Creating a build info') ||
          cleanLine.includes('Found') && cleanLine.includes('errors') ||
          cleanLine.match(/^\d+ errors?$/) ||
          cleanLine.match(/^Watching for file changes/)) {
        skippedLines++;
        continue;
      }

      let matched = false;
      for (let i = 0; i < patterns.length; i++) {
        const match = cleanLine.match(patterns[i]);

        if (match) {
          matched = true;
          matchedLines++;

          let filePath, lineNum, colNum, severity, code, message;

          if (patterns[i] === patterns[2]) {
            // Compact format (no error/warning keyword)
            [, filePath, lineNum, colNum, code, message] = match;
            severity = 'error'; // Default to error for compact format
          } else if (patterns[i] === patterns[3]) {
            // No column format
            [, filePath, lineNum, severity, code, message] = match;
            colNum = '1'; // Default column
          } else {
            // Standard formats
            [, filePath, lineNum, colNum, severity, code, message] = match;
          }

          errors.push({
            tool: 'typescript',
            scope: this.identifyScope(filePath),
            file: path.relative(process.cwd(), filePath),
            location: {
              line: parseInt(lineNum, 10),
              column: parseInt(colNum || '1', 10),
            },
            severity: severity || 'error',
            code: code,
            message: message.trim(),
          });
          break;
        }
      }

      if (!matched && cleanLine.includes('TS') && cleanLine.length > 10) {
        // Log unmatched lines that might be errors
        this.log(`Unmatched potential error line: ${cleanLine}`, 'warn');
      }
    }

    this.log(`TypeScript parsing: matched ${matchedLines} lines, skipped ${skippedLines} lines`, 'debug');
    return errors;
  }

  parseEslintOutput(output) {
    const errors = [];
    if (!output) {
      this.log('No ESLint output to parse', 'warn');
      return errors;
    }

    try {
      // Try to find JSON array in output
      const jsonStart = output.indexOf('[');
      const jsonEnd = output.lastIndexOf(']');

      if (jsonStart === -1 || jsonEnd === -1) {
        this.log('No JSON array found in ESLint output', 'warn');
        this.log(`Output preview: ${output.substring(0, 200)}`, 'debug');
        return errors;
      }

      const jsonStr = output.substring(jsonStart, jsonEnd + 1);
      this.log(`Parsing ESLint JSON (${jsonStr.length} chars)`, 'debug');

      const results = JSON.parse(jsonStr);
      this.log(`ESLint returned ${results.length} file results`, 'debug');

      let totalMessages = 0;
      results.forEach((fileResult) => {
        // Count all messages
        if (fileResult.messages) {
          totalMessages += fileResult.messages.length;
        }

        // Skip files with no messages
        if (!fileResult.messages || fileResult.messages.length === 0) return;

        const relativePath = path.relative(process.cwd(), fileResult.filePath);
        const scope = this.identifyScope(relativePath);

        fileResult.messages.forEach((msg) => {
          errors.push({
            tool: 'eslint',
            scope: scope,
            file: relativePath,
            location: {
              line: msg.line || 0,
              column: msg.column || 0,
              endLine: msg.endLine,
              endColumn: msg.endColumn,
            },
            severity: msg.severity === 2 ? 'error' : 'warning',
            code: msg.ruleId || 'unknown',
            message: msg.message,
            ruleUrl: msg.ruleId ? `https://eslint.org/docs/rules/${msg.ruleId}` : null,
            fixable: msg.fix ? true : false,
          });
        });
      });

      this.log(`ESLint found ${totalMessages} total messages across ${results.length} files`, 'debug');

    } catch (e) {
      this.log(`Failed to parse ESLint JSON: ${e.message}`, 'error');
      this.log(`JSON parse error at: ${e.stack}`, 'debug');

      // Try to recover partial data
      try {
        const lines = output.split('\n');
        this.log(`Attempting line-by-line ESLint parsing of ${lines.length} lines`, 'debug');
        // Could implement fallback parsing here
      } catch (fallbackError) {
        this.log(`Fallback parsing also failed: ${fallbackError.message}`, 'error');
      }
    }
    return errors;
  }

  generateStats(errors) {
    const stats = {
      total: errors.length,
      byTool: {},
      byScope: {},
      bySeverity: {},
      byCode: {}
    };

    errors.forEach(e => {
      stats.byTool[e.tool] = (stats.byTool[e.tool] || 0) + 1;
      stats.byScope[e.scope] = (stats.byScope[e.scope] || 0) + 1;
      stats.bySeverity[e.severity] = (stats.bySeverity[e.severity] || 0) + 1;
      stats.byCode[e.code] = (stats.byCode[e.code] || 0) + 1;
    });

    // Sort by count
    stats.topErrors = Object.entries(stats.byCode)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    return stats;
  }

  async saveDebugLog() {
    try {
      await fs.writeFile(CONFIG.debugFile, this.debugLog.join('\n'));
      this.log(`Debug log saved to: ${CONFIG.debugFile}`, 'info');
    } catch (e) {
      console.error('Failed to save debug log:', e);
    }
  }

  async run() {
    console.log('🔍 Starting Enhanced Monorepo Error Extraction');
    console.log('='.repeat(60));

    // 1. TypeScript
    const tsResult = await this.runCommand(CONFIG.tscCommand, 'Running TypeScript');

    // Check both stdout and stderr for TypeScript output
    const tscOutput = tsResult.stdout || tsResult.stderr;
    const tsErrors = this.parseTscOutput(tscOutput);

    this.log(`TypeScript: Found ${tsErrors.length} issues`, 'info');
    this.allErrors.push(...tsErrors);

    // 2. ESLint
    const eslintResult = await this.runCommand(CONFIG.eslintCommand, 'Running ESLint');
    const eslintErrors = this.parseEslintOutput(eslintResult.stdout);

    this.log(`ESLint: Found ${eslintErrors.length} issues`, 'info');
    this.allErrors.push(...eslintErrors);

    // 3. Generate statistics
    const stats = this.generateStats(this.allErrors);

    // Sort errors for better readability
    this.allErrors.sort((a, b) => {
      if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.location.line - b.location.line;
    });

    // 4. Save report
    const report = {
      metadata: {
        date: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        config: {
          tscCommand: CONFIG.tscCommand,
          eslintCommand: CONFIG.eslintCommand,
        }
      },
      stats,
      errors: this.allErrors
    };

    await fs.writeFile(CONFIG.outputFile, JSON.stringify(report, null, 2));

    // 5. Save debug log
    await this.saveDebugLog();

    // 6. Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`📊 SUMMARY`);
    console.log(`   Total Errors: ${stats.total}`);
    console.log(`   - TypeScript: ${stats.byTool.typescript || 0}`);
    console.log(`   - ESLint:     ${stats.byTool.eslint || 0}`);
    console.log(`\n   By Severity:`);
    console.log(`   - Errors:   ${stats.bySeverity.error || 0}`);
    console.log(`   - Warnings: ${stats.bySeverity.warning || 0}`);
    console.log(`\n   By Scope:`);
    Object.entries(stats.byScope)
      .sort((a, b) => b[1] - a[1])
      .forEach(([scope, count]) => {
        console.log(`   - ${scope.padEnd(12)}: ${count}`);
      });

    if (stats.topErrors && stats.topErrors.length > 0) {
      console.log(`\n   Top 10 Error Codes:`);
      stats.topErrors.forEach(({ code, count }) => {
        console.log(`   - ${code.padEnd(20)}: ${count}`);
      });
    }

    console.log(`\n📁 Report saved to: ${CONFIG.outputFile}`);
    console.log(`🐛 Debug log saved to: ${CONFIG.debugFile}`);
    console.log('='.repeat(60));
  }
}

// Execute
new ErrorExtractor().run().catch(e => {
  console.error('Fatal Error:', e);
  process.exit(1);
});