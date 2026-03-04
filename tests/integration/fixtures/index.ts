/**
 * Test Fixtures
 * Provides test data generators
 */

export function createTestBill(overrides: any = {}) {
  return {
    bill_number: 'Bill No. 1 of 2024',
    title: 'Test Bill',
    summary: 'A test bill for integration testing',
    bill_type: 'public',
    status: 'first_reading',
    chamber: 'senate',
    introduced_date: new Date('2024-01-15'),
    ...overrides,
  };
}

export function createTestUser(overrides: any = {}) {
  return {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    full_name: 'Test User',
    ...overrides,
  };
}

export function createTestComment(overrides: any = {}) {
  return {
    content: 'This is a test comment',
    ...overrides,
  };
}

export function createTestSponsor(overrides: any = {}) {
  return {
    name: 'Senator Test',
    chamber: 'senate',
    party: 'jubilee',
    is_active: true,
    ...overrides,
  };
}
