// ============================================================================
// ADVOCACY COORDINATION - Campaign Entity
// ============================================================================

import { CampaignMetrics,CampaignStrategy } from '@server/types/index.ts';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  bill_id: string;
  organizerId: string;
  organizationName?: string;
  
  // Campaign configuration
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  category: string;
  tags: string[];
  targetCounties: string[];
  
  // Strategy and objectives
  objectives: string[];
  strategy: CampaignStrategy;
  
  // Participation
  is_public: boolean;
  requiresApproval: boolean;
  maxParticipants?: number;
  participantCount: number;
  
  // Timeline
  start_date: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
  
  // Metrics and tracking
  metrics: CampaignMetrics;
  impactScore: number;
  
  // Content and resources
  resources: {
    documents: string[];
    links: string[];
    templates: string[];
  };
  
  // Moderation
  is_verified: boolean;
  moderationNotes?: string;
}

export interface NewCampaign {
  title: string;
  description: string;
  bill_id: string;
  organizerId: string;
  organizationName?: string;
  category: string;
  tags?: string[];
  targetCounties?: string[];
  objectives: string[];
  strategy: CampaignStrategy;
  is_public?: boolean;
  requiresApproval?: boolean;
  maxParticipants?: number;
  start_date: Date;
  end_date?: Date;
  resources?: {
    documents?: string[];
    links?: string[];
    templates?: string[];
  };
}

export class CampaignEntity {
  constructor(private campaign: Campaign) {}

  // Getters
  get id(): string { return this.campaign.id; }
  get title(): string { return this.campaign.title; }
  get description(): string { return this.campaign.description; }
  get billId(): string { return this.campaign.bill_id; }
  get organizerId(): string { return this.campaign.organizerId; }
  get status(): Campaign['status'] { return this.campaign.status; }
  get participantCount(): number { return this.campaign.participantCount; }
  get isActive(): boolean { return this.campaign.status === 'active'; }
  get isPublic(): boolean { return this.campaign.is_public; }
  get requiresApproval(): boolean { return this.campaign.requiresApproval; }
  get maxParticipants(): number | undefined { return this.campaign.maxParticipants; }
  get impactScore(): number { return this.campaign.impactScore; }
  get metrics(): CampaignMetrics { return this.campaign.metrics; }

  // Business logic methods
  canAcceptParticipants(): boolean {
    if (this.campaign.status !== 'active') return false;
    if (this.campaign.maxParticipants && this.campaign.participantCount >= this.campaign.maxParticipants) {
      return false;
    }
    return true;
  }

  isExpired(): boolean {
    if (!this.campaign.end_date) return false;
    return new Date() > this.campaign.end_date;
  }

  canBeModifiedBy(user_id: string): boolean {
    return this.campaign.organizerId === userId;
  }

  addParticipant(): void {
    if (!this.canAcceptParticipants()) {
      throw new Error('Campaign cannot accept new participants');
    }
    this.campaign.participantCount++;
    this.campaign.updated_at = new Date();
  }

  removeParticipant(): void {
    if (this.campaign.participantCount > 0) {
      this.campaign.participantCount--;
      this.campaign.updated_at = new Date();
    }
  }

  updateStatus(newStatus: Campaign['status'], user_id: string): void {
    if (!this.canBeModifiedBy(user_id)) {
      throw new Error('User not authorized to modify campaign');
    }
    
    // Validate status transitions
    const validTransitions: Record<Campaign['status'], Campaign['status'][]> = {
      'draft': ['active', 'cancelled'],
      'active': ['paused', 'completed', 'cancelled'],
      'paused': ['active', 'cancelled'],
      'completed': [], // Terminal state
      'cancelled': [] // Terminal state
    };

    if (!validTransitions[this.campaign.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this.campaign.status} to ${newStatus}`);
    }

    this.campaign.status = newStatus;
    this.campaign.updated_at = new Date();
  }

  updateMetrics(metrics: Partial<CampaignMetrics>): void {
    this.campaign.metrics = { ...this.campaign.metrics, ...metrics };
    this.campaign.updated_at = new Date();
  }

  updateImpactScore(score: number): void {
    if (score < 0 || score > 100) {
      throw new Error('Impact score must be between 0 and 100');
    }
    this.campaign.impactScore = score;
    this.campaign.updated_at = new Date();
  }

  toJSON(): Campaign {
    return { ...this.campaign };
  }

  static fromData(data: Campaign): CampaignEntity {
    return new CampaignEntity(data);
  }

  static create(data: NewCampaign): CampaignEntity {
    const campaign: Campaign = {
      id: '', // Will be set by repository
      ...data,
      status: 'draft',
      tags: data.tags || [],
      targetCounties: data.targetCounties || [],
      is_public: data.is_public ?? true,
      requiresApproval: data.requiresApproval ?? false,
      participantCount: 0,
      created_at: new Date(),
      updated_at: new Date(),
      metrics: {
        totalParticipants: 0,
        activeParticipants: 0,
        completedActions: 0,
        pendingActions: 0,
        engagementRate: 0,
        impactScore: 0,
        reachMetrics: {
          counties: 0,
          demographics: {},
          channels: {}
        }
      },
      impactScore: 0,
      resources: data.resources || { documents: [], links: [], templates: [] },
      is_verified: false
    };

    return new CampaignEntity(campaign);
  }
}
