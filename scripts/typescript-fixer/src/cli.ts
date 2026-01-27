#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { Configuration } from './types/core';
import { ProjectAnalyzer } from './analyzers/project-analyzer';

const program = new Command();

// Default configuration for the Chanuka project
const DEFAULT_CONFIG: Configuration = {
  enabledErrorTypes: [
    2304, // Cannot find name
    6133, // Declared but never used
    2375, // Duplicate identifier / exactOptionalPropertyTypes
    7030, // Not all code paths return a value
    2345, // Argument of type X is not assignable to parameter of type Y
    2339, // Property does not exist on type
    2322, // Type is missing properties
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/tests/**',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  includePatterns: [
    'server/**/*.ts',
    'client/src/**/*.ts',
    'client/src/**/*.tsx',
    'shared/**/*.ts',
  ],
  backupFiles: true,
  previewMode: false,
  outputFormat: 'console',
  maxConcurrency: 4,
  continueOnError: true,
  chanukaSettings: {
    projectRoot: process.cwd(),
    tsConfigPath: 'tsconfig.json',
    schemaTableNames: [
      'users', 'bills', 'user_profiles', 'impact_measurement',
      'transactions', 'notifications', 'audit_logs'
    ],
    sharedCoreUtilities: [
      'logger', 'cacheKeys', 'ApiSuccess', 'ApiError', 'ApiValidationError',
      'ApiResponseWrapper', 'validateRequest', 'ErrorHandler'
    ],
    databasePatterns: [
      '@server/infrastructure/database/connection',
      'databaseService',
      'db',
      'connection'
    ],
  },
};

program
  .name('ts-fix')
  .description('Automated TypeScript error fixing tool for the Chanuka project')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze the project structure and identify common patterns')
  .option('-p, --project <path>', 'Path to the project root', process.cwd())
  .option('-o, --output <format>', 'Output format (console|json|markdown)', 'console')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing Chanuka project structure...'));
      
      const analyzer = new ProjectAnalyzer(options.project);
      const structure = await analyzer.analyzeProject();
      
      if (options.output === 'json') {
        console.log(JSON.stringify(structure, null, 2));
      } else if (options.output === 'markdown') {
        printMarkdownReport(structure);
      } else {
        printConsoleReport(structure);
      }
      
      console.log(chalk.green('✅ Analysis complete!'));
    } catch (error) {
      console.error(chalk.red('❌ Analysis failed:'), error);
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Fix TypeScript errors in the specified files or directories')
  .argument('[paths...]', 'Files or directories to process (default: entire project)')
  .option('-p, --project <path>', 'Path to the project root', process.cwd())
  .option('--preview', 'Preview changes without applying them', false)
  .option('--no-backup', 'Skip creating backup files', false)
  .option('-e, --errors <codes>', 'Comma-separated list of error codes to fix', '')
  .option('-o, --output <format>', 'Output format (console|json|markdown)', 'console')
  .option('--max-concurrency <number>', 'Maximum number of files to process in parallel', '4')
  .option('--continue-on-error', 'Continue processing even if some files fail', true)
  .action(async (paths, options) => {
    try {
      console.log(chalk.blue('🔧 Starting TypeScript error fixing...'));
      
      const config = createConfiguration(options);
      
      // TODO: Implement the actual fixing logic in subsequent tasks
      console.log(chalk.yellow('⚠️  Fix functionality will be implemented in subsequent tasks'));
      console.log('Configuration:', config);
      console.log('Paths to process:', paths.length > 0 ? paths : ['entire project']);
      
    } catch (error) {
      console.error(chalk.red('❌ Fix operation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .option('-p, --project <path>', 'Path to the project root', process.cwd())
  .action((options) => {
    const config = createConfiguration(options);
    console.log(chalk.blue('📋 Current Configuration:'));
    console.log(JSON.stringify(config, null, 2));
  });

/**
 * Creates a configuration object from command line options
 */
function createConfiguration(options: any): Configuration {
  const config = { ...DEFAULT_CONFIG };
  
  // Update project root
  config.chanukaSettings.projectRoot = path.resolve(options.project);
  
  // Update preview mode
  if (options.preview) {
    config.previewMode = true;
  }
  
  // Update backup setting
  if (options.noBackup) {
    config.backupFiles = false;
  }
  
  // Update error codes
  if (options.errors) {
    const errorCodes = options.errors.split(',').map((code: string) => parseInt(code.trim(), 10));
    config.enabledErrorTypes = errorCodes.filter((code: number) => !isNaN(code));
  }
  
  // Update output format
  if (options.output) {
    config.outputFormat = options.output as 'console' | 'json' | 'markdown';
  }
  
  // Update concurrency
  if (options.maxConcurrency) {
    config.maxConcurrency = parseInt(options.maxConcurrency, 10) || 4;
  }
  
  // Update continue on error
  if (options.continueOnError !== undefined) {
    config.continueOnError = options.continueOnError;
  }
  
  return config;
}

/**
 * Prints a console report of the project analysis
 */
function printConsoleReport(structure: any): void {
  console.log(chalk.blue('\n📊 Project Analysis Report'));
  console.log(chalk.gray('='.repeat(50)));
  
  console.log(chalk.yellow('\n📁 Project Structure:'));
  console.log(`  Root: ${structure.rootPath}`);
  console.log(`  TypeScript Config: ${structure.tsConfigPath}`);
  console.log(`  Source Files: ${structure.sourceFiles.length} files`);
  
  console.log(chalk.yellow('\n🗄️  Schema Information:'));
  const tableCount = Object.keys(structure.schema.tables).length;
  console.log(`  Tables: ${tableCount} found`);
  if (tableCount > 0) {
    Object.entries(structure.schema.tables).forEach(([table, properties]: [string, any]) => {
      console.log(`    ${table}: ${properties.length} properties`);
    });
  }
  
  console.log(chalk.yellow('\n🔧 Shared Core Utilities:'));
  const utilityCount = Object.keys(structure.sharedCore.utilities).length;
  console.log(`  Modules: ${utilityCount} found`);
  if (utilityCount > 0) {
    Object.entries(structure.sharedCore.utilities).forEach(([module, exports]: [string, any]) => {
      console.log(`    ${module}: ${exports.length} exports`);
    });
  }
  
  console.log(chalk.yellow('\n🗃️  Database Patterns:'));
  console.log(`  Connection Patterns: ${structure.database.connectionPatterns.length}`);
  console.log(`  Service Patterns: ${structure.database.servicePatterns.length}`);
}

/**
 * Prints a markdown report of the project analysis
 */
function printMarkdownReport(structure: any): void {
  console.log('# Chanuka Project Analysis Report\n');
  
  console.log('## Project Structure\n');
  console.log(`- **Root:** ${structure.rootPath}`);
  console.log(`- **TypeScript Config:** ${structure.tsConfigPath}`);
  console.log(`- **Source Files:** ${structure.sourceFiles.length} files\n`);
  
  console.log('## Schema Information\n');
  const tableCount = Object.keys(structure.schema.tables).length;
  console.log(`Found ${tableCount} schema tables:\n`);
  if (tableCount > 0) {
    Object.entries(structure.schema.tables).forEach(([table, properties]: [string, any]) => {
      console.log(`- **${table}:** ${properties.length} properties`);
    });
  }
  console.log('');
  
  console.log('## Shared Core Utilities\n');
  const utilityCount = Object.keys(structure.sharedCore.utilities).length;
  console.log(`Found ${utilityCount} utility modules:\n`);
  if (utilityCount > 0) {
    Object.entries(structure.sharedCore.utilities).forEach(([module, exports]: [string, any]) => {
      console.log(`- **${module}:** ${exports.length} exports`);
    });
  }
  console.log('');
  
  console.log('## Database Patterns\n');
  console.log(`- **Connection Patterns:** ${structure.database.connectionPatterns.length}`);
  console.log(`- **Service Patterns:** ${structure.database.servicePatterns.length}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse();