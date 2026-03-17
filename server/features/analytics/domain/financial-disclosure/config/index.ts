// Financial Disclosure Configuration
// Configuration constants and settings for disclosure validation

export const FinancialDisclosureConfig = {
  requiredTypes: [
    'income',
    'assets',
    'liabilities',
    'investments',
    'gifts',
    'travel',
    'employment'
  ],
  
  completenessWeights: {
    requiredDisclosures: 0.4,
    verification_status: 0.25,
    dataRecency: 0.2,
    detailCompleteness: 0.15
  },
  
  riskThresholds: {
    disclosureAge: {
      current: 30, // days
      recent: 90,
      stale: 365
    }
  },
  
  analytics: {
    recencyDecayRate: 0.01 // decay rate for recency scoring
  },
  
  cache: {
    keyPrefixes: {
      completeness: (sponsorId: number) => `disclosure:completeness:${sponsorId}`
    },
    ttl: {
      analyticsReport: 3600 // 1 hour in seconds
    }
  }
};