// ============================================================================
// ADVOCACY COORDINATION - Action Item Entity
// ============================================================================

import { ActionTemplate } from '@client/types/index.js';

export interface ActionItem {
  id: string;
  campaign_id: string;
  user_id: string;
  
  // Action details
  actionType: 'contact_representative' | 'attend_hearing' | 'submit_comment' | 'share_content' | 'organize_meeting' | 'petition_signature';
  title: string;
  description: string;
  instructions: string;
  
  // Status and progress
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Timeline
  assignedAt: Date;
  due_date?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Content and customization
  template?: ActionTemplate;
  customizedContent?: {
    subject?: string;
    body?: string;
    personalMessage?: string;
    attachments?: string[];
  };
  
  // Target and context
  targetRepresentative?: string;
  targetCommittee?: string;
  relatedBillSection?: string;
  
  // Tracking and feedback
  estimatedTimeMinutes: number;
  actualTimeMinutes?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  userFeedback?: {
    rating: number;
    comments?: string;
    suggestions?: string;
  };
  
  // Results and impact
  outcome?: {
    successful: boolean;
    response?: string;
    followUpRequired?: boolean;
    impactNotes?: string;
  };
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

export interface NewActionItem {
  campaign_id: string;
  user_id: string;
  actionType: ActionItem['actionType'];
  title: string;
  description: string;
  instructions: string;
  priority?: ActionItem['priority'];
  due_date?: Date;
  template?: ActionTemplate;
  customizedContent?: ActionItem['customizedContent'];
  targetRepresentative?: string;
  targetCommittee?: string;
  relatedBillSection?: string;
  estimatedTimeMinutes: number;
  difficulty?: ActionItem['difficulty'];
}

export class ActionItemEntity {
  constructor(private actionItem: ActionItem) {}

  // Getters
  get id(): string { return this.actionItem.id; }
  get campaignId(): string { return this.actionItem.campaign_id; }
  get userId(): string { return this.actionItem.user_id; }
  get actionType(): ActionItem['actionType'] { return this.actionItem.actionType; }
  get title(): string { return this.actionItem.title; }
  get status(): ActionItem['status'] { return this.actionItem.status; }
  get priority(): ActionItem['priority'] { return this.actionItem.priority; }
  get dueDate(): Date | undefined { return this.actionItem.due_date; }
  get estimatedTimeMinutes(): number { return this.actionItem.estimatedTimeMinutes; }
  get difficulty(): ActionItem['difficulty'] { return this.actionItem.difficulty; }
  get outcome(): ActionItem['outcome'] { return this.actionItem.outcome; }

  // Status checks
  isPending(): boolean { return this.actionItem.status === 'pending'; }
  isInProgress(): boolean { return this.actionItem.status === 'in_progress'; }
  isCompleted(): boolean { return this.actionItem.status === 'completed'; }
  isSkipped(): boolean { return this.actionItem.status === 'skipped'; }
  isOverdue(): boolean {
    return this.actionItem.due_date ? new Date() > this.actionItem.due_date && !this.isCompleted() : false;
  }
  isUrgent(): boolean { return this.actionItem.priority === 'urgent'; }

  // Business logic methods
  canBeStarted(): boolean {
    return this.actionItem.status === 'pending';
  }

  canBeCompleted(): boolean {
    return this.actionItem.status === 'in_progress' || this.actionItem.status === 'pending';
  }

  canBeSkipped(): boolean {
    return this.actionItem.status === 'pending' || this.actionItem.status === 'in_progress';
  }

  start(): void {
    if (!this.canBeStarted()) {
      throw new Error('Action item cannot be started in current status');
    }
    this.actionItem.status = 'in_progress';
    this.actionItem.startedAt = new Date();
    this.actionItem.updated_at = new Date();
  }

  complete(outcome?: ActionItem['outcome'], actualTimeMinutes?: number): void {
    if (!this.canBeCompleted()) {
      throw new Error('Action item cannot be completed in current status');
    }
    this.actionItem.status = 'completed';
    this.actionItem.completedAt = new Date();
    this.actionItem.updated_at = new Date();
    
    if (outcome) {
      this.actionItem.outcome = outcome;
    }
    
    if (actualTimeMinutes !== undefined) {
      this.actionItem.actualTimeMinutes = actualTimeMinutes;
    }
  }

  skip(reason?: string): void {
    if (!this.canBeSkipped()) {
      throw new Error('Action item cannot be skipped in current status');
    }
    this.actionItem.status = 'skipped';
    this.actionItem.updated_at = new Date();
    
    if (reason) {
      this.actionItem.outcome = {
        successful: false,
        impactNotes: `Skipped: ${reason}`
      };
    }
  }

  updateCustomizedContent(content: ActionItem['customizedContent']): void {
    this.actionItem.customizedContent = { ...this.actionItem.customizedContent, ...content };
    this.actionItem.updated_at = new Date();
  }

  addFeedback(feedback: ActionItem['userFeedback']): void {
    if (!this.isCompleted()) {
      throw new Error('Feedback can only be added to completed actions');
    }
    this.actionItem.userFeedback = feedback;
    this.actionItem.updated_at = new Date();
  }

  updatePriority(priority: ActionItem['priority']): void {
    this.actionItem.priority = priority;
    this.actionItem.updated_at = new Date();
  }

  extendDueDate(newDueDate: Date): void {
    if (this.isCompleted()) {
      throw new Error('Cannot extend due date for completed actions');
    }
    this.actionItem.due_date = newDueDate;
    this.actionItem.updated_at = new Date();
  }

  calculateEfficiency(): number | null {
    if (!this.actionItem.actualTimeMinutes || !this.actionItem.estimatedTimeMinutes) {
      return null;
    }
    return this.actionItem.estimatedTimeMinutes / this.actionItem.actualTimeMinutes;
  }

  getDaysUntilDue(): number | null {
    if (!this.actionItem.due_date) return null;
    const now = new Date();
    const diffTime = this.actionItem.due_date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  toJSON(): ActionItem {
    return { ...this.actionItem };
  }

  static fromData(data: ActionItem): ActionItemEntity {
    return new ActionItemEntity(data);
  }

  static create(data: NewActionItem): ActionItemEntity {
    const actionItem: ActionItem = {
      id: '', // Will be set by repository
      ...data,
      status: 'pending',
      priority: data.priority || 'medium',
      difficulty: data.difficulty || 'medium',
      assignedAt: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    return new ActionItemEntity(actionItem);
  }
}