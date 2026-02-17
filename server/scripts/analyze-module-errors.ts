/**
 * Module Resolution Error Analysis Script
 * Analyzes TypeScript compilation errors and categorizes module resolution issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CompilationError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  category: ErrorCategory;
}

type ErrorCategory = 
  | 'TS2307' // Cannot find module
  | 'TS2305' // Module has no exported member
  | 'TS2614' // Module has no default export
  | 'TS2724' // Module has no exported member (alternative)
  | 'OTHER';

interface ModuleResolutionAnalysis {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  errorsByFile: Record<string, CompilationError[]>;
  missingModules: Set<string>;
  missingExports: Map<string, string[]>;
  missingDefaultExports: Set<string>;
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
        message: message.trim(),
        category: code as ErrorCategory
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
 * Analyze module resolution errors
 */
function analyzeModuleErrors(errors: CompilationError[]): ModuleResolutionAnalysis {
  const analysis: ModuleResolutionAnalysis = {
    totalErrors: errors.length,
    errorsByCode: {},
    errorsByFile: {},
    missingModules: new Set(),
    missingExports: new Map(),
    missingDefaultExports: new Set()
  };
  
  for (const error of errors) {
    // Count by error code
    analysis.errorsByCode[error.code] = (analysis.errorsByCode[error.code] || 0) + 1;
    
    // Group by file
    if (!analysis.errorsByFile[error.file]) {
      analysis.errorsByFile[error.file] = [];
    }
    analysis.errorsByFile[error.file].push(error);
    
    // Extract module information
    if (error.code === 'TS2307') {
      // Cannot find module 'xxx'
      const moduleMatch = error.message.match(/Cannot find module '([^']+)'/);
      if (moduleMatch) {
        analysis.missingModules.add(moduleMatch[1]);
      }
    } else if (error.code === 'TS2305') {
      // Module '"xxx"' has no exported member 'yyy'
      const exportMatch = error.message.match(/Module '"([^"]+)"' has no exported member '([^']+)'/);
      if (exportMatch) {
        const [, moduleName, exportName] = exportMatch;
        if (!analysis.missingExports.has(moduleName)) {
          analysis.missingExports.set(moduleName, []);
        }
        analysis.missingExports.get(moduleName)!.push(exportName);
      }
    } else if (error.code === 'TS2614' || error.code === 'TS2724') {
      // Module has no default export or no exported member
      const moduleMatch = error.message.match(/Module '"([^"]+)"'/);
      if (moduleMatch) {
        analysis.missingDefaultExports.add(moduleMatch[1]);
      }
    }
  }
  
  return analysis;
}

/**
 * Categorize missing modules by type
 */
function categorizeMissingModules(modules: Set<string>): {
  externalPackages: string[];
  internalModules: string[];
  pathAliases: string[];
  relativeImports: string[];
} {
  const result = {
    externalPackages: [] as string[],
    internalModules: [] as string[],
    pathAliases: [] as string[],
    relativeImports: [] as string[]
  };
  
  for (const module of modules) {
    if (module.startsWith('.')) {
      result.relativeImports.push(module);
    } else if (module.startsWith('@server') || module.startsWith('@shared') || module.startsWith('@client')) {
      result.pathAliases.push(module);
    } else if (module.startsWith('@chanuka') || module.startsWith('@/')) {
      result.internalModules.push(module);
    } else {
      result.externalPackages.push(module);
    }
  }
  
  return result;
}

/**
 * Generate analysis report
 */
function generateReport(analysis: ModuleResolutionAnalysis): string {
  const lines: string[] = [];
  
  lines.push('# Module Resolution Error Analysis');
  lines.push('');
  lines.push(`**Total Module Resolution Errors:** ${analysis.totalErrors}`);
  lines.push('');
  
  lines.push('## Error Breakdown by Code');
  lines.push('');
  for (const [code, count] of Object.entries(analysis.errorsByCode).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${code}**: ${count} errors`);
  }
  lines.push('');
  
  lines.push('## Missing Modules (TS2307)');
  lines.push('');
  const categorized = categorizeMissingModules(analysis.missingModules);
  
  lines.push(`**Total Missing Modules:** ${analysis.missingModules.size}`);
  lines.push('');
  
  if (categorized.externalPackages.length > 0) {
    lines.push('### External Packages (likely missing dependencies)');
    lines.push('');
    for (const pkg of categorized.externalPackages.sort()) {
      lines.push(`- \`${pkg}\``);
    }
    lines.push('');
  }
  
  if (categorized.pathAliases.length > 0) {
    lines.push('### Path Aliases (tsconfig paths)');
    lines.push('');
    for (const alias of categorized.pathAliases.sort()) {
      lines.push(`- \`${alias}\``);
    }
    lines.push('');
  }
  
  if (categorized.internalModules.length > 0) {
    lines.push('### Internal Modules (old aliases)');
    lines.push('');
    for (const mod of categorized.internalModules.sort()) {
      lines.push(`- \`${mod}\``);
    }
    lines.push('');
  }
  
  if (categorized.relativeImports.length > 0) {
    lines.push('### Relative Imports (incorrect paths)');
    lines.push('');
    for (const rel of categorized.relativeImports.sort()) {
      lines.push(`- \`${rel}\``);
    }
    lines.push('');
  }
  
  lines.push('## Missing Exports (TS2305)');
  lines.push('');
  lines.push(`**Total Modules with Missing Exports:** ${analysis.missingExports.size}`);
  lines.push('');
  
  for (const [moduleName, exports] of Array.from(analysis.missingExports.entries()).sort()) {
    lines.push(`### \`${moduleName}\``);
    lines.push('');
    lines.push('Missing exports:');
    for (const exp of exports) {
      lines.push(`- \`${exp}\``);
    }
    lines.push('');
  }
  
  lines.push('## Missing Default Exports (TS2614, TS2724)');
  lines.push('');
  lines.push(`**Total Modules:** ${analysis.missingDefaultExports.size}`);
  lines.push('');
  for (const mod of Array.from(analysis.missingDefaultExports).sort()) {
    lines.push(`- \`${mod}\``);
  }
  lines.push('');
  
  lines.push('## Errors by File (Top 20)');
  lines.push('');
  const fileErrors = Object.entries(analysis.errorsByFile)
    .map(([file, errors]) => ({ file, count: errors.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  for (const { file, count } of fileErrors) {
    lines.push(`- **${file}**: ${count} errors`);
  }
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  // Try multiple possible locations for the tsc output file
  const possiblePaths = [
    path.join(__dirname, '..', 'tsc-output-fresh.txt'),
    path.join(__dirname, '..', 'tsc-output.txt'),
    path.join(process.cwd(), 'tsc-output-fresh.txt'),
    path.join(process.cwd(), 'tsc-output.txt')
  ];
  
  let tscOutputPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      tscOutputPath = p;
      console.log(`Found tsc output at: ${p}`);
      break;
    }
  }
  
  if (!tscOutputPath) {
    console.error('Error: No tsc output file found. Tried:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }
  
  const output = fs.readFileSync(tscOutputPath, 'utf-8');
  console.log(`Read ${output.length} bytes from ${tscOutputPath}`);
  
  const allErrors = parseCompilerOutput(output);
  const moduleErrors = filterModuleResolutionErrors(allErrors);
  const analysis = analyzeModuleErrors(moduleErrors);
  const report = generateReport(analysis);
  
  // Write report
  const reportPath = path.join(process.cwd(), 'module-resolution-analysis-detailed.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  
  console.log(`Analysis complete!`);
  console.log(`Total errors analyzed: ${allErrors.length}`);
  console.log(`Module resolution errors: ${moduleErrors.length}`);
  console.log(`Report written to: ${reportPath}`);
  
  // Also output JSON for programmatic use
  const jsonPath = path.join(process.cwd(), 'module-resolution-analysis.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    totalErrors: analysis.totalErrors,
    errorsByCode: analysis.errorsByCode,
    missingModules: Array.from(analysis.missingModules),
    missingExports: Object.fromEntries(analysis.missingExports),
    missingDefaultExports: Array.from(analysis.missingDefaultExports),
    errorsByFile: Object.fromEntries(
      Object.entries(analysis.errorsByFile).map(([file, errors]) => [
        file,
        errors.map(e => ({ line: e.line, column: e.column, code: e.code, message: e.message }))
      ])
    )
  }, null, 2), 'utf-8');
  
  console.log(`JSON data written to: ${jsonPath}`);
}

main();
