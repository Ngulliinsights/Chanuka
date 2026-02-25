/**
 * Advocacy Coordination API Routes
 */

import { Router } from 'express';
import { CampaignService } from '../application/campaign-service';
import { ActionCoordinator } from '../application/action-coordinator';
import { ImpactTracker } from '../application/impact-tracker';
import { CoalitionBuilder } from '../application/coalition-builder';
import { logger } from '@server/infrastructure/observability';

const router = Router();

// Mock services - in real implementation, these would be injected
const campaignService = new CampaignService(null as any, null as any);
const actionCoordinator = new ActionCoordinator(null as any, null as any);
const impactTracker = new ImpactTracker(null as any, null as any, null as any);
const coalitionBuilder = new CoalitionBuilder(null as any, null as any);

// ============================================================================
// Campaign Management Routes
// ============================================================================

// Create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const campaign = await campaignService.createCampaign(req.body, userId);
    
    res.status(201).json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to create campaign', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const userId = req.user?.id;
    const filters = {
      status: req.query.status as any,
      bill_id: req.query.bill_id as string,
      category: req.query.category as string,
    };
    
    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const campaigns = await campaignService.getCampaigns(filters, pagination, userId);
    
    res.json({
      success: true,
      campaigns,
      pagination
    });
  } catch (error) {
    logger.error('Failed to get campaigns', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const campaign = await campaignService.getCampaign(req.params.id, userId);
    
    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to get campaign', { error, component: 'AdvocacyRouter' });
    res.status(404).json({ error: 'Campaign not found' });
  }
});

// Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const campaign = await campaignService.updateCampaign(req.params.id, req.body, userId);
    
    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Failed to update campaign', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    await campaignService.deleteCampaign(req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Campaign deleted'
    });
  } catch (error) {
    logger.error('Failed to delete campaign', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Join campaign
router.post('/campaigns/:id/join', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    await campaignService.joinCampaign(req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Joined campaign'
    });
  } catch (error) {
    logger.error('Failed to join campaign', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to join campaign' });
  }
});

// Leave campaign
router.post('/campaigns/:id/leave', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    await campaignService.leaveCampaign(req.params.id, userId);
    
    res.json({
      success: true,
      message: 'Left campaign'
    });
  } catch (error) {
    logger.error('Failed to leave campaign', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to leave campaign' });
  }
});

// Get campaign metrics
router.get('/campaigns/:id/metrics', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const metrics = await campaignService.getCampaignMetrics(req.params.id, userId);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Failed to get campaign metrics', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaign metrics' });
  }
});

// Get campaign analytics
router.get('/campaigns/:id/analytics', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const analytics = await campaignService.getCampaignAnalytics(req.params.id, userId);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Failed to get campaign analytics', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaign analytics' });
  }
});

// Get campaigns by bill
router.get('/bills/:billId/campaigns', async (req, res) => {
  try {
    const campaigns = await campaignService.getCampaignsByBill(req.params.billId);
    
    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    logger.error('Failed to get campaigns by bill', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaigns by bill' });
  }
});

// Get user campaigns
router.get('/users/:userId/campaigns', async (req, res) => {
  try {
    const campaigns = await campaignService.getCampaignsByUser(req.params.userId);
    
    res.json({
      success: true,
      ...campaigns
    });
  } catch (error) {
    logger.error('Failed to get user campaigns', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get user campaigns' });
  }
});

// Search campaigns
router.get('/campaigns/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const campaigns = await campaignService.searchCampaigns(query);
    
    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    logger.error('Failed to search campaigns', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to search campaigns' });
  }
});

// Get trending campaigns
router.get('/campaigns/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const campaigns = await campaignService.getTrendingCampaigns(limit);
    
    res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    logger.error('Failed to get trending campaigns', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get trending campaigns' });
  }
});

// ============================================================================
// Action Coordination Routes
// ============================================================================

// Create action
router.post('/actions', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const action = await actionCoordinator.createAction(req.body, userId);
    
    res.status(201).json({
      success: true,
      action
    });
  } catch (error) {
    logger.error('Failed to create action', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to create action' });
  }
});

// Get user actions
router.get('/users/:userId/actions', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as any,
      actionType: req.query.actionType as any,
    };
    
    const actions = await actionCoordinator.getUserActions(req.params.userId, filters);
    
    res.json({
      success: true,
      actions
    });
  } catch (error) {
    logger.error('Failed to get user actions', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get user actions' });
  }
});

// Get user dashboard
router.get('/users/:userId/dashboard', async (req, res) => {
  try {
    const dashboard = await actionCoordinator.getUserDashboard(req.params.userId);
    
    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    logger.error('Failed to get user dashboard', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get user dashboard' });
  }
});

// Get campaign actions
router.get('/campaigns/:id/actions', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const actions = await actionCoordinator.getCampaignActions(req.params.id, userId);
    
    res.json({
      success: true,
      actions
    });
  } catch (error) {
    logger.error('Failed to get campaign actions', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaign actions' });
  }
});

// Start action
router.post('/actions/:id/start', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const action = await actionCoordinator.startAction(req.params.id, userId);
    
    res.json({
      success: true,
      action
    });
  } catch (error) {
    logger.error('Failed to start action', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to start action' });
  }
});

// Complete action
router.post('/actions/:id/complete', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const action = await actionCoordinator.completeAction(
      req.params.id,
      userId,
      req.body.outcome,
      req.body.actualTimeMinutes
    );
    
    res.json({
      success: true,
      action
    });
  } catch (error) {
    logger.error('Failed to complete action', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to complete action' });
  }
});

// Skip action
router.post('/actions/:id/skip', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const action = await actionCoordinator.skipAction(req.params.id, userId, req.body.reason);
    
    res.json({
      success: true,
      action
    });
  } catch (error) {
    logger.error('Failed to skip action', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to skip action' });
  }
});

// Add action feedback
router.post('/actions/:id/feedback', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const action = await actionCoordinator.addActionFeedback(req.params.id, userId, req.body);
    
    res.json({
      success: true,
      action
    });
  } catch (error) {
    logger.error('Failed to add action feedback', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to add action feedback' });
  }
});

// Get action templates
router.get('/action-templates', async (req, res) => {
  try {
    const actionType = req.query.actionType as any;
    const templates = await actionCoordinator.getActionTemplates(actionType);
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    logger.error('Failed to get action templates', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get action templates' });
  }
});

// Get recommended actions
router.get('/users/:userId/recommended-actions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const actions = await actionCoordinator.getRecommendedActions(req.params.userId, limit);
    
    res.json({
      success: true,
      actions
    });
  } catch (error) {
    logger.error('Failed to get recommended actions', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get recommended actions' });
  }
});

// ============================================================================
// Impact Tracking Routes
// ============================================================================

// Record impact
router.post('/campaigns/:id/impact', async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const impact = await impactTracker.recordImpact(
      req.params.id,
      req.body.impactType,
      req.body.value,
      req.body.description,
      req.body.evidenceLinks,
      userId
    );
    
    res.status(201).json({
      success: true,
      impact
    });
  } catch (error) {
    logger.error('Failed to record impact', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to record impact' });
  }
});

// Get campaign impact metrics
router.get('/campaigns/:id/impact', async (req, res) => {
  try {
    const metrics = await impactTracker.getCampaignImpactMetrics(req.params.id);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Failed to get campaign impact metrics', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaign impact metrics' });
  }
});

// Generate impact assessment
router.get('/campaigns/:id/impact/assessment', async (req, res) => {
  try {
    const assessment = await impactTracker.generateImpactAssessment(req.params.id);
    
    res.json({
      success: true,
      assessment
    });
  } catch (error) {
    logger.error('Failed to generate impact assessment', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to generate impact assessment' });
  }
});

// Get impact statistics
router.get('/impact/statistics', async (req, res) => {
  try {
    const filters = {
      bill_id: req.query.bill_id as string,
      impactType: req.query.impactType as any,
    };
    
    const statistics = await impactTracker.getImpactStatistics(filters);
    
    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    logger.error('Failed to get impact statistics', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get impact statistics' });
  }
});

// ============================================================================
// Coalition Building Routes
// ============================================================================

// Find coalition opportunities
router.get('/users/:userId/coalition-opportunities', async (req, res) => {
  try {
    const opportunities = await coalitionBuilder.findCoalitionOpportunities(req.params.userId);
    
    res.json({
      success: true,
      opportunities
    });
  } catch (error) {
    logger.error('Failed to find coalition opportunities', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to find coalition opportunities' });
  }
});

// Get coalition recommendations
router.get('/campaigns/:id/coalition-recommendations', async (req, res) => {
  try {
    const recommendations = await coalitionBuilder.getCoalitionRecommendations(req.params.id);
    
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    logger.error('Failed to get coalition recommendations', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get coalition recommendations' });
  }
});

// ============================================================================
// Statistics and Analytics Routes
// ============================================================================

// Get campaign statistics
router.get('/statistics/campaigns', async (req, res) => {
  try {
    const stats = await campaignService.getCampaignStats();
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error('Failed to get campaign statistics', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get campaign statistics' });
  }
});

// Get action analytics
router.get('/analytics/actions', async (req, res) => {
  try {
    const filters = {
      campaign_id: req.query.campaign_id as string,
      status: req.query.status as any,
    };
    
    const analytics = await actionCoordinator.getActionAnalytics(filters);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Failed to get action analytics', { error, component: 'AdvocacyRouter' });
    res.status(500).json({ error: 'Failed to get action analytics' });
  }
});

export default router;
