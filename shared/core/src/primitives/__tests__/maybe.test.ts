import { describe, it, expect } from 'vitest';
import { some, none, isSome, isNone, fromNullable, toNullable, toUndefined, Maybe } from '../types/maybe';

describe('Maybe<T>', () => {
  describe('Some variant', () => {
    it('should create Some with value', () => {
      const maybe = some(42);
      expect(maybe.isSome()).toBe(true);
      expect(maybe.isNone()).toBe(false);
      expect(maybe.unwrap()).toBe(42);
    });

    it('should handle unwrapOr correctly', () => {
      const maybe = some('hello');
      expect(maybe.unwrapOr('default')).toBe('hello');
    });

    it('should handle expect correctly', () => {
      const maybe = some(123);
      expect(maybe.expect('should not fail')).toBe(123);
    });

    it('should map values correctly', () => {
      const maybe = some(5).map(x => x * 2);
      expect(maybe.unwrap()).toBe(10);
    });

    it('should chain with andThen', () => {
      const maybe = some(5).andThen(x => some(x * 2));
      expect(maybe.unwrap()).toBe(10);
    });

    it('should handle match correctly', () => {
      const maybe = some(42);
      const value = maybe.match(
        x => `value: ${x}`,
        () => 'none'
      );
      expect(value).toBe('value: 42');
    });

    it('should filter correctly', () => {
      const even = some(4).filter(x => x % 2 === 0);
      const odd = some(5).filter(x => x % 2 === 0);

      expect(even.isSome()).toBe(true);
      expect(even.unwrap()).toBe(4);
      expect(odd.isNone()).toBe(true);
    });
  });

  describe('None variant', () => {
    it('should create None', () => {
      const maybe = none;
      expect(maybe.isSome()).toBe(false);
      expect(maybe.isNone()).toBe(true);
      expect(() => maybe.unwrap()).toThrow('Called unwrap on None');
    });

    it('should handle unwrapOr correctly', () => {
      const maybe = none;
      expect(maybe.unwrapOr('default')).toBe('default');
    });

    it('should handle expect correctly', () => {
      const maybe = none;
      expect(() => maybe.expect('custom message')).toThrow('custom message');
    });

    it('should map as no-op for None', () => {
      const maybe = none.map(() => 42);
      expect(maybe.isNone()).toBe(true);
    });

    it('should andThen as no-op for None', () => {
      const maybe = none.andThen(() => some(42));
      expect(maybe.isNone()).toBe(true);
    });

    it('should handle match correctly', () => {
      const maybe = none;
      const value = maybe.match(
        x => `value: ${x}`,
        () => 'none value'
      );
      expect(value).toBe('none value');
    });

    it('should filter as no-op for None', () => {
      const maybe = none.filter(() => true);
      expect(maybe.isNone()).toBe(true);
    });
  });

  describe('Type guards', () => {
    it('should correctly identify Some values', () => {
      const maybe: Maybe<number> = some(42);
      expect(isSome(maybe)).toBe(true);
      expect(isNone(maybe)).toBe(false);

      if (isSome(maybe)) {
        expect(maybe.value).toBe(42);
      }
    });

    it('should correctly identify None values', () => {
      const maybe: Maybe<number> = none;
      expect(isSome(maybe)).toBe(false);
      expect(isNone(maybe)).toBe(true);
    });
  });

  describe('Nullable conversion', () => {
    it('should convert from nullable values', () => {
      expect(fromNullable(42).unwrap()).toBe(42);
      expect(fromNullable(null).isNone()).toBe(true);
      expect(fromNullable(undefined).isNone()).toBe(true);
      expect(fromNullable(0).unwrap()).toBe(0); // falsy but not null/undefined
    });

    it('should convert to nullable values', () => {
      expect(toNullable(some(42))).toBe(42);
      expect(toNullable(none)).toBe(null);
    });

    it('should convert to undefined values', () => {
      expect(toUndefined(some(42))).toBe(42);
      expect(toUndefined(none)).toBe(undefined);
    });
  });

  describe('Complex chaining', () => {
    it('should handle complex Maybe chains', () => {
      function safeDivide(a: number, b: number): Maybe<number> {
        return b === 0 ? none : some(a / b);
      }

      function safeMultiply(x: number, factor: number): Maybe<number> {
        return some(x * factor);
      }

      const result = safeDivide(10, 2)
        .andThen(x => safeMultiply(x, 3))
        .map(x => x + 1);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(16); // (10/2) * 3 + 1 = 16
    });

    it('should short-circuit on None', () => {
      const result = safeDivide(10, 0)
        .andThen(x => safeMultiply(x, 3))
        .map(x => x + 1);

      expect(result.isNone()).toBe(true);
    });

    function safeDivide(a: number, b: number): Maybe<number> {
      return b === 0 ? none : some(a / b);
    }

    function safeMultiply(x: number, factor: number): Maybe<number> {
      return some(x * factor);
    }
  });
});





































