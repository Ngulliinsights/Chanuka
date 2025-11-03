import * as ts from 'typescript';
import { DrizzlePatternDetector } from '../../src/analyzers/drizzle-pattern-detector';
import { ProjectStructure } from '../../src/types/core';

describe('DrizzlePatternDetector', () => {
  let detector: DrizzlePatternDetector;
  let mockProjectStructure: ProjectStructure;

  beforeEach(() => {
    mockProjectStructure = {
      rootPath: '/test/project',
      tsConfigPath: '/test/project/tsconfig.json',
      sourceFiles: [],
      excludePatterns: [],
      compilerOptions: {},
      schema: {
        tables: {
          users: ['id', 'email', 'password_hash', 'role', 'created_at'],
          bills: ['id', 'title', 'summary', 'status', 'sponsor_id'],
          comments: ['id', 'bill_id', 'user_id', 'comment_text', 'created_at']
        },
        importPaths: {
          users: '@shared/schema/foundation',
          bills: '@shared/schema/foundation',
          comments: '@shared/schema/citizen_participation'
        }
      },
      sharedCore: {
        utilities: {},
        importPaths: {}
      },
      database: {
        connectionPatterns: [],
        servicePatterns: [],
        detectedUsages: [],
        commonImports: {}
      }
    };

    detector = new DrizzlePatternDetector(mockProjectStructure);
  });

  describe('detectDrizzlePatternIssues', () => {
    it('should detect missing Drizzle imports', () => {
      const sourceCode = `
        const user = db.select().from(users).where(
          eq(users.id, userId)
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const importIssue = issues.find(issue => issue.type === 'missing_drizzle_import');
      expect(importIssue).toBeDefined();
      expect(importIssue?.suggestedFix).toContain('import { eq } from \'drizzle-orm\';');
    });

    it('should validate comparison function arguments', () => {
      const sourceCode = `
        import { eq } from 'drizzle-orm';
        
        const user = db.select().from(users).where(
          eq(users.id) // Missing second argument
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const syntaxIssue = issues.find(issue => issue.type === 'incorrect_query_syntax');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.functionName).toBe('eq');
      expect(syntaxIssue?.suggestedFix).toContain('requires exactly 2 arguments');
    });

    it('should validate logical function arguments', () => {
      const sourceCode = `
        import { and } from 'drizzle-orm';
        
        const user = db.select().from(users).where(
          and(eq(users.id, userId)) // Missing second condition
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const syntaxIssue = issues.find(issue => issue.type === 'incorrect_query_syntax');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.functionName).toBe('and');
      expect(syntaxIssue?.suggestedFix).toContain('requires at least 2 arguments');
    });

    it('should validate array function arguments', () => {
      const sourceCode = `
        import { inArray } from 'drizzle-orm';
        
        const users = db.select().from(users).where(
          inArray(users.role) // Missing array argument
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const syntaxIssue = issues.find(issue => issue.type === 'incorrect_query_syntax');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.functionName).toBe('inArray');
      expect(syntaxIssue?.suggestedFix).toContain('requires exactly 2 arguments');
    });

    it('should validate LIKE function arguments', () => {
      const sourceCode = `
        import { like } from 'drizzle-orm';
        
        const users = db.select().from(users).where(
          like(users.email) // Missing pattern argument
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const syntaxIssue = issues.find(issue => issue.type === 'incorrect_query_syntax');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.functionName).toBe('like');
      expect(syntaxIssue?.suggestedFix).toContain('requires exactly 2 arguments');
    });

    it('should validate BETWEEN function arguments', () => {
      const sourceCode = `
        import { between } from 'drizzle-orm';
        
        const users = db.select().from(users).where(
          between(users.created_at, startDate) // Missing max argument
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const syntaxIssue = issues.find(issue => issue.type === 'incorrect_query_syntax');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.functionName).toBe('between');
      expect(syntaxIssue?.suggestedFix).toContain('requires exactly 3 arguments');
    });

    it('should detect invalid column references', () => {
      const sourceCode = `
        import { eq } from 'drizzle-orm';
        import { users } from '@shared/schema/foundation';
        
        const user = db.select().from(users).where(
          eq(users.nonexistent_column, 'value')
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      const columnIssue = issues.find(issue => issue.type === 'invalid_column_reference');
      expect(columnIssue).toBeDefined();
      expect(columnIssue?.tableName).toBe('users');
      expect(columnIssue?.columnName).toBe('nonexistent_column');
    });

    it('should not report issues for correct Drizzle usage', () => {
      const sourceCode = `
        import { eq, and, or, desc } from 'drizzle-orm';
        import { users, bills } from '@shared/schema/foundation';
        
        const result = db
          .select()
          .from(users)
          .leftJoin(bills, eq(bills.sponsor_id, users.id))
          .where(
            and(
              eq(users.role, 'admin'),
              or(
                eq(users.email, 'test@example.com'),
                eq(users.id, 123)
              )
            )
          )
          .orderBy(desc(users.created_at));
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      // Should not report any issues for correct usage
      expect(issues).toHaveLength(0);
    });

    it('should handle complex nested function calls', () => {
      const sourceCode = `
        const complexQuery = db
          .select()
          .from(users)
          .where(
            and(
              or(
                eq(users.role, 'admin'),
                eq(users.role, 'moderator')
              ),
              inArray(users.id, [1, 2, 3]),
              like(users.email, '%@example.com'),
              between(users.created_at, startDate, endDate)
            )
          );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);

      // Should detect missing imports but no syntax errors
      const importIssues = issues.filter(issue => issue.type === 'missing_drizzle_import');
      const syntaxIssues = issues.filter(issue => issue.type === 'incorrect_query_syntax');
      
      expect(importIssues.length).toBeGreaterThan(0);
      expect(syntaxIssues).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty source files', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        '',
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);
      expect(issues).toHaveLength(0);
    });

    it('should handle files without Drizzle usage', () => {
      const sourceCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);
      expect(issues).toHaveLength(0);
    });

    it('should handle property access on non-schema objects', () => {
      const sourceCode = `
        const obj = { name: 'test' };
        console.log(obj.name);
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);
      expect(issues).toHaveLength(0);
    });

    it('should handle function calls with spread arguments', () => {
      const sourceCode = `
        import { and } from 'drizzle-orm';
        
        const conditions = [condition1, condition2, condition3];
        const query = db.select().from(users).where(
          and(...conditions)
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);
      
      // Should not report argument count issues for spread arguments
      const syntaxIssues = issues.filter(issue => issue.type === 'incorrect_query_syntax');
      expect(syntaxIssues).toHaveLength(0);
    });

    it('should handle method chaining', () => {
      const sourceCode = `
        import { eq, desc } from 'drizzle-orm';
        import { users } from '@shared/schema/foundation';
        
        const query = db
          .select()
          .from(users)
          .where(eq(users.role, 'admin'))
          .orderBy(desc(users.created_at))
          .limit(10);
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectDrizzlePatternIssues(sourceFile);
      expect(issues).toHaveLength(0);
    });
  });
});