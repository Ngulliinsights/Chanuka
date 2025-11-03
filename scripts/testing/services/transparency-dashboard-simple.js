// Mock simple transparency dashboard service for testing
export const simpleTransparencyDashboardService = {
  getTransparencyDashboard: async () => {
    return {
      summary: {
        averageTransparencyScore: 70,
        totalSponsors: 8,
        totalDisclosures: 40,
        verificationRate: 75,
        riskDistribution: { low: 2, medium: 3, high: 2, critical: 1 }
      },
      recentReports: [],
      topRisks: [],
      trendingPatterns: [],
      systemHealth: {
        dataFreshness: 90,
        processingStatus: 'healthy',
        lastUpdate: new Date(),
        alertCount: 1
      }
    };
  },

  calculateTransparencyScore: async (sponsor_id) => {
    return {
      overallScore: 70,
      componentScores: {
        disclosure_completeness: 75,
        verification_status: 65,
        conflict_resolution: 70,
        data_recency: 80,
        public_accessibility: 55
      },
      riskLevel: 'medium',
      recommendations: ['Increase verification rate', 'Complete missing disclosures'],
      lastCalculated: new Date()
    };
  },

  analyzeTransparencyTrends: async (sponsor_id, timeframe = 'monthly') => {
    return {
      trends: [
        { period: '2024-01', transparency_score: 65, riskLevel: 'medium', disclosureCount: 4, verificationRate: 70, conflictCount: 3 },
        { period: '2024-02', transparency_score: 70, riskLevel: 'medium', disclosureCount: 5, verificationRate: 75, conflictCount: 2 }
      ],
      analysis: {
        overallTrend: 'improving',
        trendStrength: 5,
        keyChanges: [],
        predictions: []
      },
      recommendations: ['Maintain monitoring practices']
    };
  }
};