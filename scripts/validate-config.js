#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Ensures consistency between Tailwind configs and CSS variables
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const errors = [];
const warnings = [];

function validateTailwindConfigs() {
  console.log('🔍 Validating Tailwind configurations...');
  
  try {
    // Check if root config properly delegates to client config
    const rootConfig = readFileSync('tailwind.config.js', 'utf8');
    
    if (!rootConfig.includes('presets') && !rootConfig.includes('./client/tailwind.config.ts')) {
      warnings.push('Root tailwind.config.js should delegate to client config for consistency');
    }
    
    console.log('✅ Tailwind configs validated');
  } catch (error) {
    errors.push(`Failed to validate Tailwind configs: ${error.message}`);
  }
}

function validatePostCSSConfigs() {
  console.log('🔍 Validating PostCSS configurations...');
  
  try {
    const rootPostCSS = readFileSync('postcss.config.js', 'utf8');
    const clientPostCSS = readFileSync('client/postcss.config.js', 'utf8');
    
    if (!rootPostCSS.includes('./client/tailwind.config.ts')) {
      warnings.push('Root PostCSS should point to client Tailwind config');
    }
    
    if (!clientPostCSS.includes('./tailwind.config.ts')) {
      warnings.push('Client PostCSS should point to local Tailwind config');
    }
    
    console.log('✅ PostCSS configs validated');
  } catch (error) {
    errors.push(`Failed to validate PostCSS configs: ${error.message}`);
  }
}

function validateCSSVariables() {
  console.log('🔍 Validating CSS variable consistency...');
  
  try {
    const designSystem = readFileSync('client/src/styles/chanuka-design-system.css', 'utf8');
    const clientConfig = readFileSync('client/tailwind.config.ts', 'utf8');
    
    // Check for consistent variable naming
    const cssVarPattern = /--color-(\w+):/g;
    const cssVars = [...designSystem.matchAll(cssVarPattern)].map(match => match[1]);
    
    const tailwindColorPattern = /(\w+):\s*"hsl\(var\(--color-(\w+)\)\)"/g;
    const tailwindVars = [...clientConfig.matchAll(tailwindColorPattern)].map(match => match[2]);
    
    const missingInTailwind = cssVars.filter(v => !tailwindVars.includes(v));
    const missingInCSS = tailwindVars.filter(v => !cssVars.includes(v));
    
    if (missingInTailwind.length > 0) {
      warnings.push(`CSS variables not used in Tailwind: ${missingInTailwind.join(', ')}`);
    }
    
    if (missingInCSS.length > 0) {
      warnings.push(`Tailwind colors missing CSS variables: ${missingInCSS.join(', ')}`);
    }
    
    console.log('✅ CSS variables validated');
  } catch (error) {
    errors.push(`Failed to validate CSS variables: ${error.message}`);
  }
}

function validateEnvironmentConfigs() {
  console.log('🔍 Validating environment configurations...');
  
  try {
    const devEnv = readFileSync('client/.env.development', 'utf8');
    
    // Check for placeholder values that should be replaced
    const placeholders = [
      'development-placeholder',
      'your-sentry-dsn-here',
      'your-ga-id-here'
    ];
    
    placeholders.forEach(placeholder => {
      if (devEnv.includes(placeholder)) {
        warnings.push(`Development environment contains placeholder: ${placeholder}`);
      }
    });
    
    console.log('✅ Environment configs validated');
  } catch (error) {
    warnings.push('Could not validate environment configs - files may not exist');
  }
}

function main() {
  console.log('🚀 Starting configuration validation...\n');
  
  validateTailwindConfigs();
  validatePostCSSConfigs();
  validateCSSVariables();
  validateEnvironmentConfigs();
  
  console.log('\n📊 Validation Results:');
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => console.log(`  • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ All configurations are consistent and valid!');
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}

main();