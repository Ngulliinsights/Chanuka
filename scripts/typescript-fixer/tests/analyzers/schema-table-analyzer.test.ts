import * as ts from 'typescript';
import { SchemaTableAnalyzer } from '../../src/analyzers/schema-table-analyzer';
import { ProjectStructure } from '../../src/types/core';

describe('SchemaTableAnalyzer', () => {
  let analyzer: SchemaTableAnalyzer;
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

    analyzer = new SchemaTableAnalyzer(mockProjectStructure);
  });

  describe('analyzeSchemaTableUsage', () => {
    it('should detect property access usage', () => {
      const sourceCode = `
        const user = users.findFirst({
          where: eq(users.email, 'test@example.com')
        });
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const propertyUsages = usages.filter(usage => usage.usageType === 'property_access');
      expect(propertyUsages.length).toBeGreaterThan(0);

      const emailUsage = propertyUsages.find(usage => usage.propertyName === 'email');
      expect(emailUsage).toBeDefined();
      expect(emailUsage?.tableName).toBe('users');
      expect(emailUsage?.isValid).toBe(true);
    });

    it('should detect invalid property access', () => {
      const sourceCode = `
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

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const invalidUsage = usages.find(usage => 
        usage.propertyName === 'nonexistent_field' && !usage.isValid
      );
      expect(invalidUsage).toBeDefined();
      // The suggestions might be empty if no similar columns are found
      expect(invalidUsage?.suggestions).toBeDefined();
    });

    it('should detect identifier references', () => {
      const sourceCode = `
        const query = db.select().from(users);
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const identifierUsage = usages.find(usage => 
        usage.usageType === 'identifier_reference' && usage.tableName === 'users'
      );
      expect(identifierUsage).toBeDefined();
      expect(identifierUsage?.isValid).toBe(true);
    });

    it('should detect type references', () => {
      const sourceCode = `
        function createUser(userData: NewUser): Promise<User> {
          return db.insert(users).values(userData);
        }
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const typeUsages = usages.filter(usage => usage.usageType === 'type_reference');
      expect(typeUsages.length).toBeGreaterThan(0);
    });

    it('should identify required imports', () => {
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

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const usageWithImport = usages.find(usage => usage.requiredImport);
      expect(usageWithImport).toBeDefined();
      expect(usageWithImport?.requiredImport?.importName).toBe('users');
      expect(usageWithImport?.requiredImport?.importPath).toBe('@shared/schema/foundation');
    });

    it('should not suggest imports for already imported tables', () => {
      const sourceCode = `
        import { users } from '@shared/schema/foundation';
        
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

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const usagesWithImports = usages.filter(usage => usage.requiredImport);
      expect(usagesWithImports).toHaveLength(0);
    });

    it('should handle multiple table references', () => {
      const sourceCode = `
        const query = db
          .select()
          .from(users)
          .leftJoin(bills, eq(bills.sponsor_id, users.id))
          .leftJoin(comments, eq(comments.user_id, users.id));
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const tableNames = new Set(usages.map(usage => usage.tableName));
      expect(tableNames.has('users')).toBe(true);
      expect(tableNames.has('bills')).toBe(true);
      expect(tableNames.has('comments')).toBe(true);
    });
  });

  describe('groupUsagesByImportPath', () => {
    it('should group usages by import path', () => {
      const usages = [
        {
          tableName: 'users',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'users',
            importPath: '@shared/schema/foundation'
          }
        },
        {
          tableName: 'bills',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'bills',
            importPath: '@shared/schema/foundation'
          }
        },
        {
          tableName: 'comments',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'comments',
            importPath: '@shared/schema/citizen_participation'
          }
        }
      ];

      const groups = analyzer.groupUsagesByImportPath(usages);

      expect(groups.has('@shared/schema/foundation')).toBe(true);
      expect(groups.has('@shared/schema/citizen_participation')).toBe(true);

      const foundationUsages = groups.get('@shared/schema/foundation');
      expect(foundationUsages?.length).toBe(2);

      const participationUsages = groups.get('@shared/schema/citizen_participation');
      expect(participationUsages?.length).toBe(1);
    });
  });

  describe('generateImportStatements', () => {
    it('should generate import statements for required imports', () => {
      const usages = [
        {
          tableName: 'users',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'users',
            importPath: '@shared/schema/foundation'
          }
        },
        {
          tableName: 'bills',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'bills',
            importPath: '@shared/schema/foundation'
          }
        }
      ];

      const importStatements = analyzer.generateImportStatements(usages);

      expect(importStatements).toHaveLength(1);
      expect(importStatements[0]).toBe("import { bills, users } from '@shared/schema/foundation';");
    });

    it('should handle multiple import paths', () => {
      const usages = [
        {
          tableName: 'users',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'users',
            importPath: '@shared/schema/foundation'
          }
        },
        {
          tableName: 'comments',
          usageType: 'identifier_reference' as const,
          position: { start: 0, end: 0, line: 1, column: 1 },
          context: 'test',
          isValid: true,
          suggestions: [],
          requiredImport: {
            importName: 'comments',
            importPath: '@shared/schema/citizen_participation'
          }
        }
      ];

      const importStatements = analyzer.generateImportStatements(usages);

      expect(importStatements).toHaveLength(2);
      expect(importStatements).toContain("import { users } from '@shared/schema/foundation';");
      expect(importStatements).toContain("import { comments } from '@shared/schema/citizen_participation';");
    });
  });

  describe('getTableImportMapping', () => {
    it('should return mapping for known tables', () => {
      const mapping = analyzer.getTableImportMapping('users');

      expect(mapping).toBeDefined();
      expect(mapping?.tableName).toBe('users');
      expect(mapping?.importPath).toBe('@shared/schema/foundation');
      expect(mapping?.importType).toBe('named');
    });

    it('should return undefined for unknown tables', () => {
      const mapping = analyzer.getTableImportMapping('unknown_table');
      expect(mapping).toBeUndefined();
    });
  });

  describe('getKnownSchemaModules', () => {
    it('should return list of known schema modules', () => {
      const modules = analyzer.getKnownSchemaModules();

      expect(modules).toContain('foundation');
      expect(modules).toContain('citizen_participation');
      expect(modules).toContain('parliamentary_process');
      expect(modules.length).toBeGreaterThan(0);
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

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);
      expect(usages).toHaveLength(0);
    });

    it('should ignore identifiers in import declarations', () => {
      const sourceCode = `
        import { users, bills } from '@shared/schema/foundation';
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      // Should not report usage for identifiers in import declarations
      expect(usages).toHaveLength(0);
    });

    it('should handle complex property chains', () => {
      const sourceCode = `
        const result = users.relations.profile.avatar.url;
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      // Should detect the initial table reference
      const tableUsage = usages.find(usage => usage.tableName === 'users');
      expect(tableUsage).toBeDefined();
    });

    it('should handle method calls on tables', () => {
      const sourceCode = `
        const user = users.findFirst().then(result => result);
      `;

      const sourceFile = ts.createSourceFile(
        'test.ts',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const usages = analyzer.analyzeSchemaTableUsage(sourceFile);

      const tableUsage = usages.find(usage => usage.tableName === 'users');
      expect(tableUsage).toBeDefined();
    });
  });
});