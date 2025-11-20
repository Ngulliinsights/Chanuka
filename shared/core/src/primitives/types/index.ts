// Result type for functional error handling
export type { Result } from './result';
export { Ok, Err, ok, err, isOk, isErr } from './result';

// Maybe type for optional values
export type { Maybe } from './maybe';
export { Some, None, none, some, isSome, isNone, fromNullable, toNullable, toUndefined } from './maybe';

// Branded types for type-safe primitives
export type {
  Brand,
  UserId,
  Email,
  PositiveInt,
  NonNegativeInt,
  Url,
  Uuid,
  Timestamp,
  Percentage
} from './branded';
export {
  brand,
  isBranded,
  unbrand,
  UserId as createUserId,
  Email as createEmail,
  PositiveInt as createPositiveInt,
  NonNegativeInt as createNonNegativeInt,
  Url as createUrl,
  Uuid as createUuid,
  Timestamp as createTimestamp,
  Percentage as createPercentage
} from './branded';







































