import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
/**
 * Dashboard types tests
 * Following navigation component testing patterns
 */

import type { 
  ActionItem, 
  ActivitySummary, 
  TrackedTopic, 
  DashboardConfig,
  DashboardData,
  ActionPriority,
  TopicCategory,
  DashboardSection
} from '../types';

describe('Dashboard Types', () => {
  describe('ActionItem', () => {
    it('should have required properties', () => {
      const actionItem: ActionItem = {
        id: 'action-1',
        title: 'Test Action',
        description: 'Test Description',
        priority: 'High',
        created_at: new Date(),
        updated_at: new Date()
      };

      expect(actionItem.id).toBeDefined();
      expect(actionItem.title).toBeDefined();
      expect(actionItem.description).toBeDefined();
      expect(actionItem.priority).toBeDefined();
      expect(actionItem.created_at).toBeDefined();
      expect(actionItem.updated_at).toBeDefined();
    });

    it('should support optional properties', () => { const actionItem: ActionItem = {
        id: 'action-1',
        title: 'Test Action',
        description: 'Test Description',
        priority: 'High',
        dueDate: new Date(),
        category: 'Legislative',
        bill_id: 'bill-123',
        completed: true,
        created_at: new Date(),
        updated_at: new Date()
       };

      expect(actionItem.dueDate).toBeDefined();
      expect(actionItem.category).toBeDefined();
      expect(actionItem.bill_id).toBeDefined();
      expect(actionItem.completed).toBeDefined();
    });

    it('should accept valid priority values', () => {
      const priorities: ActionPriority[] = ['High', 'Medium', 'Low'];
      
      priorities.forEach(priority => {
        const actionItem: ActionItem = {
          id: 'action-1',
          title: 'Test Action',
          description: 'Test Description',
          priority,
          created_at: new Date(),
          updated_at: new Date()
        };

        expect(actionItem.priority).toBe(priority);
      });
    });
  });

  describe('ActivitySummary', () => {
    it('should have all required numeric properties', () => {
      const summary: ActivitySummary = {
        billsTracked: 5,
        actionsNeeded: 3,
        topicsCount: 8,
        recentActivity: 12,
        completedActions: 7,
        pendingActions: 3,
        lastUpdated: new Date()
      };

      expect(typeof summary.billsTracked).toBe('number');
      expect(typeof summary.actionsNeeded).toBe('number');
      expect(typeof summary.topicsCount).toBe('number');
      expect(typeof summary.recentActivity).toBe('number');
      expect(typeof summary.completedActions).toBe('number');
      expect(typeof summary.pendingActions).toBe('number');
      expect(summary.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('TrackedTopic', () => {
    it('should have required properties', () => {
      const topic: TrackedTopic = {
        id: 'topic-1',
        name: 'Healthcare',
        category: 'legislative',
        billCount: 5,
        is_active: true,
        created_at: new Date()
      };

      expect(topic.id).toBeDefined();
      expect(topic.name).toBeDefined();
      expect(topic.category).toBeDefined();
      expect(typeof topic.billCount).toBe('number');
      expect(typeof topic.is_active).toBe('boolean');
      expect(topic.created_at).toBeInstanceOf(Date);
    });

    it('should accept valid category values', () => {
      const categories: TopicCategory[] = ['legislative', 'community', 'policy', 'advocacy'];
      
      categories.forEach(category => {
        const topic: TrackedTopic = {
          id: 'topic-1',
          name: 'Test Topic',
          category,
          billCount: 0,
          is_active: true,
          created_at: new Date()
        };

        expect(topic.category).toBe(category);
      });
    });

    it('should support optional properties', () => {
      const topic: TrackedTopic = {
        id: 'topic-1',
        name: 'Healthcare',
        category: 'legislative',
        billCount: 5,
        is_active: true,
        created_at: new Date(),
        description: 'Healthcare related bills',
        keywords: ['health', 'medical', 'insurance']
      };

      expect(topic.description).toBeDefined();
      expect(Array.isArray(topic.keywords)).toBe(true);
    });
  });

  describe('DashboardConfig', () => {
    it('should have all required configuration properties', () => {
      const config: DashboardConfig = {
        refreshInterval: 30000,
        maxActionItems: 10,
        maxTrackedTopics: 20,
        enableAutoRefresh: true,
        showCompletedActions: false,
        defaultView: 'activity'
      };

      expect(typeof config.refreshInterval).toBe('number');
      expect(typeof config.maxActionItems).toBe('number');
      expect(typeof config.maxTrackedTopics).toBe('number');
      expect(typeof config.enableAutoRefresh).toBe('boolean');
      expect(typeof config.showCompletedActions).toBe('boolean');
      expect(config.defaultView).toBeDefined();
    });

    it('should accept valid dashboard section values', () => {
      const sections: DashboardSection[] = ['activity', 'actions', 'topics', 'analytics'];
      
      sections.forEach(section => {
        const config: DashboardConfig = {
          refreshInterval: 30000,
          maxActionItems: 10,
          maxTrackedTopics: 20,
          enableAutoRefresh: true,
          showCompletedActions: false,
          defaultView: section
        };

        expect(config.defaultView).toBe(section);
      });
    });
  });

  describe('DashboardData', () => {
    it('should have all required properties', () => {
      const data: DashboardData = {
        summary: {
          billsTracked: 5,
          actionsNeeded: 3,
          topicsCount: 8,
          recentActivity: 12,
          completedActions: 7,
          pendingActions: 3,
          lastUpdated: new Date()
        },
        actionItems: [],
        trackedTopics: [],
        isLoading: false,
        error: null,
        lastRefresh: new Date()
      };

      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.actionItems)).toBe(true);
      expect(Array.isArray(data.trackedTopics)).toBe(true);
      expect(typeof data.isLoading).toBe('boolean');
      expect(data.error).toBeNull();
      expect(data.lastRefresh).toBeInstanceOf(Date);
    });

    it('should support error state', () => {
      const error = new Error('Test error');
      const data: DashboardData = {
        summary: {
          billsTracked: 0,
          actionsNeeded: 0,
          topicsCount: 0,
          recentActivity: 0,
          completedActions: 0,
          pendingActions: 0,
          lastUpdated: new Date()
        },
        actionItems: [],
        trackedTopics: [],
        isLoading: false,
        error,
        lastRefresh: null
      };

      expect(data.error).toBe(error);
      expect(data.lastRefresh).toBeNull();
    });
  });
});

