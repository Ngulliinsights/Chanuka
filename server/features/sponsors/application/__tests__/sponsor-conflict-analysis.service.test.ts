import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sponsorConflictAnalysisService, SponsorConflictAnalysisService, ConflictDetectionResult, ConflictType, ConflictSeverity, RiskProfile } from '../sponsor-conflict-analysis.service';
// Mock the NEW repository
import { sponsorRepository, SponsorRepository } from '../../infrastructure/repositories/sponsors.repository';
import * as schema from '@shared/schema'; // Adjusted path

// --- Mock Dependencies ---
vi.mock('../../infrastructure/repositories/sponsors.repository'); // Mock the repository

// --- Mock Data ---
const mockSponsor: schema.Sponsor = {
    id: 1, name: 'Conflict Sponsor', role: 'Senator', party: 'Test', constituency: 'Test',
    email: 'cs@gov.test', phone: null, bio: null, photo_url: null, conflict_level: null, // Start with null conflict_level
    financial_exposure: '5000000', voting_alignment: '80', transparency_score: '60', is_active: true,
    created_at: new Date(), updated_at: new Date()
};
const mockBill1: schema.Bill = { id: 101, title: 'Bill Affecting TechCorp', content: 'Regulates TechCorp operations.', /* other fields */ } as schema.Bill;
const mockBill2: schema.Bill = { id: 102, title: 'Bill Affecting FinanceInc', content: 'Changes rules for FinanceInc.', /* other fields */ } as schema.Bill;
const mockBill3: schema.Bill = { id: 103, title: 'Unrelated Bill', content: 'About agriculture.', /* other fields */ } as schema.Bill;

const mockAffiliationDirect: schema.SponsorAffiliation = { id: 1, sponsor_id: 1, organization: 'TechCorp', role: 'Board Member', type: 'economic', conflictType: 'financial_direct', start_date: new Date('2023-01-01'), end_date: null, is_active: true, created_at: new Date(), updated_at: new Date() };
const mockAffiliationIndirect: schema.SponsorAffiliation = { id: 2, sponsor_id: 1, organization: 'FinanceInc Subsidiary', role: 'Consultant', type: 'professional', conflictType: 'financial_indirect', start_date: new Date('2022-06-01'), end_date: null, is_active: true, created_at: new Date(), updated_at: new Date() };
const mockAffiliationLeadership: schema.SponsorAffiliation = { id: 3, sponsor_id: 1, organization: 'Industry Group', role: 'Chairman', type: 'advocacy', conflictType: 'influence', start_date: new Date('2024-01-01'), end_date: null, is_active: true, created_at: new Date(), updated_at: new Date() };
const mockAffiliationTiming: schema.SponsorAffiliation = { id: 4, sponsor_id: 1, organization: 'New Ventures LLC', role: 'Investor', type: 'economic', conflictType: 'financial', start_date: new Date(Date.now() - 15 * 86400000), end_date: null, is_active: true, created_at: new Date(), updated_at: new Date() }; // Started 15 days ago

const mockTransparency: schema.SponsorTransparency[] = [
    { id: 1, sponsor_id: 1, disclosureType: 'financial', description: 'Partial shares in TechCorp', amount: '100000', source: 'Self', dateReported: new Date('2024-05-01'), is_verified: true, created_at: new Date(), updated_at: new Date() }
];
// Mock BillSponsorship linking sponsor 1 to bills 101 and 102
const mockSponsorships: schema.BillSponsorship[] = [
    { id: 1, bill_id: 101, sponsor_id: 1, sponsorshipType: 'primary', sponsorshipDate: new Date(Date.now() - 20 * 86400000), is_active: true, created_at: new Date(), updated_at: new Date()  }, // Sponsored 20 days ago
    { id: 2, bill_id: 102, sponsor_id: 1, sponsorshipType: 'co_sponsor', sponsorshipDate: new Date('2024-02-01'), is_active: true, created_at: new Date(), updated_at: new Date()  }
];

// Mock repository instance type
type MockSponsorRepository = vi.Mocked<SponsorRepository>;

describe('SponsorConflictAnalysisService', () => {
    let service: SponsorConflictAnalysisService;
    let mockRepo: MockSponsorRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        // Create a mocked instance of the repository
        mockRepo = new SponsorRepository() as MockSponsorRepository;
        // Mock repository methods
        mockRepo.findByIds = vi.fn().mockResolvedValue([mockSponsor]);
        mockRepo.list = vi.fn().mockResolvedValue([mockSponsor]);
        mockRepo.findAffiliationsBySponsorIds = vi.fn().mockResolvedValue(new Map([[1, [mockAffiliationDirect, mockAffiliationIndirect, mockAffiliationLeadership, mockAffiliationTiming]]]));
        mockRepo.findTransparencyBySponsorIds = vi.fn().mockResolvedValue(new Map([[1, mockTransparency]]));
         // Mock listBillSponsorshipsBySponsor used in getSponsorData
         mockRepo.listBillSponsorshipsBySponsor = vi.fn().mockResolvedValue(mockSponsorships);
         // Mock findBillsMentioningOrganization
         mockRepo.findBillsMentioningOrganization = vi.fn().mockImplementation(async (org, bill_ids) => {
             if (org === 'TechCorp' && bill_ids?.includes(101)) return [mockBill1];
             if (org === 'FinanceInc Subsidiary' && bill_ids?.includes(102)) return [mockBill2];
              if (org === 'Industry Group' && bill_ids?.includes(101)) return [mockBill1]; // Assuming Industry Group relates to Bill 101
              if (org === 'New Ventures LLC' && bill_ids?.includes(101)) return [mockBill1]; // Assuming timing conflict relates to Bill 101
             return [];
         });
         // Mock getBill used by detectTimingConflicts
         mockRepo.getBill = vi.fn().mockImplementation(async (id) => {
             if (id === 101) return { ...mockBill1, introduced_date: new Date(Date.now() - 20 * 86400000)}; // Bill introduced 20 days ago
             if (id === 102) return { ...mockBill2, introduced_date: new Date('2024-02-01')};
             return null;
         });


        // Instantiate the service (it will use the mocked singleton)
        service = sponsorConflictAnalysisService;
         // Inject the mock repository into the singleton instance for testing
         (service as any).sponsorRepo = mockRepo;
    });

    describe('detectConflicts', () => {
        it('should detect financial_direct conflict', async () => {
            const conflicts = await service.detectConflicts(1);
            const financialDirect = conflicts.find(c => c.conflictType === 'financial_direct');
            expect(financialDirect).toBeDefined();
            expect(financialDirect?.sponsor_id).toBe(1);
            expect(financialDirect?.description).toContain('TechCorp');
            expect(financialDirect?.affectedBills).toContain(101);
            expect(financialDirect?.severity).toBe('high'); // Based on $5M exposure and factors
        });

        it('should detect financial_indirect conflict', async () => {
             const conflicts = await service.detectConflicts(1);
             const financialIndirect = conflicts.find(c => c.conflictType === 'financial_indirect');
             expect(financialIndirect).toBeDefined();
             expect(financialIndirect?.sponsor_id).toBe(1);
             expect(financialIndirect?.description).toContain('FinanceInc Subsidiary');
             expect(financialIndirect?.affectedBills).toContain(102);
             expect(financialIndirect?.severity).toBe('medium'); // Lower impact, less severe
         });


        it('should detect organizational conflict', async () => {
            const conflicts = await service.detectConflicts(1);
            const organizational = conflicts.find(c => c.conflictType === 'organizational');
            expect(organizational).toBeDefined();
            expect(organizational?.sponsor_id).toBe(1);
            expect(organizational?.description).toContain('Chairman at Industry Group');
            expect(organizational?.affectedBills).toContain(101);
             expect(organizational?.severity).toBe('medium'); // Based on leadership role + recency
        });

        it('should detect timing_suspicious conflict', async () => {
            const conflicts = await service.detectConflicts(1);
            const timing = conflicts.find(c => c.conflictType === 'timing_suspicious');
            expect(timing).toBeDefined();
            expect(timing?.sponsor_id).toBe(1);
            expect(timing?.description).toContain('affiliation(s) started within 30 days');
            expect(timing?.affectedBills).toContain(101); // Affiliation started 15 days ago, bill introduced 20 days ago
            expect(timing?.severity).toBe('medium'); // Within 30 days
        });

        it('should detect disclosure_incomplete conflict', async () => {
            // Arrange: Modify affiliations to have more expected disclosures than provided
             const extraAffiliation = { ...mockAffiliationDirect, id: 5, organization: 'AnotherCorp' };
             mockRepo.findAffiliationsBySponsorIds.mockResolvedValueOnce(new Map([[1, [...mockAffiliationDirect, mockAffiliationIndirect, mockAffiliationLeadership, mockAffiliationTiming, extraAffiliation]]]));

            const conflicts = await service.detectConflicts(1);
            const disclosure = conflicts.find(c => c.conflictType === 'disclosure_incomplete');
            expect(disclosure).toBeDefined();
            expect(disclosure?.sponsor_id).toBe(1);
             // Expected = 3 (TechCorp, FinanceInc Sub, AnotherCorp); Actual = 1 (TechCorp partial) -> 1/3 = 33% -> High risk
             expect(disclosure?.description).toContain('33% of expected disclosures provided');
             expect(disclosure?.severity).toBe('high');
        });

         it('should return empty array if no conflicts found', async () => {
             // Arrange: Modify mocks to return no conflicting data
             mockRepo.findAffiliationsBySponsorIds.mockResolvedValueOnce(new Map([[1, []]])); // No affiliations
             mockRepo.listBillSponsorshipsBySponsor.mockResolvedValueOnce([]); // No sponsorships

             const conflicts = await service.detectConflicts(1);
             expect(conflicts).toEqual([]);
         });

         it('should handle analysis for all active sponsors', async () => {
              // Arrange: Mock list() to return multiple sponsors, adjust relation fetches
              mockRepo.list.mockResolvedValueOnce([mockSponsor, mockSponsor2]);
              // Mock relation fetches for sponsor 2 (e.g., no conflicts)
              mockRepo.findAffiliationsBySponsorIds.mockResolvedValueOnce(new Map([
                  [mockSponsor.id, [mockAffiliationDirect, mockAffiliationTiming]], // Sponsor 1 data
                  [mockSponsor2.id, []] // Sponsor 2 data (no affiliations)
              ]));
               mockRepo.findTransparencyBySponsorIds.mockResolvedValueOnce(new Map([
                   [mockSponsor.id, mockTransparency],
                   [mockSponsor2.id, []]
               ]));
               mockRepo.listBillSponsorshipsBySponsor
                   .mockResolvedValueOnce(mockSponsorships) // Sponsor 1
                   .mockResolvedValueOnce([]); // Sponsor 2

               // Adjust findBillsMentioningOrganization for sponsor 1 calls
               mockRepo.findBillsMentioningOrganization
                   .mockResolvedValueOnce([mockBill1]) // TechCorp for sponsor 1
                   .mockResolvedValueOnce([]); // New Ventures for sponsor 1

              // Act
              const conflicts = await service.detectConflicts(); // No ID specified

              // Assert
              expect(conflicts.length).toBeGreaterThan(0); // Expect conflicts for sponsor 1
              expect(conflicts.some(c => c.sponsor_id === mockSponsor.id)).toBe(true);
              expect(conflicts.some(c => c.sponsor_id === mockSponsor2.id)).toBe(false); // No conflicts expected for sponsor 2
              expect(mockRepo.list).toHaveBeenCalledWith({ is_active: true, limit: 1000 });
         });

    });

    describe('generateRiskProfile', () => {
        it('should calculate risk scores and determine level', async () => {
            const profile = await service.generateRiskProfile(1);
            expect(profile.overallScore).toBeGreaterThan(0);
            expect(profile.level).toMatch(/low|medium|high|critical/);
             expect(profile.breakdown.financialRisk).toBeGreaterThan(50); // High exposure
             expect(profile.breakdown.affiliationRisk).toBeGreaterThan(50); // Multiple affiliations
             expect(profile.breakdown.transparencyRisk).toBeGreaterThan(50); // Incomplete disclosure in mock
             expect(profile.breakdown.behavioralRisk).toBeLessThan(50); // Normal voting alignment
        });

         it('should generate relevant recommendations based on risk', async () => {
             const profile = await service.generateRiskProfile(1);
             expect(profile.recommendations.length).toBeGreaterThan(0);
              // Based on mock data leading to high financial, affiliation, and transparency risk
             expect(profile.recommendations).toContain(expect.stringContaining('ethics review')); // High/Critical trigger
             expect(profile.recommendations).toContain(expect.stringContaining('divesting')); // High financial
             expect(profile.recommendations).toContain(expect.stringContaining('clear boundaries')); // High affiliation
             expect(profile.recommendations).toContain(expect.stringContaining('disclosure completeness')); // High transparency
         });

          it('should throw error if sponsor not found', async () => {
               mockRepo.findById.mockResolvedValueOnce(null); // Mock repo findById specifically
               await expect(service.generateRiskProfile(99)).rejects.toThrow('Sponsor 99 not found');
           });
    });

    // Add tests for:
    // - createConflictMapping (complex, requires mocking node/edge generation)
    // - analyzeConflictTrends (requires mocking historical data simulation)
    // - calculateConflictSeverity with various inputs
});

