import { describe, it, expect } from 'vitest';

describe('SponsorRepository', () => {
    it('should be implemented', () => {
        expect(true).toBe(true);
    });
});


// --- Mock Data ---
const mockSponsor1: schema.Sponsor = {
    id: 1, name: 'Alice Adams', role: 'Senator', party: 'Independent', constituency: 'District A',
    email: 'alice@gov.test', phone: null, bio: null, photo_url: null, conflict_level: 'low',
    financial_exposure: '10000', voting_alignment: '75', transparency_score: '80', is_active: true,
    created_at: new Date('2024-01-01'), updated_at: new Date('2024-10-10')
};
const mockSponsor2: schema.Sponsor = {
    id: 2, name: 'Bob Brown', role: 'Representative', party: 'Unity', constituency: 'District B',
    email: 'bob@gov.test', phone: null, bio: null, photo_url: null, conflict_level: 'medium',
    financial_exposure: '500000', voting_alignment: '60', transparency_score: '70', is_active: true,
    created_at: new Date('2024-02-01'), updated_at: new Date('2024-11-11')
};
const mockAffiliation1: schema.SponsorAffiliation = { id: 10, sponsor_id: 1, organization: 'Org X', role: 'Board Member', type: 'economic', conflictType: 'financial_indirect', start_date: new Date('2023-01-01'), end_date: null, is_active: true, created_at: new Date(), updated_at: new Date() };
const mockTransparency1: schema.SponsorTransparency = { id: 20, sponsor_id: 1, disclosureType: 'financial', description: 'Stocks in Org X', amount: '5000', source: 'Self-reported', dateReported: new Date('2024-01-15'), is_verified: true, created_at: new Date(), updated_at: new Date() };
const mockSponsorship1: schema.BillSponsorship = { id: 30, bill_id: 101, sponsor_id: 1, sponsorshipType: 'primary', sponsorshipDate: new Date('2024-03-01'), is_active: true, created_at: new Date() };


// --- Test Suite ---
describe('SponsorRepository', () => {
    let repository: SponsorRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        (readDatabase as vi.Mock).mockReturnValue(mockDb);
        // Reset default mock result behavior
        mockDb._mockResult([]); // Default to empty array
        repository = sponsorRepository; // Use singleton instance
    });

    describe('findById', () => {
        it('should return a sponsor if found', async () => {
            mockDb._mockResult([mockSponsor1]);
            const sponsor = await repository.findById(1);
            expect(sponsor).toEqual(mockSponsor1);
            expect(mockDb.select).toHaveBeenCalled();
            expect(mockDb.from).toHaveBeenCalledWith(schema.sponsors);
            expect(mockDb.where).toHaveBeenCalledWith(eq(schema.sponsors.id, 1));
            expect(mockDb.limit).toHaveBeenCalledWith(1);
        });

        it('should return null if sponsor not found', async () => {
            mockDb._mockResult([]); // Ensure DB returns empty
            const sponsor = await repository.findById(99);
            expect(sponsor).toBeNull();
        });

        it('should throw database error', async () => {
            const dbError = new Error("DB Connection Error");
            mockDb.limit.mockRejectedValueOnce(dbError); // Simulate error during query execution
            await expect(repository.findById(1)).rejects.toThrow(`Database error retrieving sponsor 1: ${dbError.message}`);
        });

    });

    describe('create', () => {
        it('should insert a sponsor and return the new record', async () => {
            const input: schema.InsertSponsor = { name: 'New Sponsor', role: 'Senator', party: 'New', financial_exposure: 5000 };
            const expectedOutput = { ...mockSponsor1, id: 3, ...input, financial_exposure: '5000', voting_alignment: '0', transparency_score: '0', is_active: true, created_at: expect.any(Date), updated_at: expect.any(Date) };
            mockDb._mockResult([expectedOutput]);

            const newSponsor = await repository.create(input);

            expect(newSponsor).toEqual(expectedOutput);
            expect(mockDb.insert).toHaveBeenCalledWith(schema.sponsors);
            expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Sponsor',
                financial_exposure: '5000', // Verify string conversion
                is_active: true, // Verify default
                created_at: expect.any(Date),
                updated_at: expect.any(Date),
            }));
            expect(mockDb.returning).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update a sponsor and return the updated record', async () => {
            const updateData = { party: 'Updated Party', financial_exposure: 12345 };
            const expectedOutput = { ...mockSponsor1, party: 'Updated Party', financial_exposure: '12345', updated_at: expect.any(Date) };
            mockDb._mockResult([expectedOutput]);

            const updatedSponsor = await repository.update(1, updateData);

            expect(updatedSponsor).toEqual(expectedOutput);
            expect(mockDb.update).toHaveBeenCalledWith(schema.sponsors);
            expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
                party: 'Updated Party',
                financial_exposure: '12345', // Verify string conversion
                updated_at: expect.any(Date),
            }));
            expect(mockDb.where).toHaveBeenCalledWith(eq(schema.sponsors.id, 1));
            expect(mockDb.returning).toHaveBeenCalled();
        });

        it('should return null if sponsor to update is not found', async () => {
            mockDb._mockResult([]); // Update returns no rows
            const updatedSponsor = await repository.update(99, { party: 'No One' });
            expect(updatedSponsor).toBeNull();
        });
    });
});
});
