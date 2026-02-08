/**
 * Fix Undefined Safety Issues (TS18048)
 * 
 * Fixes undefined safety errors where values are possibly undefined
 */

import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';

class UndefinedSafetyFixer {
  private project: Project;
  private fixedCount = 0;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.resolve(__dirname, '../../client/tsconfig.json')
    });
  }

  async execute(): Promise<void> {
    console.log('🔧 Fixing Undefined Safety Issues\n');

    // Fix specific files with known errors
    await this.fixCoreMonitoring();
    await this.fixSecurityMonitoring();
    await this.fixConflictNetworkVisualization();

    // Save all changes
    await this.project.save();

    console.log(`\n✅ Fixed ${this.fixedCount} undefined safety issues`);
  }

  /**
   * Fix core-monitoring.ts
   * Error: metrics.duration and metrics.operation are possibly undefined
   */
  private async fixCoreMonitoring(): Promise<void> {
    const filePath = path.resolve(__dirname, '../../client/src/core/core-monitoring.ts');
    const sourceFile = this.project.getSourceFile(filePath);
    
    if (!sourceFile) {
      console.log(`⚠ File not found: ${filePath}`);
      return;
    }

    console.log(`Fixing ${path.basename(filePath)}...`);

    // Find property access expressions that might be undefined
    const propertyAccessExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    
    for (const expr of propertyAccessExpressions) {
      const exprText = expr.getText();
      
      // Check for metrics.duration
      if (exprText === 'metrics.duration' && !exprText.includes('?.')) {
        // Add optional chaining or undefined check
        const parent = expr.getParent();
        if (parent) {
          // Check if it's in a conditional or already has a check
          const grandParent = parent.getParent();
          if (grandParent && !grandParent.getText().includes('if')) {
            // Replace with optional chaining
            expr.replaceWithText('metrics.duration ?? 0');
            this.fixedCount++;
          }
        }
      }
      
      // Check for metrics.operation
      if (exprText === 'metrics.operation' && !exprText.includes('?.')) {
        const parent = expr.getParent();
        if (parent) {
          const grandParent = parent.getParent();
          if (grandParent && !grandParent.getText().includes('if')) {
            // Replace with optional chaining
            expr.replaceWithText('metrics.operation ?? "unknown"');
            this.fixedCount++;
          }
        }
      }
      
      // Check for frequency properties
      if ((exprText === 'a.frequency' || exprText === 'b.frequency') && !exprText.includes('?.')) {
        const parent = expr.getParent();
        if (parent) {
          // Replace with optional chaining
          expr.replaceWithText(`${exprText} ?? 0`);
          this.fixedCount++;
        }
      }
    }
  }

  /**
   * Fix security-monitoring.ts
   * Error: metrics.duration and metrics.operation are possibly undefined
   */
  private async fixSecurityMonitoring(): Promise<void> {
    const filePath = path.resolve(__dirname, '../../client/src/core/security/security-monitoring.ts');
    const sourceFile = this.project.getSourceFile(filePath);
    
    if (!sourceFile) {
      console.log(`⚠ File not found: ${filePath}`);
      return;
    }

    console.log(`Fixing ${path.basename(filePath)}...`);

    // Find property access expressions that might be undefined
    const propertyAccessExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    
    for (const expr of propertyAccessExpressions) {
      const exprText = expr.getText();
      
      // Check for metrics.duration
      if (exprText === 'metrics.duration' && !exprText.includes('?.')) {
        const parent = expr.getParent();
        if (parent) {
          const grandParent = parent.getParent();
          if (grandParent && !grandParent.getText().includes('if')) {
            expr.replaceWithText('metrics.duration ?? 0');
            this.fixedCount++;
          }
        }
      }
      
      // Check for metrics.operation
      if (exprText === 'metrics.operation' && !exprText.includes('?.')) {
        const parent = expr.getParent();
        if (parent) {
          const grandParent = parent.getParent();
          if (grandParent && !grandParent.getText().includes('if')) {
            expr.replaceWithText('metrics.operation ?? "unknown"');
            this.fixedCount++;
          }
        }
      }
      
      // Check for frequency properties
      if ((exprText === 'a.frequency' || exprText === 'b.frequency') && !exprText.includes('?.')) {
        const parent = expr.getParent();
        if (parent) {
          expr.replaceWithText(`${exprText} ?? 0`);
          this.fixedCount++;
        }
      }
    }
  }

  /**
   * Fix ConflictNetworkVisualization.tsx
   * Error: d.size is possibly undefined
   */
  private async fixConflictNetworkVisualization(): Promise<void> {
    const filePath = path.resolve(__dirname, '../../client/src/features/bills/ui/analysis/conflict-of-interest/ConflictNetworkVisualization.tsx');
    const sourceFile = this.project.getSourceFile(filePath);
    
    if (!sourceFile) {
      console.log(`⚠ File not found: ${filePath}`);
      return;
    }

    console.log(`Fixing ${path.basename(filePath)}...`);

    // Find property access expressions that might be undefined
    const propertyAccessExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
    
    for (const expr of propertyAccessExpressions) {
      const exprText = expr.getText();
      
      // Check for d.size
      if (exprText === 'd.size' && !exprText.includes('?.')) {
        const parent = expr.getParent();
        if (parent) {
          // Replace with optional chaining or default value
          expr.replaceWithText('d.size ?? 0');
          this.fixedCount++;
        }
      }
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const fixer = new UndefinedSafetyFixer();
  fixer.execute()
    .then(() => {
      console.log('\n✅ Undefined safety fixes completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

export { UndefinedSafetyFixer };
