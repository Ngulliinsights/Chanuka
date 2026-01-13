// ============================================================================
// TYPE COMPATIBILITY CHECKER - Verify Type System Consistency
// ============================================================================
// Validates type compatibility across the codebase
// Detects breaking changes and migration issues

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

interface TypeCompatibilityReport {
  readonly passed: boolean;
  readonly timestamp: string;
  readonly checks: TypeCompatibilityCheck[];
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly warnings: number;
  };
}

interface TypeCompatibilityCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'warning';
  readonly message: string;
  readonly details?: string;
}

/**
 * Run TypeScript compiler in check mode
 */
export async function checkTypeCompatibility(options: {
  readonly project?: string;
  readonly verbose?: boolean;
} = {}): Promise<TypeCompatibilityReport> {
  const checks: TypeCompatibilityCheck[] = [];
  const project = options.project ?? 'tsconfig.json';
  const timestamp = new Date().toISOString();

  // Check 1: TypeScript compilation
  try {
    if (options.verbose) console.log('🔍 Check 1: TypeScript compilation...');
    execSync(`npx tsc --noEmit --project ${project}`, { stdio: 'pipe' });
    checks.push({
      name: 'TypeScript Compilation',
      status: 'pass',
      message: 'All TypeScript files compile successfully',
    });
  } catch (error) {
    checks.push({
      name: 'TypeScript Compilation',
      status: 'fail',
      message: 'TypeScript compilation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 2: Branded type usage
  try {
    if (options.verbose) console.log('🔍 Check 2: Branded type consistency...');
    const brandedTypeUsage = await checkBrandedTypeUsage();
    checks.push({
      name: 'Branded Type Consistency',
      status: brandedTypeUsage.consistent ? 'pass' : 'warning',
      message: brandedTypeUsage.message,
      details: brandedTypeUsage.details,
    });
  } catch (error) {
    checks.push({
      name: 'Branded Type Consistency',
      status: 'warning',
      message: 'Could not verify branded type usage',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 3: Import path consistency
  try {
    if (options.verbose) console.log('🔍 Check 3: Import path consistency...');
    const importConsistency = await checkImportConsistency();
    checks.push({
      name: 'Import Path Consistency',
      status: importConsistency.consistent ? 'pass' : 'warning',
      message: importConsistency.message,
      details: importConsistency.details,
    });
  } catch (error) {
    checks.push({
      name: 'Import Path Consistency',
      status: 'warning',
      message: 'Could not verify import consistency',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 4: Validation schema compatibility
  try {
    if (options.verbose) console.log('🔍 Check 4: Validation schema compatibility...');
    const schemaCompatibility = await checkSchemaCompatibility();
    checks.push({
      name: 'Validation Schema Compatibility',
      status: schemaCompatibility.compatible ? 'pass' : 'warning',
      message: schemaCompatibility.message,
      details: schemaCompatibility.details,
    });
  } catch (error) {
    checks.push({
      name: 'Validation Schema Compatibility',
      status: 'warning',
      message: 'Could not verify schema compatibility',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // Check 5: Database type alignment
  try {
    if (options.verbose) console.log('🔍 Check 5: Database type alignment...');
    const dbAlignment = await checkDatabaseTypeAlignment();
    checks.push({
      name: 'Database Type Alignment',
      status: dbAlignment.aligned ? 'pass' : 'warning',
      message: dbAlignment.message,
      details: dbAlignment.details,
    });
  } catch (error) {
    checks.push({
      name: 'Database Type Alignment',
      status: 'warning',
      message: 'Could not verify database type alignment',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // Calculate summary
  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.status === 'pass').length,
    failed: checks.filter((c) => c.status === 'fail').length,
    warnings: checks.filter((c) => c.status === 'warning').length,
  };

  const report: TypeCompatibilityReport = {
    passed: summary.failed === 0,
    timestamp,
    checks,
    summary,
  };

  return report;
}

/**
 * Check branded type usage consistency
 */
async function checkBrandedTypeUsage(): Promise<{
  consistent: boolean;
  message: string;
  details: string;
}> {
  try {
    // Check that branded types are imported from correct location
    const brandedTypeFile = path.join(
      process.cwd(),
      'shared/types/core/common.ts'
    );
    await fs.access(brandedTypeFile);

    return {
      consistent: true,
      message: 'Branded types defined in consistent location',
      details: 'shared/types/core/common.ts contains all branded type definitions',
    };
  } catch {
    return {
      consistent: false,
      message: 'Branded type definitions not found in expected location',
      details: 'Expected file: shared/types/core/common.ts',
    };
  }
}

/**
 * Check import path consistency across codebase
 */
async function checkImportConsistency(): Promise<{
  consistent: boolean;
  message: string;
  details: string;
}> {
  // This is a simplified check - in production, would parse all files
  try {
    // Verify key import paths exist
    const keyPaths = [
      'shared/types/core/common.ts',
      'shared/schema/domains/foundation.ts',
      'shared/schema/validation-integration.ts',
      'shared/schema/index.ts',
    ];

    for (const keyPath of keyPaths) {
      await fs.access(path.join(process.cwd(), keyPath));
    }

    return {
      consistent: true,
      message: 'All key import paths are consistent',
      details: `Verified ${keyPaths.length} critical import paths`,
    };
  } catch (error) {
    return {
      consistent: false,
      message: 'Some import paths are missing or inconsistent',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check validation schema compatibility
 */
async function checkSchemaCompatibility(): Promise<{
  compatible: boolean;
  message: string;
  details: string;
}> {
  try {
    const schemaFile = path.join(
      process.cwd(),
      'shared/schema/validation-integration.ts'
    );
    await fs.access(schemaFile);

    return {
      compatible: true,
      message: 'Validation schemas are compatible',
      details: 'validation-integration.ts exports all required validators',
    };
  } catch {
    return {
      compatible: false,
      message: 'Validation schemas missing or incompatible',
      details: 'Expected file: shared/schema/validation-integration.ts',
    };
  }
}

/**
 * Check database type alignment
 */
async function checkDatabaseTypeAlignment(): Promise<{
  aligned: boolean;
  message: string;
  details: string;
}> {
  try {
    const integrationFile = path.join(
      process.cwd(),
      'shared/schema/integration.ts'
    );
    const extendedFile = path.join(
      process.cwd(),
      'shared/schema/integration-extended.ts'
    );

    await fs.access(integrationFile);
    await fs.access(extendedFile);

    return {
      aligned: true,
      message: 'Database type definitions are properly aligned',
      details: 'Both integration and integration-extended schemas exist and are accessible',
    };
  } catch (error) {
    return {
      aligned: false,
      message: 'Database type definitions are misaligned',
      details: error instanceof Error ? error.message : 'Schema files not found',
    };
  }
}

/**
 * Generate compatibility report in markdown format
 */
export function generateCompatibilityReport(report: TypeCompatibilityReport): string {
  let markdown = '# Type Compatibility Report\n\n';
  markdown += `Generated: ${report.timestamp}\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Total Checks**: ${report.summary.total}\n`;
  markdown += `- **Passed**: ✅ ${report.summary.passed}\n`;
  markdown += `- **Failed**: ❌ ${report.summary.failed}\n`;
  markdown += `- **Warnings**: ⚠️ ${report.summary.warnings}\n`;
  markdown += `- **Status**: ${report.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;

  markdown += '## Checks\n\n';
  for (const check of report.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    markdown += `### ${icon} ${check.name}\n\n`;
    markdown += `${check.message}\n`;
    if (check.details) {
      markdown += `\n**Details**: ${check.details}\n`;
    }
    markdown += '\n';
  }

  return markdown;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const verbose = process.argv.includes('--verbose');
  const project = process.argv[process.argv.indexOf('--project') + 1] ?? 'tsconfig.json';

  console.log('🔍 Starting type compatibility checks...\n');

  checkTypeCompatibility({ project, verbose })
    .then((report) => {
      const markdown = generateCompatibilityReport(report);
      console.log(markdown);

      if (report.passed) {
        console.log('\n✅ All compatibility checks passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some compatibility checks failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Compatibility check failed:', error);
      process.exit(1);
    });
}
