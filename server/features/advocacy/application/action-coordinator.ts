// ============================================================================
// ADVOCACY COORDINATION - Action Coordinator Service
// ============================================================================

import { ActionItem, NewActionItem, ActionItemEntity } from '../domain/entities/action-item.js';
// Repository interfaces removed - using direct service calls
import { ActionFilters, PaginationOptions, ActionTemplate } from '../types/index.js';
import { AdvocacyErrors } from '../domain/errors/advocacy-errors.js';
import { logger } from '../../../shared/core/index.js';

export class ActionCoordinator {
  constructor(
    private actionRepository: IActionRepository,
    private campaignRepository: ICampaignRepository
  ) {}

  async createAction(data: NewActionItem, creatorId: string): Promise<ActionItem> {
    // Validate campaign exists and user has permission
    const campaign = await this.campaignRepository.findById(data.campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(data.campaignId);
    }

    // Check if user is campaign organizer or participant
    const isOrganizer = campaign.organizerId === creatorId;
    const isParticipant = await this.campaignRepository.isParticipant(data.campaignId, creatorId);
    
    if (!isOrganizer && !isParticipant) {
      throw AdvocacyErrors.campaignAccessDenied(data.campaignId, creatorId);
    }

    // Validate action assignment
    if (data.userId !== creatorId && !isOrganizer) {
      throw AdvocacyErrors.unauthorizedAction('assign action to other user', 'action');
    }

    // Validate due date
    if (data.dueDate && data.dueDate <= new Date()) {
      throw AdvocacyErrors.actionValidation('dueDate', 'Due date must be in the future');
    }

    const action = await this.actionRepository.create(data);
    
    logger.info('Action created', { 
      actionId: action.id,
      campaignId: data.campaignId,
      actionType: data.actionType,
      component: 'ActionCoordinator' 
    });

    return action;
  }

  async getAction(actionId: string, userId: string): Promise<ActionItem> {
    const action = await this.actionRepository.findById(actionId);
    if (!action) {
      throw AdvocacyErrors.actionNotFound(actionId);
    }

    // Check access permissions
    const campaign = await this.campaignRepository.findById(action.campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(action.campaignId);
    }

    const hasAccess = action.userId === userId || 
                     campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(action.campaignId, userId);

    if (!hasAccess) {
      throw AdvocacyErrors.actionAssignment(actionId, userId);
    }

    return action;
  }

  async getUserActions(
    userId: string, 
    filters?: ActionFilters,
    pagination?: PaginationOptions
  ): Promise<ActionItem[]> {
    return await this.actionRepository.findByUser(userId, filters);
  }

  async getUserDashboard(userId: string): Promise<any> {
    return await this.actionRepository.getUserDashboard(userId);
  }

  async getCampaignActions(
    campaignId: string, 
    userId: string,
    filters?: ActionFilters
  ): Promise<ActionItem[]> {
    // Validate access to campaign
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    const hasAccess = campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(campaignId, userId);

    if (!hasAccess) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    return await this.actionRepository.findByCampaign(campaignId, filters);
  }

  async startAction(actionId: string, userId: string): Promise<ActionItem> {
    const action = await this.getAction(actionId, userId);
    
    if (action.userId !== userId) {
      throw AdvocacyErrors.actionAssignment(actionId, userId);
    }

    const actionEntity = ActionItemEntity.fromData(action);
    
    if (!actionEntity.canBeStarted()) {
      throw AdvocacyErrors.actionStatus(action.status, 'start');
    }

    actionEntity.start();

    const updatedAction = await this.actionRepository.update(actionId, {
      status: 'in_progress',
      startedAt: new Date(),
      updatedAt: new Date()
    });

    if (!updatedAction) {
      throw new Error('Failed to start action');
    }

    logger.info('Action started', { 
      actionId, 
      userId,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async completeAction(
    actionId: string, 
    userId: string,
    outcome?: ActionItem['outcome'],
    actualTimeMinutes?: number
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, userId);
    
    if (action.userId !== userId) {
      throw AdvocacyErrors.actionAssignment(actionId, userId);
    }

    const actionEntity = ActionItemEntity.fromData(action);
    
    if (!actionEntity.canBeCompleted()) {
      throw AdvocacyErrors.actionStatus(action.status, 'complete');
    }

    actionEntity.complete(outcome, actualTimeMinutes);

    const updatedAction = await this.actionRepository.update(actionId, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      outcome,
      actualTimeMinutes
    });

    if (!updatedAction) {
      throw new Error('Failed to complete action');
    }

    logger.info('Action completed', { 
      actionId, 
      userId,
      successful: outcome?.successful,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async skipAction(
    actionId: string, 
    userId: string, 
    reason?: string
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, userId);
    
    if (action.userId !== userId) {
      throw AdvocacyErrors.actionAssignment(actionId, userId);
    }

    const actionEntity = ActionItemEntity.fromData(action);
    
    if (!actionEntity.canBeSkipped()) {
      throw AdvocacyErrors.actionStatus(action.status, 'skip');
    }

    actionEntity.skip(reason);

    const updatedAction = await this.actionRepository.update(actionId, {
      status: 'skipped',
      updatedAt: new Date(),
      outcome: reason ? {
        successful: false,
        impactNotes: `Skipped: ${reason}`
      } : undefined
    });

    if (!updatedAction) {
      throw new Error('Failed to skip action');
    }

    logger.info('Action skipped', { 
      actionId, 
      userId,
      reason,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async updateActionContent(
    actionId: string,
    userId: string,
    customizedContent: ActionItem['customizedContent']
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, userId);
    
    if (action.userId !== userId) {
      throw AdvocacyErrors.actionAssignment(actionId, userId);
    }

    const updatedAction = await this.actionRepository.update(actionId, {
      customizedContent: { ...action.customizedContent, ...customizedContent },
      updatedAt: new Date()
    });

    if (!updatedAction) {
      throw new Error('Failed to update action content');
    }

    return updatedAction;
  }

  async addActionFeedback(
    actionId: string,
    userId: string,
    feedback: ActionItem['userFeedback']
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, userId);
    
    if (action.userId !== userId) {
      throw AdvocacyErrors.actionAssignment(actionId, userId);
    }

    if (action.status !== 'completed') {
      throw AdvocacyErrors.actionStatus(action.status, 'add feedback to');
    }

    const success = await this.actionRepository.recordActionFeedback(actionId, feedback);
    if (!success) {
      throw new Error('Failed to record action feedback');
    }

    const updatedAction = await this.actionRepository.update(actionId, {
      userFeedback: feedback,
      updatedAt: new Date()
    });

    if (!updatedAction) {
      throw new Error('Failed to update action with feedback');
    }

    logger.info('Action feedback added', { 
      actionId, 
      userId,
      rating: feedback.rating,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async getActionTemplates(actionType?: ActionItem['actionType']): Promise<ActionTemplate[]> {
    return await this.actionRepository.getActionTemplates(actionType);
  }

  async createActionTemplate(
    template: Omit<ActionTemplate, 'id'>,
    creatorId: string
  ): Promise<ActionTemplate> {
    // Validate template structure
    if (!template.name || !template.actionType || !template.template.instructions) {
      throw AdvocacyErrors.templateValidation('required fields', 'Name, action type, and instructions are required');
    }

    const actionTemplate = await this.actionRepository.createActionTemplate(template);
    
    logger.info('Action template created', { 
      templateId: actionTemplate.id,
      actionType: template.actionType,
      creatorId,
      component: 'ActionCoordinator' 
    });

    return actionTemplate;
  }

  async createBulkActions(
    campaignId: string,
    actionData: Omit<NewActionItem, 'campaignId'>[],
    creatorId: string
  ): Promise<ActionItem[]> {
    // Validate campaign access
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    if (campaign.organizerId !== creatorId) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, creatorId);
    }

    // Prepare actions with campaign ID
    const actionsToCreate: NewActionItem[] = actionData.map(data => ({
      ...data,
      campaignId
    }));

    const actions = await this.actionRepository.createBulkActions(actionsToCreate);
    
    logger.info('Bulk actions created', { 
      campaignId,
      actionCount: actions.length,
      creatorId,
      component: 'ActionCoordinator' 
    });

    return actions;
  }

  async getRecommendedActions(userId: string, limit: number = 10): Promise<ActionItem[]> {
    return await this.actionRepository.getRecommendedActions(userId, limit);
  }

  async getOptimalActionSequence(campaignId: string, userId: string): Promise<ActionItem[]> {
    // Validate access
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    const hasAccess = campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(campaignId, userId);

    if (!hasAccess) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    return await this.actionRepository.getOptimalActionSequence(campaignId, userId);
  }

  async getActionAnalytics(filters?: ActionFilters): Promise<any> {
    return await this.actionRepository.getActionAnalytics(filters);
  }

  async getCampaignActionSummary(campaignId: string, userId: string): Promise<any> {
    // Validate access
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaignId);
    }

    const hasAccess = campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(campaignId, userId);

    if (!hasAccess) {
      throw AdvocacyErrors.campaignAccessDenied(campaignId, userId);
    }

    return await this.actionRepository.getCampaignActionSummary(campaignId);
  }

  async getActionsNeedingReminders(): Promise<ActionItem[]> {
    return await this.actionRepository.getActionsNeedingReminders();
  }

  async markReminderSent(actionId: string): Promise<boolean> {
    return await this.actionRepository.markReminderSent(actionId);
  }
}