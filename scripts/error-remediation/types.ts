/**
 * Type definitions for the Error Remediation System
 */

export enum ErrorCategory {
  MODULE_RESOLUTION = "MODULE_RESOLUTION",
  EXPORT_PATH = "EXPORT_PATH",
  ID_TYPE = "ID_TYPE",
  INTERFACE_COMPLETION = "INTERFACE_COMPLETION",
  ERROR_CONSTRUCTOR = "ERROR_CONSTRUCTOR",
  EXPLICIT_TYPES = "EXPLICIT_TYPES",
  TYPE_COMPARISON = "TYPE_COMPARISON",
  INTERFACE_COMPATIBILITY = "INTERFACE_COMPATIBILITY",
  EXPORT_DISAMBIGUATION = "EXPORT_DISAMBIGUATION",
  UNDEFINED_SAFETY = "UNDEFINED_SAFETY",
  ENUM_LITERAL = "ENUM_LITERAL",
  PAGINATION = "PAGINATION",
  HTTP_STATUS = "HTTP_STATUS",
  NAMING_CONSISTENCY = "NAMING_CONSISTENCY",
  IMPORT_CLEANUP = "IMPORT_CLEANUP",
  TYPE_ASSERTION = "TYPE_ASSERTION"
}

export enum Severity {
  CRITICAL = "CRITICAL",  // Blocks compilation
  HIGH = "HIGH",          // Breaks functionality
  MEDIUM = "MEDIUM",      // Type safety issues
  LOW = "LOW"             // Code quality
}

export enum FixPhase {
  MODULE_LOCATION_DISCOVERY = 1,
  IMPORT_PATH_UPDATES = 2,
  TYPE_STANDARDIZATION = 3,
  INTERFACE_COMPLETION = 4,
  TYPE_SAFETY = 5,
  IMPORT_CLEANUP_AND_VALIDATION = 6
}

export interface TypeScriptError {
  code: string; // e.g., "TS2307"
  message: string;
  file: string;
  line: number;
  column: number;
  severity: Severity;
  category: ErrorCategory;
}

export interface ErrorReport {
  totalErrors: number;
  errorsByCategory: Map<ErrorCategory, TypeScriptError[]>;
  errorsByFile: Map<string, TypeScriptError[]>;
  errorsBySeverity: Map<Severity, TypeScriptError[]>;
}

export interface FSDLocation {
  path: string;
  layer: 'app' | 'features' | 'core' | 'lib' | 'shared';
  feature?: string;
  segment?: string;
}

export interface ModuleRelocationMap {
  relocations: Map<string, FSDLocation>;
  deletedModules: string[];
  consolidations: Map<string, string[]>;
}

export interface PathMigrationMap {
  migrations: Map<string, string>;
  confidence: Map<string, number>;
  ambiguous: Map<string, string[]>;
}

export interface Fix {
  id: string;
  category: ErrorCategory;
  description: string;
  apply(): Promise<FixResult>;
}

export interface ImportPathFix extends Fix {
  file: string;
  oldImportPath: string;
  newImportPath: string;
  importedNames: string[];
}

export interface TypeConsolidationFix extends Fix {
  canonicalPath: string;
  canonicalName: string;
  duplicates: Array<{
    path: string;
    name: string;
  }>;
  affectedImports: Array<{
    file: string;
    oldImport: string;
    newImport: string;
  }>;
}

export interface TypeFix extends Fix {
  file: string;
  location: CodeLocation;
  oldType: string;
  newType: string;
  migrationPattern?: MigrationPattern;
}

export interface InterfaceFix extends Fix {
  interfaceName: string;
  file: string;
  properties: PropertyDefinition[];
}

export interface CodeLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface FixResult {
  success: boolean;
  filesModified: string[];
  errorsFixed: string[];
  newErrors: string[];
}

export interface FixBatch {
  id: string;
  phase: FixPhase;
  fixes: Fix[];
  dependencies: string[];
}

export interface BatchResult {
  batchId: string;
  success: boolean;
  fixesApplied: number;
  errorsFixed: number;
  newErrors: number;
  validationResult: ValidationResult;
}

export interface ValidationResult {
  success: boolean;
  errorCount: number;
  errors: TypeScriptError[];
  warnings: TypeScriptWarning[];
}

export interface TypeScriptWarning {
  code: string;
  message: string;
  file: string;
  line: number;
  column: number;
}

export interface MigrationPattern {
  name: string;
  description: string;
  before: string;
  after: string;
  automated: boolean;
}

export interface RemediationStatus {
  currentPhase: FixPhase;
  totalErrors: number;
  errorsFixed: number;
  errorsRemaining: number;
  phaseProgress: Map<FixPhase, PhaseStatus>;
}

export interface PhaseStatus {
  phase: FixPhase;
  status: "not_started" | "in_progress" | "completed" | "failed";
  errorsAtStart: number;
  errorsFixed: number;
  errorsRemaining: number;
  batchesCompleted: number;
  batchesTotal: number;
}

export interface ProgressReport {
  summary: RemediationStatus;
  phaseDetails: PhaseStatus[];
  errorsByCategory: Map<ErrorCategory, number>;
  filesModified: string[];
  timestamp: Date;
}

export interface CompatibilityReport {
  compatible: boolean;
  breakingChanges: BreakingChange[];
  migrationRequired: boolean;
  migrationPatterns: MigrationPattern[];
}

export interface BreakingChange {
  type: "type_change" | "interface_change" | "export_removal";
  location: string;
  description: string;
  affectedCode: string[];
  migrationPattern: MigrationPattern;
}

export interface FailureAnalysis {
  failedFix: Fix;
  newErrors: TypeScriptError[];
  rootCause: string;
  suggestedRefinement: string;
}

export interface TypeChange {
  type: 'addition' | 'removal' | 'signature_change' | 'type_change';
  name: string;
  location: string;
  oldSignature?: string;
  newSignature?: string;
  affectedFiles?: string[];
}
