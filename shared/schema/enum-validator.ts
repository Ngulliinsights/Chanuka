// ============================================================================
// ENUM VALIDATOR - Runtime Type-Safe Validation for Enums
// ============================================================================
// Provides safe validation for enum values at runtime
// Prevents invalid enum assignments and catches typos early

import {
  kenyanCountyEnum,
  chamberEnum,
  partyEnum,
  userRoleEnum,
  anonymityLevelEnum,
  billStatusEnum,
  voteTypeEnum,
  moderationStatusEnum,
  commentVoteTypeEnum,
  billVoteTypeEnum,
  engagementTypeEnum,
  notificationTypeEnum,
  severityEnum,
  commodityCategoryEnum,
  reliabilityScoreEnum,
  violationTypeEnum,
  promiseStatusEnum,
  verificationLevelEnum,
  notificationFrequencyEnum,
  digestFrequencyEnum,
  notificationLanguageEnum,
  accessibilityFormatEnum,
  priorityEnum,
  deliveryStatusEnum,
  contactTypeEnum,
  deviceTypeEnum,
  expertDomainEnum,
  positionEnum,
  courtLevelEnum,
  campaignStatusEnum,
  actionTypeEnum,
  actionStatusEnum,
  ambassadorStatusEnum,
  sessionTypeEnum,
  participationMethodEnum,
  type Party,
  type UserRole,
  type BillStatus,
} from "./enum";

// ============================================================================
// ENUM REGISTRY - Single source of truth for all enums
// ============================================================================
export const ENUM_REGISTRY = {
  kenyan_county: kenyanCountyEnum.enumValues,
  chamber: chamberEnum.enumValues,
  political_party: partyEnum.enumValues,
  user_role: userRoleEnum.enumValues,
  anonymity_level: anonymityLevelEnum.enumValues,
  bill_status: billStatusEnum.enumValues,
  vote_type: voteTypeEnum.enumValues,
  moderation_status: moderationStatusEnum.enumValues,
  comment_vote_type: commentVoteTypeEnum.enumValues,
  bill_vote_type: billVoteTypeEnum.enumValues,
  engagement_type: engagementTypeEnum.enumValues,
  notification_type: notificationTypeEnum.enumValues,
  severity: severityEnum.enumValues,
  commodity_category: commodityCategoryEnum.enumValues,
  reliability_score: reliabilityScoreEnum.enumValues,
  violation_type: violationTypeEnum.enumValues,
  promise_status: promiseStatusEnum.enumValues,
  verification_level: verificationLevelEnum.enumValues,
  notification_frequency: notificationFrequencyEnum.enumValues,
  digest_frequency: digestFrequencyEnum.enumValues,
  notification_language: notificationLanguageEnum.enumValues,
  accessibility_format: accessibilityFormatEnum.enumValues,
  priority: priorityEnum.enumValues,
  delivery_status: deliveryStatusEnum.enumValues,
  contact_type: contactTypeEnum.enumValues,
  device_type: deviceTypeEnum.enumValues,
  expert_domain: expertDomainEnum.enumValues,
  position: positionEnum.enumValues,
  court_level: courtLevelEnum.enumValues,
  campaign_status: campaignStatusEnum.enumValues,
  action_type: actionTypeEnum.enumValues,
  action_status: actionStatusEnum.enumValues,
  ambassador_status: ambassadorStatusEnum.enumValues,
  session_type: sessionTypeEnum.enumValues,
  participation_method: participationMethodEnum.enumValues,
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a value is a valid enum member
 * @param enumName - The name of the enum (must be a key in ENUM_REGISTRY)
 * @param value - The value to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidEnum('political_party', 'uda') // true
 * isValidEnum('political_party', 'invalid_party') // false
 */
export function isValidEnum(
  enumName: keyof typeof ENUM_REGISTRY,
  value: unknown
): boolean {
  if (typeof value !== 'string') return false;
  const validValues = ENUM_REGISTRY[enumName];
  return validValues.includes(value as never);
}

/**
 * Asserts that a value is valid for the given enum, throws otherwise
 * @throws Error if value is not valid
 *
 * @example
 * assertEnum('political_party', 'uda'); // passes
 * assertEnum('political_party', 'dap_k'); // throws: "dap_k is invalid for political_party. Did you mean: dap_ke?"
 */
export function assertEnum(
  enumName: keyof typeof ENUM_REGISTRY,
  value: unknown
): asserts value is string {
  if (!isValidEnum(enumName, value)) {
    const validValues = ENUM_REGISTRY[enumName];
    const suggestion = findClosestMatch(String(value), validValues);
    const message = suggestion
      ? `"${value}" is invalid for ${enumName}. Did you mean: "${suggestion}"?`
      : `"${value}" is not a valid value for ${enumName}. Valid values: ${validValues.join(', ')}`;
    throw new Error(message);
  }
}

/**
 * Finds the closest matching enum value using Levenshtein distance
 * Useful for suggesting corrections when typos are detected
 */
function findClosestMatch(input: string, validValues: readonly string[]): string | null {
  if (validValues.length === 0) return null;

  let closest = validValues[0];
  let minDistance = levenshteinDistance(input, closest);

  for (const value of validValues) {
    const distance = levenshteinDistance(input, value);
    if (distance < minDistance && distance <= 3) {  // Max 3 character changes
      minDistance = distance;
      closest = value;
    }
  }

  return minDistance <= 3 ? closest : null;
}

/**
 * Calculates Levenshtein distance between two strings
 * Used for typo correction suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Returns all valid values for a given enum
 */
export function getEnumValues(enumName: keyof typeof ENUM_REGISTRY): readonly string[] {
  return ENUM_REGISTRY[enumName];
}

/**
 * Validates multiple enum values at once
 * @returns Object with validation results for each value
 */
export function validateEnums(
  enumName: keyof typeof ENUM_REGISTRY,
  values: unknown[]
): { value: unknown; valid: boolean; error?: string }[] {
  return values.map(value => {
    if (isValidEnum(enumName, value)) {
      return { value, valid: true };
    }
    const suggestion = findClosestMatch(String(value), ENUM_REGISTRY[enumName]);
    return {
      value,
      valid: false,
      error: suggestion
        ? `Did you mean: "${suggestion}"?`
        : `Not a valid value for ${enumName}`,
    };
  });
}

// ============================================================================
// SCHEMA VERSION (for tracking breaking changes)
// ============================================================================
export const ENUM_SCHEMA_VERSION = '1.0.0';

export const ENUM_CHANGELOG = {
  '1.0.0': 'Initial schema: Standardized party abbreviations (dap_k → dap_ke)',
} as const;

// ============================================================================
// EXPORT VALIDATION REPORT
// ============================================================================
export function generateEnumReport(): string {
  const report: string[] = [
    '='.repeat(70),
    'ENUM VALIDATION REPORT',
    '='.repeat(70),
    `Schema Version: ${ENUM_SCHEMA_VERSION}`,
    '',
  ];

  Object.entries(ENUM_REGISTRY).forEach(([name, values]) => {
    report.push(`${name}: ${values.length} values`);
    if (values.length <= 20) {
      report.push(`  ${values.join(', ')}`);
    } else {
      report.push(`  ${values.slice(0, 5).join(', ')}... (+${values.length - 5} more)`);
    }
    report.push('');
  });

  report.push('='.repeat(70));
  return report.join('\n');
}

// ============================================================================
// COMMON ENUM CONSTANTS (for convenience)
// ============================================================================
export const VALID_PARTIES: readonly Party[] = partyEnum.enumValues;
export const VALID_ROLES: readonly UserRole[] = userRoleEnum.enumValues;
export const VALID_BILL_STATUSES: readonly BillStatus[] = billStatusEnum.enumValues;
