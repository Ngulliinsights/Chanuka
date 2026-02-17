#!/usr/bin/env npx tsx

/**
 * Codebase Error Analysis Script (Refined)
 * 
 * Analyzes TypeScript errors across the entire codebase with improved
 * parsing, better error categorization, and more reliable reporting.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ErrorAnalysis {
  totalErrors: number;
  clientErrors: number;
  serverErrors: number;
  sharedErrors: number;
  scriptErrors: number;
  otherErrors: number;
  errorsByCategory: Record<string, number>;
  errorsByFile: Record<string, number>;
  criticalErrors: string[];
  recommendations: string[];
  rawErrors: ParsedError[];
}

interface ParsedError {
  filePath: string;
  line: number;
  column: number;
  errorCode: string;
  message: string;
  fullLine: string;
}

interface AnalysisContext {
  name: string;
  command: string;
  displayName: string;
}

class CodebaseErrorAnalyzer {
  private analysis: ErrorAnalysis;

  constructor() {
    this.analysis = {
      totalErrors: 0,
      clientErrors: 0,
      serverErrors: 0,
      sharedErrors: 0,
      scriptErrors: 0,
      otherErrors: 0,
      errorsByCategory: {},
      errorsByFile: {},
      criticalErrors: [],
      recommendations: [],
      rawErrors: []
    };
  }

  async run(): Promise<void> {
    console.log('🔍 Starting Codebase Error Analysis...\n');
    
    try {
      // Define analysis contexts with their TypeScript commands
      const contexts: AnalysisContext[] = [
        {
          name: 'overall',
          command: 'npx tsc --noEmit --pretty false',
          displayName: 'Overall Codebase'
        },
        {
          name: 'client',
          command: 'npx tsc --noEmit --pretty false --project client/tsconfig.json',
          displayName: 'Client Side'
        },
        {
          name: 'server',
          command: 'npx tsc --noEmit --pretty false --project tsconfig.server.json',
          displayName: 'Server Side'
        }
      ];

      // Run analysis for each context
      for (const context of contexts) {
        await this.analyzeContext(context);
      }
      
      // Process collected errors
      this.processCollectedErrors();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Generate and display report
      this.generateReport();
      
      console.log('\n✅ Error analysis completed!\n');
      
    } catch (error) {
      console.error('❌ Error analysis failed:', error);
      if (error instanceof Error) {
        console.error('   Details:', error.message);
      }
      process.exit(1);
    }
  }

  /**
   * Analyzes errors for a specific context (overall, client, or server)
   */
  private async analyzeContext(context: AnalysisContext): Promise<void> {
    console.log(`📊 Analyzing ${context.displayName}...`);
    
    try {
      // Try running TypeScript compiler
      execSync(context.command, { 
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      console.log(`   ✅ No TypeScript errors found in ${context.displayName}!`);
    } catch (error: unknown) {
      // The TypeScript compiler exits with error code when there are errors
      // This is expected behavior, so we capture the output
      const output = error.stdout || error.stderr || '';
      
      if (!output || output.trim() === '') {
        console.log(`   ⚠️  No output from TypeScript compiler for ${context.displayName}`);
        return;
      }
      
      const errorCount = this.parseErrorOutput(output);
      console.log(`   Found ${errorCount} errors in ${context.displayName}`);
    }
  }

  /**
   * Parses TypeScript compiler output and extracts error information
   * Returns the number of errors found
   */
  private parseErrorOutput(output: string): number {
    const lines = output.split('\n');
    let errorCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // TypeScript error format: "path/to/file.ts(line,col): error TSxxxx: message"
      // Alternative format: "path/to/file.ts:line:col - error TSxxxx: message"
      const errorPattern1 = /^(.+\.tsx?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/;
      const errorPattern2 = /^(.+\.tsx?):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)$/;
      
      let match = line.match(errorPattern1) || line.match(errorPattern2);
      
      if (match) {
        const parsedError = this.extractErrorDetails(match, line);
        
        if (parsedError) {
          this.analysis.rawErrors.push(parsedError);
          errorCount++;
        }
      }
    }
    
    return errorCount;
  }

  /**
   * Safely extracts error details from regex match results
   */
  private extractErrorDetails(match: RegExpMatchArray, fullLine: string): ParsedError | null {
    try {
      const filePath = match[1] ?? '';
      const lineStr = match[2] ?? '';
      const colStr = match[3] ?? '';
      const errorCode = match[4] ?? '';
      const message = match[5] ?? '';
      
      // Validate all required fields
      if (!filePath || !lineStr || !colStr || !errorCode || !message) {
        return null;
      }
      
      const line = parseInt(lineStr, 10);
      const column = parseInt(colStr, 10);
      
      // Validate parsed numbers
      if (isNaN(line) || isNaN(column)) {
        return null;
      }
      
      return {
        filePath: filePath.trim(),
        line,
        column,
        errorCode: errorCode.trim(),
        message: message.trim(),
        fullLine
      };
    } catch (err) {
      console.warn('   ⚠️  Failed to parse error line:', fullLine);
      return null;
    }
  }

  /**
   * Process all collected errors and categorize them
   */
  private processCollectedErrors(): void {
    console.log('\n🔄 Processing collected errors...');
    
    // Update total count
    this.analysis.totalErrors = this.analysis.rawErrors.length;
    
    // Process each error
    for (const error of this.analysis.rawErrors) {
      this.categorizeError(error);
    }
    
    console.log(`   Processed ${this.analysis.totalErrors} errors`);
  }

  /**
   * Categorizes a single error into all relevant buckets
   */
  private categorizeError(error: ParsedError): void {
    const { filePath, line, errorCode, message } = error;
    
    // Normalize file path for consistent matching
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Categorize by file location
    if (normalizedPath.includes('/client/') || normalizedPath.startsWith('client/')) {
      this.analysis.clientErrors++;
    } else if (normalizedPath.includes('/server/') || normalizedPath.startsWith('server/')) {
      this.analysis.serverErrors++;
    } else if (normalizedPath.includes('/shared/') || normalizedPath.startsWith('shared/')) {
      this.analysis.sharedErrors++;
    } else if (normalizedPath.includes('/scripts/') || normalizedPath.startsWith('scripts/')) {
      this.analysis.scriptErrors++;
    } else {
      this.analysis.otherErrors++;
    }
    
    // Categorize by error type
    const category = this.getErrorCategory(errorCode);
    this.analysis.errorsByCategory[category] = (this.analysis.errorsByCategory[category] || 0) + 1;
    
    // Track errors by file
    const fileName = path.basename(filePath);
    this.analysis.errorsByFile[fileName] = (this.analysis.errorsByFile[fileName] || 0) + 1;
    
    // Identify critical errors
    if (this.isCriticalError(errorCode)) {
      const shortPath = this.shortenPath(filePath);
      this.analysis.criticalErrors.push(`${shortPath}:${line} - ${errorCode}: ${message}`);
    }
  }

  /**
   * Categorizes TypeScript error codes into meaningful groups
   */
  private getErrorCategory(errorCode: string): string {
    const code = errorCode.replace('TS', '');
    const codeNum = parseInt(code, 10);
    
    // Type assignment and inference errors (most common)
    if ([2322, 2345, 2769, 2322, 2344, 2558, 2362].includes(codeNum)) {
      return 'Type Assignment Errors';
    }
    
    // Property and member access errors
    if ([2339, 2551, 2774, 2749, 2540, 2341].includes(codeNum)) {
      return 'Property Access Errors';
    }
    
    // Module resolution and import errors
    if ([2307, 2305, 2792, 1192, 1259].includes(codeNum)) {
      return 'Import/Module Errors';
    }
    
    // Null and undefined errors
    if ([18048, 2532, 2533, 2531, 2454].includes(codeNum)) {
      return 'Null/Undefined Errors';
    }
    
    // Function and call signature errors
    if ([2554, 2555, 2556, 2557, 2559].includes(codeNum)) {
      return 'Function Signature Errors';
    }
    
    // Declaration and definition errors
    if ([2304, 2552, 2300, 2301, 2717].includes(codeNum)) {
      return 'Declaration Errors';
    }
    
    // Syntax errors
    if ([1005, 1127, 1002, 1128, 1161, 1003, 1109].includes(codeNum)) {
      return 'Syntax Errors';
    }
    
    // Configuration and compiler errors
    if ([2688, 2708, 5023, 5024, 6133].includes(codeNum)) {
      return 'Configuration Errors';
    }
    
    return 'Other Errors';
  }

  /**
   * Determines if an error code represents a critical issue
   */
  private isCriticalError(errorCode: string): boolean {
    const code = errorCode.replace('TS', '');
    const codeNum = parseInt(code, 10);
    
    // Syntax errors prevent compilation
    if ([1005, 1127, 1002, 1128, 1161].includes(codeNum)) {
      return true;
    }
    
    // Module resolution failures prevent builds
    if ([2307, 2792].includes(codeNum)) {
      return true;
    }
    
    // Duplicate declarations cause conflicts
    if ([2300, 2717].includes(codeNum)) {
      return true;
    }
    
    return false;
  }

  /**
   * Generates actionable recommendations based on error analysis
   */
  private generateRecommendations(): void {
    console.log('💡 Generating recommendations...');
    
    const { errorsByCategory, totalErrors, clientErrors, serverErrors } = this.analysis;
    
    if (totalErrors === 0) {
      this.analysis.recommendations.push('Codebase is error-free! Great work!');
      return;
    }
    
    // Priority 1: Syntax errors block everything
    const syntaxErrors = errorsByCategory['Syntax Errors'] || 0;
    if (syntaxErrors > 0) {
      this.analysis.recommendations.push(
        `🔥 CRITICAL: Fix ${syntaxErrors} syntax error${syntaxErrors > 1 ? 's' : ''} immediately (prevents compilation)`
      );
    }
    
    // Priority 2: Import/module errors prevent proper builds
    const importErrors = errorsByCategory['Import/Module Errors'] || 0;
    if (importErrors > 0) {
      this.analysis.recommendations.push(
        `🔶 HIGH: Resolve ${importErrors} import/module error${importErrors > 1 ? 's' : ''} (check paths and exports)`
      );
    }
    
    // Priority 3: Type errors indicate safety issues
    const typeErrors = errorsByCategory['Type Assignment Errors'] || 0;
    if (typeErrors > 0) {
      const percentage = Math.round((typeErrors / totalErrors) * 100);
      this.analysis.recommendations.push(
        `🔷 MEDIUM: Address ${typeErrors} type error${typeErrors > 1 ? 's' : ''} (${percentage}% of total errors)`
      );
    }
    
    // Null safety recommendation
    const nullErrors = errorsByCategory['Null/Undefined Errors'] || 0;
    if (nullErrors > 0) {
      this.analysis.recommendations.push(
        `⚠️  MEDIUM: Fix ${nullErrors} null safety issue${nullErrors > 1 ? 's' : ''} (potential runtime crashes)`
      );
    }
    
    // Property access errors often indicate refactoring issues
    const propErrors = errorsByCategory['Property Access Errors'] || 0;
    if (propErrors > 5) {
      this.analysis.recommendations.push(
        `📝 LOW: Review ${propErrors} property access errors (may indicate API inconsistencies)`
      );
    }
    
    // Location-based recommendations
    if (clientErrors > totalErrors * 0.6) {
      this.analysis.recommendations.push(
        '🎨 Focus on client-side code (contains majority of errors)'
      );
    } else if (serverErrors > totalErrors * 0.6) {
      this.analysis.recommendations.push(
        '🖥️  Focus on server-side code (contains majority of errors)'
      );
    }
    
    // File concentration recommendation
    const topFile = Object.entries(this.analysis.errorsByFile)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topFile && topFile[1] > totalErrors * 0.2) {
      this.analysis.recommendations.push(
        `📁 Start with ${topFile[0]} (contains ${topFile[1]} errors - ${Math.round((topFile[1] / totalErrors) * 100)}% of total)`
      );
    }
  }

  /**
   * Generates and displays the complete analysis report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📋 CODEBASE ERROR ANALYSIS REPORT');
    console.log('='.repeat(70));
    
    this.printErrorSummary();
    this.printErrorCategories();
    this.printTopProblematicFiles();
    this.printCriticalErrors();
    this.printRecommendations();
    
    this.saveReport();
  }

  /**
   * Prints the error summary section
   */
  private printErrorSummary(): void {
    console.log('\n📊 ERROR SUMMARY');
    console.log('-'.repeat(70));
    console.log(`Total Errors Found: ${this.analysis.totalErrors}`);
    
    if (this.analysis.totalErrors > 0) {
      const sections = [
        { name: 'Client', count: this.analysis.clientErrors },
        { name: 'Server', count: this.analysis.serverErrors },
        { name: 'Shared', count: this.analysis.sharedErrors },
        { name: 'Scripts', count: this.analysis.scriptErrors },
        { name: 'Other', count: this.analysis.otherErrors }
      ];
      
      console.log('\nBreakdown by Location:');
      sections.forEach(({ name, count }) => {
        if (count > 0) {
          const percentage = Math.round((count / this.analysis.totalErrors) * 100);
          const bar = '█'.repeat(Math.floor(percentage / 2));
          console.log(`  ${name.padEnd(8)} ${count.toString().padStart(4)} (${percentage.toString().padStart(3)}%) ${bar}`);
        }
      });
    }
  }

  /**
   * Prints error categories with visual bars
   */
  private printErrorCategories(): void {
    if (Object.keys(this.analysis.errorsByCategory).length === 0) return;
    
    console.log('\n🏷️  ERROR CATEGORIES');
    console.log('-'.repeat(70));
    
    const sortedCategories = Object.entries(this.analysis.errorsByCategory)
      .sort(([, a], [, b]) => b - a);
    
    sortedCategories.forEach(([category, count]) => {
      const percentage = Math.round((count / this.analysis.totalErrors) * 100);
      const bar = '█'.repeat(Math.floor(percentage / 2));
      console.log(`  ${category.padEnd(30)} ${count.toString().padStart(4)} (${percentage.toString().padStart(3)}%) ${bar}`);
    });
  }

  /**
   * Prints the top problematic files
   */
  private printTopProblematicFiles(): void {
    if (Object.keys(this.analysis.errorsByFile).length === 0) return;
    
    console.log('\n📁 TOP PROBLEMATIC FILES (showing up to 10)');
    console.log('-'.repeat(70));
    
    Object.entries(this.analysis.errorsByFile)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([file, count], index) => {
        console.log(`  ${(index + 1).toString().padStart(2)}. ${file.padEnd(45)} ${count} error${count > 1 ? 's' : ''}`);
      });
  }

  /**
   * Prints critical errors that need immediate attention
   */
  private printCriticalErrors(): void {
    if (this.analysis.criticalErrors.length === 0) return;
    
    console.log('\n🚨 CRITICAL ERRORS (showing up to 8)');
    console.log('-'.repeat(70));
    
    this.analysis.criticalErrors.slice(0, 8).forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    
    if (this.analysis.criticalErrors.length > 8) {
      console.log(`  ... and ${this.analysis.criticalErrors.length - 8} more critical errors`);
    }
  }

  /**
   * Prints actionable recommendations
   */
  private printRecommendations(): void {
    if (this.analysis.recommendations.length === 0) return;
    
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(70));
    
    this.analysis.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  /**
   * Shortens file paths for better readability
   */
  private shortenPath(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    if (parts.length > 3) {
      return `.../${parts.slice(-3).join('/')}`;
    }
    return filePath;
  }

  /**
   * Saves detailed report to JSON file
   */
  private saveReport(): void {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalErrors: this.analysis.totalErrors,
          clientErrors: this.analysis.clientErrors,
          serverErrors: this.analysis.serverErrors,
          sharedErrors: this.analysis.sharedErrors,
          scriptErrors: this.analysis.scriptErrors,
          otherErrors: this.analysis.otherErrors
        },
        categories: this.analysis.errorsByCategory,
        topFiles: Object.entries(this.analysis.errorsByFile)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 25)
          .map(([file, count]) => ({ file, count })),
        criticalErrors: this.analysis.criticalErrors,
        recommendations: this.analysis.recommendations,
        allErrors: this.analysis.rawErrors.map(err => ({
          file: err.filePath,
          line: err.line,
          column: err.column,
          code: err.errorCode,
          message: err.message
        }))
      };
      
      const docsDir = path.join(process.cwd(), 'docs');
      
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      
      const reportPath = path.join(docsDir, 'error-analysis-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      
      console.log(`\n📄 Detailed JSON report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('\n⚠️  Failed to save report file:', error);
    }
  }
}

// Main execution function
async function main() {
  const analyzer = new CodebaseErrorAnalyzer();
  await analyzer.run();
}

// Execute the analysis
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});