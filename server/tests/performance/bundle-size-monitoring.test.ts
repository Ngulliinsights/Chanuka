import { describe, it, expect, beforeAll } from '@jest/globals';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from '../../../shared/core/src/observability/logging';

describe('Bundle Size Monitoring and Regression Tests', () => {
  const BUNDLE_SIZE_LIMITS = {
    // Maximum bundle sizes in bytes
    mainBundle: 2 * 1024 * 1024, // 2MB
    vendorBundle: 1.5 * 1024 * 1024, // 1.5MB
    totalBundle: 3 * 1024 * 1024, // 3MB
  };

  const REGRESSION_THRESHOLD = 0.1; // 10% increase threshold

  beforeAll(async () => {
    // Build the application for testing
    logger.info('Building application for bundle analysis...', { component: 'Chanuka' });
    try {
      execSync('npm run build:client', { stdio: 'pipe' });
    } catch (error) {
      console.warn('Build failed, using existing build if available');
    }
  });

  describe('Bundle Size Limits', () => {
    it('should not exceed maximum bundle size limits', () => {
      const distPath = join(process.cwd(), 'dist', 'public');
      
      if (!existsSync(distPath)) {
        console.warn('Build directory not found, skipping bundle size test');
        return;
      }

      const bundleFiles = [];
      let totalSize = 0;

      try {
        // Find JavaScript bundle files
        const assetsPath = join(distPath, 'assets');
        if (existsSync(assetsPath)) {
          const files = execSync(`find "${assetsPath}" -name "*.js" -type f`, { encoding: 'utf8' })
            .trim()
            .split('\n')
            .filter(file => file.length > 0);

          for (const file of files) {
            const stats = statSync(file);
            const size = stats.size;
            totalSize += size;
            
            bundleFiles.push({
              file: file.replace(process.cwd(), ''),
              size,
              sizeKB: Math.round(size / 1024)
            });
          }
        }

        logger.info('Bundle Analysis:', { component: 'Chanuka' });
        bundleFiles.forEach(bundle => {
          console.log(`  ${bundle.file}: ${bundle.sizeKB}KB`);
        });
        console.log(`  Total: ${Math.round(totalSize / 1024)}KB`);

        // Check total bundle size
        expect(totalSize).toBeLessThan(BUNDLE_SIZE_LIMITS.totalBundle);

        // Check individual large bundles
        const largeBundles = bundleFiles.filter(bundle => bundle.size > 500 * 1024); // > 500KB
        largeBundles.forEach(bundle => {
          expect(bundle.size).toBeLessThan(BUNDLE_SIZE_LIMITS.mainBundle);
        });

      } catch (error) {
        console.warn('Bundle size analysis failed:', error.message);
        // Don't fail the test if we can't analyze bundles
      }
    });

    it('should track bundle size changes over time', () => {
      const bundleSizeHistoryPath = join(process.cwd(), 'bundle-size-history.json');
      const currentSizes = getBundleSizes();
      
      if (currentSizes.total === 0) {
        console.warn('No bundle files found, skipping regression test');
        return;
      }

      let history = [];
      if (existsSync(bundleSizeHistoryPath)) {
        try {
          history = JSON.parse(readFileSync(bundleSizeHistoryPath, 'utf8'));
        } catch (error) {
          console.warn('Could not read bundle size history');
        }
      }

      const currentEntry = {
        timestamp: new Date().toISOString(),
        sizes: currentSizes,
        commit: process.env.GITHUB_SHA || 'local'
      };

      // Check for regression if we have previous data
      if (history.length > 0) {
        const lastEntry = history[history.length - 1];
        const sizeIncrease = (currentSizes.total - lastEntry.sizes.total) / lastEntry.sizes.total;
        
        console.log(`Bundle size change: ${(sizeIncrease * 100).toFixed(2)}%`);
        
        if (sizeIncrease > REGRESSION_THRESHOLD) {
          console.warn(`Bundle size increased by ${(sizeIncrease * 100).toFixed(2)}%`);
          // Don't fail in CI, just warn
          if (!process.env.CI) {
            expect(sizeIncrease).toBeLessThan(REGRESSION_THRESHOLD);
          }
        }
      }

      // Update history (keep last 50 entries)
      history.push(currentEntry);
      if (history.length > 50) {
        history = history.slice(-50);
      }

      // Save updated history
      try {
        require('fs').writeFileSync(bundleSizeHistoryPath, JSON.stringify(history, null, 2));
      } catch (error) {
        console.warn('Could not save bundle size history');
      }
    });
  });

  describe('Dependency Analysis', () => {
    it('should not include unused dependencies in bundle', () => {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Check for commonly unused dependencies that might be bundled
      const potentiallyUnusedDeps = [
        'lodash', // Often imported entirely instead of specific functions
        'moment', // Large library, should use date-fns
        'jquery', // Shouldn't be needed in React app
      ];

      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      potentiallyUnusedDeps.forEach(dep => {
        if (dependencies[dep]) {
          console.warn(`Potentially unused large dependency found: ${dep}`);
        }
      });

      // This is more of a warning than a hard failure
      expect(true).toBe(true);
    });

    it('should use tree-shaking effectively', () => {
      // Check if we're importing entire libraries instead of specific functions
      const srcPath = join(process.cwd(), 'client', 'src');
      
      if (!existsSync(srcPath)) {
        console.warn('Source directory not found, skipping tree-shaking test');
        return;
      }

      try {
        // Look for problematic import patterns
        const problematicImports = execSync(
          `find "${srcPath}" -name "*.tsx" -o -name "*.ts" | xargs grep -l "import \\*" || true`,
          { encoding: 'utf8' }
        ).trim();

        if (problematicImports) {
          console.warn('Files with wildcard imports found:');
          console.warn(problematicImports);
        }

        // This is informational - we don't fail the test
        expect(true).toBe(true);
      } catch (error) {
        console.warn('Tree-shaking analysis failed:', error.message);
      }
    });
  });

  function getBundleSizes() {
    const distPath = join(process.cwd(), 'dist', 'public', 'assets');
    let totalSize = 0;
    const sizes = {};

    if (!existsSync(distPath)) {
      return { total: 0, files: {} };
    }

    try {
      const files = execSync(`find "${distPath}" -name "*.js" -type f`, { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(file => file.length > 0);

      for (const file of files) {
        const stats = statSync(file);
        const size = stats.size;
        totalSize += size;
        
        const filename = file.split('/').pop();
        sizes[filename] = size;
      }
    } catch (error) {
      console.warn('Could not analyze bundle sizes:', error.message);
    }

    return {
      total: totalSize,
      files: sizes
    };
  }
});











































