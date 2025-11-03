import { CitizenVerification, VerificationType } from '../entities/citizen-verification';

export interface VerificationRepository { // Basic CRUD operations
  findById(id: string): Promise<CitizenVerification | null>;
  findByBillId(bill_id: number): Promise<CitizenVerification[]>;
  findByCitizenId(citizenId: string): Promise<CitizenVerification[]>;
  save(verification: CitizenVerification): Promise<void>;
  update(verification: CitizenVerification): Promise<void>;
  delete(id: string): Promise<void>;

  // Query operations
  findByType(bill_id: number, type: VerificationType): Promise<CitizenVerification[]>;
  findByStatus(bill_id: number, status: string): Promise<CitizenVerification[]>;
  findByConfidenceRange(bill_id: number, min: number, max: number): Promise<CitizenVerification[]>;
  findRecentVerifications(limit: number): Promise<CitizenVerification[]>;

  // Aggregation operations
  countByBillId(bill_id: number): Promise<number>;
  countByStatus(bill_id: number): Promise<Record<string, number>>;
  getAverageConfidence(bill_id: number): Promise<number>;
  getExpertiseDistribution(bill_id: number): Promise<Record<string, number>>;

  // Community operations
  findEndorsements(verificationId: string): Promise<string[]>; // Returns citizen IDs
  findDisputes(verificationId: string): Promise<string[]>; // Returns citizen IDs
  addEndorsement(verificationId: string, citizenId: string): Promise<void>;
  addDispute(verificationId: string, citizenId: string, reason: string): Promise<void>;
  removeEndorsement(verificationId: string, citizenId: string): Promise<void>;
  removeDispute(verificationId: string, citizenId: string): Promise<void>;

  // Fact-checking operations
  findRelevantVerifications(bill_id: number, claim: string): Promise<CitizenVerification[]>;
  getConsensusLevel(verificationId: string): Promise<number>;
  getCommunityConsensus(verificationId: string): Promise<number>;

  // Bulk operations
  updateStatusBulk(verificationIds: string[], status: string): Promise<void>;
  deleteByBillId(bill_id: number): Promise<void>;

  // Statistics
  getVerificationStats(bill_id: number): Promise<{
    total: number;
    verified: number;
    disputed: number;
    pending: number;
    needsReview: number;
    averageConfidence: number;
    reliabilityScore: number;
   }>;
}





































