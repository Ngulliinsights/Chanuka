import { Evidence, ExpertiseLevel } from './value-objects';

export type VerificationType = 'fact_check' | 'impact_assessment' | 'source_validation' | 'claim_verification';
export type VerificationStatus = 'pending' | 'verified' | 'disputed' | 'needs_review';

export class CitizenVerification {
  private constructor(
    private readonly _id: string,
    private readonly _billId: number,
    private readonly _citizenId: string,
    private readonly _verificationType: VerificationType,
    private _verificationStatus: VerificationStatus,
    private _confidence: number,
    private readonly _evidence: Evidence[],
    private readonly _expertise: ExpertiseLevel,
    private readonly _reasoning: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _endorsements: number = 0,
    private _disputes: number = 0
  ) {}

  static create(data: {
    id: string;
    billId: number;
    citizenId: string;
    verificationType: VerificationType;
    verificationStatus?: VerificationStatus;
    confidence?: number;
    evidence: Evidence[];
    expertise: ExpertiseLevel;
    reasoning: string;
    createdAt?: Date;
    updatedAt?: Date;
    endorsements?: number;
    disputes?: number;
  }): CitizenVerification {
    // Calculate initial confidence based on evidence and expertise
    const evidenceScore = data.evidence.reduce((sum, e) => sum + e.getQualityScore(), 0) / data.evidence.length;
    const expertiseWeight = data.expertise.getWeight();
    const initialConfidence = Math.min(100, (evidenceScore * 50 + expertiseWeight * 30 + data.expertise.reputationScore * 0.2));

    // Determine initial status
    const initialStatus = initialConfidence > 80 ? 'verified' :
                         initialConfidence > 60 ? 'pending' : 'needs_review';

    return new CitizenVerification(
      data.id,
      data.billId,
      data.citizenId,
      data.verificationType,
      data.verificationStatus || initialStatus,
      data.confidence || initialConfidence,
      data.evidence,
      data.expertise,
      data.reasoning,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
      data.endorsements ?? 0,
      data.disputes ?? 0
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get billId(): number {
    return this._billId;
  }

  get citizenId(): string {
    return this._citizenId;
  }

  get verificationType(): VerificationType {
    return this._verificationType;
  }

  get verificationStatus(): VerificationStatus {
    return this._verificationStatus;
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

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
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
    this._updatedAt = new Date();
  }

  dispute(): void {
    this._disputes++;
    this.recalculateConfidence();
    this._updatedAt = new Date();
  }

  updateStatus(newStatus: VerificationStatus): void {
    this._verificationStatus = newStatus;
    this._updatedAt = new Date();
  }

  private recalculateConfidence(): void {
    const communityWeight = Math.min(this._endorsements * 2, 20);
    const disputePenalty = Math.min(this._disputes * 5, 25);

    this._confidence = Math.max(0, Math.min(100,
      this._confidence + communityWeight - disputePenalty
    ));
  }

  isVerified(): boolean {
    return this._verificationStatus === 'verified';
  }

  isDisputed(): boolean {
    return this._verificationStatus === 'disputed';
  }

  isPending(): boolean {
    return this._verificationStatus === 'pending';
  }

  needsReview(): boolean {
    return this._verificationStatus === 'needs_review';
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

  toJSON() {
    return {
      id: this._id,
      billId: this._billId,
      citizenId: this._citizenId,
      verificationType: this._verificationType,
      verificationStatus: this._verificationStatus,
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
        reputationScore: this._expertise.reputationScore
      },
      reasoning: this._reasoning,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      endorsements: this._endorsements,
      disputes: this._disputes
    };
  }
}