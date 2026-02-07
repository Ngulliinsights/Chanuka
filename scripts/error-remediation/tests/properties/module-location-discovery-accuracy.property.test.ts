/**
 * Property-Based Test: Module Location Discovery Accuracy
 * 
 * Property 1: For any missing module import error (TS2307), when the Error_Remediation_System 
 * searches the FSD structure for the relocated module, it should find the module if it exists 
 * anywhere in the codebase with at least 80% name similarity.
 * 
 * Feature: client-error-remediation, Property 1: Module Location Discovery Accuracy
 * Validates: Requirements 1.1-1.7
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorAnalyzer } from '../../core/error-analyzer';
import {
  ModuleRelocationMap
} from '../../types';
import { RemediationConfig } from '../../config';

describe('Property 1: Module Location Discovery Accuracy', () => {
  // Create a temporary test directory structure for testing
  const testRoot = path.join(process.cwd(), 'scripts', 'error-remediation', 'tests', '.test-modules');
  
  beforeAll(() => {
    // Clean up test directory if it exists
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
    
    // Create test directory
    fs.mkdirSync(testRoot, { recursive: true });
    
    // Create a minimal tsconfig.json for ts-morph
    const tsconfigPath = path.join(testRoot, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        skipLibCheck: true,
        strict: false
      },
      include: ["**/*"]
    }, null, 2));
    
    // Create FSD layer directories
    const layers = ['app', 'features', 'core', 'lib', 'shared'];
    for (const layer of layers) {
      fs.mkdirSync(path.join(testRoot, layer), { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory after all tests
    if (fs.existsSync(testRoot)) {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('should find modules with at least 80% name similarity in FSD structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary module names
        fc.array(
          fc.record({
            moduleName: fc.constantFrom(
              'gestures',
              'navigation',
              'hooks',
              'auth',
              'security'
            ),
            layer: fc.constantFrom('lib', 'core', 'shared') as fc.Arbitrary<'lib' | 'core' | 'shared'>,
            // Add slight variations to test fuzzy matching
            variation: fc.constantFrom('', 's', '-config')
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (modules) => {
          // Create test FSD structure with modules
          const createdModules = new Map<string, string>();
          
          for (const module of modules) {
            const actualModuleName = module.moduleName + module.variation;
            const layerPath = path.join(testRoot, module.layer);
            
            // Create module file
            const modulePath = path.join(layerPath, `${actualModuleName}.ts`);
            fs.writeFileSync(modulePath, `export const ${actualModuleName} = {};`);
            
            createdModules.set(module.moduleName, modulePath);
          }

          try {
            // Create config pointing to test directory
            const config: RemediationConfig = {
              clientRoot: testRoot,
              tsconfigPath: path.join(testRoot, 'tsconfig.json'),
              fsdLayers: {
                app: path.join(testRoot, 'app'),
                features: path.join(testRoot, 'features'),
                core: path.join(testRoot, 'core'),
                lib: path.join(testRoot, 'lib'),
                shared: path.join(testRoot, 'shared')
              },
              moduleResolution: {
                fuzzyMatchThreshold: 0.8,
                searchDepth: 5
              },
              batchProcessing: {
                maxBatchSize: 10,
                validateAfterEachBatch: true,
                rollbackOnFailure: true
              },
              typeStandardization: {
                canonicalIdType: 'auto',
                typeConsolidationPreference: ['shared', 'lib', 'core']
              },
              validation: {
                runFullCompilationAfterPhase: true,
                failOnNewErrors: true
              },
              progressTracking: {
                reportDirectory: 'scripts/error-remediation/reports',
                generateDetailedReports: true
              }
            };

            // Create analyzer
            const analyzer = new ErrorAnalyzer(config);

            // Generate missing module paths (old paths that need to be discovered)
            const missingModules = modules.map(m => `@client/${m.layer}/${m.moduleName}`);

            // Discover module relocations
            const relocations: ModuleRelocationMap = await analyzer.discoverModuleRelocations(missingModules);

            // Property: For each module that exists in the FSD structure,
            // it should be found if name similarity >= 80%
            for (const module of modules) {
              const oldPath = `@client/${module.layer}/${module.moduleName}`;
              const actualModuleName = module.moduleName + module.variation;
              
              // Calculate similarity between search name and actual name
              const similarity = calculateSimilarity(module.moduleName, actualModuleName);
              
              if (similarity >= 0.8) {
                // Should be found in relocations
                const found = relocations.relocations.has(oldPath);
                
                expect(found).toBe(true);
                
                if (found) {
                  const location = relocations.relocations.get(oldPath)!;
                  
                  // Verify the location is in one of the FSD layers
                  expect(['app', 'features', 'core', 'lib', 'shared']).toContain(location.layer);
                  
                  // The path should contain either the search name or the actual name
                  // (fuzzy matching may find similar names)
                  const pathContainsSearchName = location.path.includes(module.moduleName);
                  const pathContainsActualName = location.path.includes(actualModuleName);
                  expect(pathContainsSearchName || pathContainsActualName).toBe(true);
                  
                  // Note: The layer might be different from module.layer if multiple matches exist
                  // and the type consolidation preference selects a different layer
                }
              }
            }

            // Property: Modules not found should be in deletedModules
            for (const missingModule of missingModules) {
              const found = relocations.relocations.has(missingModule);
              const deleted = relocations.deletedModules.includes(missingModule);
              
              // Each missing module should be either found or marked as deleted
              expect(found || deleted).toBe(true);
            }
          } finally {
            // Clean up created modules
            for (const modulePath of createdModules.values()) {
              if (fs.existsSync(modulePath)) {
                fs.unlinkSync(modulePath);
              }
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should correctly identify deleted modules when no match exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate module names that definitely don't exist
        fc.array(
          fc.string({ minLength: 15, maxLength: 25 })
            .filter(s => /^[a-zA-Z0-9_-]+$/.test(s))
            .map(s => `@client/nonexistent/${s}`),
          { minLength: 1, maxLength: 3 }
        ),
        async (missingModules) => {
          // Create config
          const config: RemediationConfig = {
            clientRoot: testRoot,
            tsconfigPath: path.join(testRoot, 'tsconfig.json'),
            fsdLayers: {
              app: path.join(testRoot, 'app'),
              features: path.join(testRoot, 'features'),
              core: path.join(testRoot, 'core'),
              lib: path.join(testRoot, 'lib'),
              shared: path.join(testRoot, 'shared')
            },
            moduleResolution: {
              fuzzyMatchThreshold: 0.8,
              searchDepth: 5
            },
            batchProcessing: {
              maxBatchSize: 10,
              validateAfterEachBatch: true,
              rollbackOnFailure: true
            },
            typeStandardization: {
              canonicalIdType: 'auto',
              typeConsolidationPreference: ['shared', 'lib', 'core']
            },
            validation: {
              runFullCompilationAfterPhase: true,
              failOnNewErrors: true
            },
            progressTracking: {
              reportDirectory: 'scripts/error-remediation/reports',
              generateDetailedReports: true
            }
          };

          // Create analyzer
          const analyzer = new ErrorAnalyzer(config);

          // Discover module relocations
          const relocations: ModuleRelocationMap = await analyzer.discoverModuleRelocations(missingModules);

          // Property: All modules should be marked as deleted since they don't exist
          for (const missingModule of missingModules) {
            const found = relocations.relocations.has(missingModule);
            const deleted = relocations.deletedModules.includes(missingModule);
            
            // Should be marked as deleted
            expect(deleted).toBe(true);
            
            // Should not be in relocations
            expect(found).toBe(false);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should identify consolidation opportunities when multiple matches exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a module name that will have duplicates
        fc.record({
          moduleName: fc.constantFrom('config', 'utils', 'types'),
          layers: fc.constant(['lib', 'core', 'shared'] as const)
        }),
        async ({ moduleName, layers }) => {
          // Create the same module in multiple layers
          const createdPaths: string[] = [];
          
          for (const layer of layers) {
            const layerPath = path.join(testRoot, layer);
            const modulePath = path.join(layerPath, `${moduleName}.ts`);
            fs.writeFileSync(modulePath, `export const ${moduleName} = {};`);
            createdPaths.push(modulePath);
          }

          try {
            // Create config
            const config: RemediationConfig = {
              clientRoot: testRoot,
              tsconfigPath: path.join(testRoot, 'tsconfig.json'),
              fsdLayers: {
                app: path.join(testRoot, 'app'),
                features: path.join(testRoot, 'features'),
                core: path.join(testRoot, 'core'),
                lib: path.join(testRoot, 'lib'),
                shared: path.join(testRoot, 'shared')
              },
              moduleResolution: {
                fuzzyMatchThreshold: 0.8,
                searchDepth: 5
              },
              batchProcessing: {
                maxBatchSize: 10,
                validateAfterEachBatch: true,
                rollbackOnFailure: true
              },
              typeStandardization: {
                canonicalIdType: 'auto',
                typeConsolidationPreference: ['shared', 'lib', 'core']
              },
              validation: {
                runFullCompilationAfterPhase: true,
                failOnNewErrors: true
              },
              progressTracking: {
                reportDirectory: 'scripts/error-remediation/reports',
                generateDetailedReports: true
              }
            };

            // Create analyzer
            const analyzer = new ErrorAnalyzer(config);

            // Search for the module
            const missingModules = [`@client/old/${moduleName}`];
            const relocations: ModuleRelocationMap = await analyzer.discoverModuleRelocations(missingModules);

            // Property: Should find the module
            expect(relocations.relocations.has(missingModules[0])).toBe(true);

            // Property: Should identify consolidation opportunities
            const location = relocations.relocations.get(missingModules[0])!;
            
            // The chosen location should be one of the created paths
            const chosenPathExists = createdPaths.some(p => location.path === p);
            expect(chosenPathExists).toBe(true);

            // Should prefer shared layer (highest preference)
            expect(location.layer).toBe('shared');
          } finally {
            // Clean up created modules
            for (const modulePath of createdPaths) {
              if (fs.existsSync(modulePath)) {
                fs.unlinkSync(modulePath);
              }
            }
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should respect the 80% similarity threshold', async () => {
    // Test with known similarity values
    const testCases = [
      { searchName: 'auth', actualName: 'auth', expectedSimilarity: 1.0 },
      { searchName: 'auth', actualName: 'auths', expectedSimilarity: 0.8 },
      { searchName: 'config', actualName: 'configs', expectedSimilarity: 0.857 },
      { searchName: 'utils', actualName: 'util', expectedSimilarity: 0.8 },
    ];

    for (const testCase of testCases) {
      const layerPath = path.join(testRoot, 'lib');
      const modulePath = path.join(layerPath, `${testCase.actualName}.ts`);
      fs.writeFileSync(modulePath, `export const ${testCase.actualName} = {};`);

      try {
        const config: RemediationConfig = {
          clientRoot: testRoot,
          tsconfigPath: path.join(testRoot, 'tsconfig.json'),
          fsdLayers: {
            app: path.join(testRoot, 'app'),
            features: path.join(testRoot, 'features'),
            core: path.join(testRoot, 'core'),
            lib: path.join(testRoot, 'lib'),
            shared: path.join(testRoot, 'shared')
          },
          moduleResolution: {
            fuzzyMatchThreshold: 0.8,
            searchDepth: 5
          },
          batchProcessing: {
            maxBatchSize: 10,
            validateAfterEachBatch: true,
            rollbackOnFailure: true
          },
          typeStandardization: {
            canonicalIdType: 'auto',
            typeConsolidationPreference: ['shared', 'lib', 'core']
          },
          validation: {
            runFullCompilationAfterPhase: true,
            failOnNewErrors: true
          },
          progressTracking: {
            reportDirectory: 'scripts/error-remediation/reports',
            generateDetailedReports: true
          }
        };

        const analyzer = new ErrorAnalyzer(config);
        const missingModules = [`@client/lib/${testCase.searchName}`];
        const relocations: ModuleRelocationMap = await analyzer.discoverModuleRelocations(missingModules);

        const similarity = calculateSimilarity(testCase.searchName, testCase.actualName);
        const found = relocations.relocations.has(missingModules[0]);

        // Property: Should be found if similarity >= 80%
        if (similarity >= 0.8) {
          expect(found).toBe(true);
        }
      } finally {
        if (fs.existsSync(modulePath)) {
          fs.unlinkSync(modulePath);
        }
      }
    }
  });

  it('should prefer locations based on type consolidation preference', async () => {
    const moduleName = 'types';
    const layers = ['shared', 'lib', 'core'] as const;
    const createdPaths: string[] = [];

    // Create the same module in all layers
    for (const layer of layers) {
      const layerPath = path.join(testRoot, layer);
      const modulePath = path.join(layerPath, `${moduleName}.ts`);
      fs.writeFileSync(modulePath, `export const ${moduleName} = {};`);
      createdPaths.push(modulePath);
    }

    try {
      // Create config with preference order: shared > lib > core
      const config: RemediationConfig = {
        clientRoot: testRoot,
        tsconfigPath: path.join(testRoot, 'tsconfig.json'),
        fsdLayers: {
          app: path.join(testRoot, 'app'),
          features: path.join(testRoot, 'features'),
          core: path.join(testRoot, 'core'),
          lib: path.join(testRoot, 'lib'),
          shared: path.join(testRoot, 'shared')
        },
        moduleResolution: {
          fuzzyMatchThreshold: 0.8,
          searchDepth: 5
        },
        batchProcessing: {
          maxBatchSize: 10,
          validateAfterEachBatch: true,
          rollbackOnFailure: true
        },
        typeStandardization: {
          canonicalIdType: 'auto',
          typeConsolidationPreference: ['shared', 'lib', 'core']
        },
        validation: {
          runFullCompilationAfterPhase: true,
          failOnNewErrors: true
        },
        progressTracking: {
          reportDirectory: 'scripts/error-remediation/reports',
          generateDetailedReports: true
        }
      };

      // Create analyzer
      const analyzer = new ErrorAnalyzer(config);

      // Search for the module
      const missingModules = [`@client/old/${moduleName}`];
      const relocations: ModuleRelocationMap = await analyzer.discoverModuleRelocations(missingModules);

      // Property: Should prefer 'shared' layer (highest preference)
      expect(relocations.relocations.has(missingModules[0])).toBe(true);
      
      const location = relocations.relocations.get(missingModules[0])!;
      
      // Should prefer shared layer
      expect(location.layer).toBe('shared');
    } finally {
      // Clean up created modules
      for (const modulePath of createdPaths) {
        if (fs.existsSync(modulePath)) {
          fs.unlinkSync(modulePath);
        }
      }
    }
  });
});

/**
 * Helper function to calculate similarity between two strings
 * Uses Levenshtein distance algorithm
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1.0;
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str1.length][str2.length];
}
