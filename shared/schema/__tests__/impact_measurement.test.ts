// ============================================================================
// IMPACT MEASUREMENT SCHEMA TESTS
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { 
  participation_cohorts,
  legislative_outcomes,
  attribution_assessments,
  success_stories,
  equity_metrics
} from '../impact_measurement';
import { users, sponsors, bills } from '../foundation';
import { bill_amendments } from '../parliamentary_process';
import { campaigns } from '../advocacy_coordination';
import { operationalDb as db } from '../../database';

describe('Impact Measurement Schema', () => {
  // Test data setup
  let testUserId: string;
  let testSponsorId: string;
  let testBillId: string;
  let testCampaignId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      role: 'citizen',
      county: 'nairobi'
    }).returning();
    testUserId = user.id;

    // Create test sponsor
    const [sponsor] = await db.insert(sponsors).values({
      name: 'Test MP',
      party: 'test_party',
      constituency: 'Test Constituency',
      county: 'nairobi',
      chamber: 'national_assembly'
    }).returning();
    testSponsorId = sponsor.id;

    // Create test bill
    const [bill] = await db.insert(bills).values({
      title: 'Test Impact Bill',
      bill_number: 'TIB-001-2024',
      sponsor_id: testSponsorId,
      status: 'introduced',
      chamber: 'national_assembly'
    }).returning();
    testBillId = bill.id;

    // Create test campaign
    const [campaign] = await db.insert(campaigns).values({
      campaign_name: 'Test Impact Campaign',
      campaign_slug: 'test-impact-campaign',
      bill_id: testBillId,
      campaign_description: 'Test campaign for impact measurement',
      organizer_id: testUserId,
      status: 'active'
    }).returning();
    testCampaignId = campaign.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    await db.delete(equity_metrics);
    await db.delete(success_stories);
    await db.delete(attribution_assessments);
    await db.delete(legislative_outcomes);
    await db.delete(participation_cohorts);
    await db.delete(campaigns);
    await db.delete(bills);
    await db.delete(sponsors);
    await db.delete(users);
  });

  describe('Participation Cohorts Table', () => {
    it('should create a participation cohort with comprehensive metrics', async () => {
      const cohortCriteria = {
        age_range: '18-35',
        county: 'nairobi',
        join_date_after: '2024-01-01'
      };

      const demographicBreakdown = {
        age_groups: { '18-25': 40, '26-35': 60 },
        gender: { male: 45, female: 55 },
        education: { university: 70, secondary: 30 }
      };

      const [cohort] = await db.insert(participation_cohorts).values({
        cohort_name: 'Young Nairobi Professionals',
        cohort_type: 'demographic',
        cohort_criteria: cohortCriteria,
        cohort_description: 'Young professionals in Nairobi aged 18-35',
        measurement_period_start: new Date('2024-01-01'),
        measurement_period_end: new Date('2024-03-31'),
        is_ongoing: false,
        total_users: 1250,
        active_users: 890,
        demographic_breakdown: demographicBreakdown,
        average_sessions_per_user: 4.2,
        average_comments_per_user: 2.8,
        average_votes_per_user: 5.1,
        bills_tracked_per_user: 3.5,
        campaign_participation_rate: 15.5,
        action_completion_rate: 68.2,
        retention_rate_30_days: 72.5,
        retention_rate_90_days: 45.8,
        legislative_awareness_score: 0.75,
        analysis_method: 'cohort_analysis',
        confidence_interval: 0.95,
        sample_size: 1250,
        statistical_significance: true
      }).returning();

      expect(cohort).toBeDefined();
      expect(cohort.cohort_name).toBe('Young Nairobi Professionals');
      expect(cohort.cohort_type).toBe('demographic');
      expect(cohort.cohort_criteria).toEqual(cohortCriteria);
      expect(cohort.total_users).toBe(1250);
      expect(cohort.active_users).toBe(890);
      expect(cohort.demographic_breakdown).toEqual(demographicBreakdown);
      expect(cohort.average_sessions_per_user).toBe('4.20');
      expect(cohort.statistical_significance).toBe(true);
    });

    it('should handle different cohort types', async () => {
      const cohortTypes = ['demographic', 'geographic', 'temporal', 'behavioral'];
      
      for (const type of cohortTypes) {
        const [cohort] = await db.insert(participation_cohorts).values({
          cohort_name: `Test ${type} Cohort`,
          cohort_type: type,
          cohort_criteria: { type: type },
          cohort_description: `Test cohort for ${type} analysis`,
          measurement_period_start: new Date('2024-01-01'),
          analysis_method: 'test_method'
        }).returning();

        expect(cohort.cohort_type).toBe(type);
      }
    });

    it('should track engagement patterns in JSONB fields', async () => {
      const peakActivityTimes = {
        weekdays: { morning: 25, afternoon: 35, evening: 40 },
        weekends: { morning: 15, afternoon: 45, evening: 40 }
      };

      const connectivityPatterns = {
        mobile_only: 60,
        desktop_only: 15,
        both: 25,
        low_bandwidth: 30
      };

      const [cohort] = await db.insert(participation_cohorts).values({
        cohort_name: 'Activity Pattern Cohort',
        cohort_type: 'behavioral',
        cohort_criteria: { behavior: 'high_engagement' },
        cohort_description: 'Users with high engagement patterns',
        measurement_period_start: new Date('2024-01-01'),
        peak_activity_times: peakActivityTimes,
        connectivity_patterns: connectivityPatterns,
        analysis_method: 'behavioral_analysis'
      }).returning();

      expect(cohort.peak_activity_times).toEqual(peakActivityTimes);
      expect(cohort.connectivity_patterns).toEqual(connectivityPatterns);
    });

    it('should handle ongoing vs completed cohorts', async () => {
      // Ongoing cohort
      const [ongoingCohort] = await db.insert(participation_cohorts).values({
        cohort_name: 'Ongoing Cohort',
        cohort_type: 'temporal',
        cohort_criteria: { start_date: '2024-01-01' },
        cohort_description: 'Currently active cohort',
        measurement_period_start: new Date('2024-01-01'),
        is_ongoing: true,
        analysis_method: 'continuous_tracking'
      }).returning();

      // Completed cohort
      const [completedCohort] = await db.insert(participation_cohorts).values({
        cohort_name: 'Completed Cohort',
        cohort_type: 'temporal',
        cohort_criteria: { period: 'Q1_2024' },
        cohort_description: 'Completed quarterly cohort',
        measurement_period_start: new Date('2024-01-01'),
        measurement_period_end: new Date('2024-03-31'),
        is_ongoing: false,
        analysis_method: 'quarterly_analysis'
      }).returning();

      expect(ongoingCohort.is_ongoing).toBe(true);
      expect(ongoingCohort.measurement_period_end).toBeNull();
      expect(completedCohort.is_ongoing).toBe(false);
      expect(completedCohort.measurement_period_end).toEqual(new Date('2024-03-31'));
    });
  });

  describe('Legislative Outcomes Table', () => {
    it('should create a comprehensive legislative outcome record', async () => {
      const socialMediaEngagement = {
        twitter_mentions: 150,
        facebook_shares: 89,
        linkedin_discussions: 23,
        total_reach: 45000
      };

      const daysBetweenReadings = [7, 14, 21]; // Days between first, second, third readings

      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        outcome_type: 'passed',
        outcome_date: new Date('2024-06-15'),
        outcome_description: 'Bill passed with amendments after extensive public consultation',
        total_votes_cast: 287,
        votes_for: 195,
        votes_against: 78,
        abstentions: 14,
        absent_members: 13,
        committee_recommendation: 'pass_with_amendments',
        committee_vote_margin: 'strong_majority',
        number_of_readings: 3,
        amendments_proposed: 12,
        amendments_accepted: 8,
        days_from_introduction: 120,
        days_in_committee: 45,
        days_between_readings: daysBetweenReadings,
        total_process_duration: 120,
        total_public_comments: 2847,
        total_public_votes: 5692,
        public_support_percentage: 68.5,
        peak_engagement_date: new Date('2024-05-20'),
        active_campaigns_count: 3,
        campaign_participants_total: 1250,
        actions_completed_total: 3890,
        media_mentions_count: 45,
        social_media_engagement: socialMediaEngagement,
        expert_analyses_count: 8,
        constitutional_concerns_raised: 2,
        expert_reviews_conducted: 3,
        constitutional_risk_level: 'medium',
        cso_positions_recorded: 15,
        corporate_lobbying_detected: true,
        financial_conflicts_identified: 1,
        implementation_status: 'pending',
        verification_status: 'verified'
      }).returning();

      expect(outcome).toBeDefined();
      expect(outcome.bill_id).toBe(testBillId);
      expect(outcome.outcome_type).toBe('passed');
      expect(outcome.votes_for).toBe(195);
      expect(outcome.votes_against).toBe(78);
      expect(outcome.public_support_percentage).toBe('68.50');
      expect(outcome.social_media_engagement).toEqual(socialMediaEngagement);
      expect(outcome.days_between_readings).toEqual(daysBetweenReadings);
      expect(outcome.corporate_lobbying_detected).toBe(true);
    });

    it('should handle different outcome types', async () => {
      const outcomeTypes = ['passed', 'rejected', 'amended', 'withdrawn', 'lapsed', 'referred_back'];
      
      for (const type of outcomeTypes) {
        const [outcome] = await db.insert(legislative_outcomes).values({
          bill_id: testBillId,
          outcome_type: type,
          outcome_date: new Date(),
          outcome_description: `Bill ${type} after legislative process`
        }).returning();

        expect(outcome.outcome_type).toBe(type);
      }
    });

    it('should track implementation for passed bills', async () => {
      const implementationChallenges = [
        'Regulatory framework development needed',
        'Budget allocation pending',
        'Stakeholder resistance'
      ];

      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        outcome_type: 'passed',
        outcome_date: new Date('2024-06-15'),
        implementation_status: 'partial',
        implementation_date: new Date('2024-09-01'),
        implementation_challenges: implementationChallenges
      }).returning();

      expect(outcome.implementation_status).toBe('partial');
      expect(outcome.implementation_challenges).toEqual(implementationChallenges);
    });

    it('should handle bills with amendments', async () => {
      // Create an amendment first
      const [amendment] = await db.insert(bill_amendments).values({
        bill_id: testBillId,
        proposer_id: testSponsorId,
        amendment_text: 'Test amendment for outcome tracking',
        amendment_rationale: 'Improve bill effectiveness',
        status: 'accepted'
      }).returning();

      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        amendment_id: amendment.id,
        outcome_type: 'amended',
        outcome_date: new Date(),
        amendments_proposed: 5,
        amendments_accepted: 3
      }).returning();

      expect(outcome.amendment_id).toBe(amendment.id);
      expect(outcome.amendments_proposed).toBe(5);
      expect(outcome.amendments_accepted).toBe(3);
    });
  });

  describe('Attribution Assessments Table', () => {
    let testLegislativeOutcomeId: string;

    beforeEach(async () => {
      // Create a legislative outcome for attribution testing
      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        outcome_type: 'passed',
        outcome_date: new Date('2024-06-15')
      }).returning();
      testLegislativeOutcomeId = outcome.id;
    });

    it('should create a comprehensive attribution assessment', async () => {
      const supportingEvidence = [
        'Timeline correlation between campaign launch and bill progress',
        'MP statements referencing public input',
        'Amendment text matches campaign proposals'
      ];

      const alternativeExplanations = [
        'Party leadership directive',
        'International pressure',
        'Economic conditions'
      ];

      const comparativeOutcomes = [
        { bill_id: 'similar-bill-1', engagement_level: 'low', outcome: 'rejected' },
        { bill_id: 'similar-bill-2', engagement_level: 'high', outcome: 'passed' }
      ];

      const [assessment] = await db.insert(attribution_assessments).values({
        legislative_outcome_id: testLegislativeOutcomeId,
        bill_id: testBillId,
        attribution_type: 'public_pressure',
        attribution_description: 'High public engagement correlated with bill passage',
        supporting_evidence: supportingEvidence,
        evidence_strength: 'strong',
        correlation_coefficient: 0.78,
        statistical_significance: 0.02,
        confidence_interval_lower: 0.65,
        confidence_interval_upper: 0.91,
        causal_mechanism: 'Public pressure influenced MP voting behavior through constituent feedback',
        alternative_explanations: alternativeExplanations,
        intervention_start_date: new Date('2024-03-01'),
        intervention_end_date: new Date('2024-06-10'),
        outcome_lag_days: 5,
        public_comments_at_outcome: 2847,
        public_votes_at_outcome: 5692,
        campaign_participants_at_outcome: 1250,
        actions_completed_at_outcome: 3890,
        similar_bills_analyzed: 5,
        comparative_outcomes: comparativeOutcomes,
        relative_engagement_level: 'much_higher',
        overall_attribution_confidence: 'high',
        attribution_percentage: 75.0,
        analysis_method: 'causal_inference',
        control_group_used: true,
        peer_reviewed: true,
        reviewer_consensus: true,
        analyst_id: testUserId,
        analysis_date: new Date('2024-07-01')
      }).returning();

      expect(assessment).toBeDefined();
      expect(assessment.legislative_outcome_id).toBe(testLegislativeOutcomeId);
      expect(assessment.attribution_type).toBe('public_pressure');
      expect(assessment.evidence_strength).toBe('strong');
      expect(assessment.correlation_coefficient).toBe('0.7800');
      expect(assessment.supporting_evidence).toEqual(supportingEvidence);
      expect(assessment.alternative_explanations).toEqual(alternativeExplanations);
      expect(assessment.comparative_outcomes).toEqual(comparativeOutcomes);
      expect(assessment.overall_attribution_confidence).toBe('high');
      expect(assessment.attribution_percentage).toBe('75.00');
    });

    it('should handle different attribution types', async () => {
      const attributionTypes = ['public_pressure', 'campaign_influence', 'expert_analysis', 'media_attention'];
      
      for (const type of attributionTypes) {
        const [assessment] = await db.insert(attribution_assessments).values({
          legislative_outcome_id: testLegislativeOutcomeId,
          bill_id: testBillId,
          attribution_type: type,
          attribution_description: `Test ${type} attribution`,
          supporting_evidence: [`Evidence for ${type}`],
          evidence_strength: 'moderate',
          overall_attribution_confidence: 'medium',
          analysis_method: 'correlation_analysis',
          analyst_id: testUserId,
          analysis_date: new Date()
        }).returning();

        expect(assessment.attribution_type).toBe(type);
      }
    });

    it('should track statistical rigor', async () => {
      const [rigorousAssessment] = await db.insert(attribution_assessments).values({
        legislative_outcome_id: testLegislativeOutcomeId,
        bill_id: testBillId,
        attribution_type: 'campaign_influence',
        attribution_description: 'Rigorous statistical analysis of campaign impact',
        supporting_evidence: ['Randomized controlled trial data'],
        evidence_strength: 'very_strong',
        correlation_coefficient: 0.85,
        statistical_significance: 0.001,
        confidence_interval_lower: 0.75,
        confidence_interval_upper: 0.95,
        overall_attribution_confidence: 'very_high',
        attribution_percentage: 85.0,
        analysis_method: 'randomized_controlled_trial',
        control_group_used: true,
        randomization_applied: true,
        peer_reviewed: true,
        reviewer_consensus: true,
        external_validation: true,
        analyst_id: testUserId,
        analysis_date: new Date()
      }).returning();

      expect(rigorousAssessment.control_group_used).toBe(true);
      expect(rigorousAssessment.randomization_applied).toBe(true);
      expect(rigorousAssessment.peer_reviewed).toBe(true);
      expect(rigorousAssessment.external_validation).toBe(true);
      expect(rigorousAssessment.overall_attribution_confidence).toBe('very_high');
    });
  });

  describe('Success Stories Table', () => {
    let testLegislativeOutcomeId: string;

    beforeEach(async () => {
      // Create a legislative outcome for success story
      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        outcome_type: 'passed',
        outcome_date: new Date('2024-06-15')
      }).returning();
      testLegislativeOutcomeId = outcome.id;
    });

    it('should create a comprehensive success story', async () => {
      const keyParticipants = [
        { name: 'Jane Doe', role: 'Campaign Organizer', organization: 'Citizens for Change' },
        { name: 'MP John Smith', role: 'Bill Sponsor', organization: 'Parliament' },
        { name: 'Dr. Mary Johnson', role: 'Expert Advisor', organization: 'Policy Institute' }
      ];

      const timelineOfEvents = [
        { date: '2024-03-01', event: 'Campaign launched' },
        { date: '2024-04-15', event: 'Public hearings conducted' },
        { date: '2024-05-20', event: 'Peak engagement reached' },
        { date: '2024-06-15', event: 'Bill passed with amendments' }
      ];

      const policyChangesAchieved = [
        'Increased transparency requirements',
        'Stronger oversight mechanisms',
        'Enhanced public participation provisions'
      ];

      const participantTestimonials = [
        { participant: 'Jane Doe', testimonial: 'The platform enabled unprecedented coordination' },
        { participant: 'Community Leader', testimonial: 'Our voices were finally heard in Parliament' }
      ];

      const [story] = await db.insert(success_stories).values({
        story_title: 'Citizens Successfully Advocate for Transparency Bill',
        story_summary: 'Coordinated citizen campaign leads to passage of enhanced transparency legislation',
        story_category: 'bill_amendment',
        bill_id: testBillId,
        campaign_id: testCampaignId,
        legislative_outcome_id: testLegislativeOutcomeId,
        detailed_narrative: 'A comprehensive campaign involving 1,250 citizens across multiple counties successfully advocated for stronger transparency provisions in the proposed legislation. Through coordinated online engagement and offline community sessions, citizens provided detailed input that directly influenced the final bill text.',
        key_participants: keyParticipants,
        timeline_of_events: timelineOfEvents,
        citizens_involved: 1250,
        organizations_involved: 8,
        geographic_reach: ['nairobi', 'mombasa', 'kisumu'],
        policy_changes_achieved: policyChangesAchieved,
        transparency_improvements: ['Public database of government contracts', 'Mandatory disclosure timelines'],
        democratic_participation_increase: ['40% increase in public hearing attendance', '300% increase in written submissions'],
        platform_features_used: ['bill_tracking', 'comment_synthesis', 'campaign_coordination', 'offline_sessions'],
        platform_contribution_description: 'Platform enabled coordination of geographically dispersed citizens and synthesis of their input into coherent policy proposals',
        without_platform_counterfactual: 'Without the platform, citizen input would likely have been fragmented and less influential',
        verification_status: 'verified',
        evidence_documents: ['Parliamentary hansard', 'Bill amendment records', 'Media coverage'],
        media_coverage: ['Daily Nation article', 'KTN News segment', 'Radio interview'],
        official_acknowledgments: ['MP statement crediting public input', 'Committee report mentioning citizen engagement'],
        participant_testimonials: participantTestimonials,
        expert_validation: 'Independent policy expert confirmed causal relationship between campaign and bill amendments',
        independent_verification: true,
        replicability_assessment: 'Model can be replicated for similar transparency legislation',
        lessons_learned: ['Early engagement is crucial', 'Offline sessions increase rural participation'],
        success_factors: ['Clear messaging', 'Diverse coalition', 'Sustained engagement'],
        challenges_overcome: ['Digital divide', 'Language barriers', 'Political resistance'],
        published: true,
        publication_date: new Date('2024-07-01'),
        target_audiences: ['civil_society', 'policymakers', 'citizens'],
        documented_by: testUserId,
        verified_by: testUserId
      }).returning();

      expect(story).toBeDefined();
      expect(story.story_title).toBe('Citizens Successfully Advocate for Transparency Bill');
      expect(story.story_category).toBe('bill_amendment');
      expect(story.citizens_involved).toBe(1250);
      expect(story.organizations_involved).toBe(8);
      expect(story.geographic_reach).toEqual(['nairobi', 'mombasa', 'kisumu']);
      expect(story.key_participants).toEqual(keyParticipants);
      expect(story.timeline_of_events).toEqual(timelineOfEvents);
      expect(story.policy_changes_achieved).toEqual(policyChangesAchieved);
      expect(story.independent_verification).toBe(true);
      expect(story.published).toBe(true);
    });

    it('should handle different story categories', async () => {
      const storyCategories = ['bill_amendment', 'increased_transparency', 'citizen_mobilization', 'policy_change'];
      
      for (const category of storyCategories) {
        const [story] = await db.insert(success_stories).values({
          story_title: `Test ${category} Story`,
          story_summary: `Success story for ${category}`,
          story_category: category,
          detailed_narrative: `Detailed narrative for ${category} success`,
          platform_contribution_description: `Platform enabled ${category}`,
          documented_by: testUserId
        }).returning();

        expect(story.story_category).toBe(category);
      }
    });

    it('should track verification and publication status', async () => {
      // Unverified, unpublished story
      const [draftStory] = await db.insert(success_stories).values({
        story_title: 'Draft Success Story',
        story_summary: 'Story in draft status',
        story_category: 'citizen_mobilization',
        detailed_narrative: 'Draft narrative',
        platform_contribution_description: 'Platform contribution',
        verification_status: 'pending',
        published: false,
        documented_by: testUserId
      }).returning();

      // Verified, published story
      const [publishedStory] = await db.insert(success_stories).values({
        story_title: 'Published Success Story',
        story_summary: 'Verified and published story',
        story_category: 'policy_change',
        detailed_narrative: 'Published narrative',
        platform_contribution_description: 'Platform contribution',
        verification_status: 'verified',
        published: true,
        publication_date: new Date(),
        documented_by: testUserId,
        verified_by: testUserId
      }).returning();

      expect(draftStory.verification_status).toBe('pending');
      expect(draftStory.published).toBe(false);
      expect(publishedStory.verification_status).toBe('verified');
      expect(publishedStory.published).toBe(true);
    });
  });

  describe('Equity Metrics Table', () => {
    it('should create comprehensive equity metrics', async () => {
      const countyParticipationDistribution = {
        nairobi: 35.2,
        mombasa: 12.8,
        kisumu: 8.5,
        nakuru: 6.3,
        other: 37.2
      };

      const ageGroupDistribution = {
        '18-25': 28.5,
        '26-35': 34.2,
        '36-45': 22.1,
        '46-55': 10.8,
        '56+': 4.4
      };

      const languageUsageDistribution = {
        english: 65.2,
        swahili: 78.9,
        kikuyu: 15.3,
        luo: 8.7,
        other_local: 12.1
      };

      const participationGapsQuantified = {
        rural_urban_gap: 23.5,
        gender_gap: 8.2,
        age_gap: 15.7,
        education_gap: 19.3
      };

      const [metrics] = await db.insert(equity_metrics).values({
        measurement_date: new Date('2024-06-30'),
        measurement_period: 'monthly',
        county_participation_distribution: countyParticipationDistribution,
        urban_rural_participation_ratio: 2.3,
        constituency_coverage_percentage: 78.5,
        age_group_distribution: ageGroupDistribution,
        gender_participation_ratio: 1.15,
        language_usage_distribution: languageUsageDistribution,
        underrepresented_groups_identified: ['rural_women', 'elderly', 'persons_with_disabilities'],
        participation_gaps_quantified: participationGapsQuantified,
        overall_equity_score: 0.72,
        geographic_equity_index: 0.68,
        demographic_equity_index: 0.75,
        digital_inclusion_index: 0.63,
        equity_trend_direction: 'improving',
        month_over_month_change: 3.2,
        year_over_year_change: 12.8,
        calculation_method: 'weighted_composite_index',
        data_completeness_score: 0.89
      }).returning();

      expect(metrics).toBeDefined();
      expect(metrics.measurement_period).toBe('monthly');
      expect(metrics.county_participation_distribution).toEqual(countyParticipationDistribution);
      expect(metrics.urban_rural_participation_ratio).toBe('2.30');
      expect(metrics.age_group_distribution).toEqual(ageGroupDistribution);
      expect(metrics.language_usage_distribution).toEqual(languageUsageDistribution);
      expect(metrics.underrepresented_groups_identified).toEqual(['rural_women', 'elderly', 'persons_with_disabilities']);
      expect(metrics.overall_equity_score).toBe('0.72');
      expect(metrics.equity_trend_direction).toBe('improving');
    });

    it('should handle different measurement periods', async () => {
      const measurementPeriods = ['daily', 'weekly', 'monthly', 'quarterly'];
      
      for (const period of measurementPeriods) {
        const [metrics] = await db.insert(equity_metrics).values({
          measurement_date: new Date(),
          measurement_period: period,
          calculation_method: 'test_method'
        }).returning();

        expect(metrics.measurement_period).toBe(period);
      }
    });

    it('should track digital divide metrics', async () => {
      const mobileVsDesktopAccess = {
        mobile_only: 68.5,
        desktop_only: 8.2,
        both: 23.3
      };

      const internetConnectivityLevels = {
        high_speed: 35.2,
        medium_speed: 42.8,
        low_speed: 18.5,
        no_internet: 3.5
      };

      const ussdUsageByRegion = {
        nairobi: 12.3,
        central: 28.7,
        coast: 35.2,
        western: 42.1,
        northern: 58.9
      };

      const [metrics] = await db.insert(equity_metrics).values({
        measurement_date: new Date(),
        measurement_period: 'monthly',
        mobile_vs_desktop_access: mobileVsDesktopAccess,
        internet_connectivity_levels: internetConnectivityLevels,
        ussd_usage_by_region: ussdUsageByRegion,
        digital_inclusion_index: 0.65,
        calculation_method: 'digital_divide_analysis'
      }).returning();

      expect(metrics.mobile_vs_desktop_access).toEqual(mobileVsDesktopAccess);
      expect(metrics.internet_connectivity_levels).toEqual(internetConnectivityLevels);
      expect(metrics.ussd_usage_by_region).toEqual(ussdUsageByRegion);
    });

    it('should track trend directions', async () => {
      const trendDirections = ['improving', 'stable', 'declining'];
      
      for (const trend of trendDirections) {
        const [metrics] = await db.insert(equity_metrics).values({
          measurement_date: new Date(),
          measurement_period: 'monthly',
          equity_trend_direction: trend,
          calculation_method: 'trend_analysis'
        }).returning();

        expect(metrics.equity_trend_direction).toBe(trend);
      }
    });
  });

  describe('Schema Relationships and Complex Queries', () => {
    it('should query legislative outcomes with their attribution assessments', async () => {
      // Create legislative outcome
      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        outcome_type: 'passed',
        outcome_date: new Date('2024-06-15'),
        public_support_percentage: 75.5
      }).returning();

      // Create attribution assessment
      await db.insert(attribution_assessments).values({
        legislative_outcome_id: outcome.id,
        bill_id: testBillId,
        attribution_type: 'public_pressure',
        attribution_description: 'High public support led to passage',
        supporting_evidence: ['Public polling data'],
        evidence_strength: 'strong',
        overall_attribution_confidence: 'high',
        analysis_method: 'correlation_analysis',
        analyst_id: testUserId,
        analysis_date: new Date()
      });

      // Query with join
      const result = await db
        .select({
          outcomeType: legislative_outcomes.outcome_type,
          publicSupport: legislative_outcomes.public_support_percentage,
          attributionType: attribution_assessments.attribution_type,
          attributionConfidence: attribution_assessments.overall_attribution_confidence
        })
        .from(legislative_outcomes)
        .innerJoin(attribution_assessments, sql`${legislative_outcomes.id} = ${attribution_assessments.legislative_outcome_id}`)
        .where(sql`${legislative_outcomes.id} = ${outcome.id}`);

      expect(result).toHaveLength(1);
      expect(result[0].outcomeType).toBe('passed');
      expect(result[0].publicSupport).toBe('75.50');
      expect(result[0].attributionType).toBe('public_pressure');
      expect(result[0].attributionConfidence).toBe('high');
    });

    it('should query success stories with related entities', async () => {
      // Create legislative outcome
      const [outcome] = await db.insert(legislative_outcomes).values({
        bill_id: testBillId,
        outcome_type: 'passed',
        outcome_date: new Date()
      }).returning();

      // Create success story
      await db.insert(success_stories).values({
        story_title: 'Test Success Story',
        story_summary: 'Test summary',
        story_category: 'bill_amendment',
        bill_id: testBillId,
        campaign_id: testCampaignId,
        legislative_outcome_id: outcome.id,
        detailed_narrative: 'Test narrative',
        platform_contribution_description: 'Platform helped coordinate efforts',
        documented_by: testUserId
      });

      // Complex query joining multiple tables
      const result = await db
        .select({
          storyTitle: success_stories.story_title,
          billTitle: bills.title,
          campaignName: campaigns.campaign_name,
          outcomeType: legislative_outcomes.outcome_type
        })
        .from(success_stories)
        .innerJoin(bills, sql`${success_stories.bill_id} = ${bills.id}`)
        .innerJoin(campaigns, sql`${success_stories.campaign_id} = ${campaigns.id}`)
        .innerJoin(legislative_outcomes, sql`${success_stories.legislative_outcome_id} = ${legislative_outcomes.id}`)
        .where(sql`${success_stories.bill_id} = ${testBillId}`);

      expect(result).toHaveLength(1);
      expect(result[0].storyTitle).toBe('Test Success Story');
      expect(result[0].billTitle).toBe('Test Impact Bill');
      expect(result[0].campaignName).toBe('Test Impact Campaign');
      expect(result[0].outcomeType).toBe('passed');
    });

    it('should handle time-series queries for equity metrics', async () => {
      // Create multiple equity metrics over time
      const dates = [
        new Date('2024-01-31'),
        new Date('2024-02-29'),
        new Date('2024-03-31')
      ];

      const equityScores = [0.65, 0.68, 0.72];

      for (let i = 0; i < dates.length; i++) {
        await db.insert(equity_metrics).values({
          measurement_date: dates[i],
          measurement_period: 'monthly',
          overall_equity_score: equityScores[i],
          calculation_method: 'time_series_test'
        });
      }

      // Query time series
      const timeSeries = await db
        .select({
          measurementDate: equity_metrics.measurement_date,
          equityScore: equity_metrics.overall_equity_score
        })
        .from(equity_metrics)
        .where(sql`${equity_metrics.calculation_method} = 'time_series_test'`)
        .orderBy(equity_metrics.measurement_date);

      expect(timeSeries).toHaveLength(3);
      expect(timeSeries[0].equityScore).toBe('0.65');
      expect(timeSeries[1].equityScore).toBe('0.68');
      expect(timeSeries[2].equityScore).toBe('0.72');
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle null and optional fields correctly', async () => {
      // Minimal participation cohort
      const [cohort] = await db.insert(participation_cohorts).values({
        cohort_name: 'Minimal Cohort',
        cohort_type: 'test',
        cohort_criteria: { minimal: true },
        cohort_description: 'Minimal test cohort',
        measurement_period_start: new Date(),
        analysis_method: 'minimal_test'
      }).returning();

      expect(cohort.cohort_name).toBe('Minimal Cohort');
      expect(cohort.total_users).toBe(0); // Default value
      expect(cohort.is_ongoing).toBe(true); // Default value
      expect(cohort.measurement_period_end).toBeNull();
    });

    it('should validate percentage fields', async () => {
      // Valid percentage
      const [validMetrics] = await db.insert(equity_metrics).values({
        measurement_date: new Date(),
        measurement_period: 'monthly',
        overall_equity_score: 0.85,
        calculation_method: 'validation_test'
      }).returning();

      expect(validMetrics.overall_equity_score).toBe('0.85');

      // Test boundary values
      const [boundaryMetrics] = await db.insert(equity_metrics).values({
        measurement_date: new Date(),
        measurement_period: 'monthly',
        overall_equity_score: 1.00, // Maximum valid value
        calculation_method: 'boundary_test'
      }).returning();

      expect(boundaryMetrics.overall_equity_score).toBe('1.00');
    });

    it('should handle large JSONB objects', async () => {
      // Create large demographic breakdown
      const largeDemographicBreakdown = {
        age_groups: {},
        occupations: {},
        education_levels: {},
        income_brackets: {}
      };

      // Populate with many categories
      for (let i = 0; i < 50; i++) {
        largeDemographicBreakdown.age_groups[`group_${i}`] = Math.random() * 100;
        largeDemographicBreakdown.occupations[`occupation_${i}`] = Math.random() * 100;
      }

      const [cohort] = await db.insert(participation_cohorts).values({
        cohort_name: 'Large Data Cohort',
        cohort_type: 'comprehensive',
        cohort_criteria: { comprehensive: true },
        cohort_description: 'Cohort with large demographic data',
        measurement_period_start: new Date(),
        demographic_breakdown: largeDemographicBreakdown,
        analysis_method: 'large_data_test'
      }).returning();

      expect(cohort.demographic_breakdown).toEqual(largeDemographicBreakdown);
      expect(Object.keys(cohort.demographic_breakdown.age_groups)).toHaveLength(50);
    });
  });
});