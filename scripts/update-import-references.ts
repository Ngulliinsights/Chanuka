#!/usr/bin/env tsx

/**
 * Import References Update Script
 * 
 * Updates all import references to point to the correct consolidated files
 * after duplicate removal and restructuring.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ImportMapping {
  oldPath: string;
  newPath: string;
  reason: string;
}

class ImportReferencesUpdater {
  private clientDir = 'client/src';
  
  // Mappings for files that were moved or consolidated
  private importMappings: ImportMapping[] = [
    // Offline components moved to shared/ui
    {
      oldPath: '@client/components/OfflineModal',
      newPath: '@client/lib/ui/offline/OfflineModal',
      reason: 'Consolidated to shared/ui/offline'
    },
    {
      oldPath: '@client/components/OfflineIndicator',
      newPath: '@client/lib/ui/offline/OfflineIndicator',
      reason: 'Consolidated to shared/ui/offline'
    },
    {
      oldPath: '../components/OfflineModal',
      newPath: '../shared/ui/offline/OfflineModal',
      reason: 'Consolidated to shared/ui/offline'
    },
    {
      oldPath: '../components/OfflineIndicator',
      newPath: '../shared/ui/offline/OfflineIndicator',
      reason: 'Consolidated to shared/ui/offline'
    },
    
    // Database status moved to shared/ui
    {
      oldPath: '@client/components/database-status',
      newPath: '@client/lib/ui/database-status',
      reason: 'Consolidated to shared/ui'
    },
    {
      oldPath: '../components/database-status',
      newPath: '../shared/ui/database-status',
      reason: 'Consolidated to shared/ui'
    },
    
    // Connection status moved to shared/ui
    {
      oldPath: '@client/components/connection-status',
      newPath: '@client/lib/ui/connection-status',
      reason: 'Consolidated to shared/ui'
    },
    
    // Browser compatibility moved to core/browser
    {
      oldPath: '@client/lib/infrastructure/compatibility/BrowserCompatibilityChecker',
      newPath: '@client/infrastructure/browser/BrowserCompatibilityChecker',
      reason: 'Consolidated to core/browser'
    },
    {
      oldPath: '@client/lib/infrastructure/compatibility/BrowserCompatibilityReport',
      newPath: '@client/infrastructure/browser/BrowserCompatibilityReport',
      reason: 'Consolidated to core/browser'
    },
    {
      oldPath: '@client/lib/infrastructure/compatibility/BrowserCompatibilityTester',
      newPath: '@client/infrastructure/browser/BrowserCompatibilityTester',
      reason: 'Consolidated to core/browser'
    },
    {
      oldPath: '@client/lib/infrastructure/compatibility/FeatureFallbacks',
      newPath: '@client/infrastructure/browser/FeatureFallbacks',
      reason: 'Consolidated to core/browser'
    },
    {
      oldPath: '@client/lib/infrastructure/compatibility/useBrowserStatus',
      newPath: '@client/infrastructure/browser/useBrowserStatus',
      reason: 'Consolidated to core/browser'
    },
    
    // Transparency components moved to features/bills
    {
      oldPath: '@client/components/transparency/ConflictAnalysisDashboard',
      newPath: '@client/features/bills/ui/transparency/ConflictAnalysisDashboard',
      reason: 'Consolidated to features/bills/ui/transparency'
    },
    {
      oldPath: '@client/components/transparency/ConflictNetworkVisualization',
      newPath: '@client/features/bills/ui/transparency/ConflictNetworkVisualization',
      reason: 'Consolidated to features/bills/ui/transparency'
    },
    
    // Shell components moved to components/shell
    {
      oldPath: '@client/app/shell/AppRouter',
      newPath: '@client/components/shell/AppRouter',
      reason: 'Consolidated to components/shell'
    },
    {
      oldPath: '@client/app/shell/AppShell',
      newPath: '@client/components/shell/AppShell',
      reason: 'Consolidated to components/shell'
    },
    {
      oldPath: '@client/app/shell/NavigationBar',
      newPath: '@client/components/shell/NavigationBar',
      reason: 'Consolidated to components/shell'
    },
    {
      oldPath: '@client/app/shell/ProtectedRoute',
      newPath: '@client/components/shell/ProtectedRoute',
      reason: 'Consolidated to components/shell'
    },
    {
      oldPath: '@client/app/shell/SkipLinks',
      newPath: '@client/components/shell/SkipLinks',
      reason: 'Consolidated to components/shell'
    },
    
    // Notifications moved to shared/ui
    {
      oldPath: '@client/components/notifications/',
      newPath: '@client/lib/ui/notifications/',
      reason: 'Consolidated to shared/ui/notifications'
    },
    
    // Settings moved to features/users
    {
      oldPath: '@client/components/settings/alert-preferences',
      newPath: '@client/features/users/ui/settings/alert-preferences',
      reason: 'Consolidated to features/users/ui/settings'
    },
    
    // Integration components moved to shared/ui
    {
      oldPath: '@client/components/integration/',
      newPath: '@client/lib/ui/integration/',
      reason: 'Consolidated to shared/ui/integration'
    },
    
    // Coverage moved to features/admin
    {
      oldPath: '@client/components/coverage/coverage-dashboard',
      newPath: '@client/features/admin/ui/coverage/coverage-dashboard',
      reason: 'Consolidated to features/admin/ui/coverage'
    },
    
    // Privacy components moved to shared/ui
    {
      oldPath: '@client/components/shared/privacy/',
      newPath: '@client/lib/ui/privacy/',
      reason: 'Consolidated to shared/ui/privacy'
    },
    
    // Dashboard components moved to shared/ui
    {
      oldPath: '@client/components/shared/dashboard/',
      newPath: '@client/lib/ui/dashboard/',
      reason: 'Consolidated to shared/ui/dashboard'
    },
    
    // Education components moved to shared/ui
    {
      oldPath: '@client/features/bills/ui/education/',
      newPath: '@client/lib/ui/education/',
      reason: 'Consolidated to shared/ui/education'
    },
    
    // Conflict analysis consolidated
    {
      oldPath: '@client/features/bills/ui/analysis/conflict/',
      newPath: '@client/features/bills/ui/analysis/conflict-of-interest/',
      reason: 'Consolidated conflict analysis implementations'
    },
    
    // Bill tracking consolidated
    {
      oldPath: '@client/features/bills/ui/bill-tracking/',
      newPath: '@client/features/bills/ui/tracking/',
      reason: 'Consolidated bill tracking implementations'
    },
    
    // Admin dashboard consolidated
    {
      oldPath: '@client/features/admin/ui/dashboard/admin-dashboard',
      newPath: '@client/features/admin/ui/admin-dashboard',
      reason: 'Consolidated admin dashboard implementations'
    }
  ];

  async run(): Promise<void> {
    console.log('🔄 Updating import references...\n');

    await this.updateImportReferences();
    await this.validateUpdatedImports();
    
    console.log('\n✅ Import references updated successfully!');
  }

  private async updateImportReferences(): Promise<void> {
    console.log('📝 Scanning and updating import statements...');

    const files = await glob(`${this.clientDir}/**/*.{ts,tsx}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/cleanup-backup/**'
      ]
    });

    let updatedFiles = 0;
    let totalUpdates = 0;

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        let updatedContent = content;
        let fileUpdates = 0;

        for (const mapping of this.importMappings) {
          // Update import statements
          const importRegex = new RegExp(
            `(import\\s+[^'"\`]*from\\s+['"\`])${this.escapeRegex(mapping.oldPath)}(['"\`])`,
            'g'
          );
          
          const newContent = updatedContent.replace(importRegex, `$1${mapping.newPath}$2`);
          if (newContent !== updatedContent) {
            updatedContent = newContent;
            fileUpdates++;
          }

          // Update dynamic imports
          const dynamicImportRegex = new RegExp(
            `(import\\s*\\(\\s*['"\`])${this.escapeRegex(mapping.oldPath)}(['"\`]\\s*\\))`,
            'g'
          );
          
          const newDynamicContent = updatedContent.replace(dynamicImportRegex, `$1${mapping.newPath}$2`);
          if (newDynamicContent !== updatedContent) {
            updatedContent = newDynamicContent;
            fileUpdates++;
          }

          // Update require statements
          const requireRegex = new RegExp(
            `(require\\s*\\(\\s*['"\`])${this.escapeRegex(mapping.oldPath)}(['"\`]\\s*\\))`,
            'g'
          );
          
          const newRequireContent = updatedContent.replace(requireRegex, `$1${mapping.newPath}$2`);
          if (newRequireContent !== updatedContent) {
            updatedContent = newRequireContent;
            fileUpdates++;
          }
        }

        if (updatedContent !== content) {
          await fs.writeFile(file, updatedContent);
          updatedFiles++;
          totalUpdates += fileUpdates;
          console.log(`✅ Updated ${fileUpdates} imports in ${path.relative(this.clientDir, file)}`);
        }
      } catch (error) {
        console.warn(`Failed to update imports in ${file}:`, error);
      }
    }

    console.log(`\n📊 Update Summary:`);
    console.log(`   Files updated: ${updatedFiles}`);
    console.log(`   Total import updates: ${totalUpdates}`);
  }

  private async validateUpdatedImports(): Promise<void> {
    console.log('\n🔍 Validating updated imports...');

    const files = await glob(`${this.clientDir}/**/*.{ts,tsx}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/cleanup-backup/**'
      ]
    });

    let brokenImports = 0;
    const brokenFiles: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const imports = this.extractImports(content);

        for (const importPath of imports) {
          if (importPath.startsWith('@client/') || importPath.startsWith('./') || importPath.startsWith('../')) {
            const resolvedPath = await this.resolveImportPath(importPath, file);
            if (!resolvedPath || !(await this.fileExists(resolvedPath))) {
              console.warn(`❌ Broken import: ${importPath} in ${path.relative(this.clientDir, file)}`);
              brokenImports++;
              if (!brokenFiles.includes(file)) {
                brokenFiles.push(file);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to validate imports in ${file}:`, error);
      }
    }

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Broken imports: ${brokenImports}`);
    console.log(`   Files with issues: ${brokenFiles.length}`);

    if (brokenImports === 0) {
      console.log('✅ All imports are valid!');
    } else {
      console.log('⚠️  Some imports may need manual fixing');
    }
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private async resolveImportPath(importPath: string, fromFile: string): Promise<string | null> {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);
      
      // Try different extensions
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        const fullPath = resolved + ext;
        if (await this.fileExists(fullPath)) {
          return fullPath;
        }
      }
    }

    // Handle absolute imports
    if (importPath.startsWith('@client/')) {
      const relativePath = importPath.replace('@client/', 'client/src/');
      
      for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
        const fullPath = relativePath + ext;
        if (await this.fileExists(fullPath)) {
          return fullPath;
        }
      }
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Run the updater
const updater = new ImportReferencesUpdater();
updater.run().catch(console.error);