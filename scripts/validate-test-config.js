#!/usr/bin/env node

/**
 * Testing Configuration Validation Script
 * 
 * This script validates that all testing configurations are properly set up
 * and identifies potential conflicts between different test frameworks.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestConfigValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.rootDir = path.resolve(__dirname, '..');
  }

  validate() {
    console.log('🔍 Validating testing configuration...\n');

    this.checkConfigFiles();
    this.checkPackageJsonScripts();
    this.check_typeScriptConfigs();
    this.checkTestSetupFiles();
    this.checkCoverageDirectories();
    this.checkEnvironmentVariables();

    this.reportResults();
  }

  checkConfigFiles() {
    console.log('📋 Checking configuration files...');

    const expectedConfigs = [
      { file: 'jest.backend.config.js', required: true, description: 'Backend Jest configuration' },
      { file: 'vitest.frontend.config.ts', required: true, description: 'Frontend Vitest configuration' },
      { file: 'playwright.config.ts', required: true, description: 'E2E Playwright configuration' },
      { file: 'shared/core/vitest.config.ts', required: true, description: 'Shared core Vitest configuration' }
    ];

    const deprecatedConfigs = [
      { file: 'jest.config.js', description: 'Legacy Jest configuration (should be removed)' },
      { file: 'vitest.config.ts', description: 'Legacy Vitest configuration (should be removed)' }
    ];

    // Check for required configs
    expectedConfigs.forEach(config => {
      const filePath = path.join(this.rootDir, config.file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${config.file} - ${config.description}`);
      } else if (config.required) {
        this.issues.push(`Missing required config: ${config.file}`);
        console.log(`  ❌ ${config.file} - MISSING`);
      }
    });

    // Check for deprecated configs
    deprecatedConfigs.forEach(config => {
      const filePath = path.join(this.rootDir, config.file);
      if (fs.existsSync(filePath)) {
        this.warnings.push(`Deprecated config found: ${config.file}`);
        console.log(`  ⚠️  ${config.file} - DEPRECATED (should be removed)`);
      }
    });

    console.log();
  }

  checkPackageJsonScripts() {
    console.log('📦 Checking package.json test scripts...');

    const packageJsonPath = path.join(this.rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.issues.push('package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = packageJson.scripts || {};

    const expectedScripts = [
      'test',
      'test:backend',
      'test:frontend',
      'test:e2e'
    ];

    const scriptIssues = [];

    expectedScripts.forEach(script => {
      if (scripts[script]) {
        console.log(`  ✅ ${script}: ${scripts[script]}`);
        
        // Check for deprecated config usage
        if (scripts[script].includes('jest.config.js')) {
          scriptIssues.push(`Script "${script}" uses deprecated jest.config.js`);
        }
        if (scripts[script].includes('vitest.config.ts') && !scripts[script].includes('vitest.frontend.config.ts')) {
          scriptIssues.push(`Script "${script}" uses deprecated vitest.config.ts`);
        }
      } else {
        this.issues.push(`Missing test script: ${script}`);
        console.log(`  ❌ ${script} - MISSING`);
      }
    });

    if (scriptIssues.length > 0) {
      scriptIssues.forEach(issue => {
        this.warnings.push(issue);
        console.log(`  ⚠️  ${issue}`);
      });
    }

    console.log();
  }

  check_typeScriptConfigs() {
    console.log('🔧 Checking TypeScript configurations...');

    const tsConfigs = [
      'tsconfig.json',
      'tsconfig.server.json',
      'shared/core/tsconfig.json'
    ];

    tsConfigs.forEach(configFile => {
      const filePath = path.join(this.rootDir, configFile);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Try to parse as-is first (for valid JSON)
          let config;
          try {
            config = JSON.parse(content);
          } catch (firstError) {
            // If that fails, try cleaning up comments and trailing commas
            const cleanContent = content
              .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
              .replace(/\/\/.*$/gm, '') // Remove line comments
              .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
            config = JSON.parse(cleanContent);
          }

          console.log(`  📄 ${configFile}`);

          // Check for common issues
          if (config.compilerOptions) {
            const { compilerOptions } = config;

            // Check ignoreDeprecations
            if (compilerOptions.ignoreDeprecations) {
              if (compilerOptions.ignoreDeprecations === "6.0") {
                this.issues.push(`${configFile}: ignoreDeprecations "6.0" is invalid, should be "5.0"`);
                console.log(`    ❌ ignoreDeprecations: Invalid value "6.0"`);
              } else {
                console.log(`    ✅ ignoreDeprecations: ${compilerOptions.ignoreDeprecations}`);
              }
            }

            // Check module resolution
            if (compilerOptions.moduleResolution) {
              console.log(`    ✅ moduleResolution: ${compilerOptions.moduleResolution}`);
            }

            // Check for test exclusions
            if (config.exclude && config.exclude.some(pattern => pattern.includes('test'))) {
              console.log(`    ✅ Test files excluded from compilation`);
            }
          }
        } catch (error) {
          this.issues.push(`${configFile}: Invalid JSON - ${error.message}`);
          console.log(`  ❌ ${configFile} - Invalid JSON`);
        }
      } else {
        console.log(`  ⚠️  ${configFile} - Not found`);
      }
    });

    console.log();
  }

  checkTestSetupFiles() {
    console.log('🛠️  Checking test setup files...');

    const setupFiles = [
      { file: 'server/tests/setup.ts', framework: 'Jest', globals: '@jest/globals' },
      { file: 'client/src/setupTests.ts', framework: 'Vitest', globals: 'vitest' },
      { file: 'shared/core/src/__tests__/setup.ts', framework: 'Vitest', globals: 'vitest' }
    ];

    setupFiles.forEach(setup => {
      const filePath = path.join(this.rootDir, setup.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log(`  📄 ${setup.file} (${setup.framework})`);

        // Check for correct globals import
        if (content.includes(setup.globals)) {
          console.log(`    ✅ Uses correct globals: ${setup.globals}`);
        } else {
          this.warnings.push(`${setup.file}: May not be using correct globals for ${setup.framework}`);
          console.log(`    ⚠️  May not be using correct globals`);
        }

        // Check for environment setup
        if (content.includes('NODE_ENV')) {
          console.log(`    ✅ Sets up test environment`);
        }

        // Check for mock setup
        if (content.includes('mock') || content.includes('Mock')) {
          console.log(`    ✅ Includes mock setup`);
        }
      } else {
        this.warnings.push(`Setup file not found: ${setup.file}`);
        console.log(`  ⚠️  ${setup.file} - Not found`);
      }
    });

    console.log();
  }

  checkCoverageDirectories() {
    console.log('📊 Checking coverage configuration...');

    const coverageConfigs = [
      { config: 'jest.backend.config.js', expectedDir: 'coverage/backend' },
      { config: 'vitest.frontend.config.ts', expectedDir: 'coverage/frontend' }
    ];

    coverageConfigs.forEach(({ config, expectedDir }) => {
      const configPath = path.join(this.rootDir, config);
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        
        if (content.includes(expectedDir)) {
          console.log(`  ✅ ${config} -> ${expectedDir}`);
        } else {
          this.warnings.push(`${config}: Coverage directory may not be set to ${expectedDir}`);
          console.log(`  ⚠️  ${config} - Coverage directory unclear`);
        }
      }
    });

    // Check for coverage directory conflicts
    const coverageDirs = ['coverage/backend', 'coverage/frontend', 'coverage/legacy'];
    const existingDirs = coverageDirs.filter(dir => 
      fs.existsSync(path.join(this.rootDir, dir))
    );

    if (existingDirs.includes('coverage/legacy')) {
      this.warnings.push('Legacy coverage directory exists: coverage/legacy');
      console.log(`  ⚠️  Legacy coverage directory found: coverage/legacy`);
    }

    console.log();
  }

  checkEnvironmentVariables() {
    console.log('🌍 Checking environment variable setup...');

    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET'
    ];

    const testEnvVars = [
      'TEST_DATABASE_URL',
      'CI'
    ];

    console.log('  Required for testing:');
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`    ✅ ${envVar}=${process.env[envVar]}`);
      } else {
        this.warnings.push(`Environment variable not set: ${envVar}`);
        console.log(`    ⚠️  ${envVar} - Not set`);
      }
    });

    console.log('  Optional for testing:');
    testEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`    ✅ ${envVar}=${process.env[envVar]}`);
      } else {
        console.log(`    ℹ️  ${envVar} - Not set (optional)`);
      }
    });

    console.log();
  }

  reportResults() {
    console.log('📋 Validation Results');
    console.log('='.repeat(50));

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All testing configurations are properly set up!');
      console.log('✅ No issues or conflicts detected.');
    } else {
      if (this.issues.length > 0) {
        console.log(`❌ ${this.issues.length} Critical Issues:`);
        this.issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue}`);
        });
        console.log();
      }

      if (this.warnings.length > 0) {
        console.log(`⚠️  ${this.warnings.length} Warnings:`);
        this.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
        console.log();
      }

      console.log('💡 Recommendations:');
      if (this.issues.length > 0) {
        console.log('   - Fix critical issues before running tests');
        console.log('   - Review TESTING_CONFIGURATION_GUIDE.md for details');
      }
      if (this.warnings.length > 0) {
        console.log('   - Address warnings to improve test reliability');
        console.log('   - Consider updating deprecated configurations');
      }
    }

    console.log('\n📚 For detailed guidance, see: TESTING_CONFIGURATION_GUIDE.md');

    // Exit with appropriate code
    process.exit(this.issues.length > 0 ? 1 : 0);
  }
}

// Run validation
const validator = new TestConfigValidator();
validator.validate();




































