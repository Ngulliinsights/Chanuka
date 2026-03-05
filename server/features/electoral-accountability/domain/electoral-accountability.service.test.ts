/**
 * Electoral Accountability Service Tests
 * 
 * Unit tests for the core electoral accountability business logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElectoralAccountabilityService } from './electoral-accountability.service';
import {
  GAP_SEVERITY_LABELS,
  VOTE_SCORES,
  SENTIMENT_POSITIONS,
} from './electoral-accountability.constants';
import {
  VotingRecordNotFoundError,
  SentimentNotFoundError,
  InvalidVoteError,
  InvalidSentimentScoreError,
  InvalidDateRangeError,
} from './electoral-accountability.errors';

// Mock database
vi.mock('@server/infrastructure/database', () => ({
  db: {
    query: {
      voting_records: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      constituency_sentiment: {
        findFirst: vi.fn(),
      },
      representative_gap_analysis: {
        findMany: vi.fn(),
      },
      electoral_pressure_campaigns: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock logger
vi.mock('@server/infrastructure/observability', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ElectoralAccountabilityService', () => {
  let service: ElectoralAccountabilityService;

  beforeEach(() => {
    service = new ElectoralAccountabilityService();
    vi.clearAllMocks();
  });

  describe('calculateAlignmentGap', () => {
    it('should calculate gap correctly for YES vote with strong support', () => {
      // YES vote (100) vs strong support sentiment (+80 -> normalized 90)
      // Gap should be |100 - 90| = 10
      const gap = (service as any).calculateAlignmentGap('yes', 80);
      expect(gap).toBe(10);
    });

    it('should calculate gap correctly for NO vote with strong opposition', () => {
      // NO vote (0) vs strong opposition sentiment (-80 -> normalized 10)
      // Gap should be |0 - 10| = 10
      const gap = (service as any).calculateAlignmentGap('no', -80);
      expect(gap).toBe(10);
    });

    it('should calculate gap correctly for misaligned vote', () => {
      // YES vote (100) vs strong opposition sentiment (-80 -> normalized 10)
      // Gap should be |100 - 10| = 90
      const gap = (service as any).calculateAlignmentGap('yes', -80);
      expect(gap).toBe(90);
    });

    it('should handle abstain vote as neutral', () => {
      // ABSTAIN vote (50) vs neutral sentiment (0 -> normalized 50)
      // Gap should be |50 - 50| = 0
      const gap = (service as any).calculateAlignmentGap('abstain', 0);
      expect(gap).toBe(0);
    });

    it('should throw error for invalid vote', () => {
      expect(() => {
        (service as any).calculateAlignmentGap('invalid', 50);
      }).toThrow(InvalidVoteError);
    });

    it('should throw error for out-of-range sentiment score', () => {
      expect(() => {
        (service as any).calculateAlignmentGap('yes', 150);
      }).toThrow(InvalidSentimentScoreError);
    });
  });

  describe('determineGapSeverity', () => {
    it('should classify gap as critical when >= 75', () => {
      const severity = (service as any).determineGapSeverity(75);
      expect(severity).toBe(GAP_SEVERITY_LABELS.CRITICAL);
    });

    it('should classify gap as high when >= 50 and < 75', () => {
      const severity = (service as any).determineGapSeverity(60);
      expect(severity).toBe(GAP_SEVERITY_LABELS.HIGH);
    });

    it('should classify gap as medium when >= 25 and < 50', () => {
      const severity = (service as any).determineGapSeverity(35);
      expect(severity).toBe(GAP_SEVERITY_LABELS.MEDIUM);
    });

    it('should classify gap as low when < 25', () => {
      const severity = (service as any).determineGapSeverity(15);
      expect(severity).toBe(GAP_SEVERITY_LABELS.LOW);
    });
  });

  describe('calculateElectoralRisk', () => {
    it('should increase risk in final year before election', () => {
      const baseRisk = (service as any).calculateElectoralRisk(50, 365, 100);
      const normalRisk = (service as any).calculateElectoralRisk(50, 1000, 100);
      expect(baseRisk).toBeGreaterThan(normalRisk);
    });

    it('should increase risk in second-to-last year', () => {
      const secondYearRisk = (service as any).calculateElectoralRisk(50, 730, 100);
      const normalRisk = (service as any).calculateElectoralRisk(50, 1000, 100);
      expect(secondYearRisk).toBeGreaterThan(normalRisk);
    });

    it('should reduce risk for low sample size', () => {
      const lowSampleRisk = (service as any).calculateElectoralRisk(50, 1000, 30);
      const normalRisk = (service as any).calculateElectoralRisk(50, 1000, 100);
      expect(lowSampleRisk).toBeLessThan(normalRisk);
    });

    it('should increase risk for high sample size', () => {
      const highSampleRisk = (service as any).calculateElectoralRisk(50, 1000, 600);
      const normalRisk = (service as any).calculateElectoralRisk(50, 1000, 100);
      expect(highSampleRisk).toBeGreaterThan(normalRisk);
    });

    it('should cap risk at 100', () => {
      const risk = (service as any).calculateElectoralRisk(90, 100, 1000);
      expect(risk).toBeLessThanOrEqual(100);
    });
  });

  describe('isMisaligned', () => {
    it('should detect misalignment for YES vote with strong opposition', () => {
      const misaligned = (service as any).isMisaligned('yes', -80);
      expect(misaligned).toBe(true);
    });

    it('should detect misalignment for NO vote with strong support', () => {
      const misaligned = (service as any).isMisaligned('no', 80);
      expect(misaligned).toBe(true);
    });

    it('should not detect misalignment for aligned votes', () => {
      const misaligned = (service as any).isMisaligned('yes', 80);
      expect(misaligned).toBe(false);
    });

    it('should not detect misalignment for neutral positions', () => {
      const misaligned = (service as any).isMisaligned('abstain', 0);
      expect(misaligned).toBe(false);
    });
  });

  describe('getConstituentPosition', () => {
    it('should return support for positive sentiment > 20', () => {
      const position = (service as any).getConstituentPosition(50);
      expect(position).toBe(SENTIMENT_POSITIONS.SUPPORT);
    });

    it('should return oppose for negative sentiment < -20', () => {
      const position = (service as any).getConstituentPosition(-50);
      expect(position).toBe(SENTIMENT_POSITIONS.OPPOSE);
    });

    it('should return neutral for sentiment between -20 and 20', () => {
      const position = (service as any).getConstituentPosition(10);
      expect(position).toBe(SENTIMENT_POSITIONS.NEUTRAL);
    });
  });

  describe('voteToScore', () => {
    it('should convert YES to 100', () => {
      const score = (service as any).voteToScore('yes');
      expect(score).toBe(VOTE_SCORES.YES);
    });

    it('should convert NO to 0', () => {
      const score = (service as any).voteToScore('no');
      expect(score).toBe(VOTE_SCORES.NO);
    });

    it('should convert ABSTAIN to 50', () => {
      const score = (service as any).voteToScore('abstain');
      expect(score).toBe(VOTE_SCORES.ABSTAIN);
    });

    it('should convert ABSENT to 50', () => {
      const score = (service as any).voteToScore('absent');
      expect(score).toBe(VOTE_SCORES.ABSENT);
    });

    it('should handle case-insensitive input', () => {
      expect((service as any).voteToScore('YES')).toBe(VOTE_SCORES.YES);
      expect((service as any).voteToScore('No')).toBe(VOTE_SCORES.NO);
    });
  });

  describe('generateCampaignSlug', () => {
    it('should generate slug from campaign name', () => {
      const slug = (service as any).generateCampaignSlug('Hold MP Accountable');
      expect(slug).toMatch(/^hold-mp-accountable-\d+$/);
    });

    it('should handle special characters', () => {
      const slug = (service as any).generateCampaignSlug('Test Campaign! @#$%');
      expect(slug).toMatch(/^test-campaign-\d+$/);
    });

    it('should handle multiple spaces', () => {
      const slug = (service as any).generateCampaignSlug('Test   Multiple   Spaces');
      expect(slug).toMatch(/^test-multiple-spaces-\d+$/);
    });
  });

  describe('calculateOverallElectoralRisk', () => {
    it('should calculate average risk from multiple gaps', () => {
      const gaps = [
        { electoral_risk_score: '50' },
        { electoral_risk_score: '70' },
        { electoral_risk_score: '60' },
      ] as any[];

      const avgRisk = (service as any).calculateOverallElectoralRisk(gaps);
      expect(avgRisk).toBe(60);
    });

    it('should return 0 for empty gaps array', () => {
      const avgRisk = (service as any).calculateOverallElectoralRisk([]);
      expect(avgRisk).toBe(0);
    });

    it('should handle null risk scores', () => {
      const gaps = [
        { electoral_risk_score: '50' },
        { electoral_risk_score: null },
        { electoral_risk_score: '70' },
      ] as any[];

      const avgRisk = (service as any).calculateOverallElectoralRisk(gaps);
      expect(avgRisk).toBeGreaterThan(0);
    });
  });
});

describe('ElectoralAccountabilityService - Validation', () => {
  let service: ElectoralAccountabilityService;

  beforeEach(() => {
    service = new ElectoralAccountabilityService();
  });

  describe('Date Range Validation', () => {
    it('should throw error when start date is after end date', async () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      await expect(
        service.getMPVotingRecord('sponsor-id', { startDate, endDate })
      ).rejects.toThrow(InvalidDateRangeError);
    });

    it('should accept valid date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Should not throw
      await expect(
        service.getMPVotingRecord('sponsor-id', { startDate, endDate })
      ).resolves.toBeDefined();
    });
  });
});
