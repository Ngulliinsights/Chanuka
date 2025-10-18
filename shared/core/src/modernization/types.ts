import { z } from 'zod';
import { logger } from '../observability/logging';

// Core modernization types
export interface ModernizationTask {
  id: string;
  name: string;
  description: string;
  phase: ModernizationPhase;
  dependencies: string[];
  estimatedDuration: number;
  priority: TaskPriority;
  status: TaskStatus;
  metadata?: Record<string, unknown>;
}

export enum ModernizationPhase {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  BACKUP = 'backup',
  EXECUTION = 'execution',
  VALIDATION = 'validation',
  ROLLBACK = 'rollback',
  COMPLETE = 'complete'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ROLLED_BACK = 'rolled_back'
}

// Analysis types
export interface AnalysisResult {
  id: string;
  timestamp: Date;
  type: AnalysisType;
  scope: string[];
  findings: Finding[];
  recommendations: Recommendation[];
  metrics: AnalysisMetrics;
}

export enum AnalysisType {
  ROOT_DIRECTORY_CLEANUP = 'root_directory_cleanup',
  AI_INTEGRATION = 'ai_integration',
  UTILITIES_MIGRATION = 'utilities_migration',
  DEPENDENCY_ANALYSIS = 'dependency_analysis',
  PERFORMANCE_ANALYSIS = 'performance_analysis'
}

export interface Finding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  description: string;
  location: string;
  impact: string;
  effort: number;
  metadata?: Record<string, unknown>;
}

export enum FindingType {
  REDUNDANT_FILE = 'redundant_file',
  OBSOLETE_CODE = 'obsolete_code',
  MISSING_INTEGRATION = 'missing_integration',
  PERFORMANCE_ISSUE = 'performance_issue',
  SECURITY_CONCERN = 'security_concern',
  DEPENDENCY_CONFLICT = 'dependency_conflict'
}

export enum FindingSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  action: RecommendedAction;
  priority: TaskPriority;
  estimatedEffort: number;
  benefits: string[];
  risks: string[];
}

export enum RecommendedAction {
  REMOVE = 'remove',
  MOVE = 'move',
  CONSOLIDATE = 'consolidate',
  REFACTOR = 'refactor',
  UPGRADE = 'upgrade',
  CONFIGURE = 'configure'
}

export interface AnalysisMetrics {
  filesAnalyzed: number;
  issuesFound: number;
  estimatedSavings: {
    diskSpace: number;
    buildTime: number;
    complexity: number;
  };
  riskScore: number;
}

// Backup types
export interface BackupPlan {
  id: string;
  timestamp: Date;
  scope: BackupScope;
  strategy: BackupStrategy;
  retention: RetentionPolicy;
  verification: VerificationConfig;
}

export enum BackupScope {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  SELECTIVE = 'selective'
}

export enum BackupStrategy {
  FILE_COPY = 'file_copy',
  GIT_STASH = 'git_stash',
  ARCHIVE = 'archive',
  SNAPSHOT = 'snapshot'
}

export interface RetentionPolicy {
  maxBackups: number;
  maxAge: number; // in days
  autoCleanup: boolean;
}

export interface VerificationConfig {
  enabled: boolean;
  checksumValidation: boolean;
  integrityCheck: boolean;
  restoreTest: boolean;
}

export interface BackupResult {
  id: string;
  planId: string;
  timestamp: Date;
  status: BackupStatus;
  location: string;
  size: number;
  checksum?: string;
  metadata: BackupMetadata;
}

export enum BackupStatus {
  CREATED = 'created',
  VERIFIED = 'verified',
  CORRUPTED = 'corrupted',
  EXPIRED = 'expired'
}

export interface BackupMetadata {
  filesBackedUp: number;
  totalSize: number;
  compressionRatio?: number;
  duration: number;
  errors: string[];
}

// Progress tracking types
export interface ProgressState {
  taskId: string;
  phase: ModernizationPhase;
  overallProgress: number; // 0-100
  currentStep: string;
  stepsCompleted: number;
  totalSteps: number;
  startTime: Date;
  estimatedCompletion?: Date;
  metrics: ProgressMetrics;
}

export interface ProgressMetrics {
  throughput: number; // items per minute
  errorRate: number; // percentage
  resourceUsage: ResourceUsage;
  performance: PerformanceMetrics;
}

export interface ResourceUsage {
  cpu: number; // percentage
  memory: number; // MB
  disk: number; // MB
  network?: number; // MB/s
}

export interface PerformanceMetrics {
  averageStepDuration: number; // seconds
  slowestStep: string;
  fastestStep: string;
  bottlenecks: string[];
}

// Validation types
export interface ValidationResult {
  id: string;
  timestamp: Date;
  scope: ValidationScope;
  status: ValidationStatus;
  checks: ValidationCheck[];
  summary: ValidationSummary;
}

export enum ValidationScope {
  PRE_EXECUTION = 'pre_execution',
  POST_EXECUTION = 'post_execution',
  CONTINUOUS = 'continuous',
  ROLLBACK = 'rollback'
}

export enum ValidationStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  SKIPPED = 'skipped'
}

export interface ValidationCheck {
  id: string;
  name: string;
  type: ValidationType;
  status: ValidationStatus;
  message: string;
  details?: Record<string, unknown>;
  duration: number;
}

export enum ValidationType {
  SYNTAX = 'syntax',
  IMPORTS = 'imports',
  TESTS = 'tests',
  BUILD = 'build',
  FUNCTIONALITY = 'functionality',
  PERFORMANCE = 'performance',
  SECURITY = 'security'
}

export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  overallStatus: ValidationStatus;
  criticalIssues: string[];
}

// Configuration schemas
export const ModernizationConfigSchema = z.object({
  analysis: z.object({
    enabled: z.boolean().default(true),
    types: z.array(z.nativeEnum(AnalysisType)).default(Object.values(AnalysisType)),
    parallel: z.boolean().default(true),
    timeout: z.number().default(300000) // 5 minutes
  }).default({}),
  backup: z.object({
    enabled: z.boolean().default(true),
    strategy: z.nativeEnum(BackupStrategy).default(BackupStrategy.FILE_COPY),
    scope: z.nativeEnum(BackupScope).default(BackupScope.SELECTIVE),
    retention: z.object({
      maxBackups: z.number().default(10),
      maxAge: z.number().default(30),
      autoCleanup: z.boolean().default(true)
    }).default({}),
    verification: z.object({
      enabled: z.boolean().default(true),
      checksumValidation: z.boolean().default(true),
      integrityCheck: z.boolean().default(true),
      restoreTest: z.boolean().default(false)
    }).default({})
  }).default({}),
  progress: z.object({
    enabled: z.boolean().default(true),
    updateInterval: z.number().default(1000), // ms
    persistState: z.boolean().default(true),
    notifications: z.boolean().default(true)
  }).default({}),
  validation: z.object({
    enabled: z.boolean().default(true),
    preExecution: z.boolean().default(true),
    postExecution: z.boolean().default(true),
    continuous: z.boolean().default(false),
    failFast: z.boolean().default(false),
    types: z.array(z.nativeEnum(ValidationType)).default(Object.values(ValidationType))
  }).default({}),
  execution: z.object({
    dryRun: z.boolean().default(false),
    parallel: z.boolean().default(false),
    maxConcurrency: z.number().default(3),
    timeout: z.number().default(1800000), // 30 minutes
    autoRollback: z.boolean().default(true)
  }).default({})
});

export type ModernizationConfig = z.infer<typeof ModernizationConfigSchema>;

// Error types
export class ModernizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public phase: ModernizationPhase,
    public recoverable: boolean = true,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ModernizationError';
  }
}

export class AnalysisError extends ModernizationError {
  constructor(message: string, public analysisType: AnalysisType, metadata?: Record<string, unknown>) {
    super(message, 'ANALYSIS_ERROR', ModernizationPhase.ANALYSIS, true, metadata);
    this.name = 'AnalysisError';
  }
}

export class BackupError extends ModernizationError {
  constructor(message: string, public operation: string, metadata?: Record<string, unknown>) {
    super(message, 'BACKUP_ERROR', ModernizationPhase.BACKUP, false, metadata);
    this.name = 'BackupError';
  }
}

export class ValidationError extends ModernizationError {
  constructor(message: string, public validationType: ValidationType, metadata?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', ModernizationPhase.VALIDATION, true, metadata);
    this.name = 'ValidationError';
  }
}






