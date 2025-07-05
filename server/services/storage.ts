import {
  type User,
  type InsertUser,
  type Bill,
  type InsertBill,
  type Stakeholder,
  type InsertStakeholder,
  type BillComment,
  type InsertBillComment,
  type UserProgress,
  type InsertUserProgress,
  type SocialShare,
  type InsertSocialShare,
  type SocialProfile,
} from './types.js';
import session from 'express-session';
import createMemoryStore from 'memorystore';

// Define types for evaluation-related functionality
interface Evaluation {
  id: number;
  candidateId: number;
  evaluatorId: number;
  departmentId: number;
  status: string;
  scores: Record<string, number>;
  feedback: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateEvaluationInput {
  candidateId: number;
  evaluatorId: number;
  departmentId: number;
  scores: Record<string, number>;
  feedback: string;
}

interface DepartmentStats {
  departmentId: number;
  metrics: Record<string, number>;
}

interface CompetencyMetrics {
  overall: Record<string, number>;
  byDepartment: Record<number, Record<string, number>>;
}

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySocialProfile(provider: string, profileId: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  linkSocialProfile(
    userId: number,
    profile: { platform: string; profileId: string; username: string },
  ): Promise<User>;
  unlinkSocialProfile(userId: number, platform: string): Promise<User>;
  updateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserReputation(userId: number, change: number): Promise<User>;
  updateUserLastActive(userId: number): Promise<User>;

  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  incrementBillViews(billId: number): Promise<Bill>;
  incrementBillShares(billId: number): Promise<Bill>;
  getBillsByTags(tags: string[]): Promise<Bill[]>;

  getStakeholders(): Promise<Stakeholder[]>;
  getStakeholder(id: number): Promise<Stakeholder | undefined>;
  createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder>;
  updateStakeholderVotingHistory(
    stakeholderId: number,
    vote: { billId: number; vote: 'yes' | 'no' | 'abstain'; date: string },
  ): Promise<Stakeholder>;

  getBillComments(billId: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateBillCommentEndorsements(commentId: number, endorsements: number): Promise<BillComment>;
  getCommentReplies(parentId: number): Promise<BillComment[]>;
  highlightComment(commentId: number): Promise<BillComment>;

  getUserProgress(userId: number): Promise<UserProgress[]>;
  getProgressByType(userId: number, achievementType: string): Promise<UserProgress[]>;

  trackSocialShare(share: InsertSocialShare): Promise<SocialShare>;
  getSocialShareStats(billId: number): Promise<{ platform: string; count: number }[]>;

  getCandidateEvaluations(): Promise<Evaluation[]>;
  createEvaluation(input: CreateEvaluationInput): Promise<Evaluation>;
  updateEvaluationStatus(id: number, status: string): Promise<Evaluation>;
  getDepartmentStats(): Promise<DepartmentStats>;
  getCompetencyMetrics(): Promise<CompetencyMetrics>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  // Primary data collections
  private users: Map<number, User>;
  private bills: Map<number, Bill>;
  private stakeholders: Map<number, Stakeholder>;
  private billComments: Map<number, BillComment>;
  private userProgress: Map<number, UserProgress[]>;
  private socialShares: Map<number, SocialShare[]>;
  private evaluations: Map<number, Evaluation>;

  // Secondary indexes for optimized lookups
  private usersByUsername: Map<string, User>;
  private usersBySocialProfile: Map<string, User>;
  private billsByTag: Map<string, Set<number>>;
  private billCommentsByBill: Map<number, Set<number>>;
  private billCommentsByParent: Map<number, Set<number>>;

  // Analytics data
  private departmentStats: DepartmentStats[];
  private competencyMetrics: CompetencyMetrics;

  // Session store
  public sessionStore: session.Store;

  constructor() {
    // Initialize primary collections
    this.users = new Map();
    this.bills = new Map();
    this.stakeholders = new Map();
    this.billComments = new Map();
    this.userProgress = new Map();
    this.socialShares = new Map();
    this.evaluations = new Map();

    // Initialize secondary indexes
    this.usersByUsername = new Map();
    this.usersBySocialProfile = new Map();
    this.billsByTag = new Map();
    this.billCommentsByBill = new Map();
    this.billCommentsByParent = new Map();

    // Initialize analytics data
    this.departmentStats = [];
    this.competencyMetrics = {
      overall: {},
      byDepartment: {},
    };

    // Initialize session store with 24-hour pruning
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  /**
   * Generates a unique ID for a new entity in a collection
   */
  private generateUniqueId<T extends { id?: number }>(collection: Map<number, T>): number {
    if (collection.size === 0) return 1;
    return Math.max(...Array.from(collection.keys())) + 1;
  }

  // ==============================
  // User Management Methods
  // ==============================

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username.toLowerCase());
  }

  async getUserBySocialProfile(provider: string, profileId: string): Promise<User | undefined> {
    const key = `${provider}:${profileId}`;
    return this.usersBySocialProfile.get(key);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return this.getUserBySocialProfile('google', googleId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.generateUniqueId(this.users),
      createdAt: new Date(),
      updatedAt: new Date(),
      socialProfiles: [],
      reputation: 0,
      lastActive: new Date(),
      expertise: user.expertise || null,
      onboardingCompleted: user.onboardingCompleted || false,
      googleId: user.googleId || null,
      avatarUrl: user.avatarUrl || null,
      role: 'user',
    };

    // Add to primary collection and secondary indexes
    this.users.set(newUser.id, newUser);
    this.usersByUsername.set(newUser.username.toLowerCase(), newUser);

    return newUser;
  }

  async linkSocialProfile(userId: number, profile: SocialProfile): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found with ID: ${userId}`);

    // Create the key for social profile index
    const key = `${profile.platform}:${profile.profileId}`;

    // Check if profile is already linked to another user
    const existingUser = this.usersBySocialProfile.get(key);
    if (existingUser && existingUser.id !== userId) {
      throw new Error(`Profile already linked to another user: ${existingUser.username}`);
    }

    // Update social profile index
    this.usersBySocialProfile.set(key, user);

    // Create a properly formatted social profile
    const socialProfile = {
      id: this.generateUniqueId(new Map()),
      userId: userId,
      platform: profile.platform,
      profileId: profile.profileId,
      username: profile.username,
      createdAt: new Date(),
    };

    // Update user record
    user.socialProfiles = [...(user.socialProfiles || []), socialProfile];
    user.updatedAt = new Date();

    return user;
  }

  async unlinkSocialProfile(userId: number, platform: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found with ID: ${userId}`);

    // Find the profile to remove
    const profileToRemove = user.socialProfiles?.find(
      (p: SocialProfile) => p.platform === platform,
    );
    if (!profileToRemove) {
      throw new Error(`User has no ${platform} profile linked`);
    }

    // Remove from social profile index
    const key = `${profileToRemove.platform}:${profileToRemove.profileId}`;
    this.usersBySocialProfile.delete(key);

    // Update user record
    user.socialProfiles =
      user.socialProfiles?.filter(profile => profile.platform !== platform) || [];
    user.updatedAt = new Date();

    return user;
  }

  async updateUserReputation(userId: number, change: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found with ID: ${userId}`);

    user.reputation = (user.reputation || 0) + change;
    user.updatedAt = new Date();

    return user;
  }

  async updateUserLastActive(userId: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error(`User not found with ID: ${userId}`);

    user.lastActive = new Date();
    user.updatedAt = new Date();

    return user;
  }

  // ==============================
  // Bill Management Methods
  // ==============================

  async getBills(): Promise<Bill[]> {
    return Array.from(this.bills.values());
  }

  async getBill(id: number): Promise<Bill | undefined> {
    return this.bills.get(id);
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const newBill: Bill = {
      ...bill,
      id: this.generateUniqueId(this.bills),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: bill.status || 'draft',
      proposedDate: bill.proposedDate || new Date(),
      lastUpdated: new Date(),
      viewCount: bill.viewCount || 0,
      shareCount: bill.shareCount || 0,
      dateIntroduced: bill.dateIntroduced || null,
      votingDate: bill.votingDate || null,
      stakeholderIds: bill.stakeholderIds || null,
      // Add these properties only if they exist in the InsertBill type
      dueDate: null,
      requiresAction: false,
      urgency: 'low',
    };

    // Add to primary collection
    this.bills.set(newBill.id, newBill);

    // Update tag index if tags are provided
    if ('tags' in bill && Array.isArray(bill.tags) && bill.tags.length > 0) {
      bill.tags.forEach((tag: string) => {
        if (!this.billsByTag.has(tag)) {
          this.billsByTag.set(tag, new Set());
        }
        this.billsByTag.get(tag)?.add(newBill.id);
      });
    }

    return newBill;
  }

  async incrementBillViews(billId: number): Promise<Bill> {
    const bill = this.bills.get(billId);
    if (!bill) throw new Error(`Bill not found with ID: ${billId}`);

    // Increment viewCount instead of using views property
    bill.viewCount = (bill.viewCount || 0) + 1;
    bill.updatedAt = new Date();

    return bill;
  }

  async incrementBillShares(billId: number): Promise<Bill> {
    const bill = this.bills.get(billId);
    if (!bill) throw new Error(`Bill not found with ID: ${billId}`);

    // Increment shareCount instead of using shares property
    bill.shareCount = (bill.shareCount || 0) + 1;
    bill.updatedAt = new Date();

    return bill;
  }

  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    if (!tags || tags.length === 0) return [];

    // Find bills that match any of the provided tags
    const billIds = new Set<number>();
    tags.forEach(tag => {
      const taggedBills = this.billsByTag.get(tag);
      if (taggedBills) {
        taggedBills.forEach(id => billIds.add(id));
      }
    });

    // Get the actual bill objects
    return Array.from(billIds)
      .map(id => this.bills.get(id))
      .filter((bill): bill is Bill => bill !== undefined);
  }

  // ==============================
  // User Progress Methods
  // ==============================

  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return this.userProgress.get(userId) || [];
  }

  async getProgressByType(userId: number, achievementType: string): Promise<UserProgress[]> {
    const progress = this.userProgress.get(userId) || [];
    return progress.filter(p => p.achievementType === achievementType);
  }

  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const userId = progress.userId;
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, []);
    }

    const newProgress: UserProgress = {
      id: this.generateUniqueId(new Map()),
      createdAt: new Date(),
      userId: progress.userId,
      achievementType: progress.achievementType,
      achievementValue: progress.achievementValue,
      level: progress.level || null,
      badge: progress.badge || null,
      description: progress.description || null,
      unlockedAt: new Date(),
    };

    this.userProgress.get(userId)?.push(newProgress);

    return newProgress;
  }

  // ==============================
  // Social Share Methods
  // ==============================

  async trackSocialShare(share: InsertSocialShare): Promise<SocialShare> {
    const userId = share.userId;
    const billId = share.billId;

    if (!this.socialShares.has(billId)) {
      this.socialShares.set(billId, []);
    }

    const newShare: SocialShare = {
      id: this.generateUniqueId(new Map()),
      createdAt: new Date(),
      userId: userId,
      billId: billId,
      platform: share.platform,
      metadata: share.metadata || {},
      shareDate: new Date(),
      likes: 0,
      shares: 0,
      comments: 0,
    };

    this.socialShares.get(billId)?.push(newShare);

    // Increment the bill's share count
    await this.incrementBillShares(billId);

    return newShare;
  }

  async getSocialShareStats(billId: number): Promise<{ platform: string; count: number }[]> {
    const shares = this.socialShares.get(billId) || [];
    const statsByPlatform = new Map<string, number>();

    shares.forEach(share => {
      const count = statsByPlatform.get(share.platform) || 0;
      statsByPlatform.set(share.platform, count + 1);
    });

    return Array.from(statsByPlatform.entries()).map(([platform, count]) => ({
      platform,
      count,
    }));
  }

  // ==============================
  // Stakeholder Methods
  // ==============================

  async getStakeholders(): Promise<Stakeholder[]> {
    return Array.from(this.stakeholders.values());
  }

  async getStakeholder(id: number): Promise<Stakeholder | undefined> {
    return this.stakeholders.get(id);
  }

  async createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder> {
    const newStakeholder: Stakeholder = {
      ...stakeholder,
      id: this.generateUniqueId(this.stakeholders),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: stakeholder.metadata || {},
      email: stakeholder.email || null,
      influence: stakeholder.influence || 'medium',
      sector: stakeholder.sector || null,
      biography: stakeholder.biography || null,
      phone: stakeholder.phone || null,
      office: stakeholder.office || null,
      organization: stakeholder.organization || null,
    };

    // Add votingHistory as a custom property
    (newStakeholder as any).votingHistory = [];

    this.stakeholders.set(newStakeholder.id, newStakeholder);

    return newStakeholder;
  }

  async updateStakeholderVotingHistory(
    stakeholderId: number,
    vote: { billId: number; vote: 'yes' | 'no' | 'abstain'; date: string },
  ): Promise<Stakeholder> {
    const stakeholder = this.stakeholders.get(stakeholderId);
    if (!stakeholder) throw new Error(`Stakeholder not found with ID: ${stakeholderId}`);

    // Initialize votingHistory if it doesn't exist
    if (!(stakeholder as any).votingHistory) {
      (stakeholder as any).votingHistory = [];
    }

    // Check if there's an existing vote for this bill
    const existingVoteIndex = (stakeholder as any).votingHistory.findIndex(
      (v: any) => v.billId === vote.billId,
    );

    if (existingVoteIndex >= 0) {
      // Update existing vote
      (stakeholder as any).votingHistory[existingVoteIndex] = vote;
    } else {
      // Add new vote
      (stakeholder as any).votingHistory.push(vote);
    }

    stakeholder.updatedAt = new Date();

    return stakeholder;
  }

  // ==============================
  // Evaluation Methods
  // ==============================

  async getCandidateEvaluations(): Promise<Evaluation[]> {
    return Array.from(this.evaluations.values());
  }

  async createEvaluation(input: CreateEvaluationInput): Promise<Evaluation> {
    const newEvaluation: Evaluation = {
      id: this.generateUniqueId(this.evaluations),
      candidateId: input.candidateId,
      evaluatorId: input.evaluatorId,
      departmentId: input.departmentId,
      status: 'pending',
      scores: input.scores,
      feedback: input.feedback,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.evaluations.set(newEvaluation.id, newEvaluation);

    return newEvaluation;
  }

  async updateEvaluationStatus(id: number, status: string): Promise<Evaluation> {
    const evaluation = this.evaluations.get(id);
    if (!evaluation) throw new Error(`Evaluation not found with ID: ${id}`);

    evaluation.status = status;
    evaluation.updatedAt = new Date();

    return evaluation;
  }

  async getDepartmentStats(): Promise<DepartmentStats> {
    // In a real implementation, this would aggregate data from evaluations
    // For now, return a placeholder
    return {
      departmentId: 1,
      metrics: {
        averageScore: 85,
        completedEvaluations: 12,
        pendingEvaluations: 5,
      },
    };
  }

  async getCompetencyMetrics(): Promise<CompetencyMetrics> {
    // In a real implementation, this would aggregate data from evaluations
    // For now, return a placeholder
    return {
      overall: {
        technicalSkills: 82,
        communication: 78,
        problemSolving: 85,
      },
      byDepartment: {
        1: {
          technicalSkills: 84,
          communication: 76,
          problemSolving: 88,
        },
        2: {
          technicalSkills: 80,
          communication: 82,
          problemSolving: 79,
        },
      },
    };
  }

  // ==============================
  // Bill Comment Methods
  // ==============================

  async getBillComments(billId: number): Promise<BillComment[]> {
    const commentIds = this.billCommentsByBill.get(billId) || new Set();
    return Array.from(commentIds)
      .map(id => this.billComments.get(id))
      .filter((comment): comment is BillComment => comment !== undefined);
  }

  async createBillComment(comment: InsertBillComment): Promise<BillComment> {
    const newComment: BillComment = {
      ...comment,
      id: this.generateUniqueId(this.billComments),
      createdAt: new Date(),
      updatedAt: new Date(),
      endorsements: 0,
      isHighlighted: false,
      parentId: comment.parentId || null,
    };

    // Add to primary collection
    this.billComments.set(newComment.id, newComment);

    // Update bill comments index
    const billId = comment.billId;
    if (!this.billCommentsByBill.has(billId)) {
      this.billCommentsByBill.set(billId, new Set());
    }
    this.billCommentsByBill.get(billId)?.add(newComment.id);

    // Update parent comments index if this is a reply
    if (comment.parentId) {
      if (!this.billCommentsByParent.has(comment.parentId)) {
        this.billCommentsByParent.set(comment.parentId, new Set());
      }
      this.billCommentsByParent.get(comment.parentId)?.add(newComment.id);
    }

    return newComment;
  }

  // Implement the missing methods required by the IStorage interface
  async updateBillCommentEndorsements(
    commentId: number,
    endorsements: number,
  ): Promise<BillComment> {
    const comment = this.billComments.get(commentId);
    if (!comment) throw new Error(`Comment not found with ID: ${commentId}`);

    comment.endorsements = endorsements;
    comment.updatedAt = new Date();

    return comment;
  }

  async getCommentReplies(parentId: number): Promise<BillComment[]> {
    const replyIds = this.billCommentsByParent.get(parentId) || new Set();
    return Array.from(replyIds)
      .map(id => this.billComments.get(id))
      .filter((comment): comment is BillComment => comment !== undefined);
  }

  async highlightComment(commentId: number): Promise<BillComment> {
    const comment = this.billComments.get(commentId);
    if (!comment) throw new Error(`Comment not found with ID: ${commentId}`);

    comment.isHighlighted = true;
    comment.updatedAt = new Date();

    return comment;
  }

  // Helper method to create a social profile index key
  private indexSocialProfile(p: SocialProfile): string {
    return `${p.platform}:${p.profileId}`;
  }
}

export const storage = new MemStorage();
