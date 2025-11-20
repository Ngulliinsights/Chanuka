// ============================================================================
// ARGUMENT INTELLIGENCE SCHEMA TESTS
// ============================================================================
// Tests for argument synthesis, claim clustering, and brief generation

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  arguments,
  claims,
  evidence,
  argument_relationships,
  legislative_briefs,
  synthesis_jobs
} from './argument_intelligence';
import { bills, users } from './foundation';
import { comments } from './citizen_participation';
import { eq, and, or, sql, count, sum, avg } from 'drizzle-orm';

describe('Argument Intelligence Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('argument_intelligence');
  });

  describe('Arguments Table', () => {
    it('should extract structured arguments from comments', async () => {
      // Create test data
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      
      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id,
        comment_text: 'This healthcare bill will improve access for rural communities by building more clinics and training more doctors. However, the funding mechanism through increased taxes may burden middle-class families.'
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      // Extract arguments from comment
      const argumentsData = [
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'This healthcare bill will improve access for rural communities',
          normalized_text: 'healthcare bill improves rural access',
          topic_tags: ['healthcare', 'rural_development'],
          affected_groups: ['rural_residents', 'healthcare_workers'],
          extraction_confidence: 0.92,
          coherence_score: 0.88,
          evidence_quality: 'moderate',
          extraction_method: 'ml_model_v2'
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'evidence',
          position: 'support',
          extracted_text: 'by building more clinics and training more doctors',
          normalized_text: 'building clinics training doctors',
          parent_argument_id: null, // Will be set after first argument is inserted
          extraction_confidence: 0.85,
          extraction_method: 'rule_based'
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'oppose',
          extracted_text: 'the funding mechanism through increased taxes may burden middle-class families',
          normalized_text: 'tax increases burden middle class',
          topic_tags: ['taxation', 'middle_class'],
          affected_groups: ['middle_class', 'taxpayers'],
          extraction_confidence: 0.89,
          coherence_score: 0.91,
          evidence_quality: 'weak',
          extraction_method: 'ml_model_v2'
        }
      ];

      const [argument1] = await testDb.insert(arguments).values(argumentsData[0]).returning();
      
      // Update parent relationship for second argument
      argumentsData[1].parent_argument_id = argument1.id;
      const [argument2] = await testDb.insert(arguments).values(argumentsData[1]).returning();
      const [argument3] = await testDb.insert(arguments).values(argumentsData[2]).returning();

      expect(argument1.argument_type).toBe('claim');
      expect(argument1.position).toBe('support');
      expect(argument1.extraction_confidence).toBe(0.92);
      expect(argument1.topic_tags).toContain('healthcare');
      expect(argument3.position).toBe('oppose');
    });

    it('should handle argument threading and relationships', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      
      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      // Create parent argument
      const parentArgument = {
        comment_id: comment.id,
        bill_id: bill.id,
        argument_type: 'claim',
        position: 'support',
        extracted_text: 'This bill will improve healthcare access',
        extraction_confidence: 0.9,
        extraction_method: 'ml_model'
      };
      const [parent] = await testDb.insert(arguments).values(parentArgument).returning();

      // Create child arguments (sub-arguments)
      const childArguments = [
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'reasoning',
          position: 'support',
          extracted_text: 'because it allocates funds for rural clinics',
          parent_argument_id: parent.id,
          extraction_confidence: 0.85
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'evidence',
          position: 'support',
          extracted_text: 'similar programs in other countries reduced mortality by 15%',
          parent_argument_id: parent.id,
          extraction_confidence: 0.78
        }
      ];

      await testDb.insert(arguments).values(childArguments);

      // Query argument tree
      const argumentTree = await testDb
        .select()
        .from(arguments)
        .where(eq(arguments.comment_id, comment.id))
        .orderBy(arguments.id);

      expect(argumentTree).toHaveLength(3);
      expect(argumentTree[0].id).toBe(parent.id);
      expect(argumentTree[1].parent_argument_id).toBe(parent.id);
      expect(argumentTree[2].parent_argument_id).toBe(parent.id);
    });

    it('should filter arguments by position and quality', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      
      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      const argumentsData = [
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'Strong argument 1',
          extraction_confidence: 0.95,
          coherence_score: 0.92,
          evidence_quality: 'strong'
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'Weak argument 1',
          extraction_confidence: 0.65,
          coherence_score: 0.58,
          evidence_quality: 'weak'
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'oppose',
          extracted_text: 'Opposition argument 1',
          extraction_confidence: 0.88,
          coherence_score: 0.85,
          evidence_quality: 'moderate'
        }
      ];

      await testDb.insert(arguments).values(argumentsData);

      // Query high-quality supporting arguments
      const highQualitySupport = await testDb
        .select()
        .from(arguments)
        .where(and(
          eq(arguments.bill_id, bill.id),
          eq(arguments.position, 'support'),
          sql`${arguments.extraction_confidence} > 0.8`,
          sql`${arguments.coherence_score} > 0.8`
        ));

      expect(highQualitySupport).toHaveLength(1);
      expect(highQualitySupport[0].extracted_text).toBe('Strong argument 1');
    });
  });

  describe('Claims Table', () => {
    it('should create deduplicated claims from arguments', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      
      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      // Create multiple similar arguments that should cluster into one claim
      const argumentsData = [
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'This bill improves healthcare access',
          claim_id: null // Will be set after claim creation
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'Healthcare access will be better with this bill',
          claim_id: null
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'The bill enhances healthcare accessibility',
          claim_id: null
        }
      ];

      const [arg1, arg2, arg3] = await testDb.insert(arguments).values(argumentsData).returning();

      // Create claim that synthesizes these arguments
      const claim = {
        bill_id: bill.id,
        claim_text: 'This legislation will improve healthcare access for citizens',
        claim_summary: 'Healthcare access improvement',
        position: 'support',
        argument_cluster_size: 3,
        source_arguments: [arg1.id, arg2.id, arg3.id],
        expressing_users_count: 3,
        counties_represented: ['nairobi', 'kiambu', 'kisumu'],
        demographic_spread: { urban: 2, rural: 1, youth: 1, elderly: 1 },
        supporting_evidence_count: 5,
        evidence_quality_avg: 0.82,
        expert_endorsements: 1,
        importance_score: 8.5,
        novelty_score: 0.6,
        claim_category: 'healthcare_access',
        fact_check_status: 'verified'
      };

      const [insertedClaim] = await testDb
        .insert(claims)
        .values(claim)
        .returning();

      // Link arguments to claim
      await testDb
        .update(arguments)
        .set({ claim_id: insertedClaim.id })
        .where(inArray(arguments.id, [arg1.id, arg2.id, arg3.id]));

      expect(insertedClaim.argument_cluster_size).toBe(3);
      expect(insertedClaim.expressing_users_count).toBe(3);
      expect(insertedClaim.importance_score).toBe(8.5);
      expect(insertedClaim.counties_represented).toHaveLength(3);
    });

    it('should track claim importance and geographic spread', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const claimsData = [
        {
          bill_id: bill.id,
          claim_text: 'High importance claim',
          position: 'support',
          importance_score: 9.2,
          counties_represented: ['nairobi', 'mombasa', 'kisumu', 'nakuru'],
          expressing_users_count: 150,
          argument_cluster_size: 25
        },
        {
          bill_id: bill.id,
          claim_text: 'Medium importance claim',
          position: 'oppose',
          importance_score: 6.8,
          counties_represented: ['nairobi', 'kiambu'],
          expressing_users_count: 45,
          argument_cluster_size: 8
        },
        {
          bill_id: bill.id,
          claim_text: 'Low importance claim',
          position: 'neutral',
          importance_score: 3.4,
          counties_represented: ['nairobi'],
          expressing_users_count: 12,
          argument_cluster_size: 3
        }
      ];

      await testDb.insert(claims).values(claimsData);

      // Query top claims
      const topClaims = await testDb
        .select()
        .from(claims)
        .where(eq(claims.bill_id, bill.id))
        .orderBy(claims.importance_score)
        .limit(2);

      expect(topClaims).toHaveLength(2);
      expect(topClaims[0].importance_score).toBe(3.4); // Lowest first (ASC order)
      expect(topClaims[1].importance_score).toBe(6.8);

      // Query claims with broad geographic representation
      const broadClaims = await testDb
        .select()
        .from(claims)
        .where(and(
          eq(claims.bill_id, bill.id),
          sql`array_length(${claims.counties_represented}, 1) > 3`
        ));

      expect(broadClaims).toHaveLength(1);
      expect(broadClaims[0].counties_represented).toHaveLength(4);
    });

    it('should handle fact-checking and expert endorsement', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const claim = {
        bill_id: bill.id,
        claim_text: 'Fact-checked claim about healthcare costs',
        position: 'support',
        fact_check_status: 'verified',
        fact_check_notes: 'Verified against WHO and Ministry of Health data',
        fact_check_sources: ['WHO Report 2024', 'Ministry of Health Statistics', 'KNBS Economic Survey'],
        expert_endorsements: 3,
        included_in_briefs: 2,
        legislative_response: 'Committee acknowledged this claim in their report'
      };

      const [insertedClaim] = await testDb
        .insert(claims)
        .values(claim)
        .returning();

      expect(insertedClaim.fact_check_status).toBe('verified');
      expect(insertedClaim.fact_check_sources).toHaveLength(3);
      expect(insertedClaim.expert_endorsements).toBe(3);
      expect(insertedClaim.included_in_briefs).toBe(2);
      expect(insertedClaim.legislative_response).toBeDefined();
    });
  });

  describe('Evidence Table', () => {
    it('should track supporting evidence for claims', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const claim = {
        bill_id: bill.id,
        claim_text: 'Evidence-based claim',
        position: 'support'
      };
      const [insertedClaim] = await testDb.insert(claims).values(claim).returning();

      const evidenceData = [
        {
          evidence_type: 'research_study',
          evidence_text: 'WHO study shows 23% reduction in mortality with similar healthcare programs',
          evidence_summary: 'WHO mortality reduction study',
          source_title: 'Global Health Study 2024',
          source_author: 'Dr. Jane Smith',
          source_organization: 'World Health Organization',
          source_url: 'https://who.int/studies/healthcare-2024',
          publication_date: new Date('2024-01-15'),
          source_credibility: 'high',
          credibility_reasoning: 'Peer-reviewed study by reputable international organization',
          peer_reviewed: true,
          verification_status: 'verified',
          verification_method: 'expert_verification',
          supporting_claims: [insertedClaim.id]
        },
        {
          evidence_type: 'government_data',
          evidence_text: 'Ministry of Health data shows current rural healthcare access at 45%',
          source_title: 'Rural Healthcare Access Report',
          source_organization: 'Ministry of Health, Kenya',
          publication_date: new Date('2023-12-01'),
          source_credibility: 'high',
          peer_reviewed: false,
          verification_status: 'verified',
          supporting_claims: [insertedClaim.id]
        }
      ];

      await testDb.insert(evidence).values(evidenceData);

      const claimEvidence = await testDb
        .select()
        .from(evidence)
        .where(sql`${evidence.supporting_claims} @> ARRAY[${insertedClaim.id}]::uuid[]`);

      expect(claimEvidence).toHaveLength(2);
      expect(claimEvidence[0].evidence_type).toBe('research_study');
      expect(claimEvidence[1].evidence_type).toBe('government_data');
    });

    it('should verify evidence credibility', async () => {
      const evidenceData = [
        {
          evidence_type: 'research_study',
          evidence_text: 'Peer-reviewed study from top university',
          source_organization: 'Harvard School of Public Health',
          source_credibility: 'high',
          peer_reviewed: true,
          verification_status: 'verified',
          verified_by: null // Will be set after user creation
        },
        {
          evidence_type: 'news_article',
          evidence_text: 'Blog post without clear sources',
          source_organization: 'Unknown Blog',
          source_credibility: 'low',
          peer_reviewed: false,
          verification_status: 'pending'
        }
      ];

      const [evidence1, evidence2] = await testDb.insert(evidence).values(evidenceData).returning();

      // Create verifier user
      const testUser = generateTestData.user({ role: 'expert' });
      const [user] = await testDb.insert(users).values(testUser).returning();

      // Verify evidence
      const [updatedEvidence] = await testDb
        .update(evidence)
        .set({
          verification_status: 'verified',
          verified_by: user.id,
          verified_at: new Date(),
          verification_notes: 'Verified against original study data'
        })
        .where(eq(evidence.id, evidence1.id))
        .returning();

      expect(updatedEvidence.verification_status).toBe('verified');
      expect(updatedEvidence.verified_by).toBe(user.id);
      expect(updatedEvidence.verified_at).toBeDefined();
    });
  });

  describe('Argument Relationships', () => {
    it('should create relationships between arguments', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      
      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      // Create arguments
      const argumentsData = [
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'Healthcare funding should be increased'
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'evidence',
          position: 'support',
          extracted_text: 'Current funding is only 2% of GDP'
        },
        {
          comment_id: comment.id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'oppose',
          extracted_text: 'Tax increases will burden citizens'
        }
      ];

      const [arg1, arg2, arg3] = await testDb.insert(arguments).values(argumentsData).returning();

      // Create relationships
      const relationships = [
        {
          source_argument_id: arg2.id,
          target_argument_id: arg1.id,
          relationship_type: 'supports',
          relationship_strength: 0.9,
          reasoning: 'Evidence of low current funding supports need for increased funding',
          bill_id: bill.id
        },
        {
          source_argument_id: arg3.id,
          target_argument_id: arg1.id,
          relationship_type: 'contradicts',
          relationship_strength: 0.8,
          reasoning: 'Concerns about tax burden contradict funding increase proposal',
          bill_id: bill.id
        }
      ];

      await testDb.insert(argument_relationships).values(relationships);

      // Query argument network
      const argumentNetwork = await testDb
        .select({
          source: arguments,
          target: arguments,
          relationship: argument_relationships
        })
        .from(argument_relationships)
        .leftJoin(arguments, eq(argument_relationships.source_argument_id, arguments.id))
        .leftJoin(arguments.as('target'), eq(argument_relationships.target_argument_id, arguments.id))
        .where(eq(argument_relationships.bill_id, bill.id));

      expect(argumentNetwork).toHaveLength(2);
      expect(argumentNetwork[0].relationship.relationship_type).toBe('supports');
      expect(argumentNetwork[1].relationship.relationship_type).toBe('contradicts');
    });

    it('should handle complex argument networks', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      
      const testComment = generateTestData.comment({
        bill_id: bill.id,
        user_id: user.id
      });
      const [comment] = await testDb.insert(comments).values(testComment).returning();

      // Create multiple arguments
      const argumentsData = Array.from({ length: 5 }, (_, i) => ({
        comment_id: comment.id,
        bill_id: bill.id,
        argument_type: 'claim',
        position: i % 2 === 0 ? 'support' : 'oppose',
        extracted_text: `Argument ${i + 1} about the bill`
      }));
      const insertedArgs = await testDb.insert(arguments).values(argumentsData).returning();

      // Create complex relationship network
      const relationships = [
        // Supports relationships
        {
          source_argument_id: insertedArgs[1].id,
          target_argument_id: insertedArgs[0].id,
          relationship_type: 'supports',
          relationship_strength: 0.9,
          bill_id: bill.id
        },
        {
          source_argument_id: insertedArgs[2].id,
          target_argument_id: insertedArgs[0].id,
          relationship_type: 'supports',
          relationship_strength: 0.8,
          bill_id: bill.id
        },
        // Contradicts relationships
        {
          source_argument_id: insertedArgs[3].id,
          target_argument_id: insertedArgs[0].id,
          relationship_type: 'contradicts',
          relationship_strength: 0.85,
          bill_id: bill.id
        },
        {
          source_argument_id: insertedArgs[4].id,
          target_argument_id: insertedArgs[3].id,
          relationship_type: 'elaborates',
          relationship_strength: 0.7,
          bill_id: bill.id
        }
      ];

      await testDb.insert(argument_relationships).values(relationships);

      // Analyze network structure
      const networkAnalysis = await testDb
        .select({
          relationship_type: argument_relationships.relationship_type,
          count: count(argument_relationships.id),
          avg_strength: avg(argument_relationships.relationship_strength)
        })
        .from(argument_relationships)
        .where(eq(argument_relationships.bill_id, bill.id))
        .groupBy(argument_relationships.relationship_type);

      expect(networkAnalysis).toHaveLength(3);
      expect(networkAnalysis.some(r => r.relationship_type === 'supports')).toBe(true);
      expect(networkAnalysis.some(r => r.relationship_type === 'contradicts')).toBe(true);
      expect(networkAnalysis.some(r => r.relationship_type === 'elaborates')).toBe(true);
    });
  });

  describe('Legislative Briefs', () => {
    it('should generate legislative briefs from synthesized arguments', async () => {
      const testUser = generateTestData.user({ role: 'expert' });
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Create key claims for the brief
      const claimsData = [
        {
          bill_id: bill.id,
          claim_text: 'Healthcare access will improve rural mortality rates',
          position: 'support',
          importance_score: 9.2
        },
        {
          bill_id: bill.id,
          claim_text: 'Funding mechanism may burden taxpayers',
          position: 'oppose',
          importance_score: 7.8
        },
        {
          bill_id: bill.id,
          claim_text: 'Implementation timeline is realistic',
          position: 'support',
          importance_score: 6.5
        }
      ];
      const [claim1, claim2, claim3] = await testDb.insert(claims).values(claimsData).returning();

      // Create legislative brief
      const brief = {
        bill_id: bill.id,
        brief_title: 'Legislative Brief: Healthcare Access Bill 2024',
        brief_summary: 'Comprehensive analysis of citizen perspectives on the Healthcare Access Bill, including key arguments, demographic insights, and constitutional implications.',
        key_claims: [claim1.id, claim2.id, claim3.id],
        constitutional_implications: {
          article_43_health_rights: 'Bill strengthens constitutional health rights',
          article_27_privacy: 'Patient data protection measures included'
        },
        stakeholder_positions: {
          healthcare_workers: { support: 0.85, oppose: 0.1, neutral: 0.05 },
          rural_communities: { support: 0.92, oppose: 0.03, neutral: 0.05 },
          taxpayers: { support: 0.45, oppose: 0.4, neutral: 0.15 }
        },
        constituent_participation: {
          total_comments: 234,
          total_votes: 567,
          engagement_rate: 0.73
        },
        geographic_distribution: {
          nairobi: { comments: 45, support_rate: 0.68 },
          rural_counties: { comments: 189, support_rate: 0.84 }
        },
        demographic_breakdown: {
          age_groups: { '18-35': 0.4, '36-55': 0.35, '55+': 0.25 },
          education: { primary: 0.2, secondary: 0.4, tertiary: 0.4 }
        },
        delivery_status: 'delivered',
        delivery_method: 'email',
        delivered_to: ['health_committee@parliament.go.ke', 'finance_committee@parliament.go.ke'],
        delivery_date: new Date(),
        responses_received: 2,
        response_summary: 'Both committees acknowledged receipt and will consider the brief in their deliberations',
        generated_by: user.id,
        generation_method: 'automated_synthesis_v2',
        generation_timestamp: new Date()
      };

      const [insertedBrief] = await testDb
        .insert(legislative_briefs)
        .values(brief)
        .returning();

      expect(insertedBrief.bill_id).toBe(bill.id);
      expect(insertedBrief.key_claims).toHaveLength(3);
      expect(insertedBrief.delivery_status).toBe('delivered');
      expect(insertedBrief.responses_received).toBe(2);
      expect(insertedBrief.constitutional_implications).toBeDefined();
      expect(insertedBrief.stakeholder_positions).toBeDefined();
    });

    it('should track brief delivery and responses', async () => {
      const testUser = generateTestData.user({ role: 'organizer' });
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const brief = {
        bill_id: bill.id,
        brief_title: 'Citizen Engagement Brief',
        brief_summary: 'Summary of citizen input',
        key_claims: [],
        delivery_status: 'draft',
        generated_by: user.id
      };
      const [insertedBrief] = await testDb.insert(legislative_briefs).values(brief).returning();

      // Update delivery status
      const [updatedBrief] = await testDb
        .update(legislative_briefs)
        .set({
          delivery_status: 'delivered',
          delivery_method: 'hand_delivery',
          delivery_date: new Date(),
          delivered_to: ['committee_chair@parliament.go.ke'],
          responses_received: 1,
          response_summary: 'Committee chair thanked us for the comprehensive brief'
        })
        .where(eq(legislative_briefs.id, insertedBrief.id))
        .returning();

      expect(updatedBrief.delivery_status).toBe('delivered');
      expect(updatedBrief.delivery_method).toBe('hand_delivery');
      expect(updatedBrief.responses_received).toBe(1);
      expect(updatedBrief.response_summary).toBeDefined();
    });
  });

  describe('Synthesis Jobs', () => {
    it('should track argument synthesis processing jobs', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const job = {
        bill_id: bill.id,
        job_type: 'argument_extraction',
        status: 'queued',
        input_count: 150, // 150 comments to process
        progress_percent: 0
      };

      const [insertedJob] = await testDb
        .insert(synthesis_jobs)
        .values(job)
        .returning();

      expect(insertedJob.bill_id).toBe(bill.id);
      expect(insertedJob.job_type).toBe('argument_extraction');
      expect(insertedJob.status).toBe('queued');
      expect(insertedJob.input_count).toBe(150);
    });

    it('should handle job processing lifecycle', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const job = {
        bill_id: bill.id,
        job_type: 'claim_clustering',
        status: 'queued',
        input_count: 200,
        progress_percent: 0
      };
      const [insertedJob] = await testDb.insert(synthesis_jobs).values(job).returning();

      // Start processing
      await testDb
        .update(synthesis_jobs)
        .set({
          status: 'processing',
          started_at: new Date(),
          progress_percent: 25,
          processing_node: 'worker-node-1'
        })
        .where(eq(synthesis_jobs.id, insertedJob.id));

      // Update progress
      await testDb
        .update(synthesis_jobs)
        .set({
          progress_percent: 75
        })
        .where(eq(synthesis_jobs.id, insertedJob.id));

      // Complete job
      const [completedJob] = await testDb
        .update(synthesis_jobs)
        .set({
          status: 'completed',
          completed_at: new Date(),
          progress_percent: 100,
          output_count: 45, // 45 claims extracted from 200 comments
          duration_seconds: 180
        })
        .where(eq(synthesis_jobs.id, insertedJob.id))
        .returning();

      expect(completedJob.status).toBe('completed');
      expect(completedJob.progress_percent).toBe(100);
      expect(completedJob.output_count).toBe(45);
      expect(completedJob.duration_seconds).toBe(180);
      expect(completedJob.started_at).toBeDefined();
      expect(completedJob.completed_at).toBeDefined();
    });

    it('should handle job failures and retries', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const job = {
        bill_id: bill.id,
        job_type: 'evidence_verification',
        status: 'processing',
        input_count: 50,
        started_at: new Date(),
        processing_node: 'worker-node-2'
      };
      const [insertedJob] = await testDb.insert(synthesis_jobs).values(job).returning();

      // Simulate failure
      const [failedJob] = await testDb
        .update(synthesis_jobs)
        .set({
          status: 'failed',
          error_message: 'Connection timeout to external fact-checking API',
          retry_count: 1
        })
        .where(eq(synthesis_jobs.id, insertedJob.id))
        .returning();

      expect(failedJob.status).toBe('failed');
      expect(failedJob.error_message).toBeDefined();
      expect(failedJob.retry_count).toBe(1);

      // Retry job
      const [retriedJob] = await testDb
        .update(synthesis_jobs)
        .set({
          status: 'queued',
          error_message: null,
          retry_count: 2
        })
        .where(eq(synthesis_jobs.id, insertedJob.id))
        .returning();

      expect(retriedJob.status).toBe('queued');
      expect(retriedJob.error_message).toBeNull();
      expect(retriedJob.retry_count).toBe(2);
    });
  });

  describe('Cross-Table Integration Tests', () => {
    it('should handle complete argument synthesis workflow', async () => {
      // Step 1: Create bill and user
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill({ title: 'Healthcare Access Bill 2024' });
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Step 2: Create multiple comments
      const commentsData = Array.from({ length: 5 }, (_, i) => 
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          comment_text: `Comment ${i + 1} about healthcare access, funding, and implementation`
        })
      );
      const insertedComments = await testDb.insert(comments).values(commentsData).returning();

      // Step 3: Extract arguments from comments
      const argumentsData = [
        {
          comment_id: insertedComments[0].id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'support',
          extracted_text: 'Healthcare access will improve with this bill',
          extraction_confidence: 0.9
        },
        {
          comment_id: insertedComments[1].id,
          bill_id: bill.id,
          argument_type: 'evidence',
          position: 'support',
          extracted_text: 'Rural areas currently have only 45% healthcare coverage',
          extraction_confidence: 0.85
        },
        {
          comment_id: insertedComments[2].id,
          bill_id: bill.id,
          argument_type: 'claim',
          position: 'oppose',
          extracted_text: 'Tax increases will burden middle-class families',
          extraction_confidence: 0.88
        }
      ];
      const [arg1, arg2, arg3] = await testDb.insert(arguments).values(argumentsData).returning();

      // Step 4: Create argument relationships
      const relationships = [
        {
          source_argument_id: arg2.id,
          target_argument_id: arg1.id,
          relationship_type: 'supports',
          relationship_strength: 0.9,
          bill_id: bill.id
        }
      ];
      await testDb.insert(argument_relationships).values(relationships);

      // Step 5: Create claims from argument clusters
      const claimsData = [
        {
          bill_id: bill.id,
          claim_text: 'This bill will significantly improve healthcare access in underserved areas',
          position: 'support',
          argument_cluster_size: 2,
          source_arguments: [arg1.id, arg2.id],
          importance_score: 8.5
        },
        {
          bill_id: bill.id,
          claim_text: 'The funding mechanism through tax increases may create financial hardship',
          position: 'oppose',
          argument_cluster_size: 1,
          source_arguments: [arg3.id],
          importance_score: 7.2
        }
      ];
      const [claim1, claim2] = await testDb.insert(claims).values(claimsData).returning();

      // Step 6: Link arguments to claims
      await testDb
        .update(arguments)
        .set({ claim_id: claim1.id })
        .where(inArray(arguments.id, [arg1.id, arg2.id]));
      
      await testDb
        .update(arguments)
        .set({ claim_id: claim2.id })
        .where(eq(arguments.id, arg3.id));

      // Step 7: Add supporting evidence
      const evidenceData = {
        evidence_type: 'government_data',
        evidence_text: 'Ministry of Health reports 55% of rural areas lack adequate healthcare facilities',
        source_organization: 'Ministry of Health, Kenya',
        source_credibility: 'high',
        peer_reviewed: false,
        verification_status: 'verified',
        supporting_claims: [claim1.id]
      };
      await testDb.insert(evidence).values(evidenceData);

      // Step 8: Generate legislative brief
      const brief = {
        bill_id: bill.id,
        brief_title: 'Citizen Perspective Brief: Healthcare Access Bill 2024',
        brief_summary: 'Synthesis of 5 citizen comments revealing key arguments for and against the bill',
        key_claims: [claim1.id, claim2.id],
        constituent_participation: {
          total_comments: 5,
          total_arguments: 3,
          engagement_rate: 0.85
        },
        delivery_status: 'draft',
        generated_by: user.id
      };
      const [insertedBrief] = await testDb.insert(legislative_briefs).values(brief).returning();

      // Step 9: Track synthesis job
      const job = {
        bill_id: bill.id,
        job_type: 'argument_extraction',
        status: 'completed',
        input_count: 5,
        output_count: 3,
        duration_seconds: 45
      };
      await testDb.insert(synthesis_jobs).values(job);

      // Verify complete workflow
      const argumentAnalysis = await testDb
        .select({
          bill: bills,
          arguments: count(arguments.id),
          claims: count(claims.id),
          relationships: count(argument_relationships.id),
          evidence: count(evidence.id),
          brief: legislative_briefs
        })
        .from(bills)
        .leftJoin(arguments, eq(bills.id, arguments.bill_id))
        .leftJoin(claims, eq(bills.id, claims.bill_id))
        .leftJoin(argument_relationships, eq(bills.id, argument_relationships.bill_id))
        .leftJoin(evidence, eq(bills.id, evidence.id))
        .leftJoin(legislative_briefs, eq(bills.id, legislative_briefs.bill_id))
        .where(eq(bills.id, bill.id))
        .groupBy(bills.id, legislative_briefs.id);

      expect(argumentAnalysis).toHaveLength(1);
      expect(argumentAnalysis[0].arguments).toBe('3');
      expect(argumentAnalysis[0].claims).toBe('2');
      expect(argumentAnalysis[0].relationships).toBe('1');
      expect(argumentAnalysis[0].evidence).toBe('1');
      expect(argumentAnalysis[0].brief).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume argument extraction efficiently', async () => {
      const testUser = generateTestData.user();
      const testBill = generateTestData.bill();
      
      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Create 100 comments
      const commentsData = Array.from({ length: 100 }, (_, i) => 
        generateTestData.comment({
          bill_id: bill.id,
          user_id: user.id,
          comment_text: `Comment ${i + 1} about healthcare policy with multiple arguments and supporting evidence`
        })
      );
      await testDb.insert(comments).values(commentsData);

      // Extract 300 arguments from comments
      const argumentsData = Array.from({ length: 300 }, (_, i) => ({
        comment_id: commentsData[Math.floor(i / 3)].id, // 3 arguments per comment
        bill_id: bill.id,
        argument_type: i % 3 === 0 ? 'claim' : i % 3 === 1 ? 'evidence' : 'reasoning',
        position: i % 2 === 0 ? 'support' : 'oppose',
        extracted_text: `Argument ${i + 1} extracted from comment`,
        extraction_confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        extraction_method: 'ml_model_batch'
      }));

      const startTime = Date.now();
      await testDb.insert(arguments).values(argumentsData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(5000); // Should insert 300 arguments quickly

      // Query argument statistics
      const argumentStats = await testDb
        .select({
          position: arguments.position,
          type: arguments.argument_type,
          count: count(arguments.id),
          avg_confidence: avg(arguments.extraction_confidence)
        })
        .from(arguments)
        .where(eq(arguments.bill_id, bill.id))
        .groupBy(arguments.position, arguments.argument_type);

      expect(argumentStats.length).toBeGreaterThan(0);
    });

    it('should efficiently cluster similar claims', async () => {
      const testBill = generateTestData.bill();
      const [sponsor] = await testDb.insert(sponsors).values(generateTestData.sponsor()).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Create 50 similar claims that should be clustered
      const claimsData = Array.from({ length: 50 }, (_, i) => ({
        bill_id: bill.id,
        claim_text: `Healthcare access improvement claim ${i + 1}`,
        position: 'support',
        argument_cluster_size: Math.floor(Math.random() * 10) + 1,
        expressing_users_count: Math.floor(Math.random() * 100) + 1,
        importance_score: Math.random() * 10,
        novelty_score: Math.random()
      }));

      const startTime = Date.now();
      await testDb.insert(claims).values(claimsData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(3000);

      // Query top importance claims
      const topClaims = await testDb
        .select()
        .from(claims)
        .where(eq(claims.bill_id, bill.id))
        .orderBy(claims.importance_score)
        .limit(10);

      expect(topClaims).toHaveLength(10);
      expect(topClaims[0].importance_score).toBeLessThanOrEqual(topClaims[9].importance_score);
    });
  });
});


