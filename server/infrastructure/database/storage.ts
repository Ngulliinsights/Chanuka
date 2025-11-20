import {
  type User,
  type InsertUser,
  type Bill,
  type InsertBill,
  type BillComment,
  type InsertBillComment,
  type Stakeholder,
  type InsertStakeholder,
  type UserProgress,
  type InsertUserProgress,
  type SocialShare,
  type InsertSocialShare,
  type UserSocialProfile,
  type Evaluation,
} from '@shared/schema';
import session from 'express-session';
import { logger   } from '@shared/core/src/index.js';
// Simple memory store implementation since connect-memorystore is not available
class SimpleMemoryStore extends session.Store {
  private sessions: Map<string, any> = new Map();

  get(sid: string, callback: (err?: any, session?: any) => void): void {
    const session = this.sessions.get(sid);
    callback(null, session);
  }

  set(sid: string, session: any, callback?: (err?: any) => void): void {
    this.sessions.set(sid, session);
    if (callback) callback();
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    this.sessions.delete(sid);
    if (callback) callback();
  }

  all(callback: (err?: any, obj?: any) => void): void {
    const sessions = Object.fromEntries(this.sessions);
    callback(null, sessions);
  }

  length(callback: (err?: any, length?: number) => void): void {
    callback(null, this.sessions.size);
  }

  clear(callback?: (err?: any) => void): void {
    this.sessions.clear();
    if (callback) callback();
  }

  touch(sid: string, session: any, callback?: (err?: any) => void): void {
    // Update session timestamp
    if (this.sessions.has(sid)) {
      this.sessions.set(sid, session);
    }
    if (callback) callback();
  }
}

// Define types for evaluation-related functionality
interface EvaluationType {
  id: number;
  candidateId: number;
  evaluatorId: number;
  departmentId: number;
  status: string;
  scores: Record<string, number>;
  feedback: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateEvaluationInput {
  candidateName: string;
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

export interface IStorage { getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySocialProfile(provider: string, profile_id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  linkSocialProfile(
    user_id: string,
    profile: { platform: string; profile_id: string; username: string  },
  ): Promise<User>;
  unlinkSocialProfile(user_id: string, platform: string): Promise<User>;
  updateUserReputation(user_id: string, change: number): Promise<User>;
  updateUserLastActive(user_id: string): Promise<User>;

  getBills(): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  incrementBillViews(bill_id: number): Promise<Bill>;
  incrementBillShares(bill_id: number): Promise<Bill>;
  getBillsByTags(tags: string[]): Promise<Bill[]>;

  getBillComments(bill_id: number): Promise<BillComment[]>;
  createBillComment(comment: InsertBillComment): Promise<BillComment>;
  updateBillCommentEndorsements(comment_id: number, endorsements: number): Promise<BillComment>;
  getCommentReplies(parent_id: number): Promise<BillComment[]>;
  highlightComment(comment_id: number): Promise<BillComment>;

  getCandidateEvaluations(): Promise<Evaluation[]>;
  createEvaluation(input: CreateEvaluationInput): Promise<Evaluation>;
  updateEvaluationStatus(id: number, status: string): Promise<Evaluation>;
  getDepartmentStats(): Promise<DepartmentStats>;
  getCompetencyMetrics(): Promise<CompetencyMetrics>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  // Primary data collections
  private users: Map<string, User>;
  private bills: Map<number, Bill>;
  private stakeholders: Map<number, Stakeholder>;
  private comments: Map<number, BillComment>;
  private user_progress: Map<number, UserProgress[]>;
  private social_shares: Map<number, SocialShare[]>;
  private evaluations: Map<number, Evaluation>;

  // Secondary indexes for optimized lookups
  private usersByUsername: Map<string, User>;
  private usersBySocialProfile: Map<string, User>;
  private billsByTag: Map<string, Set<number>>;
  private commentsByBill: Map<number, Set<number>>;
  private commentsByParent: Map<number, Set<number>>;

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
    this.comments = new Map();
    this.user_progress = new Map();
    this.social_shares = new Map();
    this.evaluations = new Map();

    // Initialize secondary indexes
    this.usersByUsername = new Map();
    this.usersBySocialProfile = new Map();
    this.billsByTag = new Map();
    this.commentsByBill = new Map();
    this.commentsByParent = new Map();

    // Initialize analytics data
    this.departmentStats = [];
    this.competencyMetrics = {
      overall: {},
      byDepartment: {},
    };

    // Initialize session store with 24-hour pruning
    this.sessionStore = new SimpleMemoryStore();
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

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username.toLowerCase());
  }

  async getUserBySocialProfile(provider: string, profile_id: string): Promise<User | undefined> {
    const key = `${provider}:${ profile_id }`;
    return this.usersBySocialProfile.get(key);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return this.getUserBySocialProfile('google', googleId);
  }

  async createUser(user: InsertUser): Promise<User> { const user_id = crypto.randomUUID();
    const newUser: User = {
      id: user_id,
      name: users.name,
      email: users.email,
      password_hash: users.password_hash,
      first_name: users.first_name || '',
      last_name: users.last_name || '',
      role: users.role || 'citizen',
      verification_status: users.verification_status || 'pending',
      preferences: users.preferences || null,
      is_active: users.is_active !== undefined ? users.is_active: true,
      last_login_at: users.last_login_at || null,
      created_at: new Date(),
      updated_at: new Date(),
     };

    // Add to primary collection and secondary indexes
    this.users.set(newUser.id, newUser);
    this.usersByUsername.set(users.email.toLowerCase(), newUser);

    logger.info('User created successfully', { component: 'storage',
      operation: 'createUser',
      user_id: newUser.id,
      email: newUser.email,
      role: newUser.role,
     });

    return newUser;
  }

  async linkSocialProfile(user_id: string, profile: { platform: string; profile_id: string; username: string }): Promise<User> { const user = this.users.get(user_id);
    if (!user) {
      logger.warn('Attempted to link social profile for non-existent user', {
        component: 'storage',
        operation: 'linkSocialProfile',
        user_id,
        platform: profile.platform,
       });
      throw new Error(`User not found with ID: ${ user_id }`);
    }

    // Create the key for social profile index
    const key = `${profile.platform}:${profile.profile_id}`;

    // Check if profile is already linked to another user
    const existingUser = this.usersBySocialProfile.get(key);
    if (existingUser && existingUser.id !== user_id) { logger.warn('Social profile already linked to another user', {
        component: 'storage',
        operation: 'linkSocialProfile',
        user_id,
        platform: profile.platform,
        existingUserId: existingUser.id,
       });
      throw new Error(`Profile already linked to another user: ${existingUser.email}`);
    }

    // Update social profile index
    this.usersBySocialProfile.set(key, user);

    // Create a properly formatted social profile
    const socialProfile = { id: this.generateUniqueId(new Map()),
      user_id: user_id,
      platform: profile.platform,
      profile_id: profile.profile_id,
      username: profile.username,
      created_at: new Date(),
     };

    // Note: socialProfiles should be managed separately in a dedicated table
    // For now, just return the user without modifying it
    logger.info('Social profile linked successfully', { component: 'storage',
      operation: 'linkSocialProfile',
      user_id,
      platform: profile.platform,
      username: profile.username,
     });

    return user;
  }

  async unlinkSocialProfile(user_id: string, platform: string): Promise<User> { const user = this.users.get(user_id);
    if (!user) {
      logger.warn('Attempted to unlink social profile for non-existent user', {
        component: 'storage',
        operation: 'unlinkSocialProfile',
        user_id,
        platform,
       });
      throw new Error(`User not found with ID: ${ user_id }`);
    }

    // Remove from social profile index
    const key = `${platform}:${ user_id }`;
    const existed = this.usersBySocialProfile.has(key);
    this.usersBySocialProfile.delete(key);

    // Update user record
    users.updated_at = new Date();

    logger.info('Social profile unlinked', { component: 'storage',
      operation: 'unlinkSocialProfile',
      user_id,
      platform,
      existed,
     });

    return user;
  }

  async updateUserReputation(user_id: string, change: number): Promise<User> { const user = this.users.get(user_id);
    if (!user) {
      logger.warn('Attempted to update reputation for non-existent user', {
        component: 'storage',
        operation: 'updateUserReputation',
        user_id,
        change,
       });
      throw new Error(`User not found with ID: ${ user_id }`);
    }

    // Note: reputation property doesn't exist in User schema, skipping for now
    users.updated_at = new Date();

    logger.info('User reputation updated', { component: 'storage',
      operation: 'updateUserReputation',
      user_id,
      change,
     });

    return user;
  }

  async updateUserLastActive(user_id: string): Promise<User> { const user = this.users.get(user_id);
    if (!user) {
      logger.warn('Attempted to update last active for non-existent user', {
        component: 'storage',
        operation: 'updateUserLastActive',
        user_id,
       });
      throw new Error(`User not found with ID: ${ user_id }`);
    }

    // Note: lastActive property doesn't exist in User schema, using last_login_at instead
    users.last_login_at = new Date();
    users.updated_at = new Date();

    logger.debug('User last active updated', { component: 'storage',
      operation: 'updateUserLastActive',
      user_id,
     });

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
      id: this.generateUniqueId(this.bills),
      title: bills.title,
      description: bills.description || null,
      content: bills.content || null,
      summary: bills.summary || null,
      status: bills.status || 'introduced',
      bill_number: bills.bill_number || null,
      sponsor_id: bills.sponsor_id || null,
      category: bills.category || null,
      tags: bills.tags || [],
      view_count: bills.view_count || 0,
      share_count: bills.share_count || 0,
      complexity_score: bills.complexity_score || null,
      introduced_date: new Date(),
      last_action_date: new Date(),
      constitutionalConcerns: [],
      stakeholderAnalysis: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Add to primary collection
    this.bills.set(newBill.id, newBill);

    // Update tag index if tags are provided
    if ('tags' in bill && Array.isArray(bills.tags) && bills.tags.length > 0) {
      bills.tags.forEach((tag: string) => {
        if (!this.billsByTag.has(tag)) {
          this.billsByTag.set(tag, new Set());
        }
        this.billsByTag.get(tag)?.add(newBill.id);
      });
    }

    logger.info('Bill created successfully', { component: 'storage',
      operation: 'createBill',
      bill_id: newBill.id,
      title: newBill.title,
      sponsor_id: newBill.sponsor_id,
      tags: newBill.tags,
     });

    return newBill;
  }

  async incrementBillViews(bill_id: number): Promise<Bill> { const bill = this.bills.get(bill_id);
    if (!bill) {
      logger.warn('Attempted to increment views for non-existent bill', {
        component: 'storage',
        operation: 'incrementBillViews',
        bill_id,
       });
      throw new Error(`Bill not found with ID: ${ bill_id }`);
    }

    // Increment view_count instead of using views property
    const previousViews = bills.view_count || 0;
    bills.view_count = previousViews + 1;
    bills.updated_at = new Date();

    logger.debug('Bill views incremented', { component: 'storage',
      operation: 'incrementBillViews',
      bill_id,
      previousViews,
      newViews: bills.view_count,
     });

    return bill;
  }

  async incrementBillShares(bill_id: number): Promise<Bill> { const bill = this.bills.get(bill_id);
    if (!bill) {
      logger.warn('Attempted to increment shares for non-existent bill', {
        component: 'storage',
        operation: 'incrementBillShares',
        bill_id,
       });
      throw new Error(`Bill not found with ID: ${ bill_id }`);
    }

    // Increment share_count instead of using shares property
    const previousShares = bills.share_count || 0;
    bills.share_count = previousShares + 1;
    bills.updated_at = new Date();

    logger.debug('Bill shares incremented', { component: 'storage',
      operation: 'incrementBillShares',
      bill_id,
      previousShares,
      newShares: bills.share_count,
     });

    return bill;
  }

  async getBillsByTags(tags: string[]): Promise<Bill[]> {
    if (!tags || tags.length === 0) {
      logger.debug('No tags provided for bill search', {
        component: 'storage',
        operation: 'getBillsByTags',
      });
      return [];
    }

    // Find bills that match any of the provided tags
    const bill_ids = new Set<number>();
    tags.forEach(tag => {
      const taggedBills = this.billsByTag.get(tag);
      if (taggedBills) {
        taggedBills.forEach(id => bill_ids.add(id));
      }
    });

    // Get the actual bill objects
    const bills = Array.from(bill_ids)
      .map(id => this.bills.get(id))
      .filter((bill): bill is Bill => bill !== undefined);

    logger.debug('Bills retrieved by tags', {
      component: 'storage',
      operation: 'getBillsByTags',
      tags,
      billCount: bills.length,
    });

    return bills;
  }

  // ==============================
  // User Progress Methods
  // ==============================

  async getUserProgress(user_id: number): Promise<UserProgress[]> { return this.user_progress.get(user_id) || [];
   }

  async getProgressByType(user_id: number, achievement_type: string): Promise<UserProgress[]> { const progress = this.user_progress.get(user_id) || [];
    return progress.filter(p => p.achievement_type === achievement_type);
   }

  async updateUserProgress(progress: InsertUserProgress): Promise<UserProgress> { const user_id = progress.user_id;
    if (!this.user_progress.has(Number(user_id))) {
      this.user_progress.set(Number(user_id), []);
     }

    const newProgress: UserProgress = { id: this.generateUniqueId(new Map()),
      created_at: new Date(),
      updated_at: new Date(),
      user_id: progress.user_id,
      achievement_type: progress.achievement_type,
      achievement_value: progress.achievement_value,
      level: progress.level || 1,
      badge: progress.badge || null,
      description: progress.description,
      recommendation: progress.recommendation || null,
      unlocked_at: new Date(),
     };

    this.user_progress.get(Number(user_id))?.push(newProgress);

    logger.info('User progress updated', { component: 'storage',
      operation: 'updateUserProgress',
      progressId: newProgress.id,
      user_id: newProgress.user_id,
      achievement_type: newProgress.achievement_type,
      level: newProgress.level,
     });

    return newProgress;
  }

  // ==============================
  // Social Share Methods
  // ==============================

  async trackSocialShare(share: InsertSocialShare): Promise<SocialShare> { const user_id = share.user_id;
    const bill_id = share.bill_id;

    if (!this.social_shares.has(bill_id)) {
      this.social_shares.set(bill_id, []);
      }

    const newShare: SocialShare = { id: this.generateUniqueId(new Map()),
      created_at: new Date(),
      user_id: user_id,
      bill_id: bill_id,
      platform: share.platform,
      metadata: share.metadata || {  },
      shareDate: new Date(),
      likes: 0,
      shares: 0,
      comments: 0,
    };

    this.social_shares.get(bill_id)?.push(newShare);

    // Increment the bill's share count
    await this.incrementBillShares(bill_id);

    logger.info('Social share tracked', { component: 'storage',
      operation: 'trackSocialShare',
      shareId: newShare.id,
      user_id: newShare.user_id,
      bill_id: newShare.bill_id,
      platform: newShare.platform,
      });

    return newShare;
  }

  async getSocialShareStats(bill_id: number): Promise<{ platform: string; count: number }[]> { const shares = this.social_shares.get(bill_id) || [];
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
      id: this.generateUniqueId(this.stakeholders),
      name: stakeholder.name,
      email: stakeholder.email,
      organization: stakeholder.organization,
      sector: stakeholder.sector,
      type: stakeholder.type,
      influence: stakeholder.influence || 50,
      votingHistory: stakeholder.votingHistory || [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.stakeholders.set(newStakeholder.id, newStakeholder);

    logger.info('Stakeholder created successfully', {
      component: 'storage',
      operation: 'createStakeholder',
      stakeholderId: newStakeholder.id,
      name: newStakeholder.name,
      organization: newStakeholder.organization,
      sector: newStakeholder.sector,
      type: newStakeholder.type,
    });

    return newStakeholder;
  }

  async updateStakeholderVotingHistory(
    stakeholderId: number,
    vote: { bill_id: number; vote: 'yes' | 'no' | 'abstain'; date: string  },
  ): Promise<Stakeholder> { const stakeholder = this.stakeholders.get(stakeholderId);
    if (!stakeholder) {
      logger.warn('Attempted to update voting history for non-existent stakeholder', {
        component: 'storage',
        operation: 'updateStakeholderVotingHistory',
        stakeholderId,
        bill_id: vote.bill_id,
        vote: vote.vote,
       });
      throw new Error(`Stakeholder not found with ID: ${stakeholderId}`);
    }

    // Initialize votingHistory if it doesn't exist
    if (!(stakeholder as any).votingHistory) {
      (stakeholder as any).votingHistory = [];
    }

    // Check if there's an existing vote for this bill
    const existingVoteIndex = (stakeholder as any).votingHistory.findIndex(
      (v: any) => v.bill_id === vote.bill_id,
    );

    const isUpdate = existingVoteIndex >= 0;
    if (isUpdate) {
      // Update existing vote
      (stakeholder as any).votingHistory[existingVoteIndex] = vote;
    } else {
      // Add new vote
      (stakeholder as any).votingHistory.push(vote);
    }

    stakeholder.updated_at = new Date();

    logger.info('Stakeholder voting history updated', { component: 'storage',
      operation: 'updateStakeholderVotingHistory',
      stakeholderId,
      bill_id: vote.bill_id,
      vote: vote.vote,
      isUpdate,
     });

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
      candidateName: input.candidateName,
      departmentId: input.departmentId,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.evaluations.set(newEvaluation.id, newEvaluation);

    logger.info('Evaluation created successfully', {
      component: 'storage',
      operation: 'createEvaluation',
      evaluationId: newEvaluation.id,
      candidateName: newEvaluation.candidateName,
      departmentId: newEvaluation.departmentId,
    });

    return newEvaluation;
  }

  async updateEvaluationStatus(id: number, status: string): Promise<Evaluation> {
    const evaluation = this.evaluations.get(id);
    if (!evaluation) {
      logger.warn('Attempted to update status for non-existent evaluation', {
        component: 'storage',
        operation: 'updateEvaluationStatus',
        evaluationId: id,
        newStatus: status,
      });
      throw new Error(`Evaluation not found with ID: ${id}`);
    }

    const previousStatus = evaluation.status;
    evaluation.status = status as any;
    evaluation.updated_at = new Date();

    logger.info('Evaluation status updated', {
      component: 'storage',
      operation: 'updateEvaluationStatus',
      evaluationId: id,
      candidateName: evaluation.candidateName,
      previousStatus,
      newStatus: status,
    });

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

  async getBillComments(bill_id: number): Promise<BillComment[]> { const comment_ids = this.commentsByBill.get(bill_id) || new Set();
    return Array.from(comment_ids)
      .map(id => this.comments.get(id))
      .filter((comment): comment is BillComment => comment !== undefined);
   }

  async createBillComment(comment: InsertBillComment): Promise<BillComment> {
    const newComment: BillComment = {
      ...comment,
      id: this.generateUniqueId(this.comments),
      created_at: new Date(),
      updated_at: new Date(),
      endorsements: 0,
      isHighlighted: false,
      parent_id: comment.parent_id || null,
    };

    // Add to primary collection
    this.comments.set(newComment.id, newComment);

    // Update bill comments index
    const bill_id = comment.bill_id;
    if (!this.commentsByBill.has(bill_id)) { this.commentsByBill.set(bill_id, new Set());
     }
    this.commentsByBill.get(bill_id)?.add(newComment.id);

    // Update parent comments index if this is a reply
    if (comment.parent_id) {
      if (!this.commentsByParent.has(comment.parent_id)) {
        this.commentsByParent.set(comment.parent_id, new Set());
      }
      this.commentsByParent.get(comment.parent_id)?.add(newComment.id);
    }

    logger.info('Bill comment created', { component: 'storage',
      operation: 'createBillComment',
      comment_id: newComment.id,
      bill_id: newComment.bill_id,
      user_id: newComment.user_id,
      parent_id: newComment.parent_id,
      });

    return newComment;
  }

  // Implement the missing methods required by the IStorage interface
  async updateBillCommentEndorsements(
    comment_id: number,
    endorsements: number,
  ): Promise<BillComment> {
    const comment = this.comments.get(comment_id);
    if (!comment) {
      logger.warn('Attempted to update endorsements for non-existent comment', {
        component: 'storage',
        operation: 'updateBillCommentEndorsements',
        comment_id,
        endorsements,
      });
      throw new Error(`Comment not found with ID: ${comment_id}`);
    }

    const previousEndorsements = (comment as any).endorsements || 0;
    (comment as any).endorsements = endorsements;
    comment.updated_at = new Date();

    logger.debug('Bill comment endorsements updated', {
      component: 'storage',
      operation: 'updateBillCommentEndorsements',
      comment_id,
      previousEndorsements,
      newEndorsements: endorsements,
    });

    return comment;
  }

  async getCommentReplies(parent_id: number): Promise<BillComment[]> {
    const replyIds = this.commentsByParent.get(parent_id) || new Set();
    return Array.from(replyIds)
      .map(id => this.comments.get(id))
      .filter((comment): comment is BillComment => comment !== undefined);
  }

  async highlightComment(comment_id: number): Promise<BillComment> {
    const comment = this.comments.get(comment_id);
    if (!comment) {
      logger.warn('Attempted to highlight non-existent comment', {
        component: 'storage',
        operation: 'highlightComment',
        comment_id,
      });
      throw new Error(`Comment not found with ID: ${comment_id}`);
    }

    (comment as any).isHighlighted = true;
    comment.updated_at = new Date();

    logger.info('Bill comment highlighted', { component: 'storage',
      operation: 'highlightComment',
      comment_id,
      bill_id: comment.bill_id,
      user_id: comment.user_id,
      });

    return comment;
  }

  // Helper method to create a social profile index key
  private indexSocialProfile(p: { platform: string; profile_id: string; username: string }): string {
    return `${p.platform}:${p.profile_id}`;
  }
}

export const storage = new MemStorage();














































