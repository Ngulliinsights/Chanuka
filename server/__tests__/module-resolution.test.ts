/**
 * Property-Based Test: Module Resolution Completeness
 * 
 * Feature: server-typescript-errors-remediation
 * Property 1: Module Resolution Completeness
 * 
 * Validates: Requirements 1.4, 1.5, 1.6, 1.7
 * 
 * This test verifies that after Phase 1 completion, the TypeScript compiler
 * reports zero module resolution errors (TS2307, TS2305, TS2614, TS2724).
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

interface CompilationError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

/**
 * Parse TypeScript compiler output
 */
function parseCompilerOutput(output: string): CompilationError[] {
  const errors: CompilationError[] = [];
  
  // Remove line wrapping artifacts and normalize
  const normalized = output.replace(/\r\n/g, '\n').replace(/\n\s+/g, ' ');
  const lines = normalized.split('\n');
  
  // Pattern: file.ts(line,col): error TSxxxx: message
  const errorPattern = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const match = trimmed.match(errorPattern);
    if (match) {
      const [, file, lineNum, colNum, code, message] = match;
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        code,
        message: message.trim()
      });
    }
  }
  
  return errors;
}

/**
 * Filter module resolution errors
 */
function filterModuleResolutionErrors(errors: CompilationError[]): CompilationError[] {
  const moduleErrorCodes = ['TS2307', 'TS2305', 'TS2614', 'TS2724'];
  return errors.filter(err => moduleErrorCodes.includes(err.code));
}

/**
 * Run TypeScript compilation and collect errors
 */
function compileAndCollectErrors(): CompilationError[] {
  try {
    const serverDir = path.join(__dirname, '..');
    const output = execSync('npx tsc --noEmit', {
      cwd: serverDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    return parseCompilerOutput(output);
  } catch (error: any) {
    // tsc exits with non-zero code when there are errors
    // The output is in error.stdout
    if (error.stdout) {
      return parseCompilerOutput(error.stdout);
    }
    throw error;
  }
}

describe('Phase 1: Module Resolution Completeness', () => {
  /**
   * Property 1: Module Resolution Completeness
   * 
   * For any TypeScript compilation of the server codebase after Phase 1 completion,
   * the compiler SHALL report zero module resolution errors (TS2307, TS2305, TS2614, TS2724).
   * 
   * Validates: Requirements 1.4, 1.5, 1.6, 1.7
   */
  it('should have zero TS2307 errors (Cannot find module)', () => {
    const errors = compileAndCollectErrors();
    const ts2307Errors = errors.filter(e => e.code === 'TS2307');
    
    if (ts2307Errors.length > 0) {
      console.log('\nTS2307 Errors Found:');
      ts2307Errors.slice(0, 10).forEach(err => {
        console.log(`  ${err.file}(${err.line},${err.column}): ${err.message}`);
      });
      if (ts2307Errors.length > 10) {
        console.log(`  ... and ${ts2307Errors.length - 10} more`);
      }
    }
    
    expect(ts2307Errors).toHaveLength(0);
  });

  it('should have zero TS2305 errors (Module has no exported member)', () => {
    const errors = compileAndCollectErrors();
    const ts2305Errors = errors.filter(e => e.code === 'TS2305');
    
    if (ts2305Errors.length > 0) {
      console.log('\nTS2305 Errors Found:');
      ts2305Errors.slice(0, 10).forEach(err => {
        console.log(`  ${err.file}(${err.line},${err.column}): ${err.message}`);
      });
      if (ts2305Errors.length > 10) {
        console.log(`  ... and ${ts2305Errors.length - 10} more`);
      }
    }
    
    expect(ts2305Errors).toHaveLength(0);
  });

  it('should have zero TS2614 errors (Module has no default export)', () => {
    const errors = compileAndCollectErrors();
    const ts2614Errors = errors.filter(e => e.code === 'TS2614');
    
    if (ts2614Errors.length > 0) {
      console.log('\nTS2614 Errors Found:');
      ts2614Errors.forEach(err => {
        console.log(`  ${err.file}(${err.line},${err.column}): ${err.message}`);
      });
    }
    
    expect(ts2614Errors).toHaveLength(0);
  });

  it('should have zero TS2724 errors (Module has no exported member and no default export)', () => {
    const errors = compileAndCollectErrors();
    const ts2724Errors = errors.filter(e => e.code === 'TS2724');
    
    if (ts2724Errors.length > 0) {
      console.log('\nTS2724 Errors Found:');
      ts2724Errors.forEach(err => {
        console.log(`  ${err.file}(${err.line},${err.column}): ${err.message}`);
      });
    }
    
    expect(ts2724Errors).toHaveLength(0);
  });

  /**
   * Combined test: All module resolution errors
   */
  it('should have zero module resolution errors overall', () => {
    const errors = compileAndCollectErrors();
    const moduleErrors = filterModuleResolutionErrors(errors);
    
    if (moduleErrors.length > 0) {
      console.log(`\nTotal Module Resolution Errors: ${moduleErrors.length}`);
      
      // Group by error code
      const byCode = new Map<string, number>();
      for (const err of moduleErrors) {
        byCode.set(err.code, (byCode.get(err.code) || 0) + 1);
      }
      
      console.log('\nBreakdown by Error Code:');
      for (const [code, count] of byCode.entries()) {
        console.log(`  ${code}: ${count} errors`);
      }
    }
    
    expect(moduleErrors).toHaveLength(0);
  });
});
