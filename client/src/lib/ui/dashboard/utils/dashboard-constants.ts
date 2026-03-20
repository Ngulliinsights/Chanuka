/**
 * Dashboard constants and configuration values
 * Following navigation component constants patterns
 */

import type { DashboardConfig, ActionPriority, TopicCategory, DashboardSection } from '../types';

export const dashboardConstants = {
  // Default configuration values
  DEFAULT_CONFIG: {
    refreshInterval: 30000, // 30 seconds
    maxActionItems: 10,
    maxTrackedTopics: 20,
    enableAutoRefresh: true,
    showCompletedActions: false,
    defaultView: 'activity' as DashboardSection,
  } as Partial<DashboardConfig>,

  // Refresh intervals (in milliseconds)
  REFRESH_INTERVALS: {
    FAST: 10000, // 10 seconds
    NORMAL: 30000, // 30 seconds
    SLOW: 60000, // 1 minute
    VERY_SLOW: 300000, // 5 minutes
  },

  // Priority levels and their properties
  PRIORITIES: {
    HIGH: {
      value: 'High' as ActionPriority,
      weight: 3,
      color: 'red',
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
      borderClass: 'border-red-200',
    },
    MEDIUM: {
      value: 'Medium' as ActionPriority,
      weight: 2,
      color: 'yellow',
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-800',
      borderClass: 'border-yellow-200',
    },
    LOW: {
      value: 'Low' as ActionPriority,
      weight: 1,
      color: 'blue',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
      borderClass: 'border-blue-200',
    },
  },

  // Topic categories and their properties
  CATEGORIES: {
    LEGISLATIVE: {
      value: 'legislative' as TopicCategory,
      label: 'Legislative',
      color: 'blue',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
      borderClass: 'border-blue-200',
      icon: '🏛️',
    },
    COMMUNITY: {
      value: 'community' as TopicCategory,
      label: 'Community',
      color: 'green',
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
      borderClass: 'border-green-200',
      icon: '👥',
    },
    POLICY: {
      value: 'policy' as TopicCategory,
      label: 'Policy',
      color: 'purple',
      bgClass: 'bg-purple-100',
      textClass: 'text-purple-800',
      borderClass: 'border-purple-200',
      icon: '📋',
    },
    ADVOCACY: {
      value: 'advocacy' as TopicCategory,
      label: 'Advocacy',
      color: 'orange',
      bgClass: 'bg-orange-100',
      textClass: 'text-orange-800',
      borderClass: 'border-orange-200',
      icon: '📢',
    },
  },

  // Dashboard sections
  SECTIONS: {
    ACTIVITY: {
      value: 'activity' as DashboardSection,
      label: 'Activity',
      icon: '📊',
    },
    ACTIONS: {
      value: 'actions' as DashboardSection,
      label: 'Actions',
      icon: '✅',
    },
    TOPICS: {
      value: 'topics' as DashboardSection,
      label: 'Topics',
      icon: '🏷️',
    },
    ANALYTICS: {
      value: 'analytics' as DashboardSection,
      label: 'Analytics',
      icon: '📈',
    },
  },

  // Validation limits
  LIMITS: {
    MAX_ACTION_TITLE_LENGTH: 200,
    MAX_ACTION_DESCRIPTION_LENGTH: 1000,
    MAX_TOPIC_NAME_LENGTH: 100,
    MAX_TOPIC_DESCRIPTION_LENGTH: 500,
    MAX_TOPIC_KEYWORDS: 10,
    MAX_KEYWORD_LENGTH: 50,
    MIN_REFRESH_INTERVAL: 1000, // 1 second
    MAX_REFRESH_INTERVAL: 3600000, // 1 hour
    MAX_ACTION_ITEMS_DISPLAY: 100,
    MAX_TRACKED_TOPICS_DISPLAY: 50,
  },

  // Error recovery settings
  RECOVERY: {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAYS: [1000, 2000, 5000], // Progressive delays in ms
    CACHE_DURATION: 300000, // 5 minutes
    FALLBACK_REFRESH_INTERVAL: 60000, // 1 minute
  },

  // UI constants
  UI: {
    LOADING_SKELETON_COUNT: 3,
    ANIMATION_DURATION: 200,
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 5000,
    TOOLTIP_DELAY: 500,
  },

  // Storage keys
  STORAGE_KEYS: {
    CONFIG: 'dashboard-config',
    CACHE: 'dashboard-cache',
    PREFERENCES: 'dashboard-preferences',
  },

  // API endpoints (relative paths)
  ENDPOINTS: {
    SUMMARY: '/api/dashboard/summary',
    ACTIONS: '/api/dashboard/actions',
    TOPICS: '/api/dashboard/topics',
    CONFIG: '/api/dashboard/config',
  },

  // Date formats
  DATE_FORMATS: {
    DISPLAY: 'MMM dd, yyyy',
    TIME: 'HH:mm',
    FULL: 'MMM dd, yyyy HH:mm',
    ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  },

  // Status indicators
  STATUS: {
    ACTIVE: {
      label: 'Active',
      color: 'green',
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
    },
    INACTIVE: {
      label: 'Inactive',
      color: 'gray',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-800',
    },
    COMPLETED: {
      label: 'Completed',
      color: 'blue',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
    },
    PENDING: {
      label: 'Pending',
      color: 'yellow',
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-800',
    },
    OVERDUE: {
      label: 'Overdue',
      color: 'red',
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
    },
  },
} as const;
