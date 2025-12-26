import { beforeEach,describe, expect, it } from 'vitest';

import { PriorityQueue } from './priority-queue';

describe('PriorityQueue', () => {
  let queue: PriorityQueue<string>;

  beforeEach(() => {
    queue = new PriorityQueue<string>(5);
  });

  describe('constructor', () => {
    it('should create a queue with the specified max size', () => {
      expect(queue.getMaxSize()).toBe(5);
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should throw error for invalid max size', () => {
      expect(() => new PriorityQueue<string>(0)).toThrow('Max size must be greater than 0');
      expect(() => new PriorityQueue<string>(-1)).toThrow('Max size must be greater than 0');
    });
  });

  describe('enqueue', () => {
    it('should add items in priority order', () => {
      expect(queue.enqueue('low', 1)).toBe(true);
      expect(queue.enqueue('high', 10)).toBe(true);
      expect(queue.enqueue('medium', 5)).toBe(true);

      expect(queue.dequeue()).toBe('high');
      expect(queue.dequeue()).toBe('medium');
      expect(queue.dequeue()).toBe('low');
    });

    it('should handle equal priorities with FIFO order', () => {
      expect(queue.enqueue('first', 5)).toBe(true);
      expect(queue.enqueue('second', 5)).toBe(true);
      expect(queue.enqueue('third', 5)).toBe(true);

      expect(queue.dequeue()).toBe('first');
      expect(queue.dequeue()).toBe('second');
      expect(queue.dequeue()).toBe('third');
    });

    it('should return false when queue is full', () => {
      // Fill the queue to capacity
      for (let i = 0; i < 5; i++) {
        expect(queue.enqueue(`item${i}`, i)).toBe(true);
      }

      // Try to add one more item
      expect(queue.enqueue('overflow', 10)).toBe(false);
      expect(queue.size()).toBe(5);
      expect(queue.isFull()).toBe(true);
    });

    it('should maintain correct order with mixed priorities', () => {
      const items = [
        { item: 'urgent', priority: 10 },
        { item: 'low', priority: 1 },
        { item: 'high', priority: 8 },
        { item: 'medium', priority: 5 },
        { item: 'critical', priority: 10 },
      ];

      items.forEach(({ item, priority }) => {
        queue.enqueue(item, priority);
      });

      // Should dequeue in order: urgent, critical, high, medium, low
      // (urgent and critical have same priority, so FIFO order)
      expect(queue.dequeue()).toBe('urgent');
      expect(queue.dequeue()).toBe('critical');
      expect(queue.dequeue()).toBe('high');
      expect(queue.dequeue()).toBe('medium');
      expect(queue.dequeue()).toBe('low');
    });
  });

  describe('dequeue', () => {
    it('should return undefined when queue is empty', () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it('should return items in priority order', () => {
      queue.enqueue('low', 1);
      queue.enqueue('high', 10);
      queue.enqueue('medium', 5);

      expect(queue.dequeue()).toBe('high');
      expect(queue.size()).toBe(2);
      expect(queue.dequeue()).toBe('medium');
      expect(queue.size()).toBe(1);
      expect(queue.dequeue()).toBe('low');
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('peek', () => {
    it('should return undefined when queue is empty', () => {
      expect(queue.peek()).toBeUndefined();
    });

    it('should return highest priority item without removing it', () => {
      queue.enqueue('low', 1);
      queue.enqueue('high', 10);
      queue.enqueue('medium', 5);

      expect(queue.peek()).toBe('high');
      expect(queue.size()).toBe(3); // Size should not change
      expect(queue.peek()).toBe('high'); // Should still be the same item
    });
  });

  describe('size and capacity management', () => {
    it('should track size correctly', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue('item1', 1);
      expect(queue.size()).toBe(1);

      queue.enqueue('item2', 2);
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);

      queue.dequeue();
      expect(queue.size()).toBe(0);
    });

    it('should report empty status correctly', () => {
      expect(queue.isEmpty()).toBe(true);

      queue.enqueue('item', 1);
      expect(queue.isEmpty()).toBe(false);

      queue.dequeue();
      expect(queue.isEmpty()).toBe(true);
    });

    it('should report full status correctly', () => {
      expect(queue.isFull()).toBe(false);

      // Fill to capacity
      for (let i = 0; i < 5; i++) {
        queue.enqueue(`item${i}`, i);
      }

      expect(queue.isFull()).toBe(true);

      queue.dequeue();
      expect(queue.isFull()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all items from the queue', () => {
      queue.enqueue('item1', 1);
      queue.enqueue('item2', 2);
      queue.enqueue('item3', 3);

      expect(queue.size()).toBe(3);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.dequeue()).toBeUndefined();
    });
  });

  describe('getItems', () => {
    it('should return a copy of all items in priority order', () => {
      queue.enqueue('low', 1);
      queue.enqueue('high', 10);
      queue.enqueue('medium', 5);

      const items = queue.getItems();

      expect(items).toHaveLength(3);
      expect(items[0].item).toBe('high');
      expect(items[0].priority).toBe(10);
      expect(items[1].item).toBe('medium');
      expect(items[1].priority).toBe(5);
      expect(items[2].item).toBe('low');
      expect(items[2].priority).toBe(1);

      // Should be a copy, not the original array
      items.push({ item: 'test', priority: 0, timestamp: Date.now() });
      expect(queue.size()).toBe(3); // Original queue unchanged
    });

    it('should include timestamp information', () => {
      const beforeTime = Date.now();
      queue.enqueue('item', 5);
      const afterTime = Date.now();

      const items = queue.getItems();
      expect(items[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(items[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('complex scenarios', () => {
    it('should handle alternating enqueue/dequeue operations', () => {
      queue.enqueue('first', 5);
      expect(queue.dequeue()).toBe('first');

      queue.enqueue('second', 3);
      queue.enqueue('third', 7);
      expect(queue.dequeue()).toBe('third');

      queue.enqueue('fourth', 1);
      expect(queue.dequeue()).toBe('second');
      expect(queue.dequeue()).toBe('fourth');
    });

    it('should maintain performance with many operations', () => {
      const startTime = Date.now();

      // Add many items
      for (let i = 0; i < 1000; i++) {
        const smallQueue = new PriorityQueue<number>(100);
        for (let j = 0; j < 50; j++) {
          smallQueue.enqueue(j, Math.random() * 100);
        }
        // Dequeue all items
        while (!smallQueue.isEmpty()) {
          smallQueue.dequeue();
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('edge cases', () => {
    it('should handle negative priorities', () => {
      queue.enqueue('negative', -5);
      queue.enqueue('positive', 5);
      queue.enqueue('zero', 0);

      expect(queue.dequeue()).toBe('positive');
      expect(queue.dequeue()).toBe('zero');
      expect(queue.dequeue()).toBe('negative');
    });

    it('should handle very large priorities', () => {
      queue.enqueue('max', Number.MAX_SAFE_INTEGER);
      queue.enqueue('min', Number.MIN_SAFE_INTEGER);
      queue.enqueue('normal', 1);

      expect(queue.dequeue()).toBe('max');
      expect(queue.dequeue()).toBe('normal');
      expect(queue.dequeue()).toBe('min');
    });

    it('should handle single item queue', () => {
      const singleQueue = new PriorityQueue<string>(1);

      expect(singleQueue.enqueue('only', 5)).toBe(true);
      expect(singleQueue.isFull()).toBe(true);
      expect(singleQueue.enqueue('overflow', 10)).toBe(false);

      expect(singleQueue.dequeue()).toBe('only');
      expect(singleQueue.isEmpty()).toBe(true);
    });
  });
});