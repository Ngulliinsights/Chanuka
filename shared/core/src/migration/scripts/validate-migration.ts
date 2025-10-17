#!/usr/bin/env node

/**
 * Migration Validation Script
 * 
 * Validates that the migration from existing implementations to core utilities
 * has been completed successfully and all functionality is working
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { logger } from '../utils/logger';

interface ValidationCheck {
  name: string;
  description: string;
  check: () => Promise<ValidationResult>;
  severity: 'error' | 'warn' | 'info';
}

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: Array<{
    check: string;
    result: ValidationResult;
    severity: 'error' | 'warn' | 'info';
  }>;
}

class MigrationValidator {
  private rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  private validationChecks: ValidationCheck[] = [
    {
      name: 'core-package-installed',
      description: 'Check if @Chanuka/core package is installed',
      severity: 'error',
      check: async () => {
        try {
          const packageJsonPath = join(this.rootPath, 'package.json');
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
          
          const hasDependency = packageJson.dependencies?.['@Chanuka/core'] || 
                               packageJson.devDependencies?.['@Chanuka/core'];
          
          if (hasDependency) {
            return {
              passed: true,
              message: '@Chanuka/core package is properly configured'
            };
          } else {
            return {
              passed: false,
              message: '@Chanuka/core package not found in dependencies',
              details: ['Add "@Chanuka/core": "workspace:*" to your package.json dependencies']
            };
          }
        } catch (error) {
          return {
            passed: false,
            message: `Failed to check package.json: ${error}`
          };
        }
      }
    },

    {
      name: 'old-cache-imports',
      description: 'Check for remaining old cache service imports',
      severity: 'error',
      check: async () => {
        const patterns = [
          'from.*server/cache/CacheService',
          'from.*shared/services/CacheService',
          'from.*infrastructure/cache/CacheService'
        ];
        
        const foundImports: string[] = [];
        
        for (const pattern of patterns) {
          try {
            const result = execSync(`grep -r "${pattern}" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`, {
              cwd: this.rootPath,
              encoding: 'utf8'
            });
            
            if (result.trim()) {
              foundImports.push(...result.trim().split('\n'));
            }
          } catch (error) {
            // grep returns non-zero exit code when no matches found, which is good
          }
        }
        
        if (foundImports.length === 0) {
          return {
            passed: true,
            message: 'No old cache service imports found'
          };
        } else {
          return {
            passed: false,
            message: `Found ${foundImports.length} old cache service imports`,
            details: foundImports.slice(0, 10) // Show first 10
          };
        }
      }
    },

    {
      name: 'old-logger-imports',
      description: 'Check for remaining old logger imports',
      severity: 'error',
      check: async () => {
        const patterns = [
          'from.*infrastructure/monitoring/logger',
          'from.*shared/services/logger'
        ];
        
        const foundImports: string[] = [];
        
        for (const pattern of patterns) {
          try {
            const result = execSync(`grep -r "${pattern}" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`, {
              cwd: this.rootPath,
              encoding: 'utf8'
            });
            
            if (result.trim()) {
              foundImports.push(...result.trim().split('\n'));
            }
          } catch (error) {
            // No matches found is good
          }
        }
        
        if (foundImports.length === 0) {
          return {
            passed: true,
            message: 'No old logger imports found'
          };
        } else {
          return {
            passed: false,
            message: `Found ${foundImports.length} old logger imports`,
            details: foundImports.slice(0, 10)
          };
        }
      }
    },

    {
      name: 'old-middleware-imports',
      description: 'Check for remaining old middleware imports',
      severity: 'warn',
      check: async () => {
        const patterns = [
          'from.*middleware/auth.middleware',
          'from.*middleware/cache.middleware',
          'from.*middleware/validation.middleware',
          'from.*middleware/error'
        ];
        
        const foundImports: string[] = [];
        
        for (const pattern of patterns) {
          try {
            const result = execSync(`grep -r "${pattern}" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`, {
              cwd: this.rootPath,
              encoding: 'utf8'
            });
            
            if (result.trim()) {
              foundImports.push(...result.trim().split('\n'));
            }
          } catch (error) {
            // No matches found is good
          }
        }
        
        if (foundImports.length === 0) {
          return {
            passed: true,
            message: 'No old middleware imports found'
          };
        } else {
          return {
            passed: false,
            message: `Found ${foundImports.length} old middleware imports`,
            details: foundImports.slice(0, 10)
          };
        }
      }
    },

    {
      name: 'core-imports-present',
      description: 'Check if new core utility imports are being used',
      severity: 'info',
      check: async () => {
        const patterns = [
          'from.*@Chanuka/core',
          'from.*@Chanuka/core/cache',
          'from.*@Chanuka/core/logging',
          'from.*@Chanuka/core/validation'
        ];
        
        const foundImports: string[] = [];
        
        for (const pattern of patterns) {
          try {
            const result = execSync(`grep -r "${pattern}" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`, {
              cwd: this.rootPath,
              encoding: 'utf8'
            });
            
            if (result.trim()) {
              foundImports.push(...result.trim().split('\n'));
            }
          } catch (error) {
            // No matches found
          }
        }
        
        if (foundImports.length > 0) {
          return {
            passed: true,
            message: `Found ${foundImports.length} core utility imports`,
            details: [`Using new core utilities in ${foundImports.length} locations`]
          };
        } else {
          return {
            passed: false,
            message: 'No core utility imports found - migration may not be complete'
          };
        }
      }
    },

    {
      name: 'typescript-compilation',
      description: 'Check if TypeScript compilation succeeds',
      severity: 'error',
      check: async () => {
        try {
          // Check if tsconfig.json exists
          const tsconfigPath = join(this.rootPath, 'tsconfig.json');
          await fs.access(tsconfigPath);
          
          // Try to compile
          execSync('npx tsc --noEmit', {
            cwd: this.rootPath,
            stdio: 'pipe'
          });
          
          return {
            passed: true,
            message: 'TypeScript compilation successful'
          };
        } catch (error) {
          return {
            passed: false,
            message: 'TypeScript compilation failed',
            details: [String(error).slice(0, 500)] // Truncate error message
          };
        }
      }
    },

    {
      name: 'environment-variables',
      description: 'Check for deprecated environment variables',
      severity: 'warn',
      check: async () => {
        const deprecatedVars = [
          'REDIS_HOST',
          'REDIS_PORT', 
          'CACHE_TTL_SECONDS',
          'ENABLE_PRETTY_LOGS'
        ];
        
        const foundVars: string[] = [];
        
        try {
          // Check .env files
          const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
          
          for (const envFile of envFiles) {
            try {
              const envPath = join(this.rootPath, envFile);
              const content = await fs.readFile(envPath, 'utf8');
              
              for (const varName of deprecatedVars) {
                if (content.includes(varName)) {
                  foundVars.push(`${envFile}: ${varName}`);
                }
              }
            } catch (error) {
              // File doesn't exist, skip
            }
          }
          
          // Check process.env usage in code
          for (const varName of deprecatedVars) {
            try {
              const result = execSync(`grep -r "process.env.${varName}" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules`, {
                cwd: this.rootPath,
                encoding: 'utf8'
              });
              
              if (result.trim()) {
                foundVars.push(`Code: process.env.${varName}`);
              }
            } catch (error) {
              // No matches found is good
            }
          }
          
        } catch (error) {
          return {
            passed: false,
            message: `Failed to check environment variables: ${error}`
          };
        }
        
        if (foundVars.length === 0) {
          return {
            passed: true,
            message: 'No deprecated environment variables found'
          };
        } else {
          return {
            passed: false,
            message: `Found ${foundVars.length} deprecated environment variables`,
            details: foundVars
          };
        }
      }
    },

    {
      name: 'core-functionality-test',
      description: 'Test basic core utility functionality',
      severity: 'error',
      check: async () => {
        try {
          // Try to import and use core utilities
          const testScript = `
            const { createCacheService } = require('@Chanuka/core/cache');
            const { Logger } = require('@Chanuka/core/logging');
            
            // Test cache
            const cache = createCacheService({
              provider: 'memory',
              maxMemoryMB: 10,
              enableMetrics: true
            });
            
            // Test logger
            const logger = new Logger({ level: 'info' });
            
            logger.info('Core utilities test passed', { component: 'Chanuka' });
          `;
          
          const testFile = join(this.rootPath, 'temp-migration-test.js');
          await fs.writeFile(testFile, testScript);
          
          execSync(`node ${testFile}`, {
            cwd: this.rootPath,
            stdio: 'pipe'
          });
          
          // Clean up test file
          await fs.unlink(testFile);
          
          return {
            passed: true,
            message: 'Core utilities functionality test passed'
          };
        } catch (error) {
          return {
            passed: false,
            message: 'Core utilities functionality test failed',
            details: [String(error).slice(0, 500)]
          };
        }
      }
    },

    {
      name: 'legacy-files-cleanup',
      description: 'Check if legacy files have been removed or marked for removal',
      severity: 'info',
      check: async () => {
        const legacyPaths = [
          'server/cache/CacheService.ts',
          'src/shared/services/CacheService.ts',
          'server/infrastructure/cache/CacheService.ts',
          'server/infrastructure/monitoring/logger.ts',
          'src/shared/services/logger.ts'
        ];
        
        const existingFiles: string[] = [];
        
        for (const path of legacyPaths) {
          try {
            const fullPath = join(this.rootPath, path);
            await fs.access(fullPath);
            existingFiles.push(path);
          } catch (error) {
            // File doesn't exist, which is good
          }
        }
        
        if (existingFiles.length === 0) {
          return {
            passed: true,
            message: 'Legacy files have been cleaned up'
          };
        } else {
          return {
            passed: false,
            message: `Found ${existingFiles.length} legacy files that could be removed`,
            details: existingFiles
          };
        }
      }
    }
  ];

  async validateMigration(): Promise<ValidationSummary> {
    logger.info('🔍 Starting migration validation...\n', { component: 'Chanuka' });

    const summary: ValidationSummary = {
      totalChecks: this.validationChecks.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      results: []
    };

    for (const check of this.validationChecks) {
      console.log(`⏳ Running: ${check.description}`);
      
      try {
        const result = await check.check();
        
        summary.results.push({
          check: check.name,
          result,
          severity: check.severity
        });

        if (result.passed) {
          summary.passed++;
          console.log(`✅ ${check.description}: ${result.message}`);
        } else {
          if (check.severity === 'error') {
            summary.failed++;
            console.log(`❌ ${check.description}: ${result.message}`);
          } else {
            summary.warnings++;
            console.log(`⚠️  ${check.description}: ${result.message}`);
          }
          
          if (result.details) {
            result.details.forEach(detail => {
              console.log(`   ${detail}`);
            });
          }
        }
      } catch (error) {
        summary.failed++;
        console.log(`💥 ${check.description}: Check failed - ${error}`);
        
        summary.results.push({
          check: check.name,
          result: {
            passed: false,
            message: `Check failed: ${error}`
          },
          severity: check.severity
        });
      }
      
      logger.info('', { component: 'Chanuka' }); // Empty line for readability
    }

    return summary;
  }

  async generateValidationReport(summary: ValidationSummary): Promise<string> {
    const reportPath = join(this.rootPath, 'MIGRATION_VALIDATION_REPORT.md');
    const timestamp = new Date().toISOString();
    
    let report = `# Migration Validation Report

Generated: ${timestamp}

## Summary
- **Total Checks**: ${summary.totalChecks}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Warnings**: ${summary.warnings}

## Overall Status
${summary.failed === 0 ? '✅ **MIGRATION SUCCESSFUL**' : '❌ **MIGRATION INCOMPLETE**'}

${summary.failed === 0 
  ? 'All critical validation checks passed. The migration to @Chanuka/core is complete.'
  : `${summary.failed} critical issues found. Please address these before considering the migration complete.`
}

## Detailed Results

`;

    for (const { check, result, severity } of summary.results) {
      const icon = result.passed ? '✅' : (severity === 'error' ? '❌' : '⚠️');
      const checkInfo = this.validationChecks.find(c => c.name === check);
      
      report += `### ${icon} ${checkInfo?.description || check}\n\n`;
      report += `**Status**: ${result.passed ? 'PASSED' : 'FAILED'}\n`;
      report += `**Severity**: ${severity.toUpperCase()}\n`;
      report += `**Message**: ${result.message}\n\n`;
      
      if (result.details && result.details.length > 0) {
        report += `**Details**:\n`;
        result.details.forEach(detail => {
          report += `- ${detail}\n`;
        });
        report += '\n';
      }
    }

    if (summary.failed > 0) {
      report += `## Action Items

To complete the migration, please address the following issues:

`;
      
      const failedChecks = summary.results.filter(r => !r.result.passed && r.severity === 'error');
      failedChecks.forEach((item, index) => {
        const checkInfo = this.validationChecks.find(c => c.name === item.check);
        report += `${index + 1}. **${checkInfo?.description}**: ${item.result.message}\n`;
        if (item.result.details) {
          item.result.details.forEach(detail => {
            report += `   - ${detail}\n`;
          });
        }
        report += '\n';
      });
    }

    if (summary.warnings > 0) {
      report += `## Warnings

The following items should be addressed for optimal migration:

`;
      
      const warningChecks = summary.results.filter(r => !r.result.passed && r.severity === 'warn');
      warningChecks.forEach((item, index) => {
        const checkInfo = this.validationChecks.find(c => c.name === item.check);
        report += `${index + 1}. **${checkInfo?.description}**: ${item.result.message}\n`;
        if (item.result.details) {
          item.result.details.forEach(detail => {
            report += `   - ${detail}\n`;
          });
        }
        report += '\n';
      });
    }

    report += `## Next Steps

${summary.failed === 0 
  ? `🎉 **Congratulations!** Your migration to @Chanuka/core is complete.

### Post-Migration Tasks:
1. Remove any legacy files that are no longer needed
2. Update your documentation to reflect the new import paths
3. Train your team on the new core utilities APIs
4. Consider setting up monitoring for the new core utilities
5. Run your full test suite to ensure everything works as expected`
  : `### To Complete Migration:
1. Address all failed validation checks listed above
2. Re-run this validation script: \`npm run validate-migration\`
3. Once all checks pass, your migration will be complete

### Common Issues:
- **Missing @Chanuka/core dependency**: Add it to your package.json
- **Old imports remaining**: Use find/replace to update import statements
- **TypeScript errors**: Update type imports and fix any API changes
- **Environment variables**: Update deprecated env vars to new format`
}

---
*This report was generated automatically by the Migration Validation Tool*
`;

    await fs.writeFile(reportPath, report, 'utf8');
    return reportPath;
  }

  printSummary(summary: ValidationSummary): void {
    logger.info('📊 Validation Summary:', { component: 'Chanuka' });
    console.log(`   Total checks: ${summary.totalChecks}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   ⚠️  Warnings: ${summary.warnings}`);
    
    if (summary.failed === 0) {
      logger.info('\n🎉 Migration validation successful!', { component: 'Chanuka' });
      logger.info('✅ All critical checks passed', { component: 'Chanuka' });
      logger.info('🚀 Your migration to @Chanuka/core is complete', { component: 'Chanuka' });
    } else {
      logger.info('\n⚠️  Migration validation found issues', { component: 'Chanuka' });
      console.log(`❌ ${summary.failed} critical issues need to be addressed`);
      logger.info('📋 Check the validation report for detailed information', { component: 'Chanuka' });
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new MigrationValidator(process.argv[2] || process.cwd());
  
  validator.validateMigration()
    .then(async (summary) => {
      const reportPath = await validator.generateValidationReport(summary);
      console.log(`📋 Validation report created: ${reportPath}`);
      
      validator.printSummary(summary);
      
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      logger.error('💥 Validation failed:', { component: 'Chanuka' }, error);
      process.exit(1);
    });
}

export { MigrationValidator };






