/**
 * JSDoc Coverage Checker
 *
 * Analyzes infrastructure modules to ensure all public exports have JSDoc comments.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'variable';
  hasJSDoc: boolean;
  line: number;
}

interface ModuleReport {
  module: string;
  totalExports: number;
  documentedExports: number;
  coverage: number;
  undocumented: ExportInfo[];
}

function checkJSDocInFile(filePath: string): ExportInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const exports: ExportInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and empty lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || !line.trim()) {
      continue;
    }

    // Check for export statements
    const exportMatch = line.match(/^export\s+(function|class|interface|type|const|let|var)\s+(\w+)/);
    if (exportMatch) {
      const [, type, name] = exportMatch;

      // Look back for JSDoc comment
      let hasJSDoc = false;
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const prevLine = lines[j].trim();
        if (prevLine.startsWith('/**')) {
          hasJSDoc = true;
          break;
        }
        if (prevLine && !prevLine.startsWith('*') && !prevLine.startsWith('//')) {
          break;
        }
      }

      exports.push({
        name,
        type: type as ExportInfo['type'],
        hasJSDoc,
        line: i + 1,
      });
    }
  }

  return exports;
}

function analyzeModule(modulePath: string): ModuleReport | null {
  const indexPath = path.join(modulePath, 'index.ts');

  if (!fs.existsSync(indexPath)) {
    return null;
  }

  const exports = checkJSDocInFile(indexPath);
  const documented = exports.filter(e => e.hasJSDoc).length;
  const total = exports.length;

  return {
    module: path.basename(modulePath),
    totalExports: total,
    documentedExports: documented,
    coverage: total > 0 ? (documented / total) * 100 : 100,
    undocumented: exports.filter(e => !e.hasJSDoc),
  };
}

function main() {
  const infrastructurePath = path.join(__dirname, '..');
  const modules = fs
    .readdirSync(infrastructurePath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => !dirent.name.startsWith('_') && dirent.name !== 'scripts')
    .map(dirent => path.join(infrastructurePath, dirent.name));

  const reports: ModuleReport[] = [];

  for (const modulePath of modules) {
    const report = analyzeModule(modulePath);
    if (report) {
      reports.push(report);
    }
  }

  // Sort by coverage (lowest first)
  reports.sort((a, b) => a.coverage - b.coverage);

  console.log('\n📊 JSDoc Coverage Report\n');
  console.log('='.repeat(80));

  let totalExports = 0;
  let totalDocumented = 0;

  for (const report of reports) {
    totalExports += report.totalExports;
    totalDocumented += report.documentedExports;

    const status = report.coverage === 100 ? '✅' : report.coverage >= 80 ? '⚠️' : '❌';
    console.log(
      `${status} ${report.module.padEnd(25)} ${report.documentedExports}/${report.totalExports} (${report.coverage.toFixed(1)}%)`
    );

    if (report.undocumented.length > 0 && report.coverage < 100) {
      console.log(`   Undocumented exports:`);
      for (const exp of report.undocumented.slice(0, 5)) {
        console.log(`     - ${exp.name} (${exp.type}) at line ${exp.line}`);
      }
      if (report.undocumented.length > 5) {
        console.log(`     ... and ${report.undocumented.length - 5} more`);
      }
    }
  }

  console.log('='.repeat(80));
  const overallCoverage = totalExports > 0 ? (totalDocumented / totalExports) * 100 : 100;
  console.log(
    `\n📈 Overall Coverage: ${totalDocumented}/${totalExports} (${overallCoverage.toFixed(1)}%)\n`
  );

  if (overallCoverage < 100) {
    console.log('⚠️  Some exports are missing JSDoc comments.');
    console.log('   Run this script to identify undocumented exports.\n');
  } else {
    console.log('✅ All public exports are documented!\n');
  }

  process.exit(overallCoverage === 100 ? 0 : 1);
}

main();
