import { execSync } from 'child_process';
import { resolve } from 'path';

/**
 * Compilation error structure parsed from tsc output
 */
export interface CompilationError {
  code: string;           // e.g., "TS2307"
  file: string;           // File path
  line: number;           // Line number
  column: number;         // Column number
  message: string;        // Error message
  category: ErrorCategory;
  severity: 'error' | 'warning';
}

/**
 * Error categories for grouping compilation errors
 */
export type ErrorCategory = 
  | 'moduleResolution'
  | 'typeAnnotations'
  | 'nullSafety'
  | 'unusedCode'
  | 'typeMismatches'
  | 'other';

/**
 * Errors grouped by category
 */
export interface ErrorsByCategory {
  moduleResolution: CompilationError[];
  typeAnnotations: CompilationError[];
  nullSafety: CompilationError[];
  unusedCode: CompilationError[];
  typeMismatches: CompilationError[];
  other: CompilationError[];
}

/**
 * Compilation result with errors and metadata
 */
export interface CompilationResult {
  success: boolean;
  errors: CompilationError[];
  errorsByCategory: ErrorsByCategory;
  totalErrors: number;
  output: string;
  exitCode: number;
}

/**
 * Error code to category mapping
 */
const ERROR_CATEGORY_MAP: Record<string, ErrorCategory> = {
  // Module Resolution
  'TS2307': 'moduleResolution', // Cannot find module
  'TS2305': 'moduleResolution', // Module has no exported member
  'TS2614': 'moduleResolution', // Module has no default export
  'TS2724': 'moduleResolution', // Module has no exported member and no default export
  
  // Type Annotations
  'TS7006': 'typeAnnotations', // Parameter implicitly has 'any' type
  'TS7031': 'typeAnnotations', // Binding element implicitly has 'any' type
  'TS7053': 'typeAnnotations', // Element implicitly has 'any' type
  
  // Null Safety
  'TS18046': 'nullSafety', // 'value' is possibly 'undefined'
  'TS18048': 'nullSafety', // 'value' is possibly 'undefined'
  'TS2532': 'nullSafety',  // Object is possibly 'undefined'
  
  // Unused Code
  'TS6133': 'unusedCode', // Variable declared but never used
  'TS6138': 'unusedCode', // Property declared but never used
  
  // Type Mismatches
  'TS2339': 'typeMismatches', // Property does not exist on type
  'TS2322': 'typeMismatches', // Type is not assignable to type
  'TS2345': 'typeMismatches', // Argument type not assignable to parameter
  'TS2304': 'typeMismatches', // Cannot find name
};

/**
 * Run TypeScript compiler and collect errors
 * 
 * @param options - Compilation options
 * @returns Compilation result with parsed errors
 */
export function runTypeScriptCompilation(options: {
  projectPath?: string;
  configFile?: string;
  noEmit?: boolean;
  strictNullChecks?: boolean;
} = {}): CompilationResult {
  const {
    projectPath = resolve(__dirname, '../..'),
    configFile = 'tsconfig.json',
    noEmit = true,
    strictNullChecks = false,
  } = options;

  const tscPath = resolve(projectPath, '../node_modules/.bin/tsc');
  const configPath = resolve(projectPath, configFile);
  
  let command = `"${tscPath}" --project "${configPath}"`;
  
  if (noEmit) {
    command += ' --noEmit';
  }
  
  if (strictNullChecks) {
    command += ' --strictNullChecks';
  }

  let output = '';
  let exitCode = 0;

  try {
    output = execSync(command, {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large output
    });
  } catch (error: any) {
    // tsc returns non-zero exit code when there are errors
    output = error.stdout || error.stderr || '';
    exitCode = error.status || 1;
  }

  const errors = parseCompilerOutput(output);
  const errorsByCategory = categorizeErrors(errors);

  return {
    success: exitCode === 0 && errors.length === 0,
    errors,
    errorsByCategory,
    totalErrors: errors.length,
    output,
    exitCode,
  };
}

/**
 * Parse TypeScript compiler output and extract errors
 * 
 * @param output - Raw tsc output
 * @returns Array of parsed compilation errors
 */
export function parseCompilerOutput(output: string): CompilationError[] {
  const errors: CompilationError[] = [];
  const lines = output.split('\n');

  // TypeScript error format: file.ts(line,col): error TSxxxx: message
  const errorRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(errorRegex);
    if (match) {
      const [, file, lineStr, colStr, severity, code, message] = match;
      
      errors.push({
        code,
        file: file.trim(),
        line: parseInt(lineStr, 10),
        column: parseInt(colStr, 10),
        message: message.trim(),
        category: categorizeErrorCode(code),
        severity: severity as 'error' | 'warning',
      });
    }
  }

  return errors;
}

/**
 * Categorize a single error code
 * 
 * @param code - TypeScript error code (e.g., "TS2307")
 * @returns Error category
 */
export function categorizeErrorCode(code: string): ErrorCategory {
  return ERROR_CATEGORY_MAP[code] || 'other';
}

/**
 * Group errors by category
 * 
 * @param errors - Array of compilation errors
 * @returns Errors grouped by category
 */
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

/**
 * Count errors by error code
 * 
 * @param errors - Array of compilation errors
 * @returns Map of error code to count
 */
export function countErrorsByCode(errors: CompilationError[]): Map<string, number> {
  const counts = new Map<string, number>();
  
  for (const error of errors) {
    counts.set(error.code, (counts.get(error.code) || 0) + 1);
  }
  
  return counts;
}

/**
 * Count errors by category
 * 
 * @param errorsByCategory - Errors grouped by category
 * @returns Map of category to count
 */
export function countErrorsByCategory(errorsByCategory: ErrorsByCategory): Map<ErrorCategory, number> {
  const counts = new Map<ErrorCategory, number>();
  
  for (const [category, errors] of Object.entries(errorsByCategory)) {
    counts.set(category as ErrorCategory, errors.length);
  }
  
  return counts;
}

/**
 * Filter errors by error codes
 * 
 * @param errors - Array of compilation errors
 * @param codes - Error codes to filter by
 * @returns Filtered errors
 */
export function filterErrorsByCode(errors: CompilationError[], codes: string[]): CompilationError[] {
  const codeSet = new Set(codes);
  return errors.filter(error => codeSet.has(error.code));
}

/**
 * Filter errors by category
 * 
 * @param errors - Array of compilation errors
 * @param category - Category to filter by
 * @returns Filtered errors
 */
export function filterErrorsByCategory(errors: CompilationError[], category: ErrorCategory): CompilationError[] {
  return errors.filter(error => error.category === category);
}

/**
 * Generate a summary report of compilation errors
 * 
 * @param result - Compilation result
 * @returns Formatted summary string
 */
export function generateErrorSummary(result: CompilationResult): string {
  const lines: string[] = [];
  
  lines.push('=== TypeScript Compilation Summary ===');
  lines.push(`Total Errors: ${result.totalErrors}`);
  lines.push(`Exit Code: ${result.exitCode}`);
  lines.push(`Success: ${result.success}`);
  lines.push('');
  
  lines.push('Errors by Category:');
  for (const [category, errors] of Object.entries(result.errorsByCategory)) {
    if (errors.length > 0) {
      lines.push(`  ${category}: ${errors.length}`);
    }
  }
  lines.push('');
  
  lines.push('Errors by Code:');
  const codeCounts = countErrorsByCode(result.errors);
  const sortedCodes = Array.from(codeCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [code, count] of sortedCodes) {
    lines.push(`  ${code}: ${count}`);
  }
  
  return lines.join('\n');
}
