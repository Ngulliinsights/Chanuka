import { describe, it, expect, beforeEach } from '@jest/globals';
import { createSourceFile, ScriptTarget, DiagnosticCategory } from 'typescript';
import { DatabaseConnectionFixer } from '../../src/fixers/database-connection-fixer';
import { TypeScriptError, ProcessingContext } from '../../src/types/core';

describe('DatabaseConnectionFixer', () => {
  let fixer: DatabaseConnectionFixer;

  beforeEach(() => {
    fixer = new DatabaseConnectionFixer();
  });

  describe('canHandle', () => {
    it('should handle database connection import errors (2307)', () => {
      const error: TypeScriptError = {
        code: 2307,
        message: "Cannot find module '@shared/database/connection'",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 10,
        context: {
          errorText: "Cannot find module '@shared/database/connection'"
        }
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle missing database utility errors (2304)', () => {
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'database'",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 10,
        context: {
          errorText: "Cannot find name 'database'"
        }
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle missing databaseService errors', () => {
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'databaseService'",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 10,
        context: {
          errorText: "Cannot find name 'databaseService'"
        }
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle Drizzle ORM import errors', () => {
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'eq'",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Error,
        start: 0,
        length: 10,
        context: {
          errorText: "Cannot find name 'eq'"
        }
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should handle unused import cleanup (6133)', () => {
      const error: TypeScriptError = {
        code: 6133,
        message: "'database' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 1,
        category: DiagnosticCategory.Warning,
        start: 0,
        length: 10
      };

      expect(fixer.canHandle(error)).toBe(true);
    });

    it('should not handle unrelated errors', () => {
      const error: TypeScriptError = {
        code: 2345,
        message: "Argument of type 'string' is not assignable to parameter of type 'number'",
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

  describe('fix - missing database connection imports', () => {
    it('should add missing database import', () => {
      const sourceCode = `
const users = await database.select().from(usersTable);
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'database'",
        file: 'test.ts',
        line: 2,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 19,
        length: 8,
        context: {
          errorText: "Cannot find name 'database'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toContain("import { database } from '@shared/database/connection'");
      expect(result.message).toContain('Added database import for database');
    });

    it('should add missing withTransaction import', () => {
      const sourceCode = `
const result = await withTransaction(async (tx) => {
  return await tx.insert(users).values({ name: 'test' });
});
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'withTransaction'",
        file: 'test.ts',
        line: 2,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 19,
        length: 15,
        context: {
          errorText: "Cannot find name 'withTransaction'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { withTransaction } from '@shared/database/connection'");
    });

    it('should add missing databaseService import', () => {
      const sourceCode = `
const result = await databaseService.withFallback(
  () => database.select().from(users),
  [],
  'get_users'
);
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'databaseService'",
        file: 'test.ts',
        line: 2,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 19,
        length: 15,
        context: {
          errorText: "Cannot find name 'databaseService'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { databaseService } from '@shared/database'");
    });

    it('should add missing Drizzle ORM imports', () => {
      const sourceCode = `
const users = await database.select().from(usersTable).where(eq(usersTable.id, 1));
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'eq'",
        file: 'test.ts',
        line: 2,
        column: 58,
        category: DiagnosticCategory.Error,
        start: 58,
        length: 2,
        context: {
          errorText: "Cannot find name 'eq'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { eq } from 'drizzle-orm'");
    });
  });

  describe('fix - add to existing imports', () => {
    it('should add to existing database connection import', () => {
      const sourceCode = `import { database } from '@shared/database/connection';

const result = await withTransaction(async (tx) => {
  return await tx.insert(users).values({ name: 'test' });
});
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
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

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('insert');
      expect(result.changes[0].newText).toBe(', withTransaction');
    });

    it('should add to existing Drizzle ORM import', () => {
      const sourceCode = `import { eq } from 'drizzle-orm';

const users = await database.select().from(usersTable).where(and(eq(usersTable.id, 1), eq(usersTable.active, true)));
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'and'",
        file: 'test.ts',
        line: 3,
        column: 58,
        category: DiagnosticCategory.Error,
        start: 85,
        length: 3,
        context: {
          errorText: "Cannot find name 'and'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe(', and');
    });
  });

  describe('fix - import path corrections', () => {
    it('should fix relative database connection paths', () => {
      const sourceCode = `import { database } from '../../../shared/database/connection';

const users = await database.select().from(usersTable);
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2307,
        message: "Cannot find module '../../../shared/database/connection'",
        file: 'test.ts',
        line: 1,
        column: 26,
        category: DiagnosticCategory.Error,
        start: 26,
        length: 42,
        context: {
          errorText: "Cannot find module '../../../shared/database/connection'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('replace');
      expect(result.changes[0].newText).toBe('@shared/database/connection');
    });

    it('should fix incorrect database service paths', () => {
      const sourceCode = `import { databaseService } from '../../infrastructure/database/database-service';

const result = await databaseService.getHealthStatus();
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2307,
        message: "Cannot find module '../../infrastructure/database/database-service'",
        file: 'test.ts',
        line: 1,
        column: 33,
        category: DiagnosticCategory.Error,
        start: 33,
        length: 50,
        context: {
          errorText: "Cannot find module '../../infrastructure/database/database-service'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toBe('@server/infrastructure/database/database-service');
    });
  });

  describe('fix - unused import cleanup', () => {
    it('should remove unused database import from single import', () => {
      const sourceCode = `import { database } from '@shared/database/connection';

console.log('Hello world');
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'database' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 10,
        category: DiagnosticCategory.Warning,
        start: 10,
        length: 8
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.message).toContain('Removed unused database import');
    });

    it('should remove unused import from multiple imports', () => {
      const sourceCode = `import { database, withTransaction } from '@shared/database/connection';

const result = await withTransaction(async (tx) => {
  return await tx.insert(users).values({ name: 'test' });
});
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 6133,
        message: "'database' is declared but its value is never read",
        file: 'test.ts',
        line: 1,
        column: 10,
        category: DiagnosticCategory.Warning,
        start: 10,
        length: 8
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('delete');
      expect(result.message).toContain('Removed unused database import');
    });

    it('should not remove non-database unused imports', () => {
      const sourceCode = `import { someUtility } from '@shared/core';

console.log('Hello world');
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
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

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.changes).toHaveLength(0);
      expect(result.message).toContain('No unused database imports to remove');
    });
  });

  describe('edge cases', () => {
    it('should handle already imported utilities', () => {
      const sourceCode = `import { database } from '@shared/database/connection';

const users = await database.select().from(usersTable);
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'database'",
        file: 'test.ts',
        line: 3,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 70,
        length: 8,
        context: {
          errorText: "Cannot find name 'database'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      // Should not add duplicate import
      expect(result.success).toBe(false);
      expect(result.changes).toHaveLength(0);
    });

    it('should handle unknown database utilities', () => {
      const sourceCode = `
const result = await unknownDatabaseUtility();
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
      const error: TypeScriptError = {
        code: 2304,
        message: "Cannot find name 'unknownDatabaseUtility'",
        file: 'test.ts',
        line: 2,
        column: 19,
        category: DiagnosticCategory.Error,
        start: 19,
        length: 22,
        context: {
          errorText: "Cannot find name 'unknownDatabaseUtility'"
        }
      };

      const result = fixer.fix(error, sourceFile);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not identify missing database utility');
    });

    it('should handle malformed import statements', () => {
      const sourceCode = `import database from '@shared/database/connection';

const users = await withTransaction(async (tx) => {
  return await tx.insert(users).values({ name: 'test' });
});
`;
      const sourceFile = createSourceFile('test.ts', sourceCode, ScriptTarget.Latest);
      
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

      const result = fixer.fix(error, sourceFile);

      // Should create new import since existing import is default import
      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newText).toContain("import { withTransaction } from '@shared/database/connection'");
    });
  });

  describe('getDescription', () => {
    it('should return appropriate description', () => {
      expect(fixer.getDescription()).toBe('Fixes missing database connection imports and database service patterns');
    });
  });

  describe('getPriority', () => {
    it('should return high priority', () => {
      expect(fixer.getPriority()).toBe(75);
    });
  });
});