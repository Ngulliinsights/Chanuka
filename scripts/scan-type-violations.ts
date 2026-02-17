#!/usr/bin/env tsx
/**
 * Type Safety Violation Scanner
 * 
 * Scans the codebase for `as unknown` type assertions and categorizes them by:
 * - Type (enum, dynamic property, API response, database, etc.)
 * - Severity (critical, high, medium, low)
 * - Location (file, line, column)
 * 
 * Generates both JSON report and HTML dashboard for visualization.
 * 
 * Usage:
 *   npm run scan:type-violations
 *   tsx scripts/scan-type-violations.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Types
type ViolationCategory =
  | 'enum_conversion'
  | 'dynamic_property'
  | 'api_response'
  | 'database_operation'
  | 'type_assertion'
  | 'test_code'
  | 'other';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface TypeViolation {
  file: string;
  line: number;
  column: number;
  context: string;
  category: ViolationCategory;
  severity: Severity;
}

interface ScanResult {
  timestamp: Date;
  totalViolations: number;
  byCategory: Record<ViolationCategory, number>;
  byFile: Record<string, number>;
  bySeverity: Record<Severity, number>;
  violations: TypeViolation[];
}

// Configuration
const DIRECTORIES_TO_SCAN = ['client/src', 'server', 'shared'];
const CONTEXT_LINES = 2; // Lines of context to capture around violation

/**
 * Categorize a violation based on its context
 */
function categorizeViolation(context: string, filePath: string): ViolationCategory {
  const lowerContext = context.toLowerCase();
  
  // Check for enum conversions
  if (lowerContext.includes('enum') || 
      lowerContext.match(/status|role|type|level|state/i)) {
    return 'enum_conversion';
  }
  
  // Check for dynamic property access
  if (lowerContext.includes('[') && lowerContext.includes(']') ||
      lowerContext.includes('dynamic') ||
      lowerContext.includes('property')) {
    return 'dynamic_property';
  }
  
  // Check for API responses
  if (lowerContext.includes('response') ||
      lowerContext.includes('api') ||
      lowerContext.includes('fetch') ||
      lowerContext.includes('axios')) {
    return 'api_response';
  }
  
  // Check for database operations
  if (lowerContext.includes('db') ||
      lowerContext.includes('database') ||
      lowerContext.includes('query') ||
      lowerContext.includes('row') ||
      filePath.includes('database') ||
      filePath.includes('repository')) {
    return 'database_operation';
  }
  
  // Check for test code
  if (filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/tests/') ||
      filePath.includes('/__tests__/')) {
    return 'test_code';
  }
  
  // Check for type assertions
  if (lowerContext.includes('assert') ||
      lowerContext.includes('cast') ||
      lowerContext.includes('convert')) {
    return 'type_assertion';
  }
  
  return 'other';
}

/**
 * Assign severity based on location and category
 */
function assignSeverity(filePath: string, category: ViolationCategory): Severity {
  // Test code is low severity
  if (category === 'test_code') {
    return 'low';
  }
  
  // Server and shared code is high severity
  if (filePath.startsWith('server/') || filePath.startsWith('shared/')) {
    // Critical paths
    if (filePath.includes('authentication') ||
        filePath.includes('security') ||
        filePath.includes('database') ||
        filePath.includes('transformer') ||
        category === 'database_operation') {
      return 'critical';
    }
    return 'high';
  }
  
  // Client code is medium severity
  if (filePath.startsWith('client/')) {
    // High severity for critical client paths
    if (filePath.includes('api') ||
        filePath.includes('auth') ||
        category === 'api_response') {
      return 'high';
    }
    return 'medium';
  }
  
  return 'medium';
}

/**
 * Get context lines around a specific line in a file
 */
function getContext(filePath: string, lineNumber: number): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - CONTEXT_LINES - 1);
    const endLine = Math.min(lines.length, lineNumber + CONTEXT_LINES);
    
    return lines.slice(startLine, endLine).join('\n');
  } catch (error) {
    return '';
  }
}

/**
 * Scan for type violations using Node.js file system
 */
async function scanForViolations(): Promise<TypeViolation[]> {
  const violations: TypeViolation[] = [];
  
  for (const dir of DIRECTORIES_TO_SCAN) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Directory not found: ${dir}`);
      continue;
    }
    
    try {
      // Find all TypeScript files
      const pattern = `${dir}/**/*.{ts,tsx}`;
      const files = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'] });
      
      console.log(`📁 Scanning ${files.length} files in ${dir}...`);
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          
          // Search for `as unknown` in each line
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const regex = /\bas\s+any\b/g;
            let match;
            
            while ((match = regex.exec(line)) !== null) {
              const lineNumber = lineIndex + 1;
              const column = match.index + 1;
              
              // Get context
              const context = getContext(file, lineNumber);
              
              // Categorize and assign severity
              const category = categorizeViolation(context, file);
              const severity = assignSeverity(file, category);
              
              violations.push({
                file,
                line: lineNumber,
                column,
                context: context || line,
                category,
                severity,
              });
            }
          }
        } catch (error: unknown) {
          console.error(`❌ Error reading file ${file}:`, error.message);
        }
      }
    } catch (error: unknown) {
      console.error(`❌ Error scanning ${dir}:`, error.message);
    }
  }
  
  return violations;
}

/**
 * Generate scan result with statistics
 */
function generateScanResult(violations: TypeViolation[]): ScanResult {
  const byCategory: Record<ViolationCategory, number> = {
    enum_conversion: 0,
    dynamic_property: 0,
    api_response: 0,
    database_operation: 0,
    type_assertion: 0,
    test_code: 0,
    other: 0,
  };
  
  const byFile: Record<string, number> = {};
  
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  for (const violation of violations) {
    byCategory[violation.category]++;
    bySeverity[violation.severity]++;
    byFile[violation.file] = (byFile[violation.file] || 0) + 1;
  }
  
  return {
    timestamp: new Date(),
    totalViolations: violations.length,
    byCategory,
    byFile,
    bySeverity,
    violations,
  };
}

/**
 * Save JSON report
 */
function saveJsonReport(result: ScanResult, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`📄 JSON report saved to: ${outputPath}`);
}

/**
 * Generate HTML dashboard
 */
function generateHtmlDashboard(result: ScanResult, outputPath: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Type Safety Violations Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 10px; }
    .timestamp { color: #666; font-size: 14px; margin-bottom: 30px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h2 { font-size: 16px; color: #666; margin-bottom: 10px; }
    .card .value { font-size: 32px; font-weight: bold; color: #333; }
    .severity-critical { color: #dc2626; }
    .severity-high { color: #ea580c; }
    .severity-medium { color: #f59e0b; }
    .severity-low { color: #10b981; }
    .chart {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .chart h2 { font-size: 18px; margin-bottom: 15px; color: #333; }
    .bar-chart { display: flex; flex-direction: column; gap: 10px; }
    .bar-item { display: flex; align-items: center; gap: 10px; }
    .bar-label { min-width: 150px; font-size: 14px; color: #666; }
    .bar-container { flex: 1; background: #e5e7eb; height: 24px; border-radius: 4px; position: relative; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .bar-value { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: bold; color: white; }
    .violations-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .violations-table h2 { padding: 20px; font-size: 18px; color: #333; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #666; font-size: 14px; }
    td { font-size: 13px; color: #333; }
    .file-path { font-family: 'Courier New', monospace; font-size: 12px; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-high { background: #ffedd5; color: #ea580c; }
    .badge-medium { background: #fef3c7; color: #f59e0b; }
    .badge-low { background: #d1fae5; color: #10b981; }
    .context { font-family: 'Courier New', monospace; font-size: 11px; color: #666; white-space: pre-wrap; max-width: 400px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Type Safety Violations Report</h1>
    <div class="timestamp">Generated: ${result.timestamp.toLocaleString()}</div>
    
    <div class="summary">
      <div class="card">
        <h2>Total Violations</h2>
        <div class="value">${result.totalViolations}</div>
      </div>
      <div class="card">
        <h2>Critical</h2>
        <div class="value severity-critical">${result.bySeverity.critical}</div>
      </div>
      <div class="card">
        <h2>High</h2>
        <div class="value severity-high">${result.bySeverity.high}</div>
      </div>
      <div class="card">
        <h2>Medium</h2>
        <div class="value severity-medium">${result.bySeverity.medium}</div>
      </div>
      <div class="card">
        <h2>Low</h2>
        <div class="value severity-low">${result.bySeverity.low}</div>
      </div>
    </div>
    
    <div class="chart">
      <h2>Violations by Category</h2>
      <div class="bar-chart">
        ${Object.entries(result.byCategory)
          .sort(([, a], [, b]) => b - a)
          .map(([category, count]) => {
            const percentage = (count / result.totalViolations) * 100;
            return `
              <div class="bar-item">
                <div class="bar-label">${category.replace(/_/g, ' ')}</div>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${percentage}%; background: #3b82f6;"></div>
                  <div class="bar-value">${count}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    
    <div class="chart">
      <h2>Top 10 Files with Most Violations</h2>
      <div class="bar-chart">
        ${Object.entries(result.byFile)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([file, count]) => {
            const percentage = (count / result.totalViolations) * 100;
            return `
              <div class="bar-item">
                <div class="bar-label" title="${file}">${file.split('/').pop()}</div>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${percentage}%; background: #8b5cf6;"></div>
                  <div class="bar-value">${count}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    
    <div class="violations-table">
      <h2>All Violations (Sorted by Severity)</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Category</th>
            <th>File</th>
            <th>Line</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          ${result.violations
            .sort((a, b) => {
              const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return severityOrder[a.severity] - severityOrder[b.severity];
            })
            .slice(0, 100) // Limit to first 100 for performance
            .map(v => `
              <tr>
                <td><span class="badge badge-${v.severity}">${v.severity}</span></td>
                <td>${v.category.replace(/_/g, ' ')}</td>
                <td class="file-path" title="${v.file}">${v.file}</td>
                <td>${v.line}:${v.column}</td>
                <td><div class="context">${v.context.substring(0, 200)}${v.context.length > 200 ? '...' : ''}</div></td>
              </tr>
            `)
            .join('')}
        </tbody>
      </table>
      ${result.violations.length > 100 ? `<p style="padding: 20px; color: #666;">Showing first 100 of ${result.violations.length} violations. See JSON report for complete list.</p>` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
  
  fs.writeFileSync(outputPath, html);
  console.log(`📊 HTML dashboard saved to: ${outputPath}`);
}

/**
 * Print summary to console
 */
function printSummary(result: ScanResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TYPE SAFETY VIOLATIONS SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📅 Scan Date: ${result.timestamp.toLocaleString()}`);
  console.log(`\n🔢 Total Violations: ${result.totalViolations}`);
  
  console.log('\n📈 By Severity:');
  console.log(`   🔴 Critical: ${result.bySeverity.critical}`);
  console.log(`   🟠 High:     ${result.bySeverity.high}`);
  console.log(`   🟡 Medium:   ${result.bySeverity.medium}`);
  console.log(`   🟢 Low:      ${result.bySeverity.low}`);
  
  console.log('\n📂 By Category:');
  Object.entries(result.byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category.padEnd(20)}: ${count}`);
    });
  
  console.log('\n📁 Top 5 Files:');
  Object.entries(result.byFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([file, count]) => {
      console.log(`   ${count.toString().padStart(3)} - ${file}`);
    });
  
  console.log('\n' + '='.repeat(60));
  
  // Priority recommendations
  const criticalAndHigh = result.bySeverity.critical + result.bySeverity.high;
  if (criticalAndHigh > 0) {
    console.log(`\n⚠️  PRIORITY: Fix ${criticalAndHigh} critical/high severity violations first`);
    console.log('   Focus on: server/ and shared/ directories');
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔍 Scanning for type safety violations...\n');
  
  const violations = await scanForViolations();
  const result = generateScanResult(violations);
  
  // Create output directory
  const outputDir = 'analysis-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save reports
  const jsonPath = path.join(outputDir, 'type-violations.json');
  const htmlPath = path.join(outputDir, 'type-violations.html');
  
  saveJsonReport(result, jsonPath);
  generateHtmlDashboard(result, htmlPath);
  printSummary(result);
  
  console.log(`\n✅ Scan complete! Open ${htmlPath} in your browser to view the dashboard.`);
}

// Run if executed directly
main().catch(console.error);

export { scanForViolations, generateScanResult, type TypeViolation, type ScanResult };
