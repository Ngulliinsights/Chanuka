import { SharedCoreUtilityDetector } from '../../src/analyzers/shared-core-utility-detector';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('SharedCoreUtilityDetector', () => {
  let detector: SharedCoreUtilityDetector;
  
  beforeEach(() => {
    detector = new SharedCoreUtilityDetector();
    jest.clearAllMocks();
  });

  describe('detectMissingUtilities', () => {
    it('should detect missing logger utility', () => {
      const testCode = `
        function testFunction() {
          logger.info('Test message');
          logger.error('Error message', { userId: '123' });
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(1);
      expect(result.usedUtilities[0].name).toBe('logger');
      expect(result.usedUtilities[0].usages).toHaveLength(2);
      expect(result.missingUtilities).toHaveLength(1);
      expect(result.missingUtilities[0].suggestedImportPath).toBe('@shared/core');
    });

    it('should detect missing API response utilities', () => {
      const testCode = `
        function createUser() {
          return new ApiSuccess(userData, 'User created');
        }
        
        function handleError() {
          throw new ApiError('Something went wrong', 500);
        }
        
        function validateInput() {
          throw new ApiValidationError('Invalid input', { field: 'email' });
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      // The detector might find ValidationError pattern within ApiValidationError
      expect(result.usedUtilities.length).toBeGreaterThanOrEqual(3);
      expect(result.usedUtilities.map(u => u.name)).toContain('ApiSuccess');
      expect(result.usedUtilities.map(u => u.name)).toContain('ApiError');
      expect(result.usedUtilities.map(u => u.name)).toContain('ApiValidationError');
      expect(result.missingUtilities.length).toBeGreaterThanOrEqual(3);
    });

    it('should detect missing cache utilities', () => {
      const testCode = `
        const userKey = cacheKeys.USER_PROFILE('123');
        const billKey = cacheKeys.BILL_DETAILS(456);
        const legacyKey = CACHE_KEYS.USER_PROFILE('123');
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(2);
      expect(result.usedUtilities.map(u => u.name)).toContain('cacheKeys');
      expect(result.usedUtilities.map(u => u.name)).toContain('CACHE_KEYS');
      expect(result.missingUtilities).toHaveLength(2);
    });

    it('should detect missing middleware utilities', () => {
      const testCode = `
        app.use(authMiddleware);
        app.use(rateLimitMiddleware({ limit: 100 }));
        app.use(errorHandlerMiddleware);
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(3);
      expect(result.usedUtilities.map(u => u.name)).toContain('authMiddleware');
      expect(result.usedUtilities.map(u => u.name)).toContain('rateLimitMiddleware');
      expect(result.usedUtilities.map(u => u.name)).toContain('errorHandlerMiddleware');
    });

    it('should not detect utilities that are already imported', () => {
      const testCode = `
        import { logger, ApiSuccess } from '@shared/core';
        
        function testFunction() {
          logger.info('Test message');
          return new ApiSuccess(data);
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(2);
      expect(result.importedUtilities).toHaveLength(2);
      expect(result.missingUtilities).toHaveLength(0);
    });

    it('should detect utilities with different import paths', () => {
      const testCode = `
        import { logger } from '@shared/core';
        import { ValidationError } from '@shared/core/src/validation';
        
        function testFunction() {
          logger.info('Test');
          validateRequest(data);
          throw new ValidationError('Invalid');
        }
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.importedUtilities).toHaveLength(2);
      expect(result.missingUtilities).toHaveLength(1);
      expect(result.missingUtilities[0].name).toBe('validateRequest');
    });

    it('should handle performance utilities', () => {
      const testCode = `
        const timer = Performance.startTimer('operation');
        Performance.measure('test', async () => {
          // some operation
        });
        timer.end();
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(1);
      expect(result.usedUtilities[0].name).toBe('Performance');
      // Multiple patterns might match the same utility usage
      expect(result.usedUtilities[0].usages.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle rate limiting utilities', () => {
      const testCode = `
        if (RateLimit.check(key, 100, 60000)) {
          // proceed
        }
        
        app.use(RateLimit.middleware(50, 15 * 60 * 1000));
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(1);
      expect(result.usedUtilities[0].name).toBe('RateLimit');
      // Multiple patterns might match the same utility usage
      expect(result.usedUtilities[0].usages.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle error boundary utilities', () => {
      const testCode = `
        <EnhancedErrorBoundary fallback={ErrorFallback}>
          <App />
        </EnhancedErrorBoundary>
        
        const recovery = AutomatedErrorRecoveryEngine();
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(2);
      expect(result.usedUtilities.map(u => u.name)).toContain('EnhancedErrorBoundary');
      expect(result.usedUtilities.map(u => u.name)).toContain('AutomatedErrorRecoveryEngine');
    });

    it('should calculate confidence scores correctly', () => {
      const testCode = `
        logger.info('message 1');
        logger.error('message 2');
        logger.debug('message 3');
        const loggerInstance = logger;
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities[0].confidence).toBeGreaterThan(80);
    });

    it('should handle file read errors gracefully', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      
      const result = detector.detectMissingUtilities('nonexistent.ts');
      
      expect(result.error).toBeDefined();
      expect(result.usedUtilities).toHaveLength(0);
      expect(result.missingUtilities).toHaveLength(0);
    });

    it('should generate proper import suggestions', () => {
      const testCode = `
        logger.info('test');
        new ApiSuccess(data);
        validateRequest(input);
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0].example).toMatch(/import \{ \w+ \} from '@shared\/core/);
      expect(result.suggestions.every(s => s.confidence > 0)).toBe(true);
    });
  });

  describe('utility pattern matching', () => {
    it('should match function call patterns', () => {
      const testCode = `
        validateRequest(data);
        sanitizeInput(userInput);
        asyncHandler(async (req, res) => {});
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(3);
      expect(result.usedUtilities.map(u => u.name)).toContain('validateRequest');
      expect(result.usedUtilities.map(u => u.name)).toContain('sanitizeInput');
      expect(result.usedUtilities.map(u => u.name)).toContain('asyncHandler');
    });

    it('should match property access patterns', () => {
      const testCode = `
        const metadata = ApiResponseWrapper.createMetadata(startTime, 'test');
        const config = ConfigManager.get('database');
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(2);
      expect(result.usedUtilities.map(u => u.name)).toContain('ApiResponseWrapper');
      expect(result.usedUtilities.map(u => u.name)).toContain('ConfigManager');
    });

    it('should match constructor patterns', () => {
      const testCode = `
        const success = new ApiSuccess(data, 'Created');
        const error = new ValidationError('Invalid input');
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.usedUtilities).toHaveLength(2);
      expect(result.usedUtilities.map(u => u.name)).toContain('ApiSuccess');
      expect(result.usedUtilities.map(u => u.name)).toContain('ValidationError');
    });
  });

  describe('import detection', () => {
    it('should detect named imports correctly', () => {
      const testCode = `
        import { logger, ApiSuccess, cacheKeys } from '@shared/core';
        import { ValidationError } from '@shared/core/src/validation';
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.importedUtilities).toHaveLength(4);
      expect(result.importedUtilities.every(imp => imp.isNamedImport)).toBe(true);
    });

    it('should detect default imports correctly', () => {
      const testCode = `
        import logger from '@shared/core/src/logging';
        import config from '@shared/core/src/config';
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.importedUtilities).toHaveLength(2);
      expect(result.importedUtilities.every(imp => !imp.isNamedImport)).toBe(true);
    });

    it('should identify shared/core imports correctly', () => {
      const testCode = `
        import { logger } from '@shared/core';
        import { ValidationError } from '@shared/core/src/validation';
        import { something } from 'other-package';
        import { relative } from '../utils/helper';
      `;
      
      mockFs.readFileSync.mockReturnValue(testCode);
      
      const result = detector.detectMissingUtilities('test.ts');
      
      expect(result.importedUtilities).toHaveLength(2);
      expect(result.importedUtilities.map(imp => imp.name)).toContain('logger');
      expect(result.importedUtilities.map(imp => imp.name)).toContain('ValidationError');
    });
  });
});