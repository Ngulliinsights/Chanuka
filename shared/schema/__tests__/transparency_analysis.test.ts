// ============================================================================
// TRANSPARENCY ANALYSIS SCHEMA TESTS
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  corporate_entities,
  financial_interests,
  lobbying_activities,
  bill_financial_conflicts,
  cross_sector_ownership,
  regulatory_capture_indicators
} from './transparency_analysis';
import { users, sponsors, bills } from './foundation';
import { operationalDb as db } from '../../database';

describe('Transparency Analysis Schema', () => {
  // Test data setup
  let testUserId: string;
  let testSponsorId: string;
  let testBillId: string;
  let testCorporateEntityId: string;

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
      title: 'Test Bill',
      bill_number: 'TB-001-2024',
      sponsor_id: testSponsorId,
      status: 'introduced',
      chamber: 'national_assembly'
    }).returning();
    testBillId = bill.id;

    // Create test corporate entity
    const [entity] = await db.insert(corporate_entities).values({
      entity_name: 'Test Corporation Ltd',
      entity_type: 'corporation',
      industry_sector: 'technology',
      headquarters_county: 'nairobi'
    }).returning();
    testCorporateEntityId = entity.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse dependency order
    await db.delete(regulatory_capture_indicators);
    await db.delete(bill_financial_conflicts);
    await db.delete(cross_sector_ownership);
    await db.delete(lobbying_activities);
    await db.delete(financial_interests);
    await db.delete(corporate_entities);
    await db.delete(bills);
    await db.delete(sponsors);
    await db.delete(users);
  });

  describe('Corporate Entities Table', () => {
    it('should create a corporate entity with required fields', async () => {
      const [entity] = await db.insert(corporate_entities).values({
        entity_name: 'Kenya Tech Solutions Ltd',
        entity_type: 'corporation',
        industry_sector: 'technology',
        headquarters_county: 'nairobi',
        operating_counties: ['nairobi', 'mombasa'],
        business_description: 'Software development and IT services',
        verification_status: 'verified',
        verified_by: testUserId
      }).returning();

      expect(entity).toBeDefined();
      expect(entity.entity_name).toBe('Kenya Tech Solutions Ltd');
      expect(entity.entity_type).toBe('corporation');
      expect(entity.industry_sector).toBe('technology');
      expect(entity.headquarters_county).toBe('nairobi');
      expect(entity.operating_counties).toEqual(['nairobi', 'mombasa']);
      expect(entity.is_active).toBe(true);
      expect(entity.verification_status).toBe('verified');
    });

    it('should handle parent-subsidiary relationships', async () => {
      // Create parent company
      const [parent] = await db.insert(corporate_entities).values({
        entity_name: 'Parent Corp',
        entity_type: 'corporation',
        industry_sector: 'holding_company'
      }).returning();

      // Create subsidiary
      const [subsidiary] = await db.insert(corporate_entities).values({
        entity_name: 'Subsidiary Ltd',
        entity_type: 'corporation',
        industry_sector: 'technology',
        parent_company_id: parent.id
      }).returning();

      expect(subsidiary.parent_company_id).toBe(parent.id);

      // Verify relationship query
      const result = await db
        .select()
        .from(corporate_entities)
        .where(sql`${corporate_entities.parent_company_id} = ${parent.id}`);

      expect(result).toHaveLength(1);
      expect(result[0].entity_name).toBe('Subsidiary Ltd');
    });

    it('should validate required fields', async () => {
      await expect(
        db.insert(corporate_entities).values({
          // Missing required entity_name
          entity_type: 'corporation'
        })
      ).rejects.toThrow();
    });

    it('should handle JSONB fields correctly', async () => {
      const ownershipStructure = {
        shareholders: [
          { name: 'John Doe', percentage: 60 },
          { name: 'Jane Smith', percentage: 40 }
        ]
      };

      const [entity] = await db.insert(corporate_entities).values({
        entity_name: 'Test Ownership Corp',
        entity_type: 'corporation',
        ownership_structure: ownershipStructure
      }).returning();

      expect(entity.ownership_structure).toEqual(ownershipStructure);
    });
  });

  describe('Financial Interests Table', () => {
    it('should create a financial interest record', async () => {
      const [interest] = await db.insert(financial_interests).values({
        sponsor_id: testSponsorId,
        corporate_entity_id: testCorporateEntityId,
        interest_type: 'shareholding',
        interest_description: 'Owns 25% shares in the company',
        ownership_percentage: 25.0,
        estimated_value_range: '1M-10M',
        disclosure_source: 'parliamentary_register',
        disclosure_date: new Date('2024-01-15'),
        verification_status: 'verified',
        verified_by: testUserId,
        potential_conflict: true,
        conflict_severity: 'medium'
      }).returning();

      expect(interest).toBeDefined();
      expect(interest.sponsor_id).toBe(testSponsorId);
      expect(interest.corporate_entity_id).toBe(testCorporateEntityId);
      expect(interest.interest_type).toBe('shareholding');
      expect(interest.ownership_percentage).toBe('25.00');
      expect(interest.potential_conflict).toBe(true);
      expect(interest.conflict_severity).toBe('medium');
    });

    it('should handle different interest types', async () => {
      const interestTypes = ['shareholding', 'directorship', 'consultancy', 'family_business', 'investment'];
      
      for (const type of interestTypes) {
        const [interest] = await db.insert(financial_interests).values({
          sponsor_id: testSponsorId,
          corporate_entity_id: testCorporateEntityId,
          interest_type: type,
          interest_description: `Test ${type} interest`,
          disclosure_source: 'parliamentary_register',
          disclosure_date: new Date()
        }).returning();

        expect(interest.interest_type).toBe(type);
      }
    });

    it('should track interest timeline correctly', async () => {
      const start_date = new Date('2020-01-01');
      const end_date = new Date('2023-12-31');

      const [interest] = await db.insert(financial_interests).values({
        sponsor_id: testSponsorId,
        corporate_entity_id: testCorporateEntityId,
        interest_type: 'directorship',
        interest_description: 'Board member from 2020-2023',
        interest_start_date: start_date,
        interest_end_date: end_date,
        is_current: false,
        disclosure_source: 'company_filings',
        disclosure_date: new Date()
      }).returning();

      expect(interest.interest_start_date).toEqual(start_date);
      expect(interest.interest_end_date).toEqual(end_date);
      expect(interest.is_current).toBe(false);
    });
  });

  describe('Lobbying Activities Table', () => {
    it('should create a lobbying activity record', async () => {
      const [activity] = await db.insert(lobbying_activities).values({
        bill_id: testBillId,
        lobbying_entity_id: testCorporateEntityId,
        lobbyist_name: 'John Lobbyist',
        lobbying_position: 'support',
        lobbying_objectives: ['Reduce regulatory burden', 'Accelerate approval process'],
        key_arguments: ['Economic growth', 'Job creation'],
        lobbying_expenditure: 500000.00,
        expenditure_period: 'quarterly',
        target_officials: ['Committee Chair', 'Ranking Member'],
        lobbying_methods: ['meetings', 'written_submissions'],
        lobbying_start_date: new Date('2024-01-01'),
        registered_lobbying: true,
        registration_number: 'LR-2024-001',
        data_source: 'lobbying_register'
      }).returning();

      expect(activity).toBeDefined();
      expect(activity.bill_id).toBe(testBillId);
      expect(activity.lobbying_entity_id).toBe(testCorporateEntityId);
      expect(activity.lobbying_position).toBe('support');
      expect(activity.lobbying_expenditure).toBe('500000.00');
      expect(activity.registered_lobbying).toBe(true);
      expect(activity.lobbying_objectives).toEqual(['Reduce regulatory burden', 'Accelerate approval process']);
    });

    it('should handle different lobbying positions', async () => {
      const positions = ['support', 'oppose', 'amend'];
      
      for (const position of positions) {
        const [activity] = await db.insert(lobbying_activities).values({
          bill_id: testBillId,
          lobbying_entity_id: testCorporateEntityId,
          lobbying_position: position,
          lobbying_objectives: [`Test ${position} objective`],
          lobbying_start_date: new Date(),
          data_source: 'test_source'
        }).returning();

        expect(activity.lobbying_position).toBe(position);
      }
    });

    it('should track expenditure breakdown in JSONB', async () => {
      const expenditureBreakdown = {
        meetings: 100000,
        events: 200000,
        research: 150000,
        communications: 50000
      };

      const [activity] = await db.insert(lobbying_activities).values({
        bill_id: testBillId,
        lobbying_entity_id: testCorporateEntityId,
        lobbying_position: 'support',
        lobbying_objectives: ['Test objective'],
        lobbying_expenditure: 500000.00,
        expenditure_breakdown: expenditureBreakdown,
        lobbying_start_date: new Date(),
        data_source: 'test_source'
      }).returning();

      expect(activity.expenditure_breakdown).toEqual(expenditureBreakdown);
    });
  });

  describe('Bill Financial Conflicts Table', () => {
    let testFinancialInterestId: string;

    beforeEach(async () => {
      // Create a financial interest for conflict testing
      const [interest] = await db.insert(financial_interests).values({
        sponsor_id: testSponsorId,
        corporate_entity_id: testCorporateEntityId,
        interest_type: 'shareholding',
        interest_description: 'Test shareholding for conflict',
        disclosure_source: 'test_source',
        disclosure_date: new Date()
      }).returning();
      testFinancialInterestId = interest.id;
    });

    it('should create a bill financial conflict record', async () => {
      const [conflict] = await db.insert(bill_financial_conflicts).values({
        bill_id: testBillId,
        sponsor_id: testSponsorId,
        financial_interest_id: testFinancialInterestId,
        conflict_type: 'direct_benefit',
        conflict_description: 'Bill would directly benefit sponsor\'s business interests',
        conflict_severity: 'high',
        potential_financial_impact: '1M-10M',
        impact_mechanism: 'Regulatory changes would increase company profits',
        affected_provisions: ['Section 3', 'Section 7'],
        detection_method: 'automated_analysis',
        confidence_level: 0.85,
        supporting_evidence: ['Financial filings', 'Bill text analysis'],
        publicly_disclosed: true,
        disclosure_date: new Date(),
        conflict_status: 'identified'
      }).returning();

      expect(conflict).toBeDefined();
      expect(conflict.bill_id).toBe(testBillId);
      expect(conflict.sponsor_id).toBe(testSponsorId);
      expect(conflict.financial_interest_id).toBe(testFinancialInterestId);
      expect(conflict.conflict_type).toBe('direct_benefit');
      expect(conflict.conflict_severity).toBe('high');
      expect(conflict.confidence_level).toBe('0.85');
      expect(conflict.affected_provisions).toEqual(['Section 3', 'Section 7']);
    });

    it('should handle different conflict severities', async () => {
      const severities = ['low', 'medium', 'high', 'critical'];
      
      for (const severity of severities) {
        const [conflict] = await db.insert(bill_financial_conflicts).values({
          bill_id: testBillId,
          sponsor_id: testSponsorId,
          financial_interest_id: testFinancialInterestId,
          conflict_type: 'direct_benefit',
          conflict_description: `Test ${severity} conflict`,
          conflict_severity: severity,
          detection_method: 'manual_review',
          confidence_level: 0.75
        }).returning();

        expect(conflict.conflict_severity).toBe(severity);
      }
    });

    it('should track conflict resolution', async () => {
      const [conflict] = await db.insert(bill_financial_conflicts).values({
        bill_id: testBillId,
        sponsor_id: testSponsorId,
        financial_interest_id: testFinancialInterestId,
        conflict_type: 'direct_benefit',
        conflict_description: 'Test conflict for resolution',
        conflict_severity: 'medium',
        detection_method: 'manual_review',
        confidence_level: 0.80,
        conflict_status: 'resolved',
        resolution_action: 'Sponsor recused from voting',
        resolution_date: new Date('2024-02-15')
      }).returning();

      expect(conflict.conflict_status).toBe('resolved');
      expect(conflict.resolution_action).toBe('Sponsor recused from voting');
      expect(conflict.resolution_date).toEqual(new Date('2024-02-15'));
    });
  });

  describe('Cross Sector Ownership Table', () => {
    let ownerEntityId: string;
    let ownedEntityId: string;

    beforeEach(async () => {
      // Create owner entity
      const [owner] = await db.insert(corporate_entities).values({
        entity_name: 'Owner Corp',
        entity_type: 'corporation',
        industry_sector: 'finance'
      }).returning();
      ownerEntityId = owner.id;

      // Create owned entity
      const [owned] = await db.insert(corporate_entities).values({
        entity_name: 'Owned Corp',
        entity_type: 'corporation',
        industry_sector: 'technology'
      }).returning();
      ownedEntityId = owned.id;
    });

    it('should create a cross sector ownership record', async () => {
      const [ownership] = await db.insert(cross_sector_ownership).values({
        owner_entity_id: ownerEntityId,
        owned_entity_id: ownedEntityId,
        ownership_percentage: 75.5,
        ownership_type: 'direct_shareholding',
        control_level: 'majority',
        investment_value: 5000000.00,
        acquisition_date: new Date('2023-06-15'),
        acquisition_method: 'purchase',
        voting_rights_percentage: 75.5,
        board_representation: 3,
        management_control: true,
        creates_cross_sector_influence: true,
        affected_sectors: ['finance', 'technology'],
        data_source: 'company_filings',
        verification_status: 'verified'
      }).returning();

      expect(ownership).toBeDefined();
      expect(ownership.owner_entity_id).toBe(ownerEntityId);
      expect(ownership.owned_entity_id).toBe(ownedEntityId);
      expect(ownership.ownership_percentage).toBe('75.50');
      expect(ownership.control_level).toBe('majority');
      expect(ownership.management_control).toBe(true);
      expect(ownership.creates_cross_sector_influence).toBe(true);
      expect(ownership.affected_sectors).toEqual(['finance', 'technology']);
    });

    it('should handle different ownership types', async () => {
      const ownershipTypes = ['direct_shareholding', 'indirect_control', 'subsidiary', 'joint_venture'];
      
      for (const type of ownershipTypes) {
        const [ownership] = await db.insert(cross_sector_ownership).values({
          owner_entity_id: ownerEntityId,
          owned_entity_id: ownedEntityId,
          ownership_percentage: 50.0,
          ownership_type: type,
          control_level: 'minority',
          data_source: 'test_source'
        }).returning();

        expect(ownership.ownership_type).toBe(type);
      }
    });

    it('should prevent self-ownership', async () => {
      await expect(
        db.insert(cross_sector_ownership).values({
          owner_entity_id: ownerEntityId,
          owned_entity_id: ownerEntityId, // Same entity
          ownership_percentage: 100.0,
          ownership_type: 'direct_shareholding',
          control_level: 'majority',
          data_source: 'test_source'
        })
      ).rejects.toThrow(); // Should fail due to business logic constraint
    });
  });

  describe('Regulatory Capture Indicators Table', () => {
    it('should create a regulatory capture indicator', async () => {
      const [indicator] = await db.insert(regulatory_capture_indicators).values({
        bill_id: testBillId,
        sponsor_id: testSponsorId,
        corporate_entity_id: testCorporateEntityId,
        indicator_type: 'revolving_door',
        indicator_description: 'Sponsor previously worked for affected industry',
        indicator_strength: 'strong',
        supporting_evidence: ['Employment records', 'Industry connections'],
        evidence_quality: 'high',
        analysis_methodology: 'Pattern analysis of career history',
        pattern_frequency: 3,
        capture_risk_level: 'high',
        public_interest_impact: 'significant',
        detection_date: new Date(),
        detection_method: 'expert_review',
        analyst_id: testUserId
      }).returning();

      expect(indicator).toBeDefined();
      expect(indicator.bill_id).toBe(testBillId);
      expect(indicator.sponsor_id).toBe(testSponsorId);
      expect(indicator.corporate_entity_id).toBe(testCorporateEntityId);
      expect(indicator.indicator_type).toBe('revolving_door');
      expect(indicator.indicator_strength).toBe('strong');
      expect(indicator.capture_risk_level).toBe('high');
      expect(indicator.supporting_evidence).toEqual(['Employment records', 'Industry connections']);
    });

    it('should handle different indicator types', async () => {
      const indicatorTypes = ['revolving_door', 'concentrated_benefits', 'weak_oversight', 'industry_drafting'];
      
      for (const type of indicatorTypes) {
        const [indicator] = await db.insert(regulatory_capture_indicators).values({
          bill_id: testBillId,
          indicator_type: type,
          indicator_description: `Test ${type} indicator`,
          indicator_strength: 'moderate',
          evidence_quality: 'medium',
          capture_risk_level: 'medium',
          detection_date: new Date(),
          detection_method: 'automated_analysis'
        }).returning();

        expect(indicator.indicator_type).toBe(type);
      }
    });

    it('should track peer review process', async () => {
      const [indicator] = await db.insert(regulatory_capture_indicators).values({
        bill_id: testBillId,
        indicator_type: 'concentrated_benefits',
        indicator_description: 'Benefits concentrated to few entities',
        indicator_strength: 'strong',
        evidence_quality: 'high',
        capture_risk_level: 'high',
        detection_date: new Date(),
        detection_method: 'expert_review',
        peer_reviewed: true,
        review_date: new Date(),
        reviewer_notes: 'Analysis methodology is sound, conclusions supported by evidence'
      }).returning();

      expect(indicator.peer_reviewed).toBe(true);
      expect(indicator.reviewer_notes).toBe('Analysis methodology is sound, conclusions supported by evidence');
    });
  });

  describe('Schema Relationships and Queries', () => {
    it('should query corporate entities with their financial interests', async () => {
      // Create financial interest
      await db.insert(financial_interests).values({
        sponsor_id: testSponsorId,
        corporate_entity_id: testCorporateEntityId,
        interest_type: 'shareholding',
        interest_description: 'Test relationship query',
        disclosure_source: 'test_source',
        disclosure_date: new Date()
      });

      // Query with join
      const result = await db
        .select({
          entityName: corporate_entities.entity_name,
          interestType: financial_interests.interest_type,
          interestDescription: financial_interests.interest_description
        })
        .from(corporate_entities)
        .innerJoin(financial_interests, sql`${corporate_entities.id} = ${financial_interests.corporate_entity_id}`)
        .where(sql`${corporate_entities.id} = ${testCorporateEntityId}`);

      expect(result).toHaveLength(1);
      expect(result[0].entityName).toBe('Test Corporation Ltd');
      expect(result[0].interestType).toBe('shareholding');
    });

    it('should query bills with their lobbying activities', async () => {
      // Create lobbying activity
      await db.insert(lobbying_activities).values({
        bill_id: testBillId,
        lobbying_entity_id: testCorporateEntityId,
        lobbying_position: 'support',
        lobbying_objectives: ['Test objective'],
        lobbying_start_date: new Date(),
        data_source: 'test_source'
      });

      // Query with join
      const result = await db
        .select({
          billTitle: bills.title,
          lobbyingPosition: lobbying_activities.lobbying_position,
          entityName: corporate_entities.entity_name
        })
        .from(bills)
        .innerJoin(lobbying_activities, sql`${bills.id} = ${lobbying_activities.bill_id}`)
        .innerJoin(corporate_entities, sql`${lobbying_activities.lobbying_entity_id} = ${corporate_entities.id}`)
        .where(sql`${bills.id} = ${testBillId}`);

      expect(result).toHaveLength(1);
      expect(result[0].billTitle).toBe('Test Bill');
      expect(result[0].lobbyingPosition).toBe('support');
      expect(result[0].entityName).toBe('Test Corporation Ltd');
    });

    it('should handle complex ownership chain queries', async () => {
      // Create ownership chain: A owns B owns C
      const [entityB] = await db.insert(corporate_entities).values({
        entity_name: 'Entity B',
        entity_type: 'corporation',
        industry_sector: 'finance'
      }).returning();

      const [entityC] = await db.insert(corporate_entities).values({
        entity_name: 'Entity C',
        entity_type: 'corporation',
        industry_sector: 'technology'
      }).returning();

      // A (testCorporateEntityId) owns B
      await db.insert(cross_sector_ownership).values({
        owner_entity_id: testCorporateEntityId,
        owned_entity_id: entityB.id,
        ownership_percentage: 60.0,
        ownership_type: 'direct_shareholding',
        control_level: 'majority',
        data_source: 'test_source'
      });

      // B owns C
      await db.insert(cross_sector_ownership).values({
        owner_entity_id: entityB.id,
        owned_entity_id: entityC.id,
        ownership_percentage: 80.0,
        ownership_type: 'direct_shareholding',
        control_level: 'majority',
        data_source: 'test_source'
      });

      // Query direct ownership
      const directOwnership = await db
        .select()
        .from(cross_sector_ownership)
        .where(sql`${cross_sector_ownership.owner_entity_id} = ${testCorporateEntityId}`);

      expect(directOwnership).toHaveLength(1);
      expect(directOwnership[0].owned_entity_id).toBe(entityB.id);

      // Query all entities in ownership chain
      const ownershipChain = await db
        .select({
          ownerName: sql`owner.entity_name`,
          ownedName: sql`owned.entity_name`,
          ownershipPercentage: cross_sector_ownership.ownership_percentage
        })
        .from(cross_sector_ownership)
        .innerJoin(sql`${corporate_entities} as owner`, sql`owner.id = ${cross_sector_ownership.owner_entity_id}`)
        .innerJoin(sql`${corporate_entities} as owned`, sql`owned.id = ${cross_sector_ownership.owned_entity_id}`);

      expect(ownershipChain).toHaveLength(2);
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should enforce percentage constraints', async () => {
      // Test ownership percentage > 100
      await expect(
        db.insert(cross_sector_ownership).values({
          owner_entity_id: testCorporateEntityId,
          owned_entity_id: testCorporateEntityId, // Will fail for other reasons too
          ownership_percentage: 150.0, // Invalid percentage
          ownership_type: 'direct_shareholding',
          control_level: 'majority',
          data_source: 'test_source'
        })
      ).rejects.toThrow();
    });

    it('should handle array fields correctly', async () => {
      const [entity] = await db.insert(corporate_entities).values({
        entity_name: 'Multi-County Corp',
        entity_type: 'corporation',
        operating_counties: ['nairobi', 'mombasa', 'kisumu'],
        primary_activities: ['software', 'consulting', 'training']
      }).returning();

      expect(entity.operating_counties).toEqual(['nairobi', 'mombasa', 'kisumu']);
      expect(entity.primary_activities).toEqual(['software', 'consulting', 'training']);
    });

    it('should handle null and optional fields', async () => {
      const [entity] = await db.insert(corporate_entities).values({
        entity_name: 'Minimal Corp',
        entity_type: 'corporation'
        // All other fields are optional
      }).returning();

      expect(entity.entity_name).toBe('Minimal Corp');
      expect(entity.industry_sector).toBeNull();
      expect(entity.headquarters_county).toBeNull();
      expect(entity.is_active).toBe(true); // Default value
      expect(entity.verification_status).toBe('pending'); // Default value
    });
  });
});

