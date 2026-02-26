#!/usr/bin/env tsx
/**
 * Infrastructure Analysis Script
 * 
 * This script uses ts-morph to analyze the client/src/infrastructure/ directory
 * and generate reports on module structure, dependencies, and circular dependencies.
 */

import { Project } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

interface ModuleInfo {
  name: string;
  path: string;
  exports: string[];
  imports: Array<{ module: string; specifiers: string[] }>;
  hasIndex: boolean;
  hasTypes: boolean;
  hasReadme: boolean;
  hasTests: boolean;
}

interface AnalysisReport {
  totalModules: number;
  modules: ModuleInfo[];
  circularDependencies: string[][];
  timestamp: string;
}

async function analyzeInfrastructure(): Promise<AnalysisReport> {
  console.log('🔍 Analyzing client/src/infrastructure/ directory...\n');

  // Initialize ts-morph project
  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), 'client/tsconfig.json'),
  });

  const infrastructurePath = path.resolve(process.cwd(), 'client/src/infrastructure');
  
  if (!fs.existsSync(infrastructurePath)) {
    console.error('❌ Infrastructure directory not found:', infrastructurePath);
    process.exit(1);
  }

  // Get all subdirectories (modules) in infrastructure
  const moduleDirs = fs.readdirSync(infrastructurePath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`📦 Found ${moduleDirs.length} modules:\n`);

  const modules: ModuleInfo[] = [];

  for (const moduleName of moduleDirs) {
    const modulePath = path.join(infrastructurePath, moduleName);
    
    // Check for standard structure
    const hasIndex = fs.existsSync(path.join(modulePath, 'index.ts'));
    const hasTypes = fs.existsSync(path.join(modulePath, 'types.ts')) || 
                     fs.existsSync(path.join(modulePath, 'types'));
    const hasReadme = fs.existsSync(path.join(modulePath, 'README.md'));
    const hasTests = fs.existsSync(path.join(modulePath, '__tests__'));

    // Analyze exports and imports
    const exports: string[] = [];
    const imports: Array<{ module: string; specifiers: string[] }> = [];

    if (hasIndex) {
      const indexFile = project.addSourceFileAtPath(path.join(modulePath, 'index.ts'));
      
      // Get exports
      indexFile.getExportDeclarations().forEach(exportDecl => {
        const moduleSpecifier = exportDecl.getModuleSpecifierValue();
        if (moduleSpecifier) {
          exports.push(moduleSpecifier);
        }
      });

      indexFile.getExportedDeclarations().forEach((declarations, name) => {
        if (name !== 'default') {
          exports.push(name);
        }
      });

      // Get imports
      indexFile.getImportDeclarations().forEach(importDecl => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        const specifiers = importDecl.getNamedImports().map(ni => ni.getName());
        
        if (moduleSpecifier && !moduleSpecifier.startsWith('.')) {
          imports.push({ module: moduleSpecifier, specifiers });
        }
      });
    }

    const moduleInfo: ModuleInfo = {
      name: moduleName,
      path: modulePath,
      exports,
      imports,
      hasIndex,
      hasTypes,
      hasReadme,
      hasTests,
    };

    modules.push(moduleInfo);

    // Print module info
    console.log(`  📁 ${moduleName}`);
    console.log(`     Index: ${hasIndex ? '✅' : '❌'}`);
    console.log(`     Types: ${hasTypes ? '✅' : '❌'}`);
    console.log(`     README: ${hasReadme ? '✅' : '❌'}`);
    console.log(`     Tests: ${hasTests ? '✅' : '❌'}`);
    console.log(`     Exports: ${exports.length}`);
    console.log(`     Imports: ${imports.length}\n`);
  }

  const report: AnalysisReport = {
    totalModules: modules.length,
    modules,
    circularDependencies: [], // Will be populated by madge
    timestamp: new Date().toISOString(),
  };

  // Save report
  const reportPath = path.resolve(process.cwd(), 'analysis-results/infrastructure-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n✅ Analysis complete! Report saved to: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total modules: ${report.totalModules}`);
  console.log(`   Modules with index.ts: ${modules.filter(m => m.hasIndex).length}`);
  console.log(`   Modules with types: ${modules.filter(m => m.hasTypes).length}`);
  console.log(`   Modules with README: ${modules.filter(m => m.hasReadme).length}`);
  console.log(`   Modules with tests: ${modules.filter(m => m.hasTests).length}`);

  return report;
}

// Run analysis
analyzeInfrastructure().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
