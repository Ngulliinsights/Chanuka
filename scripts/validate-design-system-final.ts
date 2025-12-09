#!/usr/bin/env tsx

/**
 * Final Design System Validation Script
 * 
 * Comprehensive validation of the design system structure and exports
 * to ensure all components are properly accessible and integrated.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ComponentValidation {
  name: string;
  path: string;
  isExported: boolean;
  isAccessible: boolean;
  hasTypes: boolean;
  category: string;
  issues: string[];
}

class FinalDesignSystemValidator {
  private designSystemDir = 'client/src/shared/design-system';
  private sharedDir = 'client/src/shared';
  private components: ComponentValidation[] = [];
  private exportChain: Map<string, string[]> = new Map();

  async run(): Promise<void> {
    console.log('🎨 Final Design System Validation...\n');

    await this.analyzeComponents();
    await this.validateExportChain();
    await this.validateAccessibility();
    await this.generateFinalReport();
  }

  private async analyzeComponents(): Promise<void> {
    console.log('📊 Analyzing all design system components...');

    // Find all component files
    const componentFiles = await glob(`${this.designSystemDir}/**/*.{ts,tsx}`, {
      ignore: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/index.ts',
        '**/node_modules/**'
      ]
    });

    for (const file of componentFiles) {
      const component = await this.analyzeComponent(file);
      if (component) {
        this.components.push(component);
      }
    }

    console.log(`✅ Found ${this.components.length} components`);
  }

  private async analyzeComponent(filePath: string): Promise<ComponentValidation | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.designSystemDir, filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Extract exports
      const exports = this.extractExports(content);
      if (exports.length === 0) return null;

      const category = this.determineCategory(relativePath);
      const hasTypes = content.includes('interface ') || content.includes('type ');

      return {
        name: fileName,
        path: filePath,
        isExported: false, // Will be determined in validateExportChain
        isAccessible: false, // Will be determined in validateAccessibility
        hasTypes,
        category,
        issues: []
      };
    } catch (error) {
      console.warn(`Failed to analyze ${filePath}:`, error);
      return null;
    }
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    
    // Named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Export statements
    const exportStatementRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportStatementRegex.exec(content)) !== null) {
      const namedExports = match[1].split(',').map(e => e.trim().split(' as ')[0].trim());
      exports.push(...namedExports);
    }

    // Default exports
    if (content.includes('export default')) {
      exports.push('default');
    }

    return exports;
  }

  private determineCategory(relativePath: string): string {
    if (relativePath.includes('/interactive/')) return 'interactive';
    if (relativePath.includes('/feedback/')) return 'feedback';
    if (relativePath.includes('/media/')) return 'media';
    if (relativePath.includes('/typography/')) return 'typography';
    if (relativePath.includes('/primitives/')) return 'primitives';
    if (relativePath.includes('/tokens/')) return 'tokens';
    if (relativePath.includes('/themes/')) return 'themes';
    if (relativePath.includes('/utils/')) return 'utils';
    return 'other';
  }

  private async validateExportChain(): Promise<void> {
    console.log('🔗 Validating export chain...');

    // Build export chain map
    await this.buildExportChain();

    // Check if each component is properly exported
    for (const component of this.components) {
      const isExported = await this.isComponentExported(component);
      component.isExported = isExported;
      
      if (!isExported) {
        component.issues.push('Not exported through design system index');
      }
    }
  }

  private async buildExportChain(): Promise<void> {
    const indexFiles = await glob(`${this.designSystemDir}/**/index.ts`);
    
    for (const indexFile of indexFiles) {
      const content = await fs.readFile(indexFile, 'utf-8');
      const relativePath = path.relative(this.designSystemDir, indexFile);
      const exports = this.extractReExports(content);
      this.exportChain.set(relativePath, exports);
    }
  }

  private extractReExports(content: string): string[] {
    const reExports: string[] = [];
    
    // export * from './module'
    const reExportRegex = /export\s+\*\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = reExportRegex.exec(content)) !== null) {
      reExports.push(match[1]);
    }

    // export { ... } from './module'
    const namedReExportRegex = /export\s+\{[^}]+\}\s+from\s+['"`]([^'"`]+)['"`]/g;
    while ((match = namedReExportRegex.exec(content)) !== null) {
      reExports.push(match[1]);
    }

    return reExports;
  }

  private async isComponentExported(component: ComponentValidation): Promise<boolean> {
    const componentDir = path.dirname(component.path);
    const relativePath = path.relative(this.designSystemDir, componentDir);
    
    // Check if component's directory has an index that exports it
    const dirIndexPath = path.join(componentDir, 'index.ts');
    if (await this.fileExists(dirIndexPath)) {
      const content = await fs.readFile(dirIndexPath, 'utf-8');
      const componentFileName = path.basename(component.path, path.extname(component.path));
      
      if (content.includes(`from './${componentFileName}'`) || 
          content.includes(`'./${componentFileName}'`)) {
        
        // Check if this directory is exported by parent indices
        return this.isDirectoryExported(relativePath);
      }
    }

    return false;
  }

  private async isDirectoryExported(dirPath: string): Promise<boolean> {
    const pathParts = dirPath.split('/').filter(p => p);
    
    // Check each level of the export chain
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const currentPath = pathParts.slice(0, i + 1).join('/');
      const parentPath = i === 0 ? 'index.ts' : pathParts.slice(0, i).join('/') + '/index.ts';
      
      const exports = this.exportChain.get(parentPath) || [];
      const expectedExport = i === pathParts.length - 1 ? `./${pathParts[i]}` : `./${pathParts[i]}`;
      
      if (!exports.some(exp => exp === expectedExport || exp.includes(pathParts[i]))) {
        return false;
      }
    }

    return true;
  }

  private async validateAccessibility(): Promise<void> {
    console.log('🔍 Validating component accessibility...');

    // Test if components can be imported from the main design system export
    const mainIndexPath = path.join(this.designSystemDir, 'index.ts');
    if (await this.fileExists(mainIndexPath)) {
      const content = await fs.readFile(mainIndexPath, 'utf-8');
      
      for (const component of this.components) {
        // This is a simplified check - in a real scenario, you'd want to
        // actually try importing the component
        const isAccessible = component.isExported && this.isInMainExports(content, component);
        component.isAccessible = isAccessible;
        
        if (!isAccessible && component.isExported) {
          component.issues.push('Exported but not accessible from main index');
        }
      }
    }
  }

  private isInMainExports(mainIndexContent: string, component: ComponentValidation): boolean {
    // Check if the component's category is exported from main index
    return mainIndexContent.includes(`from './${component.category}'`) ||
           mainIndexContent.includes(`'./${component.category}'`);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateFinalReport(): void {
    console.log('\n📊 Final Design System Validation Report\n');
    console.log('='.repeat(60));

    // Summary statistics
    const totalComponents = this.components.length;
    const exportedComponents = this.components.filter(c => c.isExported).length;
    const accessibleComponents = this.components.filter(c => c.isAccessible).length;
    const componentsWithIssues = this.components.filter(c => c.issues.length > 0).length;

    console.log(`\n📈 Summary:`);
    console.log(`  Total Components: ${totalComponents}`);
    console.log(`  Properly Exported: ${exportedComponents} (${(exportedComponents/totalComponents*100).toFixed(1)}%)`);
    console.log(`  Accessible: ${accessibleComponents} (${(accessibleComponents/totalComponents*100).toFixed(1)}%)`);
    console.log(`  Components with Issues: ${componentsWithIssues}`);

    // Category breakdown
    console.log(`\n🏷️  Components by Category:`);
    const categoryStats = new Map<string, { total: number; exported: number; accessible: number }>();
    
    for (const component of this.components) {
      if (!categoryStats.has(component.category)) {
        categoryStats.set(component.category, { total: 0, exported: 0, accessible: 0 });
      }
      
      const stats = categoryStats.get(component.category)!;
      stats.total++;
      if (component.isExported) stats.exported++;
      if (component.isAccessible) stats.accessible++;
    }

    for (const [category, stats] of categoryStats) {
      const exportRate = (stats.exported / stats.total * 100).toFixed(1);
      const accessRate = (stats.accessible / stats.total * 100).toFixed(1);
      console.log(`  ${category}: ${stats.total} total, ${stats.exported} exported (${exportRate}%), ${stats.accessible} accessible (${accessRate}%)`);
    }

    // Issues breakdown
    if (componentsWithIssues > 0) {
      console.log(`\n🚨 Components with Issues:`);
      
      for (const component of this.components.filter(c => c.issues.length > 0)) {
        console.log(`\n  ❌ ${component.name} (${component.category})`);
        console.log(`     Path: ${component.path}`);
        component.issues.forEach(issue => {
          console.log(`     Issue: ${issue}`);
        });
      }
    }

    // Export chain validation
    console.log(`\n🔗 Export Chain Status:`);
    for (const [indexPath, exports] of this.exportChain) {
      console.log(`  ${indexPath}: ${exports.length} exports`);
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (exportedComponents < totalComponents) {
      console.log(`  • Add missing exports for ${totalComponents - exportedComponents} components`);
    }
    
    if (accessibleComponents < exportedComponents) {
      console.log(`  • Fix accessibility for ${exportedComponents - accessibleComponents} exported components`);
    }
    
    if (componentsWithIssues === 0) {
      console.log(`  ✅ All components are properly integrated!`);
    }

    console.log('\n' + '='.repeat(60));

    // Overall health score
    const healthScore = (accessibleComponents / totalComponents * 100);
    const healthStatus = healthScore >= 90 ? '🟢 EXCELLENT' : 
                        healthScore >= 75 ? '🟡 GOOD' : 
                        healthScore >= 50 ? '🟠 NEEDS WORK' : '🔴 CRITICAL';
    
    console.log(`\n🏥 Design System Health: ${healthScore.toFixed(1)}% ${healthStatus}`);
  }
}

// Run the validator
const validator = new FinalDesignSystemValidator();
validator.run().catch(console.error);