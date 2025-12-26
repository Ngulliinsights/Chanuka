/**
 * Drizzle Persistence Layer Exports
 *
 * Central export point for all Drizzle-based repository implementations
 */

// Imports
import { DrizzleBillRepository } from './drizzle-bill-repository';
import { DrizzleSponsorRepository } from './drizzle-sponsor-repository';
import { DrizzleUserRepository } from './drizzle-user-repository';
import { DatabasePriority, HybridBillRepository, HybridRepositoryConfig } from './hybrid-bill-repository';

// Repository Interfaces
export type { IBillRepository } from '@server/domain/interfaces/bill-repository.interface';
export type { IUserRepository } from '@server/domain/interfaces/user-repository.interface';
export type { ISponsorRepository } from '@server/domain/interfaces/sponsor-repository.interface';

// Concrete Repository Implementations
export { DrizzleBillRepository } from './drizzle-bill-repository';
export { DrizzleUserRepository } from './drizzle-user-repository';
export { DrizzleSponsorRepository } from './drizzle-sponsor-repository';

// Hybrid Repository for Migration Support
export { HybridBillRepository, DatabasePriority } from './hybrid-bill-repository';
export type { HybridRepositoryConfig } from './hybrid-bill-repository';

// Factory Functions
export function createDrizzleBillRepository(): DrizzleBillRepository {
  return new DrizzleBillRepository();
}

export function createDrizzleUserRepository(): DrizzleUserRepository {
  return new DrizzleUserRepository();
}

export function createDrizzleSponsorRepository(): DrizzleSponsorRepository {
  return new DrizzleSponsorRepository();
}

export function createHybridBillRepository(
  config: HybridRepositoryConfig
): HybridBillRepository {
  const drizzleRepo = createDrizzleBillRepository();
  return new HybridBillRepository(drizzleRepo, config);
}