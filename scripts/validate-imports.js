#!/usr/bin/env node

/**
 * Import Validation Script for Chanuka Project
 * Validates import paths and resolutions before debugging sessions
 * 
 * This script performs comprehensive validation of:
 * - TypeScript compilation and configuration
 * - Path mapping aliases
 * - Import patterns and best practices
 * - Package.json scripts
 * - Module resolution
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

// Configuration for validation rules
const CONFIG = {
  // Directories to scan for import issues
  scanDirs: ['server', 'client', 'shared'],
  // Directories to skip during scanning
  skipDirs: ['.git', 'node_modules', 'dist', 'build', '.next', 'coverage'],
  // File extensions to check
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  // Maximum relative import depth before warning
  maxRelativeDepth: 2,
  // Required path mappings
  requiredPaths: ['@/*', '@shared/*', '@server/*', '@client/*'],
  // Required npm scripts
  requiredScripts: ['type-check', 'type-check:client', 'type-check:server'],
  // Whether to fail on warnings (vs just errors)
  failOnWarnings: false
};

// Color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function for colored output
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

// Statistics tracking
const stats = {
  errors: 0,
  warnings: 0,
  filesScanned: 0,
  issuesFound: 0
};

/**
 * Validates TypeScript compilation
 * Runs tsc with --noEmit to check for type errors without generating files
 */
function validateTypeScriptCompilation() {
  log.section('📝 TypeScript Compilation Check');
  
  try {
    const output = execSync('npx tsc --noEmit --project tsconfig.json', {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    log.success('TypeScript compilation successful');
    return true;
  } catch (error) {
    log.error('TypeScript compilation failed:');
    
    // Parse and display compilation errors in a more readable format
    const output = error.stdout?.toString() || error.message;
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`  ${line}`);
      }
    });
    
    stats.errors++;
    return false;
  }
}

/**
 * Validates path mappings in tsconfig.json
 * Ensures all required path aliases are configured and point to existing directories
 */
function validatePathMappings() {
  log.section('🔗 Path Mappings Validation');
  
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const paths = tsconfig.compilerOptions?.paths || {};
    const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
    
    let hasIssues = false;
    
    for (const requiredPath of CONFIG.requiredPaths) {
      if (!paths[requiredPath]) {
        log.error(`Missing path mapping: ${requiredPath}`);
        stats.errors++;
        hasIssues = true;
      } else {
        const mappedPaths = paths[requiredPath];
        const resolvedPath = Array.isArray(mappedPaths) ? mappedPaths[0] : mappedPaths;
        
        // Verify the mapped path exists
        const fullPath = path.join(projectRoot, baseUrl, resolvedPath.replace('/*', ''));
        
        if (fs.existsSync(fullPath)) {
          log.success(`${requiredPath} → ${resolvedPath}`);
        } else {
          log.warning(`${requiredPath} → ${resolvedPath} (directory not found)`);
          stats.warnings++;
        }
      }
    }
    
    // Check for orphaned path mappings (paths that map to non-existent directories)
    for (const [alias, mappedPaths] of Object.entries(paths)) {
      if (!CONFIG.requiredPaths.includes(alias)) {
        const resolvedPath = Array.isArray(mappedPaths) ? mappedPaths[0] : mappedPaths;
        const fullPath = path.join(projectRoot, baseUrl, resolvedPath.replace('/*', ''));
        
        if (!fs.existsSync(fullPath)) {
          log.warning(`Orphaned path mapping: ${alias} → ${resolvedPath} (directory not found)`);
          stats.warnings++;
        }
      }
    }
    
    return !hasIssues;
  } catch (error) {
    log.error(`Failed to validate path mappings: ${error.message}`);
    stats.errors++;
    return false;
  }
}

/**
 * Scans for problematic import patterns
 * Detects issues like deep relative imports, missing aliases, circular dependencies
 */
function scanForImportIssues() {
  log.section('🔍 Import Pattern Analysis');
  
  const issues = [];
  const importGraph = new Map(); // Track imports for circular dependency detection
  
  /**
   * Recursively scans a directory for import issues
   */
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip configured directories
          if (!CONFIG.skipDirs.includes(item) && !item.startsWith('.')) {
            scanDirectory(fullPath);
          }
        } else if (CONFIG.extensions.some(ext => item.endsWith(ext))) {
          stats.filesScanned++;
          analyzeFileImports(fullPath, issues, importGraph);
        }
      } catch (error) {
        // Silently skip files we can't access (permissions, symbolic links, etc.)
        continue;
      }
    }
  }
  
  /**
   * Analyzes imports in a single file
   */
  function analyzeFileImports(filePath, issues, importGraph) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(projectRoot, filePath);
      const imports = [];
      
      // Match various import patterns
      const importPatterns = [
        /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,  // import ... from '...'
        /require\s*\(['"]([^'"]+)['"]\)/g,          // require('...')
        /import\s*\(['"]([^'"]+)['"]\)/g            // dynamic import('...')
      ];
      
      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }
      
      // Store imports in graph for circular dependency detection
      importGraph.set(filePath, imports);
      
      // Analyze each import
      for (const importPath of imports) {
        // Check for deep relative imports
        const depth = (importPath.match(/\.\.\//g) || []).length;
        if (depth > CONFIG.maxRelativeDepth) {
          issues.push({
            severity: 'warning',
            file: relativePath,
            issue: `Deep relative import (depth: ${depth})`,
            import: importPath,
            suggestion: 'Consider using path aliases (@shared/, @server/, etc.)'
          });
        }
        
        // Check for relative imports to shared directory
        if (importPath.includes('../') && importPath.includes('shared')) {
          issues.push({
            severity: 'warning',
            file: relativePath,
            issue: 'Relative import to shared directory',
            import: importPath,
            suggestion: 'Use @shared/ alias instead'
          });
        }
        
        // Check for imports without file extensions in TypeScript files
        if ((filePath.endsWith('.ts') || filePath.endsWith('.tsx')) && 
            importPath.startsWith('.') && 
            !CONFIG.extensions.some(ext => importPath.endsWith(ext)) &&
            !importPath.endsWith('/')) {
          
          // Verify the file doesn't exist without checking extension
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);
          const existsWithoutExt = CONFIG.extensions.some(ext => 
            fs.existsSync(resolvedPath + ext)
          );
          
          if (!existsWithoutExt && !fs.existsSync(resolvedPath)) {
            issues.push({
              severity: 'error',
              file: relativePath,
              issue: 'Import path points to non-existent file',
              import: importPath,
              suggestion: 'Check the file path or add the correct file extension'
            });
          }
        }
        
        // Check for mixed import styles (default and named in same line)
        const mixedImportMatch = content.match(
          new RegExp(`import\\s+\\w+\\s*,\\s*\\{[^}]+\\}\\s+from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
        );
        if (mixedImportMatch) {
          issues.push({
            severity: 'info',
            file: relativePath,
            issue: 'Mixed default and named imports',
            import: importPath,
            suggestion: 'Consider separating into two import statements for clarity'
          });
        }
      }
    } catch (error) {
      // Log but don't fail on individual file errors
      log.warning(`Could not analyze ${filePath}: ${error.message}`);
    }
  }
  
  // Scan all configured directories
  for (const dir of CONFIG.scanDirs) {
    const fullDir = path.join(projectRoot, dir);
    scanDirectory(fullDir);
  }
  
  // Report findings
  log.info(`Scanned ${stats.filesScanned} files`);
  
  if (issues.length > 0) {
    stats.issuesFound = issues.length;
    
    // Group issues by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const info = issues.filter(i => i.severity === 'info');
    
    if (errors.length > 0) {
      console.log(`\n${colors.red}Errors (${errors.length}):${colors.reset}`);
      errors.forEach(issue => displayIssue(issue));
      stats.errors += errors.length;
    }
    
    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}Warnings (${warnings.length}):${colors.reset}`);
      warnings.forEach(issue => displayIssue(issue));
      stats.warnings += warnings.length;
    }
    
    if (info.length > 0 && process.env.VERBOSE) {
      console.log(`\n${colors.cyan}Info (${info.length}):${colors.reset}`);
      info.forEach(issue => displayIssue(issue));
    }
    
    console.log('');
    log.info('Run with VERBOSE=1 to see all informational messages');
  } else {
    log.success('No import issues detected');
  }
  
  return issues.filter(i => i.severity === 'error').length === 0;
}

/**
 * Displays a single import issue in a readable format
 */
function displayIssue(issue) {
  console.log(`  📁 ${issue.file}`);
  console.log(`  🚨 ${issue.issue}`);
  console.log(`  📦 Import: ${issue.import}`);
  if (issue.suggestion) {
    console.log(`  💡 ${issue.suggestion}`);
  }
  console.log('');
}

/**
 * Validates package.json scripts
 * Ensures required npm scripts exist for the build and test pipeline
 */
function validatePackageScripts() {
  log.section('📦 Package.json Scripts Validation');
  
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    const scripts = packageJson.scripts || {};
    
    let hasIssues = false;
    
    for (const script of CONFIG.requiredScripts) {
      if (!scripts[script]) {
        log.warning(`Missing recommended script: ${script}`);
        stats.warnings++;
        hasIssues = true;
      } else {
        log.success(`${script}: ${scripts[script]}`);
      }
    }
    
    // Check for common useful scripts
    const recommendedScripts = ['lint', 'test', 'build', 'dev'];
    const missingRecommended = recommendedScripts.filter(s => !scripts[s]);
    
    if (missingRecommended.length > 0) {
      log.info(`Consider adding these scripts: ${missingRecommended.join(', ')}`);
    }
    
    return !hasIssues;
  } catch (error) {
    log.error(`Failed to validate package.json: ${error.message}`);
    stats.errors++;
    return false;
  }
}

/**
 * Validates module resolution configuration
 * Checks that TypeScript's moduleResolution matches the project setup
 */
function validateModuleResolution() {
  log.section('🔧 Module Resolution Check');
  
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const compilerOptions = tsconfig.compilerOptions || {};
    
    // Check for recommended settings
    const checks = {
      moduleResolution: {
        current: compilerOptions.moduleResolution,
        recommended: ['node', 'node16', 'nodenext', 'bundler'],
        level: 'warning'
      },
      esModuleInterop: {
        current: compilerOptions.esModuleInterop,
        recommended: true,
        level: 'warning'
      },
      resolveJsonModule: {
        current: compilerOptions.resolveJsonModule,
        recommended: true,
        level: 'info'
      },
      allowSyntheticDefaultImports: {
        current: compilerOptions.allowSyntheticDefaultImports,
        recommended: true,
        level: 'info'
      }
    };
    
    let hasIssues = false;
    
    for (const [option, config] of Object.entries(checks)) {
      const isValid = Array.isArray(config.recommended) 
        ? config.recommended.includes(config.current)
        : config.current === config.recommended;
      
      if (isValid) {
        log.success(`${option}: ${config.current}`);
      } else {
        const message = Array.isArray(config.recommended)
          ? `${option}: ${config.current || 'not set'} (recommended: ${config.recommended.join(' or ')})`
          : `${option}: ${config.current || 'not set'} (recommended: ${config.recommended})`;
        
        if (config.level === 'error') {
          log.error(message);
          stats.errors++;
          hasIssues = true;
        } else if (config.level === 'warning') {
          log.warning(message);
          stats.warnings++;
        } else {
          log.info(message);
        }
      }
    }
    
    return !hasIssues;
  } catch (error) {
    log.error(`Failed to validate module resolution: ${error.message}`);
    stats.errors++;
    return false;
  }
}

/**
 * Main validation orchestrator
 * Runs all validation checks and reports overall status
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🔍 Import Validation Script - Chanuka Project       ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  
  // Run all validation checks
  const results = {
    typescript: validateTypeScriptCompilation(),
    pathMappings: validatePathMappings(),
    moduleResolution: validateModuleResolution(),
    imports: scanForImportIssues(),
    packageScripts: validatePackageScripts()
  };
  
  // Calculate duration
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Display summary
  log.section('📊 Validation Summary');
  
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Errors found: ${colors.red}${stats.errors}${colors.reset}`);
  console.log(`  Warnings found: ${colors.yellow}${stats.warnings}${colors.reset}`);
  console.log(`  Duration: ${duration}s\n`);
  
  // Determine exit status
  const hasErrors = stats.errors > 0;
  const hasWarnings = stats.warnings > 0;
  const shouldFail = hasErrors || (CONFIG.failOnWarnings && hasWarnings);
  
  if (shouldFail) {
    log.error('Validation failed');
    
    if (hasWarnings) {
      console.log('\n💡 Suggestions:');
      console.log('  • Run import migration: npm run migrate:imports');
      console.log('  • Fix path mappings in tsconfig.json');
      console.log('  • Update relative imports to use aliases\n');
    }
    
    process.exit(1);
  } else {
    log.success('🎉 All validation checks passed!');
    log.success('🚀 Ready to launch debugging session');
    
    if (hasWarnings) {
      log.info('Note: Some warnings were found but validation passed');
    }
    
    process.exit(0);
  }
}

// Run the validation
main().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});