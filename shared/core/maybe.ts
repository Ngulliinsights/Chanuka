// ============================================================================
// MAYBE TYPE - Nullable Values
// ============================================================================
// Provides Maybe<T> type for handling nullable values explicitly.
// Inspired by functional programming patterns.

/**
 * Maybe type representing a value that may or may not exist.
 * Equivalent to T | null, but more explicit in intent.
 * 
 * @template T - Value type
 * 
 * @example Basic Usage
 * ```typescript
 * function findUser(id: string): Maybe<User> {
 *   const user = users.find(u => u.id === id);
 *   return user ?? null;
 * }
 * 
 * const user = findUser('123');
 * if (user !== null) {
 *   console.log('Found:', user.name);
 * } else {
 *   console.log('Not found');
 * }
 * ```
 * 
 * @example With Result Type
 * ```typescript
 * async function findUserById(id: string): Promise<Result<Maybe<User>, Error>> {
 *   return executeRead(async (db) => {
 *     const results = await db
 *       .select()
 *       .from(users)
 *       .where(eq(users.id, id))
 *       .limit(1);
 *     return results[0] ?? null;
 *   });
 * }
 * 
 * const result = await findUserById('123');
 * if (result.isOk) {
 *   const user = result.value;
 *   if (user !== null) {
 *     console.log('Found:', user.name);
 *   } else {
 *     console.log('Not found');
 *   }
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export type Maybe<T> = T | null;

/**
 * Type guard to check if Maybe value exists
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * if (isSome(user)) {
 *   console.log(user.name); // TypeScript knows user is not null
 * }
 * ```
 */
export function isSome<T>(value: Maybe<T>): value is T {
  return value !== null;
}

/**
 * Type guard to check if Maybe value is null
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * if (isNone(user)) {
 *   console.log('User not found');
 * }
 * ```
 */
export function isNone<T>(value: Maybe<T>): value is null {
  return value === null;
}

/**
 * Unwrap Maybe value or throw error
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const unwrapped = unwrapMaybe(user); // User or throws
 * ```
 */
export function unwrapMaybe<T>(value: Maybe<T>, message?: string): T {
  if (value === null) {
    throw new Error(message ?? 'Attempted to unwrap null value');
  }
  return value;
}

/**
 * Unwrap Maybe value or return default
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const unwrapped = unwrapMaybeOr(user, defaultUser);
 * ```
 */
export function unwrapMaybeOr<T>(value: Maybe<T>, defaultValue: T): T {
  return value ?? defaultValue;
}

/**
 * Map Maybe value to a new value
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const name = mapMaybe(user, u => u.name); // Maybe<string>
 * ```
 */
export function mapMaybe<T, U>(value: Maybe<T>, fn: (value: T) => U): Maybe<U> {
  return value !== null ? fn(value) : null;
}

/**
 * Chain Maybe operations
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const address = andThenMaybe(user, u => u.address); // Maybe<Address>
 * ```
 */
export function andThenMaybe<T, U>(
  value: Maybe<T>,
  fn: (value: T) => Maybe<U>
): Maybe<U> {
  return value !== null ? fn(value) : null;
}

/**
 * Filter Maybe value by predicate
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const activeUser = filterMaybe(user, u => u.isActive); // Maybe<User>
 * ```
 */
export function filterMaybe<T>(
  value: Maybe<T>,
  predicate: (value: T) => boolean
): Maybe<T> {
  return value !== null && predicate(value) ? value : null;
}

/**
 * Convert Maybe to array (empty array if null, single-element array otherwise)
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const users = maybeToArray(user); // User[] (0 or 1 element)
 * ```
 */
export function maybeToArray<T>(value: Maybe<T>): T[] {
  return value !== null ? [value] : [];
}

/**
 * Combine multiple Maybe values into a single Maybe containing an array
 * Returns null if any value is null
 * 
 * @example
 * ```typescript
 * const user = findUser('123');
 * const profile = findProfile('123');
 * const combined = combineMaybes([user, profile]); // Maybe<[User, Profile]>
 * ```
 */
export function combineMaybes<T>(values: Maybe<T>[]): Maybe<T[]> {
  const result: T[] = [];
  
  for (const value of values) {
    if (value === null) {
      return null;
    }
    result.push(value);
  }
  
  return result;
}
