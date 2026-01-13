/**
 * Branded Types for Type Safety
 * Prevents accidental type mixing and provides compile-time safety
 */

/**
 * Branded types prevent accidental type mixing
 */
export type UserId = string & { readonly __brand: 'UserId' };
export type BillId = string & { readonly __brand: 'BillId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type ModerationId = string & { readonly __brand: 'ModerationId' };
export type ApiRequestId = string & { readonly __brand: 'ApiRequestId' };
export type LegislatorId = string & { readonly __brand: 'LegislatorId' };
export type CommitteeId = string & { readonly __brand: 'CommitteeId' };
export type SponsorId = string & { readonly __brand: 'SponsorId' };
export type AmendmentId = string & { readonly __brand: 'AmendmentId' };
export type ConferenceId = string & { readonly __brand: 'ConferenceId' };

/**
 * Utility to create branded types
 */
export function createBrandedId<T extends string>(
  value: string
): string & { readonly __brand: T } {
  return value as string & { readonly __brand: T };
}

/**
 * Type guard for branded IDs
 */
export function isBrandedId<T extends string>(
  value: unknown
): value is string & { readonly __brand: T } {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Common utility types
 */
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};
export type DeepPartial<T> = {
  [K in keyof T]?: DeepPartial<T[K]>;
};