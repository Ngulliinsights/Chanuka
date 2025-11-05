#!/usr/bin/env node

/**
 * Property Naming Consistency Fixer (Optimized Version)
 * 
 * This script systematically converts camelCase property names to snake_case
 * throughout the codebase to maintain consistency with database schema conventions.
 * 
 * Key improvements over the original:
 * - More precise regex patterns to avoid false positives
 * - Better handling of edge cases in destructuring and object literals
 * - Proper change counting without duplicates
 * - Dry-run mode for safe testing
 * - Better error reporting with line numbers
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

interface PropertyMapping {
  camelCase: string;
  snake_case: string;
  description: string;
}

interface TransformResult {
  content: string;
  changes: Array<{
    line: number;
    pattern: string;
    before: string;
    after: string;
  }>;
}

interface FixerOptions {
  dryRun?: boolean;
  verbose?: boolean;
  rootDir?: string;
}

// Property mappings organized by category for better maintainability
const PROPERTY_MAPPINGS: PropertyMapping[] = [
  // Identifiers (most common)
  { camelCase: 'user_id', snake_case: 'user_id', description: 'User identifier' },
  { camelCase: 'bill_id', snake_case: 'bill_id', description: 'Bill identifier' },
  { camelCase: 'sponsor_id', snake_case: 'sponsor_id', description: 'Sponsor identifier' },
  { camelCase: 'session_id', snake_case: 'session_id', description: 'Session identifier' },
  { camelCase: 'comment_id', snake_case: 'comment_id', description: 'Comment identifier' },
  { camelCase: 'notification_id', snake_case: 'notification_id', description: 'Notification identifier' },
  { camelCase: 'committee_id', snake_case: 'committee_id', description: 'Committee identifier' },
  { camelCase: 'campaign_id', snake_case: 'campaign_id', description: 'Campaign identifier' },
  { camelCase: 'analysis_id', snake_case: 'analysis_id', description: 'Analysis identifier' },
  { camelCase: 'report_id', snake_case: 'report_id', description: 'Report identifier' },
  { camelCase: 'profile_id', snake_case: 'profile_id', description: 'Profile identifier' },
  { camelCase: 'engagement_id', snake_case: 'engagement_id', description: 'Engagement identifier' },
  { camelCase: 'verification_id', snake_case: 'verification_id', description: 'Verification identifier' },

  // Composite identifiers
  { camelCase: 'primary_bill_id', snake_case: 'primary_bill_id', description: 'Primary bill identifier' },
  { camelCase: 'parent_comment_id', snake_case: 'parent_comment_id', description: 'Parent comment identifier' },
  { camelCase: 'reported_user_id', snake_case: 'reported_user_id', description: 'Reported user identifier' },
  { camelCase: 'reported_comment_id', snake_case: 'reported_comment_id', description: 'Reported comment identifier' },
  { camelCase: 'assigned_moderator_id', snake_case: 'assigned_moderator_id', description: 'Assigned moderator identifier' },
  { camelCase: 'target_sponsor_id', snake_case: 'target_sponsor_id', description: 'Target sponsor identifier' },

  // Timestamps (very common)
  { camelCase: 'created_at', snake_case: 'created_at', description: 'Creation timestamp' },
  { camelCase: 'updated_at', snake_case: 'updated_at', description: 'Update timestamp' },
  { camelCase: 'deleted_at', snake_case: 'deleted_at', description: 'Deletion timestamp' },
  { camelCase: 'expires_at', snake_case: 'expires_at', description: 'Expiration timestamp' },
  { camelCase: 'last_login_at', snake_case: 'last_login_at', description: 'Last login timestamp' },
  { camelCase: 'last_seen_at', snake_case: 'last_seen_at', description: 'Last seen timestamp' },

  // Dates
  { camelCase: 'introduced_date', snake_case: 'introduced_date', description: 'Introduction date' },
  { camelCase: 'passed_date', snake_case: 'passed_date', description: 'Passage date' },
  { camelCase: 'rejected_date', snake_case: 'rejected_date', description: 'Rejection date' },
  { camelCase: 'amended_date', snake_case: 'amended_date', description: 'Amendment date' },
  { camelCase: 'published_date', snake_case: 'published_date', description: 'Publication date' },
  { camelCase: 'scheduled_date', snake_case: 'scheduled_date', description: 'Scheduled date' },
  { camelCase: 'completed_date', snake_case: 'completed_date', description: 'Completion date' },
  { camelCase: 'assigned_date', snake_case: 'assigned_date', description: 'Assignment date' },
  { camelCase: 'report_date', snake_case: 'report_date', description: 'Report date' },
  { camelCase: 'due_date', snake_case: 'due_date', description: 'Due date' },
  { camelCase: 'start_date', snake_case: 'start_date', description: 'Start date' },
  { camelCase: 'end_date', snake_case: 'end_date', description: 'End date' },
  { camelCase: 'birth_date', snake_case: 'birth_date', description: 'Birth date' },
  { camelCase: 'join_date', snake_case: 'join_date', description: 'Join date' },
  { camelCase: 'leave_date', snake_case: 'leave_date', description: 'Leave date' },

  // Authentication and security
  { camelCase: 'password_hash', snake_case: 'password_hash', description: 'Password hash' },
  { camelCase: 'verification_token', snake_case: 'verification_token', description: 'Verification token' },
  { camelCase: 'reset_token', snake_case: 'reset_token', description: 'Password reset token' },
  { camelCase: 'access_token', snake_case: 'access_token', description: 'Access token' },
  { camelCase: 'refresh_token', snake_case: 'refresh_token', description: 'Refresh token' },

  // Personal information
  { camelCase: 'first_name', snake_case: 'first_name', description: 'First name' },
  { camelCase: 'last_name', snake_case: 'last_name', description: 'Last name' },
  { camelCase: 'phone_number', snake_case: 'phone_number', description: 'Phone number' },
  { camelCase: 'email_address', snake_case: 'email_address', description: 'Email address' },

  // Boolean flags
  { camelCase: 'is_verified', snake_case: 'is_verified', description: 'Verification status' },
  { camelCase: 'is_active', snake_case: 'is_active', description: 'Active status' },
  { camelCase: 'is_public', snake_case: 'is_public', description: 'Public visibility' },

  // Counts and metrics
  { camelCase: 'view_count', snake_case: 'view_count', description: 'View count' },
  { camelCase: 'share_count', snake_case: 'share_count', description: 'Share count' },
  { camelCase: 'comment_count', snake_case: 'comment_count', description: 'Comment count' },
  { camelCase: 'vote_count', snake_case: 'vote_count', description: 'Vote count' },
  { camelCase: 'like_count', snake_case: 'like_count', description: 'Like count' },
  { camelCase: 'dislike_count', snake_case: 'dislike_count', description: 'Dislike count' },

  // Scores
  { camelCase: 'engagement_score', snake_case: 'engagement_score', description: 'Engagement score' },
  { camelCase: 'transparency_score', snake_case: 'transparency_score', description: 'Transparency score' },
  { camelCase: 'risk_score', snake_case: 'risk_score', description: 'Risk score' },
  { camelCase: 'confidence_score', snake_case: 'confidence_score', description: 'Confidence score' },
];

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  'playwright-report',
  'test-results',
  '.next',
  'out'
];

class PropertyNamingFixer {
  private filesProcessed = 0;
  private filesModified = 0;
  private totalChanges = 0;
  private errors: Array<{ file: string; error: string }> = [];
  private changesByFile = new Map<string, number>();
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
   * Main entry point to fix property naming consistency
   */
  async fixPropertyNaming(): Promise<void> {
    console.log('🔧 Property Naming Consistency Fixer\n');

    if (this.options.dryRun) {
      console.log('🔍 Running in DRY RUN mode (no files will be modified)\n');
    }

    console.log(`📋 Will process ${PROPERTY_MAPPINGS.length} property mappings\n`);

    if (this.options.verbose) {
      console.log('Property mappings:');
      PROPERTY_MAPPINGS.forEach(mapping => {
        console.log(`   ${mapping.camelCase.padEnd(25)} → ${mapping.snake_case.padEnd(25)} ${mapping.description}`);
      });
      console.log('');
    }

    const startTime = Date.now();
    await this.processDirectory(this.options.rootDir!);
    const duration = Date.now() - startTime;

    this.generateSummaryReport(duration);
  }

  /**
   * Process a directory recursively
   */
  private async processDirectory(dirPath: string): Promise<void> {
    let items: string[];

    try {
      items = readdirSync(dirPath);
    } catch (error) {
      this.errors.push({ file: dirPath, error: `Cannot read directory: ${error}` });
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
        this.errors.push({ file: fullPath, error: `Cannot access: ${error}` });
      }
    }
  }

  /**
   * Check if directory should be excluded
   */
  private shouldExcludeDirectory(dirName: string): boolean {
    return EXCLUDE_PATTERNS.some(pattern => dirName === pattern || dirName.startsWith('.'));
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(filePath: string): boolean {
    const ext = extname(filePath);
    return ['.ts', '.tsx'].includes(ext) &&
      !filePath.includes('node_modules') &&
      !filePath.endsWith('.d.ts');
  }

  /**
   * Process a single file
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
            console.log(`     Line ${change.line}: ${change.pattern}`);
            console.log(`       - ${change.before}`);
            console.log(`       + ${change.after}`);
          });
        }

        this.filesModified++;
        this.totalChanges += changeCount;
        this.changesByFile.set(filePath, changeCount);
      }

      this.filesProcessed++;

    } catch (error) {
      this.errors.push({ file: filePath, error: String(error) });
      console.error(`❌ Error processing ${filePath}: ${error}`);
    }
  }

  /**
   * Transform content by applying all property mappings
   * This uses a line-by-line approach to track changes accurately
   */
  private transformContent(content: string): TransformResult {
    const lines = content.split('\n');
    const changes: TransformResult['changes'] = [];

    // Process each line independently to track line numbers accurately
    const transformedLines = lines.map((line, lineIndex) => {
      let transformedLine = line;
      const lineNumber = lineIndex + 1;

      for (const mapping of PROPERTY_MAPPINGS) {
        const lineResult = this.transformLine(transformedLine, mapping, lineNumber);

        if (lineResult.changed) {
          changes.push({
            line: lineNumber,
            pattern: lineResult.pattern!,
            before: transformedLine,
            after: lineResult.line
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
   * Transform a single line with a property mapping
   * Returns the transformed line and whether it changed
   */
  private transformLine(
    line: string,
    mapping: PropertyMapping,
    _lineNumber: number
  ): { line: string; changed: boolean; pattern?: string } {
    let result = line;
    let changed = false;
    let matchedPattern = '';

    // Pattern 1: Object property access (.camelCase)
    // Must not be preceded by alphanumeric to avoid matching within words
    const propAccessRegex = new RegExp(`(?<![a-zA-Z0-9_])\\.${mapping.camelCase}\\b`, 'g');
    if (propAccessRegex.test(line)) {
      result = result.replace(propAccessRegex, `.${mapping.snake_case}`);
      changed = true;
      matchedPattern = 'property access';
    }

    // Pattern 2: Destructuring { camelCase } or { camelCase, ... } or { ..., camelCase }
    // This handles all destructuring cases more reliably
    const destructRegex = new RegExp(
      `\\{([^}]*?)\\b${mapping.camelCase}\\b([^}]*?)\\}`,
      'g'
    );
    if (destructRegex.test(result)) {
      result = result.replace(destructRegex, `{$1${mapping.snake_case}$2}`);
      changed = true;
      matchedPattern = 'destructuring';
    }

    // Pattern 3: Object property shorthand and object literals
    // Matches "camelCase:" in object definitions (not in destructuring which we handled above)
    const objPropRegex = new RegExp(`\\b${mapping.camelCase}\\s*:(?!:)`, 'g');
    if (objPropRegex.test(result) && !result.includes('=>')) {
      result = result.replace(objPropRegex, `${mapping.snake_case}:`);
      changed = true;
      matchedPattern = 'object property';
    }

    // Pattern 4: Interface/Type property definitions (at line start with optional whitespace)
    const interfaceRegex = new RegExp(`^(\\s*)${mapping.camelCase}(\\??\\s*:)`, 'g');
    if (interfaceRegex.test(result)) {
      result = result.replace(interfaceRegex, `$1${mapping.snake_case}$2`);
      changed = true;
      matchedPattern = 'interface/type property';
    }

    // Pattern 5: Variable declarations
    // Only match when it's clearly a variable declaration
    const varDeclRegex = new RegExp(`\\b(const|let|var)\\s+${mapping.camelCase}\\b(?!\\w)`, 'g');
    if (varDeclRegex.test(result)) {
      result = result.replace(varDeclRegex, `$1 ${mapping.snake_case}`);
      changed = true;
      matchedPattern = 'variable declaration';
    }

    // Pattern 6: Function parameters
    // More careful matching to avoid false positives
    const paramRegex = new RegExp(`\\(([^)]*?)\\b${mapping.camelCase}\\b([^)]*?)\\)`, 'g');
    if (paramRegex.test(result) && (result.includes('=>') || result.includes('function'))) {
      result = result.replace(paramRegex, `($1${mapping.snake_case}$2)`);
      changed = true;
      matchedPattern = 'function parameter';
    }

    return { line: result, changed, pattern: matchedPattern };
  }

  /**
   * Generate comprehensive summary report
   */
  private generateSummaryReport(duration: number): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 Property Naming Fix Summary');
    console.log('='.repeat(70));
    console.log(`Files scanned:        ${this.filesProcessed}`);
    console.log(`Files modified:       ${this.filesModified}`);
    console.log(`Total changes:        ${this.totalChanges}`);
    console.log(`Errors encountered:   ${this.errors.length}`);
    console.log(`Time taken:           ${(duration / 1000).toFixed(2)}s`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(({ file, error }) => {
        console.log(`   ${relative(this.options.rootDir!, file)}: ${error}`);
      });
    }

    if (this.filesModified > 0) {
      console.log(`\n${this.options.dryRun ? '📋' : '✅'} Summary:`);

      if (this.options.dryRun) {
        console.log('   Dry run complete. No files were modified.');
        console.log('   Run without --dry-run flag to apply changes.');
      } else {
        console.log('   Property naming consistency improved successfully!');
        console.log('   All camelCase properties converted to snake_case.');
      }

      console.log('\n🔍 Recommended next steps:');
      console.log('   1. Review the changes with: git diff');
      console.log('   2. Run TypeScript compilation: npm run type-check');
      console.log('   3. Run your test suite: npm test');
      console.log('   4. Check for any remaining naming inconsistencies');
    } else {
      console.log('\n✅ No property naming issues found!');
      console.log('   Your codebase already follows snake_case conventions.');
    }

    console.log('='.repeat(70));
  }
}

// CLI execution
const _cliArg = process.argv[1] ?? '';
const isMainModule = import.meta.url.endsWith(_cliArg) || _cliArg.includes('fix-property-naming-consistency');

if (isMainModule) {
  const args = process.argv.slice(2);
  const options: FixerOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    rootDir: '.'
  };

  const fixer = new PropertyNamingFixer(options);
  fixer.fixPropertyNaming().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { PropertyNamingFixer, type PropertyMapping, type FixerOptions };