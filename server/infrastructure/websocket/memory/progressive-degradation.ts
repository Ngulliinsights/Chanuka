/**
 * Progressive Degradation Handler for WebSocket Service
 * 
 * Implements adaptive configuration adjustment based on memory pressure and system load.
 * Provides graceful degradation of service quality to maintain system stability under stress.
 */

import { RuntimeConfig } from '../config/runtime-config';
import type {
  DegradationLevel,
  IProgressiveDegradation,
  MemoryPressureData,
} from '../types';

/**
 * Memory pressure thresholds for different degradation levels
 */
const DEGRADATION_THRESHOLDS = {
  light: 60,      // 60% memory usage
  moderate: 75,   // 75% memory usage  
  severe: 85,     // 85% memory usage
  critical: 95,   // 95% memory usage
} as const;

/**
 * Recovery thresholds (with hysteresis to prevent oscillation)
 */
const RECOVERY_THRESHOLDS = {
  light: 50,      // Drop to 50% to recover from light
  moderate: 65,   // Drop to 65% to recover from moderate
  severe: 70,     // Drop to 70% to recover from severe
  critical: 80,   // Drop to 80% to recover from critical
} as const;

/**
 * Progressive degradation implementation that adjusts service configuration
 * based on memory pressure and system load conditions.
 */
export class ProgressiveDegradation implements IProgressiveDegradation {
  private currentLevel: DegradationLevel = 'normal';
  private runtimeConfig: RuntimeConfig;
  private lastAdjustmentTime = 0;
  private readonly adjustmentCooldown = 30000; // 30 seconds between adjustments
  private readonly changeListeners: Array<(level: DegradationLevel) => void> = [];
  private memoryHistory: number[] = [];
  private readonly maxHistorySize = 10;

  constructor(runtimeConfig: RuntimeConfig) {
    this.runtimeConfig = runtimeConfig;
  }

  /**
   * Adjust configuration based on current memory pressure
   */
  adjustConfiguration(memoryPressure: number): void {
    // Add to memory history for trend analysis
    this.memoryHistory.push(memoryPressure);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Check if we're in cooldown period
    const now = Date.now();
    if (now - this.lastAdjustmentTime < this.adjustmentCooldown) {
      return;
    }

    const newLevel = this.calculateDegradationLevel(memoryPressure);
    
    if (newLevel !== this.currentLevel) {
      this.applyDegradationLevel(newLevel);
      this.lastAdjustmentTime = now;
    }
  }

  /**
   * Reset configuration to normal operation
   */
  resetConfiguration(): void {
    if (this.currentLevel !== 'normal') {
      this.applyDegradationLevel('normal');
      this.memoryHistory = [];
    }
  }

  /**
   * Get the current degradation level
   */
  getCurrentLevel(): DegradationLevel {
    return this.currentLevel;
  }

  /**
   * Handle memory pressure events from the memory manager
   */
  handleMemoryPressure(data: MemoryPressureData): void {
    const pressurePercentage = (data.pressure / data.threshold) * 100;
    this.adjustConfiguration(pressurePercentage);
  }

  /**
   * Add a listener for degradation level changes
   */
  addChangeListener(listener: (level: DegradationLevel) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a degradation level change listener
   */
  removeChangeListener(listener: (level: DegradationLevel) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Get degradation statistics
   */
  getStatistics(): {
    currentLevel: DegradationLevel;
    memoryPressure: number;
    adjustmentHistory: Array<{ level: DegradationLevel; timestamp: number }>;
    averageMemoryPressure: number;
  } {
    const averageMemoryPressure = this.memoryHistory.length > 0
      ? this.memoryHistory.reduce((sum, val) => sum + val, 0) / this.memoryHistory.length
      : 0;

    return {
      currentLevel: this.currentLevel,
      memoryPressure: this.memoryHistory[this.memoryHistory.length - 1] || 0,
      adjustmentHistory: [], // Could be implemented if needed
      averageMemoryPressure,
    };
  }

  /**
   * Calculate the appropriate degradation level based on memory pressure
   */
  private calculateDegradationLevel(memoryPressure: number): DegradationLevel {
    // Use hysteresis to prevent oscillation between levels
    const isIncreasing = this.isMemoryPressureIncreasing();
    
    if (isIncreasing) {
      // Use normal thresholds when pressure is increasing
      if (memoryPressure >= DEGRADATION_THRESHOLDS.critical) {
        return 'critical';
      } else if (memoryPressure >= DEGRADATION_THRESHOLDS.severe) {
        return 'severe';
      } else if (memoryPressure >= DEGRADATION_THRESHOLDS.moderate) {
        return 'moderate';
      } else if (memoryPressure >= DEGRADATION_THRESHOLDS.light) {
        return 'light';
      }
      return 'normal';
    } else {
      // Use recovery thresholds when pressure is decreasing
      if (memoryPressure <= RECOVERY_THRESHOLDS.light && this.currentLevel === 'light') {
        return 'normal';
      } else if (memoryPressure <= RECOVERY_THRESHOLDS.moderate && this.currentLevel === 'moderate') {
        return 'light';
      } else if (memoryPressure <= RECOVERY_THRESHOLDS.severe && this.currentLevel === 'severe') {
        return 'moderate';
      } else if (memoryPressure <= RECOVERY_THRESHOLDS.critical && this.currentLevel === 'critical') {
        return 'severe';
      }
      
      // If no recovery condition is met, maintain current level
      return this.currentLevel;
    }
  }

  /**
   * Check if memory pressure is trending upward
   */
  private isMemoryPressureIncreasing(): boolean {
    if (this.memoryHistory.length < 3) {
      return true; // Default to increasing if insufficient data
    }

    const recent = this.memoryHistory.slice(-3);
    const trend = recent[2]! - recent[0]!;
    return trend > 0;
  }

  /**
   * Apply a specific degradation level
   */
  private applyDegradationLevel(level: DegradationLevel): void {
    const previousLevel = this.currentLevel;
    this.currentLevel = level;

    // Apply the degradation to runtime configuration
    this.runtimeConfig.applyDegradation(level);

    // Log the degradation change (in production, use proper logging)
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`WebSocket service degradation level changed: ${previousLevel} -> ${level}`);
    }

    // Notify listeners
    this.notifyChangeListeners(level);
  }

  /**
   * Notify all change listeners
   */
  private notifyChangeListeners(level: DegradationLevel): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(level);
      } catch (error) {
        // Log error without using console directly in production
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Error in degradation level change listener:', error);
        }
      }
    });
  }
}

/**
 * Factory function to create a ProgressiveDegradation instance
 */
export function createProgressiveDegradation(runtimeConfig: RuntimeConfig): ProgressiveDegradation {
  return new ProgressiveDegradation(runtimeConfig);
}

/**
 * Get degradation level based on memory pressure percentage
 */
export function getDegradationLevelForPressure(memoryPressure: number): DegradationLevel {
  if (memoryPressure >= DEGRADATION_THRESHOLDS.critical) {
    return 'critical';
  } else if (memoryPressure >= DEGRADATION_THRESHOLDS.severe) {
    return 'severe';
  } else if (memoryPressure >= DEGRADATION_THRESHOLDS.moderate) {
    return 'moderate';
  } else if (memoryPressure >= DEGRADATION_THRESHOLDS.light) {
    return 'light';
  }
  return 'normal';
}