/**
 * Bill Test Fixtures
 * Factory functions for creating test bill data
 */

import { faker } from '@faker-js/faker';

export interface TestBill {
  bill_number: string;
  title: string;
  summary: string;
  bill_type: string;
  status: string;
  chamber: string;
  introduced_date: Date;
  sponsor_id?: string;
}

/**
 * Create a test bill with minimal required fields
 */
export function createTestBill(overrides: Partial<TestBill> = {}): TestBill {
  const year = new Date().getFullYear();
  const billNum = faker.number.int({ min: 1, max: 999 });
  
  return {
    bill_number: `Bill No. ${billNum} of ${year}`,
    title: faker.lorem.sentence({ min: 5, max: 15 }),
    summary: faker.lorem.paragraph(),
    bill_type: 'public',
    status: 'first_reading',
    chamber: 'national_assembly',
    introduced_date: faker.date.recent({ days: 30 }),
    ...overrides,
  };
}

/**
 * Create multiple test bills
 */
export function createTestBills(count: number, overrides: Partial<TestBill> = {}): TestBill[] {
  return Array.from({ length: count }, () => createTestBill(overrides));
}

/**
 * Create a bill in committee stage
 */
export function createBillInCommittee(overrides: Partial<TestBill> = {}): TestBill {
  return createTestBill({
    status: 'committee_stage',
    reading_stage: 'second',
    ...overrides,
  });
}

/**
 * Create a passed bill
 */
export function createPassedBill(overrides: Partial<TestBill> = {}): TestBill {
  return createTestBill({
    status: 'passed',
    reading_stage: 'third',
    ...overrides,
  });
}

/**
 * Create a rejected bill
 */
export function createRejectedBill(overrides: Partial<TestBill> = {}): TestBill {
  return createTestBill({
    status: 'rejected',
    ...overrides,
  });
}
