import { DatabasePatternDetector } from '../../src/analyzers/database-pattern-detector';
import { createTestProject, cleanupTestProject, writeTestFile } from '../setup';

describe('DatabasePatternDetector', () => {
  let testProjectRoot: string;
  let detector: DatabasePatternDetector;

  beforeEach(() => {
    testProjectRoot = createTestProject();
    detector = new DatabasePatternDetector(testProjectRoot);
  });

  afterEach(() => {
    cleanupTestProject(testProjectRoot);
  });

  describe('analyzePatterns', () => {
    it('should detect database connection patterns', async () => {
      writeTestFile(testProjectRoot, 'server/services/user-service.ts', `
import { db } from '@shared/database/connection';
import { eq, and } from 'drizzle-orm';
import { users } from '@shared/schema/users';

export class UserService {
  async getUser(id: string) {
    return await db.select().from(users).where(eq(users.id, id));
  }
}
      `);

      writeTestFile(testProjectRoot, 'server/services/post-service.ts', `
import { databaseService } from '../database/connection';
import { posts } from '@shared/schema/posts';

export class PostService {
  async getPosts() {
    return await databaseService.query('SELECT * FROM posts');
  }
}
      `);

      const analysis = await detector.analyzePatterns();

      expect(analysis.connectionPatterns).toBeDefined();
      expect(analysis.servicePatterns).toBeDefined();
      expect(analysis.detectedUsages).toBeDefined();
      expect(analysis.commonImports).toBeDefined();

      // Should detect connection patterns
      expect(analysis.connectionPatterns.length).toBeGreaterThan(0);
      expect(analysis.servicePatterns.length).toBeGreaterThan(0);
    });

    it('should detect service usage patterns', async () => {
      writeTestFile(testProjectRoot, 'server/api/users.ts', `
import { db } from '@shared/database/connection';
import { eq, desc } from 'drizzle-orm';

export async function getUsers() {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  return users;
}

export async function createUser(data: any) {
  const result = await db.insert(usersTable).values(data).returning();
  return result[0];
}
      `);

      const analysis = await detector.analyzePatterns();

      expect(analysis.detectedUsages.length).toBeGreaterThan(0);
      
      const dbUsage = analysis.detectedUsages.find(usage => usage.serviceName === 'db');
      expect(dbUsage).toBeDefined();
      expect(dbUsage?.methods).toContain('select');
      expect(dbUsage?.methods).toContain('insert');
    });

    it('should detect Drizzle ORM patterns', async () => {
      writeTestFile(testProjectRoot, 'server/queries/complex-query.ts', `
import { db } from '@shared/database/connection';
import { eq, and, or, desc, asc, sql, count, sum } from 'drizzle-orm';
import { users, posts } from '@shared/schema';

export async function complexQuery() {
  return await db
    .select({
      user: users,
      postCount: count(posts.id),
      totalViews: sum(posts.views),
    })
    .from(users)
    .leftJoin(posts, eq(users.id, posts.userId))
    .where(
      and(
        eq(users.isActive, true),
        or(
          eq(posts.status, 'published'),
          sql\`\${posts.createdAt} > NOW() - INTERVAL '30 days'\`
        )
      )
    )
    .groupBy(users.id)
    .orderBy(desc(count(posts.id)))
    .limit(10);
}
      `);

      const analysis = await detector.analyzePatterns();

      // Should detect Drizzle patterns
      const hasDrizzlePatterns = analysis.connectionPatterns.some(pattern => 
        pattern.includes('drizzle-orm')
      );
      expect(hasDrizzlePatterns).toBe(true);

      // Should detect query methods in either service patterns or connection patterns
      const hasQueryMethods = [...analysis.servicePatterns, ...analysis.connectionPatterns].some(pattern => 
        ['select', 'from', 'where', 'orderBy', 'limit'].includes(pattern) ||
        pattern.includes('select') || pattern.includes('from') || pattern.includes('where')
      );
      expect(hasQueryMethods).toBe(true);
    });

    it('should detect common database imports', async () => {
      writeTestFile(testProjectRoot, 'server/database/setup.ts', `
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '@shared/schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });

export async function runMigrations() {
  await migrate(db, { migrationsFolder: './drizzle' });
}
      `);

      const analysis = await detector.analyzePatterns();

      expect(analysis.commonImports).toBeDefined();
      expect(Object.keys(analysis.commonImports).length).toBeGreaterThan(0);
      
      // Should detect drizzle-related imports
      const hasDrizzleImports = Object.values(analysis.commonImports).some(path => 
        path.includes('drizzle')
      );
      expect(hasDrizzleImports).toBe(true);
    });

    it('should handle files with no database patterns', async () => {
      writeTestFile(testProjectRoot, 'client/components/Button.tsx', `
import React from 'react';

export function Button({ children, onClick }: any) {
  return <button onClick={onClick}>{children}</button>;
}
      `);

      const analysis = await detector.analyzePatterns();

      // Should still return valid structure even with no database patterns
      expect(analysis.connectionPatterns).toBeDefined();
      expect(analysis.servicePatterns).toBeDefined();
      expect(analysis.detectedUsages).toBeDefined();
      expect(analysis.commonImports).toBeDefined();
    });
  });

  describe('analyzeFile', () => {
    it('should analyze specific file for database patterns', async () => {
      const filePath = 'server/services/test-service.ts';
      writeTestFile(testProjectRoot, filePath, `
import { db } from '@shared/database/connection';
import { eq } from 'drizzle-orm';

export class TestService {
  async getData() {
    return await db.select().from(table).where(eq(table.id, 1));
  }
  
  private databaseService = db;
}
      `);

      const fullPath = require('path').join(testProjectRoot, filePath);
      const patterns = detector.analyzeFile(fullPath);

      expect(patterns.length).toBeGreaterThan(0);
      
      const importPattern = patterns.find(p => p.type === 'import');
      const usagePattern = patterns.find(p => p.type === 'usage');
      const servicePattern = patterns.find(p => p.type === 'service');

      expect(importPattern).toBeDefined();
      expect(usagePattern).toBeDefined();
    });

    it('should provide line numbers and context', async () => {
      const filePath = 'server/test.ts';
      writeTestFile(testProjectRoot, filePath, `
// Line 1
import { db } from '@shared/database/connection';
// Line 3
export async function test() {
  // Line 5
  const result = await db.select().from(table);
  return result;
}
      `);

      const fullPath = require('path').join(testProjectRoot, filePath);
      const patterns = detector.analyzeFile(fullPath);

      expect(patterns.length).toBeGreaterThan(0);
      
      patterns.forEach(pattern => {
        expect(pattern.lineNumber).toBeGreaterThan(0);
        expect(pattern.context).toBeDefined();
        expect(pattern.filePath).toBe(fullPath);
      });
    });

    it('should handle file read errors gracefully', () => {
      const nonExistentFile = require('path').join(testProjectRoot, 'non-existent.ts');
      
      const patterns = detector.analyzeFile(nonExistentFile);
      
      expect(patterns).toEqual([]);
    });
  });
});