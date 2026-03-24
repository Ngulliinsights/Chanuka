// ============================================================================
// CORE UTILITIES - Exports
// ============================================================================

// Result type
export {
  type Result,
  Ok,
  Err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  combineResults,
  fromPromise,
  fromThrowable,
} from './result';

// Maybe type
export {
  type Maybe,
  isSome,
  isNone,
  unwrapMaybe,
  unwrapMaybeOr,
  mapMaybe,
  andThenMaybe,
  filterMaybe,
  maybeToArray,
  combineMaybes,
  some,
  none,
} from './maybe';

// Error types
export {
  ValidationError,
  TransformationError,
  NetworkError,
  ErrorDomain,
  ErrorSeverity,
} from '../types';
