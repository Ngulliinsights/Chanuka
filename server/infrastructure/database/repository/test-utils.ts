// ============================================================================
// REPOSITORY TESTING UTILITIES
// ============================================================================
// Provides testing utilities for property-based testing of repositories
// including fast-check generators, mock factories, and test database utilities.

import * as fc from 'fast-check';
import type { Result } from '@shared/core/result';
import { Ok, Err } from '@shared/core/result';
import type { Maybe } from '@shared/core/maybe';

/**
 * fast-check generator for valid IDs (UUIDs)
 */
export const idArbitrary = fc.uuid();

/**
 * fast-check generator for email addresses
 */
export const emailArbitrary = fc.emailAddress();

/**
 * fast-check generator for phone numbers
 */
export const phoneArbitrary = fc
  .tuple(fc.integer({ min: 200, max: 999 }), fc.integer({ min: 1000000, max: 9999999 }))
  .map(([area, number]) => `+254${area}${number}`);

/**
 * fast-check generator for dates
 */
export const dateArbitrary = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-12-31'),
});

/**
 * fast-check generator for Bill entities
 */
export const billArbitrary = fc.record({
  id: idArbitrary,
  billNumber: fc.string({ minLength: 5, maxLength: 20 }),
  title: fc.string({ minLength: 10, maxLength: 200 }),
  description: fc.string({ minLength: 50, maxLength: 1000 }),
  status: fc.constantFrom('draft', 'introduced', 'committee', 'passed', 'rejected'),
  introducedDate: dateArbitrary,
  affectedCounties: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
  sponsorId: idArbitrary,
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
});

/**
 * fast-check generator for User entities
 */
export const userArbitrary = fc.record({
  id: idArbitrary,
  email: emailArbitrary,
  name: fc.string({ minLength: 3, maxLength: 100 }),
  phoneNumber: fc.option(phoneArbitrary, { nil: null }),
  county: fc.string({ minLength: 3, maxLength: 50 }),
  constituency: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: null }),
  isVerified: fc.boolean(),
  verificationToken: fc.option(fc.uuid(), { nil: null }),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
});

/**
 * fast-check generator for Sponsor entities
 */
export const sponsorArbitrary = fc.record({
  id: idArbitrary,
  name: fc.string({ minLength: 3, maxLength: 100 }),
  party: fc.constantFrom('Jubilee', 'ODM', 'UDA', 'Wiper', 'Independent'),
  constituency: fc.string({ minLength: 3, maxLength: 50 }),
  county: fc.string({ minLength: 3, maxLength: 50 }),
  email: fc.option(emailArbitrary, { nil: null }),
  phoneNumber: fc.option(phoneArbitrary, { nil: null }),
  isActive: fc.boolean(),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
});

/**
 * fast-check generator for Committee entities
 */
export const committeeArbitrary = fc.record({
  id: idArbitrary,
  name: fc.string({ minLength: 10, maxLength: 100 }),
  description: fc.string({ minLength: 50, maxLength: 500 }),
  chairpersonId: idArbitrary,
  memberIds: fc.array(idArbitrary, { minLength: 3, maxLength: 15 }),
  isActive: fc.boolean(),
  createdAt: dateArbitrary,
  updatedAt: dateArbitrary,
});

/**
 * Test data builder for Bills
 */
export class BillBuilder {
  private data: Record<string, unknown> = {
    id: fc.sample(idArbitrary, 1)[0],
    billNumber: 'BILL-2024-001',
    title: 'Test Bill',
    description: 'Test bill description for testing purposes',
    status: 'draft',
    introducedDate: new Date(),
    affectedCounties: ['Nairobi', 'Mombasa'],
    sponsorId: fc.sample(idArbitrary, 1)[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withBillNumber(billNumber: string): this {
    this.data.billNumber = billNumber;
    return this;
  }

  withTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  withStatus(status: string): this {
    this.data.status = status;
    return this;
  }

  withSponsorId(sponsorId: string): this {
    this.data.sponsorId = sponsorId;
    return this;
  }

  withAffectedCounties(counties: string[]): this {
    this.data.affectedCounties = counties;
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.data };
  }
}

/**
 * Test data builder for Users
 */
export class UserBuilder {
  private data: Record<string, unknown> = {
    id: fc.sample(idArbitrary, 1)[0],
    email: 'test@example.com',
    name: 'Test User',
    phoneNumber: '+254712345678',
    county: 'Nairobi',
    constituency: 'Westlands',
    isVerified: false,
    verificationToken: fc.sample(idArbitrary, 1)[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withCounty(county: string): this {
    this.data.county = county;
    return this;
  }

  withVerified(isVerified: boolean): this {
    this.data.isVerified = isVerified;
    return this;
  }

  build(): Record<string, unknown> {
    return { ...this.data };
  }
}

/**
 * Mock repository for testing
 */
export class MockRepository<T> {
  private data = new Map<string, T>();
  private callLog: Array<{ method: string; args: unknown[] }> = [];

  /**
   * Add test data to mock repository
   */
  seed(id: string, entity: T): void {
    this.data.set(id, entity);
  }

  /**
   * Clear all test data
   */
  clear(): void {
    this.data.clear();
    this.callLog = [];
  }

  /**
   * Get call log for assertions
   */
  getCalls(): Array<{ method: string; args: unknown[] }> {
    return [...this.callLog];
  }

  /**
   * Mock findById method
   */
  async findById(id: string): Promise<Result<Maybe<T>, Error>> {
    this.callLog.push({ method: 'findById', args: [id] });
    const entity = this.data.get(id) ?? null;
    return new Ok(entity);
  }

  /**
   * Mock create method
   */
  async create(entity: T & { id: string }): Promise<Result<T, Error>> {
    this.callLog.push({ method: 'create', args: [entity] });
    this.data.set(entity.id, entity);
    return new Ok(entity);
  }

  /**
   * Mock update method
   */
  async update(id: string, updates: Partial<T>): Promise<Result<T, Error>> {
    this.callLog.push({ method: 'update', args: [id, updates] });
    const existing = this.data.get(id);
    if (!existing) {
      return new Err(new Error(`Entity not found: ${id}`));
    }
    const updated = { ...existing, ...updates };
    this.data.set(id, updated);
    return new Ok(updated);
  }

  /**
   * Mock delete method
   */
  async delete(id: string): Promise<Result<void, Error>> {
    this.callLog.push({ method: 'delete', args: [id] });
    this.data.delete(id);
    return new Ok(undefined);
  }

  /**
   * Get all entities (for testing)
   */
  getAll(): T[] {
    return Array.from(this.data.values());
  }

  /**
   * Get entity count (for testing)
   */
  count(): number {
    return this.data.size;
  }
}

/**
 * Mock repository factory
 */
export function createMockRepository<T>(): MockRepository<T> {
  return new MockRepository<T>();
}

/**
 * Test database utilities
 */
export class TestDatabase {
  private static instance: TestDatabase | null = null;

  private constructor() {}

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  /**
   * Setup test database (run before tests)
   */
  async setup(): Promise<void> {
    // TODO: Implement test database setup
    // - Create test database
    // - Run migrations
    // - Seed initial data
  }

  /**
   * Teardown test database (run after tests)
   */
  async teardown(): Promise<void> {
    // TODO: Implement test database teardown
    // - Drop test database
    // - Clean up connections
  }

  /**
   * Clear all data from test database (run between tests)
   */
  async clear(): Promise<void> {
    // TODO: Implement test database clear
    // - Truncate all tables
    // - Reset sequences
  }

  /**
   * Begin transaction for test isolation
   */
  async beginTransaction(): Promise<void> {
    // TODO: Implement transaction begin
  }

  /**
   * Rollback transaction after test
   */
  async rollbackTransaction(): Promise<void> {
    // TODO: Implement transaction rollback
  }
}

/**
 * Property test helpers
 */
export const propertyTestHelpers = {
  /**
   * Run property test with default configuration
   */
  async runPropertyTest<T>(
    _name: string,
    arbitrary: fc.Arbitrary<T>,
    predicate: (value: T) => Promise<boolean | void>,
    options?: fc.Parameters<[T]>
  ): Promise<void> {
    await fc.assert(
      fc.asyncProperty(arbitrary, predicate),
      {
        numRuns: 100,
        verbose: true,
        ...options,
      }
    );
  },

  /**
   * Create idempotent property test
   * Tests that operation(operation(x)) === operation(x)
   */
  idempotentProperty<T>(
    operation: (value: T) => T | Promise<T>
  ): (value: T) => Promise<boolean> {
    return async (value: T) => {
      const once = await operation(value);
      const twice = await operation(once);
      return JSON.stringify(once) === JSON.stringify(twice);
    };
  },

  /**
   * Create round-trip property test
   * Tests that decode(encode(x)) === x
   */
  roundTripProperty<T, U>(
    encode: (value: T) => U | Promise<U>,
    decode: (value: U) => T | Promise<T>
  ): (value: T) => Promise<boolean> {
    return async (value: T) => {
      const encoded = await encode(value);
      const decoded = await decode(encoded);
      return JSON.stringify(value) === JSON.stringify(decoded);
    };
  },

  /**
   * Create commutativity property test
   * Tests that operation(a, b) === operation(b, a)
   */
  commutativeProperty<T, R>(
    operation: (a: T, b: T) => R | Promise<R>
  ): (a: T, b: T) => Promise<boolean> {
    return async (a: T, b: T) => {
      const forward = await operation(a, b);
      const backward = await operation(b, a);
      return JSON.stringify(forward) === JSON.stringify(backward);
    };
  },

  /**
   * Create associativity property test
   * Tests that operation(operation(a, b), c) === operation(a, operation(b, c))
   */
  associativeProperty<T>(
    operation: (a: T, b: T) => T | Promise<T>
  ): (a: T, b: T, c: T) => Promise<boolean> {
    return async (a: T, b: T, c: T) => {
      const left = await operation(await operation(a, b), c);
      const right = await operation(a, await operation(b, c));
      return JSON.stringify(left) === JSON.stringify(right);
    };
  },
};

/**
 * Assertion helpers for tests
 */
export const assertionHelpers = {
  /**
   * Assert Result is Ok
   */
  assertOk<T, E extends Error>(result: Result<T, E>): asserts result is Ok<T> {
    if (!result.isOk) {
      throw new Error(`Expected Ok, got Err: ${result.error.message}`);
    }
  },

  /**
   * Assert Result is Err
   */
  assertErr<T, E extends Error>(result: Result<T, E>): asserts result is Err<E> {
    if (!result.isErr) {
      throw new Error(`Expected Err, got Ok: ${JSON.stringify(result.value)}`);
    }
  },

  /**
   * Assert Maybe is Some (not null)
   */
  assertSome<T>(value: Maybe<T>): asserts value is T {
    if (value === null) {
      throw new Error('Expected Some, got None (null)');
    }
  },

  /**
   * Assert Maybe is None (null)
   */
  assertNone<T>(value: Maybe<T>): asserts value is null {
    if (value !== null) {
      throw new Error(`Expected None, got Some: ${JSON.stringify(value)}`);
    }
  },
};
