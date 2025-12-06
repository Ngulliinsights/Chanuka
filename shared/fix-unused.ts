#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface TSError {
  file: string;
  line: number;
  column: number;
  message: string;
}

function runTSC(): TSError[] {
  try {
    const output = execSync('npx tsc --noEmit 2>&1', {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    // Filter for TS6133 and TS6192 errors
    const lines = output.split('\n').filter(line => line.includes('TS6133') || line.includes('TS6192'));
    return lines.map(parseTSCError).filter(Boolean) as TSError[];
  } catch (error: any) {
    // If tsc exits with errors, parse stdout
    if (error.stdout) {
      const lines = error.stdout.split('\n').filter((line: string) => line.includes('TS6133') || line.includes('TS6192'));
      return lines.map(parseTSCError).filter(Boolean) as TSError[];
    }
    return [];
  }
}

function parseTSCError(line: string): TSError | null {
  // Example: shared/core/src/file.ts(123,45): error TS6133: 'variable' is declared but never used.
  // Or: shared/core/src/file.ts(21,1): error TS6192: All imports in import declaration are unused.
  const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS6133|TS6192):\s+(.+?)\r?$/);
  if (match && match[1] && match[2] && match[3] && match[4] && match[5]) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[5].trim()
    };
  }
  return null;
}

function fixUnusedImport(content: string, line: number): string {
  const lines = content.split('\n');
  if (line - 1 >= lines.length) return content;
  const importLine = lines[line - 1];
  if (importLine && importLine.trim().startsWith('import')) {
    // Comment out the import
    lines[line - 1] = `// ${importLine} // Unused import`;
    return lines.join('\n');
  }
  return content;
}

function fixUnusedVariable(content: string, line: number, column: number, _endColumn?: number): string {
  const lines = content.split('\n');
  if (line - 1 >= lines.length) return content;
  const codeLine = lines[line - 1];
  if (!codeLine) return content;
  // Find the variable name around the column
  const before = codeLine.substring(0, column - 1);
  const after = codeLine.substring(column - 1);
  // Simple regex to find variable name
  const varMatch = after.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
  if (varMatch && varMatch[1]) {
    const varName = varMatch[1];
    if (!varName.startsWith('_')) {
      const replacement = `_${varName}`;
      const newLine = before + after.replace(varName, replacement);
      lines[line - 1] = newLine;
      return lines.join('\n');
    }
  }
  return content;
}

function main() {
  console.log('Running tsc to find unused imports and variables...');
  const results = runTSC();

  let fixedFiles = 0;
  let totalFixes = 0;

  for (const error of results) {
    const filePath = error.file;
    let content = readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if it's an import or variable
    const lines = content.split('\n');
    const errorLine = lines[error.line - 1];
    if (errorLine && errorLine.trim().startsWith('import')) {
      content = fixUnusedImport(content, error.line);
      modified = true;
      totalFixes++;
    } else {
      // Variable
      content = fixUnusedVariable(content, error.line, error.column);
      modified = true;
      totalFixes++;
    }

    if (modified) {
      writeFileSync(filePath, content);
      fixedFiles++;
      console.log(`Fixed: ${filePath}`);
    }
  }

  console.log(`\nSummary: Fixed ${totalFixes} issues in ${fixedFiles} files`);
}

main();