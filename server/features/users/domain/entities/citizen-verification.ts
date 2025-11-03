import { Evidence, ExpertiseLevel } from './value-objects';

export type VerificationType = 'fact_check' | 'impact_assessment' | 'source_validation' | 'claim_verification';
export type VerificationStatus = 'pending' | 'verified' | 'disputed' | 'needs_review';

export class CitizenVerification {
  private constructor(
    private readonly _id: string,
    private readonly _bill_id: number,
    private readonly _citizenId: string,
    private readonly _verification_type: VerificationType,
    private _verification_status: VerificationStatus,
    private _confidence: number,
    private readonly _evidence: Evidence[],
    private readonly _expertise: ExpertiseLevel,
    private readonly _reasoning: string,
    private readonly _created_at: Date,
    private _updated_at: Date,
    private _endorsements: number = 0,
    private _disputes: number = 0
  ) {}

  static create(data: { id: string;
    bill_id: number;
    citizenId: string;
    verification_type: VerificationType;
    verification_status?: VerificationStatus;
    confidence?: number;
    evidence: Evidence[];
    expertise: ExpertiseLevel;
    reasoning: string;
    created_at?: Date;
    updated_at?: Date;
    endorsements?: number;
    disputes?: number;
   }): CitizenVerification {
    // Calculate initial confidence based on evidence and expertise
    const evidenceScore = data.evidence.reduce((sum, e) => sum + e.getQualityScore(), 0) / data.evidence.length;
    const expertiseWeight = data.expertise.getWeight();
    const initialConfidence = Math.min(100, (evidenceScore * 50 + expertiseWeight * 30 + data.expertise.reputation_score * 0.2));

    // Determine initial status
    const initialStatus = initialConfidence > 80 ? 'verified' :
                         initialConfidence > 60 ? 'pending' : 'needs_review';

    return new CitizenVerification(
      data.id,
      data.bill_id,
      data.citizenId,
      data.verification_type,
      data.verification_status || initialStatus,
      data.confidence || initialConfidence,
      data.evidence,
      data.expertise,
      data.reasoning,
      data.created_at ?? new Date(),
      data.updated_at ?? new Date(),
      data.endorsements ?? 0,
      data.disputes ?? 0
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get bill_id(): number {
    return this._bill_id;
  }

  get citizenId(): string {
    return this._citizenId;
  }

  get verification_type(): VerificationType {
    return this._verification_type;
  }

  get verification_status(): VerificationStatus {
    return this._verification_status;
  }

  get confidence(): number {
    return this._confidence;
  }

  get evidence(): Evidence[] {
    return [...this._evidence];
  }

  get expertise(): ExpertiseLevel {
    return this._expertise;
  }

  get reasoning(): string {
    return this._reasoning;
  }

  get created_at(): Date {
    return this._created_at;
  }

  get updated_at(): Date {
    return this._updated_at;
  }

  get endorsements(): number {
    return this._endorsements;
  }

  get disputes(): number {
    return this._disputes;
  }

  // Business methods
  endorse(): void {
    this._endorsements++;
    this.recalculateConfidence();
    this._updated_at = new Date();
  }

  dispute(): void {
    this._disputes++;
    this.recalculateConfidence();
    this._updated_at = new Date();
  }

  updateStatus(newStatus: VerificationStatus): void {
    this._verification_status = newStatus;
    this._updated_at = new Date();
  }

  private recalculateConfidence(): void {
    const communityWeight = Math.min(this._endorsements * 2, 20);
    const disputePenalty = Math.min(this._disputes * 5, 25);

    this._confidence = Math.max(0, Math.min(100,
      this._confidence + communityWeight - disputePenalty
    ));
  }

  is_verified(): boolean {
    return this._verification_status === 'verified';
  }

  isDisputed(): boolean {
    return this._verification_status === 'disputed';
  }

  isPending(): boolean {
    return this._verification_status === 'pending';
  }

  needsReview(): boolean {
    return this._verification_status === 'needs_review';
  }

  getConsensusLevel(): number {
    const totalInteractions = this._endorsements + this._disputes;
    if (totalInteractions === 0) return 50; // Neutral
    return Math.round((this._endorsements / totalInteractions) * 100);
  }

  getReliabilityScore(): number {
    const expertiseWeight = this._expertise.getWeight();
    const evidenceQuality = this._evidence.reduce((sum, e) => sum + e.getQualityScore(), 0) / this._evidence.length;
    const consensusWeight = this.getConsensusLevel() / 100;

    return Math.round((expertiseWeight * 0.4 + evidenceQuality * 0.4 + consensusWeight * 0.2) * 100);
  }

  equals(other: CitizenVerification): boolean {
    return this._id === other._id;
  }

  toJSON() { return {
      id: this._id,
      bill_id: this._bill_id,
      citizenId: this._citizenId,
      verification_type: this._verification_type,
      verification_status: this._verification_status,
      confidence: this._confidence,
      evidence: this._evidence.map(e => ({
        type: e.type,
        source: e.source,
        url: e.url,
        credibility: e.credibility,
        relevance: e.relevance,
        description: e.description,
        datePublished: e.datePublished
       })),
      expertise: {
        domain: this._expertise.domain,
        level: this._expertise.level,
        credentials: this._expertise.credentials,
        verifiedCredentials: this._expertise.verifiedCredentials,
        reputation_score: this._expertise.reputation_score
      },
      reasoning: this._reasoning,
      created_at: this._created_at,
      updated_at: this._updated_at,
      endorsements: this._endorsements,
      disputes: this._disputes
    };
  }
}





































