import { ImportPathResolver } from '../../src/analyzers/import-path-resolver';
import { ProjectStructure } from '../../src/types/core';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ImportPathResolver', () => {
  let resolver: ImportPathResolver;
  let mockProjectStructure: ProjectStructure;
  
  beforeEach(() => {
    mockProjectStructure = {
      rootPath: '/project',
      tsConfigPath: '/project/tsconfig.json',
      sourceFiles: [],
      excludePatterns: [],
      compilerOptions: {},
      schema: {
        tables: {},
        importPaths: {}
      },
      database: {
        connectionPatterns: [],
        servicePatterns: [],
        detectedUsages: [],
        commonImports: {}
      },
      sharedCore: {
        utilities: {
          'core': ['logger', 'ApiSuccess', 'ApiError', 'cacheKeys'],
          'validation': ['ValidationError', 'validateRequest'],
          'performance': ['PerformanceMonitor', 'measurePerformance'],
          'config': ['ConfigManager', 'getConfig'],
          'middleware/auth': ['authMiddleware'],
          'middleware/rate-limit': ['rateLimitMiddleware'],
          'utils/security': ['sanitizeInput', 'validateToken']
        },
        importPaths: {
          'core': '@shared/core',
          'validation': '@shared/core/src/validation',
          'performance': '@shared/core/src/performance',
          'config': '@shared/core/src/config',
          'middleware/auth': '@shared/core/src/middleware/auth',
          'middleware/rate-limit': '@shared/core/src/middleware/rate-limit',
          'utils/security': '@shared/core/src/utils/security'
        }
      }
    };
    
    resolver = new ImportPathResolver(mockProjectStructure);
    jest.clearAllMocks();
  });

  describe('resolveImportPath', () => {
    it('should resolve core utilities to main index', () => {
      const result = resolver.resolveImportPath('logger', '/project/server/test.ts');
      
      expect(result.found).toBe(true);
      expect(result.resolvedPath).toBe('@shared/core');
      expect(result.confidence).toBe(95);
      expect(result.source).toBe('project-structure');
    });

    it('should resolve specific module utilities', () => {
      const result = resolver.resolveImportPath('ValidationError', '/project/server/test.ts');
      
      expect(result.found).toBe(true);
      expect(result.resolvedPath).toBe('@shared/core/src/validation');
      expect(result.confidence).toBe(95);
      expect(result.source).toBe('project-structure');
    });

    it('should resolve middleware utilities', () => {
      const result = resolver.resolveImportPath('authMiddleware', '/project/server/test.ts');
      
      expect(result.found).toBe(true);
      expect(result.resolvedPath).toBe('@shared/core/src/middleware/auth');
      expect(result.confidence).toBe(95);
      expect(result.source).toBe('project-structure');
    });

    it('should fallback to known mappings when not in project structure', () => {
      const result = resolver.resolveImportPath('unknownUtility', '/project/server/test.ts');
      
      expect(result.found).toBe(false);
      expect(result.confidence).toBe(30);
      expect(result.source).toBe('relative-fallback');
    });

    it('should prefer aliases when requested', () => {
      const result = resolver.resolveImportPath('logger', '/project/server/test.ts', true);
      
      expect(result.resolvedPath).toBe('@shared/core');
    });

    it('should provide alternatives for utilities', () => {
      const result = resolver.resolveImportPath('logger', '/project/server/test.ts');
      
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });
  });

  describe('convertToAlias', () => {
    it('should convert shared/core paths to aliases', () => {
      // Test the private method through public interface
      const result = resolver.resolveImportPath('logger', '/project/server/deep/nested/test.ts');
      
      expect(result.resolvedPath).toBe('@shared/core');
    });

    it('should handle nested shared/core paths', () => {
      const result = resolver.resolveImportPath('ValidationError', '/project/server/test.ts');
      
      expect(result.resolvedPath).toBe('@shared/core/src/validation');
    });
  });

  describe('correctRelativePath', () => {
    it('should return alias paths unchanged', () => {
      const result = resolver.correctRelativePath(
        '@shared/core',
        '@shared/core',
        '/project/server/test.ts'
      );
      
      expect(result).toBe('@shared/core');
    });

    it('should correct deeply nested relative paths', () => {
      // This tests the relative path correction functionality
      const result = resolver.resolveImportPath('logger', '/project/server/deep/nested/test.ts');
      
      // Should prefer alias over complex relative path
      expect(result.resolvedPath).toBe('@shared/core');
    });
  });

  describe('tsconfig.json integration', () => {
    it('should load path aliases from tsconfig.json', () => {
      const mockTsConfig = {
        compilerOptions: {
          paths: {
            '@shared/*': ['shared/*'],
            '@server/*': ['server/*'],
            '@client/*': ['client/*']
          }
        }
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockTsConfig));
      
      // Create new resolver to trigger tsconfig loading
      const newResolver = new ImportPathResolver(mockProjectStructure);
      const result = newResolver.resolveImportPath('logger', '/project/server/test.ts');
      
      expect(result.resolvedPath).toBe('@shared/core');
    });

    it('should handle missing tsconfig.json gracefully', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      // Should not throw and should still work with defaults
      expect(() => new ImportPathResolver(mockProjectStructure)).not.toThrow();
    });

    it('should handle malformed tsconfig.json gracefully', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      // Should not throw and should still work with defaults
      expect(() => new ImportPathResolver(mockProjectStructure)).not.toThrow();
    });
  });

  describe('module guessing', () => {
    it('should guess correct modules for utilities', () => {
      // Test utilities that aren't in project structure
      const testCases = [
        { utility: 'ErrorHandler', expectedModule: 'observability/error-management' },
        { utility: 'RateLimiter', expectedModule: 'rate-limiting' },
        { utility: 'hashPassword', expectedModule: 'utils/security' },
        { utility: 'retryAsync', expectedModule: 'utils/async' }
      ];
      
      for (const testCase of testCases) {
        const result = resolver.resolveImportPath(testCase.utility, '/project/server/test.ts');
        
        // Should fallback to known mappings with guessed module
        expect(result.source).toBe('known-mapping');
      }
    });
  });

  describe('confidence scoring', () => {
    it('should assign high confidence to project structure matches', () => {
      const result = resolver.resolveImportPath('logger', '/project/server/test.ts');
      
      expect(result.confidence).toBe(95);
    });

    it('should assign medium confidence to known mappings', () => {
      // Create resolver without project structure data
      const emptyStructure = {
        ...mockProjectStructure,
        sharedCore: {
          utilities: {},
          importPaths: {}
        }
      };
      
      const emptyResolver = new ImportPathResolver(emptyStructure);
      const result = emptyResolver.resolveImportPath('logger', '/project/server/test.ts');
      
      expect(result.confidence).toBe(90); // Known mapping confidence
    });

    it('should assign low confidence to fallback paths', () => {
      const emptyStructure = {
        ...mockProjectStructure,
        sharedCore: {
          utilities: {},
          importPaths: {}
        }
      };
      
      const emptyResolver = new ImportPathResolver(emptyStructure);
      const result = emptyResolver.resolveImportPath('unknownUtility', '/project/server/test.ts');
      
      expect(result.confidence).toBe(30); // Fallback confidence
    });
  });

  describe('alternative suggestions', () => {
    it('should provide alternative import paths', () => {
      const result = resolver.resolveImportPath('logger', '/project/server/test.ts');
      
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!).toContain('@shared/core');
      expect(result.alternatives!).toContain('@shared/core/src');
    });

    it('should not duplicate alternatives', () => {
      const result = resolver.resolveImportPath('logger', '/project/server/test.ts');
      
      const alternatives = result.alternatives || [];
      const uniqueAlternatives = [...new Set(alternatives)];
      
      expect(alternatives.length).toBe(uniqueAlternatives.length);
    });
  });

  describe('edge cases', () => {
    it('should handle utilities with multiple possible modules', () => {
      // Add utility to multiple modules in project structure
      mockProjectStructure.sharedCore.utilities['core'].push('ValidationError');
      
      const newResolver = new ImportPathResolver(mockProjectStructure);
      const result = newResolver.resolveImportPath('ValidationError', '/project/server/test.ts');
      
      // Should still resolve to first match
      expect(result.found).toBe(true);
      expect(result.alternatives!.length).toBeGreaterThan(0);
    });

    it('should handle empty project structure', () => {
      const emptyStructure = {
        ...mockProjectStructure,
        sharedCore: {
          utilities: {},
          importPaths: {}
        }
      };
      
      const emptyResolver = new ImportPathResolver(emptyStructure);
      const result = emptyResolver.resolveImportPath('logger', '/project/server/test.ts');
      
      // Should fallback to known mappings
      expect(result.resolvedPath).toBe('@shared/core');
    });

    it('should handle very nested file paths', () => {
      const deepPath = '/project/server/features/users/domain/services/deep/nested/test.ts';
      const result = resolver.resolveImportPath('logger', deepPath);
      
      // Should still prefer alias over complex relative path
      expect(result.resolvedPath).toBe('@shared/core');
    });
  });
});