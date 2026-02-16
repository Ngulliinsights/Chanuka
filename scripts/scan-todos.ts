#!/usr/bin/env tsx
/**
 * TODO/FIXME/HACK Scanner
 * 
 * Scans the codebase for TODO/FIXME/HACK/XXX comments and categorizes them by:
 * - Type (missing feature, known bug, workaround, documentation)
 * - Priority (critical, high, medium, low)
 * - Location (file, line, column)
 * 
 * Generates both JSON report and HTML dashboard for visualization.
 * 
 * Usage:
 *   npm run scan:todos
 *   tsx scripts/scan-todos.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Types
type TodoType =
  | 'missing_feature'
  | 'known_bug'
  | 'workaround'
  | 'documentation'
  | 'refactor'
  | 'optimization'
  | 'other';

type Priority = 'critical' | 'high' | 'medium' | 'low';

type CommentKeyword = 'TODO' | 'FIXME' | 'HACK' | 'XXX';

interface TodoComment {
  file: string;
  line: number;
  column: number;
  keyword: CommentKeyword;
  message: string;
  context: string;
  type: TodoType;
  priority: Priority;
}

interface ScanResult {
  timestamp: Date;
  totalComments: number;
  byKeyword: Record<CommentKeyword, number>;
  byType: Record<TodoType, number>;
  byPriority: Record<Priority, number>;
  byFile: Record<string, number>;
  comments: TodoComment[];
}

// Configuration
const DIRECTORIES_TO_SCAN = ['client/src', 'server', 'shared', 'tests'];
const CONTEXT_LINES = 2; // Lines of context to capture around comment

/**
 * Categorize a TODO comment based on its message and context
 */
function categorizeTodo(
  keyword: CommentKeyword,
  message: string,
  context: string,
  filePath: string
): TodoType {
  const lowerMessage = message.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  // Check for known bugs (FIXME is usually a bug)
  if (keyword === 'FIXME' ||
      lowerMessage.includes('bug') ||
      lowerMessage.includes('broken') ||
      lowerMessage.includes('fix') ||
      lowerMessage.includes('error') ||
      lowerMessage.includes('issue') ||
      lowerMessage.includes('crash')) {
    return 'known_bug';
  }
  
  // Check for workarounds (HACK is usually a workaround)
  if (keyword === 'HACK' ||
      lowerMessage.includes('workaround') ||
      lowerMessage.includes('temporary') ||
      lowerMessage.includes('hack') ||
      lowerMessage.includes('quick fix') ||
      lowerMessage.includes('bandaid')) {
    return 'workaround';
  }
  
  // Check for missing features
  if (lowerMessage.includes('implement') ||
      lowerMessage.includes('add') ||
      lowerMessage.includes('create') ||
      lowerMessage.includes('missing') ||
      lowerMessage.includes('need') ||
      lowerMessage.includes('should') ||
      lowerMessage.includes('feature')) {
    return 'missing_feature';
  }
  
  // Check for refactoring
  if (lowerMessage.includes('refactor') ||
      lowerMessage.includes('cleanup') ||
      lowerMessage.includes('simplify') ||
      lowerMessage.includes('improve') ||
      lowerMessage.includes('reorganize')) {
    return 'refactor';
  }
  
  // Check for optimization
  if (lowerMessage.includes('optimize') ||
      lowerMessage.includes('performance') ||
      lowerMessage.includes('slow') ||
      lowerMessage.includes('cache') ||
      lowerMessage.includes('efficient')) {
    return 'optimization';
  }
  
  // Check for documentation
  if (lowerMessage.includes('document') ||
      lowerMessage.includes('comment') ||
      lowerMessage.includes('explain') ||
      lowerMessage.includes('describe') ||
      lowerMessage.includes('note') ||
      lowerMessage.match(/^[A-Z][a-z]+:/) || // Looks like a note
      lowerMessage.length < 20) { // Short comments are often notes
    return 'documentation';
  }
  
  return 'other';
}

/**
 * Assign priority based on keyword, type, and location
 */
function assignPriority(
  keyword: CommentKeyword,
  type: TodoType,
  message: string,
  filePath: string
): Priority {
  const lowerMessage = message.toLowerCase();
  
  // Critical priority indicators
  if (keyword === 'FIXME' && type === 'known_bug') {
    if (lowerMessage.includes('critical') ||
        lowerMessage.includes('urgent') ||
        lowerMessage.includes('asap') ||
        lowerMessage.includes('blocker') ||
        lowerMessage.includes('crash') ||
        lowerMessage.includes('security')) {
      return 'critical';
    }
  }
  
  // High priority
  if (type === 'known_bug' ||
      (type === 'workaround' && keyword === 'HACK') ||
      lowerMessage.includes('important') ||
      lowerMessage.includes('must') ||
      lowerMessage.includes('required')) {
    // Server and shared code gets higher priority
    if (filePath.startsWith('server/') || filePath.startsWith('shared/')) {
      return 'high';
    }
    return 'high';
  }
  
  // Medium priority
  if (type === 'missing_feature' ||
      type === 'refactor' ||
      type === 'workaround') {
    return 'medium';
  }
  
  // Low priority
  if (type === 'documentation' ||
      type === 'optimization') {
    return 'low';
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
 * Extract TODO message from comment line
 */
function extractMessage(line: string, keyword: CommentKeyword): string {
  // Match various comment styles: //, /*, *, #
  const patterns = [
    new RegExp(`//\\s*${keyword}:?\\s*(.+)$`, 'i'),
    new RegExp(`/\\*\\s*${keyword}:?\\s*(.+?)\\*/`, 'i'),
    new RegExp(`\\*\\s*${keyword}:?\\s*(.+)$`, 'i'),
    new RegExp(`#\\s*${keyword}:?\\s*(.+)$`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: return everything after the keyword
  const keywordIndex = line.toUpperCase().indexOf(keyword);
  if (keywordIndex !== -1) {
    return line.substring(keywordIndex + keyword.length).replace(/^[:\s]+/, '').trim();
  }
  
  return line.trim();
}

/**
 * Scan for TODO comments using Node.js file system
 */
async function scanForTodos(): Promise<TodoComment[]> {
  const comments: TodoComment[] = [];
  const keywords: CommentKeyword[] = ['TODO', 'FIXME', 'HACK', 'XXX'];
  
  for (const dir of DIRECTORIES_TO_SCAN) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Directory not found: ${dir}`);
      continue;
    }
    
    try {
      // Find all source files
      const pattern = `${dir}/**/*.{ts,tsx,js,jsx,css,scss,html,md}`;
      const files = await glob(pattern, { 
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/build/**'] 
      });
      
      console.log(`📁 Scanning ${files.length} files in ${dir}...`);
      
      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          
          // Search for TODO/FIXME/HACK/XXX in each line
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            for (const keyword of keywords) {
              // Case-insensitive search for keyword
              const regex = new RegExp(`\\b${keyword}\\b`, 'i');
              const match = regex.exec(line);
              
              if (match) {
                const lineNumber = lineIndex + 1;
                const column = match.index + 1;
                
                // Extract message
                const message = extractMessage(line, keyword);
                
                // Get context
                const context = getContext(file, lineNumber);
                
                // Categorize and assign priority
                const type = categorizeTodo(keyword, message, context, file);
                const priority = assignPriority(keyword, type, message, file);
                
                comments.push({
                  file,
                  line: lineNumber,
                  column,
                  keyword,
                  message,
                  context: context || line,
                  type,
                  priority,
                });
                
                // Only match once per line
                break;
              }
            }
          }
        } catch (error: any) {
          console.error(`❌ Error reading file ${file}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error scanning ${dir}:`, error.message);
    }
  }
  
  return comments;
}

/**
 * Generate scan result with statistics
 */
function generateScanResult(comments: TodoComment[]): ScanResult {
  const byKeyword: Record<CommentKeyword, number> = {
    TODO: 0,
    FIXME: 0,
    HACK: 0,
    XXX: 0,
  };
  
  const byType: Record<TodoType, number> = {
    missing_feature: 0,
    known_bug: 0,
    workaround: 0,
    documentation: 0,
    refactor: 0,
    optimization: 0,
    other: 0,
  };
  
  const byPriority: Record<Priority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  const byFile: Record<string, number> = {};
  
  for (const comment of comments) {
    byKeyword[comment.keyword]++;
    byType[comment.type]++;
    byPriority[comment.priority]++;
    byFile[comment.file] = (byFile[comment.file] || 0) + 1;
  }
  
  return {
    timestamp: new Date(),
    totalComments: comments.length,
    byKeyword,
    byType,
    byPriority,
    byFile,
    comments,
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
  <title>TODO/FIXME/HACK Comments Report</title>
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
    .priority-critical { color: #dc2626; }
    .priority-high { color: #ea580c; }
    .priority-medium { color: #f59e0b; }
    .priority-low { color: #10b981; }
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
    .comments-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .comments-table h2 { padding: 20px; font-size: 18px; color: #333; border-bottom: 1px solid #e5e7eb; }
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
    .badge-TODO { background: #dbeafe; color: #2563eb; }
    .badge-FIXME { background: #fee2e2; color: #dc2626; }
    .badge-HACK { background: #fef3c7; color: #f59e0b; }
    .badge-XXX { background: #fce7f3; color: #db2777; }
    .message { font-size: 12px; color: #666; max-width: 400px; }
    .filters {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      display: flex;
      gap: 15px;
      align-items: center;
    }
    .filters label { font-size: 14px; color: #666; }
    .filters select {
      padding: 6px 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      background: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 TODO/FIXME/HACK Comments Report</h1>
    <div class="timestamp">Generated: ${result.timestamp.toLocaleString()}</div>
    
    <div class="summary">
      <div class="card">
        <h2>Total Comments</h2>
        <div class="value">${result.totalComments}</div>
      </div>
      <div class="card">
        <h2>Critical</h2>
        <div class="value priority-critical">${result.byPriority.critical}</div>
      </div>
      <div class="card">
        <h2>High Priority</h2>
        <div class="value priority-high">${result.byPriority.high}</div>
      </div>
      <div class="card">
        <h2>Medium Priority</h2>
        <div class="value priority-medium">${result.byPriority.medium}</div>
      </div>
      <div class="card">
        <h2>Low Priority</h2>
        <div class="value priority-low">${result.byPriority.low}</div>
      </div>
    </div>
    
    <div class="chart">
      <h2>Comments by Keyword</h2>
      <div class="bar-chart">
        ${Object.entries(result.byKeyword)
          .sort(([, a], [, b]) => b - a)
          .map(([keyword, count]) => {
            const percentage = (count / result.totalComments) * 100;
            const colors: Record<string, string> = {
              TODO: '#3b82f6',
              FIXME: '#dc2626',
              HACK: '#f59e0b',
              XXX: '#db2777',
            };
            return `
              <div class="bar-item">
                <div class="bar-label">${keyword}</div>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${percentage}%; background: ${colors[keyword]};"></div>
                  <div class="bar-value">${count}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    
    <div class="chart">
      <h2>Comments by Type</h2>
      <div class="bar-chart">
        ${Object.entries(result.byType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const percentage = (count / result.totalComments) * 100;
            return `
              <div class="bar-item">
                <div class="bar-label">${type.replace(/_/g, ' ')}</div>
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
      <h2>Top 10 Files with Most Comments</h2>
      <div class="bar-chart">
        ${Object.entries(result.byFile)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([file, count]) => {
            const percentage = (count / result.totalComments) * 100;
            return `
              <div class="bar-item">
                <div class="bar-label" title="${file}">${file.split('/').pop()}</div>
                <div class="bar-container">
                  <div class="bar-fill" style="width: ${percentage}%; background: #10b981;"></div>
                  <div class="bar-value">${count}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    
    <div class="filters">
      <label>Filter by Priority:</label>
      <select id="priorityFilter" onchange="filterTable()">
        <option value="all">All</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      
      <label>Filter by Type:</label>
      <select id="typeFilter" onchange="filterTable()">
        <option value="all">All</option>
        <option value="known_bug">Known Bug</option>
        <option value="missing_feature">Missing Feature</option>
        <option value="workaround">Workaround</option>
        <option value="documentation">Documentation</option>
        <option value="refactor">Refactor</option>
        <option value="optimization">Optimization</option>
        <option value="other">Other</option>
      </select>
      
      <label>Filter by Keyword:</label>
      <select id="keywordFilter" onchange="filterTable()">
        <option value="all">All</option>
        <option value="TODO">TODO</option>
        <option value="FIXME">FIXME</option>
        <option value="HACK">HACK</option>
        <option value="XXX">XXX</option>
      </select>
    </div>
    
    <div class="comments-table">
      <h2>All Comments (Sorted by Priority)</h2>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Keyword</th>
            <th>Type</th>
            <th>File</th>
            <th>Line</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody id="commentsTableBody">
          ${result.comments
            .sort((a, b) => {
              const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .map(c => `
              <tr data-priority="${c.priority}" data-type="${c.type}" data-keyword="${c.keyword}">
                <td><span class="badge badge-${c.priority}">${c.priority}</span></td>
                <td><span class="badge badge-${c.keyword}">${c.keyword}</span></td>
                <td>${c.type.replace(/_/g, ' ')}</td>
                <td class="file-path" title="${c.file}">${c.file}</td>
                <td>${c.line}</td>
                <td><div class="message">${c.message}</div></td>
              </tr>
            `)
            .join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <script>
    function filterTable() {
      const priorityFilter = document.getElementById('priorityFilter').value;
      const typeFilter = document.getElementById('typeFilter').value;
      const keywordFilter = document.getElementById('keywordFilter').value;
      const rows = document.querySelectorAll('#commentsTableBody tr');
      
      rows.forEach(row => {
        const priority = row.getAttribute('data-priority');
        const type = row.getAttribute('data-type');
        const keyword = row.getAttribute('data-keyword');
        
        const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;
        const matchesType = typeFilter === 'all' || type === typeFilter;
        const matchesKeyword = keywordFilter === 'all' || keyword === keywordFilter;
        
        if (matchesPriority && matchesType && matchesKeyword) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  </script>
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
  console.log('📊 TODO/FIXME/HACK COMMENTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📅 Scan Date: ${result.timestamp.toLocaleString()}`);
  console.log(`\n🔢 Total Comments: ${result.totalComments}`);
  
  console.log('\n📈 By Priority:');
  console.log(`   🔴 Critical: ${result.byPriority.critical}`);
  console.log(`   🟠 High:     ${result.byPriority.high}`);
  console.log(`   🟡 Medium:   ${result.byPriority.medium}`);
  console.log(`   🟢 Low:      ${result.byPriority.low}`);
  
  console.log('\n🏷️  By Keyword:');
  Object.entries(result.byKeyword)
    .sort(([, a], [, b]) => b - a)
    .forEach(([keyword, count]) => {
      console.log(`   ${keyword.padEnd(10)}: ${count}`);
    });
  
  console.log('\n📂 By Type:');
  Object.entries(result.byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type.padEnd(20)}: ${count}`);
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
  const bugsAndWorkarounds = result.byType.known_bug + result.byType.workaround;
  const criticalAndHigh = result.byPriority.critical + result.byPriority.high;
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log(`   Priority Order: bugs (${result.byType.known_bug}) > missing features (${result.byType.missing_feature}) > workarounds (${result.byType.workaround}) > documentation (${result.byType.documentation})`);
  
  if (criticalAndHigh > 0) {
    console.log(`\n⚠️  PRIORITY: Address ${criticalAndHigh} critical/high priority items first`);
  }
  
  if (bugsAndWorkarounds > 0) {
    console.log(`\n🐛 BUGS & WORKAROUNDS: ${bugsAndWorkarounds} items need proper fixes`);
  }
  
  if (result.byType.missing_feature > 0) {
    console.log(`\n🚧 MISSING FEATURES: ${result.byType.missing_feature} incomplete implementations`);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔍 Scanning for TODO/FIXME/HACK comments...\n');
  
  const comments = await scanForTodos();
  const result = generateScanResult(comments);
  
  // Create output directory
  const outputDir = 'analysis-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save reports
  const jsonPath = path.join(outputDir, 'todo-comments.json');
  const htmlPath = path.join(outputDir, 'todo-comments.html');
  
  saveJsonReport(result, jsonPath);
  generateHtmlDashboard(result, htmlPath);
  printSummary(result);
  
  console.log(`\n✅ Scan complete! Open ${htmlPath} in your browser to view the dashboard.`);
}

// Run if executed directly
main().catch(console.error);

export { scanForTodos, generateScanResult, type TodoComment, type ScanResult };
