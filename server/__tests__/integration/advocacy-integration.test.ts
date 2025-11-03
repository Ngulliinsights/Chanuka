// ============================================================================
// ADVOCACY COORDINATION - Integration Tests
// ============================================================================
// Comprehensive integration tests for the advocacy coordination feature

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CampaignDomainService } from '../../features/advocacy/domain/services/campaign-domain-service.js';
import { CampaignRepositoryImpl } from '../../features/advocacy/infrastructure/repositories/campaign-repository-impl.js';
import { ActionRepositoryImpl } from '../../features/advocacy/infrastructure/repositories/action-repository-impl.js';
import { TestDataManager, PerformanceMonitor } from '../utils/test-helpers.js';
import { databaseService } from '../../infrastructure/database/database-service.js';
import { logger } from '../../shared/core/index.js';

describe('Advocacy Coordination Integration Tests', () => {
  let campaignService: CampaignDomainService;
  let campaignRepository: CampaignRepositoryImpl;
  let actionRepository: ActionRepositoryImpl;
  let testDataManager: TestDataManager;
  let performanceMonitor: PerformanceMonitor;

  beforeAll(async () => {
    // Initialize repositories and services
    campaignRepository = new CampaignRepositoryImpl();
    actionRepository = new ActionRepositoryImpl();
    campaignService = new CampaignDomainService(campaignRepository, actionRepository);
    
    testDataManager = new TestDataManager();
    performanceMonitor = new PerformanceMonitor();

    logger.info('🧪 Starting advocacy integration tests');
  });

  afterAll(async () => {
    // Cleanup test data
    await testDataManager.cleanup();
    logger.info('✅ Advocacy integration tests completed');
  });

  beforeEach(async () => {
    performanceMonitor.reset();
  });

  describe('Campaign Lifecycle Integration', () => {
    it('should create, manage, and complete a full campaign lifecycle', async () => {
      const measurement = performanceMonitor.startMeasurement();

      // Step 1: Create test user and bill
      const testUser = await testDataManager.createTestUser({
        email: 'campaign-organizer@test.com',
        name: 'Campaign Organizer'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Test Environmental Protection Bill',
        status: 'introduced'
      });

      // Step 2: Create campaign
      const campaignData = {
        title: 'Save Our Environment Campaign',
        description: 'A campaign to support environmental protection legislation',
        billId: testBill.id,
        organizerId: testUser.id,
        objectives: [
          'Increase public awareness about environmental issues',
          'Mobilize citizen support for the bill',
          'Engage with MPs to ensure bill passage'
        ],
        strategy: {
          phases: ['awareness', 'mobilization', 'advocacy'],
          timeline: '3 months',
          targetAudience: 'Environmental advocates and concerned citizens'
        },
        targetCounties: ['Nairobi', 'Mombasa', 'Kisumu'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        isPublic: true
      };

      const campaign = await campaignService.createCampaign(campaignData, testUser.id);

      expect(campaign).toBeDefined();
      expect(campaign.title).toBe(campaignData.title);
      expect(campaign.status).toBe('draft');
      expect(campaign.organizerId).toBe(testUser.id);

      // Step 3: Add participants
      const participant1 = await testDataManager.createTestUser({
        email: 'participant1@test.com',
        name: 'Participant One'
      });

      const participant2 = await testDataManager.createTestUser({
        email: 'participant2@test.com',
        name: 'Participant Two'
      });

      const joinResult1 = await campaignService.joinCampaign(campaign.id, participant1.id);
      const joinResult2 = await campaignService.joinCampaign(campaign.id, participant2.id);

      expect(joinResult1).toBe(true);
      expect(joinResult2).toBe(true);

      // Step 4: Activate campaign
      const activatedCampaign = await campaignService.updateCampaignStatus(
        campaign.id, 
        'active', 
        testUser.id
      );

      expect(activatedCampaign.status).toBe('active');

      // Step 5: Create and assign actions
      const action1 = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Contact Your MP',
        actionDescription: 'Send a personalized message to your Member of Parliament',
        actionType: 'contact_representative',
        detailedInstructions: 'Use the provided template to craft a personal message',
        estimatedTimeMinutes: 30,
        difficultyLevel: 'easy',
        priority: 8,
        targetCounties: ['Nairobi'],
        status: 'active'
      });

      const action2 = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Share on Social Media',
        actionDescription: 'Share campaign information on your social media platforms',
        actionType: 'social_media',
        detailedInstructions: 'Use the provided graphics and messaging',
        estimatedTimeMinutes: 15,
        difficultyLevel: 'easy',
        priority: 6,
        status: 'active'
      });

      expect(action1).toBeDefined();
      expect(action2).toBeDefined();

      // Step 6: Simulate action completions
      await actionRepository.recordCompletion({
        actionItemId: action1.id,
        userId: participant1.id,
        campaignId: campaign.id,
        completionMethod: 'email',
        completionEvidence: {
          evidenceType: 'screenshot',
          evidenceDescription: 'Screenshot of sent email to MP'
        },
        completionNotes: 'Successfully contacted MP John Doe',
        reportedOutcomes: {
          outcomeDescription: 'Received acknowledgment from MP office',
          mpResponse: 'Thank you for your concern. We will review the bill.',
          commitmentReceived: false,
          sentiment: 'neutral'
        }
      });

      await actionRepository.recordCompletion({
        actionItemId: action2.id,
        userId: participant2.id,
        campaignId: campaign.id,
        completionMethod: 'social_media',
        completionEvidence: {
          evidenceType: 'screenshot',
          evidenceDescription: 'Screenshot of social media posts'
        },
        completionNotes: 'Shared on Twitter and Facebook',
        reportedOutcomes: {
          outcomeDescription: 'Post received 50 likes and 10 shares',
          sentiment: 'positive'
        }
      });

      // Step 7: Calculate campaign impact
      const metrics = await campaignService.calculateCampaignImpact(campaign.id);

      expect(metrics).toBeDefined();
      expect(metrics.campaignId).toBe(campaign.id);
      expect(metrics.participantCount).toBeGreaterThan(0);
      expect(metrics.totalActionsCompleted).toBeGreaterThan(0);
      expect(metrics.actionCompletionRate).toBeGreaterThan(0);

      // Step 8: Get analytics
      const analytics = await actionRepository.getActionAnalytics({
        campaignId: campaign.id
      });

      expect(analytics).toBeDefined();
      expect(analytics.summary).toBeDefined();
      expect(analytics.completionRates).toBeDefined();
      expect(analytics.effectivenessMetrics).toBeDefined();

      const metrics_end = measurement.end();
      expect(metrics_end.duration).toBeLessThan(5000); // Should complete within 5 seconds

      logger.info('✅ Campaign lifecycle integration test completed', {
        duration: metrics_end.duration,
        participantCount: metrics.participantCount,
        actionsCompleted: metrics.totalActionsCompleted
      });
    });

    it('should handle coalition opportunities identification', async () => {
      const measurement = performanceMonitor.startMeasurement();

      // Create test data for coalition scenario
      const organizer1 = await testDataManager.createTestUser({
        email: 'organizer1@test.com',
        name: 'Organizer One'
      });

      const organizer2 = await testDataManager.createTestUser({
        email: 'organizer2@test.com',
        name: 'Organizer Two'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Healthcare Reform Bill',
        status: 'committee'
      });

      // Create two campaigns on the same bill with similar objectives
      const campaign1 = await campaignService.createCampaign({
        title: 'Healthcare for All Campaign',
        description: 'Ensuring universal healthcare access',
        billId: testBill.id,
        organizerId: organizer1.id,
        objectives: [
          'Improve healthcare accessibility',
          'Reduce healthcare costs',
          'Strengthen public health systems'
        ],
        strategy: { approach: 'grassroots mobilization' },
        targetCounties: ['Nairobi', 'Kiambu'],
        startDate: new Date(),
        isPublic: true
      }, organizer1.id);

      const campaign2 = await campaignService.createCampaign({
        title: 'Medical Access Initiative',
        description: 'Making healthcare affordable and accessible',
        billId: testBill.id,
        organizerId: organizer2.id,
        objectives: [
          'Improve healthcare accessibility',
          'Support rural health facilities',
          'Advocate for healthcare funding'
        ],
        strategy: { approach: 'policy advocacy' },
        targetCounties: ['Nakuru', 'Meru'],
        startDate: new Date(),
        isPublic: true
      }, organizer2.id);

      // Identify coalition opportunities
      const opportunities = await campaignService.identifyCoalitionOpportunities(campaign1.id);

      expect(opportunities).toBeDefined();
      expect(opportunities.length).toBeGreaterThan(0);
      
      const coalitionOpportunity = opportunities.find(opp => opp.campaignId === campaign2.id);
      expect(coalitionOpportunity).toBeDefined();
      expect(coalitionOpportunity.alignmentScore).toBeGreaterThan(0);
      expect(coalitionOpportunity.sharedObjectives.length).toBeGreaterThan(0);
      expect(coalitionOpportunity.potentialBenefits).toBeDefined();
      expect(coalitionOpportunity.recommendedActions).toBeDefined();

      const metrics_end = measurement.end();
      logger.info('✅ Coalition opportunities test completed', {
        duration: metrics_end.duration,
        opportunitiesFound: opportunities.length
      });
    });

    it('should optimize campaign strategy based on performance', async () => {
      const measurement = performanceMonitor.startMeasurement();

      // Create campaign with poor performance metrics
      const organizer = await testDataManager.createTestUser({
        email: 'strategy-organizer@test.com',
        name: 'Strategy Organizer'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Education Reform Bill',
        status: 'introduced'
      });

      const campaign = await campaignService.createCampaign({
        title: 'Education Reform Campaign',
        description: 'Improving education quality and access',
        billId: testBill.id,
        organizerId: organizer.id,
        objectives: ['Improve education quality', 'Increase funding'],
        strategy: { approach: 'awareness building' },
        targetCounties: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
        startDate: new Date(),
        isPublic: true
      }, organizer.id);

      // Create actions with low completion rates
      const action1 = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Complex Policy Analysis',
        actionDescription: 'Conduct detailed analysis of education policy implications',
        actionType: 'research',
        estimatedTimeMinutes: 180, // 3 hours - very long
        difficultyLevel: 'hard',
        priority: 5,
        status: 'active'
      });

      const action2 = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Organize Community Meeting',
        actionDescription: 'Organize a community meeting to discuss education issues',
        actionType: 'event_organization',
        estimatedTimeMinutes: 240, // 4 hours - very long
        difficultyLevel: 'hard',
        priority: 7,
        status: 'active'
      });

      // Add a few participants but simulate low engagement
      const participant = await testDataManager.createTestUser({
        email: 'low-engagement@test.com',
        name: 'Low Engagement User'
      });

      await campaignService.joinCampaign(campaign.id, participant.id);

      // Get strategy optimization recommendations
      const optimization = await campaignService.optimizeCampaignStrategy(campaign.id);

      expect(optimization).toBeDefined();
      expect(optimization.recommendations).toBeDefined();
      expect(optimization.priorityActions).toBeDefined();
      expect(optimization.targetAdjustments).toBeDefined();

      // Should recommend simplifying actions due to low completion rates
      expect(optimization.recommendations.some(rec => 
        rec.includes('completion rate') || rec.includes('simplifying')
      )).toBe(true);

      // Should recommend engagement improvements due to low participation
      expect(optimization.recommendations.some(rec => 
        rec.includes('engagement') || rec.includes('participation')
      )).toBe(true);

      const metrics_end = measurement.end();
      logger.info('✅ Campaign strategy optimization test completed', {
        duration: metrics_end.duration,
        recommendationsCount: optimization.recommendations.length,
        priorityActionsCount: optimization.priorityActions.length
      });
    });
  });

  describe('Action Coordination Integration', () => {
    it('should coordinate action assignments based on participant skills', async () => {
      const measurement = performanceMonitor.startMeasurement();

      // Create campaign with diverse participants
      const organizer = await testDataManager.createTestUser({
        email: 'coordination-organizer@test.com',
        name: 'Coordination Organizer'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Digital Rights Bill',
        status: 'committee'
      });

      const campaign = await campaignService.createCampaign({
        title: 'Digital Rights Campaign',
        description: 'Protecting digital rights and privacy',
        billId: testBill.id,
        organizerId: organizer.id,
        objectives: ['Protect digital privacy', 'Ensure digital rights'],
        strategy: { approach: 'multi-channel advocacy' },
        targetCounties: ['Nairobi'],
        startDate: new Date(),
        isPublic: true
      }, organizer.id);

      // Create participants with different skills
      const techExpert = await testDataManager.createTestUser({
        email: 'tech-expert@test.com',
        name: 'Tech Expert'
      });

      const socialMediaManager = await testDataManager.createTestUser({
        email: 'social-media@test.com',
        name: 'Social Media Manager'
      });

      const policyAnalyst = await testDataManager.createTestUser({
        email: 'policy-analyst@test.com',
        name: 'Policy Analyst'
      });

      // Join campaign
      await campaignService.joinCampaign(campaign.id, techExpert.id);
      await campaignService.joinCampaign(campaign.id, socialMediaManager.id);
      await campaignService.joinCampaign(campaign.id, policyAnalyst.id);

      // Create actions requiring different skills
      const techAction = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Technical Analysis of Bill',
        actionDescription: 'Analyze technical implications of the digital rights bill',
        actionType: 'research',
        requiredSkills: ['technology', 'policy analysis'],
        estimatedTimeMinutes: 120,
        difficultyLevel: 'hard',
        priority: 9,
        status: 'active'
      });

      const socialAction = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Social Media Campaign',
        actionDescription: 'Create and manage social media content for the campaign',
        actionType: 'social_media',
        requiredSkills: ['social media', 'content creation'],
        estimatedTimeMinutes: 60,
        difficultyLevel: 'medium',
        priority: 7,
        status: 'active'
      });

      const policyAction = await actionRepository.create({
        campaignId: campaign.id,
        actionTitle: 'Policy Brief Creation',
        actionDescription: 'Create a comprehensive policy brief on digital rights',
        actionType: 'research',
        requiredSkills: ['policy analysis', 'writing'],
        estimatedTimeMinutes: 90,
        difficultyLevel: 'medium',
        priority: 8,
        status: 'active'
      });

      // Coordinate action assignments
      const assignments = await campaignService.coordinateActionAssignments(campaign.id);

      expect(assignments).toBeDefined();
      expect(assignments.assignments).toBeDefined();
      expect(assignments.unassignedActions).toBeDefined();
      expect(assignments.overloadedParticipants).toBeDefined();

      // Verify assignments make sense based on skills
      const techAssignment = assignments.assignments.find(a => a.actionId === techAction.id);
      const socialAssignment = assignments.assignments.find(a => a.actionId === socialAction.id);
      const policyAssignment = assignments.assignments.find(a => a.actionId === policyAction.id);

      expect(techAssignment).toBeDefined();
      expect(socialAssignment).toBeDefined();
      expect(policyAssignment).toBeDefined();

      const metrics_end = measurement.end();
      logger.info('✅ Action coordination test completed', {
        duration: metrics_end.duration,
        assignmentsCount: assignments.assignments.length,
        unassignedCount: assignments.unassignedActions.length
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale campaign operations efficiently', async () => {
      const measurement = performanceMonitor.startMeasurement();

      // Create a campaign with many participants and actions
      const organizer = await testDataManager.createTestUser({
        email: 'scale-organizer@test.com',
        name: 'Scale Test Organizer'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Large Scale Test Bill',
        status: 'introduced'
      });

      const campaign = await campaignService.createCampaign({
        title: 'Large Scale Campaign',
        description: 'Testing scalability of campaign operations',
        billId: testBill.id,
        organizerId: organizer.id,
        objectives: ['Test scalability', 'Measure performance'],
        strategy: { approach: 'mass mobilization' },
        targetCounties: ['Nairobi', 'Mombasa', 'Kisumu'],
        startDate: new Date(),
        isPublic: true
      }, organizer.id);

      // Create multiple participants (simulate scale)
      const participants = [];
      for (let i = 0; i < 20; i++) {
        const participant = await testDataManager.createTestUser({
          email: `scale-participant-${i}@test.com`,
          name: `Scale Participant ${i}`
        });
        participants.push(participant);
        await campaignService.joinCampaign(campaign.id, participant.id);
      }

      // Create multiple actions
      const actions = [];
      for (let i = 0; i < 10; i++) {
        const action = await actionRepository.create({
          campaignId: campaign.id,
          actionTitle: `Scale Test Action ${i}`,
          actionDescription: `Testing action scalability ${i}`,
          actionType: i % 2 === 0 ? 'contact_representative' : 'social_media',
          estimatedTimeMinutes: 30,
          difficultyLevel: 'easy',
          priority: Math.floor(Math.random() * 10) + 1,
          status: 'active'
        });
        actions.push(action);
      }

      // Simulate some completions
      for (let i = 0; i < 15; i++) {
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        
        await actionRepository.recordCompletion({
          actionItemId: randomAction.id,
          userId: randomParticipant.id,
          campaignId: campaign.id,
          completionMethod: 'online',
          completionNotes: `Scale test completion ${i}`,
          reportedOutcomes: {
            outcomeDescription: `Scale test outcome ${i}`,
            sentiment: 'positive'
          }
        });
      }

      // Test performance of analytics queries
      const analyticsStart = Date.now();
      const analytics = await actionRepository.getActionAnalytics({
        campaignId: campaign.id
      });
      const analyticsTime = Date.now() - analyticsStart;

      expect(analytics).toBeDefined();
      expect(analyticsTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Test performance of impact calculation
      const impactStart = Date.now();
      const metrics = await campaignService.calculateCampaignImpact(campaign.id);
      const impactTime = Date.now() - impactStart;

      expect(metrics).toBeDefined();
      expect(impactTime).toBeLessThan(3000); // Should complete within 3 seconds

      const metrics_end = measurement.end();
      expect(metrics_end.duration).toBeLessThan(30000); // Entire test within 30 seconds

      logger.info('✅ Scalability test completed', {
        totalDuration: metrics_end.duration,
        participantCount: participants.length,
        actionCount: actions.length,
        analyticsTime,
        impactCalculationTime: impactTime,
        memoryUsage: metrics_end.memoryUsage
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent campaign operations gracefully', async () => {
      const organizer = await testDataManager.createTestUser({
        email: 'concurrent-organizer@test.com',
        name: 'Concurrent Test Organizer'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Concurrent Test Bill',
        status: 'introduced'
      });

      const campaign = await campaignService.createCampaign({
        title: 'Concurrent Test Campaign',
        description: 'Testing concurrent operations',
        billId: testBill.id,
        organizerId: organizer.id,
        objectives: ['Test concurrency'],
        strategy: { approach: 'concurrent testing' },
        targetCounties: ['Nairobi'],
        startDate: new Date(),
        isPublic: true
      }, organizer.id);

      // Create multiple participants concurrently
      const participantPromises = [];
      for (let i = 0; i < 10; i++) {
        participantPromises.push(
          testDataManager.createTestUser({
            email: `concurrent-participant-${i}@test.com`,
            name: `Concurrent Participant ${i}`
          }).then(participant => 
            campaignService.joinCampaign(campaign.id, participant.id)
          )
        );
      }

      const joinResults = await Promise.all(participantPromises);
      
      // All joins should succeed
      expect(joinResults.every(result => result === true)).toBe(true);

      // Test concurrent action creation
      const actionPromises = [];
      for (let i = 0; i < 5; i++) {
        actionPromises.push(
          actionRepository.create({
            campaignId: campaign.id,
            actionTitle: `Concurrent Action ${i}`,
            actionDescription: `Testing concurrent action creation ${i}`,
            actionType: 'contact_representative',
            estimatedTimeMinutes: 30,
            difficultyLevel: 'easy',
            priority: 5,
            status: 'active'
          })
        );
      }

      const actions = await Promise.all(actionPromises);
      expect(actions.length).toBe(5);
      expect(actions.every(action => action.id)).toBe(true);

      logger.info('✅ Concurrent operations test completed', {
        participantsJoined: joinResults.length,
        actionsCreated: actions.length
      });
    });

    it('should validate business rules and constraints', async () => {
      const organizer = await testDataManager.createTestUser({
        email: 'validation-organizer@test.com',
        name: 'Validation Test Organizer'
      });

      const testBill = await testDataManager.createTestBill({
        title: 'Validation Test Bill',
        status: 'introduced'
      });

      // Test invalid campaign creation (end date before start date)
      await expect(
        campaignService.createCampaign({
          title: 'Invalid Campaign',
          description: 'Testing validation',
          billId: testBill.id,
          organizerId: organizer.id,
          objectives: ['Test validation'],
          strategy: { approach: 'validation testing' },
          targetCounties: ['Nairobi'],
          startDate: new Date(),
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          isPublic: true
        }, organizer.id)
      ).rejects.toThrow('End date must be after start date');

      // Test campaign creation without objectives
      await expect(
        campaignService.createCampaign({
          title: 'No Objectives Campaign',
          description: 'Testing validation',
          billId: testBill.id,
          organizerId: organizer.id,
          objectives: [],
          strategy: { approach: 'validation testing' },
          targetCounties: ['Nairobi'],
          startDate: new Date(),
          isPublic: true
        }, organizer.id)
      ).rejects.toThrow('Campaign must have at least one objective');

      // Test unauthorized campaign modification
      const anotherUser = await testDataManager.createTestUser({
        email: 'unauthorized-user@test.com',
        name: 'Unauthorized User'
      });

      const validCampaign = await campaignService.createCampaign({
        title: 'Valid Campaign',
        description: 'Testing authorization',
        billId: testBill.id,
        organizerId: organizer.id,
        objectives: ['Test authorization'],
        strategy: { approach: 'authorization testing' },
        targetCounties: ['Nairobi'],
        startDate: new Date(),
        isPublic: true
      }, organizer.id);

      await expect(
        campaignService.updateCampaignStatus(validCampaign.id, 'active', anotherUser.id)
      ).rejects.toThrow('User not authorized to modify this campaign');

      logger.info('✅ Business rules validation test completed');
    });
  });
});