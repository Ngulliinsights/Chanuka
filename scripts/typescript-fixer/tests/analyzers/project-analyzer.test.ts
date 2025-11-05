import { ProjectAnalyzer } from '../../src/analyzers/project-analyzer';
import { createTestProject, cleanupTestProject, writeTestFile } from '../setup';

describe('ProjectAnalyzer', () => {
  let testProjectRoot: string;
  let analyzer: ProjectAnalyzer;

  beforeEach(() => {
    testProjectRoot = createTestProject();
    analyzer = new ProjectAnalyzer(testProjectRoot);
  });

  afterEach(() => {
    cleanupTestProject(testProjectRoot);
  });

  describe('analyzeProject', () => {
    it('should analyze project structure successfully', async () => {
      const structure = await analyzer.analyzeProject();

      expect(structure).toBeDefined();
      expect(structure.rootPath).toBe(testProjectRoot);
      expect(structure.tsConfigPath).toContain('tsconfig.json');
      expect(structure.sourceFiles).toBeInstanceOf(Array);
      expect(structure.sourceFiles.length).toBeGreaterThan(0);
    });

    it('should identify schema tables with Drizzle ORM patterns', async () => {
      // Create a more realistic schema file
      writeTestFile(testProjectRoot, 'shared/schema/users.ts', `
import { pgTable, varchar, integer, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  bio: varchar('bio', { length: 1000 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
      `);

      const structure = await analyzer.analyzeProject();

      expect(structure.schema.tables).toBeDefined();
      expect(structure.schema.tables.users).toBeDefined();
      expect(structure.schema.tables.users).toContain('users');
      expect(structure.schema.tables.users).toContain('userProfiles');
      expect(structure.schema.tables.users).toContain('User');
      expect(structure.schema.tables.users).toContain('NewUser');
    });

    it('should identify shared core utilities from nested structure', async () => {
      // Create nested shared core structure
      writeTestFile(testProjectRoot, 'shared/core/src/observability/logging/logger.ts', `
export const logger = {
  info: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
  warn: (message: string) => console.warn(message),
};

export function createLogger(name: string) {
  return logger;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}
      `);

      writeTestFile(testProjectRoot, 'shared/core/src/utils/api/response-helpers.ts', `
export function ApiSuccess<T>(data: T, message?: string) {
  return { success: true, data, message };
}

export function ApiError(message: string, code?: number) {
  return { success: false, error: message, code };
}

export class ApiResponseWrapper {
  static createMetadata(total: number, page: number) {
    return { total, page };
  }
}
      `);

      const structure = await analyzer.analyzeProject();

      expect(structure.sharedCore.utilities).toBeDefined();
      expect(Object.keys(structure.sharedCore.utilities).length).toBeGreaterThan(0);
      
      // Check for nested utilities
      const hasLoggingUtils = Object.values(structure.sharedCore.utilities).some(utils => 
        utils.includes('logger') || utils.includes('createLogger')
      );
      const hasApiUtils = Object.values(structure.sharedCore.utilities).some(utils => 
        utils.includes('ApiSuccess') || utils.includes('ApiError')
      );
      
      expect(hasLoggingUtils).toBe(true);
      expect(hasApiUtils).toBe(true);
    });

    it('should analyze index files for re-exports', async () => {
      // Create an index file with re-exports
      writeTestFile(testProjectRoot, 'shared/core/src/utils/index.ts', `
export { logger, createLogger } from './logger';
export { ApiSuccess, ApiError } from './api-helpers';
export * from './validation';
      `);

      const structure = await analyzer.analyzeProject();

      expect(structure.sharedCore.utilities).toBeDefined();
      const hasReExports = Object.values(structure.sharedCore.utilities).some(utils => 
        utils.includes('logger') || utils.includes('ApiSuccess')
      );
      expect(hasReExports).toBe(true);
    });

    it('should set up correct import paths for nested modules', async () => {
      const structure = await analyzer.analyzeProject();

      expect(structure.schema.importPaths.users).toBe('@shared/schema/users');
      expect(structure.schema.importPaths['drizzle-orm']).toBe('drizzle-orm');
      
      // Check that import paths are properly formatted
      Object.values(structure.sharedCore.importPaths).forEach(path => {
        expect(path).toMatch(/^@shared\/core\/src/);
      });
    });

    it('should detect database patterns and service usage', async () => {
      // Create a file with database usage
      writeTestFile(testProjectRoot, 'server/services/user-service.ts', `
import { db } from '@shared/database/connection';
import { eq, and } from 'drizzle-orm';
import { users } from '@shared/schema/users';

export class UserService {
  async getUser(id: string) {
    return await db.select().from(users).where(eq(users.id, id));
  }
  
  async updateUser(id: string, data: any) {
    return await db.update(users).set(data).where(eq(users.id, id));
  }
}
      `);

      const structure = await analyzer.analyzeProject();

      expect(structure.database.connectionPatterns).toBeDefined();
      expect(structure.database.servicePatterns).toBeDefined();
      expect(structure.database.detectedUsages).toBeDefined();
      expect(structure.database.commonImports).toBeDefined();
      
      // Should detect common patterns
      expect(structure.database.connectionPatterns.length).toBeGreaterThan(0);
      expect(structure.database.servicePatterns.length).toBeGreaterThan(0);
    });

    it('should include Drizzle ORM helper functions', async () => {
      const structure = await analyzer.analyzeProject();

      expect(structure.schema.tables['drizzle-orm']).toBeDefined();
      expect(structure.schema.tables['drizzle-orm']).toContain('eq');
      expect(structure.schema.tables['drizzle-orm']).toContain('and');
      expect(structure.schema.tables['drizzle-orm']).toContain('desc');
      expect(structure.schema.tables['drizzle-orm']).toContain('sql');
    });

    it('should exclude test files and node_modules', async () => {
      const structure = await analyzer.analyzeProject();

      const hasTestFiles = structure.sourceFiles.some(file => 
        file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')
      );
      const hasNodeModules = structure.sourceFiles.some(file => 
        file.includes('node_modules')
      );

      expect(hasTestFiles).toBe(false);
      expect(hasNodeModules).toBe(false);
    });

    it('should handle missing directories gracefully', async () => {
      // Create analyzer for non-existent directory
      const missingDirAnalyzer = new ProjectAnalyzer('/non/existent/path');
      
      // Should not throw but return empty structure
      await expect(missingDirAnalyzer.analyzeProject()).rejects.toThrow();
    });

    it('should parse complex schema files with relations and enums', async () => {
      writeTestFile(testProjectRoot, 'shared/schema/complex.ts', `
import { pgTable, pgEnum, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const statusEnum = pgEnum('status', ['active', 'inactive', 'pending']);

export const organizations = pgTable('organizations', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: statusEnum('status').default('active'),
  created_at: timestamp('created_at').defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(users),
}));

export const organizationNameIndex = index('org_name_idx').on(organizations.name);

export type Organization = typeof organizations.$inferSelect;
      `);

      const structure = await analyzer.analyzeProject();

      expect(structure.schema.tables.complex).toBeDefined();
      expect(structure.schema.tables.complex).toContain('statusEnum');
      expect(structure.schema.tables.complex).toContain('organizations');
      expect(structure.schema.tables.complex).toContain('organizationsRelations');
      expect(structure.schema.tables.complex).toContain('organizationNameIndex');
      expect(structure.schema.tables.complex).toContain('Organization');
    });
  });
});