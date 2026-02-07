/**
 * Community Validation Type
 * Type definition for community validation
 */

export type CommunityValidationType = 'expert' | 'contributor' | 'verified' | 'none';

export interface CommunityValidation {
  type: CommunityValidationType;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export default CommunityValidationType;


export interface ValidationSummary {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}
