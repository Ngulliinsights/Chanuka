/**
 * Constitutional Intelligence Domain Layer Exports
 * 
 * Pure domain logic for constitutional analysis.
 */

// Entities
export { 
  ConstitutionalProvision, 
  ConstitutionalProvisionEntity, 
  ConstitutionalReference,
  CreateProvisionInput 
} from './entities/constitutional-provision.entity';

export { 
  ConstitutionalAnalysis, 
  ConstitutionalAnalysisEntity, 
  CreateAnalysisInput,
  AnalysisType,
  ViolationType,
  PotentialViolation 
} from './entities/constitutional-analysis.entity';

// Domain Services
export { ViolationDetectorService, ViolationPattern } from './services/violation-detector.service';
export { ProvisionMatcherService, ProvisionMatch } from './services/provision-matcher.service';
