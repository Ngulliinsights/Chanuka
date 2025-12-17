// Fix Result and File Change Models
import { CodeIssue } from './CodeIssue';

export interface FileChange {
  filePath: string;
  oldContent: string;
  newContent: string;
  changeType: 'import' | 'export' | 'type' | 'refactor';
}

export interface FixResult {
  success: boolean;
  changes: FileChange[];
  warnings: string[];
  requiresManualReview: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  buildPasses: boolean;
  typeCheckPasses: boolean;
  newIssuesIntroduced: CodeIssue[];
  issuesResolved: CodeIssue[];
}

export interface BuildTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface TypeScriptValidationResult {
  success: boolean;
  diagnostics: string[];
  errorCount: number;
  warningCount: number;
}