/**
 * Dashboard data formatting utilities
 * Following navigation component utility patterns
 */

import type { 
  ActivitySummary, 
  ActionItem, 
  TrackedTopic, 
  ActionPriority,
  TopicCategory 
} from '@client/types';

/**
 * Format activity summary for display
 */
export function formatActivitySummary(summary: ActivitySummary): {
  billsTracked: string;
  actionsNeeded: string;
  topicsCount: string;
  completionRate: string;
  lastUpdatedText: string;
} {
  const completionRate = summary.completedActions + summary.pendingActions > 0
    ? Math.round((summary.completedActions / (summary.completedActions + summary.pendingActions)) * 100)
    : 0;

  return {
    billsTracked: formatNumber(summary.billsTracked),
    actionsNeeded: formatNumber(summary.actionsNeeded),
    topicsCount: formatNumber(summary.topicsCount),
    completionRate: `${completionRate}%`,
    lastUpdatedText: formatRelativeTime(summary.lastUpdated)
  };
}

/**
 * Format action item for display
 */
export function formatActionItem(item: ActionItem): {
  title: string;
  description: string;
  priority: ActionPriority;
  priorityColor: string;
  due_date: string | null;
  dueDateColor: string;
  isOverdue: boolean;
  createdText: string;
  updatedText: string;
} {
  const dueDateInfo = item.due_date ? formatDueDate(item.due_date) : null;
  
  return {
    title: item.title,
    description: truncateText(item.description, 100),
    priority: item.priority,
    priorityColor: getPriorityColor(item.priority),
    due_date: dueDateInfo?.text || null,
    dueDateColor: dueDateInfo?.color || 'text-slate-600',
    isOverdue: dueDateInfo?.isOverdue || false,
    createdText: formatRelativeTime(item.created_at),
    updatedText: formatRelativeTime(item.updated_at)
  };
}

/**
 * Format tracked topic for display
 */
export function formatTrackedTopic(topic: TrackedTopic): {
  name: string;
  category: TopicCategory;
  categoryColor: string;
  billCountText: string;
  statusText: string;
  statusColor: string;
  createdText: string;
  description: string;
} {
  return {
    name: topic.name,
    category: topic.category,
    categoryColor: getCategoryColor(topic.category),
    billCountText: formatBillCount(topic.billCount),
    statusText: topic.is_active ? 'Active' : 'Inactive',
    statusColor: topic.is_active ? 'text-green-600' : 'text-slate-400',
    createdText: formatRelativeTime(topic.created_at),
    description: topic.description ? truncateText(topic.description, 150) : ''
  };
}

/**
 * Format dashboard data for export
 */
export function formatDashboardData(data: {
  summary: ActivitySummary;
  actionItems: ActionItem[];
  trackedTopics: TrackedTopic[];
}): string {
  const exportData = {
    summary: formatActivitySummary(data.summary),
    actionItems: data.actionItems.map(formatActionItem),
    trackedTopics: data.trackedTopics.map(formatTrackedTopic),
    exportedAt: new Date().toISOString()
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Helper functions
 */

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return '1m ago'; // Changed from 'Just now' to include 'ago'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function formatDueDate(due_date: Date): {
  text: string;
  color: string;
  isOverdue: boolean;
} {
  const now = new Date();
  const diffMs = due_date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)} days overdue`,
      color: 'text-red-600',
      isOverdue: true
    };
  } else if (diffDays === 0) {
    return {
      text: 'Due today',
      color: 'text-orange-600',
      isOverdue: false
    };
  } else if (diffDays <= 3) {
    return {
      text: `Due in ${diffDays} days`,
      color: 'text-slate-600', // Changed from 'text-yellow-600' to 'text-slate-600'
      isOverdue: false
    };
  } else {
    return {
      text: `Due in ${diffDays} days`,
      color: 'text-slate-600',
      isOverdue: false
    };
  }
}

function formatBillCount(count: number): string {
  if (count === 0) return 'No bills';
  if (count === 1) return '1 bill';
  return `${formatNumber(count)} bills`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getPriorityColor(priority: ActionPriority): string {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getCategoryColor(category: TopicCategory): string {
  switch (category) {
    case 'legislative':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'community':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'policy':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'advocacy':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

