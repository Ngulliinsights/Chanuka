/**
 * Schema Index - Simplified Exports
 * 
 * This file exports all database schemas organized by domain.
 * For type definitions, import from @shared/types instead.
 * 
 * @module server/infrastructure/schema
 */

// ============================================================================
// FOUNDATION - Core tables and base schemas
// ============================================================================
export * from './foundation';

// ============================================================================
// DOMAIN SCHEMAS - Feature-specific tables
// ============================================================================

// Citizen Participation
export * from './citizen_participation';

// Constitutional Intelligence
export * from './constitutional_intelligence';

// Argument Intelligence
export * from './argument_intelligence';

// Advocacy Coordination
export * from './advocacy_coordination';

// Universal Access
export * from './universal_access';

// Trojan Bill Detection
export * from './trojan_bill_detection';

// Parliamentary Process (may have duplicate exports with foundation)
// export * from './parliamentary_process';

// Political Economy
export * from './political_economy';

// Impact Measurement
export * from './impact_measurement';

// Safeguards (may have duplicate exports)
// export * from './safeguards';

// Advanced Discovery
export * from './advanced_discovery';

// Market Intelligence
export * from './market_intelligence';

// Accountability Ledger
export * from './accountability_ledger';

// Constitutional Compliance - commented out (file may not exist)
// export * from './constitutional_compliance';

// ============================================================================
// ENUMS - Shared enumerations
// ============================================================================
export * from './enum';

// ============================================================================
// NOTE: Type definitions have been moved to @shared/types
// ============================================================================
// For domain types (Bill, User, Comment, etc.), import from:
// - @shared/types/domains/legislative/bill
// - @shared/types/domains/authentication/user
// - @shared/types/domains/legislative/comment
//
// For base types (BaseEntity, UserTrackableEntity, etc.), import from:
// - @shared/types/core/base
//
// For branded types (BillId, UserId, etc.), import from:
// - @shared/types/core/branded
