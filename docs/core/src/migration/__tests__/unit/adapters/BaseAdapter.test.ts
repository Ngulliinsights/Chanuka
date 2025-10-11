import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseAdapter } from '../../../adapters/BaseAdapter';
import { logger } from '../utils/logger';

// Concrete implementation for testing abstract BaseAdapter
class TestAdapter extends BaseAdapter {
  constructor() {
    super('TestAdapter');
  }

  // Expose protected method for testing
  async testDualOperation<T>(
    operation: string,
    legacyFn: () => Promise<T>,
    newFn: () => Promise<T>,
    options = {}
  ) {
    return this.dualOperation(operation, legacyFn, newFn, options);
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;
  let mockLegacyFn: any;
  let mockNewFn: any;

  beforeEach(() => {
    adapter = new TestAdapter();
    mockLegacyFn = vi.fn();
    mockNewFn = vi.fn();
    
    // Clear any existing metrics
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dualOperation', () => {
    it('should prefer legacy by default and succeed', async () => {
      // Arrange - Set up successful responses from both systems
      const expectedResult = { data: 'test-result' };
      mockLegacyFn.mockResolvedValue(expectedResult);
      mockNewFn.mockResolvedValue(expectedResult);

      // Act - Execute the dual operation
      const result = await adapter.testDualOperation(
        'test-operation', 
        mockLegacyFn, 
        mockNewFn
      );

      // Assert - Verify legacy was called and result is correct
      expect(result).toEqual(expectedResult);
      expect(mockLegacyFn).toHaveBeenCalledTimes(1);
      expect(mockNewFn).toHaveBeenCalledTimes(1);
    });

    it('should handle legacy system failure', async () => {
      // Arrange
      const error = new Error('Legacy system failed');
      mockLegacyFn.mockRejectedValue(error);
      mockNewFn.mockResolvedValue({ data: 'new-system' });

      // Act & Assert
      await expect(
        adapter.testDualOperation('test-operation', mockLegacyFn, mockNewFn)
      ).rejects.toThrow(error);
    });

    it('should use new system when preferenceLegacy is false', async () => {
      // Arrange
      const expectedResult = { data: 'new-system' };
      mockLegacyFn.mockResolvedValue({ data: 'legacy-system' });
      mockNewFn.mockResolvedValue(expectedResult);

      // Act
      const result = await adapter.testDualOperation(
        'test-operation',
        mockLegacyFn,
        mockNewFn,
        { preferenceLegacy: false }
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockNewFn).toHaveBeenCalledTimes(1);
      expect(mockLegacyFn).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout', async () => {
      // Arrange
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      mockLegacyFn.mockImplementation(() => delay(2000));

      // Act & Assert
      await expect(
        adapter.testDualOperation(
          'test-operation',
          mockLegacyFn,
          mockNewFn,
          { timeoutMs: 100 }
        )
      ).rejects.toThrow('Operation timed out');
    });
  });
});







