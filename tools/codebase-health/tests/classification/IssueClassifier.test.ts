// Unit tests for IssueClassifier interface
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  IssueClassifier, 
  IssueClassification, 
  ResolutionStrategy, 
  PrioritizedIssue 
} from '../../src/classification/IssueClassifier';
import { CodeIssue } from '../../src/models/CodeIssue';

// Mock implementation for testing
class MockIssueClassifier implements IssueClassifier {
  classifyIssue(issue: CodeIssue): IssueClassification {
    // Simple classification logic for testing
    if (issue.severity === 'critical') {
      return {
        severity: 'critical',
        category: 'build-blocking',
        impact: 'high',
        canAutomate: true
      };
    }
    
    return {
      severity: issue.severity as any,
      category: 'type-safety',
      impact: 'medium',
      canAutomate: false
    };
  }

  prioritizeIssues(issues: CodeIssue[]): PrioritizedIssue[] {
    return issues.map((issue, index) => ({
      issue,
      classification: this.classifyIssue(issue),
      priority: issue.severity === 'critical' ? 1 : index + 2,
      resolutionStrategy: this.determineResolutionStrategy(issue)
    }));
  }

  determineResolutionStrategy(issue: CodeIssue): ResolutionStrategy {
    if (issue.category === 'import-export') {
      return 'automated' as ResolutionStrategy;
    }
    return 'manual_review' as ResolutionStrategy;
  }
}

describe('IssueClassifier', () => {
  let classifier: IssueClassifier;

  beforeEach(() => {
    classifier = new MockIssueClassifier();
  });

  describe('classifyIssue', () => {
    it('should classify critical issues correctly', () => {
      const issue: CodeIssue = {
        id: 'test-1',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        message: 'Critical issue',
        severity: 'critical',
        category: 'import-export',
        createdAt: new Date()
      };

      const classification = classifier.classifyIssue(issue);

      expect(classification.severity).toBe('critical');
      expect(classification.category).toBe('build-blocking');
      expect(classification.impact).toBe('high');
      expect(classification.canAutomate).toBe(true);
    });

    it('should classify non-critical issues correctly', () => {
      const issue: CodeIssue = {
        id: 'test-2',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        message: 'Medium issue',
        severity: 'medium',
        category: 'type-safety',
        createdAt: new Date()
      };

      const classification = classifier.classifyIssue(issue);

      expect(classification.severity).toBe('medium');
      expect(classification.category).toBe('type-safety');
      expect(classification.impact).toBe('medium');
      expect(classification.canAutomate).toBe(false);
    });
  });

  describe('prioritizeIssues', () => {
    it('should prioritize critical issues first', () => {
      const issues: CodeIssue[] = [
        {
          id: 'medium-1',
          filePath: '/test1.ts',
          line: 1,
          column: 1,
          message: 'Medium issue',
          severity: 'medium',
          category: 'type-safety',
          createdAt: new Date()
        },
        {
          id: 'critical-1',
          filePath: '/test2.ts',
          line: 1,
          column: 1,
          message: 'Critical issue',
          severity: 'critical',
          category: 'import-export',
          createdAt: new Date()
        }
      ];

      const prioritized = classifier.prioritizeIssues(issues);

      expect(prioritized).toHaveLength(2);
      expect(prioritized[1].priority).toBe(1); // Critical issue should have priority 1
      expect(prioritized[0].priority).toBe(2); // Medium issue should have priority 2
    });
  });

  describe('determineResolutionStrategy', () => {
    it('should suggest automated fix for import-export issues', () => {
      const issue: CodeIssue = {
        id: 'test-1',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        message: 'Import issue',
        severity: 'high',
        category: 'import-export',
        createdAt: new Date()
      };

      const strategy = classifier.determineResolutionStrategy(issue);

      expect(strategy).toBe('automated');
    });

    it('should suggest manual review for other issues', () => {
      const issue: CodeIssue = {
        id: 'test-2',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        message: 'Complex issue',
        severity: 'high',
        category: 'architecture',
        createdAt: new Date()
      };

      const strategy = classifier.determineResolutionStrategy(issue);

      expect(strategy).toBe('manual_review');
    });
  });
});