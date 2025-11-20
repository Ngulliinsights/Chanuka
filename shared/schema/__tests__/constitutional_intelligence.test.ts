// ============================================================================
// CONSTITUTIONAL INTELLIGENCE SCHEMA TESTS
// ============================================================================
// Tests for constitutional analysis and legal framework infrastructure

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import { 
  constitutional_provisions,
  constitutional_analyses,
  legal_precedents,
  expert_review_queue,
  analysis_audit_trail
} from '../schema/constitutional_intelligence';
import { bills } from '../schema/foundation';
import { users } from '../schema/foundation';
import { eq, and, or, sql, count } from 'drizzle-orm';

describe('Constitutional Intelligence Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('constitutional_intelligence');
  });

  describe('Constitutional Provisions', () => {
    it('should create hierarchical constitutional provisions', async () => {
      // Create parent provision (Chapter)
      const chapterProvision = {
        chapter_number: 4,
        chapter_title: 'The Bill of Rights',
        article_number: 0,
        article_title: 'Chapter 4 - The Bill of Rights',
        provision_text: 'This Chapter sets out the fundamental rights and freedoms of the individual',
        hierarchy_path: '4',
        rights_category: 'bill_of_rights',
        keywords: ['bill of rights', 'fundamental rights', 'freedoms']
      };

      const [chapter] = await testDb
        .insert(constitutional_provisions)
        .values(chapterProvision)
        .returning();

      // Create child provision (Article)
      const articleProvision = {
        parent_provision_id: chapter.id,
        chapter_number: 4,
        chapter_title: 'The Bill of Rights',
        article_number: 43,
        article_title: 'Economic and social rights',
        section_number: '1',
        provision_text: 'Every person has the right to the highest attainable standard of health...',
        hierarchy_path: '4.43.1',
        rights_category: 'bill_of_rights',
        keywords: ['health', 'rights', 'citizens'],
        related_provisions: [chapter.id]
      };

      const [article] = await testDb
        .insert(constitutional_provisions)
        .values(articleProvision)
        .returning();

      expect(article.parent_provision_id).toBe(chapter.id);
      expect(article.hierarchy_path).toBe('4.43.1');
      expect(article.related_provisions).toContain(chapter.id);
    });

    it('should query provisions by rights category', async () => {
      const provisionsData = [
        generateTestData.constitutionalProvision({
          article_number: 43,
          rights_category: 'bill_of_rights',
          keywords: ['health', 'rights']
        }),
        generateTestData.constitutionalProvision({
          article_number: 27,
          rights_category: 'bill_of_rights',
          keywords: ['privacy', 'rights']
        }),
        generateTestData.constitutionalProvision({
          article_number: 201,
          rights_category: 'devolution',
          keywords: ['counties', 'governance']
        })
      ];

      await testDb.insert(constitutional_provisions).values(provisionsData);

      const billOfRightsProvisions = await testDb
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.rights_category, 'bill_of_rights'));

      expect(billOfRightsProvisions).toHaveLength(2);
      expect(billOfRightsProvisions.every(p => p.rights_category === 'bill_of_rights')).toBe(true);
    });

    it('should search provisions by keywords', async () => {
      const provisionsData = [
        generateTestData.constitutionalProvision({
          article_number: 43,
          keywords: ['health', 'rights', 'citizens']
        }),
        generateTestData.constitutionalProvision({
          article_number: 42,
          keywords: ['education', 'rights', 'children']
        }),
        generateTestData.constitutionalProvision({
          article_number: 40,
          keywords: ['economic', 'rights', 'workers']
        })
      ];

      await testDb.insert(constitutional_provisions).values(provisionsData);

      const healthProvisions = await testDb
        .select()
        .from(constitutional_provisions)
        .where(sql`${constitutional_provisions.keywords} @> ARRAY['health']::text[]`);

      expect(healthProvisions).toHaveLength(1);
      expect(healthProvisions[0].keywords).toContain('health');
    });
  });

  describe('Constitutional Analyses', () => {
    it('should create constitutional analysis for bills', async () => {
      // Create test data
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 43,
        provision_text: 'Every person has the right to the highest attainable standard of health'
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      // Create constitutional analysis
      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'potential_conflict',
        confidence_level: 0.85,
        analysis_text: 'This bill may conflict with Article 43 by limiting access to healthcare services',
        reasoning_chain: {
          step1: 'Bill proposes user fees for public hospitals',
          step2: 'Article 43 guarantees right to highest attainable standard of health',
          step3: 'User fees may limit access for low-income citizens',
          conclusion: 'Potential conflict with constitutional right'
        },
        constitutional_risk: 'high',
        risk_explanation: 'The bill could be challenged in court for violating constitutional rights',
        analysis_method: 'rule_based_v1',
        analysis_version: '1.0.0'
      };

      const [insertedAnalysis] = await testDb
        .insert(constitutional_analyses)
        .values(analysis)
        .returning();

      expect(insertedAnalysis.bill_id).toBe(bill.id);
      expect(insertedAnalysis.provision_id).toBe(insertedProvision.id);
      expect(insertedAnalysis.confidence_level).toBe(0.85);
      expect(insertedAnalysis.constitutional_risk).toBe('high');
      expect(insertedAnalysis.analysis_method).toBe('rule_based_v1');
    });

    it('should handle expert review requirements', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 24,
        provision_text: 'Right to freedom of expression'
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'requires_compliance',
        confidence_level: 0.45, // Low confidence triggers expert review
        analysis_text: 'Complex analysis requiring expert review',
        constitutional_risk: 'medium',
        requires_expert_review: true,
        expert_reviewed: false
      };

      const [insertedAnalysis] = await testDb
        .insert(constitutional_analyses)
        .values(analysis)
        .returning();

      expect(insertedAnalysis.requires_expert_review).toBe(true);
      expect(insertedAnalysis.expert_reviewed).toBe(false);
    });

    it('should complete expert review process', async () => {
      const testUser = generateTestData.user({ role: 'expert' });
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 27,
        provision_text: 'Right to privacy'
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      // Create analysis requiring expert review
      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'potential_conflict',
        confidence_level: 0.55,
        constitutional_risk: 'high',
        requires_expert_review: true,
        expert_reviewed: false
      };
      const [insertedAnalysis] = await testDb.insert(constitutional_analyses).values(analysis).returning();

      // Complete expert review
      const [updatedAnalysis] = await testDb
        .update(constitutional_analyses)
        .set({
          expert_reviewed: true,
          expert_review_date: new Date(),
          expert_notes: 'Expert agrees with analysis. Bill should be amended to protect privacy rights.',
          constitutional_risk: 'medium' // Risk reduced after expert input
        })
        .where(eq(constitutional_analyses.id, insertedAnalysis.id))
        .returning();

      expect(updatedAnalysis.expert_reviewed).toBe(true);
      expect(updatedAnalysis.expert_review_date).toBeDefined();
      expect(updatedAnalysis.expert_notes).toBeDefined();
      expect(updatedAnalysis.constitutional_risk).toBe('medium');
    });

    it('should query analyses by risk level', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill1 = generateTestData.bill({ title: 'Bill 1' });
      const testBill2 = generateTestData.bill({ title: 'Bill 2' });

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill1] = await testDb.insert(bills).values({...testBill1, sponsor_id: sponsor.id}).returning();
      const [bill2] = await testDb.insert(bills).values({...testBill2, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 43
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysesData = [
        {
          bill_id: bill1.id,
          provision_id: insertedProvision.id,
          analysis_type: 'potential_conflict',
          constitutional_risk: 'high',
          confidence_level: 0.9
        },
        {
          bill_id: bill2.id,
          provision_id: insertedProvision.id,
          analysis_type: 'requires_compliance',
          constitutional_risk: 'low',
          confidence_level: 0.8
        }
      ];

      await testDb.insert(constitutional_analyses).values(analysesData);

      const highRiskAnalyses = await testDb
        .select()
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.constitutional_risk, 'high'));

      expect(highRiskAnalyses).toHaveLength(1);
      expect(highRiskAnalyses[0].constitutional_risk).toBe('high');
    });
  });

  describe('Legal Precedents', () => {
    it('should create legal precedents with case details', async () => {
      const precedent = {
        case_name: 'Republic v. Communication Commission of Kenya & 5 others',
        case_citation: '[2024] eKLR',
        case_number: 'Petition 123 of 2024',
        court_level: 'high',
        judgment_date: new Date('2024-01-15'),
        case_summary: 'Constitutional challenge to regulations limiting media freedom',
        holding: 'Regulations violated Article 33 (freedom of expression) and were unconstitutional',
        reasoning: 'The court applied the proportionality test and found the restrictions excessive',
        interpretive_approach: 'purposive',
        judgment_url: 'https://kenyalaw.org/caselaw/cases/view/123456',
        full_text: 'Full text of the judgment...',
        relevance_score: 0.95
      };

      const [insertedPrecedent] = await testDb
        .insert(legal_precedents)
        .values(precedent)
        .returning();

      expect(insertedPrecedent.case_name).toBe(precedent.case_name);
      expect(insertedPrecedent.court_level).toBe('high');
      expect(insertedPrecedent.relevance_score).toBe(0.95);
      expect(insertedPrecedent.interpretive_approach).toBe('purposive');
    });

    it('should link precedents to constitutional provisions', async () => {
      const provision1 = generateTestData.constitutionalProvision({
        article_number: 33,
        provision_text: 'Freedom of expression'
      });
      const provision2 = generateTestData.constitutionalProvision({
        article_number: 34,
        provision_text: 'Freedom of the media'
      });

      const [insertedProvision1] = await testDb.insert(constitutional_provisions).values(provision1).returning();
      const [insertedProvision2] = await testDb.insert(constitutional_provisions).values(provision2).returning();

      const precedent = {
        case_name: 'Media Freedom Case',
        case_citation: '[2024] eKLR',
        court_level: 'supreme',
        judgment_date: new Date(),
        constitutional_provisions: [insertedProvision1.id, insertedProvision2.id],
        case_summary: 'Media freedom case',
        holding: 'Media freedom protected',
        relevance_score: 0.9
      };

      const [insertedPrecedent] = await testDb
        .insert(legal_precedents)
        .values(precedent)
        .returning();

      expect(insertedPrecedent.constitutional_provisions).toHaveLength(2);
      expect(insertedPrecedent.constitutional_provisions).toContain(insertedProvision1.id);
      expect(insertedPrecedent.constitutional_provisions).toContain(insertedProvision2.id);
    });

    it('should query precedents by court level and relevance', async () => {
      const precedentsData = [
        {
          case_name: 'Supreme Court Case 1',
          case_citation: '[2024] eKLR 1',
          court_level: 'supreme',
          judgment_date: new Date(),
          relevance_score: 0.95,
          case_summary: 'High relevance supreme court case'
        },
        {
          case_name: 'High Court Case 1',
          case_citation: '[2024] eKLR 2',
          court_level: 'high',
          judgment_date: new Date(),
          relevance_score: 0.7,
          case_summary: 'Medium relevance high court case'
        },
        {
          case_name: 'Supreme Court Case 2',
          case_citation: '[2024] eKLR 3',
          court_level: 'supreme',
          judgment_date: new Date(),
          relevance_score: 0.85,
          case_summary: 'High relevance supreme court case'
        }
      ];

      await testDb.insert(legal_precedents).values(precedentsData);

      const supremeCourtPrecedents = await testDb
        .select()
        .from(legal_precedents)
        .where(and(
          eq(legal_precedents.court_level, 'supreme'),
          sql`${legal_precedents.relevance_score} > 0.8`
        ))
        .orderBy(legal_precedents.relevance_score);

      expect(supremeCourtPrecedents).toHaveLength(2);
      expect(supremeCourtPrecedents[0].relevance_score).toBe(0.85);
      expect(supremeCourtPrecedents[1].relevance_score).toBe(0.95);
    });
  });

  describe('Expert Review Queue', () => {
    it('should queue analyses for expert review', async () => {
      const testUser = generateTestData.user({ role: 'expert' });
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 40
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'complex_analysis',
        constitutional_risk: 'high',
        requires_expert_review: true
      };
      const [insertedAnalysis] = await testDb.insert(constitutional_analyses).values(analysis).returning();

      // Add to expert review queue
      const reviewQueueItem = {
        analysis_id: insertedAnalysis.id,
        bill_id: bill.id,
        priority: 8,
        complexity_score: 0.9,
        uncertainty_flags: ['complex_interpretation', 'limited_precedent'],
        status: 'pending'
      };

      const [queueItem] = await testDb
        .insert(expert_review_queue)
        .values(reviewQueueItem)
        .returning();

      expect(queueItem.analysis_id).toBe(insertedAnalysis.id);
      expect(queueItem.priority).toBe(8);
      expect(queueItem.complexity_score).toBe(0.9);
      expect(queueItem.status).toBe('pending');
    });

    it('should assign experts to review items', async () => {
      const testExpert = generateTestData.user({ role: 'expert', email: 'expert@example.com' });
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [expert] = await testDb.insert(users).values(testExpert).returning();
      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 24
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'complex_analysis',
        constitutional_risk: 'high',
        requires_expert_review: true
      };
      const [insertedAnalysis] = await testDb.insert(constitutional_analyses).values(analysis).returning();

      const queueItem = {
        analysis_id: insertedAnalysis.id,
        bill_id: bill.id,
        priority: 9,
        status: 'pending'
      };
      const [insertedQueueItem] = await testDb.insert(expert_review_queue).values(queueItem).returning();

      // Assign expert
      const [updatedQueueItem] = await testDb
        .update(expert_review_queue)
        .set({
          assigned_expert_id: expert.id,
          assigned_at: new Date(),
          status: 'assigned'
        })
        .where(eq(expert_review_queue.id, insertedQueueItem.id))
        .returning();

      expect(updatedQueueItem.assigned_expert_id).toBe(expert.id);
      expect(updatedQueueItem.assigned_at).toBeDefined();
      expect(updatedQueueItem.status).toBe('assigned');
    });

    it('should complete expert review with assessment', async () => {
      const testExpert = generateTestData.user({ role: 'expert' });
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [expert] = await testDb.insert(users).values(testExpert).returning();
      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 27
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'complex_analysis',
        constitutional_risk: 'high',
        requires_expert_review: true
      };
      const [insertedAnalysis] = await testDb.insert(constitutional_analyses).values(analysis).returning();

      const queueItem = {
        analysis_id: insertedAnalysis.id,
        bill_id: bill.id,
        assigned_expert_id: expert.id,
        assigned_at: new Date(),
        status: 'in_review'
      };
      const [insertedQueueItem] = await testDb.insert(expert_review_queue).values(queueItem).returning();

      // Complete review
      const [completedReview] = await testDb
        .update(expert_review_queue)
        .set({
          status: 'completed',
          expert_assessment: 'Expert review confirms the analysis. The bill requires significant amendments to comply with constitutional requirements.',
          expert_confidence: 0.95,
          recommended_action: 'amend_bill',
          reviewed_at: new Date(),
          review_duration_minutes: 45
        })
        .where(eq(expert_review_queue.id, insertedQueueItem.id))
        .returning();

      expect(completedReview.status).toBe('completed');
      expect(completedReview.expert_assessment).toBeDefined();
      expect(completedReview.expert_confidence).toBe(0.95);
      expect(completedReview.review_duration_minutes).toBe(45);
    });

    it('should prioritize high-priority reviews', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill1 = generateTestData.bill({ title: 'Urgent Bill' });
      const testBill2 = generateTestData.bill({ title: 'Standard Bill' });

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill1] = await testDb.insert(bills).values({...testBill1, sponsor_id: sponsor.id}).returning();
      const [bill2] = await testDb.insert(bills).values({...testBill2, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 43
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysesData = [
        {
          bill_id: bill1.id,
          provision_id: insertedProvision.id,
          analysis_type: 'urgent_review',
          constitutional_risk: 'critical',
          requires_expert_review: true
        },
        {
          bill_id: bill2.id,
          provision_id: insertedProvision.id,
          analysis_type: 'standard_review',
          constitutional_risk: 'medium',
          requires_expert_review: true
        }
      ];

      const [analysis1, analysis2] = await testDb.insert(constitutional_analyses).values(analysesData).returning();

      const queueItems = [
        {
          analysis_id: analysis1.id,
          bill_id: bill1.id,
          priority: 10, // Highest priority
          status: 'pending'
        },
        {
          analysis_id: analysis2.id,
          bill_id: bill2.id,
          priority: 5, // Medium priority
          status: 'pending'
        }
      ];

      await testDb.insert(expert_review_queue).values(queueItems);

      const highPriorityReviews = await testDb
        .select()
        .from(expert_review_queue)
        .where(eq(expert_review_queue.status, 'pending'))
        .orderBy(expert_review_queue.priority);

      expect(highPriorityReviews).toHaveLength(2);
      expect(highPriorityReviews[0].priority).toBe(10);
      expect(highPriorityReviews[1].priority).toBe(5);
    });
  });

  describe('Analysis Audit Trail', () => {
    it('should track all changes to constitutional analyses', async () => {
      const testUser = generateTestData.user();
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [user] = await testDb.insert(users).values(testUser).returning();
      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 43
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'initial_analysis',
        constitutional_risk: 'high'
      };
      const [insertedAnalysis] = await testDb.insert(constitutional_analyses).values(analysis).returning();

      // Track creation
      const auditRecord1 = {
        analysis_id: insertedAnalysis.id,
        bill_id: bill.id,
        change_type: 'created',
        user_id: user.id,
        system_process: 'constitutional_analysis_pipeline_v1'
      };

      await testDb.insert(analysis_audit_trail).values(auditRecord1);

      // Update analysis and track change
      const [updatedAnalysis] = await testDb
        .update(constitutional_analyses)
        .set({ constitutional_risk: 'medium' })
        .where(eq(constitutional_analyses.id, insertedAnalysis.id))
        .returning();

      const auditRecord2 = {
        analysis_id: insertedAnalysis.id,
        bill_id: bill.id,
        change_type: 'updated',
        field_changed: 'constitutional_risk',
        old_value: 'high',
        new_value: 'medium',
        change_reason: 'Expert review reduced risk assessment',
        user_id: user.id
      };

      await testDb.insert(analysis_audit_trail).values(auditRecord2);

      // Verify audit trail
      const auditTrail = await testDb
        .select()
        .from(analysis_audit_trail)
        .where(eq(analysis_audit_trail.analysis_id, insertedAnalysis.id))
        .orderBy(analysis_audit_trail.created_at);

      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[0].change_type).toBe('created');
      expect(auditTrail[1].change_type).toBe('updated');
      expect(auditTrail[1].field_changed).toBe('constitutional_risk');
      expect(auditTrail[1].old_value).toBe('high');
      expect(auditTrail[1].new_value).toBe('medium');
    });

    it('should track automated system changes', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 43
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      const analysis = {
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: 'automated_analysis',
        constitutional_risk: 'medium'
      };
      const [insertedAnalysis] = await testDb.insert(constitutional_analyses).values(analysis).returning();

      const auditRecord = {
        analysis_id: insertedAnalysis.id,
        bill_id: bill.id,
        change_type: 'created',
        system_process: 'constitutional_analysis_ml_model_v2.1',
        automated_reasoning: {
          model_version: 'v2.1',
          confidence_score: 0.87,
          features_used: ['bill_text', 'constitutional_provisions', 'precedents'],
          processing_time_ms: 1250
        }
      };

      const [insertedAudit] = await testDb
        .insert(analysis_audit_trail)
        .values(auditRecord)
        .returning();

      expect(insertedAudit.system_process).toBe('constitutional_analysis_ml_model_v2.1');
      expect(insertedAudit.automated_reasoning).toBeDefined();
      expect(insertedAudit.automated_reasoning.model_version).toBe('v2.1');
      expect(insertedAudit.automated_reasoning.confidence_score).toBe(0.87);
    });
  });

  describe('Cross-Table Integration Tests', () => {
    it('should handle complete constitutional analysis workflow', async () => {
      // Step 1: Create bill and sponsor
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill({ title: 'Healthcare Access Bill 2024' });

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Step 2: Create constitutional provisions
      const provisionsData = [
        generateTestData.constitutionalProvision({
          article_number: 43,
          article_title: 'Economic and social rights',
          provision_text: 'Every person has the right to the highest attainable standard of health'
        }),
        generateTestData.constitutionalProvision({
          article_number: 27,
          article_title: 'Right to privacy',
          provision_text: 'Every person has the right to privacy'
        })
      ];
      const [provision43, provision27] = await testDb.insert(constitutional_provisions).values(provisionsData).returning();

      // Step 3: Create legal precedents
      const precedentsData = [
        {
          case_name: 'Okiya Omtatah Okoiti v. Attorney General',
          case_citation: '[2023] eKLR',
          court_level: 'high',
          constitutional_provisions: [provision43.id],
          relevance_score: 0.9
        },
        {
          case_name: 'Privacy Rights Case',
          case_citation: '[2024] eKLR',
          court_level: 'supreme',
          constitutional_provisions: [provision27.id],
          relevance_score: 0.85
        }
      ];
      const [precedent1, precedent2] = await testDb.insert(legal_precedents).values(precedentsData).returning();

      // Step 4: Create constitutional analyses
      const analysesData = [
        {
          bill_id: bill.id,
          provision_id: provision43.id,
          analysis_type: 'potential_conflict',
          confidence_level: 0.75,
          constitutional_risk: 'high',
          supporting_precedents: [precedent1.id],
          requires_expert_review: true
        },
        {
          bill_id: bill.id,
          provision_id: provision27.id,
          analysis_type: 'requires_compliance',
          confidence_level: 0.85,
          constitutional_risk: 'medium',
          supporting_precedents: [precedent2.id],
          requires_expert_review: false
        }
      ];
      const [analysis1, analysis2] = await testDb.insert(constitutional_analyses).values(analysesData).returning();

      // Step 5: Queue for expert review
      const reviewQueueItem = {
        analysis_id: analysis1.id,
        bill_id: bill.id,
        priority: 9,
        complexity_score: 0.8,
        status: 'pending'
      };
      const [queueItem] = await testDb.insert(expert_review_queue).values(reviewQueueItem).returning();

      // Step 6: Track audit trail
      const auditRecords = [
        {
          analysis_id: analysis1.id,
          bill_id: bill.id,
          change_type: 'created',
          system_process: 'constitutional_analysis_pipeline'
        },
        {
          analysis_id: analysis2.id,
          bill_id: bill.id,
          change_type: 'created',
          system_process: 'constitutional_analysis_pipeline'
        },
        {
          analysis_id: analysis1.id,
          bill_id: bill.id,
          change_type: 'queued_for_review',
          change_reason: 'High risk analysis requires expert verification'
        }
      ];
      await testDb.insert(analysis_audit_trail).values(auditRecords);

      // Verify complete workflow
      const constitutionalAnalysis = await testDb
        .select({
          bill: bills,
          analysis: constitutional_analyses,
          provision: constitutional_provisions,
          precedent: legal_precedents,
          review: expert_review_queue,
          audit: analysis_audit_trail
        })
        .from(bills)
        .leftJoin(constitutional_analyses, eq(bills.id, constitutional_analyses.bill_id))
        .leftJoin(constitutional_provisions, eq(constitutional_analyses.provision_id, constitutional_provisions.id))
        .leftJoin(legal_precedents, eq(bills.id, legal_precedents.id))
        .leftJoin(expert_review_queue, eq(constitutional_analyses.id, expert_review_queue.analysis_id))
        .leftJoin(analysis_audit_trail, eq(constitutional_analyses.id, analysis_audit_trail.analysis_id))
        .where(eq(bills.id, bill.id));

      expect(constitutionalAnalysis).toBeDefined();
      expect(constitutionalAnalysis.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should efficiently query constitutional provisions by article', async () => {
      // Create 100 constitutional provisions
      const provisionsData = Array.from({ length: 100 }, (_, i) => 
        generateTestData.constitutionalProvision({
          article_number: i + 1,
          provision_text: `Article ${i + 1} provision text`
        })
      );

      await testDb.insert(constitutional_provisions).values(provisionsData);

      const startTime = Date.now();
      const articleProvisions = await testDb
        .select()
        .from(constitutional_provisions)
        .where(eq(constitutional_provisions.article_number, 43));
      const queryTime = Date.now() - startTime;

      expect(queryTime).toBeLessThan(100);
      expect(articleProvisions.length).toBeGreaterThan(0);
    });

    it('should handle high-volume constitutional analyses', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const provision = generateTestData.constitutionalProvision({
        article_number: 43
      });
      const [insertedProvision] = await testDb.insert(constitutional_provisions).values(provision).returning();

      // Create 50 constitutional analyses
      const analysesData = Array.from({ length: 50 }, (_, i) => ({
        bill_id: bill.id,
        provision_id: insertedProvision.id,
        analysis_type: `analysis_type_${i}`,
        constitutional_risk: i % 4 === 0 ? 'high' : i % 4 === 1 ? 'medium' : i % 4 === 2 ? 'low' : 'critical',
        confidence_level: Math.random(),
        analysis_text: `Analysis ${i} of the bill`
      }));

      const startTime = Date.now();
      await testDb.insert(constitutional_analyses).values(analysesData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(3000);

      // Query risk distribution
      const riskDistribution = await testDb
        .select({
          risk: constitutional_analyses.constitutional_risk,
          count: count(constitutional_analyses.id)
        })
        .from(constitutional_analyses)
        .where(eq(constitutional_analyses.bill_id, bill.id))
        .groupBy(constitutional_analyses.constitutional_risk);

      expect(riskDistribution.length).toBeGreaterThan(0);
    });
  });
});

