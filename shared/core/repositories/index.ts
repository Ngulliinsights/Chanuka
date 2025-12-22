/**
 * Repository Layer Exports
 *
 * Central export point for all repository interfaces and implementations.
 * Provides schema-agnostic data access abstractions for bills and sponsors.
 */

// Repository Interfaces
export type { IBillRepository } from './interfaces/bill-repository.interface';
export type { ISponsorRepository } from './interfaces/sponsor-repository.interface';

// Test Repository Implementations
export { BillTestRepository } from './test-implementations/bill-test-repository';
export { SponsorTestRepository } from './test-implementations/sponsor-test-repository';


