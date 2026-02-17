/**
 * Core utility types
 * Essential type utilities that are used across the application
 */

// Basic utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Object manipulation utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// Key extraction utilities
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Function utilities
export type Parameters<T extends (...args: unknown) => any> = T extends (...args: infer P) => any ? P : never;
export type ReturnType<T extends (...args: unknown) => any> = T extends (...args: unknown) => infer R ? R : unknown;

// Array utilities
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;
export type NonEmptyArray<T> = [T, ...T[]];

// String utilities
export type StringLiteral<T> = T extends string ? string extends T ? never : T : never;

// Conditional utilities
export type NonNullable<T> = T extends null | undefined ? never : T;
export type Exclude<T, U> = T extends U ? never : T;
export type Extract<T, U> = T extends U ? T : never;

// Object path utilities (simplified)
export type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? PathValue<T[K], Rest>
      : never
    : never;

// Re-export from common types
export type * from './common';