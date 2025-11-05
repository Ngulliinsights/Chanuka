// ============================================================================
// ADVOCACY COORDINATION SCHEMA TESTS
// ============================================================================
// Tests for campaign management, action coordination, and community organizing

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  campaigns,
  action_items,
  campaign_participants,
  action_completions,
  campaign_impact_metrics
} from '../advocacy_coordination';
import { bills, users } from '../foundation';
import { eq, and, or, sql, count, sum } from 'drizzle-orm';

describe('Advocacy Coordination Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('advocacy_coordination');
  });

  describe('Campaigns', () => {
    it('should create advocacy campaigns with comprehensive details', async () => {
      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const campaignData = generateTestData.campaign({
        campaign_name: 'Healthcare Access Now',
        campaign_slug: 'healthcare-access-now',
        campaign_description: 'Advocating for universal healthcare access across Kenya',
        bill_id: bill.id,
        campaign_goals: [
          'Increase healthcare budget allocation',
          'Improve rural healthcare infrastructure',
          'Reduce healthcare costs for low-income families'
        ],
        target_audience: ['rural_communities', 'low_income_families', 'healthcare_workers'],
        geographic_focus: ['rural_counties', 'urban_slums'],
        primary_tactics: ['community_organizing', 'media_advocacy', 'policy_lobbying'],
        status: 'active',
        visibility: 'public',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-12-31'),
        budget_estimate: 5000000, // KES
        organizer_id: 'organizer-1',
        coalition_partners: ['Kenya Health Network', 'Rural Health Alliance'],
        success_metrics: {
          signatures_target: 50000,
          media_mentions_target: 100,
          policy_meetings_target: 20
        }
      });

      const [campaign] = await testDb
        .insert(campaigns)
        .values(campaignData)
        .returning();

      expect(campaign).toBeDefined();
      expect(campaign.campaign_name).toBe('Healthcare Access Now');
      expect(campaign.campaign_slug).toBe('healthcare-access-now');
      expect(campaign.bill_id).toBe(bill.id);
      expect(campaign.campaign_goals).toHaveLength(3);
      expect(campaign.target_audience).toContain('rural_communities');
      expect(campaign.status).toBe('active');
      expect(campaign.visibility).toBe('public');
      expect(campaign.budget_estimate).toBe(5000000);
      expect(campaign.coalition_partners).toContain('Kenya Health Network');
    });

    it('should query campaigns by status and geographic focus', async () => {
      const campaignsData = [
        {
          campaign_name: 'Campaign 1',
          campaign_slug: 'campaign-1',
          geographic_focus: ['rural_counties'],
          status: 'active',
          visibility: 'public'
        },
        {
          campaign_name: 'Campaign 2',
          campaign_slug: 'campaign-2',
          geographic_focus: ['urban_slums'],
          status: 'active',
          visibility: 'public'
        },
        {
          campaign_name: 'Campaign 3',
          campaign_slug: 'campaign-3',
          geographic_focus: ['rural_counties'],
          status: 'completed',
          visibility: 'public'
        },
        {
          campaign_name: 'Campaign 4',
          campaign_slug: 'campaign-4',
          geographic_focus: ['rural_counties'],
          status: 'active',
          visibility: 'private'
        }
      ];

      await testDb.insert(campaigns).values(campaignsData);

      const activeRuralCampaigns = await testDb
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.status, 'active'),
          sql`${campaigns.geographic_focus} @> ARRAY['rural_counties']::text[]`,
          eq(campaigns.visibility, 'public')
        ));

      expect(activeRuralCampaigns).toHaveLength(1);
      expect(activeRuralCampaigns[0].campaign_name).toBe('Campaign 1');
      expect(activeRuralCampaigns[0].status).toBe('active');
      expect(activeRuralCampaigns[0].geographic_focus).toContain('rural_counties');
    });
  });

  describe('Campaign Actions', () => {
    it('should create campaign actions with detailed planning', async () => {
      const testCampaign = generateTestData.campaign();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      const actionData = {
        campaign_id: campaign.id,
        action_type: 'call_mp',
        action_title: 'Call Your MP Week',
        action_description: 'Mobilize constituents to call their MPs about healthcare bill',
        target_date: new Date('2024-04-01'),
        duration_hours: 72,
        geographic_target: ['nairobi', 'mombasa', 'kisumu'],
        participant_target: 1000,
        action_details: {
          script_template: 'Hello MP, I support the healthcare bill because...',
          talking_points: ['Healthcare access', 'Rural health', 'Cost reduction'],
          contact_method: 'phone_call'
        },
        resources_needed: {
          volunteers: 50,
          budget: 50000,
          materials: ['call_scripts', 'contact_lists', 'tracking_system']
        },
        success_metrics: {
          calls_made: 500,
          positive_responses: 100,
          meetings_scheduled: 10
        },
        status: 'planned',
        priority: 'high',
        assigned_to: 'campaign_coordinator_1',
        parent_action_id: null
      };

      const [action] = await testDb
        .insert(campaign_actions)
        .values(actionData)
        .returning();

      expect(action.campaign_id).toBe(campaign.id);
      expect(action.action_type).toBe('call_mp');
      expect(action.action_title).toBe('Call Your MP Week');
      expect(action.geographic_target).toContain('nairobi');
      expect(action.participant_target).toBe(1000);
      expect(action.action_details.script_template).toContain('Hello MP');
      expect(action.resources_needed.budget).toBe(50000);
      expect(action.status).toBe('planned');
      expect(action.priority).toBe('high');
    });

    it('should handle hierarchical action structures', async () => {
      const testCampaign = generateTestData.campaign();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      // Create parent action
      const parentActionData = {
        campaign_id: campaign.id,
        action_type: 'organize_event',
        action_title: 'National Healthcare Summit',
        action_description: 'Large-scale advocacy event',
        target_date: new Date('2024-05-01'),
        status: 'planned',
        priority: 'high'
      };
      const [parentAction] = await testDb.insert(campaign_actions).values(parentActionData).returning();

      // Create child actions
      const childActionsData = [
        {
          campaign_id: campaign.id,
          action_type: 'social_media',
          action_title: 'Social Media Campaign',
          action_description: 'Promote summit on social media',
          target_date: new Date('2024-04-15'),
          parent_action_id: parentAction.id,
          status: 'planned',
          priority: 'medium'
        },
        {
          campaign_id: campaign.id,
          action_type: 'media_appearance',
          action_title: 'Media Outreach',
          action_description: 'Secure media coverage for summit',
          target_date: new Date('2024-04-20'),
          parent_action_id: parentAction.id,
          status: 'planned',
          priority: 'medium'
        }
      ];

      await testDb.insert(campaign_actions).values(childActionsData);

      // Query hierarchical structure
      const actionsWithChildren = await testDb
        .select()
        .from(campaign_actions)
        .where(eq(campaign_actions.parent_action_id, parentAction.id));

      expect(actionsWithChildren).toHaveLength(2);
      expect(actionsWithChildren.every(a => a.parent_action_id === parentAction.id)).toBe(true);
    });
  });

  describe('Campaign Participants', () => {
    it('should track campaign participants with roles', async () => {
      const testUser = generateTestData.user();
      const testCampaign = generateTestData.campaign();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      const participantData = {
        campaign_id: campaign.id,
        user_id: user.id,
        participant_role: 'community_organizer',
        join_date: new Date('2024-03-01'),
        engagement_level: 'high',
        skills_offered: ['public_speaking', 'social_media', 'community_outreach'],
        availability_hours: 20,
        geographic_location: 'nairobi',
        languages_spoken: ['english', 'swahili'],
        special_interests: ['rural_health', 'maternal_health'],
        previous_experience: 'Volunteer with health NGO for 2 years',
        referral_source: 'social_media',
        status: 'active',
        last_activity_date: new Date('2024-03-15'),
        contributions_count: 15,
        actions_completed: 8,
        leadership_potential: 'high',
        training_completed: ['advocacy_basics', 'community_organizing']
      };

      const [participant] = await testDb
        .insert(campaign_participants)
        .values(participantData)
        .returning();

      expect(participant.campaign_id).toBe(campaign.id);
      expect(participant.user_id).toBe(user.id);
      expect(participant.participant_role).toBe('community_organizer');
      expect(participant.engagement_level).toBe('high');
      expect(participant.skills_offered).toContain('public_speaking');
      expect(participant.availability_hours).toBe(20);
      expect(participant.languages_spoken).toContain('english');
      expect(participant.status).toBe('active');
      expect(participant.leadership_potential).toBe('high');
    });

    it('should query participants by engagement and location', async () => {
      const testCampaign = generateTestData.campaign();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      const participantsData = [
        {
          campaign_id: campaign.id,
          user_id: 'user-1',
          participant_role: 'volunteer',
          engagement_level: 'high',
          geographic_location: 'nairobi',
          status: 'active'
        },
        {
          campaign_id: campaign.id,
          user_id: 'user-2',
          participant_role: 'volunteer',
          engagement_level: 'medium',
          geographic_location: 'mombasa',
          status: 'active'
        },
        {
          campaign_id: campaign.id,
          user_id: 'user-3',
          participant_role: 'volunteer',
          engagement_level: 'high',
          geographic_location: 'nairobi',
          status: 'inactive'
        }
      ];

      await testDb.insert(campaign_participants).values(participantsData);

      const activeHighEngagementNairobi = await testDb
        .select()
        .from(campaign_participants)
        .where(and(
          eq(campaign_participants.campaign_id, campaign.id),
          eq(campaign_participants.engagement_level, 'high'),
          eq(campaign_participants.geographic_location, 'nairobi'),
          eq(campaign_participants.status, 'active')
        ));

      expect(activeHighEngagementNairobi).toHaveLength(1);
      expect(activeHighEngagementNairobi[0].user_id).toBe('user-1');
      expect(activeHighEngagementNairobi[0].engagement_level).toBe('high');
      expect(activeHighEngagementNairobi[0].geographic_location).toBe('nairobi');
    });
  });

  describe('Community Ambassadors', () => {
    it('should create community ambassadors with detailed profiles', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const ambassadorData = generateTestData.ambassador({
        user_id: user.id,
        ambassador_code: 'AMB-2024-001',
        display_name: 'Sarah Wanjiku - Health Advocate',
        primary_county: 'kiambu',
        secondary_counties: ['muranga', 'nyeri'],
        languages_spoken: ['english', 'swahili', 'kikuyu'],
        expertise_areas: ['healthcare_policy', 'community_organizing', 'public_health'],
        professional_background: 'Community Health Worker',
        years_experience: 8,
        social_media_handles: {
          twitter: '@sarah_health_advocate',
          facebook: 'facebook.com/sarah.health.advocate'
        },
        contact_preferences: {
          email: true,
          phone: true,
          whatsapp: true
        },
        availability_schedule: {
          weekdays: 'evenings',
          weekends: 'flexible'
        },
        status: 'active',
        training_completed: ['advocacy_advanced', 'facilitation_skills', 'media_training'],
        certifications: ['Community Health Certification'],
        performance_metrics: {
          campaigns_led: 5,
          events_facilitated: 25,
          people_reached: 2500
        },
        leadership_level: 'senior',
        mentor_ambassador_id: null,
        mentee_count: 3
      });

      const [ambassador] = await testDb
        .insert(community_ambassadors)
        .values(ambassadorData)
        .returning();

      expect(ambassador.user_id).toBe(user.id);
      expect(ambassador.ambassador_code).toBe('AMB-2024-001');
      expect(ambassador.display_name).toBe('Sarah Wanjiku - Health Advocate');
      expect(ambassador.primary_county).toBe('kiambu');
      expect(ambassador.secondary_counties).toContain('muranga');
      expect(ambassador.languages_spoken).toContain('kikuyu');
      expect(ambassador.expertise_areas).toContain('healthcare_policy');
      expect(ambassador.years_experience).toBe(8);
      expect(ambassador.status).toBe('active');
      expect(ambassador.leadership_level).toBe('senior');
      expect(ambassador.mentee_count).toBe(3);
    });

    it('should query ambassadors by county and expertise', async () => {
      const ambassadorsData = [
        {
          user_id: 'user-1',
          ambassador_code: 'AMB-001',
          primary_county: 'nairobi',
          expertise_areas: ['healthcare_policy', 'community_organizing'],
          status: 'active'
        },
        {
          user_id: 'user-2',
          ambassador_code: 'AMB-002',
          primary_county: 'kiambu',
          expertise_areas: ['healthcare_policy', 'media_advocacy'],
          status: 'active'
        },
        {
          user_id: 'user-3',
          ambassador_code: 'AMB-003',
          primary_county: 'nairobi',
          expertise_areas: ['economic_policy', 'community_organizing'],
          status: 'inactive'
        }
      ];

      await testDb.insert(community_ambassadors).values(ambassadorsData);

      const activeHealthAmbassadorsNairobi = await testDb
        .select()
        .from(community_ambassadors)
        .where(and(
          eq(community_ambassadors.primary_county, 'nairobi'),
          sql`${community_ambassadors.expertise_areas} @> ARRAY['healthcare_policy']::text[]`,
          eq(community_ambassadors.status, 'active')
        ));

      expect(activeHealthAmbassadorsNairobi).toHaveLength(1);
      expect(activeHealthAmbassadorsNairobi[0].ambassador_code).toBe('AMB-001');
      expect(activeHealthAmbassadorsNairobi[0].expertise_areas).toContain('healthcare_policy');
    });
  });

  describe('Facilitation Sessions', () => {
    it('should create facilitation sessions with detailed planning', async () => {
      const testAmbassador = generateTestData.ambassador();
      const [ambassador] = await testDb.insert(community_ambassadors).values(testAmbassador).returning();

      const sessionData = {
        session_title: 'Community Healthcare Dialogue - Kiambu County',
        session_type: 'community_forum',
        description: 'Community discussion on healthcare access challenges and solutions',
        ambassador_id: ambassador.id,
        bill_id: 'bill-123',
        scheduled_date: new Date('2024-04-15'),
        duration_hours: 3,
        venue: 'Kiambu Community Hall',
        county: 'kiambu',
        constituency: 'kiambu_town',
        ward: 'kiambu_ward',
        target_participants: 50,
        participant_demographics: {
          age_groups: ['25-35', '35-45', '45-55'],
          occupations: ['farmers', 'traders', 'teachers'],
          gender_distribution: 'balanced'
        },
        session_objectives: [
          'Understand community healthcare challenges',
          'Gather input on proposed solutions',
          'Build consensus on advocacy priorities'
        ],
        agenda: [
          'Welcome and introductions (30 min)',
          'Healthcare challenges discussion (60 min)',
          'Proposed solutions presentation (45 min)',
          'Group work and recommendations (45 min)'
        ],
        materials_needed: ['flip_charts', 'markers', 'name_tags', 'refreshments'],
        budget_estimate: 15000,
        promotion_plan: {
          channels: ['community_radio', 'whatsapp_groups', 'church_announcements'],
          materials: ['flyers', 'posters', 'social_media_posts']
        },
        accessibility_needs: {
          wheelchair_accessible: true,
          sign_language_interpreter: false,
          materials_in_braille: false
        },
        status: 'scheduled',
        preparation_status: 'venue_confirmed',
        feedback_forms_distributed: false,
        follow_up_required: true
      };

      const [session] = await testDb
        .insert(facilitation_sessions)
        .values(sessionData)
        .returning();

      expect(session.session_title).toBe('Community Healthcare Dialogue - Kiambu County');
      expect(session.session_type).toBe('community_forum');
      expect(session.ambassador_id).toBe(ambassador.id);
      expect(session.county).toBe('kiambu');
      expect(session.target_participants).toBe(50);
      expect(session.session_objectives).toHaveLength(3);
      expect(session.agenda).toContain('Healthcare challenges discussion (60 min)');
      expect(session.budget_estimate).toBe(15000);
      expect(session.status).toBe('scheduled');
    });

    it('should track session participants and outcomes', async () => {
      const testSession = {
        session_title: 'Test Session',
        session_type: 'bill_discussion',
        ambassador_id: 'ambassador-1',
        scheduled_date: new Date('2024-04-15'),
        target_participants: 30,
        county: 'nairobi',
        status: 'completed'
      };
      const [session] = await testDb.insert(facilitation_sessions).values(testSession).returning();

      const participantsData = Array.from({ length: 25 }, (_, i) => ({
        session_id: session.id,
        participant_name: `Participant ${i + 1}`,
        contact_info: `participant${i + 1}@email.com`,
        demographic_info: {
          age_group: '25-35',
          gender: i % 2 === 0 ? 'female' : 'male',
          occupation: i % 3 === 0 ? 'teacher' : i % 3 === 1 ? 'farmer' : 'trader'
        },
        first_time_attendee: i % 4 === 0,
        engagement_level: i % 5 === 0 ? 'very_high' : i % 5 === 1 ? 'high' : 'medium',
        feedback_score: Math.floor(Math.random() * 5) + 1
      }));

      await testDb.insert(session_participants).values(participantsData);

      const sessionParticipants = await testDb
        .select()
        .from(session_participants)
        .where(eq(session_participants.session_id, session.id));

      expect(sessionParticipants).toHaveLength(25);
      expect(sessionParticipants.every(p => p.session_id === session.id)).toBe(true);
    });
  });

  describe('Action Outcomes and Analytics', () => {
    it('should track outcomes of campaign actions', async () => {
      const testCampaign = generateTestData.campaign();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      const actionData = {
        campaign_id: campaign.id,
        action_type: 'call_mp',
        action_title: 'MP Calling Campaign',
        target_date: new Date('2024-04-01'),
        status: 'completed'
      };
      const [action] = await testDb.insert(campaign_actions).values(actionData).returning();

      const outcomeData = {
        action_id: action.id,
        outcome_type: 'policy_influence',
        outcome_summary: 'MP agreed to support healthcare bill amendment',
        detailed_outcome: 'Detailed description of the outcome...',
        success_level: 'high',
        quantitative_metrics: {
          calls_made: 847,
          positive_responses: 234,
          meetings_scheduled: 12,
          commitments_secured: 8
        },
        qualitative_impact: 'Significant positive response from rural MPs',
        media_coverage: {
          mentions: 3,
          outlets: ['Nation', 'Standard', 'Citizen TV'],
          sentiment: 'positive'
        },
        policy_impact: {
          amendments_proposed: 2,
          hearings_scheduled: 1,
          additional_sponsors: 5
        },
        participant_feedback: 'Very positive response from community members',
        lessons_learned: 'Personal stories were most effective',
        next_steps: 'Follow up with committed MPs',
        outcome_date: new Date('2024-04-15'),
        verified_by: 'campaign_manager',
        verification_date: new Date('2024-04-16')
      };

      const [outcome] = await testDb
        .insert(action_outcomes)
        .values(outcomeData)
        .returning();

      expect(outcome.action_id).toBe(action.id);
      expect(outcome.outcome_type).toBe('policy_influence');
      expect(outcome.success_level).toBe('high');
      expect(outcome.quantitative_metrics.calls_made).toBe(847);
      expect(outcome.policy_impact.amendments_proposed).toBe(2);
      expect(outcome.verified_by).toBe('campaign_manager');
    });

    it('should track comprehensive campaign analytics', async () => {
      const testCampaign = generateTestData.campaign();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      const analyticsData = {
        campaign_id: campaign.id,
        reporting_period: 'monthly',
        period_start: new Date('2024-03-01'),
        period_end: new Date('2024-03-31'),
        participant_metrics: {
          total_participants: 1250,
          new_participants: 340,
          returning_participants: 910,
          active_participants: 890,
          churn_rate: 0.12
        },
        engagement_metrics: {
          average_engagement_score: 7.8,
          engagement_trend: 'increasing',
          most_engaged_demographics: ['25-35_female', '35-45_male']
        },
        action_metrics: {
          total_actions: 45,
          completed_actions: 38,
          success_rate: 0.84,
          most_effective_actions: ['social_media', 'community_meetings']
        },
        reach_metrics: {
          total_reach: 45000,
          geographic_coverage: 15,
          demographic_spread: 'diverse',
          media_mentions: 23
        },
        conversion_metrics: {
          awareness_to_engagement: 0.65,
          engagement_to_action: 0.42,
          action_to_advocacy: 0.28
        },
        impact_metrics: {
          policy_mentions: 8,
          parliamentary_discussions: 2,
          media_stories: 15,
          public_opinion_shift: 0.15
        },
        resource_metrics: {
          funds_raised: 2500000,
          funds_utilized: 1800000,
          volunteer_hours: 4500,
          in_kind_contributions: 500000
        },
        comparative_metrics: {
          similar_campaigns_comparison: 'above_average',
          historical_performance: 'best_to_date',
          industry_benchmarks: 'exceeding'
        },
        sentiment_analysis: {
          overall_sentiment: 'positive',
          sentiment_trend: 'improving',
          key_themes: ['healthcare_access', 'rural_health', 'affordability']
        },
        recommendations: [
          'Increase focus on rural counties',
          'Develop more social media content',
          'Engage more healthcare professionals'
        ],
        generated_date: new Date('2024-04-01'),
        next_review_date: new Date('2024-05-01')
      };

      const [analytics] = await testDb
        .insert(campaign_analytics)
        .values(analyticsData)
        .returning();

      expect(analytics.campaign_id).toBe(campaign.id);
      expect(analytics.participant_metrics.total_participants).toBe(1250);
      expect(analytics.action_metrics.success_rate).toBe(0.84);
      expect(analytics.reach_metrics.total_reach).toBe(45000);
      expect(analytics.impact_metrics.policy_mentions).toBe(8);
      expect(analytics.resource_metrics.funds_raised).toBe(2500000);
      expect(analytics.sentiment_analysis.overall_sentiment).toBe('positive');
    });
  });

  describe('Complex Advocacy Coordination Queries', () => {
    it('should analyze campaign effectiveness comprehensively', async () => {
      // Create test campaign
      const testCampaign = generateTestData.campaign();
      const [campaign] = await testDb.insert(campaigns).values(testCampaign).returning();

      // Create campaign actions
      const actionsData = [
        {
          campaign_id: campaign.id,
          action_type: 'call_mp',
          action_title: 'MP Outreach',
          status: 'completed'
        },
        {
          campaign_id: campaign.id,
          action_type: 'social_media',
          action_title: 'Social Campaign',
          status: 'completed'
        },
        {
          campaign_id: campaign.id,
          action_type: 'community_meeting',
          action_title: 'Community Forums',
          status: 'completed'
        }
      ];
      const insertedActions = await testDb.insert(campaign_actions).values(actionsData).returning();

      // Create participants
      const participantsData = Array.from({ length: 50 }, (_, i) => ({
        campaign_id: campaign.id,
        user_id: `user-${i}`,
        participant_role: 'volunteer',
        engagement_level: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        geographic_location: i % 2 === 0 ? 'nairobi' : 'kiambu',
        status: 'active'
      }));
      await testDb.insert(campaign_participants).values(participantsData);

      // Create ambassadors
      const ambassadorData = generateTestData.ambassador({
        primary_county: 'nairobi',
        status: 'active'
      });
      await testDb.insert(community_ambassadors).values(ambassadorData);

      // Create facilitation sessions
      const sessionData = {
        session_title: 'Community Engagement Session',
        session_type: 'community_forum',
        ambassador_id: 'ambassador-1',
        scheduled_date: new Date('2024-03-15'),
        county: 'nairobi',
        target_participants: 40,
        status: 'completed'
      };
      const [session] = await testDb.insert(facilitation_sessions).values(sessionData).returning();

      // Add session participants
      const sessionParticipantsData = Array.from({ length: 35 }, (_, i) => ({
        session_id: session.id,
        participant_name: `Participant ${i}`,
        engagement_level: 'high'
      }));
      await testDb.insert(session_participants).values(sessionParticipantsData);

      // Complex query for comprehensive analysis
      const campaignAnalysis = await testDb
        .select({
          campaign: campaigns,
          totalActions: count(campaign_actions.id),
          completedActions: count(sql`CASE WHEN ${campaign_actions.status} = 'completed' THEN 1 END`),
          totalParticipants: count(campaign_participants.id),
          highEngagementParticipants: count(sql`CASE WHEN ${campaign_participants.engagement_level} = 'high' THEN 1 END`),
          totalSessions: count(facilitation_sessions.id),
          totalSessionParticipants: count(session_participants.id),
          avgSessionAttendance: sql`avg(${session_participants.id})`
        })
        .from(campaigns)
        .leftJoin(campaign_actions, eq(campaigns.id, campaign_actions.campaign_id))
        .leftJoin(campaign_participants, eq(campaigns.id, campaign_participants.campaign_id))
        .leftJoin(community_ambassadors, eq(campaigns.id, community_ambassadors.id))
        .leftJoin(facilitation_sessions, eq(community_ambassadors.id, facilitation_sessions.ambassador_id))
        .leftJoin(session_participants, eq(facilitation_sessions.id, session_participants.session_id))
        .where(eq(campaigns.id, campaign.id))
        .groupBy(campaigns.id);

      expect(campaignAnalysis).toHaveLength(1);
      expect(parseInt(campaignAnalysis[0].totalActions.count as string)).toBe(3);
      expect(parseInt(campaignAnalysis[0].totalParticipants.count as string)).toBe(50);
      expect(parseInt(campaignAnalysis[0].totalSessions.count as string)).toBe(1);
      expect(parseInt(campaignAnalysis[0].totalSessionParticipants.count as string)).toBe(35);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume campaign operations efficiently', async () => {
      // Create multiple campaigns
      const campaignsData = Array.from({ length: 100 }, (_, i) => generateTestData.campaign({
        campaign_name: `Campaign ${i}`,
        status: i % 4 === 0 ? 'active' : i % 4 === 1 ? 'completed' : i % 4 === 2 ? 'paused' : 'draft'
      }));

      const startTime = Date.now();
      const insertedCampaigns = await testDb.insert(campaigns).values(campaignsData).returning();
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(5000); // Should insert 100 campaigns quickly
      expect(insertedCampaigns).toHaveLength(100);

      // Query performance test
      const queryStartTime = Date.now();
      const activeCampaigns = await testDb
        .select()
        .from(campaigns)
        .where(eq(campaigns.status, 'active'));
      const queryTime = Date.now() - queryStartTime;

      expect(activeCampaigns.length).toBe(25); // 100/4
      expect(queryTime).toBeLessThan(200); // Should query quickly with indexes
    });
  });
});