import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emergencyTriage, startEmergencyTriage, stopEmergencyTriage, getTriageStatus } from '../emergency-triage';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Emergency Triage Tool', () => {
  beforeEach(() => {
    // Reset the triage tool state
    if (emergencyTriage.getStatus().isMonitoring) {
      emergencyTriage.stopMonitoring();
    }
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    // Stop monitoring if still running
    if (emergencyTriage.getStatus().isMonitoring) {
      emergencyTriage.stopMonitoring();
    }
  });

  describe('Basic Functionality', () => {
    it('should start and stop monitoring', () => {
      expect(emergencyTriage.getStatus().isMonitoring).toBe(false);
      
      startEmergencyTriage();
      expect(emergencyTriage.getStatus().isMonitoring).toBe(true);
      
      const report = stopEmergencyTriage();
      expect(emergencyTriage.getStatus().isMonitoring).toBe(false);
      expect(report).toBeDefined();
      expect(report.totalErrors).toBeGreaterThanOrEqual(0);
    });

    it('should capture console errors', () => {
      startEmergencyTriage();
      
      // Trigger some test errors
      console.error('Test error in AppLayout component');
      console.error('Maximum update depth exceeded in WebSocketClient');
      console.warn('Missing dependency in useEffect');
      
      const report = stopEmergencyTriage();
      
      expect(report.totalErrors).toBeGreaterThan(0);
      expect(report.errorsByComponent.size).toBeGreaterThan(0);
    });

    it('should classify error types correctly', () => {
      startEmergencyTriage();
      
      // Trigger different types of errors
      console.error('Maximum update depth exceeded - infinite render');
      console.error('Race condition detected in state update');
      console.error('Memory leak: event listeners not cleaned up');
      console.warn('Missing dependency in useEffect hook');
      
      const report = stopEmergencyTriage();
      
      expect(report.errorsByType.has('infinite-render')).toBe(true);
      expect(report.errorsByType.has('race-condition')).toBe(true);
      expect(report.errorsByType.has('memory-leak')).toBe(true);
      expect(report.errorsByType.has('dependency-issue')).toBe(true);
    });

    it('should identify component names from error messages', () => {
      startEmergencyTriage();
      
      // Trigger errors with component names
      console.error('Error in AppLayout component');
      console.error('WebSocketClient connection failed');
      console.error('at DesktopSidebar (sidebar.tsx:45:12)');
      
      const report = stopEmergencyTriage();
      
      const componentNames = Array.from(report.errorsByComponent.keys());
      expect(componentNames).toContain('AppLayout');
      expect(componentNames).toContain('WebSocketClient');
      expect(componentNames).toContain('DesktopSidebar');
    });

    it('should determine error severity correctly', () => {
      startEmergencyTriage();
      
      // Critical error
      console.error('Maximum update depth exceeded - browser crash');
      // High priority error  
      console.error('Race condition causing performance degradation');
      // Medium priority warning
      console.warn('Missing useEffect dependency');
      
      const report = stopEmergencyTriage();
      
      const criticalErrors = report.criticalIssues;
      expect(criticalErrors.length).toBeGreaterThan(0);
      
      const hasHighSeverity = report.topOffenders.some(error => error.severity === 'high');
      const hasMediumSeverity = report.topOffenders.some(error => error.severity === 'medium');
      
      expect(hasHighSeverity || hasMediumSeverity).toBe(true);
    });
  });

  describe('Render Tracking', () => {
    it('should track component renders', () => {
      startEmergencyTriage();
      
      // Simulate rapid renders
      for (let i = 0; i < 5; i++) {
        emergencyTriage.trackRender('TestComponent');
      }
      
      const status = getTriageStatus();
      expect(status.topComponents).toContain('TestComponent');
      
      stopEmergencyTriage();
    });

    it('should detect infinite renders', () => {
      startEmergencyTriage();
      
      // Simulate infinite render (>50 renders/second)
      const startTime = Date.now();
      for (let i = 0; i < 60; i++) {
        emergencyTriage.trackRender('InfiniteComponent');
      }
      
      const report = stopEmergencyTriage();
      
      const infiniteRenderErrors = report.errorsByType.get('infinite-render') || [];
      const hasInfiniteRender = infiniteRenderErrors.some(error => 
        error.component === 'InfiniteComponent'
      );
      
      expect(hasInfiniteRender).toBe(true);
    });
  });

  describe('Circuit Breakers', () => {
    it('should configure circuit breakers', () => {
      const config = {
        component: 'TestComponent',
        enabled: true,
        errorThreshold: 5,
        timeWindow: 1000
      };
      
      emergencyTriage.configureCircuitBreaker(config);
      
      // This should not throw
      expect(() => {
        emergencyTriage.configureCircuitBreaker(config);
      }).not.toThrow();
    });

    it('should trigger circuit breaker on threshold', () => {
      const config = {
        component: 'TestComponent',
        enabled: true,
        errorThreshold: 3,
        timeWindow: 1000
      };
      
      emergencyTriage.configureCircuitBreaker(config);
      startEmergencyTriage();
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = vi.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });
      
      // Trigger errors to exceed threshold
      for (let i = 0; i < 4; i++) {
        console.error(`Error ${i} in TestComponent`);
      }
      
      stopEmergencyTriage();
      
      // Circuit breaker should have been triggered
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'circuit-breaker-triggered',
          detail: { component: 'TestComponent' }
        })
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', () => {
      startEmergencyTriage();
      
      // Generate various errors
      console.error('Critical error in AppLayout');
      console.error('Race condition in WebSocketClient');
      console.warn('Dependency issue in DesktopSidebar');
      
      const report = stopEmergencyTriage();
      
      // Check report structure
      expect(report).toHaveProperty('totalErrors');
      expect(report).toHaveProperty('errorsByComponent');
      expect(report).toHaveProperty('errorsByType');
      expect(report).toHaveProperty('topOffenders');
      expect(report).toHaveProperty('criticalIssues');
      expect(report).toHaveProperty('baseline');
      
      // Check baseline metrics
      expect(report.baseline).toHaveProperty('startTime');
      expect(report.baseline).toHaveProperty('endTime');
      expect(report.baseline).toHaveProperty('duration');
      expect(report.baseline).toHaveProperty('errorRate');
      
      expect(report.baseline.duration).toBeGreaterThan(0);
      expect(report.baseline.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should rank top offenders correctly', () => {
      startEmergencyTriage();
      
      // Create errors with different frequencies and severities
      for (let i = 0; i < 5; i++) {
        console.error('Critical error in HighFrequencyComponent');
      }
      
      for (let i = 0; i < 2; i++) {
        console.warn('Warning in LowFrequencyComponent');
      }
      
      const report = stopEmergencyTriage();
      
      expect(report.topOffenders.length).toBeGreaterThan(0);
      
      // First offender should be the high-frequency critical component
      const topOffender = report.topOffenders[0];
      expect(topOffender.component).toBe('HighFrequencyComponent');
      expect(topOffender.frequency).toBeGreaterThan(1);
    });
  });

  describe('Status Monitoring', () => {
    it('should provide current status', () => {
      const initialStatus = getTriageStatus();
      expect(initialStatus.isMonitoring).toBe(false);
      expect(initialStatus.errorCount).toBe(0);
      
      startEmergencyTriage();
      
      console.error('Test error');
      
      const monitoringStatus = getTriageStatus();
      expect(monitoringStatus.isMonitoring).toBe(true);
      expect(monitoringStatus.errorCount).toBeGreaterThan(0);
      expect(monitoringStatus.duration).toBeGreaterThan(0);
      
      stopEmergencyTriage();
    });

    it('should track top components in status', () => {
      startEmergencyTriage();
      
      console.error('Error in ComponentA');
      console.error('Error in ComponentB');
      console.error('Another error in ComponentA');
      
      const status = getTriageStatus();
      
      expect(status.topComponents).toContain('ComponentA');
      expect(status.topComponents.length).toBeGreaterThan(0);
      
      stopEmergencyTriage();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed error messages gracefully', () => {
      startEmergencyTriage();
      
      // Test with various malformed inputs
      console.error(null);
      console.error(undefined);
      console.error({});
      console.error([]);
      console.error(123);
      
      expect(() => {
        const report = stopEmergencyTriage();
        expect(report).toBeDefined();
      }).not.toThrow();
    });

    it('should prevent double start/stop', () => {
      startEmergencyTriage();
      
      // Should not throw when starting again
      expect(() => {
        startEmergencyTriage();
      }).not.toThrow();
      
      const report = stopEmergencyTriage();
      
      // Should throw when stopping again
      expect(() => {
        stopEmergencyTriage();
      }).toThrow();
    });
  });
});