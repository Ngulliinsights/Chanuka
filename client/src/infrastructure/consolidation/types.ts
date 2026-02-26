/**
 * Type definitions for infrastructure consolidation
 * 
 * This module defines the data structures used to plan and execute
 * the consolidation of infrastructure modules from 31 to ~20 modules.
 */

/**
 * Impact level of a breaking change
 */
export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Strategy for consolidating modules
 */
export enum ConsolidationStrategy {
  /** Merge all source modules into a single flat structure */
  MERGE = 'MERGE',
  /** Nest source modules as sub-modules under target */
  NEST = 'NEST',
  /** Extract common code and create specialized sub-modules */
  REFACTOR = 'REFACTOR',
  /** Delete module (functionality moved elsewhere or deprecated) */
  DELETE = 'DELETE',
}

/**
 * Type of migration required
 */
export enum MigrationType {
  /** Update import paths to new module locations */
  IMPORT_PATH = 'IMPORT_PATH',
  /** Update API signatures (function/class interfaces changed) */
  API_SIGNATURE = 'API_SIGNATURE',
  /** Restructure module organization */
  MODULE_STRUCTURE = 'MODULE_STRUCTURE',
  /** Update configuration files */
  CONFIGURATION = 'CONFIGURATION',
}

/**
 * Describes a breaking change introduced by consolidation
 */
export interface BreakingChange {
  /** Human-readable description of the breaking change */
  description: string;
  /** Impact level of this change */
  impact: ImpactLevel;
  /** How to mitigate or work around this change */
  mitigation: string;
  /** List of files affected by this change */
  affectedFiles: string[];
}

/**
 * Describes a migration step required for consolidation
 */
export interface Migration {
  /** Source path or pattern (e.g., "@/infrastructure/monitoring") */
  from: string;
  /** Target path or pattern (e.g., "@/infrastructure/observability/error-monitoring") */
  to: string;
  /** Type of migration */
  type: MigrationType;
  /** Whether this migration can be automated */
  automated: boolean;
  /** Optional path to migration script */
  script?: string;
}

/**
 * Maps source modules to a target consolidated module
 */
export interface ConsolidationMapping {
  /** List of source module names to consolidate */
  sourceModules: string[];
  /** Target module name after consolidation */
  targetModule: string;
  /** Strategy to use for consolidation */
  strategy: ConsolidationStrategy;
  /** List of migrations required */
  migrations: Migration[];
  /** List of breaking changes introduced */
  breakingChanges: BreakingChange[];
}

/**
 * Validation result for a consolidation mapping
 */
export interface ValidationResult {
  /** Whether the mapping is valid */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}

/**
 * Complete consolidation plan
 */
export interface ConsolidationPlan {
  /** All consolidation mappings */
  mappings: ConsolidationMapping[];
  /** Overall timeline estimate in weeks */
  timelineWeeks: number;
  /** Total number of modules before consolidation */
  moduleCountBefore: number;
  /** Target number of modules after consolidation */
  moduleCountAfter: number;
}
