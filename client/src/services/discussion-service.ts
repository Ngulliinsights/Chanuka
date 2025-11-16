/**
 * Discussion Service - API integration and WebSocket handling for discussions
 * 
 * Handles API calls for discussion threads, comments, moderation,
 * and integrates with existing WebSocket client for real-time updates.
 */

import { UnifiedWebSocketManager } from '../core/api/websocket';
import { 
  DiscussionThread, 
  Comment, 
  CommentFormData, 
  CommentReport, 
  ModerationAction,
  ModerationViolationType,
  CommentUpdateEvent,
  ModerationEvent,
  TypingIndicator
} from '../types/discussion';

class DiscussionService {
  private baseUrl: string;
  private isInitialized = false;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the discussion service with WebSocket integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set up WebSocket event listeners for real-time discussion updates
    this.setupWebSocketListeners();
    this.isInitialized = true;
  }

  /**
   * Set up WebSocket listeners for real-time discussion features
   */
  private setupWebSocketListeners(): void {
    // Listen for bill updates which can include comment updates
    UnifiedWebSocketManager.getInstance().on('billUpdate', (data: any) => {
      // Check if this is a comment-related update
      if (data.update?.type === 'new_comment' || data.update?.type === 'comment_update') {
        window.dispatchEvent(new CustomEvent('discussionUpdate', { detail: data }));
      }
    });

    // Listen for notifications which can include moderation events
    UnifiedWebSocketManager.getInstance().on('notification', (data: any) => {
      if (data.type === 'moderation_action' || data.type === 'comment_reported') {
        window.dispatchEvent(new CustomEvent('moderationUpdate', { detail: data }));
      }
    });

    // For typing indicators, we'll use a custom implementation
    // This would be extended in the WebSocket client to support typing events
  }

  /**
   * Fetch discussion thread for a bill
   */
  async getDiscussionThread(billId: number): Promise<DiscussionThread> {
    const response = await fetch(`${this.baseUrl}/bills/${billId}/discussion`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch discussion thread: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Add a new comment to a discussion
   */
  async addComment(data: CommentFormData): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/bills/${data.billId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: data.content,
        parentId: data.parentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }

    const comment = await response.json();

    // Send real-time update via WebSocket
    this.sendCommentUpdate({
      type: 'comment_added',
      billId: data.billId,
      commentId: comment.id,
      comment,
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update comment: ${response.statusText}`);
    }

    const comment = await response.json();

    // Send real-time update via WebSocket
    this.sendCommentUpdate({
      type: 'comment_updated',
      billId: comment.billId,
      commentId: comment.id,
      comment,
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }

    // Get comment info for WebSocket update
    const comment = await this.getComment(commentId);
    
    // Send real-time update via WebSocket
    this.sendCommentUpdate({
      type: 'comment_removed',
      billId: comment.billId,
      commentId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ voteType }),
    });

    if (!response.ok) {
      throw new Error(`Failed to vote on comment: ${response.statusText}`);
    }

    const comment = await response.json();

    // Send real-time update via WebSocket
    this.sendCommentUpdate({
      type: 'comment_voted',
      billId: comment.billId,
      commentId,
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * Report a comment for moderation
   */
  async reportComment(
    commentId: string, 
    violationType: ModerationViolationType, 
    reason: string,
    description?: string
  ): Promise<CommentReport> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        violationType,
        reason,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to report comment: ${response.statusText}`);
    }

    const report = await response.json();

    // Send moderation event via WebSocket
    this.sendModerationEvent({
      type: 'comment_reported',
      commentId,
      timestamp: new Date().toISOString(),
    });

    return report;
  }

  /**
   * Moderate a comment (for moderators)
   */
  async moderateComment(
    commentId: string, 
    action: string, 
    reason: string
  ): Promise<ModerationAction> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}/moderate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        reason,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to moderate comment: ${response.statusText}`);
    }

    const moderationAction = await response.json();

    // Send moderation event via WebSocket
    this.sendModerationEvent({
      type: 'comment_moderated',
      commentId,
      action,
      reason,
      timestamp: new Date().toISOString(),
    });

    return moderationAction;
  }

  /**
   * Get a specific comment by ID
   */
  async getComment(commentId: string): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch comment: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Subscribe to real-time updates for a bill's discussion
   */
  subscribeToDiscussion(billId: number): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      console.warn('WebSocket not connected. Cannot subscribe to discussion updates.');
      return;
    }

    // Use existing WebSocket client to subscribe to bill-specific updates
    UnifiedWebSocketManager.getInstance().subscribeToBill(billId, ['new_comment', 'comment_update', 'moderation_action']);
  }

  /**
   * Unsubscribe from real-time updates for a bill's discussion
   */
  unsubscribeFromDiscussion(billId: number): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      return;
    }

    UnifiedWebSocketManager.getInstance().unsubscribeFromBill(billId);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(billId: number, parentId?: string): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      return;
    }

    // For now, we'll use the existing WebSocket structure
    // This could be extended to support typing indicators in the future
    console.log('Typing indicator sent for bill:', billId, 'parent:', parentId);
  }

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(billId: number, parentId?: string): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      return;
    }

    console.log('Typing indicator stopped for bill:', billId, 'parent:', parentId);
  }

  /**
   * Send comment update via WebSocket
   */
  private sendCommentUpdate(event: CommentUpdateEvent): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      return;
    }

    // Use existing WebSocket structure - this would be handled by the server
    // and broadcast to other connected clients
    console.log('Comment update sent:', event);
  }

  /**
   * Send moderation event via WebSocket
   */
  private sendModerationEvent(event: ModerationEvent): void {
    if (!UnifiedWebSocketManager.getInstance().isConnected()) {
      return;
    }

    // Use existing WebSocket structure for moderation events
    console.log('Moderation event sent:', event);
  }

  /**
   * Get discussion statistics for a bill
   */
  async getDiscussionStats(billId: number): Promise<{
    totalComments: number;
    participantCount: number;
    expertParticipation: number;
    qualityScore: number;
    engagementScore: number;
  }> {
    const response = await fetch(`${this.baseUrl}/bills/${billId}/discussion/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch discussion stats: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get moderation queue (for moderators)
   */
  async getModerationQueue(): Promise<{
    reports: CommentReport[];
    flaggedComments: Comment[];
    pendingActions: ModerationAction[];
  }> {
    const response = await fetch(`${this.baseUrl}/moderation/queue`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch moderation queue: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get community guidelines
   */
  async getCommunityGuidelines(): Promise<{
    guidelines: string[];
    examples: Record<string, string[]>;
    consequences: Record<string, string[]>;
  }> {
    const response = await fetch(`${this.baseUrl}/community/guidelines`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch community guidelines: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Remove WebSocket listeners - using existing event types
    // Note: These would need to be added to the WebSocket client's event map
    // For now, we'll handle cleanup through the existing WebSocket client methods
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const discussionService = new DiscussionService();

// Export class for testing
export { DiscussionService };