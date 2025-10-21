import { sponsorRepository, SponsorRepository } from '../sponsor.repository';
import { readDatabase } from '../../../../../db'; // Adjusted path
import * as schema from '../../../../../../shared/schema'; // Adjusted path
import { eq, and, like, or, inArray, desc, asc, sql } from 'drizzle-orm';

// --- Mock Dependencies ---
jest.mock('@shared/database/connection', () => ({ readDatabase: jest.fn() }));

// Comprehensive Mock DB Object
const mockDb = {
    select: jest.fn().mockReturnThis(),
    selectDistinct: jest.fn().mockReturnThis(), // For unique parties/constituencies
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]), // Default empty result array
    offset: jest.fn().mockResolvedValue([]), // Default empty result array
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]), // Default empty returning array
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(), // For relation fetching if needed
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    // Mock execution for promise resolution
    then: jest.fn((resolve) => resolve([])), // Default resolve empty array
    catch: jest.fn(),
    // Allow mocking specific query results directly if needed
    _mockResult: (result: any[]) => {
        mockDb.limit.mockResolvedValue(result);
        mockDb.offset.mockResolvedValue(result);
         // Mock the final promise resolution
         mockDb.then.mockImplementationOnce((resolve) => resolve(result));
        // Mock returning for insert/update/delete
        mockDb.returning.mockResolvedValue(result);
        return mockDb; // Return self for chaining after mocking
    }
};


// --- Mock Data ---
const mockSponsor1: schema.Sponsor = {
    id: 1, name: 'Alice Adams', role: 'Senator', party: 'Independent', constituency: 'District A',
    email: 'alice@gov.test', phone: null, bio: null, photoUrl: null, conflictLevel: 'low',
    financialExposure: '10000', votingAlignment: '75', transparencyScore: '80', isActive: true,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-10-10')
};
const mockSponsor2: schema.Sponsor = {
    id: 2, name: 'Bob Brown', role: 'Representative', party: 'Unity', constituency: 'District B',
    email: 'bob@gov.test', phone: null, bio: null, photoUrl: null, conflictLevel: 'medium',
    financialExposure: '500000', votingAlignment: '60', transparencyScore: '70', isActive: true,
    createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-11-11')
};
const mockAffiliation1: schema.SponsorAffiliation = { id: 10, sponsorId: 1, organization: 'Org X', role: 'Board Member', type: 'economic', conflictType: 'financial_indirect', startDate: new Date('2023-01-01'), endDate: null, isActive: true, createdAt: new Date(), updatedAt: new Date() };
const mockTransparency1: schema.SponsorTransparency = { id: 20, sponsorId: 1, disclosureType: 'financial', description: 'Stocks in Org X', amount: '5000', source: 'Self-reported', dateReported: new Date('2024-01-15'), isVerified: true, createdAt: new Date(), updatedAt: new Date() };
const mockSponsorship1: schema.BillSponsorship = { id: 30, billId: 101, sponsorId: 1, sponsorshipType: 'primary', sponsorshipDate: new Date('2024-03-01'), isActive: true, createdAt: new Date() };


// --- Test Suite ---
describe('SponsorRepository', () => {
    let repository: SponsorRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        (readDatabase as jest.Mock).mockReturnValue(mockDb);
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
             const input: schema.InsertSponsor = { name: 'New Sponsor', role: 'Senator', party: 'New', financialExposure: 5000 };
             const expectedOutput = { ...mockSponsor1, id: 3, ...input, financialExposure: '5000', votingAlignment: '0', transparencyScore: '0', isActive: true, createdAt: expect.any(Date), updatedAt: expect.any(Date) };
             mockDb._mockResult([expectedOutput]);

            const newSponsor = await repository.create(input);

            expect(newSponsor).toEqual(expectedOutput);
            expect(mockDb.insert).toHaveBeenCalledWith(schema.sponsors);
            expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Sponsor',
                financialExposure: '5000', // Verify string conversion
                isActive: true, // Verify default
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            }));
             expect(mockDb.returning).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should update a sponsor and return the updated record', async () => {
             const updateData = { party: 'Updated Party', financialExposure: 12345 };
             const expectedOutput = { ...mockSponsor1, party: 'Updated Party', financialExposure: '12345', updatedAt: expect.any(Date) };
             mockDb._mockResult([expectedOutput]);

            const updatedSponsor = await repository.update(1, updateData);

            expect(updatedSponsor).toEqual(expectedOutput);
            expect(mockDb.update).toHaveBeenCalledWith(schema.sponsors);
            expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
                party: 'Updated Party',
                financialExposure: '12345', // Verify string conversion
                updatedAt: expect.any(Date),
            }));
            expect(mockDb.where).toHaveBeenCalledWith(eq(schema.sponsors.id, 1));
             expect(mockDb.returning).toHaveBeenCalled();
        });

         it('should return null if sponsor to update is not found', async () => {
             mockDb._mockResult([]); // Update returns no rows
             const updatedSponsor = await repository.update(99, { party: 'No One' });