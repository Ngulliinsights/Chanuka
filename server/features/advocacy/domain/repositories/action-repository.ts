// ============================================================================
// ADVOCACY COORDINATION - Action Repository Interface
// ============================================================================

import { ActionItem, NewActionItem } from '../entities/action-item.js';
import { ActionFilters, PaginationOptions, ActionTemplate } from '../../types/index.js';

export interface IActionRepository {
  // Basic CRUD operations
  findById(id: string): Promise<ActionItem | null>;
  findAll(filters?: ActionFilters, pagination?: PaginationOptions): Promise<ActionItem[]>;
  create(action: NewActionItem): Promise<ActionItem>;
  update(id: string, updates: Partial<ActionItem>): Promise<ActionItem | null>;
  delete(id: string): Promise<boolean>;

  // Action-specific queries
  findByCampaign(campaignId: string, filters?: ActionFilters): Promise<ActionItem[]>;
  findByUser(userId: string, filters?: ActionFilters): Promise<ActionItem[]>;
  findByStatus(status: ActionItem['status'], filters?: ActionFilters): Promise<ActionItem[]>;
  findByType(actionType: ActionItem['actionType'], filters?: ActionFilters): Promise<ActionItem[]>;
  findByPriority(priority: ActionItem['priority'], filters?: ActionFilters): Promise<ActionItem[]>;
  
  // Timeline and scheduling
  findDueToday(): Promise<ActionItem[]>;
  findDueSoon(days: number): Promise<ActionItem[]>;
  findOverdue(): Promise<ActionItem[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<ActionItem[]>;
  
  // User workflow
  getUserDashboard(userId: string): Promise<{
    pending: ActionItem[];
    inProgress: ActionItem[];
    dueToday: ActionItem[];
    overdue: ActionItem[];
    recentlyCompleted: ActionItem[];
  }>;
  getUserActionHistory(userId: string, pagination?: PaginationOptions): Promise<ActionItem[]>;
  getUserActionStats(userId: string): Promise<{
    totalActions: number;
    completedActions: number;
    completionRate: number;
    averageCompletionTime: number;
    actionsByType: Record<string, number>;
    actionsByPriority: Record<string, number>;
  }>;
  
  // Campaign management
  getCampaignActionSummary(campaignId: string): Promise<{
    totalActions: number;
    completedActions: number;
    pendingActions: number;
    inProgressActions: number;
    skippedActions: number;
    completionRate: number;
    averageCompletionTime: number;
    actionsByType: Record<string, number>;
  }>;
  
  // Templates and customization
  getActionTemplates(actionType?: ActionItem['actionType']): Promise<ActionTemplate[]>;
  createActionTemplate(template: Omit<ActionTemplate, 'id'>): Promise<ActionTemplate>;
  updateActionTemplate(id: string, updates: Partial<ActionTemplate>): Promise<ActionTemplate | null>;
  deleteActionTemplate(id: string): Promise<boolean>;
  
  // Bulk operations
  createBulkActions(actions: NewActionItem[]): Promise<ActionItem[]>;
  bulkUpdateStatus(actionIds: string[], status: ActionItem['status']): Promise<number>;
  bulkAssignDueDate(actionIds: string[], dueDate: Date): Promise<number>;
  bulkUpdatePriority(actionIds: string[], priority: ActionItem['priority']): Promise<number>;
  
  // Analytics and reporting
  getActionAnalytics(filters?: ActionFilters): Promise<{
    completionRates: Record<string, number>;
    averageCompletionTimes: Record<string, number>;
    difficultyAnalysis: Record<string, {
      averageTime: number;
      completionRate: number;
      userSatisfaction: number;
    }>;
    effectivenessMetrics: Record<string, {
      successRate: number;
      impactScore: number;
      userFeedback: number;
    }>;
  }>;
  
  // Recommendations and optimization
  getRecommendedActions(userId: string, limit?: number): Promise<ActionItem[]>;
  findSimilarActions(actionId: string, limit?: number): Promise<ActionItem[]>;
  getOptimalActionSequence(campaignId: string, userId: string): Promise<ActionItem[]>;
  
  // Feedback and improvement
  recordActionFeedback(actionId: string, feedback: ActionItem['userFeedback']): Promise<boolean>;
  getActionFeedbackSummary(actionType: ActionItem['actionType']): Promise<{
    averageRating: number;
    totalFeedback: number;
    commonSuggestions: string[];
    satisfactionTrend: Array<{ date: Date; rating: number }>;
  }>;
  
  // Collaboration and coordination
  findCollaborativeActions(userId: string): Promise<ActionItem[]>;
  getActionDependencies(actionId: string): Promise<{
    prerequisites: ActionItem[];
    dependents: ActionItem[];
  }>;
  
  // Reminders and notifications
  getActionsNeedingReminders(): Promise<ActionItem[]>;
  markReminderSent(actionId: string): Promise<boolean>;
  
  // Search and filtering
  search(query: string, filters?: ActionFilters): Promise<ActionItem[]>;
  
  // Statistics
  getStats(): Promise<{
    totalActions: number;
    actionsByStatus: Array<{ status: string; count: number }>;
    actionsByType: Array<{ type: string; count: number }>;
    actionsByPriority: Array<{ priority: string; count: number }>;
    completionRate: number;
    averageCompletionTime: number;
  }>;
}