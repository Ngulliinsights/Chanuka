#!/usr/bin/env node
/**
 * ESLint Suppression Scanner
 * 
 * Scans the codebase for all ESLint suppressions and generates a detailed report.
 * Categorizes suppressions by rule and provides context for each instance.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ESLintSuppression {
  file: string;
  line: number;
  type: 'disable' | 'disable-next-line' | 'disable-line';
  rules: string[];
  comment: string;
  context: string;
  justification?: string;
}

interface ScanResult {
  totalSuppressions: number;
  byType: Record<string, number>;
  byRule: Record<string, number>;
  byFile: Record<string, number>;
  suppressions: ESLintSuppression[];
  timestamp: Date;
}

const SUPPRESSION_PATTERNS = [
  /\/\/\s*eslint-disable-next-line\s+(.+)/,
  /\/\/\s*eslint-disable-line\s+(.+)/,
  /\/\*\s*eslint-disable\s+(.+?)\s*\*\//,
  /\/\/\s*eslint-disable\s+(.+)/,
  /\/\*\s*eslint-disable\s*\*\//,
  /\/\/\s*eslint-disable\s*$/,
];

async function findSourceFiles(): Promise<string[]> {
  const patterns = [
    'client/src/**/*.{ts,tsx,js,jsx}',
    'server/**/*.{ts,tsx,js,jsx}',
    'shared/**/*.{ts,tsx,js,jsx}',
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
      ],
    });
    files.push(...matches);
  }

  return files;
}

function extractRules(comment: string): string[] {
  // Remove eslint-disable prefix
  const rulesStr = comment
    .replace(/eslint-disable(-next-line|-line)?/, '')
    .trim();

  if (!rulesStr || rulesStr === '') {
    return ['all'];
  }

  // Split by comma and clean up
  return rulesStr
    .split(',')
    .map(rule => rule.trim())
    .filter(rule => rule.length > 0);
}

function extractJustification(lines: string[], lineIndex: number): string | undefined {
  // Look for justification in comments above the suppression
  const justificationPatterns = [
    /\/\/\s*(JUSTIFICATION|REASON|WHY):\s*(.+)/i,
    /\/\*\s*(JUSTIFICATION|REASON|WHY):\s*(.+?)\s*\*\//i,
  ];

  for (let i = Math.max(0, lineIndex - 3); i < lineIndex; i++) {
    const line = lines[i];
    for (const pattern of justificationPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[2].trim();
      }
    }
  }

  return undefined;
}

function getContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
  const start = Math.max(0, lineIndex - contextLines);
  const end = Math.min(lines.length, lineIndex + contextLines + 1);
  
  return lines
    .slice(start, end)
    .map((line, idx) => {
      const actualLine = start + idx + 1;
      const marker = actualLine === lineIndex + 1 ? '>' : ' ';
      return `${marker} ${actualLine.toString().padStart(4, ' ')} | ${line}`;
    })
    .join('\n');
}

async function scanFile(filePath: string): Promise<ESLintSuppression[]> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const suppressions: ESLintSuppression[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of SUPPRESSION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const comment = match[0];
        const rulesStr = match[1] || '';
        const rules = extractRules(comment);
        
        let type: ESLintSuppression['type'];
        if (comment.includes('disable-next-line')) {
          type = 'disable-next-line';
        } else if (comment.includes('disable-line')) {
          type = 'disable-line';
        } else {
          type = 'disable';
        }

        suppressions.push({
          file: filePath,
          line: i + 1,
          type,
          rules,
          comment,
          context: getContext(lines, i),
          justification: extractJustification(lines, i),
        });

        break; // Only match one pattern per line
      }
    }
  }

  return suppressions;
}

async function scanAllFiles(): Promise<ScanResult> {
  console.log('🔍 Scanning for ESLint suppressions...\n');

  const files = await findSourceFiles();
  console.log(`Found ${files.length} source files to scan\n`);

  const allSuppressions: ESLintSuppression[] = [];

  for (const file of files) {
    const suppressions = await scanFile(file);
    allSuppressions.push(...suppressions);
  }

  // Calculate statistics
  const byType: Record<string, number> = {};
  const byRule: Record<string, number> = {};
  const byFile: Record<string, number> = {};

  for (const suppression of allSuppressions) {
    // Count by type
    byType[suppression.type] = (byType[suppression.type] || 0) + 1;

    // Count by rule
    for (const rule of suppression.rules) {
      byRule[rule] = (byRule[rule] || 0) + 1;
    }

    // Count by file
    byFile[suppression.file] = (byFile[suppression.file] || 0) + 1;
  }

  return {
    totalSuppressions: allSuppressions.length,
    byType,
    byRule,
    byFile,
    suppressions: allSuppressions,
    timestamp: new Date(),
  };
}

function generateTextReport(result: ScanResult): string {
  let report = '';

  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                 ESLINT SUPPRESSION SCAN REPORT                \n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  report += `Scan Date: ${result.timestamp.toISOString()}\n`;
  report += `Total Suppressions: ${result.totalSuppressions}\n\n`;

  // Summary by type
  report += '───────────────────────────────────────────────────────────────\n';
  report += 'SUPPRESSIONS BY TYPE\n';
  report += '───────────────────────────────────────────────────────────────\n';
  for (const [type, count] of Object.entries(result.byType).sort((a, b) => b[1] - a[1])) {
    report += `  ${type.padEnd(20)} ${count.toString().padStart(5)} instances\n`;
  }
  report += '\n';

  // Summary by rule
  report += '───────────────────────────────────────────────────────────────\n';
  report += 'SUPPRESSIONS BY RULE\n';
  report += '───────────────────────────────────────────────────────────────\n';
  for (const [rule, count] of Object.entries(result.byRule).sort((a, b) => b[1] - a[1])) {
    report += `  ${rule.padEnd(40)} ${count.toString().padStart(5)} instances\n`;
  }
  report += '\n';

  // Summary by file (top 20)
  report += '───────────────────────────────────────────────────────────────\n';
  report += 'TOP 20 FILES WITH MOST SUPPRESSIONS\n';
  report += '───────────────────────────────────────────────────────────────\n';
  const topFiles = Object.entries(result.byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  for (const [file, count] of topFiles) {
    report += `  ${count.toString().padStart(3)} | ${file}\n`;
  }
  report += '\n';

  // Detailed suppressions
  report += '═══════════════════════════════════════════════════════════════\n';
  report += 'DETAILED SUPPRESSION LIST\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  // Group by file
  const suppressionsByFile = result.suppressions.reduce((acc, s) => {
    if (!acc[s.file]) {
      acc[s.file] = [];
    }
    acc[s.file].push(s);
    return acc;
  }, {} as Record<string, ESLintSuppression[]>);

  for (const [file, suppressions] of Object.entries(suppressionsByFile).sort()) {
    report += `\n📄 ${file} (${suppressions.length} suppressions)\n`;
    report += '─'.repeat(70) + '\n';

    for (const suppression of suppressions.sort((a, b) => a.line - b.line)) {
      report += `\nLine ${suppression.line} | Type: ${suppression.type}\n`;
      report += `Rules: ${suppression.rules.join(', ')}\n`;
      if (suppression.justification) {
        report += `Justification: ${suppression.justification}\n`;
      } else {
        report += `⚠️  NO JUSTIFICATION PROVIDED\n`;
      }
      report += `\nContext:\n${suppression.context}\n`;
      report += '─'.repeat(70) + '\n';
    }
  }

  return report;
}

function generateJsonReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

function generateHtmlReport(result: ScanResult): string {
  const suppressionsWithoutJustification = result.suppressions.filter(s => !s.justification);
  const percentWithJustification = ((result.totalSuppressions - suppressionsWithoutJustification.length) / result.totalSuppressions * 100).toFixed(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESLint Suppression Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-card h3 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .section {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .section h2 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .warning {
      color: #f59e0b;
    }
    .error {
      color: #ef4444;
    }
    .success {
      color: #10b981;
    }
    .suppression-item {
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .suppression-item.no-justification {
      border-left-color: #f59e0b;
    }
    .code-context {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      margin: 10px 0;
    }
    .code-context .highlight {
      background: #264f78;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 ESLint Suppression Report</h1>
    <p>Generated: ${result.timestamp.toISOString()}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <h3>Total Suppressions</h3>
      <div class="value ${result.totalSuppressions > 10 ? 'error' : 'success'}">${result.totalSuppressions}</div>
    </div>
    <div class="stat-card">
      <h3>Target</h3>
      <div class="value">&lt; 10</div>
    </div>
    <div class="stat-card">
      <h3>With Justification</h3>
      <div class="value">${percentWithJustification}%</div>
    </div>
    <div class="stat-card">
      <h3>Files Affected</h3>
      <div class="value">${Object.keys(result.byFile).length}</div>
    </div>
  </div>

  <div class="section">
    <h2>Suppressions by Type</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(result.byType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => `
            <tr>
              <td>${type}</td>
              <td>${count}</td>
              <td>${((count / result.totalSuppressions) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Suppressions by Rule</h2>
    <table>
      <thead>
        <tr>
          <th>Rule</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(result.byRule)
          .sort((a, b) => b[1] - a[1])
          .map(([rule, count]) => `
            <tr>
              <td><code>${rule}</code></td>
              <td>${count}</td>
              <td>${((count / result.totalSuppressions) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Top Files with Most Suppressions</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(result.byFile)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([file, count]) => `
            <tr>
              <td><code>${file}</code></td>
              <td>${count}</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Detailed Suppressions</h2>
    ${Object.entries(result.suppressions.reduce((acc, s) => {
      if (!acc[s.file]) acc[s.file] = [];
      acc[s.file].push(s);
      return acc;
    }, {} as Record<string, ESLintSuppression[]>))
      .sort()
      .map(([file, suppressions]) => `
        <h3>📄 ${file}</h3>
        ${suppressions.sort((a, b) => a.line - b.line).map(s => `
          <div class="suppression-item ${!s.justification ? 'no-justification' : ''}">
            <div><strong>Line ${s.line}</strong> | Type: <code>${s.type}</code> | Rules: <code>${s.rules.join(', ')}</code></div>
            ${s.justification 
              ? `<div class="success">✓ Justification: ${s.justification}</div>` 
              : `<div class="warning">⚠️ NO JUSTIFICATION PROVIDED</div>`
            }
            <div class="code-context"><pre>${s.context.replace(/>/g, '&gt;').replace(/</g, '&lt;')}</pre></div>
          </div>
        `).join('')}
      `).join('')}
  </div>
</body>
</html>`;
}

async function main() {
  try {
    const result = await scanAllFiles();

    // Create reports directory
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate reports
    const textReport = generateTextReport(result);
    const jsonReport = generateJsonReport(result);
    const htmlReport = generateHtmlReport(result);

    // Write reports
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    await fs.promises.writeFile(
      path.join(reportsDir, `eslint-suppressions-${timestamp}.txt`),
      textReport
    );
    await fs.promises.writeFile(
      path.join(reportsDir, `eslint-suppressions-${timestamp}.json`),
      jsonReport
    );
    await fs.promises.writeFile(
      path.join(reportsDir, `eslint-suppressions.html`),
      htmlReport
    );

    // Print summary
    console.log('✅ Scan complete!\n');
    console.log(`Total Suppressions: ${result.totalSuppressions}`);
    console.log(`Target: < 10 suppressions\n`);
    
    if (result.totalSuppressions > 10) {
      console.log(`⚠️  ${result.totalSuppressions - 10} suppressions need to be fixed\n`);
    } else {
      console.log('✅ Target met!\n');
    }

    console.log('Reports generated:');
    console.log(`  - reports/eslint-suppressions-${timestamp}.txt`);
    console.log(`  - reports/eslint-suppressions-${timestamp}.json`);
    console.log(`  - reports/eslint-suppressions.html`);

    process.exit(result.totalSuppressions > 10 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error scanning for ESLint suppressions:', error);
    process.exit(1);
  }
}

main();
