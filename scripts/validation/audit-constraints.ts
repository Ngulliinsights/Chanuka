/**
 * Database Constraints Audit Script
 * 
 * Audits database constraints and compares them with validation schemas
 * to ensure alignment between database layer and application layer validation.
 */

import { z } from 'zod';
import {
  UserSchema,
  BillSchema,
  CommentSchema,
  USER_VALIDATION_RULES,
  BILL_VALIDATION_RULES,
  COMMENT_VALIDATION_RULES,
} from '@shared/validation';

/**
 * Constraint type
 */
type ConstraintType = 'NOT_NULL' | 'UNIQUE' | 'CHECK' | 'LENGTH' | 'PATTERN' | 'ENUM';

/**
 * Database constraint
 */
interface DatabaseConstraint {
  table: string;
  column: string;
  type: ConstraintType;
  value?: string | number;
  description: string;
}

/**
 * Validation rule
 */
interface ValidationRule {
  field: string;
  type: ConstraintType;
  value?: string | number;
  description: string;
}

/**
 * Alignment issue
 */
interface AlignmentIssue {
  table: string;
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  dbConstraint?: DatabaseConstraint;
  validationRule?: ValidationRule;
  recommendation: string;
}

/**
 * Audit report
 */
interface AuditReport {
  timestamp: Date;
  summary: {
    totalTables: number;
    totalConstraints: number;
    totalValidationRules: number;
    alignedCount: number;
    issuesCount: number;
  };
  issues: AlignmentIssue[];
  recommendations: string[];
}

/**
 * Extract validation rules from Zod schema
 */
function extractValidationRules(
  schema: z.ZodObject<any>,
  prefix: string = ''
): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const shape = schema.shape;

  for (const [key, value] of Object.entries(shape)