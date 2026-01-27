#!/usr/bin/env tsx

/**
 * Emergency Design System Consolidation Script
 * 
 * CRITICAL: This script addresses the architectural chaos in the design system
 * by consolidating 568 components with 59 duplicates into a clean, single-source-of-truth structure.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ConsolidationAction {
  type: 'move' | 'merge' | 'delete' | 'create';
  source?: string;
  target: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium';
}

class EmergencyDesignSystemConsolidation {
  private designSystemDir = 'client/src/lib/design-system';
  private actions: ConsolidationAction[] = [];
  private backupDir = 'client/src/.design-system-backup';

  async run(): Promise<void> {
    console.log('🚨 EMERGENCY DESIGN SYSTEM CONSOLIDATION\n');
    console.log('⚠️  This will restructure the entire design system to fix architectural chaos\n');

    await this.createBackup();
    await this.planConsolidation();
    await this.executeConsolidation();
    await this.updateImports();
    await this.validateConsolidation();
    
    console.log('\n✅ Emergency consolidation completed!');
    console.log('📋 Next steps: Test the application and update any remaining imports');
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating backup of current design system...');
    
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Copy entire design system to backup
      await this.copyDirectory(this.designSystemDir, this.backupDir);
      
      console.log(`✅ Backup created at: ${this.backupDir}`);
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async planConsolidation(): Promise<void> {
    console.log('📋 Planning consolidation actions...');

    // Step 1: Create new clean structure
    this.actions.push({
      type: 'create',
      target: `${this.designSystemDir}/components`,
      reason: 'Create unified components directory',
      priority: 'critical'
    });

    // Step 2: Consolidate Button implementations
    await this.planButtonConsolidation();
    
    // Step 3: Consolidate Input implementations
    await this.planInputConsolidation();
    
    // Step 4: Consolidate other core components
    await this.planCoreComponentsConsolidation();
    
    // Step 5: Remove duplicate directories
    await this.planDirectoryCleanup();
    
    // Step 6: Create new main index
    this.actions.push({
      type: 'create',
      target: `${this.designSystemDir}/index.ts`,
      reason: 'Create unified entry point',
      priority: 'critical'
    });

    console.log(`✅ Planned ${this.actions.length} consolidation actions`);
  }

  private async planButtonConsolidation(): Promise<void> {
    // Use interactive/button.tsx as the canonical implementation
    this.actions.push({
      type: 'move',
      source: `${this.designSystemDir}/interactive/button.tsx`,
      target: `${this.designSystemDir}/components/Button.tsx`,
      reason: 'Consolidate Button - use interactive version as canonical',
      priority: 'critical'
    });

    // Delete duplicate Button implementations
    const buttonDuplicates = [
      'primitives/simple-button.tsx',
      'primitives/unified-button.tsx',
      'primitives/unified-components.tsx', // Contains UnifiedButton
      'styles/design-system.ts', // Contains CustomButton, EnhancedButton
      'primitives/hybrid-components.tsx', // Contains HybridButtonExample
      'primitives/test-components.tsx', // Contains TestButton
      'primitives/migration-examples.tsx' // Contains LegacyButtonExample, HybridButtonExample
    ];

    for (const duplicate of buttonDuplicates) {
      this.actions.push({
        type: 'delete',
        target: `${this.designSystemDir}/${duplicate}`,
        reason: `Remove duplicate Button implementation: ${duplicate}`,
        priority: 'high'
      });
    }
  }

  private async planInputConsolidation(): Promise<void> {
    // Use interactive/input.tsx as the canonical implementation
    this.actions.push({
      type: 'move',
      source: `${this.designSystemDir}/interactive/input.tsx`,
      target: `${this.designSystemDir}/components/Input.tsx`,
      reason: 'Consolidate Input - use interactive version as canonical',
      priority: 'critical'
    });

    // Note: Keep validation utilities but remove duplicate Input implementations
    // The primitives/validation.ts can be moved to utils/validation.ts
    this.actions.push({
      type: 'move',
      source: `${this.designSystemDir}/primitives/validation.ts`,
      target: `${this.designSystemDir}/utils/validation.ts`,
      reason: 'Move validation utilities to utils directory',
      priority: 'medium'
    });
  }

  private async planCoreComponentsConsolidation(): Promise<void> {
    // Core components to consolidate
    const coreComponents = [
      { source: 'interactive/card.tsx', target: 'Card.tsx' },
      { source: 'feedback/Alert.tsx', target: 'Alert.tsx' },
      { source: 'feedback/Badge.tsx', target: 'Badge.tsx' },
      { source: 'feedback/Progress.tsx', target: 'Progress.tsx' },
      { source: 'media/Avatar.tsx', target: 'Avatar.tsx' },
      { source: 'interactive/select.tsx', target: 'Select.tsx' },
      { source: 'interactive/textarea.tsx', target: 'Textarea.tsx' },
      { source: 'interactive/checkbox.tsx', target: 'Checkbox.tsx' },
      { source: 'interactive/switch.tsx', target: 'Switch.tsx' },
      { source: 'interactive/Dialog.tsx', target: 'Dialog.tsx' },
      { source: 'interactive/Popover.tsx', target: 'Popover.tsx' },
      { source: 'interactive/Tabs.tsx', target: 'Tabs.tsx' }
    ];

    for (const component of coreComponents) {
      const sourcePath = `${this.designSystemDir}/${component.source}`;
      const targetPath = `${this.designSystemDir}/components/${component.target}`;
      
      if (await this.fileExists(sourcePath)) {
        this.actions.push({
          type: 'move',
          source: sourcePath,
          target: targetPath,
          reason: `Consolidate ${component.target} to unified components directory`,
          priority: 'high'
        });
      }
    }
  }

  private async planDirectoryCleanup(): Promise<void> {
    // Remove problematic directories after moving components
    const directoriesToRemove = [
      'primitives', // Most problematic - contains duplicates and test components
      'styles/components', // Contains duplicate implementations
      // Keep: interactive, feedback, media (after moving components)
      // Keep: tokens, themes, utils, accessibility
    ];

    for (const dir of directoriesToRemove) {
      this.actions.push({
        type: 'delete',
        target: `${this.designSystemDir}/${dir}`,
        reason: `Remove problematic directory: ${dir}`,
        priority: 'medium'
      });
    }
  }

  private async executeConsolidation(): Promise<void> {
    console.log('🔧 Executing consolidation actions...');

    // Sort actions by priority
    const sortedActions = this.actions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let completed = 0;
    
    for (const action of sortedActions) {
      try {
        await this.executeAction(action);
        completed++;
        console.log(`✅ ${completed}/${sortedActions.length}: ${action.reason}`);
      } catch (error) {
        console.warn(`⚠️  Failed: ${action.reason} - ${error}`);
      }
    }

    console.log(`✅ Completed ${completed}/${sortedActions.length} actions`);
  }

  private async executeAction(action: ConsolidationAction): Promise<void> {
    switch (action.type) {
      case 'create':
        if (action.target.endsWith('.ts')) {
          await this.createUnifiedIndex(action.target);
        } else {
          await fs.mkdir(action.target, { recursive: true });
        }
        break;
        
      case 'move':
        if (action.source && await this.fileExists(action.source)) {
          await fs.mkdir(path.dirname(action.target), { recursive: true });
          await fs.rename(action.source, action.target);
        }
        break;
        
      case 'delete':
        if (await this.fileExists(action.target)) {
          const stats = await fs.stat(action.target);
          if (stats.isDirectory()) {
            await fs.rm(action.target, { recursive: true, force: true });
          } else {
            await fs.unlink(action.target);
          }
        }
        break;
        
      case 'merge':
        // For now, merge is handled manually in planning phase
        break;
    }
  }

  private async createUnifiedIndex(indexPath: string): Promise<void> {
    const content = `/**
 * Unified Design System
 * 
 * Single source of truth for all UI components.
 * 
 * Usage:
 * import { Button, Input, Card, Alert } from '@client/lib/design-system';
 */

// Core UI Components
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, inputVariants, type InputProps } from './components/Input';
export { Card, CardHeader, CardContent, CardFooter, type CardProps } from './components/Card';
export { Alert, type AlertProps } from './components/Alert';
export { Badge, type BadgeProps } from './components/Badge';
export { Progress, type ProgressProps } from './components/Progress';
export { Avatar, type AvatarProps } from './components/Avatar';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/Select';
export { Textarea, type TextareaProps } from './components/Textarea';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Switch, type SwitchProps } from './components/Switch';
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/Dialog';
export { Popover, PopoverContent, PopoverTrigger } from './components/Popover';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';

// Design Tokens
export * from './tokens';

// Themes
export * from './themes';

// Utilities
export { cn } from './utils/cn';
export * from './utils/validation';

// Accessibility
export * from './accessibility';
`;

    await fs.writeFile(indexPath, content);
  }

  private async updateImports(): Promise<void> {
    console.log('🔄 Updating import statements...');

    // Find all TypeScript/React files
    const files = await glob('client/src/**/*.{ts,tsx}', {
      ignore: [
        '**/node_modules/**',
        '**/.design-system-backup/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    });

    let updatedFiles = 0;
    const importMappings = this.createImportMappings();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        let updatedContent = content;
        let hasChanges = false;

        for (const [oldImport, newImport] of importMappings) {
          const regex = new RegExp(this.escapeRegex(oldImport), 'g');
          if (regex.test(updatedContent)) {
            updatedContent = updatedContent.replace(regex, newImport);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          await fs.writeFile(file, updatedContent);
          updatedFiles++;
        }
      } catch (error) {
        console.warn(`Failed to update imports in ${file}:`, error);
      }
    }

    console.log(`✅ Updated imports in ${updatedFiles} files`);
  }

  private createImportMappings(): Map<string, string> {
    const mappings = new Map<string, string>();

    // Button consolidation
    mappings.set(
      "from '@client/lib/design-system/interactive/button'",
      "from '@client/lib/design-system'"
    );
    mappings.set(
      "from '@client/lib/design-system/primitives/simple-button'",
      "from '@client/lib/design-system'"
    );
    mappings.set(
      "from '@client/lib/design-system/primitives/unified-button'",
      "from '@client/lib/design-system'"
    );

    // Input consolidation
    mappings.set(
      "from '@client/lib/design-system/interactive/input'",
      "from '@client/lib/design-system'"
    );

    // Other core components
    mappings.set(
      "from '@client/lib/design-system/interactive/card'",
      "from '@client/lib/design-system'"
    );
    mappings.set(
      "from '@client/lib/design-system/feedback/Alert'",
      "from '@client/lib/design-system'"
    );
    mappings.set(
      "from '@client/lib/design-system/feedback/Badge'",
      "from '@client/lib/design-system'"
    );

    return mappings;
  }

  private async validateConsolidation(): Promise<void> {
    console.log('🔍 Validating consolidation...');

    const componentsDir = `${this.designSystemDir}/components`;
    
    if (await this.fileExists(componentsDir)) {
      const components = await fs.readdir(componentsDir);
      console.log(`✅ Components directory created with ${components.length} components`);
    }

    const mainIndex = `${this.designSystemDir}/index.ts`;
    if (await this.fileExists(mainIndex)) {
      console.log('✅ Main index file created');
    }

    // Check for remaining duplicates
    const remainingFiles = await glob(`${this.designSystemDir}/**/*.{ts,tsx}`, {
      ignore: ['**/components/**', '**/tokens/**', '**/themes/**', '**/utils/**', '**/accessibility/**']
    });

    if (remainingFiles.length > 5) { // Allow for some legitimate files
      console.warn(`⚠️  ${remainingFiles.length} files remain outside organized structure`);
    } else {
      console.log('✅ File organization looks clean');
    }
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

// Run the emergency consolidation
const consolidation = new EmergencyDesignSystemConsolidation();
consolidation.run().catch(console.error);