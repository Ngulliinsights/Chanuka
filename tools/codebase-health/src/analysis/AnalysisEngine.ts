// Analysis Engine Interface and Implementation
import { ImportExportIssue, TypeIssue, CircularDependency } from '../models/CodeIssue';

export interface ScanOptions {
  includePatterns: string[];
  excludePatterns: string[];
  strictMode: boolean;
  followSymlinks: boolean;
}

export interface AnalysisSummary {
  totalFiles: number;
  issuesFound: number;
  criticalIssues: number;
  automatedFixesAvailable: number;
}

export interface AnalysisResult {
  importExportMismatches: ImportExportIssue[];
  typeInconsistencies: TypeIssue[];
  circularDependencies: CircularDependency[];
  summary: AnalysisSummary;
}

export interface ImportValidationResult {
  isValid: boolean;
  issues: ImportExportIssue[];
}

export interface TypeConsistencyResult {
  isConsistent: boolean;
  issues: TypeIssue[];
}

export interface CircularDependencyResult {
  hasCycles: boolean;
  cycles: CircularDependency[];
}

export interface AnalysisEngine {
  scanCodebase(options: ScanOptions): Promise<AnalysisResult>;
  validateImports(filePath: string): ImportValidationResult;
  checkTypeConsistency(filePath: string): TypeConsistencyResult;
  detectCircularDependencies(): CircularDependencyResult[];
}