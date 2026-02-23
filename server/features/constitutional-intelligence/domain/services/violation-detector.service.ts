/**
 * Violation Detector Domain Service
 * 
 * Detects potential constitutional violations in bill text.
 * Uses pattern matching, legal heuristics, and domain knowledge.
 */

import { ConstitutionalProvision } from '../entities/constitutional-provision.entity';
import { PotentialViolation, ViolationType } from '../entities/constitutional-analysis.entity';

export interface ViolationPattern {
  type: ViolationType;
  keywords: string[];
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export class ViolationDetectorService {
  private readonly violationPatterns: ViolationPattern[] = [
    {
      type: 'rights_infringement',
      keywords: ['restrict', 'prohibit', 'ban', 'forbid', 'prevent', 'deny'],
      description: 'Potential restriction of fundamental rights',
      severity: 'critical',
    },
    {
      type: 'power_overreach',
      keywords: ['minister may', 'cabinet secretary may', 'discretion', 'as deemed fit'],
      description: 'Excessive executive discretion without oversight',
      severity: 'high',
    },
    {
      type: 'procedural_issue',
      keywords: ['without consultation', 'without notice', 'without hearing'],
      description: 'Lack of procedural fairness',
      severity: 'high',
    },
    {
      type: 'ambiguity',
      keywords: ['reasonable', 'appropriate', 'necessary', 'sufficient'],
      description: 'Vague or ambiguous terms that could be abused',
      severity: 'medium',
    },
  ];

  /**
   * Detect potential violations in bill text
   */
  detectViolations(
    billText: string,
    relevantProvisions: ConstitutionalProvision[],
  ): PotentialViolation[] {
    const violations: PotentialViolation[] = [];

    for (const provision of relevantProvisions) {
      const provisionViolations = this.checkProvisionViolations(billText, provision);
      violations.push(...provisionViolations);
    }

    // Remove duplicates and sort by severity
    return this.deduplicateAndSort(violations);
  }

  /**
   * Check for violations of a specific provision
   */
  private checkProvisionViolations(
    billText: string,
    provision: ConstitutionalProvision,
  ): PotentialViolation[] {
    const violations: PotentialViolation[] = [];
    const billLower = billText.toLowerCase();

    for (const pattern of this.violationPatterns) {
      const evidence: string[] = [];
      let matchCount = 0;

      // Check for pattern keywords in bill text
      for (const keyword of pattern.keywords) {
        if (billLower.includes(keyword.toLowerCase())) {
          matchCount++;
          evidence.push(this.extractEvidence(billText, keyword));
        }
      }

      // If we found matches, create a violation
      if (matchCount > 0) {
        const confidence = Math.min(0.9, matchCount * 0.2); // More matches = higher confidence

        violations.push({
          provisionId: provision.id,
          provisionReference: provision.referenceString,
          violationType: pattern.type,
          severity: pattern.severity,
          description: `${pattern.description} - ${provision.toJSON().title}`,
          evidence: evidence.slice(0, 3), // Limit to 3 pieces of evidence
          confidence,
        });
      }
    }

    // Special checks for fundamental rights
    if (provision.isBillOfRights) {
      const rightsViolations = this.checkFundamentalRightsViolations(billText, provision);
      violations.push(...rightsViolations);
    }

    return violations;
  }

  /**
   * Special checks for fundamental rights violations
   */
  private checkFundamentalRightsViolations(
    billText: string,
    provision: ConstitutionalProvision,
  ): PotentialViolation[] {
    const violations: PotentialViolation[] = [];
    const billLower = billText.toLowerCase();

    // Check for limitations without proper justification
    const limitationKeywords = ['limit', 'restrict', 'subject to', 'except'];
    const justificationKeywords = ['public interest', 'national security', 'public health'];

    let hasLimitation = false;
    let hasJustification = false;

    for (const keyword of limitationKeywords) {
      if (billLower.includes(keyword)) {
        hasLimitation = true;
        break;
      }
    }

    for (const keyword of justificationKeywords) {
      if (billLower.includes(keyword)) {
        hasJustification = true;
        break;
      }
    }

    // If there's a limitation without justification, flag it
    if (hasLimitation && !hasJustification) {
      violations.push({
        provisionId: provision.id,
        provisionReference: provision.referenceString,
        violationType: 'rights_infringement',
        severity: 'critical',
        description: `Limitation of fundamental right without proper justification - ${provision.toJSON().title}`,
        evidence: [this.extractEvidence(billText, limitationKeywords[0])],
        confidence: 0.7,
      });
    }

    return violations;
  }

  /**
   * Extract evidence text around a keyword
   */
  private extractEvidence(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + keyword.length + 50);
    
    let evidence = text.substring(start, end);
    
    if (start > 0) evidence = '...' + evidence;
    if (end < text.length) evidence = evidence + '...';

    return evidence;
  }

  /**
   * Remove duplicate violations and sort by severity
   */
  private deduplicateAndSort(violations: PotentialViolation[]): PotentialViolation[] {
    // Remove duplicates based on provision + type
    const seen = new Set<string>();
    const unique = violations.filter(v => {
      const key = `${v.provisionId}-${v.violationType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    unique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return unique;
  }
}
