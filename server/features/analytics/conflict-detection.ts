/**
 * Legacy Conflict Detection Service
 * 
 * This file maintains backward compatibility while delegating to the new
 * decomposed conflict detection services. New code should use the services from
 * the ./conflict-detection/ directory directly.
 * 
 * @deprecated Use conflictDetectionOrchestratorService from './conflict-detection/index.js' instead
 */

import { logger  } from '@shared/core/src/index.js';
import {
  conflictDetectionOrchestratorService,
  ConflictAnalysis,
  FinancialConflict,
  ProfessionalConflict,
  VotingAnomaly,
  ConflictDetectionConfig,
  ConflictDetectionError,
  Stakeholder
} from './conflict-detection/index.js';

// Re-export types for backward compatibility
export type {
  ConflictAnalysis,
  FinancialConflict,
  ProfessionalConflict,
  VotingAnomaly,
  ConflictDetectionConfig,
  Stakeholder
} from './conflict-detection/index.js';

export { ConflictDetectionError } from './conflict-detection/index.js';

/**
 * Legacy EnhancedConflictDetectionService wrapper
 * 
 * @deprecated Use conflictDetectionOrchestratorService directly instead
 */
export class EnhancedConflictDetectionService {
  private static instance: EnhancedConflictDetectionService;

  public static getInstance(): EnhancedConflictDetectionService {
    if (!EnhancedConflictDetectionService.instance) {
      EnhancedConflictDetectionService.instance = new EnhancedConflictDetectionService();
    }
    return EnhancedConflictDetectionService.instance;
  }

  /**
   * @deprecated Use conflictDetectionOrchestratorService.performComprehensiveAnalysis() instead
   */
  async performComprehensiveAnalysis(
    sponsor_id: number,
    bill_id?: number
  ): Promise<ConflictAnalysis> { return conflictDetectionOrchestratorService.performComprehensiveAnalysis(sponsor_id, bill_id);
   }

  /**
   * @deprecated Use conflictDetectionOrchestratorService.invalidateSponsorCache() instead
   */
  async invalidateSponsorCache(sponsor_id: number): Promise<void> {
    return conflictDetectionOrchestratorService.invalidateSponsorCache(sponsor_id);
  }

  /**
   * @deprecated Use conflictDetectionOrchestratorService.analyzeStakeholders() instead
   */
  async analyzeStakeholders(bill_id: number): Promise<{
    stakeholders: Stakeholder[];
    conflicts: Array<{
      stakeholder1: Stakeholder;
      stakeholder2: Stakeholder;
      conflictType: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }> { return conflictDetectionOrchestratorService.analyzeStakeholders(bill_id);
   }

  /**
   * @deprecated Use conflictDetectionOrchestratorService.generateMitigationStrategies() instead
   */
  async generateMitigationStrategies(
    sponsor_id: number,
    bill_id?: number
  ): Promise<Array<{
    conflictId: string;
    strategy: string;
    timeline: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    stakeholders: string[];
  }>> { return conflictDetectionOrchestratorService.generateMitigationStrategies(sponsor_id, bill_id);
   }
}

/**
 * Singleton instance of the enhanced conflict detection service.
 * @deprecated Use conflictDetectionOrchestratorService from './conflict-detection/index.js' instead
 */
export const enhancedConflictDetectionService = EnhancedConflictDetectionService.getInstance();