#!/usr/bin/env tsx
/**
 * Client Type Safety Violation Scanner
 * 
 * Specialized scanner for client/src/ directory that provides detailed
 * categorization and prioritization for Phase 4 type safety fixes.
 * 
 * Usage:
 *   npm run scan:client-types
 *   tsx scripts/scan-client-type-violations.ts
 */

import { scanForViolations, generateScanResult, type TypeViolation, type ScanResult } from './scan-type-violations';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Extended types for client-specific analysis
interface ClientViolation extends TypeViolation {
  feature?: string;
  component?: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
}

interface ClientScanResult extends ScanResult {
  byFeature: Record<string, number>;
  byPriority: Record<string, number>;
  clientViolations: ClientViolation[];
}

/**
 * Extract feature name from client file path
 */
function extractFeature(filePath: string): string | undefined {
  const match = filePath.match(/client\/src\/features\/([^\/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Extract component name from file path
 */
function extractComponent(filePath: string): string | undefined {
  const match = filePath.match(/\/([^\/]+)\.(tsx?|jsx?)$/);
  return match ? match[1] : undefined;
}

/**
 * Assign priority based on location and category
 */
function assignPriority(violation: TypeViolation): 'p0' | 'p1' | 'p2' | 'p3' {
  const { file, category, severity } = violation;
  
  // P0: Critical severity in API or auth code
  if (severity === 'critical' || 
      (severity === 'high' && (file.includes('/api/') || file.includes('/auth/')))) {
    return 'p0';
  }
  
  // P1: High severity or API responses
  if (severity === 'high' || category === 'api_response') {
    return 'p1';
  }
  
  // P2: Medium severity or important features
  if (severity === 'medium' || 
      file.includes('/features/analytics/') ||
      file.includes('/features/bills/') ||
      file.includes('/features/community/')) {
    return 'p2';
  }
  
  // P3: Low severity or test code
  return 'p3';
}

/**
 * Scan client directory for violations
 */
async function scanClientViolations(): Promise<ClientViolation[]> {
  console.log('🔍 Scanning client/src/ for type safety violations...\n');
  
  const clientDir = 'client/src';
  if (!fs.existsSync(clientDir)) {
    console.error(`❌ Directory not found: ${clientDir}`);
    return [];
  }
  
  const violations: ClientViolation[] = [];
  
  try {
    // Find all TypeScript files in client/src
    const pattern = `${clientDir}/**/*.{ts,tsx}`;
    const files = await glob(pattern, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'] 
    });
    
    console.log(`📁 Scanning ${files.length} files in ${clientDir}...`);
    
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
            
            // Categorize
            const category = categorizeViolation(context, file);
            const severity = assignSeverity(file, category);
            
            // Extract feature and component
            const feature = extractFeature(file);
            const component = extractComponent(file);
            
            // Create client violation
            const violation: ClientViolation = {
              file,
              line: lineNumber,
              column,
              context: context || line,
              category,
              severity,
              feature,
              component,
              priority: 'p3', // Will be assigned below
            };
            
            // Assign priority
            violation.priority = assignPriority(violation);
            
            violations.push(violation);
          }
        }
      } catch (error: unknown) {
        console.error(`❌ Error reading file ${file}:`, error.message);
      }
    }
  } catch (error: unknown) {
    console.error(`❌ Error scanning ${clientDir}:`, error.message);
  }
  
  return violations;
}

/**
 * Get context lines around a specific line in a file
 */
function getContext(filePath: string, lineNumber: number): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - 3);
    const endLine = Math.min(lines.length, lineNumber + 2);
    
    return lines.slice(startLine, endLine).join('\n');
  } catch (error) {
    return '';
  }
}

/**
 * Categorize a violation based on its context
 */
function categorizeViolation(context: string, filePath: string): any {
  const lowerContext = context.toLowerCase();
  
  if (lowerContext.includes('enum') || 
      lowerContext.match(/status|role|type|level|state/i)) {
    return 'enum_conversion';
  }
  
  if (lowerContext.includes('[') && lowerContext.includes(']') ||
      lowerContext.includes('dynamic') ||
      lowerContext.includes('property')) {
    return 'dynamic_property';
  }
  
  if (lowerContext.includes('response') ||
      lowerContext.includes('api') ||
      lowerContext.includes('fetch') ||
      lowerContext.includes('axios')) {
    return 'api_response';
  }
  
  if (lowerContext.includes('db') ||
      lowerContext.includes('database') ||
      lowerContext.includes('query') ||
      lowerContext.includes('row')) {
    return 'database_operation';
  }
  
  if (filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/tests/')) {
    return 'test_code';
  }
  
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
function assignSeverity(filePath: string, category: unknown): unknown {
  if (category === 'test_code') {
    return 'low';
  }
  
  if (filePath.includes('/api/') ||
      filePath.includes('/auth/') ||
      category === 'api_response') {
    return 'high';
  }
  
  if (filePath.includes('/core/')) {
    return 'high';
  }
  
  return 'medium';
}

/**
 * Generate client-specific scan result
 */
function generateClientScanResult(violations: ClientViolation[]): ClientScanResult {
  const byCategory: Record<string, number> = {
    enum_conversion: 0,
    dynamic_property: 0,
    api_response: 0,
    database_operation: 0,
    type_assertion: 0,
    test_code: 0,
    other: 0,
  };
  
  const byFile: Record<string, number> = {};
  const byFeature: Record<string, number> = {};
  const byPriority: Record<string, number> = {
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
  };
  
  const bySeverity: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  for (const violation of violations) {
    byCategory[violation.category]++;
    bySeverity[violation.severity]++;
    byPriority[violation.priority]++;
    byFile[violation.file] = (byFile[violation.file] || 0) + 1;
    
    if (violation.feature) {
      byFeature[violation.feature] = (byFeature[violation.feature] || 0) + 1;
    }
  }
  
  return {
    timestamp: new Date(),
    totalViolations: violations.length,
    byCategory,
    byFile,
    bySeverity,
    byFeature,
    byPriority,
    violations,
    clientViolations: violations,
  };
}

/**
 * Save JSON report
 */
function saveJsonReport(result: ClientScanResult, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`📄 JSON report saved to: ${outputPath}`);
}

/**
 * Generate HTML dashboard
 */
function generateHtmlDashboard(result: ClientScanResult, outputPath: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Type Safety Violations Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; font-size: 16px; margin-bottom: 5px; }
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
    .priority-p0 { color: #dc2626; }
    .priority-p1 { color: #ea580c; }
    .priority-p2 { color: #f59e0b; }
    .priority-p3 { color: #10b981; }
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
    .badge-p0 { background: #fee2e2; color: #dc2626; }
    .badge-p1 { background: #ffedd5; color: #ea580c; }
    .badge-p2 { background: #fef3c7; color: #f59e0b; }
    .badge-p3 { background: #d1fae5; color: #10b981; }
    .context { font-family: 'Courier New', monospace; font-size: 11px; color: #666; white-space: pre-wrap; max-width: 400px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Client Type Safety Violations Report</h1>
    <div class="subtitle">Phase 4: Remaining Type Safety - client/src/ Analysis</div>
    <div class="timestamp">Generated: ${result.timestamp.toLocaleString()}</div>
    
    <div class="summary">
      <div class="card">
        <h2>Total Violations</h2>
        <div class="value">${result.totalViolations}</div>
      </div>
      <div class="card">
        <h2>P0 (Critical)</h2>
        <div class="value priority-p0">${result.byPriority.p0}</div>
      </div>
      <div class="card">
        <h2>P1 (High)</h2>
        <div class="value priority-p1">${result.byPriority.p1}</div>
      </div>
      <div class="card">
        <h2>P2 (Medium)</h2>
        <div class="value priority-p2">${result.byPriority.p2}</div>
      </div>
      <div class="card">
        <h2>P3 (Low)</h2>
        <div class="value priority-p3">${result.byPriority.p3}</div>
      </div>
    </div>
    
    <div class="chart">
      <h2>Violations by Feature</h2>
      <div class="bar-chart">
        ${Object.entries(result.byFeature)
          .sort(([, a], [, b]) => b - a)
          .map(([feature, count]) => {
            const percentage = (count / result.totalViolations) * 100;
            return `
              <div class="bar-item">
                <div class="bar-label">${feature}</div>
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
                  <div class="bar-fill" style="width: ${percentage}%; background: #8b5cf6;"></div>
                  <div class="bar-value">${count}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    
    <div class="chart">
      <h2>Top 15 Files with Most Violations</h2>
      <div class="bar-chart">
        ${Object.entries(result.byFile)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 15)
          .map(([file, count]) => {
            const percentage = (count / result.totalViolations) * 100;
            const fileName = file.replace('client/src/', '');
            return `
              <div class="bar-item">
                <div class="bar-label" title="${file}">${fileName.length > 40 ? '...' + fileName.slice(-37) : fileName}</div>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${percentage}%; background: #ec4899;"></div>
                  <div class="bar-value">${count}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    
    <div class="violations-table">
      <h2>All Violations (Sorted by Priority)</h2>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Category</th>
            <th>Feature</th>
            <th>File</th>
            <th>Line</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          ${result.clientViolations
            .sort((a, b) => {
              const priorityOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .slice(0, 150)
            .map(v => `
              <tr>
                <td><span class="badge badge-${v.priority}">${v.priority}</span></td>
                <td>${v.category.replace(/_/g, ' ')}</td>
                <td>${v.feature || '-'}</td>
                <td class="file-path" title="${v.file}">${v.file.replace('client/src/', '')}</td>
                <td>${v.line}:${v.column}</td>
                <td><div class="context">${v.context.substring(0, 150)}${v.context.length > 150 ? '...' : ''}</div></td>
              </tr>
            `)
            .join('')}
        </tbody>
      </table>
      ${result.clientViolations.length > 150 ? `<p style="padding: 20px; color: #666;">Showing first 150 of ${result.clientViolations.length} violations. See JSON report for complete list.</p>` : ''}
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
function printSummary(result: ClientScanResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLIENT TYPE SAFETY VIOLATIONS SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📅 Scan Date: ${result.timestamp.toLocaleString()}`);
  console.log(`\n🔢 Total Violations: ${result.totalViolations}`);
  
  console.log('\n🎯 By Priority:');
  console.log(`   🔴 P0 (Critical): ${result.byPriority.p0}`);
  console.log(`   🟠 P1 (High):     ${result.byPriority.p1}`);
  console.log(`   🟡 P2 (Medium):   ${result.byPriority.p2}`);
  console.log(`   🟢 P3 (Low):      ${result.byPriority.p3}`);
  
  console.log('\n📂 By Feature:');
  Object.entries(result.byFeature)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([feature, count]) => {
      console.log(`   ${feature.padEnd(20)}: ${count}`);
    });
  
  console.log('\n📈 By Category:');
  Object.entries(result.byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category.padEnd(20)}: ${count}`);
    });
  
  console.log('\n📁 Top 10 Files:');
  Object.entries(result.byFile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count]) => {
      const shortFile = file.replace('client/src/', '');
      console.log(`   ${count.toString().padStart(3)} - ${shortFile}`);
    });
  
  console.log('\n' + '='.repeat(60));
  
  // Priority recommendations
  const p0AndP1 = result.byPriority.p0 + result.byPriority.p1;
  if (p0AndP1 > 0) {
    console.log(`\n⚠️  PRIORITY: Fix ${p0AndP1} P0/P1 violations first`);
    console.log('   Focus on: API clients, authentication, and core utilities');
  }
  
  console.log('\n💡 Recommended Approach:');
  console.log('   Week 5: Fix features/ violations (~60% of total)');
  console.log('   Week 6: Fix core/ and lib/ violations (~30% of total)');
  console.log('   Week 6: Fix services/ violations (~10% of total)');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔍 Starting client type safety scan...\n');
  
  const violations = await scanClientViolations();
  const result = generateClientScanResult(violations);
  
  // Create output directory
  const outputDir = 'analysis-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save reports
  const jsonPath = path.join(outputDir, 'client-type-violations.json');
  const htmlPath = path.join(outputDir, 'client-type-violations.html');
  
  saveJsonReport(result, jsonPath);
  generateHtmlDashboard(result, htmlPath);
  printSummary(result);
  
  console.log(`\n✅ Scan complete! Open ${htmlPath} in your browser to view the dashboard.`);
  console.log(`📄 Full details available in ${jsonPath}`);
}

// Run if executed directly
main().catch(console.error);

export { scanClientViolations, generateClientScanResult, type ClientViolation, type ClientScanResult };
