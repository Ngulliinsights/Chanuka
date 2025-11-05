import { SchemaDefinitionParser } from '../../src/analyzers/schema-parser';
import { createTestProject, cleanupTestProject, writeTestFile } from '../setup';
import * as path from 'path';

describe('SchemaDefinitionParser', () => {
  let testProjectRoot: string;
  let parser: SchemaDefinitionParser;

  beforeEach(() => {
    testProjectRoot = createTestProject();
    parser = new SchemaDefinitionParser();
  });

  afterEach(() => {
    cleanupTestProject(testProjectRoot);
  });

  describe('parseSchemaContent', () => {
    it('should parse basic table definitions', () => {
      const content = `
import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
});
      `;

      const tables = parser.parseSchemaContent(content, 'users');

      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('users');
      expect(tables[0].tableName).toBe('users');
      expect(tables[0].columns.length).toBeGreaterThan(0);
      
      const idColumn = tables[0].columns.find(col => col.name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn?.type).toBe('integer');
      expect(idColumn?.primaryKey).toBe(true);
    });

    it('should parse table with relations', () => {
      const content = `
import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
});

export const posts = pgTable('posts', {
  id: integer('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
      `;

      const tables = parser.parseSchemaContent(content, 'blog');

      expect(tables).toHaveLength(2);
      
      const usersTable = tables.find(t => t.name === 'users');
      const postsTable = tables.find(t => t.name === 'posts');
      
      expect(usersTable).toBeDefined();
      expect(postsTable).toBeDefined();
    });

    it('should parse enums and indexes', () => {
      const content = `
import { pgTable, pgEnum, varchar, integer, index } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive', 'pending']);

export const organizations = pgTable('organizations', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: statusEnum('status').default('active'),
});

export const orgNameIndex = index('org_name_idx').on(organizations.name);
      `;

      const tables = parser.parseSchemaContent(content, 'organizations');

      expect(tables).toHaveLength(1);
      
      const orgTable = tables[0];
      expect(orgTable.name).toBe('organizations');
      expect(orgTable.columns.length).toBeGreaterThan(0);
    });
  });

  describe('extractExportableItems', () => {
    it('should extract all exportable items from schema file', () => {
      const content = `
import { pgTable, pgEnum, varchar, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const statusEnum = pgEnum('status', ['active', 'inactive']);

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  status: statusEnum('status'),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const userEmailIndex = index('user_email_idx').on(users.email);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export interface UserWithPosts extends User {
  posts: Post[];
}
      `;

      const items = parser.extractExportableItems(content);

      expect(items).toContain('statusEnum');
      expect(items).toContain('users');
      expect(items).toContain('usersRelations');
      expect(items).toContain('userEmailIndex');
      expect(items).toContain('User');
      expect(items).toContain('NewUser');
      expect(items).toContain('UserWithPosts');
      
      // Should not have duplicates
      expect(new Set(items).size).toBe(items.length);
    });

    it('should handle empty or invalid content gracefully', () => {
      const emptyContent = '';
      const invalidContent = 'this is not valid typescript';

      expect(parser.extractExportableItems(emptyContent)).toEqual([]);
      expect(parser.extractExportableItems(invalidContent)).toEqual([]);
    });

    it('should extract complex nested table definitions', () => {
      const content = `
export const complexTable = pgTable('complex_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: json('data').$type<{ nested: { value: string } }>(),
  metadata: json('metadata').$type<Record<string, any>>(),
  tags: varchar('tags', { length: 255 }).array(),
}, (table) => ({
  dataIndex: index('data_idx').on(table.data),
  uniqueConstraint: unique('unique_constraint').on(table.id, table.data),
}));
      `;

      const items = parser.extractExportableItems(content);

      expect(items).toContain('complexTable');
    });
  });

  describe('parseSchemaFile', () => {
    it('should parse actual schema file', () => {
      const schemaContent = `
import { pgTable, varchar, integer, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
      `;

      const filePath = path.join(testProjectRoot, 'test-schema.ts');
      writeTestFile(testProjectRoot, 'test-schema.ts', schemaContent);

      const tables = parser.parseSchemaFile(filePath);

      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('users');
      expect(tables[0].columns.length).toBeGreaterThan(0);
    });

    it('should handle file read errors gracefully', () => {
      const nonExistentFile = path.join(testProjectRoot, 'non-existent.ts');

      expect(() => parser.parseSchemaFile(nonExistentFile)).toThrow();
    });
  });
});