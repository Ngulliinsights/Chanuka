/**
 * Mock Discussion Data
 *
 * Comprehensive mock data for discussion threads, comments, moderation,
 * and real-time discussion features.
 */

import { faker } from '@faker-js/faker';

import {
  DiscussionThread,
  Comment,
  CommentReport,
  ModerationAction,
  ModerationFlag,
  TypingIndicator,
} from '@client/features/community/types';

import { mockExperts, mockOfficialExperts } from './experts';
import {
  generateId,
  generateDateInRange,
  generateVotingMetrics,
  generateQualityMetrics,
  generateCommentContent,
  weightedRandom,
} from './generators';
import { mockUsers } from './users';

// Seed faker for consistent data
faker.seed(12345);

/**
 * Generate nested comments with proper threading
 */
const generateNestedComments = (
  billId: number,
  parentId: string | undefined,
  depth: number,
  maxDepth: number = 4,
  count: number = 3
): Comment[] => {
  if (depth >= maxDepth) return [];

  const allUsers = [...mockUsers, ...mockExperts, ...mockOfficialExperts];
  const comments: Comment[] = [];

  for (let i = 0; i < count; i++) {
    const user = faker.helpers.arrayElement(allUsers);
    const isExpert =
      mockExperts.some(e => e.id === user.id) || mockOfficialExperts.some(e => e.id === user.id);
    const voting = generateVotingMetrics();
    const quality = generateQualityMetrics();

    const comment: Comment = {
      id: generateId('comment'),
      billId,
      parentId,
      authorId: user.id,
      authorName: user.name || (user as any).name || 'Anonymous',
      authorAvatar: (user as any).avatar || faker.image.avatar(),
      content: generateCommentContent(isExpert),
      createdAt: generateDateInRange(30, 0),
      updatedAt: generateDateInRange(15, 0),
      editedAt: faker.datatype.boolean({ probability: 0.2 })
        ? generateDateInRange(10, 0)
        : undefined,
      ...voting,
      replies: [],
      replyCount: 0,
      depth,
      status: weightedRandom(['active', 'hidden', 'removed', 'under_review'], [85, 8, 5, 2]),
      moderationFlags: [],
      reportCount: faker.number.int({ min: 0, max: 3 }),
      ...quality,
      isExpertComment: isExpert,
      expertVerification: isExpert
        ? {
            type: (user as any).verificationType || 'domain',
            credibilityScore: (user as any).credibilityScore || 0.7,
          }
        : undefined,
    };

    // Generate replies for this comment (recursive)
    if (depth < maxDepth - 1) {
      const replyCount = faker.number.int({ min: 0, max: Math.max(1, 4 - depth) });
      comment.replies = generateNestedComments(billId, comment.id, depth + 1, maxDepth, replyCount);
      comment.replyCount = comment.replies.length;
    }

    comments.push(comment);
  }

  return comments;
};

/**
 * Generate a discussion thread for a bill
 */
export const generateDiscussionThread = (billId: number): DiscussionThread => {
  const topLevelCommentCount = faker.number.int({ min: 5, max: 20 });
  const comments = generateNestedComments(billId, undefined, 0, 5, topLevelCommentCount);

  // Calculate total comments including nested ones
  const countAllComments = (commentList: Comment[]): number => {
    return commentList.reduce((total, comment) => {
      return total + 1 + countAllComments(comment.replies);
    }, 0);
  };

  const totalComments = countAllComments(comments);
  const participantCount = faker.number.int({
    min: Math.floor(totalComments * 0.3),
    max: totalComments,
  });

  // Calculate expert participation percentage
  const expertComments = comments.filter(c => c.isExpertComment).length;
  const expertParticipation = totalComments > 0 ? (expertComments / totalComments) * 100 : 0;

  return {
    id: generateId('thread'),
    billId,
    title: faker.helpers.arrayElement([
      'General Discussion',
      'Constitutional Concerns',
      'Implementation Questions',
      'Community Impact',
      'Expert Analysis',
    ]),
    description: faker.lorem.paragraph(1),
    createdAt: generateDateInRange(60, 0),
    updatedAt: generateDateInRange(1, 0),
    comments,
    totalComments,
    participantCount,
    isLocked: faker.datatype.boolean({ probability: 0.05 }),
    lockReason: undefined,
    lockedBy: undefined,
    lockedAt: undefined,
    engagementScore: faker.number.float({ min: 0.3, max: 1.0, fractionDigits: 2 }),
    qualityScore: faker.number.float({ min: 0.4, max: 1.0, fractionDigits: 2 }),
    expertParticipation: Math.round(expertParticipation),
    lastActivity: generateDateInRange(1, 0),
    activeUsers: Array.from(
      { length: faker.number.int({ min: 0, max: 5 }) },
      () => faker.helpers.arrayElement(mockUsers).id
    ),
  };
};

/**
 * Generate comment reports
 */
export const generateCommentReports = (
  commentIds: string[],
  count: number = 10
): CommentReport[] => {
  const violationTypes = [
    'spam',
    'harassment',
    'misinformation',
    'off_topic',
    'inappropriate_language',
    'personal_attack',
    'duplicate_content',
    'copyright_violation',
    'other',
  ] as const;

  const statuses = ['pending', 'under_review', 'resolved', 'dismissed'] as const;

  return Array.from({ length: count }, () => {
    const commentId = faker.helpers.arrayElement(commentIds);
    const violationType = faker.helpers.arrayElement(violationTypes);
    const status = weightedRandom([...statuses], [30, 20, 35, 15]) as (typeof statuses)[number];

    return {
      id: generateId('report'),
      commentId,
      reporterId: faker.helpers.arrayElement(mockUsers).id,
      violationType,
      reason: faker.helpers.arrayElement([
        'This comment contains spam content',
        'Inappropriate language used',
        'Personal attack on other users',
        'Off-topic discussion',
        'Potential misinformation',
      ]),
      description: faker.lorem.paragraph(1),
      createdAt: generateDateInRange(30, 0),
      status,
      reviewedBy: status !== 'pending' ? faker.helpers.arrayElement(mockUsers).id : undefined,
      reviewedAt: status !== 'pending' ? generateDateInRange(15, 0) : undefined,
      resolution:
        status === 'resolved'
          ? faker.helpers.arrayElement([
              'Comment removed for violation',
              'Warning issued to user',
              'No action required',
              'User temporarily suspended',
            ])
          : undefined,
    };
  });
};

/**
 * Generate moderation actions
 */
export const generateModerationActions = (
  commentIds: string[],
  count: number = 5
): ModerationAction[] => {
  const actions = ['hide', 'remove', 'restore', 'warn', 'ban_user'] as const;

  return Array.from({ length: count }, () => {
    const action = faker.helpers.arrayElement(actions);

    return {
      id: generateId('modaction'),
      commentId: faker.helpers.arrayElement(commentIds),
      moderatorId: faker.helpers.arrayElement(mockUsers).id,
      action,
      reason: faker.helpers.arrayElement([
        'Violation of community guidelines',
        'Spam content detected',
        'Inappropriate language',
        'Personal attack',
        'Off-topic discussion',
      ]),
      description: faker.lorem.paragraph(1),
      createdAt: generateDateInRange(15, 0),
      appealable: action !== 'warn',
      appealDeadline:
        action !== 'warn'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
    };
  });
};

/**
 * Generate moderation flags
 */
export const generateModerationFlags = (
  commentIds: string[],
  count: number = 8
): ModerationFlag[] => {
  const violationTypes = [
    'spam',
    'harassment',
    'misinformation',
    'off_topic',
    'inappropriate_language',
    'personal_attack',
    'duplicate_content',
    'copyright_violation',
    'other',
  ] as const;

  const statuses = ['pending', 'reviewed', 'dismissed', 'upheld'] as const;

  return Array.from({ length: count }, () => {
    const status = weightedRandom([...statuses], [40, 25, 20, 15]) as (typeof statuses)[number];

    return {
      id: generateId('flag'),
      commentId: faker.helpers.arrayElement(commentIds),
      reporterId: faker.helpers.arrayElement(mockUsers).id,
      type: faker.helpers.arrayElement(violationTypes),
      reason: faker.helpers.arrayElement([
        'Contains spam or promotional content',
        'Uses inappropriate language',
        'Personal attack on community members',
        'Spreads misinformation',
        'Off-topic discussion',
      ]),
      description: faker.lorem.paragraph(1),
      createdAt: generateDateInRange(20, 0),
      status,
      reviewedBy: status !== 'pending' ? faker.helpers.arrayElement(mockUsers).id : undefined,
      reviewedAt: status !== 'pending' ? generateDateInRange(10, 0) : undefined,
      reviewNotes: status !== 'pending' ? faker.lorem.sentence() : undefined,
    };
  });
};

/**
 * Generate typing indicators
 */
export const generateTypingIndicators = (billId: number, count: number = 3): TypingIndicator[] => {
  return Array.from({ length: count }, () => {
    const user = faker.helpers.arrayElement(mockUsers);

    return {
      userId: user.id,
      userName: user.name || `${user.first_name} ${user.last_name}`,
      billId,
      parentId: faker.datatype.boolean({ probability: 0.4 }) ? generateId('comment') : undefined,
      timestamp: new Date().toISOString(),
    };
  });
};

/**
 * Generate discussion threads for multiple bills
 */
export const generateDiscussionThreads = (billIds: number[]): Record<number, DiscussionThread> => {
  const threads: Record<number, DiscussionThread> = {};

  billIds.forEach(billId => {
    threads[billId] = generateDiscussionThread(billId);
  });

  return threads;
};

/**
 * Extract all comments from threads for easier access
 */
export const extractAllComments = (
  threads: Record<number, DiscussionThread>
): Record<string, Comment> => {
  const comments: Record<string, Comment> = {};

  const addCommentsRecursively = (commentList: Comment[]) => {
    commentList.forEach(comment => {
      comments[comment.id] = comment;
      addCommentsRecursively(comment.replies);
    });
  };

  Object.values(threads).forEach(thread => {
    addCommentsRecursively(thread.comments);
  });

  return comments;
};

/**
 * Generate mock discussion data for bills 1-20
 */
const billIds = Array.from({ length: 20 }, (_, i) => i + 1);
export const mockDiscussionThreads = generateDiscussionThreads(billIds);
export const mockComments = extractAllComments(mockDiscussionThreads);

// Generate related moderation data
const allCommentIds = Object.keys(mockComments);
export const mockCommentReports = generateCommentReports(allCommentIds, 25);
export const mockModerationActions = generateModerationActions(allCommentIds, 15);
export const mockModerationFlags = generateModerationFlags(allCommentIds, 20);

/**
 * Generate typing indicators for active discussions
 */
export const mockTypingIndicators = billIds
  .slice(0, 5)
  .flatMap(billId => generateTypingIndicators(billId, faker.number.int({ min: 0, max: 3 })));

/**
 * Get discussion thread by bill ID
 */
export const getMockDiscussionThread = (billId: number): DiscussionThread | null => {
  return mockDiscussionThreads[billId] || null;
};

/**
 * Get comments for a specific bill
 */
export const getMockCommentsByBill = (billId: number): Comment[] => {
  const thread = mockDiscussionThreads[billId];
  if (!thread) return [];

  const allComments: Comment[] = [];

  const collectComments = (commentList: Comment[]) => {
    commentList.forEach(comment => {
      allComments.push(comment);
      collectComments(comment.replies);
    });
  };

  collectComments(thread.comments);
  return allComments;
};

/**
 * Get moderation statistics
 */
export const getMockModerationStats = () => {
  const totalReports = mockCommentReports.length;
  const pendingReports = mockCommentReports.filter(r => r.status === 'pending').length;
  const resolvedReports = mockCommentReports.filter(r => r.status === 'resolved').length;

  return {
    totalReports,
    pendingReports,
    resolvedReports,
    totalActions: mockModerationActions.length,
    totalFlags: mockModerationFlags.length,
  };
};
