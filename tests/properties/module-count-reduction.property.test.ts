/**
 * Property-Based Test: Module Count Reduction
 * 
 * Property 2: The consolidated infrastructure should have between 18 and 22 modules total.
 * 
 * Feature: client-infrastructure-consolidation, Property 2: Module Count Reduction
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Feature: client-infrastructure-consolidation, Property 2: Module Count Reduction', () => {
  it('should have between 18 and 22 modules in infrastructure directory', async () => {
    const infrastructurePath = path.resolve(process.cwd(), 'client/src/infrastructure');
    
    // Get all directories in infrastructure
    const entries = fs.readdirSync(infrastructurePath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    
    // Exclude non-module directories
    const excludedDirs = new Set([
      '__tests__',
      'node_modules',
      'dist',
      'scripts',
      'consolidation', // Temporary consolidation utilities
      '.git',
      'coverage',
    ]);
    
    const moduleDirectories = directories.filter(dir => !excludedDirs.has(dir.name));
    const moduleCount = moduleDirectories.length;
    const moduleNames = moduleDirectories.map(dir => dir.name).sort();
    
    // Property: Module count should be in target range [18, 22]
    const minModules = 18;
    const maxModules = 22;
    const isInRange = moduleCount >= minModules && moduleCount <= maxModules;
    
    if (!isInRange) {
      const errorMessage = [
        `Module count is outside target range [${minModules}, ${maxModules}]`,
        `  Actual count: ${moduleCount}`,
        `  Modules found: ${moduleNames.join(', ')}`,
        '',
        moduleCount > maxModules 
          ? `  Too many modules (${moduleCount - maxModules} over target). Consider consolidating more modules.`
          : `  Too few modules (${minModules - moduleCount} under target). Verify consolidation is complete.`,
      ].join('\n');
      
      throw new Error(errorMessage);
    }
    
    expect(isInRange).toBe(true);
    expect(moduleCount).toBeGreaterThanOrEqual(minModules);
    expect(moduleCount).toBeLessThanOrEqual(maxModules);
  });

  it('should maintain module count stability across multiple checks', async () => {
    const infrastructurePath = path.resolve(process.cwd(), 'client/src/infrastructure');
    
    await fc.assert(
      fc.asyncProperty(
        fc.constant(infrastructurePath),
        async (dirPath) => {
          // Get all directories in infrastructure
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          const directories = entries.filter(entry => entry.isDirectory());
          
          // Exclude non-module directories
          const excludedDirs = new Set([
            '__tests__',
            'node_modules',
            'dist',
            'scripts',
            'consolidation',
            '.git',
            'coverage',
          ]);
          
          const moduleDirectories = directories.filter(dir => !excludedDirs.has(dir.name));
          const moduleCount = moduleDirectories.length;
          
          // Property: Module count should be consistent and in range
          const minModules = 18;
          const maxModules = 22;
          
          expect(moduleCount).toBeGreaterThanOrEqual(minModules);
          expect(moduleCount).toBeLessThanOrEqual(maxModules);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should have all directories be valid modules with standard structure', async () => {
    const infrastructurePath = path.resolve(process.cwd(), 'client/src/infrastructure');
    
    // Get all directories in infrastructure
    const entries = fs.readdirSync(infrastructurePath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    
    // Exclude non-module directories
    const excludedDirs = new Set([
      '__tests__',
      'node_modules',
      'dist',
      'scripts',
      'consolidation',
      '.git',
      'coverage',
    ]);
    
    const moduleDirectories = directories.filter(dir => !excludedDirs.has(dir.name));
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, moduleDirectories.length - 1) }),
        async (moduleIndex) => {
          const moduleDir = moduleDirectories[moduleIndex];
          if (!moduleDir) return;
          
          const modulePath = path.join(infrastructurePath, moduleDir.name);
          const moduleContents = fs.readdirSync(modulePath);
          
          // Property: Each module should have an index.ts file (public API)
          const hasIndexFile = moduleContents.includes('index.ts');
          
          if (!hasIndexFile) {
            throw new Error(
              `Module '${moduleDir.name}' is missing index.ts file. ` +
              `All modules must have a public API through index.ts.`
            );
          }
          
          expect(hasIndexFile).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
