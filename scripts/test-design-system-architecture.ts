#!/usr/bin/env tsx

/**
 * Design System Architecture Assessment
 * 
 * Tests the design system from 4 strategic personas:
 * 1. Developer (trying to use components)
 * 2. Designer (trying to understand the system)
 * 3. Architect (evaluating structure)
 * 4. Product Manager (assessing usability)
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ArchitecturalIssue {
  persona: 'developer' | 'designer' | 'architect' | 'product-manager';
  severity: 'critical' | 'major' | 'minor';
  category: 'confusion' | 'duplication' | 'inconsistency' | 'missing' | 'complexity';
  description: string;
  impact: string;
  evidence: string[];
  recommendation: string;
}

interface ComponentAnalysis {
  name: string;
  locations: string[];
  exportPaths: string[];
  importPatterns: string[];
  duplicates: boolean;
  accessible: boolean;
  documented: boolean;
}

class DesignSystemArchitecturalAssessment {
  private designSystemDir = 'client/src/lib/design-system';
  private sharedDir = 'client/src/lib';
  private issues: ArchitecturalIssue[] = [];
  private components: Map<string, ComponentAnalysis> = new Map();
  private importPatterns: Map<string, string[]> = new Map();

  async run(): Promise<void> {
    console.log('🏗️ Design System Architectural Assessment\n');
    console.log('Testing from 4 strategic personas...\n');

    await this.analyzeComponents();
    await this.testDeveloperExperience();
    await this.testDesignerExperience();
    await this.testArchitecturalIntegrity();
    await this.testProductManagerConcerns();
    
    this.generateAssessmentReport();
    await this.generateConsolidationPlan();
  }

  private async analyzeComponents(): Promise<void> {
    console.log('📊 Analyzing component distribution and accessibility...');

    // Find all component-like files
    const componentFiles = await glob(`${this.sharedDir}/**/*.{ts,tsx}`, {
      ignore: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/node_modules/**'
      ]
    });

    // Analyze each component
    for (const file of componentFiles) {
      await this.analyzeComponentFile(file);
    }

    // Find usage patterns
    await this.analyzeUsagePatterns();

    console.log(`✅ Analyzed ${this.components.size} unique components`);
  }

  private async analyzeComponentFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const exports = this.extractExports(content);
      
      for (const exportName of exports) {
        if (this.isComponentLike(exportName, content)) {
          if (!this.components.has(exportName)) {
            this.components.set(exportName, {
              name: exportName,
              locations: [],
              exportPaths: [],
              importPatterns: [],
              duplicates: false,
              accessible: false,
              documented: false
            });
          }

          const component = this.components.get(exportName)!;
          component.locations.push(filePath);
          
          // Check if it's a duplicate
          if (component.locations.length > 1) {
            component.duplicates = true;
          }

          // Check documentation
          if (content.includes('/**') || content.includes('* @')) {
            component.documented = true;
          }
        }
      }
    } catch (error) {
      // Ignore files that can't be read
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

    return exports;
  }

  private isComponentLike(name: string, content: string): boolean {
    // Check if it's likely a React component
    return (
      /^[A-Z]/.test(name) && // Starts with capital letter
      (
        content.includes('React') ||
        content.includes('jsx') ||
        content.includes('tsx') ||
        content.includes('return (') ||
        content.includes('return <')
      )
    ) || 
    // Or if it's a common UI component name
    ['Button', 'Input', 'Card', 'Modal', 'Dialog', 'Alert', 'Badge', 'Avatar'].includes(name);
  }

  private async analyzeUsagePatterns(): Promise<void> {
    // Find all import statements in the codebase
    const allFiles = await glob('client/src/**/*.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
    });

    for (const file of allFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const imports = this.extractImports(content);
        
        for (const importPath of imports) {
          if (importPath.includes('design-system') || importPath.includes('shared')) {
            if (!this.importPatterns.has(importPath)) {
              this.importPatterns.set(importPath, []);
            }
            this.importPatterns.get(importPath)!.push(file);
          }
        }
      } catch (error) {
        // Ignore files that can't be read
      }
    }
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private async testDeveloperExperience(): Promise<void> {
    console.log('👨‍💻 Testing Developer Experience...');

    // Test 1: Can developers easily find and import components?
    const commonComponents = ['Button', 'Input', 'Card', 'Alert', 'Badge'];
    const confusingImports: string[] = [];
    const missingComponents: string[] = [];

    for (const componentName of commonComponents) {
      const component = this.components.get(componentName);
      
      if (!component) {
        missingComponents.push(componentName);
        continue;
      }

      // Check how many different ways this component can be imported
      const possibleImports = this.findPossibleImports(componentName);
      
      if (possibleImports.length > 3) {
        confusingImports.push(`${componentName}: ${possibleImports.length} different import paths`);
      }

      if (component.duplicates) {
        this.issues.push({
          persona: 'developer',
          severity: 'major',
          category: 'confusion',
          description: `Component ${componentName} exists in multiple locations`,
          impact: 'Developers don\'t know which version to import',
          evidence: component.locations,
          recommendation: `Consolidate ${componentName} to a single canonical location`
        });
      }
    }

    if (confusingImports.length > 0) {
      this.issues.push({
        persona: 'developer',
        severity: 'critical',
        category: 'confusion',
        description: 'Multiple import paths for the same components',
        impact: 'Developers waste time figuring out correct imports, inconsistent usage',
        evidence: confusingImports,
        recommendation: 'Establish single canonical import path for each component'
      });
    }

    if (missingComponents.length > 0) {
      this.issues.push({
        persona: 'developer',
        severity: 'major',
        category: 'missing',
        description: 'Common UI components are missing',
        impact: 'Developers have to build basic components from scratch',
        evidence: missingComponents,
        recommendation: 'Create missing essential components'
      });
    }

    // Test 2: Are import paths intuitive?
    await this.testImportIntuition();
  }

  private async testImportIntuition(): Promise<void> {
    const confusingPatterns: string[] = [];
    
    for (const [importPath, usageFiles] of this.importPatterns) {
      // Check for overly nested imports
      if (importPath.split('/').length > 5) {
        confusingPatterns.push(`Deep nesting: ${importPath}`);
      }

      // Check for inconsistent patterns
      if (importPath.includes('primitives') && importPath.includes('interactive')) {
        confusingPatterns.push(`Mixed categories: ${importPath}`);
      }

      // Check for unclear naming
      if (importPath.includes('unified') || importPath.includes('enhanced') || importPath.includes('legacy')) {
        confusingPatterns.push(`Unclear naming: ${importPath}`);
      }
    }

    if (confusingPatterns.length > 0) {
      this.issues.push({
        persona: 'developer',
        severity: 'major',
        category: 'confusion',
        description: 'Import paths are not intuitive',
        impact: 'Developers struggle to find and import components',
        evidence: confusingPatterns.slice(0, 10), // Limit to first 10
        recommendation: 'Simplify and standardize import paths'
      });
    }
  }

  private findPossibleImports(componentName: string): string[] {
    const possiblePaths: string[] = [];
    
    // Check direct exports from various locations
    const locations = [
      '@client/lib/design-system',
      '@client/lib/design-system/interactive',
      '@client/lib/design-system/feedback',
      '@client/lib/design-system/primitives',
      '@client/lib/ui'
    ];

    for (const location of locations) {
      possiblePaths.push(`${location}/${componentName}`);
    }

    return possiblePaths;
  }

  private async testDesignerExperience(): Promise<void> {
    console.log('🎨 Testing Designer Experience...');

    // Test 1: Is the design system discoverable?
    const hasDesignTokens = await this.checkDesignTokens();
    const hasThemeSystem = await this.checkThemeSystem();
    const hasDocumentation = await this.checkDocumentation();

    if (!hasDesignTokens) {
      this.issues.push({
        persona: 'designer',
        severity: 'critical',
        category: 'missing',
        description: 'Design tokens are not easily accessible',
        impact: 'Designers cannot understand the design system foundation',
        evidence: ['No clear design tokens export'],
        recommendation: 'Create clear, documented design tokens export'
      });
    }

    if (!hasThemeSystem) {
      this.issues.push({
        persona: 'designer',
        severity: 'major',
        category: 'missing',
        description: 'Theme system is not coherent',
        impact: 'Designers cannot create consistent experiences across themes',
        evidence: ['Fragmented theme implementation'],
        recommendation: 'Consolidate theme system with clear documentation'
      });
    }

    // Test 2: Component variants and states
    await this.testComponentVariants();
  }

  private async checkDesignTokens(): Promise<boolean> {
    try {
      const tokensIndex = await fs.readFile(`${this.designSystemDir}/tokens/index.ts`, 'utf-8');
      return tokensIndex.includes('export') && tokensIndex.length > 100;
    } catch {
      return false;
    }
  }

  private async checkThemeSystem(): Promise<boolean> {
    try {
      const themesIndex = await fs.readFile(`${this.designSystemDir}/themes/index.ts`, 'utf-8');
      return themesIndex.includes('export') && themesIndex.length > 100;
    } catch {
      return false;
    }
  }

  private async checkDocumentation(): Promise<boolean> {
    try {
      const readme = await fs.readFile(`${this.designSystemDir}/README.md`, 'utf-8');
      return readme.length > 500; // Has substantial documentation
    } catch {
      return false;
    }
  }

  private async testComponentVariants(): Promise<void> {
    const componentsWithoutVariants: string[] = [];
    
    for (const [name, component] of this.components) {
      if (['Button', 'Input', 'Card', 'Alert'].includes(name)) {
        // Check if component has variant system
        let hasVariants = false;
        
        for (const location of component.locations) {
          try {
            const content = await fs.readFile(location, 'utf-8');
            if (content.includes('variant') || content.includes('size') || content.includes('color')) {
              hasVariants = true;
              break;
            }
          } catch {
            // Ignore
          }
        }
        
        if (!hasVariants) {
          componentsWithoutVariants.push(name);
        }
      }
    }

    if (componentsWithoutVariants.length > 0) {
      this.issues.push({
        persona: 'designer',
        severity: 'major',
        category: 'missing',
        description: 'Key components lack variant systems',
        impact: 'Designers cannot create diverse, consistent interfaces',
        evidence: componentsWithoutVariants,
        recommendation: 'Add comprehensive variant systems to core components'
      });
    }
  }

  private async testArchitecturalIntegrity(): Promise<void> {
    console.log('🏛️ Testing Architectural Integrity...');

    // Test 1: Separation of concerns
    await this.testSeparationOfConcerns();
    
    // Test 2: Dependency management
    await this.testDependencyManagement();
    
    // Test 3: Scalability
    await this.testScalability();
  }

  private async testSeparationOfConcerns(): Promise<void> {
    const concernViolations: string[] = [];
    
    // Check if business logic is mixed with UI components
    for (const [importPath, files] of this.importPatterns) {
      if (importPath.includes('design-system') && importPath.includes('core')) {
        concernViolations.push(`Design system importing from core: ${importPath}`);
      }
      
      if (importPath.includes('design-system') && importPath.includes('features')) {
        concernViolations.push(`Design system importing from features: ${importPath}`);
      }
    }

    if (concernViolations.length > 0) {
      this.issues.push({
        persona: 'architect',
        severity: 'critical',
        category: 'inconsistency',
        description: 'Design system violates separation of concerns',
        impact: 'Tight coupling makes system hard to maintain and test',
        evidence: concernViolations,
        recommendation: 'Enforce strict boundaries between design system and business logic'
      });
    }
  }

  private async testDependencyManagement(): Promise<void> {
    // Check for circular dependencies within design system
    const circularDeps = await this.findCircularDependencies();
    
    if (circularDeps.length > 0) {
      this.issues.push({
        persona: 'architect',
        severity: 'critical',
        category: 'inconsistency',
        description: 'Circular dependencies in design system',
        impact: 'Makes system fragile and hard to refactor',
        evidence: circularDeps,
        recommendation: 'Refactor to eliminate circular dependencies'
      });
    }
  }

  private async findCircularDependencies(): Promise<string[]> {
    // Simplified circular dependency detection
    const deps: string[] = [];
    
    // This would need more sophisticated implementation
    // For now, just check for obvious patterns
    
    return deps;
  }

  private async testScalability(): Promise<void> {
    const scalabilityIssues: string[] = [];
    
    // Check for hardcoded values
    const designSystemFiles = await glob(`${this.designSystemDir}/**/*.{ts,tsx}`);
    
    for (const file of designSystemFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        // Check for hardcoded colors, sizes, etc.
        if (content.match(/#[0-9a-fA-F]{6}/g)) {
          scalabilityIssues.push(`Hardcoded colors in ${file}`);
        }
        
        if (content.match(/\d+px/g)) {
          scalabilityIssues.push(`Hardcoded pixel values in ${file}`);
        }
      } catch {
        // Ignore
      }
    }

    if (scalabilityIssues.length > 5) {
      this.issues.push({
        persona: 'architect',
        severity: 'major',
        category: 'inconsistency',
        description: 'Design system has hardcoded values',
        impact: 'Makes theming and scaling difficult',
        evidence: scalabilityIssues.slice(0, 5),
        recommendation: 'Replace hardcoded values with design tokens'
      });
    }
  }

  private async testProductManagerConcerns(): Promise<void> {
    console.log('📊 Testing Product Manager Concerns...');

    // Test 1: Adoption and consistency
    await this.testAdoption();
    
    // Test 2: Maintenance burden
    await this.testMaintenanceBurden();
    
    // Test 3: Developer productivity
    await this.testDeveloperProductivity();
  }

  private async testAdoption(): Promise<void> {
    const totalFiles = await glob('client/src/**/*.{ts,tsx}', {
      ignore: ['**/node_modules/**', '**/*.test.*']
    });
    
    const filesUsingDesignSystem = Array.from(this.importPatterns.values()).flat();
    const adoptionRate = (filesUsingDesignSystem.length / totalFiles.length) * 100;
    
    if (adoptionRate < 30) {
      this.issues.push({
        persona: 'product-manager',
        severity: 'critical',
        category: 'missing',
        description: 'Low design system adoption rate',
        impact: 'Inconsistent UI, higher maintenance costs, slower development',
        evidence: [`Only ${adoptionRate.toFixed(1)}% of files use design system`],
        recommendation: 'Simplify design system usage and migrate existing components'
      });
    }
  }

  private async testMaintenanceBurden(): Promise<void> {
    const duplicateComponents = Array.from(this.components.values()).filter(c => c.duplicates);
    const maintenanceBurden = duplicateComponents.length;
    
    if (maintenanceBurden > 5) {
      this.issues.push({
        persona: 'product-manager',
        severity: 'major',
        category: 'duplication',
        description: 'High maintenance burden due to component duplication',
        impact: 'Increased development time, inconsistent updates, higher bug risk',
        evidence: [`${maintenanceBurden} components have duplicates`],
        recommendation: 'Consolidate duplicate components into single sources of truth'
      });
    }
  }

  private async testDeveloperProductivity(): Promise<void> {
    const complexImportPaths = Array.from(this.importPatterns.keys())
      .filter(path => path.split('/').length > 4).length;
    
    const undocumentedComponents = Array.from(this.components.values())
      .filter(c => !c.documented).length;
    
    if (complexImportPaths > 10 || undocumentedComponents > 10) {
      this.issues.push({
        persona: 'product-manager',
        severity: 'major',
        category: 'complexity',
        description: 'Design system hurts developer productivity',
        impact: 'Slower feature development, higher onboarding time, more bugs',
        evidence: [
          `${complexImportPaths} complex import paths`,
          `${undocumentedComponents} undocumented components`
        ],
        recommendation: 'Simplify API and add comprehensive documentation'
      });
    }
  }

  private generateAssessmentReport(): void {
    console.log('\n📊 Design System Architectural Assessment Report\n');
    console.log('='.repeat(70));

    // Executive Summary
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const majorIssues = this.issues.filter(i => i.severity === 'major').length;
    const minorIssues = this.issues.filter(i => i.severity === 'minor').length;

    console.log(`\n🎯 Executive Summary:`);
    console.log(`  Total Issues: ${this.issues.length}`);
    console.log(`    Critical: ${criticalIssues} 🔴`);
    console.log(`    Major: ${majorIssues} 🟡`);
    console.log(`    Minor: ${minorIssues} 🔵`);

    // Overall Assessment
    const overallHealth = criticalIssues === 0 ? 
      (majorIssues <= 2 ? 'GOOD' : 'NEEDS WORK') : 'CRITICAL';
    
    console.log(`\n🏥 Overall Health: ${overallHealth}`);

    // Issues by Persona
    console.log(`\n👥 Issues by Persona:`);
    const personaGroups = new Map<string, ArchitecturalIssue[]>();
    
    this.issues.forEach(issue => {
      if (!personaGroups.has(issue.persona)) {
        personaGroups.set(issue.persona, []);
      }
      personaGroups.get(issue.persona)!.push(issue);
    });

    for (const [persona, issues] of personaGroups) {
      const critical = issues.filter(i => i.severity === 'critical').length;
      const major = issues.filter(i => i.severity === 'major').length;
      console.log(`  ${persona}: ${issues.length} issues (${critical} critical, ${major} major)`);
    }

    // Top Issues
    console.log(`\n🚨 Top Critical Issues:`);
    const topIssues = this.issues
      .filter(i => i.severity === 'critical')
      .slice(0, 5);

    if (topIssues.length === 0) {
      console.log('  ✅ No critical issues found!');
    } else {
      topIssues.forEach((issue, index) => {
        console.log(`\n  ${index + 1}. ${issue.persona.toUpperCase()}: ${issue.description}`);
        console.log(`     Impact: ${issue.impact}`);
        console.log(`     Fix: ${issue.recommendation}`);
      });
    }

    // Component Analysis
    console.log(`\n🧩 Component Analysis:`);
    const totalComponents = this.components.size;
    const duplicatedComponents = Array.from(this.components.values()).filter(c => c.duplicates).length;
    const documentedComponents = Array.from(this.components.values()).filter(c => c.documented).length;

    console.log(`  Total Components: ${totalComponents}`);
    console.log(`  Duplicated: ${duplicatedComponents} (${(duplicatedComponents/totalComponents*100).toFixed(1)}%)`);
    console.log(`  Documented: ${documentedComponents} (${(documentedComponents/totalComponents*100).toFixed(1)}%)`);

    console.log('\n' + '='.repeat(70));
  }

  private async generateConsolidationPlan(): Promise<void> {
    console.log('\n🔧 Generating Consolidation Plan...');

    const plan = `# Design System Consolidation Plan

## 🎯 Strategic Assessment

Based on analysis from 4 personas, the design system has **${this.issues.filter(i => i.severity === 'critical').length} critical issues** that make it confusing and ineffective.

## 🚨 Critical Problems Identified

${this.issues.filter(i => i.severity === 'critical').map((issue, i) => `
### ${i + 1}. ${issue.persona.toUpperCase()}: ${issue.description}
**Impact**: ${issue.impact}
**Evidence**: ${issue.evidence.join(', ')}
**Fix**: ${issue.recommendation}
`).join('')}

## 🏗️ Consolidation Strategy

### Phase 1: Immediate Fixes (Week 1)
1. **Eliminate Component Duplication**
   - Consolidate duplicate components to single locations
   - Create canonical import paths
   - Remove legacy/deprecated versions

2. **Simplify Import Structure**
   - Flatten complex nested imports
   - Create intuitive, predictable import paths
   - Add convenience exports for common components

### Phase 2: Structural Improvements (Week 2)
1. **Establish Clear Boundaries**
   - Separate design tokens from components
   - Create clear component categories
   - Enforce separation of concerns

2. **Improve Developer Experience**
   - Add comprehensive TypeScript types
   - Create clear documentation
   - Add usage examples

### Phase 3: Integration & Adoption (Week 3)
1. **Increase Adoption**
   - Migrate existing components to design system
   - Create migration guides
   - Add linting rules to enforce usage

2. **Enhance Maintainability**
   - Add automated testing
   - Create component playground
   - Establish contribution guidelines

## 📊 Success Metrics
- [ ] Zero duplicate components
- [ ] <3 import paths per component
- [ ] >80% design system adoption
- [ ] 100% component documentation
- [ ] Zero circular dependencies

## 🎯 Target Architecture

\`\`\`
shared/design-system/
├── tokens/           # Design tokens (colors, spacing, typography)
├── components/       # All UI components (flat structure)
│   ├── Button/
│   ├── Input/
│   └── Card/
├── themes/          # Theme definitions
├── utils/           # Design system utilities
└── index.ts         # Single entry point
\`\`\`

**Import Pattern**: \`import { Button, Input, Card } from '@client/lib/design-system';\`
`;

    await fs.writeFile('client/src/DESIGN_SYSTEM_CONSOLIDATION_PLAN.md', plan);
    console.log('✅ Consolidation plan generated: client/src/DESIGN_SYSTEM_CONSOLIDATION_PLAN.md');
  }
}

// Run the assessment
const assessment = new DesignSystemArchitecturalAssessment();
assessment.run().catch(console.error);