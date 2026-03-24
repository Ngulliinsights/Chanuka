// ============================================================================
// ADVOCACY COORDINATION - Action Coordinator Service
// ============================================================================

import { AdvocacyErrors } from '@server/features/advocacy/domain/errors/advocacy-errors';
import { logger } from '@server/infrastructure/observability';
import { ActionFilters, ActionTemplate, PaginationOptions } from '@server/types/index';

// Re-export types for infrastructure layer
export type { ActionFilters, ActionTemplate, PaginationOptions };

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ActionItem {
  id: string;
  campaign_id: string;
  user_id: string;
  actionType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  due_date?: Date;
  startedAt?: Date;
  completedAt?: Date;
  outcome?: { successful: boolean; impactNotes?: string };
  actualTimeMinutes?: number;
  customizedContent?: Record<string, unknown>;
  userFeedback?: { rating: number; comment?: string };
  created_at: Date;
  updated_at: Date;
}

/** Fields required when creating a new action — `id`, `status`, and timestamps are server-assigned. */
export type NewActionItem = Omit<ActionItem, 'id' | 'status' | 'created_at' | 'updated_at'>;

export interface UserDashboard {
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  recentActivity: ActionItem[];
}

export interface ActionAnalytics {
  totalActions: number;
  completionRate: number;
  averageTimeMinutes: number;
  byType: Record<string, number>;
}

export interface CampaignActionSummary {
  campaignId: string;
  totalActions: number;
  completedCount: number;
  participantCount: number;
}

// ---------------------------------------------------------------------------
// Repository interfaces
// ---------------------------------------------------------------------------

export interface IActionRepository {
  create(data: NewActionItem): Promise<ActionItem>;
  findById(actionId: string): Promise<ActionItem | null>;
  findByUser(userId: string, filters?: ActionFilters, pagination?: PaginationOptions): Promise<ActionItem[]>;
  findByCampaign(campaignId: string, filters?: ActionFilters): Promise<ActionItem[]>;
  update(actionId: string, data: Partial<ActionItem>): Promise<ActionItem | null>;
  createBulkActions(actions: NewActionItem[]): Promise<ActionItem[]>;
  getUserDashboard(userId: string): Promise<UserDashboard>;
  getActionTemplates(actionType?: ActionItem['actionType']): Promise<ActionTemplate[]>;
  createActionTemplate(template: Omit<ActionTemplate, 'id'>): Promise<ActionTemplate>;
  getRecommendedActions(userId: string, limit: number): Promise<ActionItem[]>;
  getOptimalActionSequence(campaignId: string, userId: string): Promise<ActionItem[]>;
  getActionAnalytics(filters?: ActionFilters): Promise<ActionAnalytics>;
  getCampaignActionSummary(campaignId: string): Promise<CampaignActionSummary>;
  recordActionFeedback(actionId: string, feedback: ActionItem['userFeedback']): Promise<ActionItem | null>;
  getActionsNeedingReminders(): Promise<ActionItem[]>;
  markReminderSent(actionId: string): Promise<boolean>;
}

export interface ICampaignRepository {
  findById(campaignId: string): Promise<{ id: string; organizerId: string } | null>;
  isParticipant(campaignId: string, userId: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Entity helper — pure status-transition guard
// ---------------------------------------------------------------------------

class ActionItemEntity {
  private constructor(private readonly data: ActionItem) {}

  static from(data: ActionItem): ActionItemEntity {
    return new ActionItemEntity(data);
  }

  canBeStarted(): boolean {
    return this.data.status === 'pending';
  }

  canBeCompleted(): boolean {
    return this.data.status === 'in_progress';
  }

  canBeSkipped(): boolean {
    return this.data.status === 'pending' || this.data.status === 'in_progress';
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ActionCoordinator {
  constructor(
    private readonly actionRepository: IActionRepository,
    private readonly campaignRepository: ICampaignRepository
  ) {}

  // -------------------------------------------------------------------------
  // Write operations
  // -------------------------------------------------------------------------

  async createAction(data: NewActionItem, creatorId: string): Promise<ActionItem> {
    const campaign = await this.campaignRepository.findById(data.campaign_id);
    if (!campaign) throw AdvocacyErrors.campaignNotFound(data.campaign_id);

    const [isOrganizer, isParticipant] = await Promise.all([
      Promise.resolve(campaign.organizerId === creatorId),
      this.campaignRepository.isParticipant(data.campaign_id, creatorId),
    ]);

    if (!isOrganizer && !isParticipant) {
      throw AdvocacyErrors.campaignAccessDenied(data.campaign_id, creatorId);
    }

    if (data.user_id !== creatorId && !isOrganizer) {
      throw AdvocacyErrors.unauthorizedAction('assign action to other user', 'action');
    }

    if (data.due_date && data.due_date <= new Date()) {
      throw AdvocacyErrors.actionValidation('due_date', 'Due date must be in the future');
    }

    const action = await this.actionRepository.create(data);

    logger.info(
      { actionId: action.id, campaign_id: data.campaign_id, actionType: data.actionType, component: 'ActionCoordinator' },
      'Action created'
    );

    return action;
  }

  async startAction(actionId: string, userId: string): Promise<ActionItem> {
    const action = await this.assertActionOwnership(actionId, userId);

    if (!ActionItemEntity.from(action).canBeStarted()) {
      throw AdvocacyErrors.actionStatus(action.status, 'start');
    }

    const updated = await this.updateActionStatus(actionId, { status: 'in_progress', startedAt: new Date() });
    logger.info({ actionId, userId, component: 'ActionCoordinator' }, 'Action started');
    return updated;
  }

  async completeAction(
    actionId: string,
    userId: string,
    outcome?: ActionItem['outcome'],
    actualTimeMinutes?: number
  ): Promise<ActionItem> {
    const action = await this.assertActionOwnership(actionId, userId);

    if (!ActionItemEntity.from(action).canBeCompleted()) {
      throw AdvocacyErrors.actionStatus(action.status, 'complete');
    }

    const updated = await this.updateActionStatus(actionId, {
      status: 'completed',
      completedAt: new Date(),
      outcome,
      actualTimeMinutes,
    });

    logger.info(
      { actionId, userId, successful: outcome?.successful, component: 'ActionCoordinator' },
      'Action completed'
    );
    return updated;
  }

  async skipAction(actionId: string, userId: string, reason?: string): Promise<ActionItem> {
    const action = await this.assertActionOwnership(actionId, userId);

    if (!ActionItemEntity.from(action).canBeSkipped()) {
      throw AdvocacyErrors.actionStatus(action.status, 'skip');
    }

    const updated = await this.updateActionStatus(actionId, {
      status: 'skipped',
      ...(reason && { outcome: { successful: false, impactNotes: `Skipped: ${reason}` } }),
    });

    logger.info({ actionId, userId, reason, component: 'ActionCoordinator' }, 'Action skipped');
    return updated;
  }

  async updateActionContent(
    actionId: string,
    userId: string,
    customizedContent: ActionItem['customizedContent']
  ): Promise<ActionItem> {
    const action = await this.assertActionOwnership(actionId, userId);

    return this.updateActionStatus(actionId, {
      customizedContent: { ...action.customizedContent, ...customizedContent },
    });
  }

  async addActionFeedback(
    actionId: string,
    userId: string,
    feedback: ActionItem['userFeedback']
  ): Promise<ActionItem> {
    const action = await this.assertActionOwnership(actionId, userId);

    if (action.status !== 'completed') {
      throw AdvocacyErrors.actionStatus(action.status, 'add feedback to');
    }

    const updated = await this.actionRepository.recordActionFeedback(actionId, feedback);
    if (!updated) throw new Error(`Failed to record feedback for action ${actionId}`);

    logger.info(
      { actionId, userId, rating: feedback?.rating, component: 'ActionCoordinator' },
      'Action feedback added'
    );
    return updated;
  }

  async createBulkActions(
    campaignId: string,
    actionData: Array<Omit<NewActionItem, 'campaign_id'>>,
    creatorId: string
  ): Promise<ActionItem[]> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw AdvocacyErrors.campaignNotFound(campaignId);

    if (campaign.organizerId !== creatorId) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, creatorId);
    }

    const actionsToCreate: NewActionItem[] = actionData.map((data) => ({ ...data, campaign_id: campaignId }));
    const actions = await this.actionRepository.createBulkActions(actionsToCreate);

    logger.info(
      { campaignId, actionCount: actions.length, creatorId, component: 'ActionCoordinator' },
      'Bulk actions created'
    );
    return actions;
  }

  async createActionTemplate(template: Omit<ActionTemplate, 'id'>, creatorId: string): Promise<ActionTemplate> {
    if (!template.name || !template.actionType || !template.template.instructions) {
      throw AdvocacyErrors.templateValidation(
        'required fields',
        'Name, action type, and instructions are required'
      );
    }

    const actionTemplate = await this.actionRepository.createActionTemplate(template);

    logger.info(
      { templateId: actionTemplate.id, actionType: template.actionType, creatorId, component: 'ActionCoordinator' },
      'Action template created'
    );
    return actionTemplate;
  }

  async markReminderSent(actionId: string): Promise<boolean> {
    return this.actionRepository.markReminderSent(actionId);
  }

  // -------------------------------------------------------------------------
  // Read operations
  // -------------------------------------------------------------------------

  async getAction(actionId: string, userId: string): Promise<ActionItem> {
    const action = await this.actionRepository.findById(actionId);
    if (!action) throw AdvocacyErrors.actionNotFound(actionId);

    const campaign = await this.campaignRepository.findById(action.campaign_id);
    if (!campaign) throw AdvocacyErrors.campaignNotFound(action.campaign_id);

    const hasAccess =
      action.user_id === userId ||
      campaign.organizerId === userId ||
      (await this.campaignRepository.isParticipant(action.campaign_id, userId));

    if (!hasAccess) throw AdvocacyErrors.actionAssignment(actionId, userId);

    return action;
  }

  async getUserActions(
    userId: string,
    filters?: ActionFilters,
    pagination?: PaginationOptions
  ): Promise<ActionItem[]> {
    return this.actionRepository.findByUser(userId, filters, pagination);
  }

  async getUserDashboard(userId: string): Promise<UserDashboard> {
    return this.actionRepository.getUserDashboard(userId);
  }

  async getCampaignActions(
    campaignId: string,
    userId: string,
    filters?: ActionFilters
  ): Promise<ActionItem[]> {
    await this.assertCampaignAccess(campaignId, userId);
    return this.actionRepository.findByCampaign(campaignId, filters);
  }

  async getActionTemplates(actionType?: ActionItem['actionType']): Promise<ActionTemplate[]> {
    return this.actionRepository.getActionTemplates(actionType);
  }

  async getRecommendedActions(userId: string, limit = 10): Promise<ActionItem[]> {
    return this.actionRepository.getRecommendedActions(userId, limit);
  }

  async getOptimalActionSequence(campaignId: string, userId: string): Promise<ActionItem[]> {
    await this.assertCampaignAccess(campaignId, userId);
    return this.actionRepository.getOptimalActionSequence(campaignId, userId);
  }

  async getActionAnalytics(filters?: ActionFilters): Promise<ActionAnalytics> {
    return this.actionRepository.getActionAnalytics(filters);
  }

  async getCampaignActionSummary(campaignId: string, userId: string): Promise<CampaignActionSummary> {
    await this.assertCampaignAccess(campaignId, userId);
    return this.actionRepository.getCampaignActionSummary(campaignId);
  }

  async getActionsNeedingReminders(): Promise<ActionItem[]> {
    return this.actionRepository.getActionsNeedingReminders();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Verifies the action exists AND is owned by `userId`.
   * Use this for any mutation that must be performed by the action's assigned user.
   */
  private async assertActionOwnership(actionId: string, userId: string): Promise<ActionItem> {
    const action = await this.getAction(actionId, userId);
    if (action.user_id !== userId) throw AdvocacyErrors.actionAssignment(actionId, userId);
    return action;
  }

  /**
   * Resolves and validates campaign access in one place.
   * Throws if the campaign does not exist or the user lacks access.
   */
  private async assertCampaignAccess(campaignId: string, userId: string): Promise<void> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) throw AdvocacyErrors.campaignNotFound(campaignId);

    const hasAccess =
      campaign.organizerId === userId ||
      (await this.campaignRepository.isParticipant(campaignId, userId));

    if (!hasAccess) throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
  }

  /**
   * Applies a partial update, always stamping `updated_at`, and asserts the row was returned.
   * Centralises the repetitive `update → null-check` pattern across mutation methods.
   */
  private async updateActionStatus(
    actionId: string,
    patch: Partial<Omit<ActionItem, 'id' | 'created_at'>>
  ): Promise<ActionItem> {
    const updated = await this.actionRepository.update(actionId, { ...patch, updated_at: new Date() });
    if (!updated) throw new Error(`Action ${actionId} disappeared during update`);
    return updated;
  }
}