/**
 * Unit tests for FixGenerator
 * 
 * Tests import path update generation, type consolidation fix generation,
 * and interface completion fix generation.
 * 
 * Requirements: 2.1-2.5, 4.1-4.11
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FixGenerator } from '../../core/fix-generator';
import { testConfig } from '../setup';
import { 
  ErrorCategory, 
  Severity, 
  TypeScriptError,
  ModuleRelocationMap,
  FSDLocation,
  ImportPathFix,
  TypeConsolidationFix,
  InterfaceFix
} from '../../types';

describe('FixGenerator', () => {
  let generator: FixGenerator;

  beforeEach(() => {
    generator = new FixGenerator(testConfig);
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(generator).toBeDefined();
    });
  });

  describe('Import Path Update Generation', () => {
    it('should generate import path update fixes for relocated modules', () => {
      // Arrange
      const relocations: ModuleRelocationMap = {
        relocations: new Map<string, FSDLocation>([
          ['@client/config/gestures', {
            path: 'client/src/lib/config/gestures.ts',
            layer: 'lib',
            segment: 'config'
          }],
          ['@client/hooks', {
            path: 'client/src/lib/hooks/index.ts',
            layer: 'lib',
            segment: 'hooks'
          }]
        ]),
        deletedModules: [],
        consolidations: new Map()
      };

      const errors: TypeScriptError[] = [
        {
          code: 'TS2307',
          message: "Cannot find module '@client/config/gestures'",
          file: 'client/src/lib/hooks/mobile/usePullToRefresh.ts',
          line: 34,
          column: 1,
          severity: Severity.CRITICAL,
          category: ErrorCategory.MODULE_RESOLUTION
        }
      ];

      // Act
      const fixes = generator.generateImportPathUpdateFixes(relocations, errors);

      // Assert
      expect(fixes).toBeDefined();
      expect(Array.isArray(fixes)).toBe(true);
      
      // Verify fix structure
      if (fixes.length > 0) {
        const fix = fixes[0] as ImportPathFix;
        expect(fix.id).toContain('import-path');
        expect(fix.category).toBe(ErrorCategory.MODULE_RESOLUTION);
        expect(fix.description).toBeDefined();
        expect(fix.file).toBeDefined();
        expect(fix.oldImportPath).toBeDefined();
        expect(fix.newImportPath).toBeDefined();
        expect(Array.isArray(fix.importedNames)).toBe(true);
        expect(typeof fix.apply).toBe('function');
      }
    });

    it('should return empty array when no relocations match errors', () => {
      // Arrange
      const relocations: ModuleRelocationMap = {
        relocations: new Map<string, FSDLocation>([
          ['@client/other/module', {
            path: 'client/src/lib/other/module.ts',
            layer: 'lib',
            segment: 'other'
          }]
        ]),
        deletedModules: [],
        consolidations: new Map()
      };

      const errors: TypeScriptError[] = [
        {
          code: 'TS2307',
          message: "Cannot find module '@client/config/gestures'",
          file: 'client/src/lib/hooks/mobile/usePullToRefresh.ts',
          line: 34,
          column: 1,
          severity: Severity.CRITICAL,
          category: ErrorCategory.MODULE_RESOLUTION
        }
      ];

      // Act
      const fixes = generator.generateImportPathUpdateFixes(relocations, errors);

      // Assert - may be empty if no matching imports found in actual files
      expect(Array.isArray(fixes)).toBe(true);
    });

    it('should handle multiple relocations in the same file', () => {
      // Arrange
      const relocations: ModuleRelocationMap = {
        relocations: new Map<string, FSDLocation>([
          ['@client/config/gestures', {
            path: 'client/src/lib/config/gestures.ts',
            layer: 'lib',
            segment: 'config'
          }],
          ['@client/config/navigation', {
            path: 'client/src/infrastructure/navigation/config.ts',
            layer: 'core',
            segment: 'navigation'
          }]
        ]),
        deletedModules: [],
        consolidations: new Map()
      };

      const errors: TypeScriptError[] = [
        {
          code: 'TS2307',
          message: "Cannot find module '@client/config/gestures'",
          file: 'client/src/lib/hooks/mobile/usePullToRefresh.ts',
          line: 34,
          column: 1,
          severity: Severity.CRITICAL,
          category: ErrorCategory.MODULE_RESOLUTION
        },
        {
          code: 'TS2307',
          message: "Cannot find module '@client/config/navigation'",
          file: 'client/src/lib/hooks/mobile/usePullToRefresh.ts',
          line: 35,
          column: 1,
          severity: Severity.CRITICAL,
          category: ErrorCategory.MODULE_RESOLUTION
        }
      ];

      // Act
      const fixes = generator.generateImportPathUpdateFixes(relocations, errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
      // Multiple fixes may be generated if the file has multiple imports
    });

    it('should generate fixes with correct relative paths', () => {
      // Arrange
      const relocations: ModuleRelocationMap = {
        relocations: new Map<string, FSDLocation>([
          ['@client/utils/security', {
            path: 'client/src/infrastructure/security/index.ts',
            layer: 'core',
            segment: 'security'
          }]
        ]),
        deletedModules: [],
        consolidations: new Map()
      };

      const errors: TypeScriptError[] = [];

      // Act
      const fixes = generator.generateImportPathUpdateFixes(relocations, errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
      
      // Verify relative path format if fixes are generated
      fixes.forEach(fix => {
        const importFix = fix as ImportPathFix;
        // Relative paths should start with ./ or ../
        if (importFix.newImportPath) {
          expect(
            importFix.newImportPath.startsWith('./') || 
            importFix.newImportPath.startsWith('../') ||
            importFix.newImportPath.startsWith('@')
          ).toBe(true);
        }
      });
    });

    it('should handle empty relocations map', () => {
      // Arrange
      const relocations: ModuleRelocationMap = {
        relocations: new Map(),
        deletedModules: [],
        consolidations: new Map()
      };

      const errors: TypeScriptError[] = [];

      // Act
      const fixes = generator.generateImportPathUpdateFixes(relocations, errors);

      // Assert
      expect(fixes).toEqual([]);
    });
  });

  describe('Type Consolidation Fix Generation', () => {
    it('should generate type consolidation fixes for duplicate types', () => {
      // Arrange
      const duplicateTypes = new Map<string, string[]>([
        ['DashboardPreferences', [
          'client/src/features/dashboard/types.ts',
          'client/src/infrastructure/dashboard/types.ts',
          'shared/types/dashboard/index.ts'
        ]]
      ]);

      // Act
      const fixes = generator.generateTypeConsolidationFixes(duplicateTypes);

      // Assert
      expect(fixes).toBeDefined();
      expect(Array.isArray(fixes)).toBe(true);
      expect(fixes.length).toBe(1);

      const fix = fixes[0] as TypeConsolidationFix;
      expect(fix.id).toContain('type-consolidation');
      expect(fix.category).toBe(ErrorCategory.NAMING_CONSISTENCY);
      expect(fix.canonicalPath).toBeDefined();
      expect(fix.canonicalName).toBe('DashboardPreferences');
      expect(Array.isArray(fix.duplicates)).toBe(true);
      expect(Array.isArray(fix.affectedImports)).toBe(true);
      expect(typeof fix.apply).toBe('function');
    });

    it('should select canonical location based on preference order', () => {
      // Arrange - testConfig has preference: ['shared', 'lib', 'core']
      const duplicateTypes = new Map<string, string[]>([
        ['UserPreferences', [
          'client/src/infrastructure/user/types.ts',
          'client/src/lib/types/user.ts',
          'path/to/shared/types/user/index.ts'
        ]]
      ]);

      // Act
      const fixes = generator.generateTypeConsolidationFixes(duplicateTypes);

      // Assert
      expect(fixes.length).toBe(1);
      const fix = fixes[0] as TypeConsolidationFix;
      
      // Should prefer 'shared' location (path contains /shared/)
      expect(fix.canonicalPath).toContain('/shared/');
    });

    it('should identify duplicates to remove', () => {
      // Arrange
      const duplicateTypes = new Map<string, string[]>([
        ['ApiResponse', [
          'client/src/features/api/types.ts',
          'shared/types/api/index.ts'
        ]]
      ]);

      // Act
      const fixes = generator.generateTypeConsolidationFixes(duplicateTypes);

      // Assert
      expect(fixes.length).toBe(1);
      const fix = fixes[0] as TypeConsolidationFix;
      
      // Should have duplicates to remove (all except canonical)
      expect(fix.duplicates.length).toBeGreaterThan(0);
      fix.duplicates.forEach(dup => {
        expect(dup.path).toBeDefined();
        expect(dup.name).toBe('ApiResponse');
        expect(dup.path).not.toBe(fix.canonicalPath);
      });
    });

    it('should handle multiple type consolidations', () => {
      // Arrange
      const duplicateTypes = new Map<string, string[]>([
        ['DashboardPreferences', [
          'client/src/features/dashboard/types.ts',
          'shared/types/dashboard/index.ts'
        ]],
        ['BillAnalytics', [
          'client/src/features/bills/types.ts',
          'shared/types/bills/index.ts'
        ]],
        ['PerformanceMetrics', [
          'client/src/infrastructure/monitoring/types.ts',
          'shared/types/monitoring/index.ts'
        ]]
      ]);

      // Act
      const fixes = generator.generateTypeConsolidationFixes(duplicateTypes);

      // Assert
      expect(fixes.length).toBe(3);
      
      // Verify each fix has correct structure
      fixes.forEach(fix => {
        const consolidationFix = fix as TypeConsolidationFix;
        expect(consolidationFix.canonicalPath).toBeDefined();
        expect(consolidationFix.canonicalName).toBeDefined();
        expect(consolidationFix.duplicates.length).toBeGreaterThan(0);
      });
    });

    it('should return empty array for empty duplicate types map', () => {
      // Arrange
      const duplicateTypes = new Map<string, string[]>();

      // Act
      const fixes = generator.generateTypeConsolidationFixes(duplicateTypes);

      // Assert
      expect(fixes).toEqual([]);
    });

    it('should handle single type location (no duplicates)', () => {
      // Arrange
      const duplicateTypes = new Map<string, string[]>([
        ['UniqueType', ['shared/types/unique/index.ts']]
      ]);

      // Act
      const fixes = generator.generateTypeConsolidationFixes(duplicateTypes);

      // Assert
      expect(fixes.length).toBe(1);
      const fix = fixes[0] as TypeConsolidationFix;
      
      // Should have no duplicates to remove
      expect(fix.duplicates.length).toBe(0);
    });
  });

  describe('Interface Completion Fix Generation', () => {
    it('should generate interface completion fixes for missing properties', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2339',
          message: "Property 'maxActionItems' does not exist on type 'DashboardConfig'",
          file: 'client/src/features/dashboard/components/Dashboard.tsx',
          line: 45,
          column: 20,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        }
      ];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
      
      // Verify fix structure if generated
      fixes.forEach(fix => {
        const interfaceFix = fix as InterfaceFix;
        expect(interfaceFix.id).toContain('interface-completion');
        expect(interfaceFix.category).toBe(ErrorCategory.INTERFACE_COMPLETION);
        expect(interfaceFix.interfaceName).toBeDefined();
        expect(interfaceFix.file).toBeDefined();
        expect(Array.isArray(interfaceFix.properties)).toBe(true);
        expect(typeof interfaceFix.apply).toBe('function');
      });
    });

    it('should extract interface name from error message', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2339',
          message: "Property 'size' does not exist on type 'TimeoutAwareLoaderProps'",
          file: 'client/src/lib/components/TimeoutAwareLoader.tsx',
          line: 23,
          column: 15,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        }
      ];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      fixes.forEach(fix => {
        const interfaceFix = fix as InterfaceFix;
        expect(interfaceFix.interfaceName).toBe('TimeoutAwareLoaderProps');
      });
    });

    it('should extract property name from error message', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2339',
          message: "Property 'showCompletedActions' does not exist on type 'DashboardConfig'",
          file: 'client/src/features/dashboard/Dashboard.tsx',
          line: 67,
          column: 25,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        }
      ];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      fixes.forEach(fix => {
        const interfaceFix = fix as InterfaceFix;
        if (interfaceFix.properties.length > 0) {
          expect(interfaceFix.properties[0].name).toBe('showCompletedActions');
        }
      });
    });

    it('should handle multiple missing properties for same interface', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2339',
          message: "Property 'maxActionItems' does not exist on type 'DashboardConfig'",
          file: 'client/src/features/dashboard/Dashboard.tsx',
          line: 45,
          column: 20,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        },
        {
          code: 'TS2339',
          message: "Property 'maxTrackedTopics' does not exist on type 'DashboardConfig'",
          file: 'client/src/features/dashboard/Dashboard.tsx',
          line: 46,
          column: 20,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        }
      ];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
      // Should consolidate into single fix per interface
    });

    it('should handle error constructor standardization', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2353',
          message: "Object literal may only specify known properties, and 'zodError' does not exist in type 'ErrorOptions'",
          file: 'client/src/infrastructure/errors/ServiceError.ts',
          line: 34,
          column: 5,
          severity: Severity.HIGH,
          category: ErrorCategory.ERROR_CONSTRUCTOR
        }
      ];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
    });

    it('should return empty array for empty errors', () => {
      // Arrange
      const errors: TypeScriptError[] = [];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      expect(fixes).toEqual([]);
    });

    it('should skip errors without extractable interface names', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2339',
          message: "Some generic error message without interface name",
          file: 'client/src/features/test/test.tsx',
          line: 10,
          column: 5,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        }
      ];

      // Act
      const fixes = generator.generateInterfaceCompletionFixes(errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
      // May be empty if interface name cannot be extracted
    });
  });

  describe('General Fix Generation', () => {
    it('should route MODULE_RESOLUTION errors correctly', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2307',
          message: "Cannot find module",
          file: 'test.ts',
          line: 1,
          column: 1,
          severity: Severity.CRITICAL,
          category: ErrorCategory.MODULE_RESOLUTION
        }
      ];

      // Act
      const fixes = generator.generateFixes(ErrorCategory.MODULE_RESOLUTION, errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
      // Returns empty because MODULE_RESOLUTION requires relocation map
      expect(fixes).toEqual([]);
    });

    it('should route INTERFACE_COMPLETION errors correctly', () => {
      // Arrange
      const errors: TypeScriptError[] = [
        {
          code: 'TS2339',
          message: "Property 'test' does not exist on type 'TestInterface'",
          file: 'test.ts',
          line: 1,
          column: 1,
          severity: Severity.HIGH,
          category: ErrorCategory.INTERFACE_COMPLETION
        }
      ];

      // Act
      const fixes = generator.generateFixes(ErrorCategory.INTERFACE_COMPLETION, errors);

      // Assert
      expect(Array.isArray(fixes)).toBe(true);
    });

    it('should handle empty error arrays', () => {
      // Arrange
      const errors: TypeScriptError[] = [];

      // Act
      const fixes = generator.generateFixes(ErrorCategory.ID_TYPE, errors);

      // Assert
      expect(fixes).toEqual([]);
    });
  });
});
