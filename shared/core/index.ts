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
} from './maybe';
