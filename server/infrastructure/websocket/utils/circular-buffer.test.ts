import { beforeEach,describe, expect, it } from 'vitest';

import { CircularBuffer } from './circular-buffer';

describe('CircularBuffer', () => {
  let buffer: CircularBuffer<number>;

  beforeEach(() => {
    buffer = new CircularBuffer<number>(5);
  });

  describe('constructor', () => {
    it('should create a buffer with the specified capacity', () => {
      expect(buffer.getCapacity()).toBe(5);
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new CircularBuffer(0)).toThrow('Capacity must be greater than 0');
      expect(() => new CircularBuffer(-1)).toThrow('Capacity must be greater than 0');
    });
  });

  describe('push', () => {
    it('should add items to the buffer', () => {
      expect(buffer.push(1)).toBe(true);
      expect(buffer.push(2)).toBe(true);
      expect(buffer.size()).toBe(2);
      expect(buffer.isEmpty()).toBe(false);
    });

    it('should handle buffer overflow by overwriting oldest items', () => {
      // Fill the buffer
      for (let i = 1; i <= 5; i++) {
        expect(buffer.push(i)).toBe(true);
      }
      expect(buffer.isFull()).toBe(true);
      expect(buffer.size()).toBe(5);

      // Overflow - should overwrite oldest item
      expect(buffer.push(6)).toBe(false); // Returns false because it overwrote
      expect(buffer.size()).toBe(5); // Size remains the same
      expect(buffer.peekOldest()).toBe(2); // Oldest is now 2 (1 was overwritten)
      expect(buffer.peekNewest()).toBe(6); // Newest is 6
    });

    it('should maintain circular behavior during overflow', () => {
      // Fill buffer with 1,2,3,4,5
      for (let i = 1; i <= 5; i++) {
        buffer.push(i);
      }

      // Add more items to test circular overflow
      buffer.push(6); // Overwrites 1, buffer: 2,3,4,5,6
      buffer.push(7); // Overwrites 2, buffer: 3,4,5,6,7
      buffer.push(8); // Overwrites 3, buffer: 4,5,6,7,8

      expect(buffer.toArray()).toEqual([4, 5, 6, 7, 8]);
    });
  });

  describe('pop', () => {
    it('should return undefined for empty buffer', () => {
      expect(buffer.pop()).toBeUndefined();
    });

    it('should remove and return the oldest item', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.pop()).toBe(1);
      expect(buffer.size()).toBe(2);
      expect(buffer.pop()).toBe(2);
      expect(buffer.size()).toBe(1);
      expect(buffer.pop()).toBe(3);
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
    });

    it('should clear references when popping', () => {
      buffer.push(1);
      buffer.push(2);
      
      buffer.pop();
      // The internal buffer should have cleared the reference
      expect(buffer.size()).toBe(1);
    });
  });

  describe('peek methods', () => {
    beforeEach(() => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
    });

    it('should peek at oldest item without removing it', () => {
      expect(buffer.peekOldest()).toBe(1);
      expect(buffer.size()).toBe(3); // Size unchanged
    });

    it('should peek at newest item without removing it', () => {
      expect(buffer.peekNewest()).toBe(3);
      expect(buffer.size()).toBe(3); // Size unchanged
    });

    it('should return undefined for empty buffer', () => {
      const emptyBuffer = new CircularBuffer<number>(5);
      expect(emptyBuffer.peekOldest()).toBeUndefined();
      expect(emptyBuffer.peekNewest()).toBeUndefined();
    });
  });

  describe('get and set', () => {
    beforeEach(() => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
    });

    it('should get items by index', () => {
      expect(buffer.get(0)).toBe(10); // Oldest
      expect(buffer.get(1)).toBe(20);
      expect(buffer.get(2)).toBe(30); // Newest
    });

    it('should return undefined for invalid indices', () => {
      expect(buffer.get(-1)).toBeUndefined();
      expect(buffer.get(3)).toBeUndefined();
      expect(buffer.get(10)).toBeUndefined();
    });

    it('should set items by index', () => {
      expect(buffer.set(1, 25)).toBe(true);
      expect(buffer.get(1)).toBe(25);
      expect(buffer.toArray()).toEqual([10, 25, 30]);
    });

    it('should return false for invalid set indices', () => {
      expect(buffer.set(-1, 100)).toBe(false);
      expect(buffer.set(3, 100)).toBe(false);
      expect(buffer.set(10, 100)).toBe(false);
    });
  });

  describe('toArray methods', () => {
    beforeEach(() => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
    });

    it('should return array in chronological order', () => {
      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should return array in reverse chronological order', () => {
      expect(buffer.toArrayReverse()).toEqual([3, 2, 1]);
    });

    it('should handle overflow correctly in arrays', () => {
      // Fill buffer completely
      buffer.push(4);
      buffer.push(5);
      // Add one more to cause overflow
      buffer.push(6); // Should overwrite 1

      expect(buffer.toArray()).toEqual([2, 3, 4, 5, 6]);
      expect(buffer.toArrayReverse()).toEqual([6, 5, 4, 3, 2]);
    });

    it('should return empty array for empty buffer', () => {
      const emptyBuffer = new CircularBuffer<number>(5);
      expect(emptyBuffer.toArray()).toEqual([]);
      expect(emptyBuffer.toArrayReverse()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all items from buffer', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();

      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
      expect(buffer.toArray()).toEqual([]);
    });
  });

  describe('capacity methods', () => {
    it('should return correct capacity information', () => {
      expect(buffer.getCapacity()).toBe(5);
      expect(buffer.remainingCapacity()).toBe(5);

      buffer.push(1);
      buffer.push(2);
      expect(buffer.remainingCapacity()).toBe(3);

      // Fill completely
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.remainingCapacity()).toBe(0);
      expect(buffer.isFull()).toBe(true);
    });
  });

  describe('fill', () => {
    it('should fill buffer with specified value', () => {
      buffer.fill(42);

      expect(buffer.size()).toBe(5);
      expect(buffer.isFull()).toBe(true);
      expect(buffer.toArray()).toEqual([42, 42, 42, 42, 42]);
    });

    it('should reset head and tail pointers', () => {
      // Add some items first
      buffer.push(1);
      buffer.push(2);
      buffer.pop();

      buffer.fill(99);

      expect(buffer.toArray()).toEqual([99, 99, 99, 99, 99]);
      expect(buffer.peekOldest()).toBe(99);
      expect(buffer.peekNewest()).toBe(99);
    });
  });

  describe('iteration methods', () => {
    beforeEach(() => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
    });

    it('should iterate with forEach', () => {
      const items: number[] = [];
      const indices: number[] = [];

      buffer.forEach((item, index) => {
        items.push(item);
        indices.push(index);
      });

      expect(items).toEqual([10, 20, 30]);
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should filter items', () => {
      const filtered = buffer.filter(item => item > 15);
      expect(filtered).toEqual([20, 30]);
    });

    it('should map items', () => {
      const mapped = buffer.map(item => item * 2);
      expect(mapped).toEqual([20, 40, 60]);
    });

    it('should reduce items', () => {
      const sum = buffer.reduce((acc, item) => acc + item, 0);
      expect(sum).toBe(60);
    });

    it('should find items', () => {
      expect(buffer.find(item => item > 15)).toBe(20);
      expect(buffer.find(item => item > 50)).toBeUndefined();
    });

    it('should find item indices', () => {
      expect(buffer.findIndex(item => item === 20)).toBe(1);
      expect(buffer.findIndex(item => item === 99)).toBe(-1);
    });

    it('should check some condition', () => {
      expect(buffer.some(item => item > 25)).toBe(true);
      expect(buffer.some(item => item > 50)).toBe(false);
    });

    it('should check every condition', () => {
      expect(buffer.every(item => item > 5)).toBe(true);
      expect(buffer.every(item => item > 25)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics for empty buffer', () => {
      const stats = buffer.getStats();

      expect(stats).toEqual({
        size: 0,
        capacity: 5,
        utilizationPercent: 0,
        remainingCapacity: 5,
        isEmpty: true,
        isFull: false,
        headIndex: 0,
        tailIndex: 0,
      });
    });

    it('should return correct statistics for partially filled buffer', () => {
      buffer.push(1);
      buffer.push(2);

      const stats = buffer.getStats();

      expect(stats).toEqual({
        size: 2,
        capacity: 5,
        utilizationPercent: 40,
        remainingCapacity: 3,
        isEmpty: false,
        isFull: false,
        headIndex: 2,
        tailIndex: 0,
      });
    });

    it('should return correct statistics for full buffer', () => {
      for (let i = 1; i <= 5; i++) {
        buffer.push(i);
      }

      const stats = buffer.getStats();

      expect(stats).toEqual({
        size: 5,
        capacity: 5,
        utilizationPercent: 100,
        remainingCapacity: 0,
        isEmpty: false,
        isFull: true,
        headIndex: 0,
        tailIndex: 0,
      });
    });
  });

  describe('overflow handling', () => {
    it('should handle continuous overflow correctly', () => {
      // Fill buffer with 1,2,3,4,5
      for (let i = 1; i <= 5; i++) {
        buffer.push(i);
      }

      // Continue adding items to test multiple overflows
      for (let i = 6; i <= 10; i++) {
        buffer.push(i);
      }

      // Buffer should contain 6,7,8,9,10
      expect(buffer.toArray()).toEqual([6, 7, 8, 9, 10]);
      expect(buffer.size()).toBe(5);
      expect(buffer.isFull()).toBe(true);
    });

    it('should handle mixed push/pop operations', () => {
      // Add some items
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      // Remove one
      expect(buffer.pop()).toBe(1);

      // Add more
      buffer.push(4);
      buffer.push(5);
      buffer.push(6);

      // Buffer should be: 2,3,4,5,6
      expect(buffer.toArray()).toEqual([2, 3, 4, 5, 6]);
      expect(buffer.size()).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle single capacity buffer', () => {
      const singleBuffer = new CircularBuffer<string>(1);

      expect(singleBuffer.push('first')).toBe(true);
      expect(singleBuffer.isFull()).toBe(true);
      expect(singleBuffer.push('second')).toBe(false); // Overwrites
      expect(singleBuffer.toArray()).toEqual(['second']);
    });

    it('should handle complex data types', () => {
      const objectBuffer = new CircularBuffer<{ id: number; name: string }>(3);

      const obj1 = { id: 1, name: 'first' };
      const obj2 = { id: 2, name: 'second' };
      const obj3 = { id: 3, name: 'third' };

      objectBuffer.push(obj1);
      objectBuffer.push(obj2);
      objectBuffer.push(obj3);

      expect(objectBuffer.get(0)).toBe(obj1);
      expect(objectBuffer.get(1)).toBe(obj2);
      expect(objectBuffer.get(2)).toBe(obj3);

      const filtered = objectBuffer.filter(obj => obj.id > 1);
      expect(filtered).toEqual([obj2, obj3]);
    });

    it('should maintain performance with large capacity', () => {
      const largeBuffer = new CircularBuffer<number>(1000);

      // Fill the buffer
      for (let i = 0; i < 1000; i++) {
        largeBuffer.push(i);
      }

      expect(largeBuffer.size()).toBe(1000);
      expect(largeBuffer.isFull()).toBe(true);

      // Test overflow
      largeBuffer.push(1000);
      expect(largeBuffer.peekOldest()).toBe(1);
      expect(largeBuffer.peekNewest()).toBe(1000);
    });
  });

  describe('memory management', () => {
    it('should clear references when items are overwritten', () => {
      // This test ensures that overwritten items don't cause memory leaks
      const objectBuffer = new CircularBuffer<{ data: string }>(2);

      objectBuffer.push({ data: 'first' });
      objectBuffer.push({ data: 'second' });
      
      // This should overwrite the first object
      objectBuffer.push({ data: 'third' });

      // The buffer should only contain the last two items
      expect(objectBuffer.toArray()).toEqual([
        { data: 'second' },
        { data: 'third' }
      ]);
    });

    it('should clear references when popping items', () => {
      const objectBuffer = new CircularBuffer<{ data: string }>(3);

      objectBuffer.push({ data: 'first' });
      objectBuffer.push({ data: 'second' });
      
      const popped = objectBuffer.pop();
      expect(popped).toEqual({ data: 'first' });
      expect(objectBuffer.size()).toBe(1);
    });
  });
});