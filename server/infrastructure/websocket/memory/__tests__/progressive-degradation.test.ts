import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProgressiveDegradation, getDegradationLevelForPressure } from '../progressive-degradation';
import { RuntimeConfig } from '../../config/runtime-config';
import type { DegradationLevel, MemoryPressureData } from '../../types';

// Mock RuntimeConfig
vi.mock('../../config/runtime-config');

describe('ProgressiveDegradation', () => {
  let progressiveDegradation: ProgressiveDegradation;
  let mockRuntimeConfig: RuntimeConfig;

  beforeEach(() => {
    mockRuntimeConfig = {
      applyDegradation: vi.fn(),
    } as unknown as RuntimeConfig;

    progressiveDegradation = new ProgressiveDegradation(mockRuntimeConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with normal degradation level', () => {
      expect(progressiveDegradation.getCurrentLevel()).toBe('normal');
    });

    it('should accept runtime config dependency', () => {
      expect(() => new ProgressiveDegradation(mockRuntimeConfig)).not.toThrow();
    });
  });

  describe('adjustConfiguration', () => {
    it('should not adjust during cooldown period', () => {
      // First adjustment
      progressiveDegradation.adjustConfiguration(70);
      expect(mockRuntimeConfig.applyDegradation).toHaveBeenCalledWith('light');

      // Second adjustment within cooldown (should be ignored)
      vi.clearAllMocks();
      progressiveDegradation.adjustConfiguration(80);
      expect(mockRuntimeConfig.applyDegradation).not.toHaveBeenCalled();
    });

    it('should adjust to light degradation at 60% memory pressure', () => {
      progressiveDegradation.adjustConfiguration(65);
      
      expect(progressiveDegradation.getCurrentLevel()).toBe('light');
      expect(mockRuntimeConfig.applyDegradation).toHaveBeenCalledWith('light');
    });

    it('should adjust to moderate degradation at 75% memory pressure', () => {
      progressiveDegradation.adjustConfiguration(80);
      
      expect(progressiveDegradation.getCurrentLevel()).toBe('moderate');
      expect(mockRuntimeConfig.applyDegradation).toHaveBeenCalledWith('moderate');
    });

    it('should adjust to severe degradation at 85% memory pressure', () => {
      progressiveDegradation.adjustConfiguration(90);
      
      expect(progressiveDegradation.getCurrentLevel()).toBe('severe');
      expect(mockRuntimeConfig.applyDegradation).toHaveBeenCalledWith('severe');
    });

    it('should adjust to critical degradation at 95% memory pressure', () => {
      progressiveDegradation.adjustConfiguration(98);
      
      expect(progressiveDegradation.getCurrentLevel()).toBe('critical');
      expect(mockRuntimeConfig.applyDegradation).toHaveBeenCalledWith('critical');
    });

    it('should maintain memory history for trend analysis', () => {
      const pressureValues = [50, 60, 70, 80, 90];
      
      pressureValues.forEach(pressure => {
        progressiveDegradation.adjustConfiguration(pressure);
      });

      const stats = progressiveDegradation.getStatistics();
      expect(stats.averageMemoryPressure).toBeGreaterThan(0);
      expect(stats.memoryPressure).toBe(90); // Last value
    });

    it('should limit memory history size', () => {
      // Add more than maxHistorySize (10) values
      for (let i = 0; i < 15; i++) {
        progressiveDegradation.adjustConfiguration(50 + i);
      }

      const stats = progressiveDegradation.getStatistics();
      // Should only keep the last 10 values for average calculation
      expect(stats.averageMemoryPressure).toBeCloseTo(59.5, 1); // Average of 55-64
    });
  });

  describe('hysteresis behavior', () => {
    beforeEach(() => {
      // Mock Date.now to control cooldown behavior
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use recovery thresholds when pressure is decreasing', () => {
      // Set to light degradation
      progressiveDegradation.adjustConfiguration(65);
      expect(progressiveDegradation.getCurrentLevel()).toBe('light');

      // Advance time past cooldown
      vi.advanceTimersByTime(35000);

      // Pressure decreases but not below recovery threshold (50%)
      progressiveDegradation.adjustConfiguration(55);
      expect(progressiveDegradation.getCurrentLevel()).toBe('light'); // Should stay light

      // Advance time past cooldown
      vi.advanceTimersByTime(35000);

      // Pressure decreases below recovery threshold
      progressiveDegradation.adjustConfiguration(45);
      expect(progressiveDegradation.getCurrentLevel()).toBe('normal');
    });

    it('should prevent oscillation between degradation levels', () => {
      // Set to moderate degradation
      progressiveDegradation.adjustConfiguration(80);
      expect(progressiveDegradation.getCurrentLevel()).toBe('moderate');

      // Advance time past cooldown
      vi.advanceTimersByTime(35000);

      // Pressure decreases slightly but not enough for recovery
      progressiveDegradation.adjustConfiguration(70);
      expect(progressiveDegradation.getCurrentLevel()).toBe('moderate'); // Should stay moderate

      // Advance time past cooldown
      vi.advanceTimersByTime(35000);

      // Pressure decreases below recovery threshold
      progressiveDegradation.adjustConfiguration(60);
      expect(progressiveDegradation.getCurrentLevel()).toBe('light');
    });
  });

  describe('resetConfiguration', () => {
    it('should reset to normal level', () => {
      progressiveDegradation.adjustConfiguration(90);
      expect(progressiveDegradation.getCurrentLevel()).toBe('severe');

      progressiveDegradation.resetConfiguration();
      
      expect(progressiveDegradation.getCurrentLevel()).toBe('normal');
      expect(mockRuntimeConfig.applyDegradation).toHaveBeenCalledWith('normal');
    });

    it('should clear memory history', () => {
      progressiveDegradation.adjustConfiguration(70);
      progressiveDegradation.adjustConfiguration(80);
      
      let stats = progressiveDegradation.getStatistics();
      expect(stats.averageMemoryPressure).toBeGreaterThan(0);

      progressiveDegradation.resetConfiguration();
      
      stats = progressiveDegradation.getStatistics();
      expect(stats.averageMemoryPressure).toBe(0);
    });

    it('should not reset if already normal', () => {
      expect(progressiveDegradation.getCurrentLevel()).toBe('normal');
      
      vi.clearAllMocks();
      progressiveDegradation.resetConfiguration();
      
      expect(mockRuntimeConfig.applyDegradation).not.toHaveBeenCalled();
    });
  });

  describe('handleMemoryPressure', () => {
    it('should handle memory pressure data correctly', () => {
      const pressureData: MemoryPressureData = {
        pressure: 800,
        threshold: 1000,
      };

      progressiveDegradation.handleMemoryPressure(pressureData);
      
      // 800/1000 * 100 = 80% pressure -> moderate degradation
      expect(progressiveDegradation.getCurrentLevel()).toBe('moderate');
    });

    it('should handle edge case pressure values', () => {
      const criticalPressure: MemoryPressureData = {
        pressure: 950,
        threshold: 1000,
      };

      progressiveDegradation.handleMemoryPressure(criticalPressure);
      expect(progressiveDegradation.getCurrentLevel()).toBe('critical');
    });
  });

  describe('change listeners', () => {
    it('should notify listeners when degradation level changes', () => {
      const listener = vi.fn();
      progressiveDegradation.addChangeListener(listener);

      progressiveDegradation.adjustConfiguration(70);
      
      expect(listener).toHaveBeenCalledWith('light');
    });

    it('should not notify listeners when level does not change', () => {
      const listener = vi.fn();
      progressiveDegradation.addChangeListener(listener);

      progressiveDegradation.adjustConfiguration(50); // Normal level
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should remove listeners correctly', () => {
      const listener = vi.fn();
      progressiveDegradation.addChangeListener(listener);
      progressiveDegradation.removeChangeListener(listener);

      progressiveDegradation.adjustConfiguration(70);
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      progressiveDegradation.addChangeListener(errorListener);
      progressiveDegradation.addChangeListener(goodListener);

      // Should not throw and should still call good listener
      expect(() => progressiveDegradation.adjustConfiguration(70)).not.toThrow();
      expect(goodListener).toHaveBeenCalledWith('light');
    });
  });

  describe('getStatistics', () => {
    it('should return current statistics', () => {
      progressiveDegradation.adjustConfiguration(75);
      
      const stats = progressiveDegradation.getStatistics();
      
      expect(stats.currentLevel).toBe('moderate');
      expect(stats.memoryPressure).toBe(75);
      expect(stats.averageMemoryPressure).toBe(75);
      expect(stats.adjustmentHistory).toEqual([]);
    });

    it('should calculate average memory pressure correctly', () => {
      const pressures = [60, 70, 80];
      pressures.forEach(pressure => {
        progressiveDegradation.adjustConfiguration(pressure);
      });

      const stats = progressiveDegradation.getStatistics();
      expect(stats.averageMemoryPressure).toBeCloseTo(70, 1);
    });

    it('should handle empty memory history', () => {
      const stats = progressiveDegradation.getStatistics();
      
      expect(stats.averageMemoryPressure).toBe(0);
      expect(stats.memoryPressure).toBe(0);
    });
  });

  describe('memory pressure trend analysis', () => {
    it('should detect increasing memory pressure trend', () => {
      // Simulate increasing trend
      progressiveDegradation.adjustConfiguration(50);
      progressiveDegradation.adjustConfiguration(60);
      progressiveDegradation.adjustConfiguration(70);

      // Should trigger degradation based on increasing trend
      expect(progressiveDegradation.getCurrentLevel()).toBe('light');
    });

    it('should handle insufficient data for trend analysis', () => {
      // With less than 3 data points, should default to increasing
      progressiveDegradation.adjustConfiguration(65);
      
      expect(progressiveDegradation.getCurrentLevel()).toBe('light');
    });
  });
});

describe('getDegradationLevelForPressure', () => {
  it('should return correct degradation levels for pressure values', () => {
    expect(getDegradationLevelForPressure(50)).toBe('normal');
    expect(getDegradationLevelForPressure(65)).toBe('light');
    expect(getDegradationLevelForPressure(80)).toBe('moderate');
    expect(getDegradationLevelForPressure(90)).toBe('severe');
    expect(getDegradationLevelForPressure(98)).toBe('critical');
  });

  it('should handle edge cases', () => {
    expect(getDegradationLevelForPressure(0)).toBe('normal');
    expect(getDegradationLevelForPressure(100)).toBe('critical');
    expect(getDegradationLevelForPressure(60)).toBe('light'); // Exactly at threshold
  });
});