// ============================================================================
// ADVOCACY COORDINATION - Action Repository Implementation (Refined)
// ============================================================================

import { IActionRepository } from '../../domain/repositories/action-repository.js';
import { ActionItem, NewActionItem } from '../../domain/entities/action-item.js';
import { ActionFilters, PaginationOptions, ActionTemplate } from '../../types/index.js';
import { BaseRepository } from '../../../infrastructure/database/repositories/base-repository.js';
import { logger } from '../../../../shared/core/index.js';
import { v4 as uuidv4 } from 'uuid';

export class ActionRepositoryImpl extends BaseRepository implements IActionRepository {

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  async findById(id: string): Promise<ActionItem | null> {
    try {
      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        WHERE ai.id = ?
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToActionItem(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find action by ID', error, { 
        actionId: id,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findAll(filters: ActionFilters = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<ActionItem[]> {
    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const { limit, offset } = this.buildPagination(pagination);
      const orderBy = this.buildOrderBy(pagination.sortBy, pagination.sortOrder);

      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        ${whereClause}
        ${orderBy}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions', error, { 
        filters,
        pagination,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async create(action: NewActionItem): Promise<ActionItem> {
    try {
      const id = uuidv4();
      const now = new Date();

      await this.db.execute(`
        INSERT INTO action_items (
          id, campaign_id, user_id, action_type, title, description, instructions,
          status, priority, assigned_at, due_date, template, customized_content,
          target_representative, target_committee, related_bill_section,
          estimated_time_minutes, difficulty, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        action.campaignId,
        action.userId,
        action.actionType,
        action.title,
        action.description,
        action.instructions,
        'pending',
        action.priority || 'medium',
        now,
        action.dueDate || null,
        action.template ? JSON.stringify(action.template) : null,
        action.customizedContent ? JSON.stringify(action.customizedContent) : null,
        action.targetRepresentative || null,
        action.targetCommittee || null,
        action.relatedBillSection || null,
        action.estimatedTimeMinutes,
        action.difficulty || 'medium',
        now,
        now
      ]);

      const createdAction = await this.findById(id);
      if (!createdAction) {
        throw new Error('Failed to retrieve created action');
      }

      logger.info('Action created', { 
        actionId: id,
        campaignId: action.campaignId,
        actionType: action.actionType,
        component: 'ActionRepositoryImpl' 
      });

      return createdAction;
    } catch (error) {
      logger.error('Failed to create action', error, { 
        title: action.title,
        campaignId: action.campaignId,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async update(id: string, updates: Partial<ActionItem>): Promise<ActionItem | null> {
    try {
      const { setClause, params } = this.buildUpdateClause(updates);
      
      if (setClause.length === 0) {
        return await this.findById(id);
      }

      await this.db.execute(`
        UPDATE action_items 
        SET ${setClause.join(', ')}, updated_at = ?
        WHERE id = ?
      `, [...params, new Date(), id]);

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update action', error, { 
        actionId: id,
        updates: Object.keys(updates),
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.execute('DELETE FROM action_items WHERE id = ?', [id]);
      
      const success = result.rowsAffected > 0;
      
      if (success) {
        logger.info('Action deleted', { 
          actionId: id,
          component: 'ActionRepositoryImpl' 
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to delete action', error, { 
        actionId: id,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  // ============================================================================
  // Query Methods by Specific Criteria
  // ============================================================================

  async findByCampaign(campaignId: string, filters: ActionFilters = {}): Promise<ActionItem[]> {
    return await this.findAll({ ...filters, campaignId });
  }

  async findByUser(userId: string, filters: ActionFilters = {}): Promise<ActionItem[]> {
    try {
      const { whereClause, params } = this.buildWhereClause({ ...filters, userId });
      const { limit, offset } = this.buildPagination(filters.pagination || { page: 1, limit: 10 });
      const orderBy = this.buildOrderBy(filters.sortBy, filters.sortOrder);

      const result = await this.db.execute(`
        SELECT ai.*, 
               c.title as campaign_title,
               u.username,
               COUNT(DISTINCT ac.id) as completion_count,
               AVG(CASE WHEN ac.verified THEN 1.0 ELSE 0.0 END) as verification_rate
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id
        ${whereClause}
        GROUP BY ai.id, c.title, u.username
        ${orderBy}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions by user', error, { 
        userId,
        filters,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByStatus(status: ActionItem['status'], filters: ActionFilters = {}): Promise<ActionItem[]> {
    try {
      const { whereClause, params } = this.buildWhereClause({ ...filters, status });
      const { limit, offset } = this.buildPagination(filters.pagination || { page: 1, limit: 10 });
      const orderBy = this.buildOrderBy(filters.sortBy, filters.sortOrder);

      const result = await this.db.execute(`
        SELECT ai.*, 
               c.title as campaign_title,
               u.username,
               COUNT(DISTINCT cp.user_id) as assigned_participants,
               COUNT(DISTINCT ac.id) as completion_count
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        LEFT JOIN campaign_participants cp ON ai.campaign_id = cp.campaign_id
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id
        ${whereClause}
        GROUP BY ai.id, c.title, u.username
        ${orderBy}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions by status', error, { 
        status,
        filters,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByType(actionType: ActionItem['actionType'], filters: ActionFilters = {}): Promise<ActionItem[]> {
    try {
      const { whereClause, params } = this.buildWhereClause({ ...filters, actionType });
      const { limit, offset } = this.buildPagination(filters.pagination || { page: 1, limit: 10 });
      const orderBy = this.buildOrderBy(filters.sortBy, filters.sortOrder);

      const result = await this.db.execute(`
        SELECT ai.*, 
               c.title as campaign_title,
               u.username,
               COUNT(DISTINCT ac.id) as completion_count
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id
        ${whereClause}
        GROUP BY ai.id, c.title, u.username
        ${orderBy}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions by type', error, { 
        actionType,
        filters,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByPriority(priority: ActionItem['priority'], filters: ActionFilters = {}): Promise<ActionItem[]> {
    try {
      const { whereClause, params } = this.buildWhereClause({ ...filters, priority });
      const { limit, offset } = this.buildPagination(filters.pagination || { page: 1, limit: 10 });
      const orderBy = this.buildOrderBy(filters.sortBy || 'priority', filters.sortOrder || 'desc');

      const result = await this.db.execute(`
        SELECT ai.*, 
               c.title as campaign_title,
               u.username,
               ai.priority,
               CASE 
                 WHEN ai.due_date < NOW() THEN 'overdue'
                 WHEN ai.due_date < (NOW() + INTERVAL '7 days') THEN 'urgent'
                 ELSE 'normal'
               END as urgency_level
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        ${whereClause}
        ${orderBy}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions by priority', error, { 
        priority,
        filters,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  // ============================================================================
  // Date-Based Queries
  // ============================================================================

  async findDueToday(): Promise<ActionItem[]> {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        WHERE ai.due_date <= ? AND ai.status IN ('pending', 'in_progress')
        ORDER BY ai.due_date ASC, ai.priority DESC
      `, [today]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions due today', error, { 
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findDueSoon(days: number): Promise<ActionItem[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        WHERE ai.due_date <= ? AND ai.due_date > NOW() AND ai.status IN ('pending', 'in_progress')
        ORDER BY ai.due_date ASC, ai.priority DESC
      `, [futureDate]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions due soon', error, { 
        days,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findOverdue(): Promise<ActionItem[]> {
    try {
      const now = new Date();

      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        WHERE ai.due_date < ? AND ai.status IN ('pending', 'in_progress')
        ORDER BY ai.due_date ASC
      `, [now]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find overdue actions', error, { 
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<ActionItem[]> {
    try {
      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        WHERE ai.due_date BETWEEN ? AND ?
        ORDER BY ai.due_date ASC
      `, [startDate, endDate]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to find actions by date range', error, { 
        startDate,
        endDate,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  // ============================================================================
  // User Dashboard and History
  // ============================================================================

  async getUserDashboard(userId: string): Promise<any> {
    try {
      const [pending, inProgress, dueToday, overdue, recentlyCompleted] = await Promise.all([
        this.findByUser(userId, { status: 'pending' }),
        this.findByUser(userId, { status: 'in_progress' }),
        this.db.execute(`
          SELECT ai.*, c.title as campaign_title, u.username
          FROM action_items ai
          LEFT JOIN campaigns c ON ai.campaign_id = c.id
          LEFT JOIN users u ON ai.user_id = u.id
          WHERE ai.user_id = ? AND DATE(ai.due_date) = CURDATE() AND ai.status IN ('pending', 'in_progress')
          ORDER BY ai.due_date ASC, ai.priority DESC
        `, [userId]),
        this.db.execute(`
          SELECT ai.*, c.title as campaign_title, u.username
          FROM action_items ai
          LEFT JOIN campaigns c ON ai.campaign_id = c.id
          LEFT JOIN users u ON ai.user_id = u.id
          WHERE ai.user_id = ? AND ai.due_date < NOW() AND ai.status IN ('pending', 'in_progress')
          ORDER BY ai.due_date ASC
        `, [userId]),
        this.db.execute(`
          SELECT ai.*, c.title as campaign_title, u.username
          FROM action_items ai
          LEFT JOIN campaigns c ON ai.campaign_id = c.id
          LEFT JOIN users u ON ai.user_id = u.id
          WHERE ai.user_id = ? AND ai.status = 'completed' AND ai.completed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
          ORDER BY ai.completed_at DESC
          LIMIT 5
        `, [userId])
      ]);

      return {
        pending,
        inProgress,
        dueToday: dueToday.rows.map(row => this.mapRowToActionItem(row)),
        overdue: overdue.rows.map(row => this.mapRowToActionItem(row)),
        recentlyCompleted: recentlyCompleted.rows.map(row => this.mapRowToActionItem(row))
      };
    } catch (error) {
      logger.error('Failed to get user dashboard', error, { 
        userId,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async getUserActionHistory(userId: string, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<ActionItem[]> {
    try {
      const { limit, offset } = this.buildPagination(pagination);

      const result = await this.db.execute(`
        SELECT ai.*, c.title as campaign_title, u.username
        FROM action_items ai
        LEFT JOIN campaigns c ON ai.campaign_id = c.id
        LEFT JOIN users u ON ai.user_id = u.id
        WHERE ai.user_id = ?
        ORDER BY ai.updated_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      return result.rows.map(row => this.mapRowToActionItem(row));
    } catch (error) {
      logger.error('Failed to get user action history', error, { 
        userId,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async getUserActionStats(userId: string): Promise<any> {
    try {
      const result = await this.db.execute(`
        SELECT 
          COUNT(*) as total_actions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_actions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_actions,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_actions,
          AVG(CASE WHEN status = 'completed' AND actual_time_minutes IS NOT NULL THEN actual_time_minutes END) as avg_completion_time,
          action_type,
          priority,
          COUNT(*) as type_count
        FROM action_items
        WHERE user_id = ?
        GROUP BY action_type, priority
      `, [userId]);

      const stats = {
        totalActions: 0,
        completedActions: 0,
        pendingActions: 0,
        inProgressActions: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        actionsByType: {} as Record<string, number>,
        actionsByPriority: {} as Record<string, number>
      };

      result.rows.forEach(row => {
        stats.totalActions += row.total_actions || row.type_count;
        stats.completedActions += row.completed_actions || 0;
        stats.pendingActions += row.pending_actions || 0;
        stats.inProgressActions += row.in_progress_actions || 0;
        stats.actionsByType[row.action_type] = (stats.actionsByType[row.action_type] || 0) + row.type_count;
        stats.actionsByPriority[row.priority] = (stats.actionsByPriority[row.priority] || 0) + row.type_count;
      });

      stats.completionRate = stats.totalActions > 0 ? stats.completedActions / stats.totalActions : 0;
      stats.averageCompletionTime = result.rows.reduce((sum, row) => sum + (row.avg_completion_time || 0), 0) / (result.rows.length || 1);

      return stats;
    } catch (error) {
      logger.error('Failed to get user action stats', error, { 
        userId,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  // ============================================================================
  // Campaign Analytics
  // ============================================================================

  async getCampaignActionSummary(campaignId: string): Promise<any> {
    try {
      const result = await this.db.execute(`
        SELECT 
          COUNT(*) as total_actions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_actions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_actions,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_actions,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped_actions,
          AVG(CASE WHEN status = 'completed' AND actual_time_minutes IS NOT NULL THEN actual_time_minutes END) as avg_completion_time,
          action_type,
          COUNT(*) as type_count
        FROM action_items
        WHERE campaign_id = ?
        GROUP BY action_type
      `, [campaignId]);

      const summary = {
        totalActions: 0,
        completedActions: 0,
        pendingActions: 0,
        inProgressActions: 0,
        skippedActions: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        actionsByType: {} as Record<string, number>
      };

      result.rows.forEach(row => {
        summary.totalActions += row.type_count;
        summary.completedActions += row.completed_actions || 0;
        summary.pendingActions += row.pending_actions || 0;
        summary.inProgressActions += row.in_progress_actions || 0;
        summary.skippedActions += row.skipped_actions || 0;
        summary.actionsByType[row.action_type] = row.type_count;
      });

      summary.completionRate = summary.totalActions > 0 ? summary.completedActions / summary.totalActions : 0;
      summary.averageCompletionTime = result.rows.reduce((sum, row) => sum + (row.avg_completion_time || 0), 0) / (result.rows.length || 1);

      return summary;
    } catch (error) {
      logger.error('Failed to get campaign action summary', error, { 
        campaignId,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async getActionAnalytics(filters: ActionFilters = {}): Promise<any> {
    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      
      const completionRatesResult = await this.db.execute(`
        SELECT 
          ai.action_type,
          COUNT(DISTINCT ai.id) as total_actions,
          COUNT(DISTINCT ac.id) as completed_actions,
          ROUND(COUNT(DISTINCT ac.id) * 100.0 / NULLIF(COUNT(DISTINCT ai.id), 0), 2) as completion_rate,
          AVG(ai.estimated_time_minutes) as avg_estimated_time,
          AVG(CASE WHEN ac.verified = true THEN EXTRACT(EPOCH FROM (ac.completed_at - ai.created_at))/60 END) as avg_actual_time
        FROM action_items ai
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id AND ac.verified = true
        ${whereClause}
        GROUP BY ai.action_type
        ORDER BY completion_rate DESC
      `, params);

      const difficultyAnalysisResult = await this.db.execute(`
        SELECT 
          ai.difficulty as difficulty_level,
          COUNT(DISTINCT ai.id) as total_actions,
          COUNT(DISTINCT ac.id) as completed_actions,
          ROUND(COUNT(DISTINCT ac.id) * 100.0 / NULLIF(COUNT(DISTINCT ai.id), 0), 2) as completion_rate,
          AVG(CASE WHEN ac.verified = true THEN EXTRACT(EPOCH FROM (ac.completed_at - ai.created_at))/3600 END) as avg_completion_hours
        FROM action_items ai
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id AND ac.verified = true
        ${whereClause}
        GROUP BY ai.difficulty
        ORDER BY 
          CASE ai.difficulty 
            WHEN 'easy' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'hard' THEN 3 
            ELSE 4 
          END
      `, params);

      const effectivenessResult = await this.db.execute(`
        SELECT 
          ai.priority,
          COUNT(DISTINCT ai.id) as total_actions,
          COUNT(DISTINCT ac.id) as completed_actions,
          ROUND(COUNT(DISTINCT ac.id) * 100.0 / NULLIF(COUNT(DISTINCT ai.id), 0), 2) as completion_rate,
          COUNT(CASE WHEN ac.reported_outcomes IS NOT NULL THEN 1 END) as actions_with_outcomes,
          COUNT(CASE WHEN ac.reported_outcomes::jsonb->>'mp_response' IS NOT NULL THEN 1 END) as mp_responses
        FROM action_items ai
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id AND ac.verified = true
        ${whereClause}
        GROUP BY ai.priority
        ORDER BY 
          CASE ai.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END
      `, params);

      const trendingResult = await this.db.execute(`
        SELECT 
          ai.id,
          ai.title as action_title,
          ai.action_type,
          COUNT(DISTINCT ac.id) as recent_completions
        FROM action_items ai
        LEFT JOIN action_completions ac ON ai.id = ac.action_item_id 
          AND ac.completed_at > NOW() - INTERVAL '30 days'
        ${whereClause}
        GROUP BY ai.id, ai.title, ai.action_type
        HAVING COUNT(DISTINCT ac.id) > 0
        ORDER BY recent_completions DESC
        LIMIT 10
      `, params);

      return {
        completionRates: completionRatesResult.rows,
        difficultyAnalysis: difficultyAnalysisResult.rows,
        effectivenessMetrics: effectivenessResult.rows,
        trendingActions: trendingResult.rows,
        summary: {
          totalActions: completionRatesResult.rows.reduce((sum, row) => sum + (row.total_actions || 0), 0),
          totalCompletions: completionRatesResult.rows.reduce((sum, row) => sum + (row.completed_actions || 0), 0),
          overallCompletionRate: completionRatesResult.rows.length > 0 
            ? completionRatesResult.rows.reduce((sum, row) => sum + (row.completion_rate || 0), 0) / completionRatesResult.rows.length 
            : 0
        }
      };
    } catch (error) {
      logger.error('Failed to get action analytics', error, { 
        filters,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  // ============================================================================
  // Action Templates
  // ============================================================================

  async getActionTemplates(actionType?: ActionItem['actionType']): Promise<ActionTemplate[]> {
    try {
      let query = 'SELECT * FROM action_templates';
      const params: any[] = [];

      if (actionType) {
        query += ' WHERE action_type = ?';
        params.push(actionType);
      }

      query += ' ORDER BY name ASC';

      const result = await this.db.execute(query, params);

      return result.rows.map(row => this.mapRowToTemplate(row));
    } catch (error) {
      logger.error('Failed to get action templates', error, { 
        actionType,
        component: 'ActionRepositoryImpl' 
      });
      throw error;
    }
  }

  async createActionTemplate(template: Omit<ActionTemplate, 'id'>): Promise<ActionTemplate> {
    try {
      const id = uuidv4();

      await this.db.execute(`
        INSERT INTO action_templates (
          id, name, description, action_type, estimated_time_minutes, difficulty,
          template, customization, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)