#!/usr/bin/env node

/**
 * Runtime Dependency Check
 * Validates that all critical runtime dependencies are available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if package.json exists and is valid
function checkPackageJson() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    console.log('✅ package.json is valid');
    
    // Check for critical dependencies
    const criticalDeps = [
      'react',
      'react-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'vite'
    ];
    
    const missing = [];
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    criticalDeps.forEach(dep => {
      if (!dependencies[dep]) {
        missing.push(dep);
      }
    });
    
    if (missing.length > 0) {
      console.log('❌ Missing critical dependencies:', missing);
      return false;
    }
    
    console.log('✅ All critical dependencies are present');
    return true;
  } catch (error) {
    console.log('❌ package.json error:', error.message);
    return false;
  }
}

// Check if node_modules exists and has critical packages
function checkNodeModules() {
  try {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('❌ node_modules directory not found');
      return false;
    }
    
    const criticalPackages = ['react', 'react-dom', 'vite'];
    const missing = [];
    
    criticalPackages.forEach(pkg => {
      const pkgPath = path.join(nodeModulesPath, pkg);
      if (!fs.existsSync(pkgPath)) {
        missing.push(pkg);
      }
    });
    
    if (missing.length > 0) {
      console.log('❌ Missing packages in node_modules:', missing);
      return false;
    }
    
    console.log('✅ Critical packages found in node_modules');
    return true;
  } catch (error) {
    console.log('❌ node_modules check error:', error.message);
    return false;
  }
}

// Check TypeScript configuration
function checkTypeScriptConfig() {
  try {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    
    if (!fs.existsSync(tsconfigPath)) {
      console.log('❌ tsconfig.json not found');
      return false;
    }
    
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.compilerOptions) {
      console.log('❌ tsconfig.json missing compilerOptions');
      return false;
    }
    
    console.log('✅ TypeScript configuration is valid');
    return true;
  } catch (error) {
    console.log('❌ TypeScript config error:', error.message);
    return false;
  }
}

// Check Vite configuration
function checkViteConfig() {
  try {
    const viteConfigPaths = [
      'vite.config.ts',
      'vite.config.js',
      'client/vite.config.ts',
      'client/vite.config.js'
    ];
    
    let found = false;
    for (const configPath of viteConfigPaths) {
      if (fs.existsSync(path.join(process.cwd(), configPath))) {
        found = true;
        console.log('✅ Vite configuration found:', configPath);
        break;
      }
    }
    
    if (!found) {
      console.log('❌ No Vite configuration found');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Vite config check error:', error.message);
    return false;
  }
}

// Main check function
function runDependencyCheck() {
  console.log('🔍 Running Runtime Dependency Check...\n');
  
  const checks = [
    checkPackageJson,
    checkNodeModules,
    checkTypeScriptConfig,
    checkViteConfig
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    if (!check()) {
      allPassed = false;
    }
    console.log('');
  });
  
  if (allPassed) {
    console.log('🎉 All runtime dependency checks passed!');
    process.exit(0);
  } else {
    console.log('💥 Some runtime dependency checks failed!');
    console.log('\nRecommended fixes:');
    console.log('1. Run: npm install');
    console.log('2. Check for missing configuration files');
    console.log('3. Verify package.json dependencies');
    process.exit(1);
  }
}

// Run the check
runDependencyCheck();