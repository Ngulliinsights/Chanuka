/**
 * Dashboard component types and interfaces
 * Following navigation component patterns for consistency
 */

export type DashboardSection = 'activity' | 'actions' | 'topics' | 'analytics';
export type ActionPriority = 'High' | 'Medium' | 'Low';
export type TopicCategory = 'legislative' | 'community' | 'policy' | 'advocacy';

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  dueDate?: Date;
  category?: string;
  billId?: string;
  completed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivitySummary {
  billsTracked: number;
  actionsNeeded: number;
  topicsCount: number;
  recentActivity: number;
  completedActions: number;
  pendingActions: number;
  lastUpdated: Date;
}

export interface TrackedTopic {
  id: string;
  name: string;
  category: TopicCategory;
  billCount: number;
  isActive: boolean;
  createdAt: Date;
  description?: string;
  keywords?: string[];
}

export interface DashboardData {
  summary: ActivitySummary;
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

export interface DashboardComponentProps {
  className?: string;
  config?: Partial<DashboardConfig>;
  onError?: (error: Error) => void;
  onDataChange?: (data: Partial<DashboardData>) => void;
}

export interface UseDashboardResult {
  data: DashboardData;
  loading: boolean;
  error: Error | null;
  actions: {
    refresh: () => Promise<void>;
    reset: () => void;
    addTopic: (topic: Omit<TrackedTopic, 'id' | 'createdAt'>) => Promise<void>;
    removeTopic: (topicId: string) => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
    addAction: (action: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  };
  recovery: {
    canRecover: boolean;
    suggestions: string[];
    recover: () => Promise<boolean>;
  };
}

