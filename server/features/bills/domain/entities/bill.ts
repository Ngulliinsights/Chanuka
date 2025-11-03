import { BillStatus, BillVoteType, EngagementType } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Value Object for Bill Number
 * Ensures bill numbers follow proper format and validation
 */
export class BillNumber {
  private readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new Error('Bill number must be a non-empty string');
    }

    // Validate format: "Bill No. X of YYYY" or similar patterns
    const billNumberRegex = /^Bill No\. \d+ of \d{4}$/;
    if (!billNumberRegex.test(value.trim())) {
      throw new Error('Bill number must follow format: "Bill No. X of YYYY"');
    }

    this.value = value.trim();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BillNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Value Object for Bill Title
 * Ensures titles meet length and content requirements
 */
export class BillTitle {
  private readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new Error('Bill title must be a non-empty string');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('Bill title cannot be empty');
    }

    if (trimmed.length > 500) {
      throw new Error('Bill title must be 500 characters or less');
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: BillTitle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Value Object for Bill Summary
 * Optional field with length constraints
 */
export class BillSummary {
  private readonly value: string | null;

  constructor(value: string | null | undefined) {
    if (value === undefined || value === null) {
      this.value = null;
      return;
    }

    if (typeof value !== 'string') {
      throw new Error('Bill summary must be a string or null');
    }

    const trimmed = value.trim();
    if (trimmed.length > 2000) {
      throw new Error('Bill summary must be 2000 characters or less');
    }

    this.value = trimmed.length > 0 ? trimmed : null;
  }

  getValue(): string | null {
    return this.value;
  }

  isEmpty(): boolean {
    return this.value === null;
  }

  toString(): string {
    return this.value || '';
  }
}

/**
 * Value Object for Engagement Metrics
 * Tracks views, comments, votes, and shares
 */
export class EngagementMetrics {
  constructor(
    private readonly viewCount: number = 0,
    private readonly commentCount: number = 0,
    private readonly voteCountFor: number = 0,
    private readonly voteCountAgainst: number = 0,
    private readonly shareCount: number = 0,
    private readonly engagementScore: number = 0
  ) {
    this.validateCounts();
  }

  private validateCounts(): void {
    if (this.viewCount < 0 || this.commentCount < 0 ||
        this.voteCountFor < 0 || this.voteCountAgainst < 0 ||
        this.shareCount < 0) {
      throw new Error('Engagement counts cannot be negative');
    }

    if (this.engagementScore < 0) {
      throw new Error('Engagement score cannot be negative');
    }
  }

  incrementViews(): EngagementMetrics {
    return new EngagementMetrics(
      this.viewCount + 1,
      this.commentCount,
      this.voteCountFor,
      this.voteCountAgainst,
      this.shareCount,
      this.calculateEngagementScore(this.viewCount + 1, this.commentCount, this.voteCountFor + this.voteCountAgainst, this.shareCount)
    );
  }

  incrementComments(): EngagementMetrics {
    return new EngagementMetrics(
      this.viewCount,
      this.commentCount + 1,
      this.voteCountFor,
      this.voteCountAgainst,
      this.shareCount,
      this.calculateEngagementScore(this.viewCount, this.commentCount + 1, this.voteCountFor + this.voteCountAgainst, this.shareCount)
    );
  }

  incrementShares(): EngagementMetrics {
    return new EngagementMetrics(
      this.viewCount,
      this.commentCount,
      this.voteCountFor,
      this.voteCountAgainst,
      this.shareCount + 1,
      this.calculateEngagementScore(this.viewCount, this.commentCount, this.voteCountFor + this.voteCountAgainst, this.shareCount + 1)
    );
  }

  addVote(voteType: BillVoteType): EngagementMetrics {
    const newFor = voteType === 'support' ? this.voteCountFor + 1 : this.voteCountFor;
    const newAgainst = voteType === 'oppose' ? this.voteCountAgainst + 1 : this.voteCountAgainst;

    return new EngagementMetrics(
      this.viewCount,
      this.commentCount,
      newFor,
      newAgainst,
      this.shareCount,
      this.calculateEngagementScore(this.viewCount, this.commentCount, newFor + newAgainst, this.shareCount)
    );
  }

  private calculateEngagementScore(views: number, comments: number, votes: number, shares: number): number {
    // Weighted engagement score calculation
    return (views * 0.1) + (comments * 2) + (votes * 1.5) + (shares * 3);
  }

  getViewCount(): number { return this.viewCount; }
  getCommentCount(): number { return this.commentCount; }
  getVoteCountFor(): number { return this.voteCountFor; }
  getVoteCountAgainst(): number { return this.voteCountAgainst; }
  getShareCount(): number { return this.shareCount; }
  getEngagementScore(): number { return this.engagementScore; }

  toJSON() {
    return {
      viewCount: this.viewCount,
      commentCount: this.commentCount,
      voteCountFor: this.voteCountFor,
      voteCountAgainst: this.voteCountAgainst,
      shareCount: this.shareCount,
      engagementScore: this.engagementScore
    };
  }
}

/**
 * Bill Entity - Core domain entity representing a legislative bill
 * Implements domain logic and business rules
 */
export class Bill {
  private readonly id: string;
  private billNumber: BillNumber;
  private title: BillTitle;
  private summary: BillSummary;
  private status: BillStatus;
  private engagementMetrics: EngagementMetrics;
  private readonly createdAt: Date;
  private updatedAt: Date;

  // Optional fields
  private sponsorId?: string;
  private introducedDate?: Date;
  private lastActionDate?: Date;
  private tags: string[] = [];
  private affectedCounties: string[] = [];
  
  // Advocacy integration fields
  private activeCampaignsCount: number = 0;
  private totalCampaignParticipants: number = 0;
  private trackingCount: number = 0;
  
  // Analysis flags
  private needsConstitutionalAnalysis: boolean = false;
  private needsStakeholderAnalysis: boolean = false;
  private hasTransparencyConcerns: boolean = false;
  private urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  private publicParticipationRequired: boolean = false;
  private impactAreas: string[] = [];

  constructor(
    id: string,
    billNumber: BillNumber,
    title: BillTitle,
    summary: BillSummary,
    status: BillStatus = 'drafted',
    engagementMetrics: EngagementMetrics = new EngagementMetrics(),
    sponsorId?: string,
    introducedDate?: Date,
    lastActionDate?: Date,
    tags: string[] = [],
    affectedCounties: string[] = [],
    activeCampaignsCount: number = 0,
    totalCampaignParticipants: number = 0,
    trackingCount: number = 0,
    needsConstitutionalAnalysis: boolean = false,
    needsStakeholderAnalysis: boolean = false,
    hasTransparencyConcerns: boolean = false,
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low',
    publicParticipationRequired: boolean = false,
    impactAreas: string[] = [],
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id;
    this.billNumber = billNumber;
    this.title = title;
    this.summary = summary;
    this.status = status;
    this.engagementMetrics = engagementMetrics;
    this.sponsorId = sponsorId;
    this.introducedDate = introducedDate;
    this.lastActionDate = lastActionDate;
    this.tags = [...tags];
    this.affectedCounties = [...affectedCounties];
    this.activeCampaignsCount = activeCampaignsCount;
    this.totalCampaignParticipants = totalCampaignParticipants;
    this.trackingCount = trackingCount;
    this.needsConstitutionalAnalysis = needsConstitutionalAnalysis;
    this.needsStakeholderAnalysis = needsStakeholderAnalysis;
    this.hasTransparencyConcerns = hasTransparencyConcerns;
    this.urgencyLevel = urgencyLevel;
    this.publicParticipationRequired = publicParticipationRequired;
    this.impactAreas = [...impactAreas];
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();

    this.validateBusinessRules();
  }

  private validateBusinessRules(): void {
    // Business rule: Introduced bills must have an introduction date
    if (this.status !== 'drafted' && !this.introducedDate) {
      throw new Error('Bills that have been introduced must have an introduction date');
    }

    // Business rule: Last action date cannot be before introduction date
    if (this.introducedDate && this.lastActionDate && this.lastActionDate < this.introducedDate) {
      throw new Error('Last action date cannot be before introduction date');
    }

    // Business rule: Maximum 10 tags per bill
    if (this.tags.length > 10) {
      throw new Error('Bill cannot have more than 10 tags');
    }

    // Business rule: Tags must be unique and non-empty
    const uniqueTags = new Set(this.tags.filter(tag => tag && tag.trim().length > 0));
    if (uniqueTags.size !== this.tags.length) {
      throw new Error('Bill tags must be unique and non-empty');
    }
  }

  // Factory method for creating new bills
  static create(params: {
    billNumber: BillNumber;
    title: BillTitle;
    summary?: BillSummary;
    sponsorId?: string;
    tags?: string[];
    affectedCounties?: string[];
  }): Bill {
    return new Bill(
      uuidv4(),
      params.billNumber,
      params.title,
      params.summary || new BillSummary(null),
      'drafted',
      new EngagementMetrics(),
      params.sponsorId,
      undefined,
      undefined,
      params.tags || [],
      params.affectedCounties || []
    );
  }

  // Business methods
  introduce(): void {
    if (this.status !== 'drafted') {
      throw new Error('Only drafted bills can be introduced');
    }

    this.status = 'introduced';
    this.introducedDate = new Date();
    this.lastActionDate = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: BillStatus): void {
    // Validate status transition rules
    this.validateStatusTransition(this.status, newStatus);

    this.status = newStatus;
    this.lastActionDate = new Date();
    this.updatedAt = new Date();
  }

  private validateStatusTransition(from: BillStatus, to: BillStatus): void {
    const validTransitions: Record<BillStatus, BillStatus[]> = {
      'drafted': ['introduced'],
      'introduced': ['committee', 'second_reading', 'withdrawn'],
      'committee': ['second_reading', 'third_reading', 'withdrawn'],
      'second_reading': ['third_reading', 'committee', 'withdrawn'],
      'third_reading': ['passed', 'failed', 'withdrawn'],
      'passed': ['assented', 'withdrawn'],
      'failed': [], // Terminal state
      'assented': [], // Terminal state
      'withdrawn': [] // Terminal state
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new Error(`Invalid status transition from ${from} to ${to}`);
    }
  }

  recordEngagement(type: EngagementType): void {
    switch (type) {
      case 'view':
        this.engagementMetrics = this.engagementMetrics.incrementViews();
        break;
      case 'comment':
        this.engagementMetrics = this.engagementMetrics.incrementComments();
        break;
      case 'share':
        this.engagementMetrics = this.engagementMetrics.incrementShares();
        break;
    }
    this.updatedAt = new Date();
  }

  recordVote(voteType: BillVoteType): void {
    this.engagementMetrics = this.engagementMetrics.addVote(voteType);
    this.updatedAt = new Date();
  }

  updateTitle(newTitle: BillTitle): void {
    this.title = newTitle;
    this.updatedAt = new Date();
  }

  updateSummary(newSummary: BillSummary): void {
    this.summary = newSummary;
    this.updatedAt = new Date();
  }

  addTag(tag: string): void {
    if (this.tags.length >= 10) {
      throw new Error('Cannot add more than 10 tags to a bill');
    }

    if (this.tags.includes(tag)) {
      throw new Error('Tag already exists on this bill');
    }

    this.tags.push(tag);
    this.updatedAt = new Date();
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index === -1) {
      throw new Error('Tag not found on this bill');
    }

    this.tags.splice(index, 1);
    this.updatedAt = new Date();
  }

  // Advocacy integration methods
  updateCampaignMetrics(activeCampaigns: number, totalParticipants: number): void {
    this.activeCampaignsCount = activeCampaigns;
    this.totalCampaignParticipants = totalParticipants;
    this.updatedAt = new Date();
  }

  updateTrackingCount(count: number): void {
    this.trackingCount = Math.max(0, count);
    this.updatedAt = new Date();
  }

  flagForConstitutionalAnalysis(): void {
    this.needsConstitutionalAnalysis = true;
    this.updatedAt = new Date();
  }

  clearConstitutionalAnalysisFlag(): void {
    this.needsConstitutionalAnalysis = false;
    this.updatedAt = new Date();
  }

  flagForStakeholderAnalysis(): void {
    this.needsStakeholderAnalysis = true;
    this.updatedAt = new Date();
  }

  clearStakeholderAnalysisFlag(): void {
    this.needsStakeholderAnalysis = false;
    this.updatedAt = new Date();
  }

  flagTransparencyConcerns(): void {
    this.hasTransparencyConcerns = true;
    this.updatedAt = new Date();
  }

  clearTransparencyConcerns(): void {
    this.hasTransparencyConcerns = false;
    this.updatedAt = new Date();
  }

  updateUrgencyLevel(level: 'low' | 'medium' | 'high' | 'critical'): void {
    this.urgencyLevel = level;
    this.updatedAt = new Date();
  }

  setPublicParticipationRequired(required: boolean): void {
    this.publicParticipationRequired = required;
    this.updatedAt = new Date();
  }

  addImpactArea(area: string): void {
    if (!this.impactAreas.includes(area)) {
      this.impactAreas.push(area);
      this.updatedAt = new Date();
    }
  }

  removeImpactArea(area: string): void {
    const index = this.impactAreas.indexOf(area);
    if (index !== -1) {
      this.impactAreas.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  // Business logic methods
  hasActiveCampaigns(): boolean {
    return this.activeCampaignsCount > 0;
  }

  isHighEngagement(): boolean {
    return this.engagementMetrics.getEngagementScore() > 100 || 
           this.totalCampaignParticipants > 50 ||
           this.trackingCount > 100;
  }

  requiresUrgentAttention(): boolean {
    return this.urgencyLevel === 'critical' || 
           (this.urgencyLevel === 'high' && this.hasActiveCampaigns());
  }

  needsAnalysis(): boolean {
    return this.needsConstitutionalAnalysis || 
           this.needsStakeholderAnalysis || 
           this.hasTransparencyConcerns;
  }

  calculateAdvocacyScore(): number {
    let score = 0;
    
    // Base engagement score (0-40 points)
    score += Math.min(this.engagementMetrics.getEngagementScore() / 10, 40);
    
    // Campaign participation (0-30 points)
    score += Math.min(this.totalCampaignParticipants / 5, 30);
    
    // Tracking interest (0-20 points)
    score += Math.min(this.trackingCount / 10, 20);
    
    // Urgency multiplier
    const urgencyMultiplier = {
      'low': 1,
      'medium': 1.2,
      'high': 1.5,
      'critical': 2
    }[this.urgencyLevel];
    
    score *= urgencyMultiplier;
    
    // Public participation bonus (0-10 points)
    if (this.publicParticipationRequired) {
      score += 10;
    }
    
    return Math.round(Math.min(score, 100));
  }

  // Getters
  getId(): string { return this.id; }
  getBillNumber(): BillNumber { return this.billNumber; }
  getTitle(): BillTitle { return this.title; }
  getSummary(): BillSummary { return this.summary; }
  getStatus(): BillStatus { return this.status; }
  getEngagementMetrics(): EngagementMetrics { return this.engagementMetrics; }
  getSponsorId(): string | undefined { return this.sponsorId; }
  getIntroducedDate(): Date | undefined { return this.introducedDate; }
  getLastActionDate(): Date | undefined { return this.lastActionDate; }
  getTags(): string[] { return [...this.tags]; }
  getAffectedCounties(): string[] { return [...this.affectedCounties]; }
  getActiveCampaignsCount(): number { return this.activeCampaignsCount; }
  getTotalCampaignParticipants(): number { return this.totalCampaignParticipants; }
  getTrackingCount(): number { return this.trackingCount; }
  getNeedsConstitutionalAnalysis(): boolean { return this.needsConstitutionalAnalysis; }
  getNeedsStakeholderAnalysis(): boolean { return this.needsStakeholderAnalysis; }
  getHasTransparencyConcerns(): boolean { return this.hasTransparencyConcerns; }
  getUrgencyLevel(): 'low' | 'medium' | 'high' | 'critical' { return this.urgencyLevel; }
  getPublicParticipationRequired(): boolean { return this.publicParticipationRequired; }
  getImpactAreas(): string[] { return [...this.impactAreas]; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }

  // Check if bill can be modified
  canBeModified(): boolean {
    return !['passed', 'failed', 'assented', 'withdrawn'].includes(this.status);
  }

  // Check if bill is active (not in terminal state)
  isActive(): boolean {
    return !['failed', 'assented', 'withdrawn'].includes(this.status);
  }

  // Convert to plain object for persistence/serialization
  toJSON() {
    return {
      id: this.id,
      billNumber: this.billNumber.getValue(),
      title: this.title.getValue(),
      summary: this.summary.getValue(),
      status: this.status,
      engagementMetrics: this.engagementMetrics.toJSON(),
      sponsorId: this.sponsorId,
      introducedDate: this.introducedDate?.toISOString(),
      lastActionDate: this.lastActionDate?.toISOString(),
      tags: this.tags,
      affectedCounties: this.affectedCounties,
      activeCampaignsCount: this.activeCampaignsCount,
      totalCampaignParticipants: this.totalCampaignParticipants,
      trackingCount: this.trackingCount,
      needsConstitutionalAnalysis: this.needsConstitutionalAnalysis,
      needsStakeholderAnalysis: this.needsStakeholderAnalysis,
      hasTransparencyConcerns: this.hasTransparencyConcerns,
      urgencyLevel: this.urgencyLevel,
      publicParticipationRequired: this.publicParticipationRequired,
      impactAreas: this.impactAreas,
      advocacyScore: this.calculateAdvocacyScore(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}