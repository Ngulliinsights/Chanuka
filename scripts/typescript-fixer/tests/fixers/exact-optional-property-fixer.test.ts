import { ExactOptionalPropertyFixer } from '../../src/fixers/exact-optional-property-fixer';
import { TypeScriptError, ProcessingContext } from '../../src/types/core';
import { createSourceFile, ScriptTarget, DiagnosticCategory } from 'typescript';

describe('ExactOptionalPropertyFixer', () => {
  let fixer: ExactOptionalPropertyFixer;

  beforeEach(() => {
    fixer = new ExactOptionalPropertyFixer();
  });

  describe('canHandle', () => {
    it('should handle TS2375 errors', () => {
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 10
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should not handle other error codes', () => {
      const error: TypeScriptError = {
        code: 2304,
        message: 'Cannot find name',
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 10
      };

      expect(fixer.canHandle(error)).toBe(false);
    });
  });

  describe('fix - Interface Properties', () => {
    it('should add | undefined to optional interface property', () => {
      const sourceCode = `
interface UserProfile {
  name: string;
  bio?: string;
  age?: number;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 3,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 45, // Position of 'bio?: string'
        length: 12
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(2); // Both bio and age properties
      expect(result.changes.some(c => c.newText === 'string | undefined')).toBe(true);
      expect(result.changes.some(c => c.newText === 'number | undefined')).toBe(true);
      expect(result.changes[0].description).toContain('Add | undefined');
    });
  });

  describe('fix - Configuration Objects', () => {
    it('should fix optional properties in configuration interfaces', () => {
      const sourceCode = `
interface ValidationOptions {
  strict?: boolean;
  allowUnknown?: boolean;
  errorMessage?: string;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 30,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.message).toContain('optional properties');
    });

    it('should handle RequestValidationConfig patterns', () => {
      const sourceCode = `
interface RequestValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  options?: ValidationOptions;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 40,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('fix - Validation Middleware', () => {
    it('should fix validation middleware optional parameters', () => {
      const sourceCode = `
function validateRequest(config: {
  body?: ZodSchema;
  options?: ValidationOptions;
}) {
  return (req: Request, res: Response, next?: NextFunction) => {};
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 3,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 50,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.message).toContain('optional properties');
    });
  });

  describe('fix - API Response', () => {
    it('should fix API response optional properties', () => {
      const sourceCode = `
interface ApiResponse {
  data: any;
  metadata?: ResponseMetadata;
  error?: string;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 3,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 40,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.message).toContain('optional properties');
    });
  });

  describe('fix - Chanuka Validation Patterns', () => {
    it('should fix UserPreferences interface', () => {
      const sourceCode = `
interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  billCategories?: string[];
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 30,
        length: 20
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should fix UserProfileData interface', () => {
      const sourceCode = `
interface UserProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 30,
        length: 12
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should not modify types that already include undefined', () => {
      const sourceCode = `
interface TestInterface {
  prop?: string | undefined;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 25,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No optional properties found to fix');
    });

    it('should handle non-optional properties gracefully', () => {
      const sourceCode = `
interface TestInterface {
  requiredProp: string;
}`;

      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 2,
        column: 3,
        category: DiagnosticCategory.Error,
        start: 25,
        length: 15
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No fixable properties found');
    });

    it('should handle missing nodes gracefully', () => {
      const sourceCode = `interface Test {}`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      const error: TypeScriptError = {
        code: 2375,
        message: 'Type is missing the following properties',
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 100, // Invalid position
        length: 5
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Node not found at error position');
    });
  });

  describe('getDescription', () => {
    it('should return appropriate description', () => {
      const description = fixer.getDescription();
      expect(description).toContain('exactOptionalPropertyTypes');
      expect(description).toContain('undefined');
    });
  });

  describe('getPriority', () => {
    it('should return high priority', () => {
      const priority = fixer.getPriority();
      expect(priority).toBe(70);
    });
  });
});