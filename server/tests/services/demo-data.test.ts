import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { demoDataService } from '../../infrastructure/demo-data.js';
import { logger } from '@shared/core';

describe('DemoDataService', () => {
  beforeEach(() => {
    // Reset demo mode before each test
    demoDataService.setDemoMode(false);
  });

  describe('Demo Mode Management', () => {
    it('should start with demo mode disabled', () => {
      expect(demoDataService.isDemoMode()).toBe(false);
    });

    it('should enable demo mode when requested', () => {
      demoDataService.setDemoMode(true);
      expect(demoDataService.isDemoMode()).toBe(true);
    });

    it('should disable demo mode when requested', () => {
      demoDataService.setDemoMode(true);
      demoDataService.setDemoMode(false);
      expect(demoDataService.isDemoMode()).toBe(false);
    });
  });

  describe('Bills Data', () => {
    it('should return consistent sample bills', () => {
      const bills = demoDataService.getBills();
      
      expect(bills).toHaveLength(3);
      expect(bills[0]).toMatchObject({
        id: 1,
        title: "Digital Economy and Data Protection Act 2024",
        status: "committee_review",
        category: "technology"
      });
    });

    it('should return bills with required fields', () => {
      const bills = demoDataService.getBills();
      
      bills.forEach(bill => {
        expect(bill).toHaveProperty('id');
        expect(bill).toHaveProperty('title');
        expect(bill).toHaveProperty('description');
        expect(bill).toHaveProperty('status');
        expect(bill).toHaveProperty('category');
        expect(bill).toHaveProperty('tags');
        expect(bill).toHaveProperty('viewCount');
        expect(bill).toHaveProperty('shareCount');
        expect(bill).toHaveProperty('introducedDate');
        expect(bill).toHaveProperty('createdAt');
        expect(bill).toHaveProperty('updatedAt');
      });
    });

    it('should return a specific bill by ID', () => {
      const bill = demoDataService.getBill(1);
      
      expect(bill).toBeDefined();
      expect(bill?.id).toBe(1);
      expect(bill?.title).toBe("Digital Economy and Data Protection Act 2024");
    });

    it('should return null for non-existent bill ID', () => {
      const bill = demoDataService.getBill(999);
      expect(bill).toBeNull();
    });

    it('should search bills by title', () => {
      const results = demoDataService.searchBills('Digital');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Digital');
    });

    it('should search bills by description', () => {
      const results = demoDataService.searchBills('climate');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Climate');
    });

    it('should filter bills by status', () => {
      const results = demoDataService.searchBills('', { status: 'first_reading' });
      
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('first_reading');
    });

    it('should filter bills by category', () => {
      const results = demoDataService.searchBills('', { category: 'healthcare' });
      
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('healthcare');
    });

    it('should combine search and filters', () => {
      const results = demoDataService.searchBills('Act', { 
        status: 'committee_review',
        category: 'technology'
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('Digital Economy');
    });

    it('should return empty array for no matches', () => {
      const results = demoDataService.searchBills('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Sponsors Data', () => {
    it('should return consistent sample sponsors', () => {
      const sponsors = demoDataService.getSponsors();
      
      expect(sponsors).toHaveLength(3);
      expect(sponsors[0]).toMatchObject({
        id: 1,
        name: "Hon. Sarah Mwangi",
        role: "Member of Parliament",
        party: "Democratic Alliance"
      });
    });

    it('should return sponsors with required fields', () => {
      const sponsors = demoDataService.getSponsors();
      
      sponsors.forEach(sponsor => {
        expect(sponsor).toHaveProperty('id');
        expect(sponsor).toHaveProperty('name');
        expect(sponsor).toHaveProperty('role');
        expect(sponsor).toHaveProperty('party');
        expect(sponsor).toHaveProperty('constituency');
        expect(sponsor).toHaveProperty('email');
        expect(sponsor).toHaveProperty('bio');
        expect(sponsor).toHaveProperty('createdAt');
      });
    });

    it('should return a specific sponsor by ID', () => {
      const sponsor = demoDataService.getSponsor(1);
      
      expect(sponsor).toBeDefined();
      expect(sponsor?.id).toBe(1);
      expect(sponsor?.name).toBe("Hon. Sarah Mwangi");
    });

    it('should return null for non-existent sponsor ID', () => {
      const sponsor = demoDataService.getSponsor("nonexistent");
      expect(sponsor).toBeNull();
    });
  });

  describe('Comments Data', () => {
    it('should return comments for existing bills', () => {
      const comments = demoDataService.getBillComments(1);
      
      expect(comments).toHaveLength(2);
      expect(comments[0]).toMatchObject({
        billId: 1,
        commentType: "general"
      });
    });

    it('should return comments with required fields', () => {
      const comments = demoDataService.getBillComments(1);
      
      comments.forEach(comment => {
        expect(comment).toHaveProperty('id');
        expect(comment).toHaveProperty('billId');
        expect(comment).toHaveProperty('userId');
        expect(comment).toHaveProperty('content');
        expect(comment).toHaveProperty('commentType');
        expect(comment).toHaveProperty('upvotes');
        expect(comment).toHaveProperty('downvotes');
        expect(comment).toHaveProperty('isVerified');
        expect(comment).toHaveProperty('createdAt');
        expect(comment).toHaveProperty('updatedAt');
      });
    });

    it('should return empty array for bills with no comments', () => {
      const comments = demoDataService.getBillComments(999);
      expect(comments).toHaveLength(0);
    });

    it('should filter comments by bill ID correctly', () => {
      const bill1Comments = demoDataService.getBillComments(1);
      const bill2Comments = demoDataService.getBillComments(2);
      
      expect(bill1Comments.every(c => c.billId === 1)).toBe(true);
      expect(bill2Comments.every(c => c.billId === 2)).toBe(true);
    });
  });

  describe('Engagement Data', () => {
    it('should return engagement data for existing bills', () => {
      const engagement = demoDataService.getBillEngagement(1);
      
      expect(engagement).toBeDefined();
      expect(engagement?.billId).toBe(1);
      expect(engagement).toHaveProperty('viewCount');
      expect(engagement).toHaveProperty('commentCount');
      expect(engagement).toHaveProperty('shareCount');
    });

    it('should return null for non-existent bills', () => {
      const engagement = demoDataService.getBillEngagement(999);
      expect(engagement).toBeNull();
    });
  });

  describe('Analysis Data', () => {
    it('should return bill analysis for existing bills', () => {
      const analysis = demoDataService.getBillAnalysis(1);
      
      expect(analysis).toBeDefined();
      expect(analysis?.billId).toBe(1);
      expect(analysis).toHaveProperty('complexity');
      expect(analysis).toHaveProperty('transparency');
      expect(analysis).toHaveProperty('conflicts');
      expect(analysis).toHaveProperty('sentiment');
      expect(analysis).toHaveProperty('keyTerms');
    });

    it('should return analysis with proper structure', () => {
      const analysis = demoDataService.getBillAnalysis(1);
      
      expect(analysis?.conflicts).toBeInstanceOf(Array);
      expect(analysis?.keyTerms).toBeInstanceOf(Array);
      expect(analysis?.riskFactors).toBeInstanceOf(Array);
      expect(analysis?.sentiment).toHaveProperty('positive');
      expect(analysis?.sentiment).toHaveProperty('negative');
      expect(analysis?.sentiment).toHaveProperty('neutral');
    });

    it('should return null for non-existent bills', () => {
      const analysis = demoDataService.getBillAnalysis(999);
      expect(analysis).toBeNull();
    });
  });

  describe('Sponsorship Analysis Data', () => {
    it('should return sponsorship analysis for existing bills', () => {
      const analysis = demoDataService.getSponsorshipAnalysis(1);
      
      expect(analysis).toBeDefined();
      expect(analysis?.billId).toBe(1);
      expect(analysis).toHaveProperty('primarySponsor');
      expect(analysis).toHaveProperty('coSponsors');
      expect(analysis).toHaveProperty('totalFinancialExposure');
    });

    it('should return null for non-existent bills', () => {
      const analysis = demoDataService.getSponsorshipAnalysis(999);
      expect(analysis).toBeNull();
    });
  });

  describe('Static Data', () => {
    it('should return bill categories with counts', () => {
      const categories = demoDataService.getBillCategories();
      
      expect(categories).toHaveLength(7);
      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('count');
    });

    it('should return bill statuses with counts', () => {
      const statuses = demoDataService.getBillStatuses();
      
      expect(statuses).toHaveLength(8);
      expect(statuses[0]).toHaveProperty('id');
      expect(statuses[0]).toHaveProperty('name');
      expect(statuses[0]).toHaveProperty('count');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data across multiple calls', () => {
      const bills1 = demoDataService.getBills();
      const bills2 = demoDataService.getBills();
      
      expect(bills1).toEqual(bills2);
    });

    it('should have matching sponsor IDs between bills and sponsors', () => {
      const bills = demoDataService.getBills();
      const sponsors = demoDataService.getSponsors();
      
      bills.forEach(bill => {
        if (bill.sponsorId) {
          const sponsor = sponsors.find(s => s.id === bill.sponsorId);
          expect(sponsor).toBeDefined();
        }
      });
    });

    it('should have valid date objects', () => {
      const bills = demoDataService.getBills();
      
      bills.forEach(bill => {
        expect(bill.introducedDate).toBeInstanceOf(Date);
        expect(bill.createdAt).toBeInstanceOf(Date);
        expect(bill.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should have realistic numeric values', () => {
      const bills = demoDataService.getBills();
      
      bills.forEach(bill => {
        expect(bill.viewCount).toBeGreaterThanOrEqual(0);
        expect(bill.shareCount).toBeGreaterThanOrEqual(0);
        expect(bill.complexityScore).toBeGreaterThanOrEqual(1);
        expect(bill.complexityScore).toBeLessThanOrEqual(10);
      });
    });
  });
});












































