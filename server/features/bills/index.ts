// Bills Feature Domain - Domain-Driven Design Architecture
// Centralized exports for bill-related functionality organized by DDD layers

// Application Layer - Application services and use cases
export * from './application/index.js';

// Domain Layer - Domain entities, value objects, and business rules
export * from './domain/index.js';

// Infrastructure Layer - Repositories, external integrations, and infrastructure concerns
export * from './infrastructure/index.js';

// Presentation Layer - Controllers, routes, and presentation logic
export * from './presentation/index.js';

// Legacy exports for backward compatibility (to be deprecated)
export { BillService } from './application/bill-service.js';
export { billsService, BillNotFoundError, CommentNotFoundError, ValidationError } from './application/bills.js';
export { BillStorage, billStorage } from './infrastructure/bill-storage.js';
export * from './domain/LegislativeStorageTypes.js';








