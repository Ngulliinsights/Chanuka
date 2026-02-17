import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CompilationError {
  code: string;
  file: string;
  line: number;
  column: number;
  message: string;
  category: ErrorCategory;
}

export type ErrorCategory =
  | 'moduleResolution'
  | 'typeAnnotations'
  | 'nullSafety'
  | 'unusedCode'
  | 'typeMismatches'
  | 'other';

export interface ErrorsByCategory {
  moduleResolution: CompilationError[];
  typeAnnotations: CompilationError[];
  nullSafety: CompilationError[];
  unusedCode: CompilationError[];
  typeMismatches: CompilationError[];
  other: CompilationError[];
}

const ERROR_CATEGORY_MAP: Record<string, ErrorCategory> = {
  // Module resolution
  'TS2307': 'moduleResolution',
  'TS2305': 'moduleResolution',
  'TS2614': 'moduleResolution',
  'TS2724': 'moduleResolution',
  
  // Type annotations
  'TS7006': 'typeAnnotations',
  'TS7031': 'typeAnnotations',
  'TS7053': 'typeAnnotations',
  
  // Null safety
  'TS18046': 'nullSafety',
  'TS18048': 'nullSafety',
  'TS2532': 'nullSafety',
  
  // Unused code
  'TS6133': 'unusedCode',
  'TS6138': 'unusedCode',
  
  // Type mismatches
  'TS2339': 'typeMismatches',
  'TS2322': 'typeMismatches',
  'TS2345': 'typeMismatches',
  'TS2304': 'typeMismatches',
};

export function parseCompilerOutput(output: string): CompilationError[] {
  const errors: CompilationError[] = [];
  
  // Split by lines but handle wrapped lines
  const errorPattern = /([^\n]+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+([^\n]+)/g;
  
  let match;
  while ((match = errorPattern.exec(output)) !== null) {
    const [, file, lineStr, columnStr, code, message] = match;
    const category = ERROR_CATEGORY_MAP[code] || 'other';
    
    errors.push({
      code,
      file: file.trim(),
      line: parseInt(lineStr, 10),
      column: parseInt(columnStr, 10),
      message: message.trim(),
      category,
    });
  }
  
  console.log(`Parsed ${errors.length} errors`);
  return errors;
}

export function categorizeErrors(errors: CompilationError[]): ErrorsByCategory {
  const categorized: ErrorsByCategory = {
    moduleResolution: [],
    typeAnnotations: [],
    nullSafety: [],
    unusedCode: [],
    typeMismatches: [],
    other: [],
  };
  
  for (const error of errors) {
    categorized[error.category].push(error);
  }
  
  return categorized;
}

export function compileAndCollectErrors(): CompilationError[] {
  try {
    const output = execSync('npx tsc --noEmit 2>&1', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    // If no error thrown, compilation succeeded
    console.log('Compilation succeeded, no errors');
    return [];
  } catch (error: any) {
    // Compilation failed, parse the output
    const output = error.stdout || error.output?.join('') || error.stderr || '';
    console.log(`Captured output length: ${output.length} characters`);
    console.log(`First 500 chars: ${output.substring(0, 500)}`);
    return parseCompilerOutput(output);
  }
}

export function generateErrorReport(errors: CompilationError[]): string {
  const categorized = categorizeErrors(errors);
  
  let report = '# TypeScript Error Analysis Report\n\n';
  report += `**Total Errors**: ${errors.length}\n\n`;
  report += '## Errors by Category\n\n';
  
  const categories: Array<{ name: string; key: keyof ErrorsByCategory; description: string }> = [
    { name: 'Module Resolution', key: 'moduleResolution', description: 'Cannot find module, missing exports' },
    { name: 'Type Annotations', key: 'typeAnnotations', description: 'Implicit any types' },
    { name: 'Null Safety', key: 'nullSafety', description: 'Possibly undefined values' },
    { name: 'Unused Code', key: 'unusedCode', description: 'Unused variables and imports' },
    { name: 'Type Mismatches', key: 'typeMismatches', description: 'Type incompatibilities' },
    { name: 'Other', key: 'other', description: 'Other errors' },
  ];
  
  for (const { name, key, description } of categories) {
    const categoryErrors = categorized[key];
    report += `### ${name} (${categoryErrors.length} errors)\n`;
    report += `*${description}*\n\n`;
    
    if (categoryErrors.length > 0) {
      // Group by error code
      const byCode = new Map<string, CompilationError[]>();
      for (const error of categoryErrors) {
        if (!byCode.has(error.code)) {
          byCode.set(error.code, []);
        }
        byCode.get(error.code)!.push(error);
      }
      
      for (const [code, codeErrors] of Array.from(byCode.entries()).sort((a, b) => b[1].length - a[1].length)) {
        report += `- **${code}**: ${codeErrors.length} instances\n`;
      }
      report += '\n';
    }
  }
  
  return report;
}

export function saveErrorReport(errors: CompilationError[], filename: string): void {
  const report = generateErrorReport(errors);
  const reportPath = path.join(__dirname, '..', filename);
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`Error report saved to ${reportPath}`);
}

// Run analysis
console.log('Analyzing TypeScript errors...');
const errors = compileAndCollectErrors();
console.log(`Found ${errors.length} errors`);

saveErrorReport(errors, 'error-baseline-report.md');

const categorized = categorizeErrors(errors);
console.log('\nErrors by category:');
console.log(`- Module Resolution: ${categorized.moduleResolution.length}`);
console.log(`- Type Annotations: ${categorized.typeAnnotations.length}`);
console.log(`- Null Safety: ${categorized.nullSafety.length}`);
console.log(`- Unused Code: ${categorized.unusedCode.length}`);
console.log(`- Type Mismatches: ${categorized.typeMismatches.length}`);
console.log(`- Other: ${categorized.other.length}`);
