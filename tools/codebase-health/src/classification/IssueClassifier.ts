// Issue Classification Interface and Types
import { CodeIssue } from '../models/CodeIssue';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category = 'build-blocking' | 'runtime-error' | 'type-safety' | 'maintainability';
export type Impact = 'high' | 'medium' | 'low';

export enum ResolutionStrategy {
  AUTOMATED_FIX = 'automated',
  GUIDED_MANUAL = 'guided_manual',
  MANUAL_REVIEW = 'manual_review',
  ARCHITECTURAL_CHANGE = 'architectural'
}

export interface IssueClassification {
  severity: Severity;
  category: Category;
  impact: Impact;
  canAutomate: boolean;
}

export interface PrioritizedIssue {
  issue: CodeIssue;
  classification: IssueClassification;
  priority: number;
  resolutionStrategy: ResolutionStrategy;
}

export interface IssueClassifier {
  classifyIssue(issue: CodeIssue): IssueClassification;
  prioritizeIssues(issues: CodeIssue[]): PrioritizedIssue[];
  determineResolutionStrategy(issue: CodeIssue): ResolutionStrategy;
}