// Mock transparency dashboard service for testing
export const transparencyDashboardService = {
  getTransparencyDashboard: async () => {
    return {
      summary: {
        averageTransparencyScore: 75,
        totalSponsors: 10,
        totalDisclosures: 50,
        verificationRate: 80,
        riskDistribution: { low: 3, medium: 4, high: 2, critical: 1 }
      },
      recentReports: [],
      topRisks: [],
      trendingPatterns: [],
      systemHealth: {
        dataFreshness: 95,
        processingStatus: 'healthy',
        lastUpdate: new Date(),
        alertCount: 0
      }
    };
  },

  calculateTransparencyScore: async (sponsor_id) => {
    return {
      overallScore: 75,
      componentScores: {
        disclosure_completeness: 80,
        verification_status: 70,
        conflict_resolution: 75,
        data_recency: 85,
        public_accessibility: 60
      },
      riskLevel: 'medium',
      recommendations: ['Improve verification rate', 'Update disclosure completeness'],
      lastCalculated: new Date()
    };
  },

  analyzeTransparencyTrends: async (sponsor_id, timeframe = 'monthly') => {
    return {
      trends: [
        { period: '2024-01', transparency_score: 70, riskLevel: 'medium', disclosureCount: 5, verificationRate: 75, conflictCount: 2 },
        { period: '2024-02', transparency_score: 75, riskLevel: 'medium', disclosureCount: 6, verificationRate: 80, conflictCount: 1 }
      ],
      analysis: {
        overallTrend: 'improving',
        trendStrength: 5,
        keyChanges: [],
        predictions: []
      },
      recommendations: ['Continue current practices']
    };
  },

  generateTransparencyReport: async (startDate, endDate) => {
    return {
      id: 'test-report-123',
      title: 'Transparency Report',
      reportPeriod: { startDate, endDate },
      generatedAt: new Date(),
      executiveSummary: {
        totalSponsors: 10,
        averageTransparencyScore: 75,
        highRiskSponsors: 3,
        totalDisclosures: 50,
        verificationRate: 80,
        trendDirection: 'stable'
      },
      sponsorAnalysis: [],
      conflictPatterns: [],
      recommendations: ['Monitor high-risk sponsors']
    };
  },

  createConflictMapping: async () => {
    return {
      nodes: [],
      edges: [],
      clusters: [],
      metrics: {
        totalNodes: 0,
        totalEdges: 0,
        density: 0,
        clustering: 0,
        centralityScores: {},
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
      }
    };
  }
};