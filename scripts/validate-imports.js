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
 * - Circular dependency detection
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

/**
 * Parses JSON content that may contain comments (JSONC format)
 * Handles both single-line and multi-line comments commonly found in tsconfig.json
 */
function parseJsonWithComments(jsonString) {
  // Split into lines, filter out comment lines, then join back
  const lines = jsonString.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  });
  return JSON.parse(filteredLines.join('\n'));
}

/**
 * Validates the CONFIG object for valid types and reasonable values
 * Exits the script with process.exit(1) if any validation fails
 */
function validateConfiguration() {
  if (!Array.isArray(CONFIG.scanDirs) || !CONFIG.scanDirs.every(item => typeof item === 'string')) {
    log.error('CONFIG.scanDirs must be an array of strings');
    process.exit(1);
  }

  if (!Array.isArray(CONFIG.skipDirs) || !CONFIG.skipDirs.every(item => typeof item === 'string')) {
    log.error('CONFIG.skipDirs must be an array of strings');
    process.exit(1);
  }

  if (!Array.isArray(CONFIG.extensions) || !CONFIG.extensions.every(item => typeof item === 'string' && item.startsWith('.'))) {
    log.error('CONFIG.extensions must be an array of strings starting with \'.\'');
    process.exit(1);
  }

  if (typeof CONFIG.maxRelativeDepth !== 'number' || CONFIG.maxRelativeDepth <= 0 || !Number.isInteger(CONFIG.maxRelativeDepth)) {
    log.error('CONFIG.maxRelativeDepth must be a positive integer');
    process.exit(1);
  }

  if (!Array.isArray(CONFIG.requiredPaths) || !CONFIG.requiredPaths.every(item => typeof item === 'string')) {
    log.error('CONFIG.requiredPaths must be an array of strings');
    process.exit(1);
  }

  if (!Array.isArray(CONFIG.requiredScripts) || !CONFIG.requiredScripts.every(item => typeof item === 'string')) {
    log.error('CONFIG.requiredScripts must be an array of strings');
    process.exit(1);
  }

  if (typeof CONFIG.failOnWarnings !== 'boolean') {
    log.error('CONFIG.failOnWarnings must be a boolean');
    process.exit(1);
  }
}

// Configuration for validation rules - centralized for easy customization
let CONFIG = {
  scanDirs: ['server', 'client', 'shared'],
  skipDirs: ['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '.vscode'],
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  maxRelativeDepth: 2,
  requiredPaths: ['@/*', '@shared/*', '@server/*', '@client/*'],
  requiredScripts: ['type-check', 'type-check:client', 'type-check:server'],
  failOnWarnings: false
};

// Terminal color codes for enhanced readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Structured logging utilities with consistent formatting
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  debug: (msg) => process.env.DEBUG && console.log(`${colors.gray}[DEBUG] ${msg}${colors.reset}`)
};

// Statistics tracking for comprehensive reporting
const stats = {
  errors: 0,
  warnings: 0,
  filesScanned: 0,
  issuesFound: 0
};

/**
 * Resolves an import path to its actual file system location
 * Handles relative imports, aliased imports, and directory indexes
 * Returns null if the path cannot be resolved
 */
let resolveImportPath = function(filePath, importPath, baseUrl, paths) {
  // Handle relative imports (starting with . or ..)
  if (importPath.startsWith('.')) {
    let resolved = path.resolve(path.dirname(filePath), importPath);
    
    // Check if resolving to a directory - look for index file
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      for (const ext of CONFIG.extensions) {
        const indexFile = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    }
    
    // Try adding file extensions if none present
    if (!CONFIG.extensions.some(ext => resolved.endsWith(ext))) {
      for (const ext of CONFIG.extensions) {
        if (fs.existsSync(`${resolved}${ext}`)) {
          return `${resolved}${ext}`;
        }
      }
    }
    
    return fs.existsSync(resolved) ? resolved : null;
  }
  
  // Handle aliased imports (starting with @)
  if (importPath.startsWith('@')) {
    for (const [alias, mappedPaths] of Object.entries(paths)) {
      const aliasBase = alias.replace('/*', '');
      
      if (importPath.startsWith(aliasBase)) {
        const relativePart = importPath.slice(aliasBase.length);
        const mappedPath = Array.isArray(mappedPaths) ? mappedPaths[0] : mappedPaths;
        const mappedDir = mappedPath.replace('/*', '');
        let resolved = path.resolve(projectRoot, baseUrl, mappedDir, relativePart);
        
        // Check for directory with index file
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          for (const ext of CONFIG.extensions) {
            const indexFile = path.join(resolved, `index${ext}`);
            if (fs.existsSync(indexFile)) {
              return indexFile;
            }
          }
        }
        
        // Try adding extensions
        if (!CONFIG.extensions.some(ext => resolved.endsWith(ext))) {
          for (const ext of CONFIG.extensions) {
            if (fs.existsSync(`${resolved}${ext}`)) {
              return `${resolved}${ext}`;
            }
          }
        }
        
        return fs.existsSync(resolved) ? resolved : null;
      }
    }
  }
  
  return null;
}

/**
 * Detects circular dependencies using depth-first search
 * Returns array of cycles found in the import graph
 */
function detectCircularDependencies(importGraph, issues, baseUrl, paths) {
  // Build resolved import graph (convert import strings to resolved file paths)
  const resolvedGraph = new Map();
  
  for (const [file, imports] of importGraph) {
    const resolvedImports = imports
      .map(imp => resolveImportPath(file, imp, baseUrl, paths))
      .filter(resolved => resolved && importGraph.has(resolved));
    
    resolvedGraph.set(file, resolvedImports);
  }

  const visited = new Set();
  const recursionStack = new Set();
  
  // Run DFS from each unvisited node
  for (const file of resolvedGraph.keys()) {
    if (!visited.has(file)) {
      const cycle = detectCycleDFS(file, visited, recursionStack, resolvedGraph, []);
      
      if (cycle) {
        const cycleFiles = cycle.map(f => path.relative(projectRoot, f)).join(' → ');
        issues.push({
          severity: 'error',
          file: path.relative(projectRoot, cycle[0]),
          issue: `Circular dependency detected: ${cycleFiles}`,
          import: '',
          suggestion: 'Refactor to break the circular dependency:\n1. Extract shared interfaces/types to a separate file\n2. Use dependency injection or event-driven patterns\n3. Move shared logic to a third module that both can import\n4. Consider if one module should own the shared responsibility\nSee: https://nodejs.org/api/modules.html#modules_cycles'
        });
      }
    }
  }
}

/**
 * DFS helper for cycle detection in import graph
 * Uses recursion stack to identify back edges that indicate cycles
 */
function detectCycleDFS(node, visited, recursionStack, graph, currentPath) {
  visited.add(node);
  recursionStack.add(node);
  currentPath.push(node);
  
  for (const neighbor of graph.get(node) || []) {
    if (!visited.has(neighbor)) {
      const cycle = detectCycleDFS(neighbor, visited, recursionStack, graph, currentPath);
      if (cycle) return cycle;
    } else if (recursionStack.has(neighbor)) {
      // Found a back edge - extract the cycle
      const cycleStart = currentPath.indexOf(neighbor);
      return [...currentPath.slice(cycleStart), neighbor];
    }
  }
  
  currentPath.pop();
  recursionStack.delete(node);
  return null;
}

/**
 * Validates TypeScript compilation without emitting files
 * Returns true if compilation succeeds, false otherwise
 */
function validateTypeScriptCompilation() {
  log.section('📝 TypeScript Compilation Check');

  try {
    execSync('npx tsc --noEmit --project tsconfig.json', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    log.success('TypeScript compilation successful');
    return true;
  } catch (error) {
    log.error('TypeScript compilation failed:');

    // Format and display compilation errors for better readability
    const output = error.stdout || error.stderr || error.message;
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      if (line.includes('error TS')) {
        console.log(`  ${colors.red}${line}${colors.reset}`);
      } else if (line.trim()) {
        console.log(`  ${colors.gray}${line}${colors.reset}`);
      }
    });

    stats.errors++;
    return false;
  }
}

/**
 * Validates path mappings in tsconfig.json
 * Ensures all required aliases exist and point to valid directories
 */
function validatePathMappings() {
  log.section('🔗 Path Mappings Validation');

  try {
    const tsconfig = parseJsonWithComments(fs.readFileSync(tsconfigPath, 'utf8'));
    const paths = tsconfig.compilerOptions?.paths || {};
    const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
    
    let hasIssues = false;
    
    // Verify all required path aliases are configured
    for (const requiredPath of CONFIG.requiredPaths) {
      if (!paths[requiredPath]) {
        let suggestion = '';
        let example = '';

        if (requiredPath === '@/*') {
          suggestion = 'Add the following to your tsconfig.json compilerOptions.paths:';
          example = `  "paths": {\n    "@/*": ["./*"]\n  }`;
        } else if (requiredPath === '@shared/*') {
          suggestion = 'Add the following to your tsconfig.json compilerOptions.paths:';
          example = `  "paths": {\n    "@shared/*": ["./shared/*"]\n  }`;
        } else if (requiredPath === '@server/*') {
          suggestion = 'Add the following to your tsconfig.json compilerOptions.paths:';
          example = `  "paths": {\n    "@server/*": ["./server/*"]\n  }`;
        } else if (requiredPath === '@client/*') {
          suggestion = 'Add the following to your tsconfig.json compilerOptions.paths:';
          example = `  "paths": {\n    "@client/*": ["./client/*"]\n  }`;
        }

        log.error(`Missing required path mapping: ${requiredPath}`);
        console.log(`  ${colors.gray}${suggestion}${colors.reset}`);
        console.log(`  ${colors.cyan}${example}${colors.reset}`);
        console.log(`  ${colors.gray}See: https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping${colors.reset}`);
        stats.errors++;
        hasIssues = true;
        continue;
      }
      
      const mappedPaths = paths[requiredPath];
      const resolvedPath = Array.isArray(mappedPaths) ? mappedPaths[0] : mappedPaths;
      const fullPath = path.join(projectRoot, baseUrl, resolvedPath.replace('/*', ''));
      
      if (fs.existsSync(fullPath)) {
        log.success(`${requiredPath} → ${resolvedPath}`);
      } else {
        log.warning(`${requiredPath} → ${resolvedPath} (directory not found)`);
        stats.warnings++;
      }
    }
    
    // Check for orphaned path mappings pointing to non-existent directories
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
 * Analyzes all imports in a single file
 * Detects various import anti-patterns and issues
 */
function analyzeFileImports(filePath, issues, importGraph) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    const imports = [];

    // Comprehensive import pattern matching
    const importPatterns = [
      /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g,  // import statements
      /require\s*\(['"]([^'"]+)['"]\)/g,                        // require calls
      /import\s*\(['"]([^'"]+)['"]\)/g,                         // dynamic imports
      /export\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g   // re-exports
    ];

    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];

        // Filter out node built-ins and npm packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/') &&
            !importPath.startsWith('@shared') && !importPath.startsWith('@server') &&
            !importPath.startsWith('@client')) {
          continue;
        }

        imports.push(importPath);
      }
    }

    // Store in graph for circular dependency detection
    importGraph.set(filePath, imports);

    // Analyze each import for potential issues
    for (const importPath of imports) {
      analyzeImportPath(filePath, relativePath, importPath, content, issues);
    }
  } catch (error) {
    log.warning(`Could not analyze ${filePath}: ${error.message}`);
  }
}

/**
 * Analyzes a single import path for various issues
 * Extracted for better organization and testability
 */
function analyzeImportPath(filePath, relativePath, importPath, fileContent, issues) {
  // Check for excessively deep relative imports
  const depth = (importPath.match(/\.\.\//g) || []).length;
  if (depth > CONFIG.maxRelativeDepth) {
    let suggestion = 'Consider using path aliases (@shared/, @server/, @client/) for better maintainability.';
    let example = '';

    // Try to provide a concrete example by resolving the path
    try {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const relativeToProject = path.relative(projectRoot, resolvedPath);

      if (relativeToProject.startsWith('shared/')) {
        const aliasPath = '@shared/' + relativeToProject.slice(7);
        example = `Example: Change '${importPath}' to '${aliasPath}'`;
      } else if (relativeToProject.startsWith('server/')) {
        const aliasPath = '@server/' + relativeToProject.slice(7);
        example = `Example: Change '${importPath}' to '${aliasPath}'`;
      } else if (relativeToProject.startsWith('client/')) {
        const aliasPath = '@client/' + relativeToProject.slice(7);
        example = `Example: Change '${importPath}' to '${aliasPath}'`;
      } else {
        example = `Example: If importing from shared/, use '@shared/...'; from server/, use '@server/...'; from client/, use '@client/...'` ;
      }
    } catch (e) {
      example = `Example: If importing from shared/, use '@shared/...'; from server/, use '@server/...'; from client/, use '@client/...'` ;
    }

    issues.push({
      severity: 'warning',
      file: relativePath,
      issue: `Deep relative import (depth: ${depth})`,
      import: importPath,
      suggestion: `${suggestion}\n${example}`
    });
  }

  // Check for relative imports to shared directory (should use alias)
  if (importPath.includes('../') && importPath.includes('shared')) {
    let suggestion = 'Use @shared/ alias instead for consistency.';
    let example = '';

    // Provide concrete example
    try {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      const relativeToProject = path.relative(projectRoot, resolvedPath);

      if (relativeToProject.startsWith('shared/')) {
        const aliasPath = '@shared/' + relativeToProject.slice(7);
        example = `Example: Change '${importPath}' to '${aliasPath}'`;
      } else {
        example = `Example: Change '${importPath}' to '@shared/...'` ;
      }
    } catch (e) {
      example = `Example: Change '${importPath}' to '@shared/...'` ;
    }

    issues.push({
      severity: 'warning',
      file: relativePath,
      issue: 'Relative import to shared directory',
      import: importPath,
      suggestion: `${suggestion}\n${example}`
    });
  }

  // Verify import paths point to existing files
  if (importPath.startsWith('.')) {
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    const existsWithExt = CONFIG.extensions.some(ext => fs.existsSync(`${resolvedPath}${ext}`));
    const isDirectory = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory();
    const hasIndexFile = isDirectory && CONFIG.extensions.some(ext =>
      fs.existsSync(path.join(resolvedPath, `index${ext}`))
    );

    if (!existsWithExt && !isDirectory && !hasIndexFile && !fs.existsSync(resolvedPath)) {
      let suggestion = 'Verify the file path is correct and the file exists.';

      // Provide specific suggestions based on what was checked
      const suggestions = [];
      if (!existsWithExt) {
        suggestions.push(`Check if the file exists with extensions: ${CONFIG.extensions.join(', ')}`);
      }
      if (!isDirectory && !hasIndexFile) {
        suggestions.push('If importing a directory, ensure it has an index file (index.ts, index.tsx, etc.)');
      }
      suggestions.push('Use absolute paths or aliases for better reliability');

      suggestion += '\n' + suggestions.join('\n');

      issues.push({
        severity: 'error',
        file: relativePath,
        issue: 'Import path points to non-existent file',
        import: importPath,
        suggestion: suggestion
      });
    }
  }

  // Check for mixed default and named imports (style suggestion)
  const escapedPath = importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mixedImportPattern = new RegExp(
    `import\\s+(\\w+)\\s*,\\s*\\{([^}]+)\\}\\s+from\\s+['"]${escapedPath}['"]`,
    'g'
  );

  let match;
  while ((match = mixedImportPattern.exec(fileContent)) !== null) {
    const defaultName = match[1];
    const namedImports = match[2].trim();

    // Ensure named imports are present (at least one word)
    if (!/\w+/.test(namedImports)) continue;

    // Check if default import is used elsewhere in the file
    const importStatement = match[0];
    const contentWithoutImport = fileContent.replace(importStatement, '');
    const usagePattern = new RegExp(`\\b${defaultName}\\b`, 'g');
    const usages = contentWithoutImport.match(usagePattern);

    if (!usages || usages.length === 0) {
      issues.push({
        severity: 'info',
        file: relativePath,
        issue: 'Mixed default and named imports with unused default',
        import: importPath,
        suggestion: 'Separate into two import statements or remove unused default import.\nExample: Change "import React, { useState } from \'react\'" to "import { useState } from \'react\'" if React is unused'
      });
    }
  }
}

/**
 * Scans project files for problematic import patterns
 * Detects deep relative imports, missing aliases, circular dependencies, and more
 */
function scanForImportIssues() {
  log.section('🔍 Import Pattern Analysis');

  const issues = [];
  const tsconfig = parseJsonWithComments(fs.readFileSync(tsconfigPath, 'utf8'));
  const paths = tsconfig.compilerOptions?.paths || {};
  const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
  const importGraph = new Map();

  /**
   * Recursively scans a directory and all subdirectories
   * Skips configured directories like node_modules
   */
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip configured skip directories and hidden directories
          if (!CONFIG.skipDirs.includes(item) && !item.startsWith('.')) {
            scanDirectory(fullPath);
          }
        } else if (CONFIG.extensions.some(ext => item.endsWith(ext))) {
          stats.filesScanned++;
          analyzeFileImports(fullPath, issues, importGraph);
        }
      } catch (error) {
        // Silently skip inaccessible files (permissions, symlinks, etc.)
        log.debug(`Skipping inaccessible file: ${fullPath}`);
      }
    }
  }
  
  // Scan all configured source directories
  for (const dir of CONFIG.scanDirs) {
    const fullDir = path.join(projectRoot, dir);
    if (fs.existsSync(fullDir)) {
      scanDirectory(fullDir);
    } else {
      log.warning(`Configured scan directory not found: ${dir}`);
    }
  }

  // Run circular dependency detection
  detectCircularDependencies(importGraph, issues, baseUrl, paths);

  // Report findings with categorization
  log.info(`Scanned ${stats.filesScanned} files`);
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  if (issues.length > 0) {
    stats.issuesFound = issues.length;
    
    if (errors.length > 0) {
      console.log(`\n${colors.red}${colors.bright}Errors (${errors.length}):${colors.reset}`);
      errors.forEach(displayIssue);
      stats.errors += errors.length;
    }
    
    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}Warnings (${warnings.length}):${colors.reset}`);
      warnings.forEach(displayIssue);
      stats.warnings += warnings.length;
    }
    
    if (info.length > 0 && process.env.VERBOSE) {
      console.log(`\n${colors.cyan}${colors.bright}Info (${info.length}):${colors.reset}`);
      info.forEach(displayIssue);
    }
    
    if (info.length > 0 && !process.env.VERBOSE) {
      console.log(`\n${colors.gray}${info.length} informational messages hidden. Run with VERBOSE=1 to see them.${colors.reset}`);
    }
  } else {
    log.success('No import issues detected');
  }
  
  return errors.length === 0;
}

/**
 * Displays a single import issue with consistent formatting
 * Uses emojis and colors for visual clarity
 */
function displayIssue(issue) {
  console.log(`  📁 ${colors.cyan}${issue.file}${colors.reset}`);
  console.log(`  🚨 ${issue.issue}`);
  console.log(`  📦 Import: ${colors.yellow}${issue.import}${colors.reset}`);
  
  if (issue.suggestion) {
    console.log(`  💡 ${colors.gray}${issue.suggestion}${colors.reset}`);
  }
  
  console.log('');
}

/**
 * Validates package.json contains necessary scripts
 * Ensures build and test pipeline is properly configured
 */
function validatePackageScripts() {
  log.section('📦 Package.json Scripts Validation');
  
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    const scripts = packageJson.scripts || {};
    let hasIssues = false;
    
    // Check for required scripts
    for (const script of CONFIG.requiredScripts) {
      if (scripts[script]) {
        log.success(`${script}: ${colors.gray}${scripts[script]}${colors.reset}`);
      } else {
        let suggestion = `Add to package.json scripts: "${script}": "`;
        let command = '';

        if (script === 'type-check') {
          command = 'tsc --noEmit"';
        } else if (script === 'type-check:client') {
          command = 'tsc --noEmit --project client/tsconfig.json"';
        } else if (script === 'type-check:server') {
          command = 'tsc --noEmit --project server/tsconfig.json"';
        }

        suggestion += command;

        log.warning(`Missing recommended script: ${script}`);
        console.log(`  ${colors.gray}${suggestion}${colors.reset}`);
        stats.warnings++;
        hasIssues = true;
      }
    }
    
    // Check for other useful scripts
    const recommendedScripts = ['lint', 'test', 'build', 'dev', 'format'];
    const missingRecommended = recommendedScripts.filter(s => !scripts[s]);
    
    if (missingRecommended.length > 0) {
      log.info(`Consider adding these scripts: ${colors.cyan}${missingRecommended.join(', ')}${colors.reset}`);
    }
    
    return !hasIssues;
  } catch (error) {
    log.error(`Failed to validate package.json: ${error.message}`);
    stats.errors++;
    return false;
  }
}

/**
 * Validates TypeScript module resolution configuration
 * Checks compiler options for optimal settings
 */
function validateModuleResolution() {
  log.section('🔧 Module Resolution Check');

  try {
    const tsconfig = parseJsonWithComments(fs.readFileSync(tsconfigPath, 'utf8'));
    const compilerOptions = tsconfig.compilerOptions || {};
    
    // Define checks with recommended values and severity levels
    const checks = {
      moduleResolution: {
        current: compilerOptions.moduleResolution,
        recommended: ['node', 'node16', 'nodenext', 'bundler'],
        level: 'warning',
        explanation: 'Determines how TypeScript resolves module imports'
      },
      esModuleInterop: {
        current: compilerOptions.esModuleInterop,
        recommended: true,
        level: 'warning',
        explanation: 'Enables better interop between CommonJS and ES modules'
      },
      resolveJsonModule: {
        current: compilerOptions.resolveJsonModule,
        recommended: true,
        level: 'info',
        explanation: 'Allows importing JSON files as modules'
      },
      allowSyntheticDefaultImports: {
        current: compilerOptions.allowSyntheticDefaultImports,
        recommended: true,
        level: 'info',
        explanation: 'Allows default imports from modules without default exports'
      },
      strict: {
        current: compilerOptions.strict,
        recommended: true,
        level: 'info',
        explanation: 'Enables all strict type checking options'
      }
    };
    
    let hasIssues = false;
    
    for (const [option, config] of Object.entries(checks)) {
      const isValid = Array.isArray(config.recommended) 
        ? config.recommended.includes(config.current)
        : config.current === config.recommended;
      
      if (isValid) {
        log.success(`${option}: ${colors.cyan}${config.current}${colors.reset}`);
      } else {
        const recommendedStr = Array.isArray(config.recommended)
          ? config.recommended.join(' or ')
          : config.recommended;

        const message = `${option}: ${colors.yellow}${config.current || 'not set'}${colors.reset} (recommended: ${colors.green}${recommendedStr}${colors.reset})`;

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

        // Provide specific fix instructions
        const fixInstruction = `To fix: Add "${option}": ${Array.isArray(config.recommended) ? `"${config.recommended[0]}"` : (typeof config.recommended === 'boolean' ? config.recommended : `"${config.recommended}"`)} to your tsconfig.json compilerOptions.`;
        console.log(`  ${colors.gray}${fixInstruction}${colors.reset}`);

        if (process.env.VERBOSE) {
          console.log(`    ${colors.gray}${config.explanation}${colors.reset}`);
        }

        console.log(`  ${colors.gray}See: https://www.typescriptlang.org/tsconfig#${option}${colors.reset}`);
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
 * Executes all validation checks and provides comprehensive reporting
 */
async function main() {
  // Display banner
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   🔍 Import Validation Script - Chanuka Project          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  validateConfiguration();

  const startTime = Date.now();

  // Execute all validation checks in logical order
  const compilationSuccess = validateTypeScriptCompilation();
  const pathMappingsValid = validatePathMappings();
  validateModuleResolution();
  const importsValid = scanForImportIssues();
  const scriptsValid = validatePackageScripts();

  // Calculate execution duration
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Display comprehensive summary
  log.section('📊 Validation Summary');
  
  console.log(`  Files scanned: ${colors.cyan}${stats.filesScanned}${colors.reset}`);
  console.log(`  Errors found: ${stats.errors > 0 ? colors.red : colors.green}${stats.errors}${colors.reset}`);
  console.log(`  Warnings found: ${stats.warnings > 0 ? colors.yellow : colors.green}${stats.warnings}${colors.reset}`);
  console.log(`  Duration: ${colors.cyan}${duration}s${colors.reset}\n`);
  
  // Determine exit status based on findings
  const hasErrors = stats.errors > 0;
  const hasWarnings = stats.warnings > 0;
  const shouldFail = hasErrors || (CONFIG.failOnWarnings && hasWarnings);
  
  if (shouldFail) {
    log.error('Validation failed');
    
    console.log(`\n${colors.bright}💡 Suggestions to fix issues:${colors.reset}`);
    
    if (!compilationSuccess) {
      console.log('  • Fix TypeScript compilation errors shown above');
    }
    
    if (!pathMappingsValid) {
      console.log('  • Configure missing path mappings in tsconfig.json');
    }
    
    if (!importsValid) {
      console.log('  • Update relative imports to use path aliases');
      console.log('  • Fix any broken import paths');
      console.log('  • Resolve circular dependencies by refactoring');
    }
    
    if (!scriptsValid) {
      console.log('  • Add recommended npm scripts to package.json');
    }
    
    console.log('');
    process.exit(1);
  } else {
    log.success('🎉 All validation checks passed!');
    log.success('🚀 Ready to launch debugging session');
    
    if (hasWarnings) {
      log.info(`Note: ${stats.warnings} warnings found but validation passed`);
      log.info('Set failOnWarnings: true in CONFIG to make warnings fail the build');
    }
    
    process.exit(0);
  }
}

// Test functions for unit testing critical functions

/**
 * Test validateConfiguration with valid and invalid CONFIG objects
 */
function testValidateConfiguration() {
  console.log('Testing validateConfiguration...');

  // Test valid config
  const validConfig = {
    scanDirs: ['server', 'client'],
    skipDirs: ['node_modules'],
    extensions: ['.ts', '.js'],
    maxRelativeDepth: 2,
    requiredPaths: ['@/*'],
    requiredScripts: ['build'],
    failOnWarnings: true
  };

  let passed = 0;
  let total = 0;

  // Mock process.exit to prevent actual exit
  const originalExit = process.exit;
  let exitCalled = false;
  process.exit = () => { exitCalled = true; };

  // Test valid config - should not exit
  const originalConfig = CONFIG;
  CONFIG = validConfig;
  validateConfiguration();
  total++;
  if (!exitCalled) {
    console.log(`${colors.green}✓ Valid config test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Valid config test failed${colors.reset}`);
  }
  exitCalled = false;

  // Test invalid scanDirs
  CONFIG = { ...validConfig, scanDirs: 'invalid' };
  validateConfiguration();
  total++;
  if (exitCalled) {
    console.log(`${colors.green}✓ Invalid scanDirs test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Invalid scanDirs test failed${colors.reset}`);
  }
  exitCalled = false;

  // Test invalid extensions
  CONFIG = { ...validConfig, extensions: ['.ts', 'invalid'] };
  validateConfiguration();
  total++;
  if (exitCalled) {
    console.log(`${colors.green}✓ Invalid extensions test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Invalid extensions test failed${colors.reset}`);
  }
  exitCalled = false;

  // Restore original config and exit
  CONFIG = originalConfig;
  process.exit = originalExit;

  return passed === total;
}

/**
 * Test detectCircularDependencies with graphs containing cycles and without cycles
 */
function testDetectCircularDependencies() {
  console.log('Testing detectCircularDependencies...');

  let passed = 0;
  let total = 0;

  // Mock resolveImportPath to return the import path as is for testing
  const originalResolveImportPath = resolveImportPath;
  // eslint-disable-next-line no-unused-vars
  resolveImportPath = (_filePath, _importPath, _baseUrl, _paths) => _importPath;

  // Test graph without cycles
  const noCycleGraph = new Map([
    ['file1.js', ['file2.js']],
    ['file2.js', ['file3.js']],
    ['file3.js', []]
  ]);
  const issues1 = [];
  detectCircularDependencies(noCycleGraph, issues1, '.', {});
  total++;
  if (issues1.length === 0) {
    console.log(`${colors.green}✓ No cycle graph test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ No cycle graph test failed${colors.reset}`);
  }

  // Test graph with cycle
  const cycleGraph = new Map([
    ['file1.js', ['file2.js']],
    ['file2.js', ['file3.js']],
    ['file3.js', ['file1.js']]
  ]);
  const issues2 = [];
  detectCircularDependencies(cycleGraph, issues2, '.', {});
  total++;
  if (issues2.length === 1 && issues2[0].issue.includes('Circular dependency')) {
    console.log(`${colors.green}✓ Cycle graph test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Cycle graph test failed${colors.reset}`);
  }

  // Restore original function
  resolveImportPath = originalResolveImportPath;

  return passed === total;
}

/**
 * Test resolveImportPath with relative path resolution and alias resolution
 */
function testResolveImportPath() {
  console.log('Testing resolveImportPath...');

  let passed = 0;
  let total = 0;

  // Mock fs.existsSync and fs.statSync for testing
  const originalExistsSync = fs.existsSync;
  const originalStatSync = fs.statSync;
  const mockFiles = new Set(['c:/Users/Access Granted/Downloads/projects/SimpleTool/test/file.js', 'c:/Users/Access Granted/Downloads/projects/SimpleTool/test/index.js', 'c:/Users/Access Granted/Downloads/projects/SimpleTool/shared/utils.js']);

  fs.existsSync = (path) => {
    // Normalize path for comparison
    const normalized = path.replace(/\\/g, '/');
    const fullPath = normalized.startsWith('./') ? normalized.replace(/^\.\//, 'c:/Users/Access Granted/Downloads/projects/SimpleTool/') : normalized;
    return mockFiles.has(fullPath);
  };
  fs.statSync = (path) => ({
    isDirectory: () => path.endsWith('/') || !path.includes('.')
  });

  const baseUrl = '.';
  const paths = {
    '@shared/*': ['./shared/*']
  };

  // Test relative import to file
  const result1 = resolveImportPath('./test/main.js', './file.js', baseUrl, paths);
  total++;
  if (result1 && result1.replace(/\\/g, '/').includes('test/file.js')) {
    console.log(`${colors.green}✓ Relative file import test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Relative file import test failed: ${result1}${colors.reset}`);
  }

  // Test alias import
  const result2 = resolveImportPath('./client/main.js', '@shared/utils.js', baseUrl, paths);
  total++;
  if (result2 !== null) {
    console.log(`${colors.green}✓ Alias import test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Alias import test failed: ${result2}${colors.reset}`);
  }

  // Test non-existent import
  const result3 = resolveImportPath('./test/main.js', './nonexistent.js', baseUrl, paths);
  total++;
  if (result3 === null) {
    console.log(`${colors.green}✓ Non-existent import test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Non-existent import test failed: ${result3}${colors.reset}`);
  }

  // Restore original functions
  fs.existsSync = originalExistsSync;
  fs.statSync = originalStatSync;

  return passed === total;
}

/**
 * Test analyzeFileImports with import pattern detection (basic cases)
 */
function testAnalyzeFileImports() {
  console.log('Testing analyzeFileImports...');

  let passed = 0;
  let total = 0;

  // Mock fs.readFileSync
  const originalReadFileSync = fs.readFileSync;
  const mockContent = `
    import { useState } from 'react';
    import utils from '../client/src/infrastructure/dashboard/utils';
    import config from '../config.d';
    import shared from '@shared/helper';
  `;
  fs.readFileSync = () => mockContent;

  const issues = [];
  const importGraph = new Map();

  // Test basic import analysis
  analyzeFileImports('./test/file.js', issues, importGraph);
  total++;
  if (importGraph.has('./test/file.js') && importGraph.get('./test/file.js').includes('./utils')) {
    console.log(`${colors.green}✓ Basic import analysis test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Basic import analysis test failed${colors.reset}`);
  }

  // Test deep relative import detection
  total++;
  const deepImportIssue = issues.find(i => i.issue.includes('Deep relative import'));
  if (deepImportIssue && deepImportIssue.import === '../../../config') {
    console.log(`${colors.green}✓ Deep relative import detection test passed${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Deep relative import detection test failed${colors.reset}`);
  }

  // Restore original function
  fs.readFileSync = originalReadFileSync;

  return passed === total;
}

/**
 * Run all tests and report results
 */
function runTests() {
  console.log(`${colors.bright}${colors.cyan}Running Unit Tests for validate-imports.js${colors.reset}\n`);

  const tests = [
    testValidateConfiguration,
    testDetectCircularDependencies,
    testResolveImportPath,
    testAnalyzeFileImports
  ];

  let totalPassed = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    if (test()) {
      totalPassed++;
    }
    console.log(''); // Add spacing between tests
  }

  console.log(`${colors.bright}Test Results: ${totalPassed}/${totalTests} test suites passed${colors.reset}`);

  if (totalPassed === totalTests) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Conditional execution: run tests if --test flag is present, otherwise run main validation
if (process.argv.includes('--test')) {
  runTests();
} else {
  // Execute validation with error handling
  main().catch(error => {
    log.error(`Unexpected error during validation: ${error.message}`);

    if (process.env.DEBUG) {
      console.error(error.stack);
    }

    process.exit(1);
  });
}