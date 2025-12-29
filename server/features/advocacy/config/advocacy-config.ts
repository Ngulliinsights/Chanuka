// ============================================================================
// ADVOCACY COORDINATION - Configuration
// ============================================================================

export interface AdvocacyConfig {
  campaigns: {
    maxParticipants: number;
    maxDurationDays: number;
    autoApprovalThreshold: number;
    moderationRequired: boolean;
  };
  actions: {
    maxActionsPerUser: number;
    defaultReminderDays: number;
    maxBulkActions: number;
    timeoutMinutes: number;
  };
  notifications: {
    enableEmail: boolean;
    enableSMS: boolean;
    enablePush: boolean;
    enableUSSD: boolean;
    batchSize: number;
    retryAttempts: number;
  };
  representatives: {
    contactCacheHours: number;
    responseTimeoutSeconds: number;
    maxContactsPerAction: number;
  };
  coalitions: {
    minAlignmentScore: number;
    maxCoalitionSize: number;
    autoSuggestThreshold: number;
  };
  impact: {
    trackingWindowDays: number;
    attributionThreshold: number;
    reportingFrequencyDays: number;
  };
  moderation: {
    autoFlagKeywords: string[];
    reviewQueueLimit: number;
    escalationThreshold: number;
  };
  performance: {
    cacheEnabled: boolean;
    cacheTTLMinutes: number;
    batchProcessingSize: number;
    asyncProcessing: boolean;
  };
}

export const PRODUCTION_CONFIG: AdvocacyConfig = {
  campaigns: {
    maxParticipants: 10000,
    maxDurationDays: 365,
    autoApprovalThreshold: 100,
    moderationRequired: true
  },
  actions: {
    maxActionsPerUser: 50,
    defaultReminderDays: 3,
    maxBulkActions: 1000,
    timeoutMinutes: 30
  },
  notifications: {
    enableEmail: true,
    enableSMS: true,
    enablePush: true,
    enableUSSD: true,
    batchSize: 100,
    retryAttempts: 3
  },
  representatives: {
    contactCacheHours: 24,
    responseTimeoutSeconds: 30,
    maxContactsPerAction: 5
  },
  coalitions: {
    minAlignmentScore: 0.7,
    maxCoalitionSize: 10,
    autoSuggestThreshold: 0.8
  },
  impact: {
    trackingWindowDays: 90,
    attributionThreshold: 0.6,
    reportingFrequencyDays: 7
  },
  moderation: {
    autoFlagKeywords: [
      'hate', 'violence', 'illegal', 'fraud', 'spam', 'scam',
      'harassment', 'threat', 'abuse', 'discrimination'
    ],
    reviewQueueLimit: 1000,
    escalationThreshold: 5
  },
  performance: {
    cacheEnabled: true,
    cacheTTLMinutes: 60,
    batchProcessingSize: 100,
    asyncProcessing: true
  }
};

export const DEVELOPMENT_CONFIG: AdvocacyConfig = {
  campaigns: {
    maxParticipants: 100,
    maxDurationDays: 90,
    autoApprovalThreshold: 10,
    moderationRequired: false
  },
  actions: {
    maxActionsPerUser: 20,
    defaultReminderDays: 1,
    maxBulkActions: 50,
    timeoutMinutes: 60
  },
  notifications: {
    enableEmail: true,
    enableSMS: false,
    enablePush: false,
    enableUSSD: false,
    batchSize: 10,
    retryAttempts: 1
  },
  representatives: {
    contactCacheHours: 1,
    responseTimeoutSeconds: 60,
    maxContactsPerAction: 3
  },
  coalitions: {
    minAlignmentScore: 0.5,
    maxCoalitionSize: 5,
    autoSuggestThreshold: 0.6
  },
  impact: {
    trackingWindowDays: 30,
    attributionThreshold: 0.4,
    reportingFrequencyDays: 1
  },
  moderation: {
    autoFlagKeywords: ['test-flag'],
    reviewQueueLimit: 50,
    escalationThreshold: 2
  },
  performance: {
    cacheEnabled: false,
    cacheTTLMinutes: 5,
    batchProcessingSize: 10,
    asyncProcessing: false
  }
};

export const TEST_CONFIG: AdvocacyConfig = {
  campaigns: {
    maxParticipants: 10,
    maxDurationDays: 7,
    autoApprovalThreshold: 1,
    moderationRequired: false
  },
  actions: {
    maxActionsPerUser: 5,
    defaultReminderDays: 0,
    maxBulkActions: 5,
    timeoutMinutes: 5
  },
  notifications: {
    enableEmail: false,
    enableSMS: false,
    enablePush: false,
    enableUSSD: false,
    batchSize: 1,
    retryAttempts: 0
  },
  representatives: {
    contactCacheHours: 0,
    responseTimeoutSeconds: 5,
    maxContactsPerAction: 1
  },
  coalitions: {
    minAlignmentScore: 0.3,
    maxCoalitionSize: 2,
    autoSuggestThreshold: 0.4
  },
  impact: {
    trackingWindowDays: 1,
    attributionThreshold: 0.2,
    reportingFrequencyDays: 1
  },
  moderation: {
    autoFlagKeywords: [],
    reviewQueueLimit: 5,
    escalationThreshold: 1
  },
  performance: {
    cacheEnabled: false,
    cacheTTLMinutes: 1,
    batchProcessingSize: 1,
    asyncProcessing: false
  }
};

export function getAdvocacyConfig(): AdvocacyConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'test':
      return TEST_CONFIG;
    default:
      return DEVELOPMENT_CONFIG;
  }
}

export function getAdvocacyConfigForEnvironment(environment: string): AdvocacyConfig {
  switch (environment) {
    case 'production':
      return PRODUCTION_CONFIG;
    case 'test':
      return TEST_CONFIG;
    default:
      return DEVELOPMENT_CONFIG;
  }
}

// Jurisdiction-specific configurations
export interface JurisdictionAdvocacyConfig {
  name: string;
  representativeStructure: {
    levels: string[];
    contactMethods: string[];
    formalityLevel: 'formal' | 'informal' | 'mixed';
  };
  campaignRegulations: {
    registrationRequired: boolean;
    fundingDisclosure: boolean;
    participantLimits: boolean;
  };
  culturalFactors: {
    hierarchicalRespect: boolean;
    consensusOriented: boolean;
    directCommunication: boolean;
  };
  legalConstraints: {
    lobbyingLaws: boolean;
    protestRegulations: boolean;
    onlineActivismRules: boolean;
  };
}

export const JURISDICTION_CONFIGS: Record<string, JurisdictionAdvocacyConfig> = {
  kenya: {
    name: 'Republic of Kenya',
    representativeStructure: {
      levels: ['MP', 'Senator', 'Governor', 'MCA', 'Ward Representative'],
      contactMethods: ['email', 'phone', 'office_visit', 'public_forum'],
      formalityLevel: 'formal'
    },
    campaignRegulations: {
      registrationRequired: false,
      fundingDisclosure: true,
      participantLimits: false
    },
    culturalFactors: {
      hierarchicalRespect: true,
      consensusOriented: true,
      directCommunication: false
    },
    legalConstraints: {
      lobbyingLaws: false,
      protestRegulations: true,
      onlineActivismRules: false
    }
  },
  
  generic: {
    name: 'Generic Democracy',
    representativeStructure: {
      levels: ['Representative', 'Senator', 'Local Councilor'],
      contactMethods: ['email', 'phone', 'office_visit'],
      formalityLevel: 'mixed'
    },
    campaignRegulations: {
      registrationRequired: false,
      fundingDisclosure: false,
      participantLimits: false
    },
    culturalFactors: {
      hierarchicalRespect: false,
      consensusOriented: true,
      directCommunication: true
    },
    legalConstraints: {
      lobbyingLaws: false,
      protestRegulations: false,
      onlineActivismRules: false
    }
  }
};

export function getJurisdictionAdvocacyConfig(jurisdiction: string = 'generic'): JurisdictionAdvocacyConfig {
  return JURISDICTION_CONFIGS[jurisdiction] || JURISDICTION_CONFIGS.generic;
}


