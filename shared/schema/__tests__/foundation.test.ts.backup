// ============================================================================
// FOUNDATION SCHEMA TESTS
// ============================================================================
// Tests for core legislative entities: users, sponsors, bills, committees

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  users,
  user_profiles,
  sponsors,
  committees,
  committee_members,
  parliamentary_sessions,
  parliamentary_sittings,
  bills
} from '../foundation';
import { eq, and, or, inArray, sql } from 'drizzle-orm';

describe('Foundation Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
  });

  describe('Users Table', () => {
    it('should create a user with required fields', async () => {
      const testUser = generateTestData.user();

      const [insertedUser] = await testDb
        .insert(users)
        .values(testUser)
        .returning();

      expect(insertedUser).toBeDefined();
      expect(insertedUser.id).toBeDefined();
      expect(insertedUser.email).toBe(testUser.email);
      expect(insertedUser.role).toBe(testUser.role);
      expect(insertedUser.county).toBe(testUser.county);
      expect(insertedUser.is_verified).toBe(true);
      expect(insertedUser.created_at).toBeDefined();
      expect(insertedUser.updated_at).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      const testUser = generateTestData.user();

      // Insert first user
      await testDb.insert(users).values(testUser);

      // Try to insert same email again
      const duplicateUser = generateTestData.user({ email: testUser.email });

      await expect(
        testDb.insert(users).values(duplicateUser)
      ).rejects.toThrow();
    });

    it('should handle user role defaults correctly', async () => {
      const testUser = generateTestData.user({ role: undefined });

      const [insertedUser] = await testDb
        .insert(users)
        .values(testUser)
        .returning();

      expect(insertedUser.role).toBe('citizen');
    });

    it('should query users by county and role', async () => {
      const usersData = [
        generateTestData.user({ county: 'nairobi', role: 'citizen' }),
        generateTestData.user({ county: 'nairobi', role: 'expert' }),
        generateTestData.user({ county: 'kiambu', role: 'citizen' }),
        generateTestData.user({ county: 'nairobi', role: 'citizen' })
      ];

      await testDb.insert(users).values(usersData);

      const nairobiCitizens = await testDb
        .select()
        .from(users)
        .where(and(
          eq(users.county, 'nairobi'),
          eq(users.role, 'citizen')
        ));

      expect(nairobiCitizens).toHaveLength(2);
      expect(nairobiCitizens.every(u => u.county === 'nairobi' && u.role === 'citizen')).toBe(true);
    });
  });

  describe('User Profiles Table', () => {
    it('should create a user profile linked to a user', async () => {
      const testUser = generateTestData.user();
      const [insertedUser] = await testDb
        .insert(users)
        .values(testUser)
        .returning();

      const testProfile = {
        user_id: insertedUser.id,
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        county: 'nairobi',
        constituency: 'westlands',
        ward: 'kangemi',
        national_id_hash: 'hashed_id_123',
        is_id_verified: true
      };

      const [insertedProfile] = await testDb
        .insert(user_profiles)
        .values(testProfile)
        .returning();

      expect(insertedProfile.user_id).toBe(insertedUser.id);
      expect(insertedProfile.first_name).toBe('John');
      expect(insertedProfile.is_id_verified).toBe(true);
    });

    it('should enforce one-to-one relationship with users', async () => {
      const testUser = generateTestData.user();
      const [insertedUser] = await testDb
        .insert(users)
        .values(testUser)
        .returning();

      const profile1 = {
        user_id: insertedUser.id,
        first_name: 'John',
        last_name: 'Doe'
      };

      const profile2 = {
        user_id: insertedUser.id,
        first_name: 'Jane',
        last_name: 'Doe'
      };

      // First profile should succeed
      await testDb.insert(user_profiles).values(profile1);

      // Second profile with same user_id should fail
      await expect(
        testDb.insert(user_profiles).values(profile2)
      ).rejects.toThrow();
    });
  });

  describe('Sponsors Table', () => {
    it('should create a sponsor with all fields', async () => {
      const testSponsor = generateTestData.sponsor();

      const [insertedSponsor] = await testDb
        .insert(sponsors)
        .values(testSponsor)
        .returning();

      expect(insertedSponsor).toBeDefined();
      expect(insertedSponsor.id).toBeDefined();
      expect(insertedSponsor.name).toBe(testSponsor.name);
      expect(insertedSponsor.party).toBe(testSponsor.party);
      expect(insertedSponsor.county).toBe(testSponsor.county);
      expect(insertedSponsor.chamber).toBe(testSponsor.chamber);
      expect(insertedSponsor.is_active).toBe(true);
    });

    it('should query sponsors by party and county', async () => {
      const sponsorsData = [
        generateTestData.sponsor({ party: 'jubilee', county: 'nairobi' }),
        generateTestData.sponsor({ party: 'oda', county: 'nairobi' }),
        generateTestData.sponsor({ party: 'jubilee', county: 'kiambu' }),
        generateTestData.sponsor({ party: 'jubilee', county: 'nairobi' })
      ];

      await testDb.insert(sponsors).values(sponsorsData);

      const jubileeNairobiSponsors = await testDb
        .select()
        .from(sponsors)
        .where(and(
          eq(sponsors.party, 'jubilee'),
          eq(sponsors.county, 'nairobi')
        ));

      expect(jubileeNairobiSponsors).toHaveLength(2);
    });

    it('should handle inactive sponsors', async () => {
      const activeSponsor = generateTestData.sponsor({ is_active: true });
      const inactiveSponsor = generateTestData.sponsor({ is_active: false });

      await testDb.insert(sponsors).values([activeSponsor, inactiveSponsor]);

      const activeSponsors = await testDb
        .select()
        .from(sponsors)
        .where(eq(sponsors.is_active, true));

      expect(activeSponsors).toHaveLength(1);
      expect(activeSponsors[0].is_active).toBe(true);
    });
  });

  describe('Committees Table', () => {
    it('should create a committee with leadership', async () => {
      const testSponsor = generateTestData.sponsor();
      const [chair] = await testDb
        .insert(sponsors)
        .values(testSponsor)
        .returning();

      const testCommittee = {
        name: 'Finance Committee',
        chamber: 'national_assembly',
        chair_id: chair.id,
        description: 'Handles financial matters',
        members_count: 15,
        is_active: true
      };

      const [insertedCommittee] = await testDb
        .insert(committees)
        .values(testCommittee)
        .returning();

      expect(insertedCommittee.name).toBe(testCommittee.name);
      expect(insertedCommittee.chair_id).toBe(chair.id);
      expect(insertedCommittee.members_count).toBe(15);
    });

    it('should handle committee without chair', async () => {
      const testCommittee = {
        name: 'Ad Hoc Committee',
        chamber: 'senate',
        description: 'Temporary committee',
        is_active: true
      };

      const [insertedCommittee] = await testDb
        .insert(committees)
        .values(testCommittee)
        .returning();

      expect(insertedCommittee.chair_id).toBeNull();
      expect(insertedCommittee.name).toBe(testCommittee.name);
    });
  });

  describe('Committee Members Table', () => {
    it('should create committee member relationships', async () => {
      const testSponsor = generateTestData.sponsor();
      const testCommittee = {
        name: 'Health Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const committeeMember = {
        committee_id: committee.id,
        sponsor_id: sponsor.id,
        role: 'member',
        is_active: true
      };

      const [insertedMember] = await testDb
        .insert(committee_members)
        .values(committeeMember)
        .returning();

      expect(insertedMember.committee_id).toBe(committee.id);
      expect(insertedMember.sponsor_id).toBe(sponsor.id);
      expect(insertedMember.role).toBe('member');
    });

    it('should enforce unique committee-member pairs', async () => {
      const testSponsor = generateTestData.sponsor();
      const testCommittee = {
        name: 'Education Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const member1 = {
        committee_id: committee.id,
        sponsor_id: sponsor.id,
        role: 'member'
      };

      const member2 = {
        committee_id: committee.id,
        sponsor_id: sponsor.id,
        role: 'chair' // Different role but same committee-member pair
      };

      await testDb.insert(committee_members).values(member1);

      await expect(
        testDb.insert(committee_members).values(member2)
      ).rejects.toThrow();
    });
  });

  describe('Bills Table', () => {
    it('should create a bill with sponsor and committee', async () => {
      const testSponsor = generateTestData.sponsor();
      const testCommittee = {
        name: 'Justice Committee',
        chamber: 'national_assembly',
        is_active: true
      };

      const [sponsor] = await testDb.insert(sponsors).values(testSponsor).returning();
      const [committee] = await testDb.insert(committees).values(testCommittee).returning();

      const testBill = generateTestData.bill({
        sponsor_id: sponsor.id,
        committee: committee.name
      });

      const [insertedBill] = await testDb
        .insert(bills)
        .values(testBill)
        .returning();

      expect(insertedBill.bill_number).toBe(testBill.bill_number);
      expect(insertedBill.sponsor_id).toBe(sponsor.id);
      expect(insertedBill.committee).toBe(committee.name);
      expect(insertedBill.affected_counties).toEqual(['nairobi', 'kiambu']);
    });

    it('should enforce unique bill numbers', async () => {
      const testBill = generateTestData.bill();

      await testDb.insert(bills).values(testBill);

      const duplicateBill = generateTestData.bill({
        bill_number: testBill.bill_number
      });

      await expect(
        testDb.insert(bills).values(duplicateBill)
      ).rejects.toThrow();
    });

    it('should handle bills without sponsors', async () => {
      const testBill = generateTestData.bill({ sponsor_id: null });

      const [insertedBill] = await testDb
        .insert(bills)
        .values(testBill)
        .returning();

      expect(insertedBill.sponsor_id).toBeNull();
      expect(insertedBill.bill_number).toBe(testBill.bill_number);
    });

    it('should query bills by status and county', async () => {
      const billsData = [
        generateTestData.bill({ status: 'introduced', affected_counties: ['nairobi'] }),
        generateTestData.bill({ status: 'passed', affected_counties: ['kiambu'] }),
        generateTestData.bill({ status: 'introduced', affected_counties: ['nairobi', 'kiambu'] }),
        generateTestData.bill({ status: 'introduced', affected_counties: ['nairobi'] })
      ];

      await testDb.insert(bills).values(billsData);

      const introducedNairobiBills = await testDb
        .select()
        .from(bills)
        .where(and(
          eq(bills.status, 'introduced'),
          sql`${bills.affected_counties} @> ARRAY['nairobi']::kenyan_county[]`
        ));

      expect(introducedNairobiBills.length).toBeGreaterThanOrEqual(2);
    });

    it('should update engagement metrics', async () => {
      const testBill = generateTestData.bill({
        view_count: 100,
        comment_count: 25,
        vote_count_for: 15,
        vote_count_against: 5,
        engagement_score: 7.5
      });

      const [insertedBill] = await testDb
        .insert(bills)
        .values(testBill)
        .returning();

      expect(insertedBill.view_count).toBe(100);
      expect(insertedBill.comment_count).toBe(25);
      expect(insertedBill.engagement_score).toBe(7.5);
    });
  });

  describe('Parliamentary Sessions and Sittings', () => {
    it('should create parliamentary session with sittings', async () => {
      const sessionData = {
        session_number: 1,
        parliament_number: 13,
        start_date: new Date('2024-01-01'),
        chamber: 'national_assembly',
        description: 'First session of 13th Parliament'
      };

      const [session] = await testDb
        .insert(parliamentary_sessions)
        .values(sessionData)
        .returning();

      const sittingData = {
        session_id: session.id,
        sitting_date: new Date('2024-01-15'),
        sitting_number: 1,
        attendance_count: 250,
        agenda: ['Bill 1', 'Bill 2'],
        bills_discussed: ['Bill 1 of 2024', 'Bill 2 of 2024']
      };

      const [sitting] = await testDb
        .insert(parliamentary_sittings)
        .values(sittingData)
        .returning();

      expect(sitting.session_id).toBe(session.id);
      expect(sitting.sitting_number).toBe(1);
      expect(sitting.attendance_count).toBe(250);
    });
  });

  describe('Cross-Table Relationships', () => {
    it('should handle complete bill lifecycle', async () => {
      // Create sponsor
      const sponsorData = generateTestData.sponsor();
      const [sponsor] = await testDb.insert(sponsors).values(sponsorData).returning();

      // Create committee
      const committeeData = {
        name: 'Test Committee',
        chamber: 'national_assembly',
        is_active: true
      };
      const [committee] = await testDb.insert(committees).values(committeeData).returning();

      // Create bill
      const billData = generateTestData.bill({
        sponsor_id: sponsor.id,
        committee: committee.name
      });
      const [bill] = await testDb.insert(bills).values(billData).returning();

      // Create user and comment
      const userData = generateTestData.user();
      const [user] = await testDb.insert(users).values(userData).returning();

      // Note: Comments would normally be in citizen_participation schema
      // This is just to test the relationship concept

      // Verify all relationships
      const billWithRelations = await testDb
        .select({
          bill: bills,
          sponsor: sponsors,
          committee: committees
        })
        .from(bills)
        .leftJoin(sponsors, eq(bills.sponsor_id, sponsors.id))
        .leftJoin(committees, eq(bills.committee, committees.name))
        .where(eq(bills.id, bill.id));

      expect(billWithRelations).toHaveLength(1);
      expect(billWithRelations[0].sponsor.id).toBe(sponsor.id);
      expect(billWithRelations[0].committee.name).toBe(committee.name);
    });
  });

  describe('Indexes and Performance', () => {
    it('should use indexes for common queries', async () => {
      // Insert test data
      const usersData = Array.from({ length: 100 }, (_, i) =>
        generateTestData.user({
          email: `user${i}@example.com`,
          county: i % 2 === 0 ? 'nairobi' : 'kiambu'
        })
      );

      await testDb.insert(users).values(usersData);

      // Test indexed query performance
      const startTime = Date.now();
      const nairobiUsers = await testDb
        .select()
        .from(users)
        .where(eq(users.county, 'nairobi'));
      const queryTime = Date.now() - startTime;

      expect(nairobiUsers).toHaveLength(50);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });

    it('should handle bulk operations efficiently', async () => {
      const billsData = Array.from({ length: 1000 }, (_, i) =>
        generateTestData.bill({
          bill_number: `Bill ${i} of 2024`,
          title: `Test Bill ${i}`
        })
      );

      const startTime = Date.now();
      await testDb.insert(bills).values(billsData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(5000); // Should insert 1000 records quickly

      const count = await testDb.select({ count: sql`count(*)` }).from(bills);
      expect(count[0].count).toBe(1000);
    });
  });
});


