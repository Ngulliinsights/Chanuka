import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard utilities tests
 * Following navigation component utility testing patterns
 */

import {
  formatDashboardData,
  formatActivitySummary,
  formatActionItem,
  formatTrackedTopic
} from '@/utils/dashboard-formatters';
import {
  createDashboardConfig,
  mergeDashboardConfigs,
  getRefreshIntervalOptions,
  getDashboardSectionOptions,
  validateConfigurationLimits,
  getConfigurationRecommendations,
  exportDashboardConfig,
  importDashboardConfig
} from '@/utils/dashboard-config-utils';
import { dashboardConstants } from '@/utils/dashboard-constants';
import type { ActivitySummary, ActionItem, TrackedTopic, DashboardConfig } from '@shared/types';

describe('Dashboard Utilities', () => {
  describe('Dashboard Formatters', () => {
    describe('formatActivitySummary', () => {
      const mockSummary: ActivitySummary = {
        billsTracked: 1250,
        actionsNeeded: 15,
        topicsCount: 8,
        recentActivity: 25,
        completedActions: 12,
        pendingActions: 3,
        lastUpdated: new Date('2024-01-15T10:30:00Z')
      };

      it('should format numbers correctly', () => {
        const formatted = formatActivitySummary(mockSummary);

        expect(formatted.billsTracked).toBe('1.3K');
        expect(formatted.actionsNeeded).toBe('15');
        expect(formatted.topicsCount).toBe('8');
      });

      it('should calculate completion rate correctly', () => {
        const formatted = formatActivitySummary(mockSummary);

        expect(formatted.completionRate).toBe('80%'); // 12 / (12 + 3) = 0.8
      });

      it('should handle zero completion rate', () => {
        const summaryWithZero = {
          ...mockSummary,
          completedActions: 0,
          pendingActions: 0
        };

        const formatted = formatActivitySummary(summaryWithZero);
        expect(formatted.completionRate).toBe('0%');
      });

      it('should format relative time', () => {
        const recentSummary = {
          ...mockSummary,
          lastUpdated: new Date(Date.now() - 30000) // 30 seconds ago
        };

        const formatted = formatActivitySummary(recentSummary);
        expect(formatted.lastUpdatedText).toContain('ago');
      });

      it('should format large numbers with M suffix', () => {
        const largeSummary = {
          ...mockSummary,
          billsTracked: 1500000
        };

        const formatted = formatActivitySummary(largeSummary);
        expect(formatted.billsTracked).toBe('1.5M');
      });
    });

    describe('formatActionItem', () => {
      const mockActionItem: ActionItem = {
        id: 'action-1',
        title: 'Review Healthcare Bill',
        description: 'This is a very long description that should be truncated when it exceeds the maximum length limit for display purposes in the user interface.',
        priority: 'High',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdAt: new Date('2024-01-10T10:00:00Z'),
        updatedAt: new Date('2024-01-12T15:30:00Z')
      };

      it('should format action item correctly', () => {
        const formatted = formatActionItem(mockActionItem);

        expect(formatted.title).toBe('Review Healthcare Bill');
        expect(formatted.priority).toBe('High');
        expect(formatted.priorityColor).toContain('red');
        expect(formatted.dueDate).toContain('Due in 2 days');
        expect(formatted.dueDateColor).toBe('text-slate-600');
        expect(formatted.isOverdue).toBe(false);
      });

      it('should truncate long descriptions', () => {
        const formatted = formatActionItem(mockActionItem);

        expect(formatted.description.length).toBeLessThanOrEqual(100);
        expect(formatted.description).toContain('...');
      });

      it('should handle overdue items', () => {
        const overdueItem = {
          ...mockActionItem,
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        };

        const formatted = formatActionItem(overdueItem);

        expect(formatted.dueDate).toContain('overdue');
        expect(formatted.dueDateColor).toBe('text-red-600');
        expect(formatted.isOverdue).toBe(true);
      });

      it('should handle items due today', () => {
        const todayItem = {
          ...mockActionItem,
          dueDate: new Date() // Today
        };

        const formatted = formatActionItem(todayItem);

        expect(formatted.dueDate).toBe('Due today');
        expect(formatted.dueDateColor).toBe('text-orange-600');
      });

      it('should handle items without due date', () => {
        const noDueDateItem = {
          ...mockActionItem,
          dueDate: undefined
        };

        const formatted = formatActionItem(noDueDateItem);

        expect(formatted.dueDate).toBeNull();
        expect(formatted.isOverdue).toBe(false);
      });

      it('should format different priorities correctly', () => {
        const priorities = ['High', 'Medium', 'Low'] as const;
        const expectedColors = ['red', 'yellow', 'blue'];

        priorities.forEach((priority, index) => {
          const item = { ...mockActionItem, priority };
          const formatted = formatActionItem(item);

          expect(formatted.priorityColor).toContain(expectedColors[index]);
        });
      });
    });

    describe('formatTrackedTopic', () => {
      const mockTopic: TrackedTopic = {
        id: 'topic-1',
        name: 'Healthcare Reform',
        category: 'legislative',
        billCount: 15,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        description: 'This is a description of the healthcare reform topic that covers various aspects of healthcare policy and legislation.'
      };

      it('should format tracked topic correctly', () => {
        const formatted = formatTrackedTopic(mockTopic);

        expect(formatted.name).toBe('Healthcare Reform');
        expect(formatted.category).toBe('legislative');
        expect(formatted.categoryColor).toContain('blue');
        expect(formatted.billCountText).toBe('15 bills');
        expect(formatted.statusText).toBe('Active');
        expect(formatted.statusColor).toBe('text-green-600');
      });

      it('should handle inactive topics', () => {
        const inactiveTopic = { ...mockTopic, isActive: false };
        const formatted = formatTrackedTopic(inactiveTopic);

        expect(formatted.statusText).toBe('Inactive');
        expect(formatted.statusColor).toBe('text-slate-400');
      });

      it('should format bill count correctly', () => {
        const testCases = [
          { count: 0, expected: 'No bills' },
          { count: 1, expected: '1 bill' },
          { count: 5, expected: '5 bills' },
          { count: 1500, expected: '1.5K bills' }
        ];

        testCases.forEach(({ count, expected }) => {
          const topic = { ...mockTopic, billCount: count };
          const formatted = formatTrackedTopic(topic);
          expect(formatted.billCountText).toBe(expected);
        });
      });

      it('should truncate long descriptions', () => {
        const longDescription = 'a'.repeat(200);
        const topicWithLongDesc = { ...mockTopic, description: longDescription };
        const formatted = formatTrackedTopic(topicWithLongDesc);

        expect(formatted.description.length).toBeLessThanOrEqual(150);
        expect(formatted.description).toContain('...');
      });

      it('should handle topics without description', () => {
        const topicWithoutDesc = { ...mockTopic, description: undefined };
        const formatted = formatTrackedTopic(topicWithoutDesc);

        expect(formatted.description).toBe('');
      });

      it('should format different categories correctly', () => {
        const categories = ['legislative', 'community', 'policy', 'advocacy'] as const;
        const expectedColors = ['blue', 'green', 'purple', 'orange'];

        categories.forEach((category, index) => {
          const topic = { ...mockTopic, category };
          const formatted = formatTrackedTopic(topic);

          expect(formatted.categoryColor).toContain(expectedColors[index]);
        });
      });
    });

    describe('formatDashboardData', () => {
      const mockData = {
        summary: {
          billsTracked: 100,
          actionsNeeded: 5,
          topicsCount: 10,
          recentActivity: 20,
          completedActions: 15,
          pendingActions: 5,
          lastUpdated: new Date()
        },
        actionItems: [
          {
            id: 'action-1',
            title: 'Test Action',
            description: 'Test Description',
            priority: 'High' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        trackedTopics: [
          {
            id: 'topic-1',
            name: 'Healthcare',
            category: 'legislative' as const,
            billCount: 5,
            isActive: true,
            createdAt: new Date()
          }
        ]
      };

      it('should format complete dashboard data', () => {
        const formatted = formatDashboardData(mockData);
        const parsed = JSON.parse(formatted);

        expect(parsed.summary).toBeDefined();
        expect(parsed.actionItems).toHaveLength(1);
        expect(parsed.trackedTopics).toHaveLength(1);
        expect(parsed.exportedAt).toBeDefined();
      });

      it('should include formatted data for all components', () => {
        const formatted = formatDashboardData(mockData);
        const parsed = JSON.parse(formatted);

        expect(parsed.summary.billsTracked).toBe('100');
        expect(parsed.actionItems[0].title).toBe('Test Action');
        expect(parsed.trackedTopics[0].name).toBe('Healthcare');
      });
    });
  });

  describe('Dashboard Config Utils', () => {
    describe('createDashboardConfig', () => {
      it('should create config with defaults', () => {
        const config = createDashboardConfig();

        expect(config.refreshInterval).toBe(30000);
        expect(config.maxActionItems).toBe(10);
        expect(config.enableAutoRefresh).toBe(true);
      });

      it('should create config with overrides', () => {
        const overrides = {
          refreshInterval: 60000,
          maxActionItems: 5
        };

        const config = createDashboardConfig(overrides);

        expect(config.refreshInterval).toBe(60000);
        expect(config.maxActionItems).toBe(5);
        expect(config.enableAutoRefresh).toBe(true); // Default value
      });

      it('should throw error for invalid config', () => {
        const invalidOverrides = {
          refreshInterval: -1 // Invalid
        };

        expect(() => createDashboardConfig(invalidOverrides)).toThrow();
      });
    });

    describe('mergeDashboardConfigs', () => {
      const baseConfig: DashboardConfig = {
        refreshInterval: 30000,
        maxActionItems: 10,
        maxTrackedTopics: 20,
        enableAutoRefresh: true,
        showCompletedActions: false,
        defaultView: 'activity'
      };

      it('should merge configs correctly', () => {
        const overrides = {
          refreshInterval: 60000,
          enableAutoRefresh: false
        };

        const merged = mergeDashboardConfigs(baseConfig, overrides);

        expect(merged.refreshInterval).toBe(60000);
        expect(merged.enableAutoRefresh).toBe(false);
        expect(merged.maxActionItems).toBe(10); // From base
      });

      it('should validate merged config', () => {
        const invalidOverrides = {
          refreshInterval: -1
        };

        expect(() => mergeDashboardConfigs(baseConfig, invalidOverrides)).toThrow();
      });
    });

    describe('getRefreshIntervalOptions', () => {
      it('should return refresh interval options', () => {
        const options = getRefreshIntervalOptions();

        expect(options).toHaveLength(4);
        expect(options[0].value).toBe(dashboardConstants.REFRESH_INTERVALS.FAST);
        expect(options[0].label).toBe('10 seconds');
        expect(options[0].description).toContain('Fast refresh');
      });

      it('should include all interval types', () => {
        const options = getRefreshIntervalOptions();
        const values = options.map(opt => opt.value);

        expect(values).toContain(dashboardConstants.REFRESH_INTERVALS.FAST);
        expect(values).toContain(dashboardConstants.REFRESH_INTERVALS.NORMAL);
        expect(values).toContain(dashboardConstants.REFRESH_INTERVALS.SLOW);
        expect(values).toContain(dashboardConstants.REFRESH_INTERVALS.VERY_SLOW);
      });
    });

    describe('getDashboardSectionOptions', () => {
      it('should return dashboard section options', () => {
        const options = getDashboardSectionOptions();

        expect(options).toHaveLength(4);
        expect(options[0].value).toBe('activity');
        expect(options[0].label).toBe('Activity');
        expect(options[0].icon).toBe('📊');
      });

      it('should include all section types', () => {
        const options = getDashboardSectionOptions();
        const values = options.map(opt => opt.value);

        expect(values).toContain('activity');
        expect(values).toContain('actions');
        expect(values).toContain('topics');
        expect(values).toContain('analytics');
      });
    });

    describe('validateConfigurationLimits', () => {
      it('should validate valid configuration', () => {
        const config = {
          refreshInterval: 30000,
          maxActionItems: 10,
          maxTrackedTopics: 20
        };

        const result = validateConfigurationLimits(config);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect refresh interval errors', () => {
        const config = {
          refreshInterval: 500 // Too short
        };

        const result = validateConfigurationLimits(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Refresh interval too short');
      });

      it('should detect max items errors', () => {
        const config = {
          maxActionItems: 0 // Too low
        };

        const result = validateConfigurationLimits(config);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Must display at least 1 action item');
      });

      it('should provide warnings for performance concerns', () => {
        const config = {
          refreshInterval: 5000, // Fast refresh
          maxActionItems: 50 // High limit
        };

        const result = validateConfigurationLimits(config);

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings).toContain('Fast refresh intervals may increase data usage');
      });
    });

    describe('getConfigurationRecommendations', () => {
      it('should recommend slow refresh for data usage concerns', () => {
        const usage = {
          dataUsageConcern: true
        };

        const recommendations = getConfigurationRecommendations(usage);

        expect(recommendations.refreshInterval).toBe(dashboardConstants.REFRESH_INTERVALS.VERY_SLOW);
        expect(recommendations.enableAutoRefresh).toBe(false);
      });

      it('should recommend performance optimizations', () => {
        const usage = {
          performanceConcern: true
        };

        const recommendations = getConfigurationRecommendations(usage);

        expect(recommendations.refreshInterval).toBe(dashboardConstants.REFRESH_INTERVALS.SLOW);
        expect(recommendations.maxActionItems).toBe(5);
        expect(recommendations.maxTrackedTopics).toBe(10);
      });

      it('should recommend fast refresh for high activity', () => {
        const usage = {
          activityLevel: 'high' as const
        };

        const recommendations = getConfigurationRecommendations(usage);

        expect(recommendations.refreshInterval).toBe(dashboardConstants.REFRESH_INTERVALS.FAST);
        expect(recommendations.maxActionItems).toBe(20);
        expect(recommendations.maxTrackedTopics).toBe(30);
      });

      it('should recommend settings for short sessions', () => {
        const usage = {
          averageSessionDuration: 120000 // 2 minutes
        };

        const recommendations = getConfigurationRecommendations(usage);

        expect(recommendations.enableAutoRefresh).toBe(false);
        expect(recommendations.showCompletedActions).toBe(false);
      });
    });

    describe('exportDashboardConfig', () => {
      it('should export configuration as JSON', () => {
        const config: DashboardConfig = {
          refreshInterval: 30000,
          maxActionItems: 10,
          maxTrackedTopics: 20,
          enableAutoRefresh: true,
          showCompletedActions: false,
          defaultView: 'activity'
        };

        const exported = exportDashboardConfig(config);
        const parsed = JSON.parse(exported);

        expect(parsed.config).toEqual(config);
        expect(parsed.exportedAt).toBeDefined();
        expect(parsed.version).toBe('1.0.0');
      });
    });

    describe('importDashboardConfig', () => {
      it('should import valid configuration', () => {
        const configData = {
          config: {
            refreshInterval: 45000,
            maxActionItems: 15,
            maxTrackedTopics: 25,
            enableAutoRefresh: false,
            showCompletedActions: true,
            defaultView: 'topics'
          },
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        };

        const imported = importDashboardConfig(JSON.stringify(configData));

        expect(imported.refreshInterval).toBe(45000);
        expect(imported.maxActionItems).toBe(15);
        expect(imported.defaultView).toBe('topics');
      });

      it('should throw error for invalid JSON', () => {
        const invalidJson = '{ invalid json }';

        expect(() => importDashboardConfig(invalidJson)).toThrow();
      });

      it('should throw error for missing config object', () => {
        const invalidData = {
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
          // Missing config
        };

        expect(() => importDashboardConfig(JSON.stringify(invalidData))).toThrow();
      });

      it('should validate imported configuration', () => {
        const invalidConfigData = {
          config: {
            refreshInterval: -1 // Invalid
          }
        };

        expect(() => importDashboardConfig(JSON.stringify(invalidConfigData))).toThrow();
      });
    });
  });

  describe('Dashboard Constants', () => {
    it('should have all required constants', () => {
      expect(dashboardConstants.DEFAULT_CONFIG).toBeDefined();
      expect(dashboardConstants.REFRESH_INTERVALS).toBeDefined();
      expect(dashboardConstants.PRIORITIES).toBeDefined();
      expect(dashboardConstants.CATEGORIES).toBeDefined();
      expect(dashboardConstants.SECTIONS).toBeDefined();
      expect(dashboardConstants.LIMITS).toBeDefined();
    });

    it('should have consistent priority definitions', () => {
      const priorities = Object.values(dashboardConstants.PRIORITIES);
      
      priorities.forEach(priority => {
        expect(priority.value).toBeDefined();
        expect(priority.weight).toBeDefined();
        expect(priority.color).toBeDefined();
        expect(priority.bgClass).toBeDefined();
        expect(priority.textClass).toBeDefined();
        expect(priority.borderClass).toBeDefined();
      });
    });

    it('should have consistent category definitions', () => {
      const categories = Object.values(dashboardConstants.CATEGORIES);
      
      categories.forEach(category => {
        expect(category.value).toBeDefined();
        expect(category.label).toBeDefined();
        expect(category.color).toBeDefined();
        expect(category.icon).toBeDefined();
      });
    });

    it('should have reasonable limit values', () => {
      const limits = dashboardConstants.LIMITS;
      
      expect(limits.MIN_REFRESH_INTERVAL).toBeGreaterThan(0);
      expect(limits.MAX_REFRESH_INTERVAL).toBeGreaterThan(limits.MIN_REFRESH_INTERVAL);
      expect(limits.MAX_ACTION_ITEMS_DISPLAY).toBeGreaterThan(0);
      expect(limits.MAX_TRACKED_TOPICS_DISPLAY).toBeGreaterThan(0);
    });
  });
});

