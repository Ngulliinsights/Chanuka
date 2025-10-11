#!/usr/bin/env node

/**
 * Architecture Boundary Check Script
 *
 * This script enforces architectural boundaries in the analytics module:
 * - Controllers cannot access storage directly
 * - Services cannot import HTTP-related modules
 * - Storage cannot contain business logic
 * - No circular dependencies
 */

const fs = require('fs');
const path = require('path');

const ANALYTICS_DIR = 'server/features/analytics';

// Architecture rules
const RULES = {
  // Controllers cannot import from storage
  controllerStorageViolation: {
    pattern: /server\/features\/analytics\/controllers\/.*\.ts$/,
    forbiddenImports: [
      /from ['"`].*storage['"`]/,
      /import.*from ['"`].*storage['"`]/
    ],
    message: 'Controllers cannot import from storage layer'
  },

  // Services cannot import HTTP/Express modules
  serviceHttpViolation: {
    pattern: /server\/features\/analytics\/services\/.*\.ts$/,
    forbiddenImports: [
      /from ['"`]express['"`]/,
      /import.*from ['"`]express['"`]/,
      /from ['"`].*middleware['"`]/,
      /import.*from ['"`].*middleware['"`]/
    ],
    message: 'Services cannot import HTTP/Express modules'
  },

  // Storage cannot contain business logic keywords
  storageBusinessLogicViolation: {
    pattern: /server\/features\/analytics\/storage\/.*\.ts$/,
    forbiddenContent: [
      /\bcalculate\b/i,
      /\bcompute\b/i,
      /\banalyze\b/i,
      /\bprocess\b/i,
      /\btransform\b/i,
      /\bvalidate\b/i,
      /\bauthorize\b/i
    ],
    message: 'Storage layer should not contain business logic'
  },

  // No circular dependencies
  circularDependencyViolation: {
    checkFunction: checkCircularDependencies
  },

  // Missing test files
  missingTestsViolation: {
    pattern: /(server\/features\/analytics\/(controllers|services|storage|middleware|config|utils)\/.*)\.ts$/,
    checkFunction: checkMissingTests
  },

  // Console.log usage
  consoleLogViolation: {
    pattern: /server\/features\/analytics\/.*\.ts$/,
    forbiddenContent: [
      /console\.(log|error|warn|info|debug)/
    ],
    message: 'Use logger instead of console methods'
  }
};

let violations = [];
let filesChecked = 0;

/**
 * Check for circular dependencies in the analytics module
 */
function checkCircularDependencies() {
  const files = getAllTypeScriptFiles(ANALYTICS_DIR);
  const dependencyGraph = {};

  // Build dependency graph
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(ANALYTICS_DIR, file).replace(/\.ts$/, '');
    dependencyGraph[relativePath] = [];

    const importMatches = content.match(/from ['"`](\.[^'"`]+)['"`]/g) || [];
    importMatches.forEach(match => {
      const importPath = match.match(/from ['"`](\.[^'"`]+)['"`]/)[1];
      const resolvedPath = path.resolve(path.dirname(file), importPath);
      const relativeImport = path.relative(ANALYTICS_DIR, resolvedPath).replace(/\.ts$/, '');

      if (dependencyGraph[relativeImport]) {
        dependencyGraph[relativePath].push(relativeImport);
      }
    });
  });

  // Check for circular dependencies
  Object.keys(dependencyGraph).forEach(file => {
    const visited = new Set();
    const recursionStack = new Set();

    if (hasCircularDependency(file, dependencyGraph, visited, recursionStack)) {
      violations.push({
        file: path.join(ANALYTICS_DIR, file + '.ts'),
        rule: 'circularDependencyViolation',
        message: 'Circular dependency detected',
        details: `File is part of a circular dependency chain`
      });
    }
  });
}

/**
 * DFS helper to detect circular dependencies
 */
function hasCircularDependency(file, graph, visited, recursionStack) {
  visited.add(file);
  recursionStack.add(file);

  for (const dependency of graph[file] || []) {
    if (!visited.has(dependency) && hasCircularDependency(dependency, graph, visited, recursionStack)) {
      return true;
    } else if (recursionStack.has(dependency)) {
      return true;
    }
  }

  recursionStack.delete(file);
  return false;
}

/**
 * Check for missing test files
 */
function checkMissingTests(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const testPath = relativePath
    .replace(/^server\/features\/analytics\//, 'server/features/analytics/__tests__/')
    .replace(/\.ts$/, '.test.ts');

  if (!fs.existsSync(testPath)) {
    // Allow missing tests for index files and certain utility files
    if (!relativePath.includes('/index.ts') &&
        !relativePath.includes('/types/') &&
        !relativePath.includes('/config/analytics.config.ts')) {
      violations.push({
        file: filePath,
        rule: 'missingTestsViolation',
        message: 'Missing test file',
        details: `Expected test file: ${testPath}`
      });
    }
  }
}

/**
 * Get all TypeScript files in a directory recursively
 */
function getAllTypeScriptFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

/**
 * Check a file against architecture rules
 */
function checkFile(filePath) {
  filesChecked++;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    Object.entries(RULES).forEach(([ruleName, rule]) => {
      // Skip if pattern doesn't match
      if (rule.pattern && !rule.pattern.test(filePath)) {
        return;
      }

      // Check custom function rules
      if (rule.checkFunction) {
        rule.checkFunction(filePath);
        return;
      }

      // Check forbidden imports
      if (rule.forbiddenImports) {
        rule.forbiddenImports.forEach(forbiddenPattern => {
          const matches = content.match(forbiddenPattern);
          if (matches) {
            matches.forEach(match => {
              const lineNumber = lines.findIndex(line => line.includes(match)) + 1;
              violations.push({
                file: filePath,
                rule: ruleName,
                message: rule.message,
                details: `Forbidden import: ${match.trim()}`,
                line: lineNumber
              });
            });
          }
        });
      }

      // Check forbidden content
      if (rule.forbiddenContent) {
        rule.forbiddenContent.forEach(forbiddenPattern => {
          const matches = content.match(forbiddenPattern);
          if (matches) {
            matches.forEach(match => {
              const lineNumber = lines.findIndex(line => line.includes(match)) + 1;
              violations.push({
                file: filePath,
                rule: ruleName,
                message: rule.message,
                details: `Forbidden content: ${match.trim()}`,
                line: lineNumber
              });
            });
          }
        });
      }
    });

  } catch (error) {
    violations.push({
      file: filePath,
      rule: 'fileReadError',
      message: 'Could not read file',
      details: error.message
    });
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking analytics module architecture boundaries...\n');

  const analyticsFiles = getAllTypeScriptFiles(ANALYTICS_DIR);

  // Check each file
  analyticsFiles.forEach(checkFile);

  // Check circular dependencies
  checkCircularDependencies();

  // Report results
  if (violations.length === 0) {
    console.log(`✅ Architecture check passed! Checked ${filesChecked} files.`);
    process.exit(0);
  } else {
    console.log(`❌ Architecture violations found in ${violations.length} locations:\n`);

    violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.file}${violation.line ? `:${violation.line}` : ''}`);
      console.log(`   Rule: ${violation.rule}`);
      console.log(`   ${violation.message}`);
      if (violation.details) {
        console.log(`   ${violation.details}`);
      }
      console.log('');
    });

    console.log('💡 Fix these violations before committing.');
    process.exit(1);
  }
}

// Run the check
main();