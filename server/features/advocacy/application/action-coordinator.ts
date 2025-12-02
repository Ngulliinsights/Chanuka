// ============================================================================
// ADVOCACY COORDINATION - Action Coordinator Service
// ============================================================================

import { ActionItem, NewActionItem, ActionItemEntity } from '@shared/domain/entities/action-item.js';
// Repository interfaces removed - using direct service calls
import { ActionFilters, PaginationOptions, ActionTemplate } from '@server/types/index.ts';
import { AdvocacyErrors } from '@shared/domain/errors/advocacy-errors.js';
import { logger  } from '@shared/core';

export class ActionCoordinator {
  constructor(
    private actionRepository: IActionRepository,
    private campaignRepository: ICampaignRepository
  ) {}

  async createAction(data: NewActionItem, creatorId: string): Promise<ActionItem> {
    // Validate campaign exists and user has permission
    const campaign = await this.campaignRepository.findById(data.campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(data.campaign_id);
    }

    // Check if user is campaign organizer or participant
    const isOrganizer = campaign.organizerId === creatorId;
    const isParticipant = await this.campaignRepository.isParticipant(data.campaign_id, creatorId);
    
    if (!isOrganizer && !isParticipant) {
      throw AdvocacyErrors.campaignAccessDenied(data.campaign_id, creatorId);
    }

    // Validate action assignment
    if (data.user_id !== creatorId && !isOrganizer) {
      throw AdvocacyErrors.unauthorizedAction('assign action to other user', 'action');
    }

    // Validate due date
    if (data.due_date && data.due_date <= new Date()) {
      throw AdvocacyErrors.actionValidation('due_date', 'Due date must be in the future');
    }

    const action = await this.actionRepository.create(data);
    
    logger.info('Action created', { 
      actionId: action.id,
      campaign_id: data.campaign_id,
      actionType: data.actionType,
      component: 'ActionCoordinator' 
    });

    return action;
  }

  async getAction(actionId: string, user_id: string): Promise<ActionItem> {
    const action = await this.actionRepository.findById(actionId);
    if (!action) {
      throw AdvocacyErrors.actionNotFound(actionId);
    }

    // Check access permissions
    const campaign = await this.campaignRepository.findById(action.campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(action.campaign_id);
    }

    const hasAccess = action.user_id === userId || 
                     campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(action.campaign_id, user_id);

    if (!hasAccess) {
      throw AdvocacyErrors.actionAssignment(actionId, user_id);
    }

    return action;
  }

  async getUserActions(
    user_id: string, 
    filters?: ActionFilters,
    pagination?: PaginationOptions
  ): Promise<ActionItem[]> {
    return await this.actionRepository.findByUser(user_id, filters);
  }

  async getUserDashboard(user_id: string): Promise<any> {
    return await this.actionRepository.getUserDashboard(user_id);
  }

  async getCampaignActions(
    campaign_id: string, 
    user_id: string,
    filters?: ActionFilters
  ): Promise<ActionItem[]> {
    // Validate access to campaign
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    const hasAccess = campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(campaign_id, user_id);

    if (!hasAccess) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    return await this.actionRepository.findByCampaign(campaign_id, filters);
  }

  async startAction(actionId: string, user_id: string): Promise<ActionItem> {
    const action = await this.getAction(actionId, user_id);
    
    if (action.user_id !== user_id) {
      throw AdvocacyErrors.actionAssignment(actionId, user_id);
    }

    const actionEntity = ActionItemEntity.fromData(action);
    
    if (!actionEntity.canBeStarted()) {
      throw AdvocacyErrors.actionStatus(action.status, 'start');
    }

    actionEntity.start();

    const updatedAction = await this.actionRepository.update(actionId, {
      status: 'in_progress',
      startedAt: new Date(),
      updated_at: new Date()
    });

    if (!updatedAction) {
      throw new Error('Failed to start action');
    }

    logger.info('Action started', { 
      actionId, 
      user_id,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async completeAction(
    actionId: string, 
    user_id: string,
    outcome?: ActionItem['outcome'],
    actualTimeMinutes?: number
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, user_id);
    
    if (action.user_id !== user_id) {
      throw AdvocacyErrors.actionAssignment(actionId, user_id);
    }

    const actionEntity = ActionItemEntity.fromData(action);
    
    if (!actionEntity.canBeCompleted()) {
      throw AdvocacyErrors.actionStatus(action.status, 'complete');
    }

    actionEntity.complete(outcome, actualTimeMinutes);

    const updatedAction = await this.actionRepository.update(actionId, {
      status: 'completed',
      completedAt: new Date(),
      updated_at: new Date(),
      outcome,
      actualTimeMinutes
    });

    if (!updatedAction) {
      throw new Error('Failed to complete action');
    }

    logger.info('Action completed', { 
      actionId, 
      user_id,
      successful: outcome?.successful,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async skipAction(
    actionId: string, 
    user_id: string, 
    reason?: string
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, user_id);
    
    if (action.user_id !== user_id) {
      throw AdvocacyErrors.actionAssignment(actionId, user_id);
    }

    const actionEntity = ActionItemEntity.fromData(action);
    
    if (!actionEntity.canBeSkipped()) {
      throw AdvocacyErrors.actionStatus(action.status, 'skip');
    }

    actionEntity.skip(reason);

    const updatedAction = await this.actionRepository.update(actionId, {
      status: 'skipped',
      updated_at: new Date(),
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
      user_id,
      reason,
      component: 'ActionCoordinator' 
    });

    return updatedAction;
  }

  async updateActionContent(
    actionId: string,
    user_id: string,
    customizedContent: ActionItem['customizedContent']
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, user_id);
    
    if (action.user_id !== user_id) {
      throw AdvocacyErrors.actionAssignment(actionId, user_id);
    }

    const updatedAction = await this.actionRepository.update(actionId, {
      customizedContent: { ...action.customizedContent, ...customizedContent },
      updated_at: new Date()
    });

    if (!updatedAction) {
      throw new Error('Failed to update action content');
    }

    return updatedAction;
  }

  async addActionFeedback(
    actionId: string,
    user_id: string,
    feedback: ActionItem['userFeedback']
  ): Promise<ActionItem> {
    const action = await this.getAction(actionId, user_id);
    
    if (action.user_id !== user_id) {
      throw AdvocacyErrors.actionAssignment(actionId, user_id);
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
      updated_at: new Date()
    });

    if (!updatedAction) {
      throw new Error('Failed to update action with feedback');
    }

    logger.info('Action feedback added', { 
      actionId, 
      user_id,
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
    campaign_id: string,
    actionData: Omit<NewActionItem, 'campaign_id'>[],
    creatorId: string
  ): Promise<ActionItem[]> {
    // Validate campaign access
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    if (campaign.organizerId !== creatorId) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, creatorId);
    }

    // Prepare actions with campaign ID
    const actionsToCreate: NewActionItem[] = actionData.map(data => ({
      ...data,
      campaign_id
    }));

    const actions = await this.actionRepository.createBulkActions(actionsToCreate);
    
    logger.info('Bulk actions created', { 
      campaign_id,
      actionCount: actions.length,
      creatorId,
      component: 'ActionCoordinator' 
    });

    return actions;
  }

  async getRecommendedActions(user_id: string, limit: number = 10): Promise<ActionItem[]> {
    return await this.actionRepository.getRecommendedActions(user_id, limit);
  }

  async getOptimalActionSequence(campaign_id: string, user_id: string): Promise<ActionItem[]> {
    // Validate access
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    const hasAccess = campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(campaign_id, user_id);

    if (!hasAccess) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    return await this.actionRepository.getOptimalActionSequence(campaign_id, user_id);
  }

  async getActionAnalytics(filters?: ActionFilters): Promise<any> {
    return await this.actionRepository.getActionAnalytics(filters);
  }

  async getCampaignActionSummary(campaign_id: string, user_id: string): Promise<any> {
    // Validate access
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw AdvocacyErrors.campaignNotFound(campaign_id);
    }

    const hasAccess = campaign.organizerId === userId ||
                     await this.campaignRepository.isParticipant(campaign_id, user_id);

    if (!hasAccess) {
      throw AdvocacyErrors.campaignAccessDenied(campaign_id, user_id);
    }

    return await this.actionRepository.getCampaignActionSummary(campaign_id);
  }

  async getActionsNeedingReminders(): Promise<ActionItem[]> {
    return await this.actionRepository.getActionsNeedingReminders();
  }

  async markReminderSent(actionId: string): Promise<boolean> {
    return await this.actionRepository.markReminderSent(actionId);
  }
}
