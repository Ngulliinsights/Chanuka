/**
 * Unit tests for module consolidation algorithm
 * 
 * Tests the core consolidation logic for MERGE, NEST, and REFACTOR strategies.
 */

import { describe, it, expect } from 'vitest';
import {
  consolidateModules,
  createStandardModuleStructure,
  mergeExports,
  mergeTypes,
  mergeImplementations,
  createSubModule,
  extractCommonCode,
  extractSpecificCode,
  Module,
  ModuleExport,
  TypeDefinition,
  Implementation,
} from '../consolidation-algorithm';
import { ConsolidationStrategy } from '../types';

describe('consolidation-algorithm', () => {
  describe('createStandardModuleStructure', () => {
    it('should create standard module structure with correct paths', () => {
      const structure = createStandardModuleStructure('test-module', '/base');
      
      expect(structure.name).toBe('test-module');
      expect(structure.path).toContain('test-module');
      expect(structure.indexTs).toContain('index.ts');
      expect(structure.typesDir).toContain('types');
      expect(structure.readmeMd).toContain('README.md');
      expect(structure.testsDir).toContain('__tests__');
      expect(structure.subModules).toEqual([]);
    });
  });

  describe('mergeExports', () => {
    it('should merge exports without conflicts', () => {
      const structure = createStandardModuleStructure('target');
      const exports: ModuleExport[] = [
        { name: 'func1', type: 'function', signature: 'func1(): void', isDefault: false },
        { name: 'Class1', type: 'class', signature: 'class Class1', isDefault: false },
      ];
      
      mergeExports(structure, exports, 'source');
      
      expect(structure.subModules).toHaveLength(1);
      expect(structure.subModules[0].exports).toHaveLength(2);
      expect(structure.subModules[0].exports[0].name).toBe('func1');
    });

    it('should handle naming conflicts by prefixing', () => {
      const structure = createStandardModuleStructure('target');
      
      // Add first set of exports
      const exports1: ModuleExport[] = [
        { name: 'func1', type: 'function', signature: 'func1(): void', isDefault: false },
      ];
      mergeExports(structure, exports1, 'source1');
      
      // Add conflicting exports
      const exports2: ModuleExport[] = [
        { name: 'func1', type: 'function', signature: 'func1(): string', isDefault: false },
      ];
      mergeExports(structure, exports2, 'source2');
      
      expect(structure.subModules[0].exports).toHaveLength(2);
      expect(structure.subModules[0].exports[0].name).toBe('func1');
      expect(structure.subModules[0].exports[1].name).toBe('source2_func1');
    });
  });

  describe('mergeTypes', () => {
    it('should merge type definitions without conflicts', () => {
      const structure = createStandardModuleStructure('target');
      const types: TypeDefinition[] = [
        { name: 'Type1', kind: 'interface', definition: 'interface Type1 {}' },
        { name: 'Type2', kind: 'type', definition: 'type Type2 = string' },
      ];
      
      mergeTypes(structure, types, 'source');
      
      expect(structure.subModules).toHaveLength(1);
      expect(structure.subModules[0].types).toHaveLength(2);
      expect(structure.subModules[0].types[0].name).toBe('Type1');
    });

    it('should handle type naming conflicts by prefixing', () => {
      const structure = createStandardModuleStructure('target');
      
      const types1: TypeDefinition[] = [
        { name: 'Config', kind: 'interface', definition: 'interface Config {}' },
      ];
      mergeTypes(structure, types1, 'source1');
      
      const types2: TypeDefinition[] = [
        { name: 'Config', kind: 'interface', definition: 'interface Config { x: number }' },
      ];
      mergeTypes(structure, types2, 'source2');
      
      expect(structure.subModules[0].types).toHaveLength(2);
      expect(structure.subModules[0].types[0].name).toBe('Config');
      expect(structure.subModules[0].types[1].name).toBe('source2_Config');
    });
  });

  describe('mergeImplementations', () => {
    it('should merge implementations', () => {
      const structure = createStandardModuleStructure('target');
      const implementations: Implementation[] = [
        { name: 'func1', kind: 'function', code: 'function func1() {}' },
        { name: 'func2', kind: 'function', code: 'function func2() {}' },
      ];
      
      mergeImplementations(structure, implementations);
      
      expect(structure.subModules).toHaveLength(1);
      expect(structure.subModules[0].implementations).toHaveLength(2);
    });
  });

  describe('createSubModule', () => {
    it('should create sub-module structure', () => {
      const subModule = createSubModule('sub', '/target/path');
      
      expect(subModule.name).toBe('sub');
      expect(subModule.path).toContain('sub');
      expect(subModule.exports).toEqual([]);
      expect(subModule.types).toEqual([]);
      expect(subModule.implementations).toEqual([]);
    });
  });

  describe('extractCommonCode', () => {
    it('should extract implementations that appear in multiple modules', () => {
      const modules: Module[] = [
        {
          name: 'module1',
          path: '/module1',
          exports: [],
          types: [],
          implementations: [
            { name: 'common1', kind: 'function', code: 'function common1() {}' },
            { name: 'specific1', kind: 'function', code: 'function specific1() {}' },
          ],
        },
        {
          name: 'module2',
          path: '/module2',
          exports: [],
          types: [],
          implementations: [
            { name: 'common1', kind: 'function', code: 'function common1() {}' },
            { name: 'specific2', kind: 'function', code: 'function specific2() {}' },
          ],
        },
      ];
      
      const commonCode = extractCommonCode(modules);
      
      expect(commonCode).toHaveLength(1);
      expect(commonCode[0].name).toBe('common1');
    });

    it('should return empty array for single module', () => {
      const modules: Module[] = [
        {
          name: 'module1',
          path: '/module1',
          exports: [],
          types: [],
          implementations: [
            { name: 'func1', kind: 'function', code: 'function func1() {}' },
          ],
        },
      ];
      
      const commonCode = extractCommonCode(modules);
      
      expect(commonCode).toEqual([]);
    });
  });

  describe('extractSpecificCode', () => {
    it('should extract code not in common set', () => {
      const module: Module = {
        name: 'module1',
        path: '/module1',
        exports: [],
        types: [],
        implementations: [
          { name: 'common1', kind: 'function', code: 'function common1() {}' },
          { name: 'specific1', kind: 'function', code: 'function specific1() {}' },
        ],
      };
      
      const commonCode: Implementation[] = [
        { name: 'common1', kind: 'function', code: 'function common1() {}' },
      ];
      
      const specificCode = extractSpecificCode(module, commonCode);
      
      expect(specificCode).toHaveLength(1);
      expect(specificCode[0].name).toBe('specific1');
    });
  });

  describe('consolidateModules', () => {
    it('should fail with no source modules', () => {
      const result = consolidateModules([], 'target', ConsolidationStrategy.MERGE);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No source modules');
    });

    it('should fail with empty target name', () => {
      const modules: Module[] = [
        {
          name: 'source',
          path: '/source',
          exports: [],
          types: [],
          implementations: [],
        },
      ];
      
      const result = consolidateModules(modules, '', ConsolidationStrategy.MERGE);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Target module name is required');
    });

    it('should consolidate using MERGE strategy', () => {
      const modules: Module[] = [
        {
          name: 'module1',
          path: '/module1',
          exports: [
            { name: 'func1', type: 'function', signature: 'func1(): void', isDefault: false },
          ],
          types: [
            { name: 'Type1', kind: 'interface', definition: 'interface Type1 {}' },
          ],
          implementations: [
            { name: 'func1', kind: 'function', code: 'function func1() {}' },
          ],
        },
        {
          name: 'module2',
          path: '/module2',
          exports: [
            { name: 'func2', type: 'function', signature: 'func2(): void', isDefault: false },
          ],
          types: [
            { name: 'Type2', kind: 'interface', definition: 'interface Type2 {}' },
          ],
          implementations: [
            { name: 'func2', kind: 'function', code: 'function func2() {}' },
          ],
        },
      ];
      
      const result = consolidateModules(modules, 'merged', ConsolidationStrategy.MERGE);
      
      expect(result.success).toBe(true);
      expect(result.module).toBeDefined();
      expect(result.module!.name).toBe('merged');
      expect(result.module!.subModules).toHaveLength(1);
      expect(result.module!.subModules[0].exports).toHaveLength(2);
      expect(result.module!.subModules[0].types).toHaveLength(2);
      expect(result.module!.subModules[0].implementations).toHaveLength(2);
    });

    it('should consolidate using NEST strategy', () => {
      const modules: Module[] = [
        {
          name: 'module1',
          path: '/module1',
          exports: [
            { name: 'func1', type: 'function', signature: 'func1(): void', isDefault: false },
          ],
          types: [],
          implementations: [
            { name: 'func1', kind: 'function', code: 'function func1() {}' },
          ],
        },
        {
          name: 'module2',
          path: '/module2',
          exports: [
            { name: 'func2', type: 'function', signature: 'func2(): void', isDefault: false },
          ],
          types: [],
          implementations: [
            { name: 'func2', kind: 'function', code: 'function func2() {}' },
          ],
        },
      ];
      
      const result = consolidateModules(modules, 'nested', ConsolidationStrategy.NEST);
      
      expect(result.success).toBe(true);
      expect(result.module).toBeDefined();
      expect(result.module!.name).toBe('nested');
      expect(result.module!.subModules).toHaveLength(2);
      expect(result.module!.subModules[0].name).toBe('module1');
      expect(result.module!.subModules[1].name).toBe('module2');
    });

    it('should consolidate using REFACTOR strategy', () => {
      const modules: Module[] = [
        {
          name: 'module1',
          path: '/module1',
          exports: [],
          types: [],
          implementations: [
            { name: 'common', kind: 'function', code: 'function common() {}' },
            { name: 'specific1', kind: 'function', code: 'function specific1() {}' },
          ],
        },
        {
          name: 'module2',
          path: '/module2',
          exports: [],
          types: [],
          implementations: [
            { name: 'common', kind: 'function', code: 'function common() {}' },
            { name: 'specific2', kind: 'function', code: 'function specific2() {}' },
          ],
        },
      ];
      
      const result = consolidateModules(modules, 'refactored', ConsolidationStrategy.REFACTOR);
      
      expect(result.success).toBe(true);
      expect(result.module).toBeDefined();
      expect(result.module!.name).toBe('refactored');
      expect(result.module!.core).toBeDefined();
      
      // Should have core sub-module + 2 specific sub-modules
      expect(result.module!.subModules.length).toBeGreaterThan(0);
      
      // Find core sub-module
      const coreModule = result.module!.subModules.find(sm => sm.name === 'core');
      expect(coreModule).toBeDefined();
      expect(coreModule!.implementations).toHaveLength(1);
      expect(coreModule!.implementations[0].name).toBe('common');
    });
  });
});
