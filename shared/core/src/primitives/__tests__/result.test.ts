import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, Result } from '@client/types/result';

describe('Result<T, E>', () => {
  describe('Ok variant', () => {
    it('should create Ok with value', () => {
      const result = ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      expect(result.unwrap()).toBe(42);
    });

    it('should handle unwrapOr correctly', () => {
      const result = ok('hello');
      expect(result.unwrapOr('default')).toBe('hello');
    });

    it('should handle expect correctly', () => {
      const result = ok(123);
      expect(result.expect('should not fail')).toBe(123);
    });

    it('should map values correctly', () => {
      const result = ok(5).map(x => x * 2);
      expect(result.unwrap()).toBe(10);
    });

    it('should mapErr as no-op for Ok', () => {
      const result = ok(5).mapErr(() => 'error');
      expect(result.unwrap()).toBe(5);
    });

    it('should chain with andThen', () => {
      const result = ok(5).andThen(x => ok(x * 2));
      expect(result.unwrap()).toBe(10);
    });

    it('should handle match correctly', () => {
      const result = ok(42);
      const value = result.match(
        x => `success: ${x}`,
        e => `error: ${e}`
      );
      expect(value).toBe('success: 42');
    });
  });

  describe('Err variant', () => {
    it('should create Err with error', () => {
      const result = err('something went wrong');
      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      expect(() => result.unwrap()).toThrow('something went wrong');
    });

    it('should handle unwrapOr correctly', () => {
      const result = err('error');
      expect(result.unwrapOr('default' as never)).toBe('default');
    });

    it('should handle expect correctly', () => {
      const result = err('test error');
      expect(() => result.expect('custom message')).toThrow('custom message: test error');
    });

    it('should map as no-op for Err', () => {
      const result = err('error').map(() => 42);
      expect(result.isErr()).toBe(true);
    });

    it('should mapErr correctly', () => {
      const result = err('original').mapErr(e => `mapped: ${e}`);
      expect(result.isErr()).toBe(true);
      expect(() => result.unwrap()).toThrow('mapped: original');
    });

    it('should andThen as no-op for Err', () => {
      const result = err('error').andThen(() => ok(42));
      expect(result.isErr()).toBe(true);
    });

    it('should handle match correctly', () => {
      const result = err('test error');
      const value = result.match(
        x => `success: ${x}`,
        e => `error: ${e}`
      );
      expect(value).toBe('error: test error');
    });
  });

  describe('Type guards', () => {
    it('should correctly identify Ok results', () => {
      const result: Result<number, string> = ok(42);
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);

      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should correctly identify Err results', () => {
      const result: Result<number, string> = err('error');
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);

      if (isErr(result)) {
        expect(result.error).toBe('error');
      }
    });
  });

  describe('Complex chaining', () => {
    it('should handle complex Result chains', () => {
      function divide(a: number, b: number): Result<number, string> {
        return b === 0 ? err('Division by zero') : ok(a / b);
      }

      function multiplyBy2(x: number): Result<number, string> {
        return ok(x * 2);
      }

      const result = divide(10, 2)
        .andThen(multiplyBy2)
        .map(x => x + 1);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(11); // (10/2) * 2 + 1 = 11
    });

    it('should short-circuit on first error', () => {
      function alwaysFails(x: number): Result<number, string> {
        return err('always fails');
      }

      const result = ok(5)
        .andThen(alwaysFails as any)
        .map((x: any) => x * 2);

      expect(result.isErr()).toBe(true);
      expect(() => result.unwrap()).toThrow('always fails');
    });
  });
});





































