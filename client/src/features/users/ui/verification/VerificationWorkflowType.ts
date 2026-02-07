/**
 * Verification Workflow Type
 * Type definition for verification workflow
 */

export type VerificationWorkflowType = 'pending' | 'in_review' | 'approved' | 'rejected';

export interface VerificationWorkflow {
  status: VerificationWorkflowType;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export default VerificationWorkflowType;
