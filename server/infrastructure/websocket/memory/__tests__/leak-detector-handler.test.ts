import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import type { 
  DegradationLevel, 
  IConnectionManager, 
  IProgressiveDegradation,
  MemoryLeakData} from '../../types';
import { getDefaultRecommendations,LeakDetectorHandler } from '../leak-detector-handler';

describe('LeakDetectorHandler', () => {
  let leakDetectorHandler: LeakDetectorHandler;
  let mockConnectionManager: IConnectionManager;
  let mockProgressiveDegradation: IProgressiveDegradation;

  beforeEach(() => {
    // Mock connection manager
    mockConnectionManager = {
      addConnection: vi.fn(),
      removeConnection: vi.fn(),
      getConnectionsForUser: vi.fn().mockReturnValue([]),
      cleanup: vi.fn(),
      getConnectionCount: vi.fn().mockReturnValue(100),
      getTotalConnections: vi.fn().mockReturnValue(100)
    };

    // Mock progressive degradation
    mockProgressiveDegradation = {
      adjustConfiguration: vi.fn(),
      getCurrentLevel: vi.fn().mockReturnValue('normal' as const),
      reset: vi.fn(),
      canDegrade: vi.fn().mockReturnValue(true)
    };

    leakDetectorHandler = new LeakDetectorHandler(
      mockConnectionManager,
      mockProgressiveDegradation
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(leakDetectorHandler).toBeInstanceOf(LeakDetectorHandler);
    });
  });

  describe('handleMemoryLeak', () => {
    it('should handle low severity memory leaks', () => {
      const leakData: MemoryLeakData = {
        severity: 'low',
        recommendations: ['recommendation1'],
        analysis: {
          growthRate: 5,
          retainedIncrease: 10
        }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockConnectionManager.cleanup).toHaveBeenCalled();
    });

    it('should handle medium severity memory leaks', () => {
      const leakData: MemoryLeakData = {
        severity: 'medium',
        recommendations: ['recommendation1', 'recommendation2'],
        analysis: {
          growthRate: 10,
          retainedIncrease: 20
        }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockProgressiveDegradation.adjustConfiguration).toHaveBeenCalledWith('medium');
    });

    it('should handle high severity memory leaks', () => {
      const leakData: MemoryLeakData = {
        severity: 'high',
        recommendations: ['urgent recommendation'],
        analysis: {
          growthRate: 20,
          retainedIncrease: 40
        }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockProgressiveDegradation.adjustConfiguration).toHaveBeenCalledWith('high');
    });

    it('should handle critical severity memory leaks', () => {
      const leakData: MemoryLeakData = {
        severity: 'critical',
        recommendations: ['emergency action required'],
        analysis: {
          growthRate: 30,
          retainedIncrease: 60
        }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockProgressiveDegradation.adjustConfiguration).toHaveBeenCalledWith('critical');
    });
  });

  describe('assessSeverity', () => {
    it('should assess low severity for small growth rates', () => {
      const severity = leakDetectorHandler.assessSeverity(3, 8);
      expect(severity).toBe('low');
    });

    it('should assess medium severity for moderate growth rates', () => {
      const severity = leakDetectorHandler.assessSeverity(12, 25);
      expect(severity).toBe('medium');
    });

    it('should assess high severity for high growth rates', () => {
      const severity = leakDetectorHandler.assessSeverity(22, 45);
      expect(severity).toBe('high');
    });

    it('should assess critical severity for extreme growth rates', () => {
      const severity = leakDetectorHandler.assessSeverity(35, 70);
      expect(severity).toBe('critical');
    });
  });

  describe('getRecommendations', () => {
    it('should return appropriate recommendations for low severity', () => {
      const recommendations = leakDetectorHandler.getRecommendations('low');
      expect(recommendations).toContain('Increase cleanup frequency');
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return appropriate recommendations for medium severity', () => {
      const recommendations = leakDetectorHandler.getRecommendations('medium');
      expect(recommendations).toContain('Enable progressive degradation');
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return appropriate recommendations for high severity', () => {
      const recommendations = leakDetectorHandler.getRecommendations('high');
      expect(recommendations).toContain('Reduce connection limits');
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return appropriate recommendations for critical severity', () => {
      const recommendations = leakDetectorHandler.getRecommendations('critical');
      expect(recommendations).toContain('Emergency cleanup required');
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('response actions', () => {
    it('should trigger cleanup for low severity leaks', () => {
      const leakData: MemoryLeakData = {
        severity: 'low',
        recommendations: [],
        analysis: { growthRate: 5, retainedIncrease: 10 }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockConnectionManager.cleanup).toHaveBeenCalled();
    });

    it('should trigger degradation for medium+ severity leaks', () => {
      const leakData: MemoryLeakData = {
        severity: 'medium',
        recommendations: [],
        analysis: { growthRate: 15, retainedIncrease: 30 }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockProgressiveDegradation.adjustConfiguration).toHaveBeenCalled();
    });

    it('should not degrade if already at maximum level', () => {
      mockProgressiveDegradation.canDegrade.mockReturnValue(false);
      
      const leakData: MemoryLeakData = {
        severity: 'high',
        recommendations: [],
        analysis: { growthRate: 25, retainedIncrease: 50 }
      };

      leakDetectorHandler.handleMemoryLeak(leakData);
      expect(mockProgressiveDegradation.adjustConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle cleanup errors gracefully', () => {
      mockConnectionManager.cleanup.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const leakData: MemoryLeakData = {
        severity: 'low',
        recommendations: [],
        analysis: { growthRate: 5, retainedIncrease: 10 }
      };

      expect(() => leakDetectorHandler.handleMemoryLeak(leakData)).not.toThrow();
    });

    it('should handle degradation errors gracefully', () => {
      mockProgressiveDegradation.adjustConfiguration.mockImplementation(() => {
        throw new Error('Degradation failed');
      });

      const leakData: MemoryLeakData = {
        severity: 'medium',
        recommendations: [],
        analysis: { growthRate: 15, retainedIncrease: 30 }
      };

      expect(() => leakDetectorHandler.handleMemoryLeak(leakData)).not.toThrow();
    });
  });
});

describe('getDefaultRecommendations', () => {
  it('should return default recommendations for low severity', () => {
    const recommendations = getDefaultRecommendations('low');
    expect(recommendations).toContain('Increase cleanup frequency');
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should return default recommendations for medium severity', () => {
    const recommendations = getDefaultRecommendations('medium');
    expect(recommendations).toContain('Enable progressive degradation');
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should return default recommendations for high severity', () => {
    const recommendations = getDefaultRecommendations('high');
    expect(recommendations).toContain('Reduce connection limits');
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should return default recommendations for critical severity', () => {
    const recommendations = getDefaultRecommendations('critical');
    expect(recommendations).toContain('Emergency cleanup required');
    expect(recommendations.length).toBeGreaterThan(0);
  });
});