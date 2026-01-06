/**
 * Dashboard Types
 *
 * Core types for dashboard functionality including actions, topics, and configuration
 */

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  priority: ActionPriority;
  due_date?: Date;
  category: string;
  bill_id?: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ActionPriority = 'High' | 'Medium' | 'Low';

export interface TrackedTopic {
  id: string;
  name: string;
  category: TopicCategory;
  billCount: number;
  is_active: boolean;
  description?: string;
  keywords?: string[];
  created_at: Date;
}

export type TopicCategory =
  | 'healthcare'
  | 'education'
  | 'environment'
  | 'economy'
  | 'security'
  | 'infrastructure'
  | 'social'
  | 'other';

export interface DashboardData {
  summary: {
    billsTracked: number;
    actionsNeeded: number;
    topicsCount: number;
    recentActivity: number;
    completedActions: number;
    pendingActions: number;
    lastUpdated: Date;
  };
  actionItems: ActionItem[];
  trackedTopics: TrackedTopic[];
  isLoading: boolean;
  error: Error | null;
  lastRefresh: Date | null;
}

export interface DashboardConfig {
  refreshInterval: number;
  maxActionItems: number;
  maxTrackedTopics: number;
  enableAutoRefresh: boolean;
  showCompletedActions: boolean;
  defaultView: DashboardSection;
}

export type DashboardSection = 'activity' | 'actions' | 'topics' | 'analytics';

export interface UseDashboardResult {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  actions: {
    refresh: () => Promise<void>;
    reset: () => void;
    addTopic: (topic: Omit<TrackedTopic, 'id' | 'created_at'>) => Promise<void>;
    removeTopic: (topicId: string) => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
    addAction: (action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  };
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };
}
