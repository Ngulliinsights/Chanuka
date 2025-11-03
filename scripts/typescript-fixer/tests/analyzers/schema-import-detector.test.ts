import * as ts from 'typescript';
import { SchemaImportDetector } from '../../src/analyzers/schema-import-detector';
import { ProjectStructure, ProcessingContext } from '../../src/types/core';

describe('SchemaImportDetector', () => {
  let detector: SchemaImportDetector;
  let mockProjectStructure: ProjectStructure;
  let mockContext: ProcessingContext;

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
          comments: ['id', 'bill_id', 'user_id', 'comment_text', 'created_at'],
          'drizzle-orm': ['eq', 'and', 'or', 'desc', 'asc', 'sql']
        },
        importPaths: {
          users: '@shared/schema/foundation',
          bills: '@shared/schema/foundation',
          comments: '@shared/schema/citizen_participation',
          'drizzle-orm': 'drizzle-orm'
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

    mockContext = {
      project: mockProjectStructure,
      config: {} as any,
      sourceFile: {} as any,
      program: {} as any,
      typeChecker: {} as any,
      filePath: '/test/file.ts'
    };

    detector = new SchemaImportDetector(mockProjectStructure);
  });

  describe('detectSchemaImportIssues', () => {
    it('should detect missing schema table imports', () => {
      const sourceCode = `
        const user = users.findFirst({
          where: eq(users.id, userId)
        });
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);

      // Should detect missing 'users' import and missing 'eq' import
      expect(issues.length).toBeGreaterThanOrEqual(2);
      
      // Should detect missing 'users' import
      const usersImportIssue = issues.find(issue => issue.tableName === 'users' && issue.type === 'missing_import');
      expect(usersImportIssue).toBeDefined();
      expect(usersImportIssue?.suggestedImportPath).toBe('@shared/schema/foundation');

      // Should detect missing 'eq' import
      const eqImportIssue = issues.find(issue => issue.tableName === 'drizzle-orm');
      expect(eqImportIssue).toBeDefined();
      expect(eqImportIssue?.type).toBe('missing_drizzle_import');
    });

    it('should detect missing property references', () => {
      const sourceCode = `
        import { users } from '@shared/schema/foundation';
        
        const user = users.findFirst({
          where: eq(users.nonexistent_field, 'value')
        });
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);

      const propertyIssue = issues.find(issue => issue.type === 'missing_property');
      expect(propertyIssue).toBeDefined();
      expect(propertyIssue?.tableName).toBe('users');
      expect(propertyIssue?.propertyName).toBe('nonexistent_field');
    });

    it('should not report issues for existing imports', () => {
      const sourceCode = `
        import { users, bills } from '@shared/schema/foundation';
        import { eq, and } from 'drizzle-orm';
        
        const user = users.findFirst({
          where: and(
            eq(users.id, userId),
            eq(users.email, email)
          )
        });
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);

      // Should not report missing import issues since imports exist
      const missingImportIssues = issues.filter(issue => issue.type === 'missing_import');
      expect(missingImportIssues).toHaveLength(0);
    });

    it('should handle complex property access patterns', () => {
      const sourceCode = `
        const query = db.select().from(users).where(
          and(
            eq(users.email, 'test@example.com'),
            eq(bills.status, 'active')
          )
        );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);

      // Should detect missing imports for users, bills, eq, and and
      expect(issues.length).toBeGreaterThan(0);
      
      const tableNames = issues.map(issue => issue.tableName);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('bills');
    });
  });

  describe('validateSchemaTableReference', () => {
    it('should validate existing table references', () => {
      const result = detector.validateSchemaTableReference('users');

      expect(result.isValid).toBe(true);
      expect(result.correctImportPath).toBe('@shared/schema/foundation');
      expect(result.suggestions).toHaveLength(0);
    });

    it('should suggest similar table names for invalid references', () => {
      const result = detector.validateSchemaTableReference('user'); // singular instead of plural

      expect(result.isValid).toBe(false);
      expect(result.suggestions).toContain('users');
    });

    it('should validate property references', () => {
      const result = detector.validateSchemaTableReference('users', 'email');

      expect(result.isValid).toBe(true);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should suggest similar property names for invalid properties', () => {
      const result = detector.validateSchemaTableReference('users', 'mail'); // similar to 'email'

      expect(result.isValid).toBe(true); // table is valid
      expect(result.suggestions).toContain('email');
    });
  });

  describe('generateImportSuggestions', () => {
    it('should generate grouped import statements', () => {
      const issues = [
        {
          type: 'missing_import' as const,
          tableName: 'users',
          suggestedImport: 'users',
          suggestedImportPath: '@shared/schema/foundation',
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test'
        },
        {
          type: 'missing_import' as const,
          tableName: 'bills',
          suggestedImport: 'bills',
          suggestedImportPath: '@shared/schema/foundation',
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test'
        },
        {
          type: 'missing_drizzle_import' as const,
          tableName: 'drizzle-orm',
          suggestedImport: 'eq, and',
          suggestedImportPath: 'drizzle-orm',
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test'
        }
      ];

      const suggestions = detector.generateImportSuggestions(issues);

      expect(suggestions.has('@shared/schema/foundation')).toBe(true);
      expect(suggestions.has('drizzle-orm')).toBe(true);

      const foundationImports = suggestions.get('@shared/schema/foundation');
      expect(foundationImports).toContain("import { bills, users } from '@shared/schema/foundation';");

      const drizzleImports = suggestions.get('drizzle-orm');
      expect(drizzleImports).toContain("import { eq, and } from 'drizzle-orm';");
    });
  });

  describe('isSchemaRelatedFile', () => {
    it('should identify schema-related files', () => {
      const schemaRelatedCode = `
        import { users } from '@shared/schema/foundation';
        
        const user = users.findFirst({
          where: eq(users.id, userId)
        });
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        schemaRelatedCode,
        ts.ScriptTarget.Latest,
        true
      );

      expect(detector.isSchemaRelatedFile(sourceFile)).toBe(true);
    });

    it('should identify non-schema-related files', () => {
      const nonSchemaCode = `
        function calculateSum(a: number, b: number): number {
          return a + b;
        }
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        nonSchemaCode,
        ts.ScriptTarget.Latest,
        true
      );

      expect(detector.isSchemaRelatedFile(sourceFile)).toBe(false);
    });

    it('should detect database operation patterns', () => {
      const dbOperationCode = `
        const result = await database.select().from(someTable).where(condition);
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        dbOperationCode,
        ts.ScriptTarget.Latest,
        true
      );

      expect(detector.isSchemaRelatedFile(sourceFile)).toBe(true);
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

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);
      expect(issues).toHaveLength(0);
    });

    it('should handle files with only comments', () => {
      const sourceFile = ts.createSourceFile(
        'test.ts',
        '// This is just a comment\n/* Another comment */',
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);
      expect(issues).toHaveLength(0);
    });

    it('should handle complex nested expressions', () => {
      const sourceCode = `
        const complexQuery = db
          .select()
          .from(users)
          .leftJoin(bills, eq(bills.sponsor_id, users.id))
          .where(
            and(
              eq(users.role, 'admin'),
              or(
                eq(bills.status, 'active'),
                eq(bills.status, 'pending')
              )
            )
          );
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const issues = detector.detectSchemaImportIssues(sourceFile, mockContext);
      
      // Should detect all missing imports without crashing
      expect(issues.length).toBeGreaterThan(0);
      expect(() => detector.detectSchemaImportIssues(sourceFile, mockContext)).not.toThrow();
    });
  });
});