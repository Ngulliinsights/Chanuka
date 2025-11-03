import { describe, it, expect, beforeEach } from '@jest/globals';
import { createSourceFile, ScriptTarget, DiagnosticCategory } from 'typescript';
import { DatabaseConnectionFixer } from '../../src/fixers/database-connection-fixer';
import { TypeScriptError, ProcessingContext, ProjectStructure } from '../../src/types/core';
import { DATABASE_FIXTURES, EXPECTED_FIXES } from '../fixtures/database-patterns';

describe('DatabaseConnectionFixer Integration Tests', () => {
  let fixer: DatabaseConnectionFixer;
  let mockContext: ProcessingContext;

  beforeEach(() => {
    fixer = new DatabaseConnectionFixer();
    
    // Mock project structure with Chanuka-specific database patterns
    const mockProjectStructure: ProjectStructure = {
      rootPath: '/chanuka-project',
      tsConfigPath: '/chanuka-project/tsconfig.json',
      sourceFiles: [],
      excludePatterns: [],
      compilerOptions: {},
      schema: {
        tables: {
          users: ['id', 'email', 'name', 'active', 'createdAt'],
          bills: ['id', 'title', 'status', 'createdAt'],
          bill_engagement: ['id', 'userId', 'billId', 'engagementType', 'active', 'createdAt'],
          user_profiles: ['id', 'userId', 'bio', 'preferences'],
          notifications: ['id', 'userId', 'type', 'message', 'read', 'createdAt']
        },
        importPaths: {
          users: '@shared/schema',
          bills: '@shared/schema',
          bill_engagement: '@shared/schema'
        }
      },
      sharedCore: {
        utilities: {},
        importPaths: {}
      },
      database: {
        connectionPatterns: [
          '@shared/database/connection',
          '@shared/database',
          '@server/infrastructure/database/database-service'
        ],
        servicePatterns: [
          'databaseService',
          'DatabaseService',
          'withTransaction',
          'withReadConnection'
        ],
        detectedUsages: [],
        commonImports: {
          database: '@shared/database/connection',
          readDatabase: '@shared/database/connection',
          writeDatabase: '@shared/database/connection',
          withTransaction: '@shared/database/connection',
          databaseService: '@shared/database',
          eq: 'drizzle-orm',
          and: 'drizzle-orm',
          or: 'drizzle-orm',
          desc: 'drizzle-orm',
          count: 'drizzle-orm',
          sql: 'drizzle-orm'
        }
      }
    };

    mockContext = {
      project: mockProjectStructure,
      config: {
        enabledErrorTypes: [2304, 2307, 6133],
        excludePatterns: [],
        includePatterns: [],
        backupFiles: false,
        previewMode: false,
        outputFormat: 'console',
        maxConcurrency: 1,
        continueOnError: true,
        chanukaSettings: {
          projectRoot: '/chanuka-project',
          tsConfigPath: '/chanuka-project/tsconfig.json',
          schemaTableNames: ['users', 'bills', 'bill_engagement'],
          sharedCoreUtilities: [],
          databasePatterns: ['database', 'withTransaction', 'databaseService']
        }
      },
      sourceFile: null as any,
      program: null as any,
      typeChecker: null as any,
      filePath: 'test.ts'
    };
  });

  describe('Realistic Chanuka Database Patterns', () => {
    it('should fix missing database import in simple query', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.MISSING_DATABASE_IMPORT, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'database'",
        file: 'test.ts',
        line: 3,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 60,
        length: 8,
        context: {
          errorText: "Cannot find name 'database'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { database } from '@shared/database/connection'");
    });

    it('should fix missing withTransaction import', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.MISSING_TRANSACTION_IMPORT, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'withTransaction'",
        file: 'test.ts',
        line: 3,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 70,
        length: 15,
        context: {
          errorText: "Cannot find name 'withTransaction'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { withTransaction } from '@shared/database/connection'");
    });

    it('should fix missing databaseService import', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.MISSING_DATABASE_SERVICE, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'databaseService'",
        file: 'test.ts',
        line: 3,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 70,
        length: 15,
        context: {
          errorText: "Cannot find name 'databaseService'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { databaseService } from '@shared/database'");
    });

    it('should add Drizzle ORM imports to existing database import', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.MISSING_DRIZZLE_IMPORTS, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'eq'",
        file: 'test.ts',
        line: 6,
        column: 5,
        category: DiagnosticCategory.Error,
        start: 120,
        length: 2,
        context: {
          errorText: "Cannot find name 'eq'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { eq } from 'drizzle-orm'");
    });

    it('should fix incorrect relative import paths', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.INCORRECT_RELATIVE_PATHS, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2307,
        message: "Cannot find module '../../../shared/database/connection'",
        file: 'test.ts',
        line: 2,
        column: 52,
        category: DiagnosticCategory.Error,
        start: 52,
        length: 42,
        context: {
          errorText: "Cannot find module '../../../shared/database/connection'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].newText).toBe('@shared/database/connection');
    });
  });

  describe('Complex Chanuka Patterns', () => {
    it('should handle realistic user engagement service pattern', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.REALISTIC_CHANUKA_PATTERN, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      // Test fixing withTransaction import
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'withTransaction'",
        file: 'test.ts',
        line: 8,
        column: 17,
        category: DiagnosticCategory.Error,
        start: 200,
        length: 15,
        context: {
          errorText: "Cannot find name 'withTransaction'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      // Should add to existing import since database is already imported
      expect(result.changes[0].newText).toContain("withTransaction");
    });

    it('should handle database service with fallback pattern', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.DATABASE_SERVICE_FALLBACK, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'databaseService'",
        file: 'test.ts',
        line: 8,
        column: 17,
        category: DiagnosticCategory.Error,
        start: 200,
        length: 15,
        context: {
          errorText: "Cannot find name 'databaseService'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { databaseService } from '@shared/database'");
    });

    it('should handle complex transaction pattern', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.COMPLEX_TRANSACTION_PATTERN, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'withTransaction'",
        file: 'test.ts',
        line: 8,
        column: 17,
        category: DiagnosticCategory.Error,
        start: 200,
        length: 15,
        context: {
          errorText: "Cannot find name 'withTransaction'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      // Should add to existing import since writeDatabase is already imported from connection
      expect(result.changes[0].newText).toContain("withTransaction");
    });

    it('should handle health check pattern', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.HEALTH_CHECK_PATTERN, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'checkDatabaseHealth'",
        file: 'test.ts',
        line: 4,
        column: 21,
        category: DiagnosticCategory.Error,
        start: 100,
        length: 19,
        context: {
          errorText: "Cannot find name 'checkDatabaseHealth'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { checkDatabaseHealth } from '@shared/database/connection'");
    });

    it('should handle multi-database pattern', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.MULTI_DATABASE_PATTERN, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'readDatabase'",
        file: 'test.ts',
        line: 5,
        column: 17,
        category: DiagnosticCategory.Error,
        start: 120,
        length: 12,
        context: {
          errorText: "Cannot find name 'readDatabase'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { readDatabase } from '@shared/database/connection'");
    });
  });

  describe('Unused Import Cleanup', () => {
    it('should remove unused database imports', () => {
      const sourceFile = createSourceFile('test.ts', DATABASE_FIXTURES.UNUSED_DATABASE_IMPORTS, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 6133,
        message: "'withTransaction' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 20,
        category: DiagnosticCategory.Warning,
        start: 20,
        length: 15
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.message).toContain('Removed unused database import');
    });

    it('should not remove non-database unused imports', () => {
      const sourceCode = `import { someUtility } from '@shared/core';
import { database } from '@shared/database/connection';

const users = await database.select().from(usersTable);
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 6133,
        message: "'someUtility' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 10,
        category: DiagnosticCategory.Warning,
        start: 10,
        length: 11
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.changes).toHaveLength(0);
      expect(result.message).toContain('No unused database imports to remove');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown database utilities gracefully', () => {
      const sourceCode = `
const result = await unknownDatabaseFunction();
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'unknownDatabaseFunction'",
        file: 'test.ts',
        line: 2,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 19,
        length: 23,
        context: {
          errorText: "Cannot find name 'unknownDatabaseFunction'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not identify missing database utility');
    });

    it('should handle malformed source files gracefully', () => {
      const sourceCode = `import { database } from '@shared/database/connection';
// Malformed code that might cause parsing issues
const users = await database.select().from(`;
      
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'withTransaction'",
        file: 'test.ts',
        line: 3,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 80,
        length: 15,
        context: {
          errorText: "Cannot find name 'withTransaction'"
        }
      };

      // Should not throw an error, even with malformed code
      expect(() => {
        const result = fixer.fix(error, sourceFile, mockContext);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle files with many imports efficiently', () => {
      const sourceCode = `
import { database, readDatabase, writeDatabase } from '@shared/database/connection';
import { users, bills, sponsors, comments, notifications } from '@shared/schema';
import { eq, and, or, not, desc, asc, count, sum } from 'drizzle-orm';
import { logger } from '@shared/core';
import { ApiSuccess, ApiError } from '@shared/core';
import { validateRequest } from '@shared/core/validation';

// Missing: withTransaction
const result = await withTransaction(async (tx) => {
  return await tx.select().from(users);
});
`;
      
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'withTransaction'",
        file: 'test.ts',
        line: 9,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 400,
        length: 15,
        context: {
          errorText: "Cannot find name 'withTransaction'"
        }
      };

      const startTime = Date.now();
      const result = fixer.fix(error, sourceFile, mockContext);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(result.changes[0].newText).toContain(', withTransaction');
    });

    it('should handle empty source files', () => {
      const sourceFile = createSourceFile('test.ts', '', ScriptTarget.Latest);
      mockContext.sourceFile = sourceFile;

      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'database'",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 8,
        context: {
          errorText: "Cannot find name 'database'"
        }
      };

      const result = fixer.fix(error, sourceFile, mockContext);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { database } from '@shared/database/connection'");
    });
  });
});