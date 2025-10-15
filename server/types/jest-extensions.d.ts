// Jest custom matcher declarations used across tests
declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Asserts the value is one of the provided values.
       * Keep return type `void` to match common Jest matcher signatures.
       */
      toBeOneOf(values: readonly any[]): void;
    }
  }
}

export {};
