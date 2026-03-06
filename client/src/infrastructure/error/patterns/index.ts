/**
 * Error Handling Patterns (Strategic - Future Use)
 * 
 * Optional patterns for advanced error handling.
 * Not required for basic usage, but available when needed.
 */

export type { ClientResult, Ok, Err } from './result';
export {
  ok,
  err,
  isOk,
  isErr,
  safeAsync,
  safe,
  map,
  mapError,
  andThen,
  unwrap,
  unwrapOr,
  match,
  combine,
  fromPromise,
  tap,
  tapError,
} from './result';
