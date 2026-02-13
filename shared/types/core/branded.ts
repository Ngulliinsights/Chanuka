/**
 * Branded Types for Entity Identifiers
 * Provides nominal typing to prevent mixing of similar primitive types
 * 
 * Example:
 * ```typescript
 * const userId: UserId = '123' as UserId;
 * const billId: BillId = '456' as BillId;
 * 
 * function getUser(id: UserId) { ... }
 * getUser(billId); // TypeScript error - cannot use BillId where UserId is expected
 * ```
 */

/**
 * Brand symbol for nominal typing
 * @internal
 */
declare const __brand: unique symbol;

/**
 * Branded type utility
 * Creates a nominal type from a base type
 */
export type Branded<T, TBrand extends string> = T & {
  readonly [__brand]: TBrand;
};

// ============================================================================
// Entity Identifier Branded Types
// ============================================================================

/**
 * User identifier - branded string to prevent ID mixing
 */
export type UserId = Branded<string, 'UserId'>;

/**
 * Bill identifier - branded string to prevent ID mixing
 */
export type BillId = Branded<string, 'BillId'>;

/**
 * Committee identifier - branded string to prevent ID mixing
 */
export type CommitteeId = Branded<string, 'CommitteeId'>;

/**
 * Comment identifier - branded string to prevent ID mixing
 */
export type CommentId = Branded<string, 'CommentId'>;

/**
 * Vote identifier - branded string to prevent ID mixing
 */
export type VoteId = Branded<string, 'VoteId'>;

/**
 * Session identifier - branded string to prevent ID mixing
 */
export type SessionId = Branded<string, 'SessionId'>;

/**
 * Notification identifier - branded string to prevent ID mixing
 */
export type NotificationId = Branded<string, 'NotificationId'>;

/**
 * Amendment identifier - branded string to prevent ID mixing
 */
export type AmendmentId = Branded<string, 'AmendmentId'>;

/**
 * Action identifier - branded string to prevent ID mixing
 */
export type ActionId = Branded<string, 'ActionId'>;

/**
 * Sponsor identifier - branded string to prevent ID mixing
 */
export type SponsorId = Branded<string, 'SponsorId'>;

/**
 * Argument identifier - branded string to prevent ID mixing
 */
export type ArgumentId = Branded<string, 'ArgumentId'>;

/**
 * Argument Evidence identifier - branded string to prevent ID mixing
 */
export type ArgumentEvidenceId = Branded<string, 'ArgumentEvidenceId'>;

/**
 * Bill Timeline Event identifier - branded string to prevent ID mixing
 */
export type BillTimelineEventId = Branded<string, 'BillTimelineEventId'>;

/**
 * Bill Committee Assignment identifier - branded string to prevent ID mixing
 */
export type BillCommitteeAssignmentId = Branded<string, 'BillCommitteeAssignmentId'>;

/**
 * Legislator identifier - branded string to prevent ID mixing
 */
export type LegislatorId = Branded<string, 'LegislatorId'>;

// ============================================================================
// Branded Type Utilities
// ============================================================================

/**
 * Creates a branded type from a raw value
 * Use with caution - only when you're certain the value is valid
 */
export function brand<T, TBrand extends string>(
  value: T
): Branded<T, TBrand> {
  return value as Branded<T, TBrand>;
}

/**
 * Removes the brand from a branded type
 * Returns the underlying primitive value
 */
export function unbrand<T, TBrand extends string>(
  value: Branded<T, TBrand>
): T {
  return value as T;
}

/**
 * Type guard to check if a value is a valid branded type
 * Note: This only checks the underlying type, not the brand itself
 */
export function isBrandedString(value: unknown): value is Branded<string, string> {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a valid UUID string
 * Useful for validating branded ID types
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
