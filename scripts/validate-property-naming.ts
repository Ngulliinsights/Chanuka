#!/usr/bin/env node

/**
 * Property Naming Validation Script
 * 
 * This script validates property naming consistency across the codebase
 * and identifies any remaining camelCase/snake_case mismatches.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface ValidationIssue {
  file: string;
  line: number;
  column: number;
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  totalFiles: number;
  issuesFound: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

// Common database field patterns that should use snake_case
const DATABASE_FIELD_PATTERNS = [
  'user_id', 'bill_id', 'sponsor_id', 'session_id', 'comment_id', 'notification_id',
  'committee_id', 'campaign_id', 'analysis_id', 'report_id', 'profile_id',
  'engagement_id', 'verification_id', 'created_at', 'updated_at', 'deleted_at',
  'password_hash', 'first_name', 'last_name', 'phone_number', 'email_address',
  'is_verified', 'is_active', 'is_public', 'view_count', 'share_count',
  'comment_count', 'vote_count', 'like_count', 'dislike_count',
  'engagement_score', 'transparency_score', 'risk_score', 'confidence_score',
  'primary_bill_id', 'parent_comment_id', 'reported_user_id', 'reported_comment_id',
  'assigned_moderator_id', 'target_sponsor_id', 'verification_token', 'reset_token',
  'access_token', 'refresh_token', 'expires_at', 'last_login_at', 'last_seen_at',
  'introduced_date', 'passed_date', 'rejected_date', 'amended_date',
  'published_date', 'scheduled_date', 'completed_date', 'assigned_date',
  'report_date', 'due_date', 'start_date', 'end_date', 'birth_date',
  'join_date', 'leave_date'
];

// CamelCase equivalents that should be flagged
const CAMELCASE_EQUIVALENTS = [
  'userId', 'billId', 'sponsorId', 'sessionId', 'commentId', 'notificationId',
  'committeeId', 'campaignId', 'analysisId', 'reportId', 'profileId',
  'engagementId', 'verificationId', 'createdAt', 'updatedAt', 'deletedAt',
  'passwordHash', 'firstName', 'lastName', 'phoneNumber', 'emailAddress',
  'isVerified', 'isActive', 'isPublic', 'viewCount', 'shareCount',
  'commentCount', 'voteCount', 'likeCount', 'dislikeCount',
  'engagementScore', 'transparencyScore', 'riskScore', 'confidenceScore',
  'primaryBillId', 'parentCommentId', 'reportedUserId', 'reportedCommentId',
  'assignedModeratorId', 'targetSponsorId', 'verificationToken', 'resetToken',
  'accessToken', 'refreshToken', 'expiresAt', 'lastLoginAt', 'lastSeenAt',
  'introducedDate', 'passedDate', 'rejectedDate', 'amendedDate',
  'publishedDate', 'scheduledDate', 'completedDate', 'assignedDate',
  'reportDate', 'dueDate', 'startDate', 'endDate', 'birthDate',
  'joinDate', 'leaveDate'
];

class PropertyNamingValidator {
  private validationResult: ValidationResult = {
    totalFiles: 0,
    issuesFound: [],
    summary: { errors: 0, warnings: 0, info: 0 }
  };

  /**
   * Validate property naming consistency across the codebase
   */
  async validatePropertyNaming(): Promise<ValidationResult> {
    console.log('🔍 Validating Property Naming Consistency...\n');

    await this.processDirectory('.');
    this.generateReport();

    return this.validationResult;
  }

  /**
   * Process directory recursively
   */
  private async processDirectory(dirPath: string): Promise<void> {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (this.shouldProcessDirectory(item)) {
          await this.processDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        if (this.shouldProcessFile(fullPath)) {
          await this.validateFile(fullPath);
        }
      }
    }
  }

  /**
   * Check if directory should be processed
   */
  private shouldProcessDirectory(dirName: string): boolean {
    const excludePatterns = ['node_modules', '.git', 'dist', 'build', 'coverage', '.cache'];
    return !excludePatterns.some(pattern => dirName.includes(pattern));
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(filePath: string): boolean {
    const ext = extname(filePath);
    return ['.ts', '.tsx'].includes(ext) && !filePath.includes('.d.ts');
  }

  /**
   * Validate a single file
   */
  private async validateFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      this.validationResult.totalFiles++;

      lines.forEach((line, lineIndex) => {
        this.validateLine(filePath, line, lineIndex + 1);
      });

    } catch (error) {
      this.addIssue(filePath, 0, 0, `Error reading file: ${error}`, 'Check file permissions', 'error');
    }
  }

  /**
   * Validate a single line for property naming issues
   */
  private validateLine(filePath: string, line: string, lineNumber: number): void {
    // Check for camelCase database field usage
    CAMELCASE_EQUIVALENTS.forEach((camelCase, index) => {
      const snakeCase = DATABASE_FIELD_PATTERNS[index];
      
      // Pattern 1: Property access (.camelCase)
      const propertyAccessRegex = new RegExp(`\\.${camelCase}\\b`, 'g');
      let match;
      while ((match = propertyAccessRegex.exec(line)) !== null) {
        this.addIssue(
          filePath,
          lineNumber,
          match.index,
          `Using camelCase property access: .${camelCase}`,
          `Use snake_case: .${snakeCase}`,
          'error'
        );
      }

      // Pattern 2: Object property definition (camelCase:)
      const propertyDefRegex = new RegExp(`\\b${camelCase}\\s*:`, 'g');
      while ((match = propertyDefRegex.exec(line)) !== null) {
        this.addIssue(
          filePath,
          lineNumber,
          match.index,
          `Using camelCase property definition: ${camelCase}:`,
          `Use snake_case: ${snakeCase}:`,
          'error'
        );
      }

      // Pattern 3: Destructuring ({ camelCase })
      const destructuringRegex = new RegExp(`\\{[^}]*\\b${camelCase}\\b[^}]*\\}`, 'g');
      while ((match = destructuringRegex.exec(line)) !== null) {
        this.addIssue(
          filePath,
          lineNumber,
          match.index,
          `Using camelCase in destructuring: ${camelCase}`,
          `Use snake_case: ${snakeCase}`,
          'error'
        );
      }
    });

    // Check for potential database queries with mixed naming
    if (line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE')) {
      const hasCamelCase = CAMELCASE_EQUIVALENTS.some(camelCase => line.includes(camelCase));
      if (hasCamelCase) {
        this.addIssue(
          filePath,
          lineNumber,
          0,
          'SQL query contains camelCase field names',
          'Use snake_case field names in SQL queries',
          'warning'
        );
      }
    }

    // Check for Drizzle ORM usage consistency
    if (line.includes('eq(') || line.includes('ne(') || line.includes('gt(') || line.includes('lt(')) {
      const hasCamelCase = CAMELCASE_EQUIVALENTS.some(camelCase => line.includes(`.${camelCase}`));
      if (hasCamelCase) {
        this.addIssue(
          filePath,
          lineNumber,
          0,
          'Drizzle ORM query uses camelCase field reference',
          'Use snake_case field references with Drizzle ORM',
          'error'
        );
      }
    }
  }

  /**
   * Add a validation issue
   */
  private addIssue(
    file: string,
    line: number,
    column: number,
    issue: string,
    suggestion: string,
    severity: 'error' | 'warning' | 'info'
  ): void {
    this.validationResult.issuesFound.push({
      file,
      line,
      column,
      issue,
      suggestion,
      severity
    });

    this.validationResult.summary[severity]++;
  }

  /**
   * Generate validation report
   */
  private generateReport(): void {
    const { totalFiles, issuesFound, summary } = this.validationResult;

    console.log('📊 Property Naming Validation Report');
    console.log('=====================================');
    console.log(`Files processed: ${totalFiles}`);
    console.log(`Total issues found: ${issuesFound.length}`);
    console.log(`  Errors: ${summary.errors}`);
    console.log(`  Warnings: ${summary.warnings}`);
    console.log(`  Info: ${summary.info}`);

    if (issuesFound.length === 0) {
      console.log('\n✅ No property naming issues found!');
      console.log('   All properties follow consistent snake_case naming.');
      return;
    }

    // Group issues by file
    const issuesByFile = issuesFound.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, ValidationIssue[]>);

    console.log('\n🔍 Issues Found:');
    console.log('================');

    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`\n📄 ${file}:`);
      issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} Line ${issue.line}: ${issue.issue}`);
        console.log(`      💡 ${issue.suggestion}`);
      });
    });

    // Show top issues
    const topIssues = this.getTopIssues(5);
    if (topIssues.length > 0) {
      console.log('\n🔥 Most Common Issues:');
      console.log('======================');
      topIssues.forEach((issueGroup, index) => {
        console.log(`${index + 1}. ${issueGroup.issue} (${issueGroup.count} occurrences)`);
        console.log(`   💡 ${issueGroup.suggestion}`);
      });
    }

    console.log('\n🛠️  Recommended Actions:');
    console.log('========================');
    console.log('1. Run the property naming fixer: npm run fix:property-naming');
    console.log('2. Update any remaining manual references');
    console.log('3. Run TypeScript compilation to verify fixes');
    console.log('4. Run tests to ensure functionality is preserved');
  }

  /**
   * Get top issues by frequency
   */
  private getTopIssues(limit: number): Array<{ issue: string; suggestion: string; count: number }> {
    const issueCounts = this.validationResult.issuesFound.reduce((acc, issue) => {
      const key = `${issue.issue}|${issue.suggestion}`;
      if (!acc[key]) {
        acc[key] = { issue: issue.issue, suggestion: issue.suggestion, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { issue: string; suggestion: string; count: number }>);

    return Object.values(issueCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Run the validator if this script is executed directly
const isMainModule = import.meta.url.endsWith(process.argv[1]) || 
                     import.meta.url.includes('validate-property-naming.ts');

if (isMainModule) {
  const validator = new PropertyNamingValidator();
  validator.validatePropertyNaming().then(result => {
    if (result.summary.errors > 0) {
      console.log('\n❌ Validation failed with errors. Please fix the issues above.');
      process.exit(1);
    } else if (result.summary.warnings > 0) {
      console.log('\n⚠️  Validation completed with warnings. Consider addressing them.');
      process.exit(0);
    } else {
      console.log('\n✅ Validation passed! Property naming is consistent.');
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { PropertyNamingValidator };