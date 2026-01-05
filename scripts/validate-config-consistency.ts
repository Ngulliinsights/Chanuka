#!/usr/bin/env tsx
/**
 * Configuration Consistency Validation Script
 * Ensures all workspace configurations follow monorepo best practices
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  workspace: string;
  issues: string[];
  warnings: string[];
  passed: boolean;
}

const WORKSPACES = ['client', 'server', 'shared'];
const ROOT_DIR = process.cwd();

function validateESLintConfig(workspace: string): { issues: string[], warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  const eslintPath = join(ROOT_DIR, workspace, '.eslintrc.js');
  if (!existsSync(eslintPath)) {
    issues.push('Missing .eslintrc.js file');
    return { issues, warnings };
  }

  const eslintContent = readFileSync(eslintPath, 'utf-8');

  // Check for root config extension
  if (!eslintContent.includes('../.eslintrc.js')) {
    issues.push('ESLint config should extend root configuration');
  }

  // Check for duplicate extends arrays
  const extendsMatches = eslintContent.match(/extends:\s*\[/g);
  if (extendsMatches && extendsMatches.length > 1) {
    issues.push('Multiple extends arrays found - should be consolidated');
  }

  // Workspace-specific checks
  if (workspace === 'client') {
    if (!eslintContent.includes('plugin:react/recommended')) {
      warnings.push('Client should include React ESLint rules');
    }
  }

  return { issues, warnings };
}

function validateTypeScriptConfig(workspace: string): { issues: string[], warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  const tsconfigPath = join(ROOT_DIR, workspace, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    issues.push('Missing tsconfig.json file');
    return { issues, warnings };
  }

  try {
    const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);

    // Check for root config extension
    if (!tsconfig.extends || !tsconfig.extends.includes('../tsconfig.json')) {
      issues.push('TypeScript config should extend root configuration');
    }

    // Check for workspace-specific paths
    if (!tsconfig.compilerOptions?.paths) {
      warnings.push('Consider adding path mappings for better imports');
    }

    // Check for shared workspace reference
    if (workspace !== 'shared') {
      const paths = tsconfig.compilerOptions?.paths || {};
      if (!paths['@shared']) {
        warnings.push('Consider adding @shared path mapping');
      }
    }

  } catch (error) {
    issues.push('Invalid JSON in tsconfig.json');
  }

  return { issues, warnings };
}

function validatePackageJson(workspace: string): { issues: string[], warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  const packagePath = join(ROOT_DIR, workspace, 'package.json');
  if (!existsSync(packagePath)) {
    issues.push('Missing package.json file');
    return { issues, warnings };
  }

  try {
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Check workspace naming
    if (!packageJson.name?.startsWith('@chanuka/')) {
      issues.push('Package name should start with @chanuka/');
    }

    // Check private flag
    if (!packageJson.private) {
      warnings.push('Package should be marked as private');
    }

    // Check for shared dependency (except in shared itself)
    if (workspace !== 'shared') {
      const deps = packageJson.dependencies || {};
      if (!deps['@shared']) {
        warnings.push('Consider adding @shared dependency');
      }
    }

    // Check for essential scripts
    const scripts = packageJson.scripts || {};
    const essentialScripts = ['build', 'type-check'];

    for (const script of essentialScripts) {
      if (!scripts[script]) {
        warnings.push(`Missing essential script: ${script}`);
      }
    }

  } catch (error) {
    issues.push('Invalid JSON in package.json');
  }

  return { issues, warnings };
}

function validateWorkspace(workspace: string): ValidationResult {
  const result: ValidationResult = {
    workspace,
    issues: [],
    warnings: [],
    passed: false
  };

  // Validate ESLint configuration
  const eslintResult = validateESLintConfig(workspace);
  result.issues.push(...eslintResult.issues);
  result.warnings.push(...eslintResult.warnings);

  // Validate TypeScript configuration
  const tsconfigResult = validateTypeScriptConfig(workspace);
  result.issues.push(...tsconfigResult.issues);
  result.warnings.push(...tsconfigResult.warnings);

  // Validate package.json
  const packageResult = validatePackageJson(workspace);
  result.issues.push(...packageResult.issues);
  result.warnings.push(...packageResult.warnings);

  result.passed = result.issues.length === 0;
  return result;
}

function validateRootConfiguration(): ValidationResult {
  const result: ValidationResult = {
    workspace: 'root',
    issues: [],
    warnings: [],
    passed: false
  };

  // Check for essential root files
  const essentialFiles = [
    'package.json',
    'tsconfig.json',
    '.eslintrc.js',
    'nx.json',
    'pnpm-workspace.yaml'
  ];

  for (const file of essentialFiles) {
    if (!existsSync(join(ROOT_DIR, file))) {
      result.issues.push(`Missing essential file: ${file}`);
    }
  }

  // Validate root package.json
  try {
    const packageJson = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));

    // Check for duplicate scripts
    const scripts = packageJson.scripts || {};
    const scriptNames = Object.keys(scripts);
    const duplicates = scriptNames.filter((name, index) => scriptNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      result.issues.push(`Duplicate scripts found: ${duplicates.join(', ')}`);
    }

  } catch (error) {
    result.issues.push('Invalid root package.json');
  }

  result.passed = result.issues.length === 0;
  return result;
}

function printResults(results: ValidationResult[]) {
  console.log('🔍 Configuration Consistency Validation\\n');

  let totalIssues = 0;
  let totalWarnings = 0;
  let passedWorkspaces = 0;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.workspace.toUpperCase()}`);

    if (result.issues.length === 0 && result.warnings.length === 0) {
      console.log('  ✨ All configurations valid');
    } else {
      if (result.issues.length > 0) {
        console.log('  🚨 Issues:');
        result.issues.forEach(issue => console.log(`    - ${issue}`));
        totalIssues += result.issues.length;
      }

      if (result.warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`    - ${warning}`));
        totalWarnings += result.warnings.length;
      }
    }

    if (result.passed) passedWorkspaces++;
    console.log('');
  }

  console.log(`📊 Summary: ${passedWorkspaces}/${results.length} workspaces passed`);
  console.log(`🚨 Total Issues: ${totalIssues}`);
  console.log(`⚠️  Total Warnings: ${totalWarnings}`);

  if (totalIssues > 0) {
    console.log('\\n❌ Configuration validation failed');
    process.exit(1);
  } else {
    console.log('\\n✅ All configurations are consistent!');
  }
}

// Run validation
const results: ValidationResult[] = [];

// Validate root configuration
results.push(validateRootConfiguration());

// Validate each workspace
for (const workspace of WORKSPACES) {
  results.push(validateWorkspace(workspace));
}

printResults(results);
