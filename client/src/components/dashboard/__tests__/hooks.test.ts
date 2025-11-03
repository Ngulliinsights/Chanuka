import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard hooks tests
 * Following navigation component hook testing patterns
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardActions } from '@/hooks/useDashboardActions';
import { useDashboardTopics } from '@/hooks/useDashboardTopics';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';

// Mock the useBills hook
vi.mock('@/hooks/use-bills', () => ({
  useBills: vi.fn(() => ({
    summary: {
      billsTracked: 5,
      actionsNeeded: 3,
      topicsCount: 8,
      recentActivity: 12,
      completedActions: 7,
      pendingActions: 3,
      lastUpdated: new Date()
    },
    actionItems: [
      {
        id: 'action-1',
        title: 'Test Action',
        description: 'Test Description',
        priority: 'High',
        created_at: new Date(),
        updated_at: new Date()
      }
    ],
    trackedTopics: [
      {
        id: 'topic-1',
        name: 'Healthcare',
        category: 'legislative',
        billCount: 5,
        is_active: true,
        created_at: new Date()
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Dashboard Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('useDashboard', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.data).toBeDefined();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.actions).toBeDefined();
      expect(result.current.recovery).toBeDefined();
    });

    it('should provide dashboard data from useBills', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.data.summary.billsTracked).toBe(5);
      expect(result.current.data.actionItems).toHaveLength(1);
      expect(result.current.data.trackedTopics).toHaveLength(1);
    });

    it('should provide refresh action', async () => {
      const { result } = renderHook(() => useDashboard());

      await act(async () => {
        await result.current.actions.refresh();
      });

      // Should not throw and should update lastRefresh
      expect(result.current.data.lastRefresh).toBeDefined();
    });

    it('should provide reset action', () => {
      const { result } = renderHook(() => useDashboard());

      await act(() => {
        result.current.actions.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('should provide addTopic action', async () => {
      const { result } = renderHook(() => useDashboard());

      await act(async () => {
        await result.current.actions.addTopic({
          name: 'New Topic',
          category: 'policy',
          billCount: 0,
          is_active: true,
          description: 'New topic description'
        });
      });

      // Should not throw
      expect(result.current.error).toBeNull();
    });

    it('should provide removeTopic action', async () => {
      const { result } = renderHook(() => useDashboard());

      await act(async () => {
        await result.current.actions.removeTopic('topic-1');
      });

      // Should not throw
      expect(result.current.error).toBeNull();
    });

    it('should provide completeAction action', async () => {
      const { result } = renderHook(() => useDashboard());

      await act(async () => {
        await result.current.actions.completeAction('action-1');
      });

      // Should not throw
      expect(result.current.error).toBeNull();
    });

    it('should provide addAction action', async () => {
      const { result } = renderHook(() => useDashboard());

      await act(async () => {
        await result.current.actions.addAction({
          title: 'New Action',
          description: 'New action description',
          priority: 'Medium'
        });
      });

      // Should not throw
      expect(result.current.error).toBeNull();
    });

    it('should provide recovery functionality', () => {
      const { result } = renderHook(() => useDashboard());

      expect(result.current.recovery.canRecover).toBe(false); // No error initially
      expect(result.current.recovery.suggestions).toEqual([]);
      expect(typeof result.current.recovery.recover).toBe('function');
    });

    it('should accept custom configuration', () => {
      const config = {
        refreshInterval: 60000,
        maxActionItems: 5,
        enableAutoRefresh: false
      };

      const { result } = renderHook(() => useDashboard(config));

      // Should initialize without errors
      expect(result.current.error).toBeNull();
    });
  });

  describe('useDashboardActions', () => {
    const mockActions = [
      {
        id: 'action-1',
        title: 'Test Action 1',
        description: 'Description 1',
        priority: 'High' as const,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'action-2',
        title: 'Test Action 2',
        description: 'Description 2',
        priority: 'Low' as const,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should initialize with provided actions', () => {
      const { result } = renderHook(() => useDashboardActions(mockActions));

      expect(result.current.actions).toEqual(mockActions);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should add new action', async () => {
      const { result } = renderHook(() => useDashboardActions([]));

      await act(async () => {
        await result.current.operations.addAction({
          title: 'New Action',
          description: 'New Description',
          priority: 'Medium'
        });
      });

      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions[0].title).toBe('New Action');
    });

    it('should update existing action', async () => {
      const { result } = renderHook(() => useDashboardActions(mockActions));

      await act(async () => {
        await result.current.operations.updateAction('action-1', {
          title: 'Updated Title'
        });
      });

      const updatedAction = result.current.actions.find(a => a.id === 'action-1');
      expect(updatedAction?.title).toBe('Updated Title');
    });

    it('should complete action', async () => {
      const { result } = renderHook(() => useDashboardActions(mockActions));

      await act(async () => {
        await result.current.operations.completeAction('action-1');
      });

      const completedAction = result.current.actions.find(a => a.id === 'action-1');
      expect(completedAction?.completed).toBe(true);
    });

    it('should delete action', async () => {
      const { result } = renderHook(() => useDashboardActions(mockActions));

      await act(async () => {
        await result.current.operations.deleteAction('action-1');
      });

      expect(result.current.actions).toHaveLength(1);
      expect(result.current.actions.find(a => a.id === 'action-1')).toBeUndefined();
    });

    it('should filter actions by priority', () => {
      const { result } = renderHook(() => useDashboardActions(mockActions));

      const highPriorityActions = result.current.operations.filterByPriority('High');
      expect(highPriorityActions).toHaveLength(1);
      expect(highPriorityActions[0].priority).toBe('High');
    });

    it('should filter actions by completion status', () => {
      const actionsWithCompleted = [
        ...mockActions,
        {
          id: 'action-3',
          title: 'Completed Action',
          description: 'Description 3',
          priority: 'Medium' as const,
          completed: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const { result } = renderHook(() => useDashboardActions(actionsWithCompleted));

      const completedActions = result.current.operations.filterByCompletion(true);
      const pendingActions = result.current.operations.filterByCompletion(false);

      expect(completedActions).toHaveLength(1);
      expect(pendingActions).toHaveLength(2);
    });

    it('should sort actions by due date', () => {
      const actionsWithDueDates = mockActions.map((action, index) => ({
        ...action,
        dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000) // Different due dates
      }));

      const { result } = renderHook(() => useDashboardActions(actionsWithDueDates));

      const sortedActions = result.current.operations.sortByDueDate();
      expect(sortedActions[0].dueDate!.getTime()).toBeLessThan(sortedActions[1].dueDate!.getTime());
    });

    it('should sort actions by priority', () => {
      const { result } = renderHook(() => useDashboardActions(mockActions));

      const sortedActions = result.current.operations.sortByPriority();
      expect(sortedActions[0].priority).toBe('High'); // High priority first
      expect(sortedActions[1].priority).toBe('Low');
    });
  });

  describe('useDashboardTopics', () => {
    const mockTopics = [
      {
        id: 'topic-1',
        name: 'Healthcare',
        category: 'legislative' as const,
        billCount: 5,
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'topic-2',
        name: 'Education',
        category: 'policy' as const,
        billCount: 3,
        is_active: false,
        created_at: new Date()
      }
    ];

    it('should initialize with provided topics', () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      expect(result.current.topics).toEqual(mockTopics);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should add new topic', async () => {
      const { result } = renderHook(() => useDashboardTopics([]));

      await act(async () => {
        await result.current.operations.addTopic({
          name: 'New Topic',
          category: 'community',
          billCount: 0,
          is_active: true
        });
      });

      expect(result.current.topics).toHaveLength(1);
      expect(result.current.topics[0].name).toBe('New Topic');
    });

    it('should prevent duplicate topic names', async () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      await act(async () => {
        try {
          await result.current.operations.addTopic({
            name: 'Healthcare', // Duplicate name
            category: 'community',
            billCount: 0,
            is_active: true
          });
        } catch (error) {
          expect(error.message).toContain('already exists');
        }
      });
    });

    it('should update existing topic', async () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      await act(async () => {
        await result.current.operations.updateTopic('topic-1', {
          name: 'Updated Healthcare'
        });
      });

      const updatedTopic = result.current.topics.find(t => t.id === 'topic-1');
      expect(updatedTopic?.name).toBe('Updated Healthcare');
    });

    it('should remove topic', async () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      await act(async () => {
        await result.current.operations.removeTopic('topic-1');
      });

      expect(result.current.topics).toHaveLength(1);
      expect(result.current.topics.find(t => t.id === 'topic-1')).toBeUndefined();
    });

    it('should toggle topic status', async () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      await act(async () => {
        await result.current.operations.toggleTopicStatus('topic-1');
      });

      const toggledTopic = result.current.topics.find(t => t.id === 'topic-1');
      expect(toggledTopic?.is_active).toBe(false); // Was true, now false
    });

    it('should filter topics by category', () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      const legislativeTopics = result.current.operations.filterByCategory('legislative');
      expect(legislativeTopics).toHaveLength(1);
      expect(legislativeTopics[0].category).toBe('legislative');
    });

    it('should filter topics by status', () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      const activeTopics = result.current.operations.filterByStatus(true);
      const inactiveTopics = result.current.operations.filterByStatus(false);

      expect(activeTopics).toHaveLength(1);
      expect(inactiveTopics).toHaveLength(1);
    });

    it('should search topics by name and description', () => {
      const topicsWithDescription = mockTopics.map(topic => ({
        ...topic,
        description: `Description for ${topic.name}`
      }));

      const { result } = renderHook(() => useDashboardTopics(topicsWithDescription));

      const searchResults = result.current.operations.searchTopics('health');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Healthcare');
    });

    it('should sort topics by bill count', () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      const sortedTopics = result.current.operations.sortByBillCount();
      expect(sortedTopics[0].billCount).toBeGreaterThan(sortedTopics[1].billCount);
    });

    it('should sort topics by name', () => {
      const { result } = renderHook(() => useDashboardTopics(mockTopics));

      const sortedTopics = result.current.operations.sortByName();
      expect(sortedTopics[0].name).toBe('Education'); // Alphabetically first
      expect(sortedTopics[1].name).toBe('Healthcare');
    });
  });

  describe('useDashboardConfig', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null);
    });

    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useDashboardConfig());

      expect(result.current.config.refreshInterval).toBe(30000);
      expect(result.current.config.maxActionItems).toBe(10);
      expect(result.current.config.enableAutoRefresh).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        refreshInterval: 60000,
        maxActionItems: 5
      };

      const { result } = renderHook(() => useDashboardConfig(customConfig));

      expect(result.current.config.refreshInterval).toBe(60000);
      expect(result.current.config.maxActionItems).toBe(5);
    });

    it('should load configuration from localStorage', () => {
      const savedConfig = {
        refreshInterval: 45000,
        maxActionItems: 15,
        maxTrackedTopics: 25,
        enableAutoRefresh: false,
        showCompletedActions: true,
        defaultView: 'topics'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig));

      const { result } = renderHook(() => useDashboardConfig());

      expect(result.current.config.refreshInterval).toBe(45000);
      expect(result.current.config.enableAutoRefresh).toBe(false);
    });

    it('should update configuration', async () => {
      const { result } = renderHook(() => useDashboardConfig());

      await act(async () => {
        await result.current.operations.updateConfig({
          refreshInterval: 45000,
          enableAutoRefresh: false
        });
      });

      expect(result.current.config.refreshInterval).toBe(45000);
      expect(result.current.config.enableAutoRefresh).toBe(false);
    });

    it('should reset configuration to defaults', async () => {
      const { result } = renderHook(() => useDashboardConfig({
        refreshInterval: 60000,
        enableAutoRefresh: false
      }));

      await act(async () => {
        await result.current.operations.resetConfig();
      });

      expect(result.current.config.refreshInterval).toBe(30000);
      expect(result.current.config.enableAutoRefresh).toBe(true);
    });

    it('should set refresh interval', async () => {
      const { result } = renderHook(() => useDashboardConfig());

      await act(async () => {
        await result.current.operations.setRefreshInterval(60000);
      });

      expect(result.current.config.refreshInterval).toBe(60000);
    });

    it('should toggle auto refresh', async () => {
      const { result } = renderHook(() => useDashboardConfig());

      const initialAutoRefresh = result.current.config.enableAutoRefresh;

      await act(async () => {
        await result.current.operations.toggleAutoRefresh();
      });

      expect(result.current.config.enableAutoRefresh).toBe(!initialAutoRefresh);
    });

    it('should export configuration', () => {
      const { result } = renderHook(() => useDashboardConfig());

      const exported = result.current.operations.exportConfig();
      const parsed = JSON.parse(exported);

      expect(parsed.refreshInterval).toBe(30000);
      expect(parsed.maxActionItems).toBe(10);
    });

    it('should import configuration', async () => {
      const { result } = renderHook(() => useDashboardConfig());

      const configToImport = {
        refreshInterval: 45000,
        maxActionItems: 15,
        maxTrackedTopics: 25,
        enableAutoRefresh: false,
        showCompletedActions: true,
        defaultView: 'analytics'
      };

      await act(async () => {
        await result.current.operations.importConfig(JSON.stringify(configToImport));
      });

      expect(result.current.config.refreshInterval).toBe(45000);
      expect(result.current.config.maxActionItems).toBe(15);
      expect(result.current.config.defaultView).toBe('analytics');
    });

    it('should save configuration to localStorage on changes', async () => {
      const { result } = renderHook(() => useDashboardConfig());

      await act(async () => {
        await result.current.operations.updateConfig({
          refreshInterval: 45000
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-config',
        expect.stringContaining('"refreshInterval":45000')
      );
    });
  });
});

