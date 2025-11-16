#!/usr/bin/env node

/**
 * Verification Script for Console Error Fixes
 * Checks if the main issues have been resolved
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Console Error Fixes...\n');

const checks = [
  {
    name: 'AuthProvider Circular Dependency',
    check: () => {
      const duplicateAuthProvider = path.join(process.cwd(), 'client/src/components/auth/AuthProvider.tsx');
      return !fs.existsSync(duplicateAuthProvider);
    },
    fix: 'Duplicate AuthProvider.tsx should be deleted'
  },
  {
    name: 'AppProviders Import Fix',
    check: () => {
      const appProvidersPath = path.join(process.cwd(), 'client/src/components/AppProviders.tsx');
      if (!fs.existsSync(appProvidersPath)) return false;
      
      const content = fs.readFileSync(appProvidersPath, 'utf8');
      return content.includes("import { AuthProvider, useAuth } from '../hooks/useAuth';") &&
             !content.includes("import { AuthProvider } from './auth/AuthProvider';");
    },
    fix: 'AuthProvider should be imported from useAuth.tsx, not from separate file'
  },
  {
    name: 'LoadingProvider Fix',
    check: () => {
      const appProvidersPath = path.join(process.cwd(), 'client/src/components/AppProviders.tsx');
      if (!fs.existsSync(appProvidersPath)) return false;
      
      const content = fs.readFileSync(appProvidersPath, 'utf8');
      return content.includes('function LoadingProviderWithDeps') &&
             !content.includes('createLoadingProvider(');
    },
    fix: 'LoadingProvider should use wrapper function, not createLoadingProvider'
  },
  {
    name: 'Vite CSP Worker Fix',
    check: () => {
      const viteConfigPath = path.join(process.cwd(), 'client/vite.config.ts');
      if (!fs.existsSync(viteConfigPath)) return false;
      
      const content = fs.readFileSync(viteConfigPath, 'utf8');
      return content.includes("worker-src 'self' blob:") &&
             content.includes("child-src 'self' blob:");
    },
    fix: 'Vite config should include worker-src and child-src directives'
  },
  {
    name: 'CSP Headers Worker Fix',
    check: () => {
      const cspHeadersPath = path.join(process.cwd(), 'client/src/utils/csp-headers.ts');
      if (!fs.existsSync(cspHeadersPath)) return false;
      
      const content = fs.readFileSync(cspHeadersPath, 'utf8');
      return content.includes("'worker-src': [\"'self'\", 'blob:']") &&
             content.includes("'child-src': [\"'self'\", 'blob:']");
    },
    fix: 'CSP headers should include worker-src and child-src directives'
  },
  {
    name: 'CSRF 404 Handling',
    check: () => {
      const csrfPath = path.join(process.cwd(), 'client/src/security/csrf-protection.ts');
      if (!fs.existsSync(csrfPath)) return false;
      
      const content = fs.readFileSync(csrfPath, 'utf8');
      return content.includes('response.status === 404') &&
             content.includes('using client-side token generation');
    },
    fix: 'CSRF protection should handle 404 responses gracefully'
  },
  {
    name: 'Session Manager Error Throttling',
    check: () => {
      const sessionManagerPath = path.join(process.cwd(), 'client/src/utils/sessionManager.ts');
      if (!fs.existsSync(sessionManagerPath)) return false;
      
      const content = fs.readFileSync(sessionManagerPath, 'utf8');
      return content.includes('lastErrorLog') &&
             content.includes('60000') && // 1 minute throttling
             content.includes('navigator.onLine');
    },
    fix: 'Session manager should throttle error logging and check online status'
  },
  {
    name: 'Development Startup Script',
    check: () => {
      const startDevPath = path.join(process.cwd(), 'start-dev.js');
      return fs.existsSync(startDevPath);
    },
    fix: 'start-dev.js script should exist for easy development startup'
  }
];

let passed = 0;
let failed = 0;

checks.forEach((check, index) => {
  const result = check.check();
  const status = result ? '✅ PASS' : '❌ FAIL';
  const number = (index + 1).toString().padStart(2, '0');
  
  console.log(`${number}. ${status} ${check.name}`);
  
  if (!result) {
    console.log(`    💡 ${check.fix}`);
    failed++;
  } else {
    passed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 All fixes have been applied successfully!');
  console.log('🚀 You can now start the development environment:');
  console.log('   node start-dev.js');
} else {
  console.log('⚠️  Some fixes still need to be applied.');
  console.log('📖 Check the CONSOLE_ERRORS_FIXED.md file for detailed instructions.');
}

console.log('\n🔧 Next steps:');
console.log('1. Clear browser cache and reload');
console.log('2. Start development environment: node start-dev.js');
console.log('3. Check browser console for remaining errors');
console.log('4. Verify application functionality');