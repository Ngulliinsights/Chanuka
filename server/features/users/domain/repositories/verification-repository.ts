import { CitizenVerification, VerificationType } from '../entities/citizen-verification';

export interface VerificationRepository {
  // Basic CRUD operations
  findById(id: string): Promise<CitizenVerification | null>;
  findByBillId(billId: number): Promise<CitizenVerification[]>;
  findByCitizenId(citizenId: string): Promise<CitizenVerification[]>;
  save(verification: CitizenVerification): Promise<void>;
  update(verification: CitizenVerification): Promise<void>;
  delete(id: string): Promise<void>;

  // Query operations
  findByType(billId: number, type: VerificationType): Promise<CitizenVerification[]>;
  findByStatus(billId: number, status: string): Promise<CitizenVerification[]>;
  findByConfidenceRange(billId: number, min: number, max: number): Promise<CitizenVerification[]>;
  findRecentVerifications(limit: number): Promise<CitizenVerification[]>;

  // Aggregation operations
  countByBillId(billId: number): Promise<number>;
  countByStatus(billId: number): Promise<Record<string, number>>;
  getAverageConfidence(billId: number): Promise<number>;
  getExpertiseDistribution(billId: number): Promise<Record<string, number>>;

  // Community operations
  findEndorsements(verificationId: string): Promise<string[]>; // Returns citizen IDs
  findDisputes(verificationId: string): Promise<string[]>; // Returns citizen IDs
  addEndorsement(verificationId: string, citizenId: string): Promise<void>;
  addDispute(verificationId: string, citizenId: string, reason: string): Promise<void>;
  removeEndorsement(verificationId: string, citizenId: string): Promise<void>;
  removeDispute(verificationId: string, citizenId: string): Promise<void>;

  // Fact-checking operations
  findRelevantVerifications(billId: number, claim: string): Promise<CitizenVerification[]>;
  getConsensusLevel(verificationId: string): Promise<number>;
  getCommunityConsensus(verificationId: string): Promise<number>;

  // Bulk operations
  updateStatusBulk(verificationIds: string[], status: string): Promise<void>;
  deleteByBillId(billId: number): Promise<void>;

  // Statistics
  getVerificationStats(billId: number): Promise<{
    total: number;
    verified: number;
    disputed: number;
    pending: number;
    needsReview: number;
    averageConfidence: number;
    reliabilityScore: number;
  }>;
}





































