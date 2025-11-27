// ============================================================================
// PARLIAMENTARY PROCESS SCHEMA TESTS
// ============================================================================
// Tests for legislative workflow and procedure tracking

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import { 
  bill_committee_assignments,
  bill_amendments,
  bill_versions,
  bill_readings,
  parliamentary_votes,
  bill_cosponsors,
  public_participation_events,
  public_submissions,
  public_hearings
} from '../schema/parliamentary_process';
import { bills, sponsors, committees } from '../schema/foundation';
import { eq, and, or, sql, count, sum } from 'drizzle-orm';

describe('Parliamentary Process Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('parliamentary_process');
  });

  describe('Bill Committee Assignments', () => {
    it('should assign bills to committees', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();
      const testCommittee = {
        name: 'Finance Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const assignment = {
        bill_id: bill.id,
        committee_id: committee.id,
        assignment_date: new Date('2024-01-15'),
        assignment_reason: 'Bill relates to financial matters',
        priority_level: 'high',
        review_status: 'assigned'
      };

      const [insertedAssignment] = await testDb
        .insert(bill_committee_assignments)
        .values(assignment)
        .returning();

      expect(insertedAssignment.bill_id).toBe(bill.id);
      expect(insertedAssignment.committee_id).toBe(committee.id);
      expect(insertedAssignment.priority_level).toBe('high');
      expect(insertedAssignment.review_status).toBe('assigned');
    });

    it('should enforce unique bill-committee assignments', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();
      const testCommittee = {
        name: 'Health Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const assignment1 = {
        bill_id: bill.id,
        committee_id: committee.id,
        assignment_date: new Date()
      };

      const assignment2 = {
        bill_id: bill.id,
        committee_id: committee.id,
        assignment_date: new Date()
      };

      await testDb.insert(bill_committee_assignments).values(assignment1);

      await expect(
        testDb.insert(bill_committee_assignments).values(assignment2)
      ).rejects.toThrow();
    });

    it('should track public hearing scheduling', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();
      const testCommittee = {
        name: 'Education Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const assignment = {
        bill_id: bill.id,
        committee_id: committee.id,
        assignment_date: new Date(),
        public_hearing_scheduled: true,
        public_hearing_date: new Date('2024-02-15'),
        public_hearing_venue: 'Parliament Buildings, Committee Room 1'
      };

      const [insertedAssignment] = await testDb
        .insert(bill_committee_assignments)
        .values(assignment)
        .returning();

      expect(insertedAssignment.public_hearing_scheduled).toBe(true);
      expect(insertedAssignment.public_hearing_date).toBeDefined();
      expect(insertedAssignment.public_hearing_venue).toBe(assignment.public_hearing_venue);
    });
  });

  describe('Bill Amendments', () => {
    it('should create bill amendments with voting results', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const amendment = {
        bill_id: bill.id,
        proposer_id: sponsor.id,
        amendment_number: 'Amendment 1',
        amendment_title: 'Clause 2 Amendment',
        original_text: 'The original text of clause 2',
        proposed_text: 'The proposed amendment to clause 2',
        amendment_rationale: 'To improve clarity and implementation',
        proposed_date: new Date('2024-01-20'),
        status: 'proposed',
        committee_vote_for: 8,
        committee_vote_against: 2,
        committee_vote_abstain: 1,
        house_vote_for: 145,
        house_vote_against: 67,
        house_vote_abstain: 23
      };

      const [insertedAmendment] = await testDb
        .insert(bill_amendments)
        .values(amendment)
        .returning();

      expect(insertedAmendment.bill_id).toBe(bill.id);
      expect(insertedAmendment.proposer_id).toBe(sponsor.id);
      expect(insertedAmendment.status).toBe('proposed');
      expect(insertedAmendment.house_vote_for).toBe(145);
      expect(insertedAmendment.house_vote_against).toBe(67);
    });

    it('should track amendment adoption status', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const amendment = {
        bill_id: bill.id,
        proposer_id: sponsor.id,
        amendment_number: 'Amendment 2',
        proposed_text: 'Proposed amendment text',
        proposed_date: new Date(),
        status: 'adopted',
        amendments_proposed: 1,
        amendments_adopted: 1,
        house_decision_date: new Date('2024-02-01')
      };

      const [insertedAmendment] = await testDb
        .insert(bill_amendments)
        .values(amendment)
        .returning();

      expect(insertedAmendment.status).toBe('adopted');
      expect(insertedAmendment.amendments_adopted).toBe(1);
      expect(insertedAmendment.house_decision_date).toBeDefined();
    });

    it('should handle citizen support tracking', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const amendment = {
        bill_id: bill.id,
        proposer_id: sponsor.id,
        amendment_number: 'Amendment 3',
        proposed_text: 'Proposed amendment text',
        proposed_date: new Date(),
        public_support_count: 245,
        public_oppose_count: 67
      };

      const [insertedAmendment] = await testDb
        .insert(bill_amendments)
        .values(amendment)
        .returning();

      expect(insertedAmendment.public_support_count).toBe(245);
      expect(insertedAmendment.public_oppose_count).toBe(67);
    });
  });

  describe('Bill Versions', () => {
    it('should track bill versions through amendments', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Create original version
      const originalVersion = {
        bill_id: bill.id,
        version_number: 1,
        version_date: new Date('2024-01-10'),
        version_type: 'original',
        title: 'Original Bill Title',
        full_text: 'Original full text of the bill',
        is_current_version: false,
        source_document_url: 'https://parliament.go.ke/bills/original.pdf'
      };

      // Create amended version
      const amendedVersion = {
        bill_id: bill.id,
        version_number: 2,
        version_date: new Date('2024-02-15'),
        version_type: 'amended',
        title: 'Amended Bill Title',
        full_text: 'Amended full text of the bill',
        changes_summary: 'Clause 2 and 5 amended to improve implementation',
        is_current_version: true,
        source_document_url: 'https://parliament.go.ke/bills/amended.pdf'
      };

      await testDb.insert(bill_versions).values([originalVersion, amendedVersion]);

      const versions = await testDb
        .select()
        .from(bill_versions)
        .where(eq(bill_versions.bill_id, bill.id))
        .orderBy(bill_versions.version_number);

      expect(versions).toHaveLength(2);
      expect(versions[0].version_number).toBe(1);
      expect(versions[1].version_number).toBe(2);
      expect(versions[1].is_current_version).toBe(true);
    });

    it('should enforce unique version numbers per bill', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const version1 = {
        bill_id: bill.id,
        version_number: 1,
        version_date: new Date(),
        version_type: 'original',
        title: 'Version 1',
        full_text: 'Text 1'
      };

      const version2 = {
        bill_id: bill.id,
        version_number: 1, // Same version number
        version_date: new Date(),
        version_type: 'amended',
        title: 'Version 2',
        full_text: 'Text 2'
      };

      await testDb.insert(bill_versions).values(version1);

      await expect(
        testDb.insert(bill_versions).values(version2)
      ).rejects.toThrow();
    });
  });

  describe('Bill Readings', () => {
    it('should track bill progress through readings', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const readingsData = [
        {
          bill_id: bill.id,
          reading_number: 1,
          reading_type: 'first',
          reading_date: new Date('2024-01-15'),
          reading_outcome: 'approved',
          vote_for: 180,
          vote_against: 45,
          vote_abstain: 15,
          total_present: 240,
          debate_duration_minutes: 120,
          key_debate_points: ['Constitutional implications', 'Implementation costs'],
          next_scheduled_date: new Date('2024-02-01')
        },
        {
          bill_id: bill.id,
          reading_number: 2,
          reading_type: 'second',
          reading_date: new Date('2024-02-05'),
          reading_outcome: 'approved_with_amendments',
          vote_for: 165,
          vote_against: 67,
          vote_abstain: 28,
          total_present: 260,
          debate_duration_minutes: 180
        }
      ];

      await testDb.insert(bill_readings).values(readingsData);

      const readings = await testDb
        .select()
        .from(bill_readings)
        .where(eq(bill_readings.bill_id, bill.id))
        .orderBy(bill_readings.reading_number);

      expect(readings).toHaveLength(2);
      expect(readings[0].reading_number).toBe(1);
      expect(readings[1].reading_number).toBe(2);
      expect(readings[1].reading_outcome).toBe('approved_with_amendments');
    });

    it('should enforce unique reading numbers per bill', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const reading1 = {
        bill_id: bill.id,
        reading_number: 1,
        reading_type: 'first',
        reading_date: new Date(),
        reading_outcome: 'approved'
      };

      const reading2 = {
        bill_id: bill.id,
        reading_number: 1, // Same reading number
        reading_type: 'second',
        reading_date: new Date(),
        reading_outcome: 'approved'
      };

      await testDb.insert(bill_readings).values(reading1);

      await expect(
        testDb.insert(bill_readings).values(reading2)
      ).rejects.toThrow();
    });
  });

  describe('Parliamentary Votes', () => {
    it('should record detailed voting by MPs', async () => {
      const testSponsor1 = generateTestData.sponsor({ name: 'MP 1' });
      const testSponsor2 = generateTestData.sponsor({ name: 'MP 2' });
      const testBill = generateTestData.bill();

      const [sponsor1] = await testDb.insert(sponsors).values(testSponsor1).returning();
      const [sponsor2] = await testDb.insert(sponsors).values(testSponsor2).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor1.id}).returning();

      const votesData = [
        {
          bill_id: bill.id,
          sponsor_id: sponsor1.id,
          vote_type: 'reading',
          reading_number: 2,
          vote_position: 'for',
          vote_explanation: 'Supports the bill as amended',
          vote_date: new Date('2024-02-05')
        },
        {
          bill_id: bill.id,
          sponsor_id: sponsor2.id,
          vote_type: 'reading',
          reading_number: 2,
          vote_position: 'against',
          vote_explanation: 'Opposes due to implementation concerns',
          vote_date: new Date('2024-02-05')
        }
      ];

      await testDb.insert(parliamentary_votes).values(votesData);

      const votes = await testDb
        .select()
        .from(parliamentary_votes)
        .where(eq(parliamentary_votes.bill_id, bill.id))
        .orderBy(parliamentary_votes.sponsor_id);

      expect(votes).toHaveLength(2);
      expect(votes[0].vote_position).toBe('for');
      expect(votes[1].vote_position).toBe('against');
      expect(votes[0].vote_explanation).toBeDefined();
    });

    it('should handle amendment voting', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // First create amendment
      const amendment = {
        bill_id: bill.id,
        proposer_id: sponsor.id,
        amendment_number: 'Amendment 1',
        proposed_text: 'Proposed amendment',
        proposed_date: new Date()
      };
      const [insertedAmendment] = await testDb.insert(bill_amendments).values(amendment).returning();

      // Then record vote on amendment
      const amendmentVote = {
        bill_id: bill.id,
        sponsor_id: sponsor.id,
        vote_type: 'amendment',
        amendment_id: insertedAmendment.id,
        vote_position: 'for',
        vote_date: new Date()
      };

      const [vote] = await testDb
        .insert(parliamentary_votes)
        .values(amendmentVote)
        .returning();

      expect(vote.amendment_id).toBe(insertedAmendment.id);
      expect(vote.vote_type).toBe('amendment');
    });

    it('should enforce unique votes per sponsor per context', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const vote1 = {
        bill_id: bill.id,
        sponsor_id: sponsor.id,
        vote_type: 'reading',
        reading_number: 2,
        vote_position: 'for',
        vote_date: new Date()
      };

      const vote2 = {
        bill_id: bill.id,
        sponsor_id: sponsor.id,
        vote_type: 'reading',
        reading_number: 2, // Same context
        vote_position: 'against',
        vote_date: new Date()
      };

      await testDb.insert(parliamentary_votes).values(vote1);

      await expect(
        testDb.insert(parliamentary_votes).values(vote2)
      ).rejects.toThrow();
    });
  });

  describe('Bill Cosponsors', () => {
    it('should track bill sponsorship and cosponsorship', async () => {
      const testSponsor1 = generateTestData.sponsor({ name: 'Primary Sponsor' });
      const testSponsor2 = generateTestData.sponsor({ name: 'Cosponsor 1' });
      const testSponsor3 = generateTestData.sponsor({ name: 'Cosponsor 2' });
      const testBill = generateTestData.bill();

      const [sponsor1] = await testDb.insert(sponsors).values(testSponsor1).returning();
      const [sponsor2] = await testDb.insert(sponsors).values(testSponsor2).returning();
      const [sponsor3] = await testDb.insert(sponsors).values(testSponsor3).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor1.id}).returning();

      const cosponsorsData = [
        {
          bill_id: bill.id,
          sponsor_id: sponsor1.id,
          sponsorship_role: 'primary',
          sponsorship_order: 1,
          joined_date: new Date('2024-01-10')
        },
        {
          bill_id: bill.id,
          sponsor_id: sponsor2.id,
          sponsorship_role: 'cosponsor',
          sponsorship_order: 2,
          joined_date: new Date('2024-01-15')
        },
        {
          bill_id: bill.id,
          sponsor_id: sponsor3.id,
          sponsorship_role: 'cosponsor',
          sponsorship_order: 3,
          joined_date: new Date('2024-01-20')
        }
      ];

      await testDb.insert(bill_cosponsors).values(cosponsorsData);

      const cosponsors = await testDb
        .select()
        .from(bill_cosponsors)
        .where(eq(bill_cosponsors.bill_id, bill.id))
        .orderBy(bill_cosponsors.sponsorship_order);

      expect(cosponsors).toHaveLength(3);
      expect(cosponsors[0].sponsorship_role).toBe('primary');
      expect(cosponsors[1].sponsorship_role).toBe('cosponsor');
      expect(cosponsors[2].sponsorship_order).toBe(3);
    });

    it('should handle sponsor withdrawal', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const cosponsor = {
        bill_id: bill.id,
        sponsor_id: sponsor.id,
        sponsorship_role: 'cosponsor',
        joined_date: new Date('2024-01-15'),
        withdrawal_date: new Date('2024-02-01'),
        is_active: false
      };

      const [insertedCosponsor] = await testDb
        .insert(bill_cosponsors)
        .values(cosponsor)
        .returning();

      expect(insertedCosponsor.withdrawal_date).toBeDefined();
      expect(insertedCosponsor.is_active).toBe(false);
    });
  });

  describe('Public Participation Events', () => {
    it('should create public participation events', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();
      const testCommittee = {
        name: 'Public Participation Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const eventData = {
        bill_id: bill.id,
        event_type: 'public_hearing',
        event_title: 'Public Hearing on Healthcare Bill',
        event_description: 'Public consultation on the proposed healthcare legislation',
        event_date: new Date('2024-03-15'),
        event_time: '09:00',
        duration_hours: 6.0,
        venue_name: 'Kenyatta International Convention Centre',
        venue_address: 'Harambee Avenue, Nairobi',
        county: 'nairobi',
        constituency: 'starehe',
        organizing_committee_id: committee.id,
        registration_required: true,
        registration_deadline: new Date('2024-03-10'),
        max_participants: 500,
        event_status: 'scheduled'
      };

      const [event] = await testDb
        .insert(public_participation_events)
        .values(eventData)
        .returning();

      expect(event.bill_id).toBe(bill.id);
      expect(event.event_type).toBe('public_hearing');
      expect(event.organizing_committee_id).toBe(committee.id);
      expect(event.max_participants).toBe(500);
      expect(event.registration_required).toBe(true);
    });

    it('should handle event outcomes and documentation', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const event = {
        bill_id: bill.id,
        event_type: 'consultation',
        event_title: 'Consultation Meeting',
        event_date: new Date(),
        event_status: 'completed',
        actual_attendance: 245,
        event_outcomes: 'Successfully collected public input on key issues',
        livestream_url: 'https://parliament.go.ke/live/stream123',
        recording_url: 'https://parliament.go.ke/recordings/event123'
      };

      const [insertedEvent] = await testDb
        .insert(public_participation_events)
        .values(event)
        .returning();

      expect(insertedEvent.event_status).toBe('completed');
      expect(insertedEvent.actual_attendance).toBe(245);
      expect(insertedEvent.livestream_url).toBeDefined();
      expect(insertedEvent.recording_url).toBeDefined();
    });
  });

  describe('Public Submissions', () => {
    it('should record public submissions to committees', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();
      const testCommittee = {
        name: 'Environment Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const submission = {
        bill_id: bill.id,
        submission_type: 'written',
        submission_title: 'Submission on Environmental Impact Assessment',
        submission_content: 'We strongly support the environmental provisions but propose the following amendments...',
        submitter_type: 'organization',
        submitter_name: 'Kenya Environmental Network',
        organization_name: 'Kenya Environmental Network',
        organization_type: 'ngo',
        target_committee_id: committee.id,
        submission_date: new Date(),
        submission_method: 'email',
        key_recommendations: ['Strengthen enforcement mechanisms', 'Increase penalties'],
        supporting_documents: ['https://example.com/attachment1.pdf'],
        is_public: true,
        publication_consent: true
      };

      const [insertedSubmission] = await testDb
        .insert(public_submissions)
        .values(submission)
        .returning();

      expect(insertedSubmission.bill_id).toBe(bill.id);
      expect(insertedSubmission.target_committee_id).toBe(committee.id);
      expect(insertedSubmission.submitter_type).toBe('organization');
      expect(insertedSubmission.is_public).toBe(true);
    });

    it('should track committee responses to submissions', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      const submission = {
        bill_id: bill.id,
        submission_type: 'written',
        submission_title: 'Citizen Submission',
        submission_content: 'Content of submission',
        submitter_type: 'individual',
        submitter_name: 'John Citizen',
        submission_date: new Date(),
        committee_response: 'The committee has considered your submission and incorporated key recommendations',
        response_date: new Date('2024-02-15'),
        incorporation_status: 'partially_incorporated'
      };

      const [insertedSubmission] = await testDb
        .insert(public_submissions)
        .values(submission)
        .returning();

      expect(insertedSubmission.committee_response).toBeDefined();
      expect(insertedSubmission.response_date).toBeDefined();
      expect(insertedSubmission.incorporation_status).toBe('partially_incorporated');
    });
  });

  describe('Public Hearings', () => {
    it('should create detailed public hearing records', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();
      const testCommittee = {
        name: 'Constitutional Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      // Create public participation event first
      const event = {
        bill_id: bill.id,
        event_type: 'public_hearing',
        event_title: 'Constitutional Amendment Hearing',
        event_date: new Date(),
        organizing_committee_id: committee.id,
        event_status: 'completed'
      };
      const [participationEvent] = await testDb.insert(public_participation_events).values(event).returning();

      // Create detailed hearing record
      const hearing = {
        participation_event_id: participationEvent.id,
        hearing_title: 'Detailed Constitutional Hearing Session',
        hearing_purpose: 'To gather public input on constitutional amendment proposals',
        presiding_official: 'Committee Chair Hon. Smith',
        registered_attendees: 350,
        actual_attendees: 285,
        public_presentations: 23,
        hearing_format: 'hybrid',
        time_allocation: { per_presentation: 10, q_and_a: 5 },
        presentations_received: 45,
        key_issues_raised: ['Devolution concerns', 'Gender representation', 'Resource allocation'],
        committee_conclusions: 'Public supports the amendment with suggested modifications',
        follow_up_actions: ['Draft amendments', 'Prepare committee report'],
        hearing_effectiveness: 'high',
        participant_satisfaction: 4.2
      };

      const [insertedHearing] = await testDb
        .insert(public_hearings)
        .values(hearing)
        .returning();

      expect(insertedHearing.participation_event_id).toBe(participationEvent.id);
      expect(insertedHearing.actual_attendees).toBe(285);
      expect(insertedHearing.public_presentations).toBe(23);
      expect(insertedHearing.participant_satisfaction).toBe(4.2);
    });
  });

  describe('Cross-Table Workflow Tests', () => {
    it('should handle complete bill lifecycle workflow', async () => {
      // Step 1: Create sponsor and bill
      const testSponsor = generateTestData.sponsor();
      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const testBill = generateTestData.bill({ sponsor_id: sponsor.id });
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Step 2: Assign to committee
      const testCommittee = {
        name: 'Primary Committee',
        chamber: 'national_assembly',
        is_active: true
      };
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const assignment = {
        bill_id: bill.id,
        committee_id: committee.id,
        assignment_date: new Date()
      };
      await testDb.insert(bill_committee_assignments).values(assignment);

      // Step 3: Schedule public participation
      const event = {
        bill_id: bill.id,
        event_type: 'public_hearing',
        event_title: 'Public Hearing',
        event_date: new Date(),
        organizing_committee_id: committee.id
      };
      const [participationEvent] = await testDb.insert(public_participation_events).values(event).returning();

      // Step 4: Create detailed hearing
      const hearing = {
        participation_event_id: participationEvent.id,
        registered_attendees: 200,
        actual_attendees: 180,
        event_status: 'completed'
      };
      await testDb.insert(public_hearings).values(hearing);

      // Step 5: Process public submissions
      const submission = {
        bill_id: bill.id,
        submission_type: 'written',
        submission_title: 'Citizen Input',
        target_committee_id: committee.id,
        submission_date: new Date()
      };
      await testDb.insert(public_submissions).values(submission);

      // Step 6: Create amendments based on input
      const amendment = {
        bill_id: bill.id,
        proposer_id: sponsor.id,
        amendment_number: 'Amendment 1',
        status: 'adopted',
        house_decision_date: new Date()
      };
      const [insertedAmendment] = await testDb.insert(bill_amendments).values(amendment).returning();

      // Step 7: Create new version of bill
      const newVersion = {
        bill_id: bill.id,
        version_number: 2,
        version_type: 'amended',
        is_current_version: true
      };
      await testDb.insert(bill_versions).values(newVersion);

      // Step 8: Record parliamentary votes
      const vote = {
        bill_id: bill.id,
        sponsor_id: sponsor.id,
        vote_type: 'reading',
        reading_number: 3,
        vote_position: 'for',
        vote_date: new Date()
      };
      await testDb.insert(parliamentary_votes).values(vote);

      // Step 9: Add cosponsors
      const testCosponsor = generateTestData.sponsor({ name: 'Cosponsor' });
      const [cosponsor] = await testDb.insert(sponsors).values(testCosponsor).returning();
      const cosponsorRecord = {
        bill_id: bill.id,
        sponsor_id: cosponsor.id,
        sponsorship_role: 'cosponsor',
        joined_date: new Date()
      };
      await testDb.insert(bill_cosponsors).values(cosponsorRecord);

      // Verify complete workflow
      const billProgress = await testDb
        .select({
          bill: bills,
          assignment: bill_committee_assignments,
          event: public_participation_events,
          hearing: public_hearings,
          amendment: bill_amendments,
          version: bill_versions,
          vote: parliamentary_votes,
          cosponsor: bill_cosponsors
        })
        .from(bills)
        .leftJoin(bill_committee_assignments, eq(bills.id, bill_committee_assignments.bill_id))
        .leftJoin(public_participation_events, eq(bills.id, public_participation_events.bill_id))
        .leftJoin(public_hearings, eq(public_participation_events.id, public_hearings.participation_event_id))
        .leftJoin(bill_amendments, eq(bills.id, bill_amendments.bill_id))
        .leftJoin(bill_versions, eq(bills.id, bill_versions.bill_id))
        .leftJoin(parliamentary_votes, eq(bills.id, parliamentary_votes.bill_id))
        .leftJoin(bill_cosponsors, eq(bills.id, bill_cosponsors.bill_id))
        .where(eq(bills.id, bill.id));

      expect(billProgress).toHaveLength(1);
      expect(billProgress[0].assignment).toBeDefined();
      expect(billProgress[0].event).toBeDefined();
      expect(billProgress[0].hearing).toBeDefined();
      expect(billProgress[0].amendment).toBeDefined();
      expect(billProgress[0].version).toBeDefined();
      expect(billProgress[0].vote).toBeDefined();
      expect(billProgress[0].cosponsor).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume voting records efficiently', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Create 100 voting records
      const votesData = Array.from({ length: 100 }, (_, i) => ({
        bill_id: bill.id,
        sponsor_id: sponsor.id,
        vote_type: 'reading',
        reading_number: 2,
        vote_position: i % 3 === 0 ? 'for' : i % 3 === 1 ? 'against' : 'abstain',
        vote_date: new Date()
      }));

      const startTime = Date.now();
      await testDb.insert(parliamentary_votes).values(votesData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(5000);

      // Query voting summary
      const voteSummary = await testDb
        .select({
          vote_position: parliamentary_votes.vote_position,
          count: count(parliamentary_votes.id)
        })
        .from(parliamentary_votes)
        .where(eq(parliamentary_votes.bill_id, bill.id))
        .groupBy(parliamentary_votes.vote_position);

      expect(voteSummary.length).toBeGreaterThan(0);
    });

    it('should efficiently query bill amendment history', async () => {
      const testSponsor = generateTestData.sponsor();
      const testBill = generateTestData.bill();

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [bill] = await testDb.insert(bills).values({...testBill, sponsor_id: sponsor.id}).returning();

      // Create multiple amendments
      const amendmentsData = Array.from({ length: 50 }, (_, i) => ({
        bill_id: bill.id,
        proposer_id: sponsor.id,
        amendment_number: `Amendment ${i + 1}`,
        proposed_text: `Proposed amendment text ${i + 1}`,
        proposed_date: new Date(),
        status: i % 4 === 0 ? 'adopted' : i % 4 === 1 ? 'rejected' : i % 4 === 2 ? 'withdrawn' : 'proposed'
      }));

      await testDb.insert(bill_amendments).values(amendmentsData);

      const startTime = Date.now();
      const amendmentHistory = await testDb
        .select({
          amendment: bill_amendments,
          sponsor: sponsors
        })
        .from(bill_amendments)
        .leftJoin(sponsors, eq(bill_amendments.proposer_id, sponsors.id))
        .where(eq(bill_amendments.bill_id, bill.id))
        .orderBy(bill_amendments.proposed_date);
      const queryTime = Date.now() - startTime;

      expect(amendmentHistory).toHaveLength(50);
      expect(queryTime).toBeLessThan(1000);
    });
  });
});


