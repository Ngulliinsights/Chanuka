import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { sponsorsRouter } from '../sponsors.routes'; // Import the NEW router
// Mock the NEW repository and analysis service
import { sponsorRepository } from '../../infrastructure/repositories/sponsor.repository';
import { sponsorConflictAnalysisService } from '../../application/sponsor-conflict-analysis.service';
import { authenticateToken } from '@/components/auth'; // Mock auth if needed
import * as schema from '../../../../../shared/schema';

// --- Mock Dependencies ---
vi.mock('../../infrastructure/repositories/sponsor.repository');
vi.mock('../../application/sponsor-conflict-analysis.service');
// Mock Auth Middleware (Allow all for testing, add specific checks if needed)
vi.mock('../../../../middleware/auth', () => ({
    authenticateToken: vi.fn((req: any, res: any, next: any) => {
        req.user = { id: 'mock-test-user', role: 'admin' }; // Assume admin for protected POST/PUT/DELETE
        next();
    }),
    AuthenticatedRequest: vi.fn(),
}));

// --- Setup Express App ---
const app: Express = express();
app.use(express.json());
app.use('/api/sponsors', sponsorsRouter); // Mount the sponsors router

// --- Mock Data ---
const mockSponsor1: schema.Sponsor = { id: 1, name: 'Alice Adams', role: 'Senator', party: 'Independent', constituency: 'District A', email: 'a@test', phone: null, bio: null, photoUrl: null, conflictLevel: 'low', financialExposure: '10000', votingAlignment: '75', transparencyScore: '80', isActive: true, createdAt: new Date(), updatedAt: new Date() };
const mockSponsor2: schema.Sponsor = { id: 2, name: 'Bob Brown', role: 'Rep', party: 'Unity', constituency: 'District B', email: 'b@test', phone: null, bio: null, photoUrl: null, conflictLevel: 'medium', financialExposure: '50000', votingAlignment: '60', transparencyScore: '70', isActive: true, createdAt: new Date(), updatedAt: new Date() };
const mockAffiliation: schema.SponsorAffiliation = { id: 10, sponsorId: 1, organization: 'Org A', type: 'economic', /* ... */ } as schema.SponsorAffiliation;
const mockTransparency: schema.SponsorTransparency = { id: 20, sponsorId: 1, disclosureType: 'financial', description: 'Stocks', /* ... */ } as schema.SponsorTransparency;
const mockSponsorship: schema.BillSponsorship = { id: 30, billId: 101, sponsorId: 1, sponsorshipType: 'primary', /* ... */ } as schema.BillSponsorship;
const mockSponsorWithRelations: any = { ...mockSponsor1, affiliations: [mockAffiliation], transparency: [mockTransparency], sponsorships: [mockSponsorship] };
const mockConflictResult: any = { conflictId: 'test-conflict', sponsorId: 1, conflictType: 'financial_direct', severity: 'medium', description: 'Test', affectedBills: [101], financialImpact: 1000, detectedAt: new Date(), confidence: 0.8, evidence: [] };
const mockRiskProfile: any = { overallScore: 60, level: 'medium', breakdown: {}, recommendations: [] };

describe('Sponsors API Routes', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mocks for repository methods
        (sponsorRepository.list as vi.Mock).mockResolvedValue([mockSponsor1, mockSponsor2]);
        (sponsorRepository.search as vi.Mock).mockResolvedValue([mockSponsor1]);
        (sponsorRepository.findByIdWithRelations as vi.Mock).mockResolvedValue(mockSponsorWithRelations);
        (sponsorRepository.findById as vi.Mock).mockResolvedValue(mockSponsor1); // Needed if findByIdWithRelations uses it
        (sponsorRepository.create as vi.Mock).mockResolvedValue({ ...mockSponsor1, id: 3 });
        (sponsorRepository.update as vi.Mock).mockResolvedValue(mockSponsor1);
        (sponsorRepository.setActiveStatus as vi.Mock).mockResolvedValue({ ...mockSponsor1, isActive: false });
        (sponsorRepository.listAffiliations as vi.Mock).mockResolvedValue([mockAffiliation]);
        (sponsorRepository.addAffiliation as vi.Mock).mockResolvedValue({ ...mockAffiliation, id: 11 });
        (sponsorRepository.updateAffiliation as vi.Mock).mockResolvedValue(mockAffiliation);
        (sponsorRepository.setAffiliationActiveStatus as vi.Mock).mockResolvedValue({ ...mockAffiliation, isActive: false });
        (sponsorRepository.listTransparencyRecords as vi.Mock).mockResolvedValue([mockTransparency]);
        (sponsorRepository.addTransparencyRecord as vi.Mock).mockResolvedValue({ ...mockTransparency, id: 21 });
        (sponsorRepository.updateTransparencyRecord as vi.Mock).mockResolvedValue(mockTransparency);
        (sponsorRepository.verifyTransparencyRecord as vi.Mock).mockResolvedValue({ ...mockTransparency, isVerified: true });
        (sponsorRepository.listBillSponsorshipsBySponsor as vi.Mock).mockResolvedValue([mockSponsorship]);
         (sponsorRepository.createBillSponsorship as vi.Mock).mockResolvedValue({ ...mockSponsorship, id: 31 });
         (sponsorRepository.deactivateBillSponsorship as vi.Mock).mockResolvedValue({ ...mockSponsorship, isActive: false });
         (sponsorRepository.getUniqueParties as vi.Mock).mockResolvedValue(['Independent', 'Unity']);
         (sponsorRepository.getUniqueConstituencies as vi.Mock).mockResolvedValue(['District A', 'District B']);
         (sponsorRepository.getActiveSponsorCount as vi.Mock).mockResolvedValue(2);
         (sponsorRepository.getBillsByIds as vi.Mock).mockResolvedValue([{id: 101, title: 'Bill 101'}] as schema.Bill[]); // For sponsored-bills route


        // Reset mocks for analysis service methods
        (sponsorConflictAnalysisService.detectConflicts as vi.Mock).mockResolvedValue([mockConflictResult]);
        (sponsorConflictAnalysisService.generateRiskProfile as vi.Mock).mockResolvedValue(mockRiskProfile);
        (sponsorConflictAnalysisService.analyzeConflictTrends as vi.Mock).mockResolvedValue([{ sponsorId: 1, conflictCount: 1, severityTrend: 'stable', riskScore: 50, predictions: [] }]);
         (sponsorConflictAnalysisService.createConflictMapping as vi.Mock).mockResolvedValue({ nodes: [], edges: [], clusters: [], metrics: {} });
    });

    // --- CRUD Tests ---
    describe('GET /api/sponsors', () => {
        it('should return a list of sponsors', async () => {
            const response = await request(app).get('/api/sponsors');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].name).toBe(mockSponsor1.name);
            expect(sponsorRepository.list).toHaveBeenCalledWith(expect.objectContaining({ isActive: true })); // Default filter
        });

         it('should handle search query parameter', async () => {
             const response = await request(app).get('/api/sponsors?search=Alice');
             expect(response.status).toBe(200);
             expect(response.body.data).toHaveLength(1);
             expect(response.body.data[0].name).toBe(mockSponsor1.name);
             expect(sponsorRepository.search).toHaveBeenCalledWith('Alice', expect.any(Object));
             expect(sponsorRepository.list).not.toHaveBeenCalled();
         });

         it('should handle filtering parameters', async () => {
              await request(app).get('/api/sponsors?party=Unity&limit=10');
              expect(sponsorRepository.list).toHaveBeenCalledWith(expect.objectContaining({
                  party: 'Unity',
                  limit: 10,
                  isActive: true // Default
              }));
         });

    });

    describe('GET /api/sponsors/:id', () => {
        it('should return a single sponsor with relations', async () => {
            const response = await request(app).get('/api/sponsors/1');
            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(1);
            expect(response.body.data.name).toBe(mockSponsor1.name);
            expect(response.body.data).toHaveProperty('affiliations');
            expect(response.body.data).toHaveProperty('transparency');
            expect(response.body.data).toHaveProperty('sponsorships');
            expect(sponsorRepository.findByIdWithRelations).toHaveBeenCalledWith(1);
        });

        it('should return 404 if sponsor not found', async () => {
            (sponsorRepository.findByIdWithRelations as vi.Mock).mockResolvedValue(null);
            const response = await request(app).get('/api/sponsors/99');
            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Sponsor with ID 99 not found');
        });

         it('should return 400 for invalid ID', async () => {
            const response = await request(app).get('/api/sponsors/abc');
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Invalid Sponsor ID');
        });
    });

    describe('POST /api/sponsors', () => {
        it('should create a new sponsor', async () => {
             const newSponsorData = { name: 'Charlie Chaps', role: 'Minister', party: 'Progress' };
             const createdSponsor = { ...newSponsorData, id: 3, /* other defaults */ };
             (sponsorRepository.create as vi.Mock).mockResolvedValue(createdSponsor);

            const response = await request(app).post('/api/sponsors').send(newSponsorData);

            expect(response.status).toBe(201);
            expect(response.body.data.id).toBe(3);
            expect(response.body.data.name).toBe('Charlie Chaps');
             expect(sponsorRepository.create).toHaveBeenCalledWith(expect.objectContaining(newSponsorData));
        });

         it('should return 400 for invalid data', async () => {
             const invalidData = { role: 'Missing Name' }; // Name is required
             const response = await request(app).post('/api/sponsors').send(invalidData);
             expect(response.status).toBe(400);
             expect(response.body.status).toBe('fail');
             expect(response.body.data).toEqual(expect.arrayContaining([
                 expect.objectContaining({ message: expect.stringContaining("Name is required") })
             ]));
         });
    });

    describe('PUT /api/sponsors/:id', () => {
        it('should update an existing sponsor', async () => {
             const updateData = { party: 'Updated' };
             const updatedSponsor = { ...mockSponsor1, party: 'Updated' };
             (sponsorRepository.update as vi.Mock).mockResolvedValue(updatedSponsor);

            const response = await request(app).put('/api/sponsors/1').send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.data.party).toBe('Updated');
            expect(sponsorRepository.update).toHaveBeenCalledWith(1, updateData);
        });

         it('should return 404 if sponsor not found', async () => {
             (sponsorRepository.update as vi.Mock).mockResolvedValue(null);
             const response = await request(app).put('/api/sponsors/99').send({ name: 'Update Fail' });
             expect(response.status).toBe(404);
         });

          it('should return 400 for invalid ID', async () => {
             const response = await request(app).put('/api/sponsors/abc').send({ name: 'Update Fail' });
             expect(response.status).toBe(400);
         });
          it('should return 400 for empty body', async () => {
             const response = await request(app).put('/api/sponsors/1').send({});
             expect(response.status).toBe(400);
             expect(response.body.message).toContain('Request body cannot be empty');
         });
    });

    describe('DELETE /api/sponsors/:id', () => {
        it('should deactivate a sponsor (soft delete)', async () => {
            const response = await request(app).delete('/api/sponsors/1');
            expect(response.status).toBe(204); // No Content
            expect(sponsorRepository.setActiveStatus).toHaveBeenCalledWith(1, false);
        });

        it('should return 404 if sponsor not found', async () => {
            (sponsorRepository.setActiveStatus as vi.Mock).mockResolvedValue(null);
            const response = await request(app).delete('/api/sponsors/99');
            expect(response.status).toBe(404);
        });
         it('should return 400 for invalid ID', async () => {
             const response = await request(app).delete('/api/sponsors/abc');
             expect(response.status).toBe(400);
         });
    });

    // --- Affiliation Tests ---
    describe('GET /api/sponsors/:id/affiliations', () => {
        it('should return affiliations for a sponsor', async () => {
            const response = await request(app).get('/api/sponsors/1/affiliations');
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].id).toBe(mockAffiliation.id);
            expect(sponsorRepository.listAffiliations).toHaveBeenCalledWith(1, true); // Default activeOnly=true
        });
        // Add test for ?activeOnly=false
    });
    // Add POST, PUT, DELETE tests for affiliations

    // --- Transparency Tests ---
    describe('GET /api/sponsors/:id/transparency', () => {
        it('should return transparency records for a sponsor', async () => {
            const response = await request(app).get('/api/sponsors/1/transparency');
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].id).toBe(mockTransparency.id);
            expect(sponsorRepository.listTransparencyRecords).toHaveBeenCalledWith(1);
        });
    });
    // Add POST, PUT, POST .../verify tests for transparency

    // --- Conflict Analysis Tests ---
    describe('GET /api/sponsors/:id/conflicts', () => {
        it('should return conflict analysis results', async () => {
            const response = await request(app).get('/api/sponsors/1/conflicts');
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].conflictId).toBe(mockConflictResult.conflictId);
            expect(sponsorConflictAnalysisService.detectConflicts).toHaveBeenCalledWith(1);
        });
    });

    describe('GET /api/sponsors/:id/risk-profile', () => {
        it('should return the sponsor risk profile', async () => {
            const response = await request(app).get('/api/sponsors/1/risk-profile');
            expect(response.status).toBe(200);
            expect(response.body.data.overallScore).toBe(mockRiskProfile.overallScore);
            expect(sponsorConflictAnalysisService.generateRiskProfile).toHaveBeenCalledWith(1);
        });
    });
    // Add tests for GET /conflict-trends, GET /conflicts/all, GET /conflicts/network

    // --- Sponsorship Tests ---
    describe('GET /api/sponsors/:id/sponsored-bills', () => {
         it('should return bills sponsored by the sponsor', async () => {
             const response = await request(app).get('/api/sponsors/1/sponsored-bills');
             expect(response.status).toBe(200);
             expect(response.body.data).toHaveLength(1);
             expect(response.body.data[0].sponsorshipId).toBe(mockSponsorship.id);
             expect(response.body.data[0].bill.id).toBe(101);
             expect(sponsorRepository.listBillSponsorshipsBySponsor).toHaveBeenCalledWith(1, true);
             expect(sponsorRepository.getBillsByIds).toHaveBeenCalledWith([101]);
         });
         // Add test for ?activeOnly=false
     });
    // Add tests for POST /sponsor-bill and DELETE /sponsorships/:sponsorshipId


    // --- Metadata Tests ---
     describe('GET /api/sponsors/meta/parties', () => {
         it('should return unique parties', async () => {
             const response = await request(app).get('/api/sponsors/meta/parties');
             expect(response.status).toBe(200);
             expect(response.body.data.parties).toEqual(['Independent', 'Unity']);
             expect(sponsorRepository.getUniqueParties).toHaveBeenCalled();
         });
     });
     // Add tests for /meta/constituencies and /meta/stats

    // --- Error Handling ---
    describe('Error Handling', () => {
        it('should return 500 for generic repository errors', async () => {
             (sponsorRepository.list as vi.Mock).mockRejectedValue(new Error("Generic DB Error"));
             const response = await request(app).get('/api/sponsors');
             expect(response.status).toBe(500);
             expect(response.body.message).toContain('internal server error');
        });

         it('should return 500 for generic analysis service errors', async () => {
             (sponsorConflictAnalysisService.detectConflicts as vi.Mock).mockRejectedValue(new Error("Analysis Service Error"));
             const response = await request(app).get('/api/sponsors/1/conflicts');
             expect(response.status).toBe(500);
             expect(response.body.message).toContain('internal server error');
         });

    });

});
