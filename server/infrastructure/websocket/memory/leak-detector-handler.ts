/**
 * Memory Leak Detector Handler for WebSocket Service
 * 
 * Processes memory leak detection events and implements appropriate response actions
 * based on leak severity. Integrates with the existing MemoryLeakDetector system.
 */

import type { 
  DegradationLevel,
  IConnectionManager,
  ILeakDetectorHandler, 
  IProgressiveDegradation, 
  MemoryLeakData} from '../types';

/**
 * Response actions for different memory leak severities
 */
interface LeakResponse {
  actions: string[];
  degradationLevel?: DegradationLevel;
  cleanupIntensity: 'light' | 'moderate' | 'aggressive' | 'emergency';
  connectionLimits?: {
    maxConnectionsPerUser: number;
    maxTotalConnections: number;
  };
}

/**
 * Severity-based response configurations
 */
const LEAK_RESPONSES: Record<MemoryLeakData['severity'], LeakResponse> = {
  low: {
    actions: [
      'Increase cleanup frequency',
      'Monitor connection patterns',
      'Log detailed memory metrics'
    ],
    cleanupIntensity: 'light',
  },
  medium: {
    actions: [
      'Enable progressive degradation (light)',
      'Reduce cache sizes',
      'Increase message batching',
      'Clear stale connections'
    ],
    degradationLevel: 'light',
    cleanupIntensity: 'moderate',
    connectionLimits: {
      maxConnectionsPerUser: 4,
      maxTotalConnections: 8000,
    },
  },
  high: {
    actions: [
      'Enable progressive degradation (moderate)',
      'Aggressive connection cleanup',
      'Reduce subscription limits',
      'Force garbage collection',
      'Clear message queues'
    ],
    degradationLevel: 'moderate',
    cleanupIntensity: 'aggressive',
    connectionLimits: {
      maxConnectionsPerUser: 3,
      maxTotalConnections: 6000,
    },
  },
  critical: {
    actions: [
      'Enable progressive degradation (severe)',
      'Emergency connection limits',
      'Clear all caches',
      'Reject new connections',
      'Force immediate cleanup'
    ],
    degradationLevel: 'severe',
    cleanupIntensity: 'emergency',
    connectionLimits: {
      maxConnectionsPerUser: 1,
      maxTotalConnections: 3000,
    },
  },
};

/**
 * Memory leak detector handler that processes leak events and implements
 * appropriate response strategies based on severity levels.
 */
export class LeakDetectorHandler implements ILeakDetectorHandler {
  private connectionManager?: IConnectionManager;
  private progressiveDegradation?: IProgressiveDegradation;
  private lastLeakTime = 0;
  private leakHistory: Array<{ severity: MemoryLeakData['severity']; timestamp: number }> = [];
  private readonly maxHistorySize = 50;
  private emergencyMode = false;
  private readonly responseListeners: Array<(response: LeakResponse, data: MemoryLeakData) => void> = [];

  constructor(
    connectionManager?: IConnectionManager,
    progressiveDegradation?: IProgressiveDegradation
  ) {
    if (connectionManager !== undefined) {
      this.connectionManager = connectionManager;
    }
    if (progressiveDegradation !== undefined) {
      this.progressiveDegradation = progressiveDegradation;
    }
  }

  /**
   * Handle memory leak detection events
   */
  handleMemoryLeak(data: MemoryLeakData): void {
    // Record leak in history
    this.recordLeak(data.severity);

    // Get appropriate response for this severity level
    const response = this.getResponseForSeverity(data.severity);

    // Execute response actions
    this.executeResponse(response, data);

    // Notify listeners
    this.notifyResponseListeners(response, data);

    // Update emergency mode if needed
    this.updateEmergencyMode(data.severity);
  }

  /**
   * Get recommended actions for a specific severity level
   */
  getRecommendations(severity: MemoryLeakData['severity']): string[] {
    const response = LEAK_RESPONSES[severity];
    return [...response.actions];
  }

  /**
   * Check if the system is in emergency mode
   */
  isEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  /**
   * Get leak detection statistics
   */
  getStatistics(): {
    totalLeaks: number;
    leaksBySeverity: Record<MemoryLeakData['severity'], number>;
    recentLeaks: Array<{ severity: MemoryLeakData['severity']; timestamp: number }>;
    emergencyMode: boolean;
    lastLeakTime: number;
  } {
    const leaksBySeverity = this.leakHistory.reduce((acc, leak) => {
      acc[leak.severity] = (acc[leak.severity] || 0) + 1;
      return acc;
    }, {} as Record<MemoryLeakData['severity'], number>);

    // Ensure all severities are represented
    const allSeverities: MemoryLeakData['severity'][] = ['low', 'medium', 'high', 'critical'];
    allSeverities.forEach(severity => {
      if (!(severity in leaksBySeverity)) {
        leaksBySeverity[severity] = 0;
      }
    });

    return {
      totalLeaks: this.leakHistory.length,
      leaksBySeverity,
      recentLeaks: this.leakHistory.slice(-10), // Last 10 leaks
      emergencyMode: this.emergencyMode,
      lastLeakTime: this.lastLeakTime,
    };
  }

  /**
   * Add a listener for response actions
   */
  addResponseListener(listener: (response: LeakResponse, data: MemoryLeakData) => void): void {
    this.responseListeners.push(listener);
  }

  /**
   * Remove a response listener
   */
  removeResponseListener(listener: (response: LeakResponse, data: MemoryLeakData) => void): void {
    const index = this.responseListeners.indexOf(listener);
    if (index > -1) {
      this.responseListeners.splice(index, 1);
    }
  }

  /**
   * Reset emergency mode and clear history
   */
  reset(): void {
    this.emergencyMode = false;
    this.leakHistory = [];
    this.lastLeakTime = 0;
  }

  /**
   * Record a memory leak in the history
   */
  private recordLeak(severity: MemoryLeakData['severity']): void {
    const now = Date.now();
    this.lastLeakTime = now;

    this.leakHistory.push({ severity, timestamp: now });

    // Trim history if it gets too large
    if (this.leakHistory.length > this.maxHistorySize) {
      this.leakHistory.shift();
    }
  }

  /**
   * Get the appropriate response for a given severity level
   */
  private getResponseForSeverity(severity: MemoryLeakData['severity']): LeakResponse {
    const baseResponse = LEAK_RESPONSES[severity];

    // Enhance response based on leak frequency
    const recentLeaks = this.getRecentLeakCount(300000); // Last 5 minutes
    if (recentLeaks >= 3) {
      // Multiple leaks in short time - escalate response
      return this.escalateResponse(baseResponse);
    }

    return baseResponse;
  }

  /**
   * Execute the response actions for a memory leak
   */
  private executeResponse(response: LeakResponse, data: MemoryLeakData): void {
    // Apply progressive degradation if specified
    if (response.degradationLevel && this.progressiveDegradation) {
      this.progressiveDegradation.adjustConfiguration(this.getDegradationPressure(response.degradationLevel));
    }

    // Apply connection limits if specified
    if (response.connectionLimits && this.connectionManager) {
      this.applyConnectionLimits(response.connectionLimits);
    }

    // Perform cleanup based on intensity
    this.performCleanup(response.cleanupIntensity);

    // Log the response (in production, use proper logging)
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`Memory leak response executed: ${data.severity} severity, ${response.actions.length} actions`);
    }
  }

  /**
   * Escalate response for frequent leaks
   */
  private escalateResponse(baseResponse: LeakResponse): LeakResponse {
    const escalatedActions = [
      ...baseResponse.actions,
      'Force immediate garbage collection',
      'Clear all non-essential caches',
      'Reduce connection limits further'
    ];

    let escalatedDegradation: DegradationLevel | undefined = baseResponse.degradationLevel;
    if (escalatedDegradation) {
      const levels: DegradationLevel[] = ['normal', 'light', 'moderate', 'severe', 'critical'];
      const currentIndex = levels.indexOf(escalatedDegradation);
      if (currentIndex < levels.length - 1) {
        escalatedDegradation = levels[currentIndex + 1];
      }
    }

    const result: LeakResponse = {
      actions: escalatedActions,
      cleanupIntensity: 'emergency',
    };

    if (escalatedDegradation !== undefined) {
      result.degradationLevel = escalatedDegradation;
    }

    if (baseResponse.connectionLimits) {
      result.connectionLimits = {
        maxConnectionsPerUser: Math.max(1, baseResponse.connectionLimits.maxConnectionsPerUser - 1),
        maxTotalConnections: Math.max(1000, baseResponse.connectionLimits.maxTotalConnections - 1000),
      };
    }

    return result;
  }

  /**
   * Get memory pressure value for degradation level
   */
  private getDegradationPressure(level: DegradationLevel): number {
    const pressureMap: Record<DegradationLevel, number> = {
      normal: 50,
      light: 65,
      moderate: 75,
      severe: 85,
      critical: 95,
    };
    return pressureMap[level];
  }

  /**
   * Apply connection limits
   */
  private applyConnectionLimits(limits: { maxConnectionsPerUser: number; maxTotalConnections: number }): void {
    // This would integrate with the connection manager to enforce limits
    // Implementation depends on the connection manager interface
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`Applying connection limits: ${limits.maxConnectionsPerUser} per user, ${limits.maxTotalConnections} total`);
    }
  }

  /**
   * Perform cleanup based on intensity level
   */
  private performCleanup(intensity: LeakResponse['cleanupIntensity']): void {
    switch (intensity) {
      case 'light':
        this.performLightCleanup();
        break;
      case 'moderate':
        this.performModerateCleanup();
        break;
      case 'aggressive':
        this.performAggressiveCleanup();
        break;
      case 'emergency':
        this.performEmergencyCleanup();
        break;
    }
  }

  /**
   * Light cleanup operations
   */
  private performLightCleanup(): void {
    // Trigger standard cleanup operations
    if (this.connectionManager) {
      this.connectionManager.cleanup();
    }
  }

  /**
   * Moderate cleanup operations
   */
  private performModerateCleanup(): void {
    this.performLightCleanup();
    
    // Additional moderate cleanup
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }

  /**
   * Aggressive cleanup operations
   */
  private performAggressiveCleanup(): void {
    this.performModerateCleanup();
    
    // Force more aggressive cleanup
    // This would integrate with other service components
  }

  /**
   * Emergency cleanup operations
   */
  private performEmergencyCleanup(): void {
    this.performAggressiveCleanup();
    
    // Emergency measures
    // This might include dropping connections, clearing all caches, etc.
  }

  /**
   * Get count of recent leaks within a time window
   */
  private getRecentLeakCount(timeWindowMs: number): number {
    const now = Date.now();
    return this.leakHistory.filter(leak => now - leak.timestamp <= timeWindowMs).length;
  }

  /**
   * Update emergency mode based on leak severity and frequency
   */
  private updateEmergencyMode(severity: MemoryLeakData['severity']): void {
    // Enter emergency mode for critical leaks or frequent high-severity leaks
    if (severity === 'critical') {
      this.emergencyMode = true;
    } else if (severity === 'high') {
      const recentHighLeaks = this.leakHistory
        .filter(leak => Date.now() - leak.timestamp <= 600000) // Last 10 minutes
        .filter(leak => leak.severity === 'high' || leak.severity === 'critical')
        .length;
      
      if (recentHighLeaks >= 3) {
        this.emergencyMode = true;
      }
    }

    // Exit emergency mode if no high-severity leaks for 30 minutes
    if (this.emergencyMode) {
      const recentSevereLeaks = this.leakHistory
        .filter(leak => Date.now() - leak.timestamp <= 1800000) // Last 30 minutes
        .filter(leak => leak.severity === 'high' || leak.severity === 'critical')
        .length;
      
      if (recentSevereLeaks === 0) {
        this.emergencyMode = false;
      }
    }
  }

  /**
   * Notify all response listeners
   */
  private notifyResponseListeners(response: LeakResponse, data: MemoryLeakData): void {
    this.responseListeners.forEach(listener => {
      try {
        listener(response, data);
      } catch (error) {
        // Log error without using console directly in production
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Error in leak response listener:', error);
        }
      }
    });
  }
}

/**
 * Factory function to create a LeakDetectorHandler instance
 */
export function createLeakDetectorHandler(
  connectionManager?: IConnectionManager,
  progressiveDegradation?: IProgressiveDegradation
): LeakDetectorHandler {
  return new LeakDetectorHandler(connectionManager, progressiveDegradation);
}

/**
 * Get default recommendations for a severity level
 */
export function getDefaultRecommendations(severity: MemoryLeakData['severity']): string[] {
  return LEAK_RESPONSES[severity].actions;
}