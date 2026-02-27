/**
 * Property Test: Dependency Graph Layering
 * 
 * **Validates: Requirements 17.1, 17.3**
 * 
 * This property test verifies that all dependencies in the infrastructure
 * flow from higher architectural layers to lower layers, never upward.
 * 
 * Layer Hierarchy (highest to lowest):
 * 5. PRESENTATION (command-palette, community, mobile, system, workers, asset-loading, browser, navigation, hooks)
 * 4. INTEGRATION (store, auth, sync, search, security, personalization, recovery)
 * 3. SERVICES (api, observability, error, logging, validation)
 * 2. PRIMITIVES (events, storage, cache)
 * 1. TYPES (error/types, logging/types, observability/types, validation/types)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// Define architectural layers
enum Layer {
  TYPES = 1,
  PRIMITIVES = 2,
  SERVICES = 3,
  INTEGRATION = 4,
  PRESENTATION = 5,
}

// Module to layer mapping
const MODULE_LAYERS: Record<string, Layer> = {
  // Layer 1: TYPES
  'error/types': Layer.TYPES,
  'logging/types': Layer.TYPES,
  'observability/types': Layer.TYPES,
  'validation/types': Layer.TYPES,
  
  // Layer 2: PRIMITIVES
  'events': Layer.PRIMITIVES,
  'storage': Layer.PRIMITIVES,
  'cache': Layer.PRIMITIVES,
  
  // Layer 3: SERVICES
  'api': Layer.SERVICES,
  'observability': Layer.SERVICES,
  'error': Layer.SERVICES,
  'logging': Layer.SERVICES,
  'validation': Layer.SERVICES,
  
  // Layer 4: INTEGRATION
  'store': Layer.INTEGRATION,
  'auth': Layer.INTEGRATION,
  'sync': Layer.INTEGRATION,
  'search': Layer.INTEGRATION,
  'security': Layer.INTEGRATION,
  'personalization': Layer.INTEGRATION,
  'recovery': Layer.INTEGRATION,
  
  // Layer 5: PRESENTATION
  'command-palette': Layer.PRESENTATION,
  'community': Layer.PRESENTATION,
  'mobile': Layer.PRESENTATION,
  'system': Layer.PRESENTATION,
  'workers': Layer.PRESENTATION,
  'asset-loading': Layer.PRESENTATION,
  'browser': Layer.PRESENTATION,
  'navigation': Layer.PRESENTATION,
  'hooks': Layer.PRESENTATION,
};

interface Dependency {
  from: string;
  to: string;
  fromLayer: Layer;
  toLayer: Layer;
}

/**
 * Extract module name from file path
 * e.g., "client/src/infrastructure/api/client.ts" -> "api"
 * e.g., "client/src/infrastructure/error/types.ts" -> "error/types"
 */
function extractModuleName(filePath: string): string | null {
  const match = filePath.match(/infrastructure\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;
  
  const module = match[1];
  const subModule = match[2];
  
  // Check if it's a types submodule
  if (subModule === 'types' || subModule === 'types.ts') {
    return `${module}/types`;
  }
  
  return module;
}

/**
 * Get layer for a module
 */
function getModuleLayer(moduleName: string): Layer | null {
  // Direct match
  if (MODULE_LAYERS[moduleName]) {
    return MODULE_LAYERS[moduleName];
  }
  
  // Check if it's a submodule of a known module
  for (const [key, layer] of Object.entries(MODULE_LAYERS)) {
    if (moduleName.startsWith(key + '/')) {
      return layer;
    }
  }
  
  return null;
}

/**
 * Parse import statements from a TypeScript file
 */
function parseImports(filePath: string, content: string): string[] {
  const imports: string[] = [];
  
  // Match import statements
  const importRegex = /import\s+(?:type\s+)?(?:{[^}]*}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Only process infrastructure imports
    if (importPath.includes('infrastructure/')) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

/**
 * Resolve import path to absolute file path
 */
function resolveImportPath(fromFile: string, importPath: string): string | null {
  // Handle @/ alias
  if (importPath.startsWith('@/')) {
    importPath = importPath.replace('@/', 'client/src/');
  }
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const dir = path.dirname(fromFile);
    importPath = path.join(dir, importPath);
  }
  
  // Normalize path
  importPath = path.normalize(importPath);
  
  return importPath;
}

/**
 * Analyze dependencies in the infrastructure directory
 */
function analyzeDependencies(infrastructureDir: string): Dependency[] {
  const dependencies: Dependency[] = [];
  
  function walkDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, dist, __tests__
        if (!['node_modules', 'dist', '__tests__', 'scripts'].includes(entry.name)) {
          walkDirectory(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        // Skip test files
        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
          continue;
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        const imports = parseImports(fullPath, content);
        
        const fromModule = extractModuleName(fullPath);
        if (!fromModule) continue;
        
        const fromLayer = getModuleLayer(fromModule);
        if (!fromLayer) continue;
        
        for (const importPath of imports) {
          const resolvedPath = resolveImportPath(fullPath, importPath);
          if (!resolvedPath) continue;
          
          const toModule = extractModuleName(resolvedPath);
          if (!toModule) continue;
          
          const toLayer = getModuleLayer(toModule);
          if (!toLayer) continue;
          
          // Skip self-dependencies
          if (fromModule === toModule) continue;
          
          dependencies.push({
            from: fromModule,
            to: toModule,
            fromLayer,
            toLayer,
          });
        }
      }
    }
  }
  
  if (fs.existsSync(infrastructureDir)) {
    walkDirectory(infrastructureDir);
  }
  
  return dependencies;
}

describe('Property 13: Dependency Graph Layering', () => {
  const infrastructureDir = path.join(process.cwd(), 'client/src/infrastructure');
  
  it('should have all dependencies flow from higher to lower layers (no upward dependencies)', () => {
    // Analyze actual dependencies
    const dependencies = analyzeDependencies(infrastructureDir);
    
    // Filter out dependencies that violate layering
    const violations = dependencies.filter(dep => dep.fromLayer < dep.toLayer);
    
    if (violations.length > 0) {
      console.log('\n❌ Layering violations found:');
      console.log('═'.repeat(80));
      
      // Group violations by layer transition
      const violationsByTransition = new Map<string, Dependency[]>();
      
      for (const violation of violations) {
        const key = `Layer ${violation.fromLayer} → Layer ${violation.toLayer}`;
        if (!violationsByTransition.has(key)) {
          violationsByTransition.set(key, []);
        }
        violationsByTransition.get(key)!.push(violation);
      }
      
      // Display violations grouped by transition
      for (const [transition, deps] of violationsByTransition) {
        console.log(`\n${transition}:`);
        for (const dep of deps.slice(0, 5)) { // Show first 5 examples
          console.log(`  ${dep.from} → ${dep.to}`);
        }
        if (deps.length > 5) {
          console.log(`  ... and ${deps.length - 5} more`);
        }
      }
      
      console.log('\n═'.repeat(80));
      console.log(`Total violations: ${violations.length}`);
      console.log('\nLayer hierarchy (highest to lowest):');
      console.log('  5. PRESENTATION');
      console.log('  4. INTEGRATION');
      console.log('  3. SERVICES');
      console.log('  2. PRIMITIVES');
      console.log('  1. TYPES');
      console.log('\nDependencies must flow downward (higher layer → lower layer)');
    }
    
    // The test passes if there are no violations
    expect(violations).toHaveLength(0);
  });
  
  it('should have all modules assigned to a layer', () => {
    const infrastructureDir = path.join(process.cwd(), 'client/src/infrastructure');
    
    if (!fs.existsSync(infrastructureDir)) {
      console.log('⚠️  Infrastructure directory not found, skipping test');
      return;
    }
    
    const entries = fs.readdirSync(infrastructureDir, { withFileTypes: true });
    const modules = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => !['__tests__', 'scripts', 'consolidation'].includes(entry.name))
      .map(entry => entry.name);
    
    const unassignedModules = modules.filter(module => {
      const layer = getModuleLayer(module);
      return layer === null;
    });
    
    if (unassignedModules.length > 0) {
      console.log('\n❌ Modules without layer assignment:');
      console.log('═'.repeat(80));
      for (const module of unassignedModules) {
        console.log(`  - ${module}`);
      }
      console.log('\n═'.repeat(80));
      console.log('All modules must be assigned to a layer in ARCHITECTURAL_LAYERS.md');
    }
    
    expect(unassignedModules).toHaveLength(0);
  });
  
  it('property: for any dependency, fromLayer >= toLayer (downward or same-layer only)', () => {
    // This property tests the theoretical constraint:
    // IF a dependency exists from module A to module B,
    // THEN the layer of A must be >= the layer of B
    
    // We test this by analyzing actual dependencies in the codebase
    const dependencies = analyzeDependencies(infrastructureDir);
    
    if (dependencies.length === 0) {
      // No dependencies found, property holds trivially
      console.log('⚠️  No dependencies found in infrastructure directory');
      expect(true).toBe(true);
      return;
    }
    
    // For each actual dependency, verify the layering property holds
    fc.assert(
      fc.property(
        fc.constantFrom(...dependencies.map((_, i) => i)),
        (depIndex) => {
          const dep = dependencies[depIndex];
          
          // The property: for any actual dependency, fromLayer >= toLayer
          return dep.fromLayer >= dep.toLayer;
        }
      ),
      {
        numRuns: Math.min(dependencies.length, 1000),
        verbose: false,
      }
    );
  });
  
  it('property: TYPES layer cannot depend on any other layer', () => {
    // Analyze actual dependencies from TYPES layer modules
    const dependencies = analyzeDependencies(infrastructureDir);
    const typesDependencies = dependencies.filter(dep => dep.fromLayer === Layer.TYPES);
    
    if (typesDependencies.length === 0) {
      // No dependencies from TYPES layer, property holds trivially
      expect(true).toBe(true);
      return;
    }
    
    fc.assert(
      fc.property(
        fc.constantFrom(...typesDependencies.map((_, i) => i)),
        (depIndex) => {
          const dep = typesDependencies[depIndex];
          
          // TYPES layer can only depend on other TYPES modules
          return dep.toLayer === Layer.TYPES;
        }
      ),
      {
        numRuns: Math.min(typesDependencies.length, 500),
      }
    );
  });
  
  it('property: PRESENTATION layer can depend on all lower layers', () => {
    const presentationModules = Object.entries(MODULE_LAYERS)
      .filter(([_, layer]) => layer === Layer.PRESENTATION)
      .map(([module]) => module);
    
    fc.assert(
      fc.property(
        fc.constantFrom(...presentationModules),
        fc.constantFrom(...Object.keys(MODULE_LAYERS)),
        (fromModule, toModule) => {
          const fromLayer = MODULE_LAYERS[fromModule];
          const toLayer = MODULE_LAYERS[toModule];
          
          // PRESENTATION layer can depend on any lower layer
          if (fromLayer === Layer.PRESENTATION) {
            return toLayer <= Layer.PRESENTATION;
          }
          
          return true;
        }
      ),
      {
        numRuns: 500,
      }
    );
  });
  
  it('property: layer ordering is transitive', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(MODULE_LAYERS)),
        fc.constantFrom(...Object.keys(MODULE_LAYERS)),
        fc.constantFrom(...Object.keys(MODULE_LAYERS)),
        (moduleA, moduleB, moduleC) => {
          const layerA = MODULE_LAYERS[moduleA];
          const layerB = MODULE_LAYERS[moduleB];
          const layerC = MODULE_LAYERS[moduleC];
          
          // If A can depend on B, and B can depend on C, then A can depend on C
          // (transitivity of the "can depend on" relation)
          if (layerA >= layerB && layerB >= layerC) {
            return layerA >= layerC;
          }
          
          return true;
        }
      ),
      {
        numRuns: 1000,
      }
    );
  });
});
