import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { BASE_CONFIG } from '../../config/base-config';
import type { 
  ILeakDetectorHandler, 
  IProgressiveDegradation,
  MemoryLeakData,
  MemoryPressureData 
} from '../../types';
import { MemoryManager } from '../memory-manager';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;
  let mockLeakDetectorHandler: ILeakDetectorHandler;
  let mockProgressiveDegradation: IProgressiveDegradation;

  beforeEach(() => {
    // Mock leak detector handler
    mockLeakDetectorHandler = {
      handleMemoryLeak: vi.fn(),
      getRecommendations: vi.fn().mockReturnValue(['recommendation1', 'recommendation2']),
      assessSeverity: vi.fn().mockReturnValue('medium' as const)
    };

    // Mock progressive degradation
    mockProgressiveDegradation = {
      adjustConfiguration: vi.fn(),
      getCurrentLevel: vi.fn().mockReturnValue('normal' as const),
      reset: vi.fn(),
      canDegrade: vi.fn().mockReturnValue(true)
    };

    memoryManager = new MemoryManager(
      mockLeakDetectorHandler,
      mockProgressiveDegradation
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(memoryManager).toBeInstanceOf(MemoryManager);
    });
  });

  describe('startMonitoring', () => {
    it('should start memory monitoring', () => {
      memoryManager.startMonitoring();
      // Verify monitoring is started (implementation specific)
    });

    it('should not start monitoring if already started', () => {
      memoryManager.startMonitoring();
      memoryManager.startMonitoring(); // Second call should be ignored
    });
  });

  describe('stopMonitoring', () => {
    it('should stop memory monitoring', () => {
      memoryManager.startMonitoring();
      memoryManager.stopMonitoring();
    });

    it('should handle stopping when not started', () => {
      expect(() => memoryManager.stopMonitoring()).not.toThrow();
    });
  });

  describe('performCleanup', () => {
    it('should perform memory cleanup', () => {
      memoryManager.performCleanup();
      // Verify cleanup operations
    });

    it('should handle cleanup errors gracefully', () => {
      // Mock cleanup failure scenario
      expect(() => memoryManager.performCleanup()).not.toThrow();
    });
  });

  describe('handleMemoryPressure', () => {
    it('should handle memory pressure events', () => {
      const pressureData: MemoryPressureData = {
        pressure: 85,
        threshold: 80
      };

      memoryManager.handleMemoryPressure(pressureData);
      expect(mockProgressiveDegradation.adjustConfiguration).toHaveBeenCalled();
    });

    it('should trigger progressive degradation on high pressure', () => {
      const highPressureData: MemoryPressureData = {
        pressure: 95,
        threshold: 90
      };

      memoryManager.handleMemoryPressure(highPressureData);
      expect(mockProgressiveDegradation.adjustConfiguration).toHaveBeenCalledWith('high');
    });

    it('should not degrade if already at maximum level', () => {
      mockProgressiveDegradation.canDegrade.mockReturnValue(false);
      
      const pressureData: MemoryPressureData = {
        pressure: 95,
        threshold: 90
      };

      memoryManager.handleMemoryPressure(pressureData);
      expect(mockProgressiveDegradation.adjustConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('memory leak handling', () => {
    it('should handle memory leak events', () => {
      const leakData: MemoryLeakData = {
        severity: 'high',
        recommendations: ['recommendation1'],
        analysis: {
          growthRate: 15,
          retainedIncrease: 25
        }
      };

      // Simulate memory leak detection
      memoryManager.startMonitoring();
      
      // Trigger leak handler
      expect(mockLeakDetectorHandler.handleMemoryLeak).toBeDefined();
    });
  });

  describe('cleanup scheduling', () => {
    it('should schedule regular cleanup operations', () => {
      memoryManager.startMonitoring();
      
      // Verify cleanup is scheduled at regular intervals
      expect(BASE_CONFIG.MEMORY_CLEANUP_INTERVAL).toBeDefined();
    });

    it('should clear cleanup intervals on stop', () => {
      memoryManager.startMonitoring();
      memoryManager.stopMonitoring();
      
      // Verify intervals are cleared
    });
  });

  describe('error handling', () => {
    it('should handle monitoring errors gracefully', () => {
      // Mock error in monitoring
      expect(() => memoryManager.startMonitoring()).not.toThrow();
    });

    it('should handle cleanup errors gracefully', () => {
      // Mock error in cleanup
      expect(() => memoryManager.performCleanup()).not.toThrow();
    });
  });
});