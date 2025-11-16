#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to fix frontend import paths after refactoring
 * Updates @/ imports to use correct relative paths based on new structure
 */

const CLIENT_SRC = path.join(__dirname, '..', 'client', 'src');

// Mapping of old @/ imports to correct relative paths based on file location
const IMPORT_MAPPINGS = {
  // Utils
  '@/utils/logger': './utils/logger',
  '@/utils/asset-loading': './utils/asset-loading',
  '@/utils/serviceWorker': './utils/serviceWorker',
  '@/utils/safe-lazy-loading': './utils/safe-lazy-loading',
  '@/utils/route-preloading': './utils/route-preloading',
  '@/utils/responsive-layout': './utils/responsive-layout',
  '@/utils/polyfills': './utils/polyfills',
  '@/utils/performanceMonitoring': './utils/performanceMonitoring',
  '@/utils/performance-optimizer': './utils/performance-optimizer',
  '@/utils/mobile-error-handler': './utils/mobile-error-handler',
  '@/utils/development-error-recovery': './utils/development-error-recovery',
  '@/utils/comprehensiveLoading': './utils/comprehensiveLoading',
  '@/utils/browser-compatibility-manager': './utils/browser-compatibility-manager',
  '@/utils/authenticated-api': './utils/authenticated-api',
  '@/utils/apiCache': './utils/apiCache',
  '@/utils/connectionAwareLoading': './utils/connectionAwareLoading',
  '@/utils/mobile-touch-handler': './utils/mobile-touch-handler',
  '@/utils/navigation/active-state': './utils/navigation/active-state',
  
  // Navigation utils
  '@/utils/navigation/state-persistence': './utils/navigation/state-persistence',
  '@/utils/navigation/section-detector': './utils/navigation/section-detector',
  '@/utils/navigation/related-pages-calculator': './utils/navigation/related-pages-calculator',
  '@/utils/navigation/page-relationship-utils': './utils/navigation/page-relationship-utils',
  '@/utils/navigation/breadcrumb-generator': './utils/navigation/breadcrumb-generator',
  
  // Types
  '@/types/navigation': './types/navigation',
  '@/types/onboarding': './types/onboarding',
  
  // Services
  '@/services/PageRelationshipService': './services/PageRelationshipService',
  '@/services/UserJourneyTracker': './services/UserJourneyTracker',
  '@/services/navigation': './services/navigation',
  '@/services/api': './services/api',
  '@/services/api-error-handling': './services/api-error-handling',
  
  // Hooks
  '@/hooks/useComprehensiveLoading': './hooks/useComprehensiveLoading',
  '@/hooks/useAuth': './hooks/useAuth',
  '@/hooks/use-unified-navigation': './hooks/use-unified-navigation',
  '@/hooks/use-navigation-performance': './hooks/use-navigation-performance',
  '@/hooks/use-navigation-accessibility': './hooks/use-navigation-accessibility',
  '@/hooks/use-mobile': './hooks/use-mobile',
  '@/hooks/use-journey-tracker': './hooks/use-journey-tracker',
  '@/hooks/use-system': './hooks/use-system',
  '@/hooks/use-onboarding': './hooks/use-onboarding',
  '@/hooks/use-bill-analysis': './hooks/use-bill-analysis',
  '@/hooks/use-online-status': './hooks/use-online-status',
  '@/hooks/use-toast': './hooks/use-toast',
  '@/hooks/use-bills': './hooks/use-bills',
  '@/hooks/use-navigation-preferences': './hooks/use-navigation-preferences',
  '@/hooks/useConnectionAware': './hooks/useConnectionAware',
  
  // Contexts
  '@/contexts/LoadingContext': './contexts/LoadingContext',
  '@/contexts/NavigationContext': './core/navigation/context',
  
  // Components - UI
  '@/components/ui/toaster': './components/ui/toaster',
  '@/components/ui/alert': './components/ui/alert',
  '@/components/ui/avatar': './components/ui/avatar',
  '@/components/ui/badge': './components/ui/badge',
  '@/components/ui/button': './components/ui/button',
  '@/components/ui/calendar': './components/ui/calendar',
  '@/components/ui/card': './components/ui/card',
  '@/components/ui/dialog': './components/ui/dialog',
  '@/components/ui/dropdown-menu': './components/ui/dropdown-menu',
  '@/components/ui/form': './components/ui/form',
  '@/components/ui/input': './components/ui/input',
  '@/components/ui/label': './components/ui/label',
  '@/components/ui/logo': './components/ui/logo',
  '@/components/ui/popover': './components/ui/popover',
  '@/components/ui/progress': './components/ui/progress',
  '@/components/ui/scroll-area': './components/ui/scroll-area',
  '@/components/ui/select': './components/ui/select',
  '@/components/ui/separator': './components/ui/separator',
  '@/components/ui/sheet': './components/ui/sheet',
  '@/components/ui/skeleton': './components/ui/skeleton',
  '@/components/ui/spinner': './components/ui/spinner',
  '@/components/ui/switch': './components/ui/switch',
  '@/components/ui/table': './components/ui/table',
  '@/components/ui/tabs': './components/ui/tabs',
  '@/components/ui/textarea': './components/ui/textarea',
  '@/components/ui/toast': './components/ui/toast',
  '@/components/ui/tooltip': './components/ui/tooltip',
  
  // Components - Layout
  '@/components/layout/app-layout': './components/layout/app-layout',
  '@/components/layout/mobile-navigation': './components/layout/mobile-navigation',
  '@/components/layout/mobile-header': './components/layout/mobile-header',
  '@/components/layout/sidebar': './components/layout/sidebar',
  
  // Components - Navigation
  '@/components/navigation': './components/navigation',
  '@/components/navigation/ui/DesktopSidebar': './components/navigation/ui/DesktopSidebar',
  '@/components/navigation/ui/NavLink': './components/navigation/ui/NavLink',
  '@/components/navigation/ui/NavSection': './components/navigation/ui/NavSection',
  
  // Components - Loading
  '@/components/loading/AssetLoadingIndicator': './components/loading/AssetLoadingIndicator',
  '@/components/loading/GlobalLoadingIndicator': './components/loading/GlobalLoadingIndicator',
  '@/components/loading/LoadingStates': './components/loading/LoadingStates',
  
  // Components - Error Handling
  '@/components/error-handling/withErrorBoundary': './components/error-handling/withErrorBoundary',
  '@/components/error-handling/ErrorFallback': './components/error-handling/ErrorFallback',
  '@/components/error-handling/ErrorBoundary': './components/error-handling/ErrorBoundary',
  '@/components/error-handling': './components/error-handling',
  
  // Components - Accessibility
  '@/components/accessibility/accessibility-manager': './components/accessibility/accessibility-manager',
  '@/components/accessibility/accessibility-settings-panel': './components/accessibility/accessibility-settings-panel',
  
  // Components - Other
  '@/components/AppProviders': './components/AppProviders',
  '@/components/compatibility/BrowserCompatibilityChecker': './components/compatibility/BrowserCompatibilityChecker',
  '@/components/performance/PerformanceMetricsCollector': './components/performance/PerformanceMetricsCollector',
  '@/components/offline/offline-manager': './components/offline/offline-manager',
  '@/components/navigation/favorite-page-button': './components/navigation/favorite-page-button',
  '@/components/mobile/responsive-layout-manager': './components/mobile/responsive-layout-manager',
  '@/components/mobile/responsive-page-wrapper': './components/mobile/responsive-page-wrapper',
  '@/components/mobile/mobile-performance-optimizations': './components/mobile/mobile-performance-optimizations',
  '@/components/mobile/mobile-navigation-enhancements': './components/mobile/mobile-navigation-enhancements',
  '@/components/profile/user-profile': './components/profile/user-profile',
  '@/components/search/advanced-search': './components/search/advanced-search',
  '@/components/verification/verification-list': './components/verification/verification-list',
  '@/components/admin/admin-dashboard': './components/admin/admin-dashboard',
  '@/components/auth/auth-forms': './components/auth/auth-forms',
  '@/components/bills/implementation-workarounds': './components/bills/implementation-workarounds',
  '@/components/analysis/section': './components/analysis/section',
  '@/components/analysis/timeline': './components/analysis/timeline',
  '@/components/analysis/comments': './components/analysis/comments',
  '@/components/analysis/stats': './components/analysis/stats',
  '@/components/coverage/coverage-dashboard': './components/coverage/coverage-dashboard',
  '@/components/notifications/notification-center': './components/notifications/notification-center',
  '@/components/navigation/navigation-preferences-dialog': './components/navigation/navigation-preferences-dialog',
  '@/components/navigation/quick-access-nav': './components/navigation/quick-access-nav',
  '@/components/monitoring/monitoring-dashboard': './components/monitoring/monitoring-dashboard',
  
  // Pages
  '@/pages/home': './pages/home',
  '@/pages/dashboard': './pages/dashboard',
  '@/pages/auth-page': './pages/auth-page',
  '@/pages/profile': './pages/profile',
  '@/pages/user-profile': './pages/user-profile',
  '@/pages/onboarding': './pages/onboarding',
  '@/pages/search': './pages/search',
  '@/pages/admin': './pages/admin',
  '@/pages/database-manager': './pages/database-manager',
  '@/pages/not-found': './pages/not-found',
  
  // Shared
  '@/shared/validation/base-validation': './shared/validation/base-validation',
  '@/shared/design-system/responsive': './shared/design-system/responsive',
  '@/shared/lib/utils': './shared/lib/utils',
  
  // Config
  '@/config/onboarding': './config/onboarding',
  '@/config/api': './config/api',
  
  // Lib
  '@/lib/icon-wrapper': './lib/icon-wrapper',
  '@/lib/utils': './lib/utils',
  '@/lib/queryClient': './lib/queryClient',
  
  // Test utils
  '@/test-utils': './test-utils',
};

/**
 * Calculate relative path from source file to target
 */
function calculateRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, path.join(CLIENT_SRC, toPath.replace('./', '')));
  
  // Ensure the path starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    return './' + relativePath;
  }
  return relativePath;
}

/**
 * Fix imports in a single file
 */
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix @/ imports
    for (const [oldImport, newImport] of Object.entries(IMPORT_MAPPINGS)) {
      const regex = new RegExp(`from ['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
      const relativePath = calculateRelativePath(filePath, newImport);
      const replacement = `from '${relativePath}'`;
      
      if (content.includes(`from '${oldImport}'`) || content.includes(`from "${oldImport}"`)) {
        content = content.replace(regex, replacement);
        hasChanges = true;
      }
    }
    
    // Fix import statements (not just from clauses)
    for (const [oldImport, newImport] of Object.entries(IMPORT_MAPPINGS)) {
      const regex = new RegExp(`import\\s+([^'"]*)['"]${oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
      const relativePath = calculateRelativePath(filePath, newImport);
      
      content = content.replace(regex, (match, importClause) => {
        hasChanges = true;
        return `import ${importClause}'${relativePath}'`;
      });
    }
    
    // Fix relative imports that might be incorrect due to refactoring
    // Convert ../ imports that should be ./ based on new structure
    const relativeImportRegex = /from ['"](\.\.[^'"]*)['"]/g;
    content = content.replace(relativeImportRegex, (match, importPath) => {
      // Check if this is a common pattern that needs fixing
      if (importPath.includes('../components/') && filePath.includes('/components/')) {
        const newPath = importPath.replace('../components/', './');
        hasChanges = true;
        return `from '${newPath}'`;
      }
      if (importPath.includes('../hooks/') && filePath.includes('/hooks/')) {
        const newPath = importPath.replace('../hooks/', './');
        hasChanges = true;
        return `from '${newPath}'`;
      }
      if (importPath.includes('../utils/') && filePath.includes('/utils/')) {
        const newPath = importPath.replace('../utils/', './');
        hasChanges = true;
        return `from '${newPath}'`;
      }
      return match;
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in: ${path.relative(CLIENT_SRC, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing imports in ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively find all TypeScript/React files
 */
function findTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        traverse(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting frontend import fixes...\n');
  
  if (!fs.existsSync(CLIENT_SRC)) {
    console.error(`❌ Client source directory not found: ${CLIENT_SRC}`);
    process.exit(1);
  }
  
  const tsFiles = findTsFiles(CLIENT_SRC);
  console.log(`📁 Found ${tsFiles.length} TypeScript/React files\n`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    if (fixImportsInFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n✨ Import fixes completed!`);
  console.log(`📊 Fixed imports in ${fixedCount} out of ${tsFiles.length} files`);
  
  if (fixedCount > 0) {
    console.log('\n🎯 Next steps:');
    console.log('1. Run type checking: npm run type-check');
    console.log('2. Run tests: npm run test');
    console.log('3. Start dev server: npm run dev');
  }
}

main();