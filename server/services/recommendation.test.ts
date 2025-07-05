import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecommendationService } from './recommendation';

// Mock the database and schema objects
vi.mock('../../../shared/schema', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    prepare: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  };

  return {
    db: mockDb,
    bills: {
      id: 'id',
      title: 'title',
      status: 'status',
      viewCount: 'view_count',
      shareCount: 'share_count',
    },
    billTags: {
      billId: 'bill_id',
      tag: 'tag',
    },
    billEngagement: {
      userId: 'user_id',
      billId: 'bill_id',
      viewCount: 'view_count',
      commentCount: 'comment_count',
      shareCount: 'share_count',
      engagementScore: 'engagement_score',
      lastEngaged: 'last_engaged',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    userInterests: {
      userId: 'user_id',
      interest: 'interest',
    },
    eq,
    and,
    inArray,
    desc,
    sql,
  };
});

describe('RecommendationService', () => {
  let service: RecommendationService;
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Get reference to the mocked db
    mockDb = require('../../../shared/schema').db;

    // Create a new instance of the service
    service = new RecommendationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be instantiable', () => {
    expect(service).toBeDefined();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations based on user interests', async () => {
      // Mock user interests
      mockDb.execute.mockResolvedValueOnce([{ interest: 'healthcare' }, { interest: 'education' }]);

      // Mock user engaged bills
      mockDb.execute.mockResolvedValueOnce([{ billId: 1 }, { billId: 2 }]);

      // Mock recommended bills
      const mockRecommendedBills = [
        {
          bill: {
            id: 3,
            title: 'Healthcare Reform Act',
            status: 'introduced',
            viewCount: 150,
            shareCount: 75,
          },
          score: 8.5,
        },
        {
          bill: {
            id: 4,
            title: 'Education Funding Bill',
            status: 'committee',
            viewCount: 120,
            shareCount: 50,
          },
          score: 7.2,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockRecommendedBills);

      // Call the method
      const result = await service.getPersonalizedRecommendations(1, 5);

      // Verify the result
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(3);
      expect(result[0].title).toBe('Healthcare Reform Act');
      expect(result[0].score).toBe(8.5);
      expect(result[1].id).toBe(4);
      expect(result[1].title).toBe('Education Funding Bill');
      expect(result[1].score).toBe(7.2);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(3);
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should handle empty results gracefully', async () => {
      // Mock empty user interests
      mockDb.execute.mockResolvedValueOnce([]);

      // Mock empty user engaged bills
      mockDb.execute.mockResolvedValueOnce([]);

      // Mock empty recommended bills
      mockDb.execute.mockResolvedValueOnce([]);

      // Call the method
      const result = await service.getPersonalizedRecommendations(1);

      // Verify the result
      expect(result).toEqual([]);
    });
  });

  describe('getSimilarBills', () => {
    it('should return similar bills based on tags and engagement metrics', async () => {
      // Mock bill tags
      mockDb.execute.mockResolvedValueOnce([{ tag: 'healthcare' }, { tag: 'reform' }]);

      // Mock similar bills
      const mockSimilarBills = [
        {
          bill: {
            id: 2,
            title: 'Medical Insurance Reform',
            status: 'committee',
            viewCount: 200,
            shareCount: 80,
          },
          similarityScore: 0.85,
        },
        {
          bill: {
            id: 3,
            title: 'Hospital Funding Act',
            status: 'introduced',
            viewCount: 150,
            shareCount: 60,
          },
          similarityScore: 0.72,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockSimilarBills);

      // Call the method
      const result = await service.getSimilarBills(1, 5);

      // Verify the result
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
      expect(result[0].title).toBe('Medical Insurance Reform');
      expect(result[0].similarityScore).toBe(0.85);
      expect(result[1].id).toBe(3);
      expect(result[1].title).toBe('Hospital Funding Act');
      expect(result[1].similarityScore).toBe(0.72);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when bill has no tags', async () => {
      // Mock empty bill tags
      mockDb.execute.mockResolvedValueOnce([]);

      // Call the method
      const result = await service.getSimilarBills(1);

      // Verify the result
      expect(result).toEqual([]);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTrendingBills', () => {
    it('should return trending bills based on recent engagement metrics', async () => {
      // Mock trending bills
      const mockTrendingBills = [
        {
          bill: {
            id: 1,
            title: 'Popular Bill One',
            status: 'introduced',
            viewCount: 500,
            shareCount: 200,
          },
          trendScore: 25.5,
        },
        {
          bill: {
            id: 2,
            title: 'Popular Bill Two',
            status: 'committee',
            viewCount: 450,
            shareCount: 180,
          },
          trendScore: 22.8,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockTrendingBills);

      // Call the method
      const result = await service.getTrendingBills(7, 5);

      // Verify the result
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('Popular Bill One');
      expect(result[0].trendScore).toBe(25.5);
      expect(result[1].id).toBe(2);
      expect(result[1].title).toBe('Popular Bill Two');
      expect(result[1].trendScore).toBe(22.8);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results gracefully', async () => {
      // Mock empty trending bills
      mockDb.execute.mockResolvedValueOnce([]);

      // Call the method
      const result = await service.getTrendingBills();

      // Verify the result
      expect(result).toEqual([]);
    });
  });

  describe('trackEngagement', () => {
    it('should update existing engagement record', async () => {
      // Mock existing engagement
      const mockExistingEngagement = [
        {
          userId: 1,
          billId: 2,
          viewCount: 5,
          commentCount: 2,
          shareCount: 1,
          engagementScore: 1.7,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockExistingEngagement);

      // Mock update result
      const mockUpdateResult = [
        {
          userId: 1,
          billId: 2,
          viewCount: 6,
          commentCount: 2,
          shareCount: 1,
          engagementScore: 1.8,
        },
      ];
      mockDb.returning.mockResolvedValueOnce(mockUpdateResult);

      // Call the method
      const result = await service.trackEngagement(1, 2, 'view');

      // Verify the result
      expect(result).toEqual(mockUpdateResult);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.set).toHaveBeenCalledTimes(1);
      expect(mockDb.returning).toHaveBeenCalledTimes(1);
    });

    it('should create new engagement record when none exists', async () => {
      // Mock no existing engagement
      mockDb.execute.mockResolvedValueOnce([]);

      // Mock insert result
      const mockInsertResult = [
        {
          userId: 1,
          billId: 2,
          viewCount: 1,
          commentCount: 0,
          shareCount: 0,
          engagementScore: 0.1,
        },
      ];
      mockDb.returning.mockResolvedValueOnce(mockInsertResult);

      // Call the method
      const result = await service.trackEngagement(1, 2, 'view');

      // Verify the result
      expect(result).toEqual(mockInsertResult);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.values).toHaveBeenCalledTimes(1);
      expect(mockDb.returning).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCollaborativeRecommendations', () => {
    it('should return collaborative recommendations based on similar users', async () => {
      // Mock user interests
      mockDb.execute.mockResolvedValueOnce([{ interest: 'healthcare' }, { interest: 'education' }]);

      // Mock similar users
      mockDb.execute.mockResolvedValueOnce([{ userId: 2 }, { userId: 3 }]);

      // Mock engaged bills
      const mockEngagedBills = [
        {
          bill: {
            id: 4,
            title: 'Similar Users Bill One',
            status: 'introduced',
            viewCount: 300,
            shareCount: 120,
          },
          score: 9.2,
        },
        {
          bill: {
            id: 5,
            title: 'Similar Users Bill Two',
            status: 'committee',
            viewCount: 250,
            shareCount: 100,
          },
          score: 8.7,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockEngagedBills);

      // Call the method
      const result = await service.getCollaborativeRecommendations(1, 5);

      // Verify the result
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(4);
      expect(result[0].title).toBe('Similar Users Bill One');
      expect(result[0].score).toBe(9.2);
      expect(result[1].id).toBe(5);
      expect(result[1].title).toBe('Similar Users Bill Two');
      expect(result[1].score).toBe(8.7);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(3);
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should fall back to trending bills when no similar users found', async () => {
      // Mock user interests
      mockDb.execute.mockResolvedValueOnce([{ interest: 'healthcare' }, { interest: 'education' }]);

      // Mock no similar users
      mockDb.execute.mockResolvedValueOnce([]);

      // Mock trending bills (fallback)
      const mockTrendingBills = [
        {
          bill: {
            id: 1,
            title: 'Trending Bill One',
            status: 'introduced',
            viewCount: 500,
            shareCount: 200,
          },
          trendScore: 25.5,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockTrendingBills);

      // Call the method
      const result = await service.getCollaborativeRecommendations(1, 5);

      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('Trending Bill One');
      expect(result[0].trendScore).toBe(25.5);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(3);
      expect(mockDb.execute).toHaveBeenCalledTimes(3);
    });

    it('should fall back to trending bills when no user interests found', async () => {
      // Mock no user interests
      mockDb.execute.mockResolvedValueOnce([]);

      // Mock trending bills (fallback)
      const mockTrendingBills = [
        {
          bill: {
            id: 1,
            title: 'Trending Bill One',
            status: 'introduced',
            viewCount: 500,
            shareCount: 200,
          },
          trendScore: 25.5,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(mockTrendingBills);

      // Call the method
      const result = await service.getCollaborativeRecommendations(1, 5);

      // Verify the result
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('Trending Bill One');
      expect(result[0].trendScore).toBe(25.5);

      // Verify the database calls
      expect(mockDb.select).toHaveBeenCalledTimes(2);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });
  });
});
