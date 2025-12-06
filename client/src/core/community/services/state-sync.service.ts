/**
 * State Sync Service
 * 
 * Coordinates React Query cache with WebSocket events and EventBus,
 * resolving the "React Query vs EventBus" conflict identified in the analysis.
 */

import { QueryClient } from '@tanstack/react-query';

import { WebSocketManager } from './websocket-manager';
import type { UnifiedComment, UnifiedThread } from '../types';

export class StateSyncService {
  constructor(
    private queryClient: QueryClient,
    private wsManager: WebSocketManager | null
  ) {}

  /**
   * Sync comment creation across React Query cache and WebSocket
   */
  syncCommentCreated(comment: UnifiedComment): void {
    // Update React Query cache optimistically
    this.updateCommentsCache(comment.billId, (comments) => [comment, ...comments]);
    
    // Broadcast via WebSocket if connected
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:created', { comment });
    }
    
    // Update thread comment count
    this.updateThreadCommentCount(comment.threadId, 1);
  }

  /**
   * Sync comment updates
   */
  syncCommentUpdated(comment: UnifiedComment): void {
    // Update React Query cache
    this.updateCommentsCache(comment.billId, (comments) =>
      comments.map(c => c.id === comment.id ? comment : c)
    );
    
    // Broadcast via WebSocket
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:updated', { comment });
    }
  }

  /**
   * Sync comment deletion
   */
  syncCommentDeleted(commentId: string): void {
    // Find the comment to get billId and threadId before deletion
    const allQueries = this.queryClient.getQueriesData({ queryKey: ['comments'] });
    let billId: number | undefined;
    let threadId: string | undefined;

    for (const [queryKey, data] of allQueries) {
      if (Array.isArray(data)) {
        const comment = (data as UnifiedComment[]).find(c => c.id === commentId);
        if (comment) {
          billId = comment.billId;
          threadId = comment.threadId;
          break;
        }
      }
    }

    if (billId) {
      // Update React Query cache
      this.updateCommentsCache(billId, (comments) =>
        comments.filter(c => c.id !== commentId)
      );
      
      // Update thread comment count
      this.updateThreadCommentCount(threadId, -1);
    }

    // Broadcast via WebSocket
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:deleted', { commentId });
    }
  }

  /**
   * Sync comment voting
   */
  syncCommentVoted(comment: UnifiedComment): void {
    // Update React Query cache with new vote counts
    this.updateCommentsCache(comment.billId, (comments) =>
      comments.map(c => c.id === comment.id ? comment : c)
    );
    
    // Broadcast via WebSocket
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:voted', { 
        commentId: comment.id, 
        score: comment.score 
      });
    }
  }

  /**
   * Sync thread creation
   */
  syncThreadCreated(thread: UnifiedThread): void {
    // Update React Query cache
    this.queryClient.setQueryData(
      ['threads', thread.billId],
      (old: UnifiedThread[] = []) => [thread, ...old]
    );
    
    // Broadcast via WebSocket
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('thread:created', { thread });
    }
  }

  /**
   * Sync thread updates
   */
  syncThreadUpdated(thread: UnifiedThread): void {
    // Update React Query cache
    this.queryClient.setQueryData(
      ['threads', thread.billId],
      (old: UnifiedThread[] = []) =>
        old.map(t => t.id === thread.id ? thread : t)
    );
    
    // Broadcast via WebSocket
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('thread:updated', { thread });
    }
  }

  /**
   * Handle incoming WebSocket events and sync with React Query
   */
  handleWebSocketEvent<T>(event: string, data: T): void {
    switch (event) {
      case 'comment:created':
        const { comment: newComment } = data as { comment: UnifiedComment };
        this.updateCommentsCache(newComment.billId, (comments) => {
          // Avoid duplicates
          if (comments.some(c => c.id === newComment.id)) {
            return comments;
          }
          return [newComment, ...comments];
        });
        break;

      case 'comment:updated':
        const { comment: updatedComment } = data as { comment: UnifiedComment };
        this.updateCommentsCache(updatedComment.billId, (comments) =>
          comments.map(c => c.id === updatedComment.id ? updatedComment : c)
        );
        break;

      case 'comment:deleted':
        const { commentId } = data as { commentId: string };
        // Update all comment caches
        const queries = this.queryClient.getQueriesData({ queryKey: ['comments'] });
        queries.forEach(([queryKey, queryData]) => {
          if (Array.isArray(queryData)) {
            const filtered = (queryData as UnifiedComment[]).filter(c => c.id !== commentId);
            this.queryClient.setQueryData(queryKey, filtered);
          }
        });
        break;

      case 'thread:created':
        const { thread: newThread } = data as { thread: UnifiedThread };
        this.queryClient.setQueryData(
          ['threads', newThread.billId],
          (old: UnifiedThread[] = []) => {
            // Avoid duplicates
            if (old.some(t => t.id === newThread.id)) {
              return old;
            }
            return [newThread, ...old];
          }
        );
        break;

      case 'thread:updated':
        const { thread: updatedThread } = data as { thread: UnifiedThread };
        this.queryClient.setQueryData(
          ['threads', updatedThread.billId],
          (old: UnifiedThread[] = []) =>
            old.map(t => t.id === updatedThread.id ? updatedThread : t)
        );
        break;
    }
  }

  /**
   * Invalidate related queries when data changes
   */
  invalidateRelatedQueries(billId: number, threadId?: string): void {
    // Invalidate comments for the bill
    this.queryClient.invalidateQueries({ queryKey: ['comments', billId] });
    
    // Invalidate threads for the bill
    this.queryClient.invalidateQueries({ queryKey: ['threads', billId] });
    
    // Invalidate thread-specific queries if threadId provided
    if (threadId) {
      this.queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    }
  }

  /**
   * Helper to update comments cache across all query variations
   */
  private updateCommentsCache(
    billId: number, 
    updater: (comments: UnifiedComment[]) => UnifiedComment[]
  ): void {
    // Update all comment queries for this bill
    const queryKeys = [
      ['comments', billId, 'newest', 'all'],
      ['comments', billId, 'oldest', 'all'],
      ['comments', billId, 'score', 'all'],
      ['comments', billId, 'quality', 'all'],
      ['comments', billId, 'newest', 'expert_verified'],
      ['comments', billId, 'newest', 'high_quality'],
    ];

    queryKeys.forEach(queryKey => {
      this.queryClient.setQueryData(queryKey, (old: UnifiedComment[] = []) => {
        try {
          return updater(old);
        } catch (error) {
          console.error('Error updating comments cache:', error);
          return old;
        }
      });
    });
  }

  /**
   * Helper to update thread comment count
   */
  private updateThreadCommentCount(threadId: string | undefined, delta: number): void {
    if (!threadId) return;

    // Find and update the thread in all thread queries
    const threadQueries = this.queryClient.getQueriesData({ queryKey: ['threads'] });
    
    threadQueries.forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const updatedThreads = (data as UnifiedThread[]).map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              commentCount: Math.max(0, thread.commentCount + delta),
              lastActivityAt: new Date().toISOString(),
            };
          }
          return thread;
        });
        
        this.queryClient.setQueryData(queryKey, updatedThreads);
      }
    });
  }
}