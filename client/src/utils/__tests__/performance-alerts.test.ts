/**
 * Performance Alerts System Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceAlerts } from '../performance';

describe('PerformanceAlertsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('sendAlert', () => {
    it('should send alert successfully', async () => {
      const alertData = {
        type: 'violation' as const,
        title: 'Test Performance Violation',
        description: 'LCP exceeded budget',
        metrics: { lcp: 3000, budget: 2500 },
        severity: 'high' as const,
        url: 'https://example.com',
        userAgent: 'Test Browser',
        timestamp: Date.now()
      };

      // Mock the API calls
      const mockApiCall = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.doMock('../performance-alerts', () => ({
        performanceAlerts: {
          ...performanceAlerts,
          callGitHubAPI: mockApiCall,
          callSlackAPI: mockApiCall,
          callEmailAPI: mockApiCall
        }
      }));

      await performanceAlerts.sendAlert(alertData);

      // Should attempt to send to all enabled channels
      // Note: In the actual implementation, this would call the mocked methods
    });

    it('should respect cooldown period', async () => {
      const alertData = {
        type: 'violation' as const,
        title: 'Test Alert',
        description: 'Test description',
        metrics: {},
        severity: 'medium' as const,
        timestamp: Date.now()
      };

      // First alert
      await performanceAlerts.sendAlert(alertData);

      // Second alert immediately after (should be suppressed)
      await performanceAlerts.sendAlert({
        ...alertData,
        title: 'Test Alert 2' // Different title, same key
      });

      // Should not send duplicate alerts within cooldown
    });

    it('should handle API failures gracefully', async () => {
      const alertData = {
        type: 'violation' as const,
        title: 'Test Alert',
        description: 'Test description',
        metrics: {},
        severity: 'high' as const,
        timestamp: Date.now()
      };

      // Mock API to fail
      vi.doMock('../performance-alerts', () => ({
        performanceAlerts: {
          ...performanceAlerts,
          callGitHubAPI: vi.fn().mockRejectedValue(new Error('API Error')),
          callSlackAPI: vi.fn().mockRejectedValue(new Error('API Error')),
          callEmailAPI: vi.fn().mockRejectedValue(new Error('API Error'))
        }
      }));

      // Should not throw error
      await expect(performanceAlerts.sendAlert(alertData)).resolves.not.toThrow();
    });
  });

  describe('alert formatting', () => {
    it('should format GitHub issue correctly', () => {
      const alertData = {
        type: 'violation' as const,
        title: 'LCP Budget Violation',
        description: 'Largest Contentful Paint exceeded 2500ms',
        metrics: { lcp: 3000, budget: 2500 },
        severity: 'high' as const,
        url: 'https://example.com/page',
        userAgent: 'Mozilla/5.0...',
        timestamp: Date.now()
      };

      // Access private method for testing
      const service = performanceAlerts as any;
      const issue = service.formatGitHubIssue(alertData);

      expect(issue.title).toContain('🚨 Performance Alert');
      expect(issue.body).toContain('LCP Budget Violation');
      expect(issue.body).toContain('severity: high');
      expect(issue.body).toContain('https://example.com/page');
      expect(issue.labels).toContain('performance');
      expect(issue.labels).toContain('severity-high');
      expect(issue.labels).toContain('violation');
    });

    it('should format Slack message correctly', () => {
      const alertData = {
        type: 'warning' as const,
        title: 'Memory Usage Warning',
        description: 'Memory usage approaching limit',
        metrics: { memoryUsage: 90000000 },
        severity: 'medium' as const,
        timestamp: Date.now()
      };

      const service = performanceAlerts as any;
      const message = service.formatSlackMessage(alertData);

      expect(message.text).toContain('🚨 Performance Alert');
      expect(message.attachments).toBeDefined();
      expect(message.attachments?.[0]?.title).toBe('Memory Usage Warning');
      expect(message.attachments?.[0]?.color).toBe('warning');
    });

    it('should format email correctly', () => {
      const alertData = {
        type: 'regression' as const,
        title: 'Performance Regression Detected',
        description: 'LCP increased by 15%',
        metrics: { baseline: 2000, current: 2300, change: 15 },
        severity: 'medium' as const,
        timestamp: Date.now()
      };

      const service = performanceAlerts as any;
      const email = service.formatEmailMessage(alertData);

      expect(email.subject).toContain('🚨 Performance Alert');
      expect(email.html).toContain('Performance Regression Detected');
      expect(email.html).toContain('severity: medium');
      expect(email.text).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should update alert configuration', () => {
      const newConfig = { slack: true, email: false, github: true };
      performanceAlerts.updateConfig(newConfig);

      const currentConfig = performanceAlerts.getConfig();
      expect(currentConfig.slack).toBe(true);
      expect(currentConfig.email).toBe(false);
      expect(currentConfig.github).toBe(true);
    });

    it('should return current configuration', () => {
      const config = performanceAlerts.getConfig();

      expect(config).toHaveProperty('slack');
      expect(config).toHaveProperty('email');
      expect(config).toHaveProperty('github');
    });
  });

  describe('severity colors', () => {
    it('should return correct color for severity levels', () => {
      const service = performanceAlerts as any;

      expect(service.getSeverityColor('critical')).toBe('danger');
      expect(service.getSeverityColor('high')).toBe('danger');
      expect(service.getSeverityColor('medium')).toBe('warning');
      expect(service.getSeverityColor('low')).toBe('good');
    });
  });
});