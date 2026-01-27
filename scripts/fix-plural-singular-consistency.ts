#!/usr/bin/env node

/**
 * Plural/Singular Variable Naming Consistency Fixer (Refined)
 * 
 * This script enforces consistent variable naming conventions:
 * - Single entities use singular names (user, bill, sponsor)
 * - Collections/arrays use plural names (users, bills, sponsors)
 * - Schema table references remain plural (preserved intentionally)
 * 
 * The script intelligently distinguishes between different contexts to avoid
 * false positives while catching genuine naming inconsistencies.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

interface NamingRule {
  singular: string;
  plural: string;
  description: string;
}

interface Change {
  line: number;
  pattern: string;
  before: string;
  after: string;
  ruleApplied: string;
}

interface TransformResult {
  content: string;
  changes: Change[];
}

interface FixerOptions {
  dryRun?: boolean;
  verbose?: boolean;
  rootDir?: string;
}

interface ProcessingStats {
  filesProcessed: number;
  filesModified: number;
  totalChanges: number;
  changesByPattern: Map<string, number>;
  errors: Array<{ file: string; error: string }>;
}

// Core entity naming rules with more comprehensive coverage
const NAMING_RULES: NamingRule[] = [
  { singular: 'user', plural: 'users', description: 'User entities' },
  { singular: 'bill', plural: 'bills', description: 'Bill entities' },
  { singular: 'sponsor', plural: 'sponsors', description: 'Sponsor entities' },
  { singular: 'comment', plural: 'comments', description: 'Comment entities' },
  { singular: 'notification', plural: 'notifications', description: 'Notification entities' },
  { singular: 'session', plural: 'sessions', description: 'Session entities' },
  { singular: 'committee', plural: 'committees', description: 'Committee entities' },
  { singular: 'campaign', plural: 'campaigns', description: 'Campaign entities' },
  { singular: 'analysis', plural: 'analyses', description: 'Analysis entities' },
  { singular: 'report', plural: 'reports', description: 'Report entities' },
  { singular: 'engagement', plural: 'engagements', description: 'Engagement entities' },
  { singular: 'vote', plural: 'votes', description: 'Vote entities' },
  { singular: 'attachment', plural: 'attachments', description: 'Attachment entities' },
  { singular: 'document', plural: 'documents', description: 'Document entities' },
  { singular: 'tag', plural: 'tags', description: 'Tag entities' },
  { singular: 'category', plural: 'categories', description: 'Category entities' },
];

const EXCLUDE_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '.cache', 'playwright-report', 'test-results', '.next', 'out'
];

class PluralSingularFixer {
  private stats: ProcessingStats = {
    filesProcessed: 0,
    filesModified: 0,
    totalChanges: 0,
    changesByPattern: new Map(),
    errors: []
  };
  
  private options: FixerOptions;

  constructor(options: FixerOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      rootDir: '.',
      ...options
    };
  }

  /**
   * Main entry point to fix plural/singular consistency throughout the codebase.
   * This method orchestrates the entire process from scanning to reporting.
   */
  async fixNamingConsistency(): Promise<void> {
    this.printHeader();
    
    const startTime = Date.now();
    await this.processDirectory(this.options.rootDir!);
    const duration = Date.now() - startTime;

    this.generateSummaryReport(duration);
  }

  /**
   * Prints a welcoming header that explains what the script will do.
   * This helps users understand the context before seeing any output.
   */
  private printHeader(): void {
    console.log('🔧 Plural/Singular Variable Naming Consistency Fixer\n');
    
    if (this.options.dryRun) {
      console.log('🔍 Running in DRY RUN mode (no files will be modified)\n');
    }
    
    console.log(`📋 Processing ${NAMING_RULES.length} entity types across your codebase\n`);

    if (this.options.verbose) {
      console.log('Entity naming rules:');
      NAMING_RULES.forEach(rule => {
        console.log(`   ${rule.singular.padEnd(15)} ↔ ${rule.plural.padEnd(15)} ${rule.description}`);
      });
      console.log('');
    }
  }

  /**
   * Recursively processes all directories and files, respecting exclusion patterns.
   * This is the workhorse method that traverses the entire directory structure.
   */
  private async processDirectory(dirPath: string): Promise<void> {
    let items: string[];
    
    try {
      items = readdirSync(dirPath);
    } catch (error) {
      this.stats.errors.push({ 
        file: dirPath, 
        error: `Cannot read directory: ${error}` 
      });
      return;
    }

    for (const item of items) {
      const fullPath = join(dirPath, item);
      
      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          if (!this.shouldExcludeDirectory(item)) {
            await this.processDirectory(fullPath);
          }
        } else if (stat.isFile() && this.shouldProcessFile(fullPath)) {
          await this.processFile(fullPath);
        }
      } catch (error) {
        this.stats.errors.push({ 
          file: fullPath, 
          error: `Cannot access: ${error}` 
        });
      }
    }
  }

  /**
   * Determines whether a directory should be skipped during processing.
   * We exclude build artifacts, dependencies, and hidden directories to focus
   * only on source code that we actually want to modify.
   */
  private shouldExcludeDirectory(dirName: string): boolean {
    return EXCLUDE_PATTERNS.some(pattern => dirName === pattern || dirName.startsWith('.'));
  }

  /**
   * Determines whether a file should be processed based on its extension.
   * We only process TypeScript files, excluding type definition files since
   * they typically don't contain variable declarations we want to modify.
   */
  private shouldProcessFile(filePath: string): boolean {
    const ext = extname(filePath);
    return ['.ts', '.tsx'].includes(ext) && 
           !filePath.includes('node_modules') &&
           !filePath.endsWith('.d.ts');
  }

  /**
   * Processes an individual file by reading its content, applying transformations,
   * and optionally writing the changes back. This method also handles all the
   * logging and statistics tracking for each file.
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      const originalContent = readFileSync(filePath, 'utf8');
      const result = this.transformContent(originalContent);

      if (result.changes.length > 0) {
        if (!this.options.dryRun) {
          writeFileSync(filePath, result.content, 'utf8');
        }
        
        const relativePath = relative(this.options.rootDir!, filePath);
        const changeCount = result.changes.length;
        
        console.log(`${this.options.dryRun ? '📝' : '✅'} ${relativePath} (${changeCount} change${changeCount !== 1 ? 's' : ''})`);
        
        if (this.options.verbose) {
          result.changes.forEach(change => {
            console.log(`     Line ${change.line}: ${change.pattern} (${change.ruleApplied})`);
            console.log(`       - ${change.before}`);
            console.log(`       + ${change.after}`);
          });
        }
        
        this.stats.filesModified++;
        this.stats.totalChanges += changeCount;
        
        // Track which patterns are being used most frequently
        result.changes.forEach(change => {
          const count = this.stats.changesByPattern.get(change.pattern) || 0;
          this.stats.changesByPattern.set(change.pattern, count + 1);
        });
      }

      this.stats.filesProcessed++;

    } catch (error) {
      this.stats.errors.push({ file: filePath, error: String(error) });
      console.error(`❌ Error processing ${filePath}: ${error}`);
    }
  }

  /**
   * Transforms the entire content of a file by applying all naming rules.
   * This method processes line by line to maintain line number accuracy for
   * reporting, which helps developers understand exactly what changed.
   */
  private transformContent(content: string): TransformResult {
    const lines = content.split('\n');
    const changes: Change[] = [];
    
    const transformedLines = lines.map((line, lineIndex) => {
      let transformedLine = line;
      const lineNumber = lineIndex + 1;
      
      // Apply each naming rule in sequence, accumulating changes
      for (const rule of NAMING_RULES) {
        const lineResult = this.transformLine(transformedLine, rule, lineNumber);
        
        if (lineResult.changed) {
          changes.push({
            line: lineNumber,
            pattern: lineResult.pattern!,
            before: transformedLine,
            after: lineResult.line,
            ruleApplied: `${rule.singular}/${rule.plural}`
          });
          transformedLine = lineResult.line;
        }
      }
      
      return transformedLine;
    });

    return {
      content: transformedLines.join('\n'),
      changes
    };
  }

  /**
   * Applies a single naming rule to a line of code. This is where the actual
   * transformation logic lives. We use multiple pattern-matching strategies
   * to catch different contexts where naming inconsistencies appear.
   */
  private transformLine(
    line: string, 
    rule: NamingRule, 
    _lineNumber: number
  ): { line: string; changed: boolean; pattern?: string } {
    let result = line;
    let changed = false;
    let matchedPattern = '';

    // First, check if this line should be excluded from transformation
    if (this.isProtectedContext(line)) {
      return { line: result, changed: false };
    }

    // Pattern 1: Single entity from array indexing or query methods that return one result
    // Example: const user = data[0] → const user = data[0]
    // Example: const bill = await query.findFirst() → const bill = await query.findFirst()
    const singleEntityPattern = new RegExp(
      `\\b(const|let|var)\\s+${rule.plural}\\s*=\\s*(?:` +
        `[^=]*\\[\\d+\\]|` +                                    // Array indexing: arr[0]
        `[^=]*\\.(?:find|findFirst|findOne|findUnique)\\(|` +  // Single result queries
        `[^=]*\\.returning\\(\\)\\[0\\]|` +                    // Drizzle returning with index
        `[^=]*\\.first\\(\\)|` +                               // .first() method
        `[^=]*\\.at\\(\\d+\\)|` +                              // .at(0) method
        `await\\s+[^=]*\\.(?:get|fetch)\\([^)]*\\)(?!\\s*\\[)` + // Async single fetches
      `)`,
      'g'
    );
    
    if (singleEntityPattern.test(line)) {
      const newLine = result.replace(
        new RegExp(`\\b(const|let|var)\\s+${rule.plural}\\b`, 'g'),
        `$1 ${rule.singular}`
      );
      if (newLine !== result) {
        result = newLine;
        changed = true;
        matchedPattern = 'single entity from collection access';
      }
    }

    // Pattern 2: Collection assignment from arrays, select queries, or array methods
    // Example: const users = [...] → const users = [...]
    // Example: const bills = await query.select() → const bills = await query.select()
    const collectionPattern = new RegExp(
      `\\b(const|let|var)\\s+${rule.singular}\\s*=\\s*(?:` +
        `\\[|` +                                               // Array literal
        `[^=]*\\.(?:select|findMany|findAll|where)\\(|` +    // Multi-result queries
        `[^=]*\\.(?:map|filter|reduce|slice)\\(|` +          // Array transformation methods
        `[^=]*\\.returning\\(\\)(?!\\[0\\])|` +              // Drizzle returning without index
        `await\\s+[^=]*\\.(?:list|getAll|fetchAll)\\(` +    // Async collection fetches
      `)`,
      'g'
    );
    
    if (!changed && collectionPattern.test(line)) {
      const newLine = result.replace(
        new RegExp(`\\b(const|let|var)\\s+${rule.singular}\\b`, 'g'),
        `$1 ${rule.plural}`
      );
      if (newLine !== result) {
        result = newLine;
        changed = true;
        matchedPattern = 'collection assignment';
      }
    }

    // Pattern 3: Function parameters with singular type (not array)
    // Example: function process(user: User) → function process(user: User)
    const singleParamPattern = new RegExp(
      `\\(([^)]*?)\\b${rule.plural}\\s*:\\s*${this.capitalize(rule.singular)}(?![\\[<])([^)]*?)\\)`,
      'g'
    );
    
    if (!changed && singleParamPattern.test(line)) {
      const newLine = result.replace(
        singleParamPattern, 
        `($1${rule.singular}: ${this.capitalize(rule.singular)}$2)`
      );
      if (newLine !== result) {
        result = newLine;
        changed = true;
        matchedPattern = 'single entity parameter';
      }
    }

    // Pattern 4: Function parameters with array type
    // Example: function process(users: User[]) → function process(users: User[])
    const collectionParamPattern = new RegExp(
      `\\(([^)]*?)\\b${rule.singular}\\s*:\\s*${this.capitalize(rule.singular)}\\[\\]([^)]*?)\\)`,
      'g'
    );
    
    if (!changed && collectionParamPattern.test(line)) {
      const newLine = result.replace(
        collectionParamPattern, 
        `($1${rule.plural}: ${this.capitalize(rule.singular)}[]$2)`
      );
      if (newLine !== result) {
        result = newLine;
        changed = true;
        matchedPattern = 'collection parameter';
      }
    }

    // Pattern 5: Array iteration callbacks should use singular for the iterator variable
    // Example: users.forEach(user=> ...) → users.forEach(user => ...)
    const iteratorPattern = new RegExp(
      `\\b${rule.plural}\\.(?:forEach|map|filter|find|some|every|reduce)\\(\\s*${rule.plural}\\s*(?:=>|,)`,
      'g'
    );
    
    if (!changed && iteratorPattern.test(line)) {
      const newLine = result.replace(
        new RegExp(
          `(\\b${rule.plural}\\.(?:forEach|map|filter|find|some|every|reduce)\\()\\s*${rule.plural}\\s*(?==>|,)`, 
          'g'
        ),
        `$1${rule.singular}`
      );
      if (newLine !== result) {
        result = newLine;
        changed = true;
        matchedPattern = 'array iterator callback';
      }
    }

    // Pattern 6: Destructuring from objects where property name suggests plurality
    // Example: const { users } = fetchUsers() → const { users } = fetchUsers()
    const destructuringPattern = new RegExp(
      `\\{[^}]*\\b${rule.singular}\\b[^}]*\\}\\s*=\\s*[^=]*(?:get|fetch|load)${this.capitalize(rule.plural)}`,
      'g'
    );
    
    if (!changed && destructuringPattern.test(line)) {
      const newLine = result.replace(
        new RegExp(`(\\{[^}]*?)\\b${rule.singular}\\b([^}]*\\}\\s*=\\s*[^=]*(?:get|fetch|load)${this.capitalize(rule.plural)})`, 'g'),
        `$1${rule.plural}$2`
      );
      if (newLine !== result) {
        result = newLine;
        changed = true;
        matchedPattern = 'destructured collection';
      }
    }

    return { line: result, changed, pattern: matchedPattern };
  }

  /**
   * Determines if a line is in a protected context that should not be modified.
   * This prevents false positives in schema imports, table references, and other
   * contexts where plural names are intentionally and correctly used.
   */
  private isProtectedContext(line: string): boolean {
    // Schema imports and exports should always keep plural table names
    if ((line.includes('import') || line.includes('export')) && 
        (line.includes('@server/infrastructure/schema') || line.includes('schema') || line.includes('from'))) {
      return true;
    }
    
    // Database query table references must stay plural (they reference actual table names)
    if (line.includes('.from(') || line.includes('.into(') || 
        line.includes('.insert(') || line.includes('.update(') || 
        line.includes('.delete(')) {
      return true;
    }
    
    // ORM condition builders that reference table columns
    if (line.includes('eq(') || line.includes('and(') || 
        line.includes('or(') || line.includes('inArray(')) {
      return true;
    }

    // String literals and template strings shouldn't be modified
    if (line.match(/['"`][^'"`]*$/)) {
      return true;
    }

    // Type definitions and interfaces (these define structure, not instances)
    if (line.trim().startsWith('type ') || line.trim().startsWith('interface ')) {
      return true;
    }
    
    return false;
  }

  /**
   * Helper to capitalize the first letter of a string, used for generating
   * type names from entity names (user → User, bill → Bill).
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generates a comprehensive summary report showing what was accomplished.
   * This gives developers confidence in what changed and guidance on next steps.
   */
  private generateSummaryReport(duration: number): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 Naming Consistency Analysis Complete');
    console.log('='.repeat(70));
    console.log(`Files scanned:        ${this.stats.filesProcessed}`);
    console.log(`Files modified:       ${this.stats.filesModified}`);
    console.log(`Total changes:        ${this.stats.totalChanges}`);
    console.log(`Errors encountered:   ${this.stats.errors.length}`);
    console.log(`Time taken:           ${(duration / 1000).toFixed(2)}s`);

    if (this.stats.changesByPattern.size > 0) {
      console.log('\n📈 Changes by pattern type:');
      const sortedPatterns = Array.from(this.stats.changesByPattern.entries())
        .sort((a, b) => b[1] - a[1]);
      
      sortedPatterns.forEach(([pattern, count]) => {
        const percentage = ((count / this.stats.totalChanges) * 100).toFixed(1);
        console.log(`   ${pattern.padEnd(35)} ${count.toString().padStart(4)} (${percentage}%)`);
      });
    }

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`   ${relative(this.options.rootDir!, file)}: ${error}`);
      });
    }

    if (this.stats.filesModified > 0) {
      console.log(`\n${this.options.dryRun ? '📋' : '✅'} Summary:`);
      
      if (this.options.dryRun) {
        console.log('   Dry run complete. No files were modified.');
        console.log('   Run without --dry-run flag to apply these changes.');
      } else {
        console.log('   Naming consistency improved successfully!');
        console.log('   Variables now follow consistent singular/plural conventions.');
      }
      
      console.log('\n🔍 Recommended next steps:');
      console.log('   1. Review changes: git diff');
      console.log('   2. Verify TypeScript compilation: npm run type-check');
      console.log('   3. Run tests: npm test');
      console.log('   4. Check for any edge cases that need manual review');
    } else {
      console.log('\n✅ No naming inconsistencies found!');
      console.log('   Your codebase already follows proper naming conventions.');
    }
    
    console.log('='.repeat(70));
  }
}

// CLI execution - this allows the script to be run directly from the command line
const _cliArg = process.argv[1] ?? '';
const isMainModule = import.meta.url.endsWith(_cliArg) || 
                     _cliArg.includes('fix-plural-singular-consistency');

if (isMainModule) {
  const args = process.argv.slice(2);
  const options: FixerOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    rootDir: '.'
  };

  const fixer = new PluralSingularFixer(options);
  fixer.fixNamingConsistency().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { PluralSingularFixer, type NamingRule, type FixerOptions };