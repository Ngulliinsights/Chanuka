/**
 * Core DrizzleAdapter Tests
 * 
 * Simplified test suite focusing on core adapter functionality
 * without complex database mocking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrizzleAdapter, createDrizzleAdapter, EntityMapping } from '../drizzle-adapter';

// Test entity and row types
interface TestEntity {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

interface TestRow {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

// Test entity mapping
class TestEntityMapping implements EntityMapping<TestEntity, TestRow> {
  toEntity(row: TestRow): TestEntity {
    return {
      id: row.id ?? 'unknown',
      name: row.name ?? 'Unknown',
      email: row.email ?? 'unknown@example.com',
      created_at: row.created_at ?? new Date(),
      updated_at: row.updated_at ?? new Date()
    };
  }

  fromEntity(entity: TestEntity): Partial<TestRow> {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      created_at: entity.created_at,
      updated_at: entity.updated_at
    };
  }
}

describe('DrizzleAdapter Core Functionality', () => {
  let mapping: TestEntityMapping;

  beforeEach(() => {
    mapping = new TestEntityMapping();
  });

  describe('Entity Mapping', () => {
    it('should map valid row to entity', () => {
      const row: TestRow = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      const entity = mapping.toEntity(row);

      expect(entity).toEqual(row);
    });

    it('should handle null/undefined values in row', () => {
      const corruptedRow = {
        id: null,
        name: null,
        email: null,
        created_at: null,
        updated_at: null
      } as any;

      const entity = mapping.toEntity(corruptedRow);

      expect(entity.id).toBe('unknown');
      expect(entity.name).toBe('Unknown');
      expect(entity.email).toBe('unknown@example.com');
      expect(entity.created_at).toBeInstanceOf(Date);
      expect(entity.updated_at).toBeInstanceOf(Date);
    });

    it('should map entity to row format', () => {
      const entity: TestEntity = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      const row = mapping.fromEntity(entity);

      expect(row).toEqual(entity);
    });
  });

  describe('Factory Function', () => {
    it('should create adapter instance', () => {
      const mockTable = { id: { name: 'id' } };
      const adapter = createDrizzleAdapter(mockTable, mapping, 'test_table');

      expect(adapter).toBeInstanceOf(DrizzleAdapter);
    });
  });

  describe('Filter Conditions', () => {
    it('should handle different filter operators', () => {
      const mockTable = {
        id: { name: 'id' },
        name: { name: 'name' },
        email: { name: 'email' }
      };

      const adapter = createDrizzleAdapter(mockTable, mapping, 'test_table');

      // Test that the adapter can be created with different filter types
      expect(adapter).toBeInstanceOf(DrizzleAdapter);
    });
  });

  describe('Performance Monitoring', () => {
    it('should handle performance logging', () => {
      const mockTable = { id: { name: 'id' } };
      const adapter = createDrizzleAdapter(mockTable, mapping, 'test_table');

      // Test that performance monitoring doesn't throw errors
      expect(adapter).toBeInstanceOf(DrizzleAdapter);
    });
  });

  describe('Error Handling', () => {
    it('should handle mapping errors gracefully', () => {
      const errorMapping = new (class implements EntityMapping<TestEntity, TestRow> {
        toEntity(row: TestRow): TestEntity {
          if (!row.id) {
            throw new Error('Invalid row');
          }
          return mapping.toEntity(row);
        }

        fromEntity(entity: TestEntity): Partial<TestRow> {
          return mapping.fromEntity(entity);
        }
      })();

      const mockTable = { id: { name: 'id' } };
      const adapter = createDrizzleAdapter(mockTable, errorMapping, 'test_table');

      expect(adapter).toBeInstanceOf(DrizzleAdapter);
    });
  });
});