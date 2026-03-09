/**
 * State Sync Service
 *
 * Coordinates React Query cache with WebSocket events and EventBus,
 * resolving the "React Query vs EventBus" conflict identified in the analysis.
 */

import { QueryClient } from '@tanstack/react-query';

import type { UnifiedComment, UnifiedModeration, UnifiedThread } from '../types';

import { type WebSocketManager } from '@client/infrastructure/api';

// ============================================================================
// SYNCABLE COMMENT
//
// StateSyncService receives EnrichedComment instances from the hook layer, but
// UnifiedComment (which extends the shared Comment base) does not declare the
// extra fields that only the API response carries (billId, threadId, id, votes).
//
// Rather than widening the shared type — which would break other consumers —
// we define SyncableComment here as the minimum contract the service needs.
// EnrichedComment in useUnifiedDiscussion satisfies this intersection, so
// passing it here is safe and the compiler is happy.
// ============================================================================

interface CommentVotes {
  up: number;
  down: number;
}

interface SyncableComment extends UnifiedComment {
  id: string | number;
  billId: string | number;
  threadId?: number;
  votes: CommentVotes;
}

export class StateSyncService {
  constructor(
    private queryClient: QueryClient,
    private wsManager: WebSocketManager | null
  ) {}

  /**
   * Sync comment creation across React Query cache and WebSocket
   */
  syncCommentCreated(comment: SyncableComment): void {
    const billId =
      typeof comment.billId === 'string' ? parseInt(comment.billId, 10) : comment.billId;
    const threadId = comment.threadId
      ? typeof comment.threadId === 'string'
        ? parseInt(comment.threadId, 10)
        : comment.threadId
      : undefined;

    const normalizedComment: SyncableComment = {
      ...comment,
      billId,
      threadId,
    };
    this.updateCommentsCache(billId, comments => [normalizedComment, ...comments]);

    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:new', comment);
    }

    this.updateThreadCommentCount(comment.threadId, 1);
  }

  /**
   * Sync comment updates
   */
  syncCommentUpdated(comment: SyncableComment): void {
    const billId =
      typeof comment.billId === 'string' ? parseInt(comment.billId, 10) : comment.billId;
    const threadId = comment.threadId
      ? typeof comment.threadId === 'string'
        ? parseInt(comment.threadId, 10)
        : comment.threadId
      : undefined;

    const normalizedComment: SyncableComment = {
      ...comment,
      billId,
      threadId,
    };

    this.updateCommentsCache(billId, comments =>
      comments.map(c => (c.id === normalizedComment.id ? normalizedComment : c))
    );

    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:updated', normalizedComment);
    }
  }

  /**
   * Sync comment deletion
   */
  syncCommentDeleted(commentId: string): void {
    const allQueries = this.queryClient.getQueriesData({ queryKey: ['comments'] });
    let billId: number | undefined;
    let threadId: number | undefined;

    for (const [, data] of allQueries) {
      if (Array.isArray(data)) {
        const comment = (data as SyncableComment[]).find(c => String(c.id) === commentId);
        if (comment) {
          billId =
            typeof comment.billId === 'string' ? parseInt(comment.billId, 10) : comment.billId;
          threadId = comment.threadId;
          break;
        }
      }
    }

    if (billId !== undefined) {
      this.updateCommentsCache(billId, comments =>
        comments.filter(c => String(c.id) !== commentId)
      );
      this.updateThreadCommentCount(threadId, -1);
    }

    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:deleted', { id: parseInt(commentId, 10) });
    }
  }

  /**
   * Sync comment voting
   */
  syncCommentVoted(comment: SyncableComment): void {
    const billId =
      typeof comment.billId === 'string' ? parseInt(comment.billId, 10) : comment.billId;
    const threadId = comment.threadId
      ? typeof comment.threadId === 'string'
        ? parseInt(comment.threadId, 10)
        : comment.threadId
      : undefined;

    const normalizedComment: SyncableComment = {
      ...comment,
      billId,
      threadId,
    };

    this.updateCommentsCache(billId, comments =>
      comments.map(c => (c.id === normalizedComment.id ? normalizedComment : c))
    );

    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('comment:voted', {
        id: normalizedComment.id,
        upvotes: normalizedComment.votes.up,
        downvotes: normalizedComment.votes.down,
      });
    }
  }

  /**
   * Sync thread creation
   */
  syncThreadCreated(thread: UnifiedThread): void {
    this.queryClient.setQueryData(['threads', thread.billId], (old: UnifiedThread[] = []) => [
      thread,
      ...old,
    ]);

    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('thread:created', thread);
    }
  }

  /**
   * Sync thread updates
   */
  syncThreadUpdated(thread: UnifiedThread): void {
    this.queryClient.setQueryData(['threads', thread.billId], (old: UnifiedThread[] = []) =>
      old.map(t => (t.id === thread.id ? thread : t))
    );

    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('thread:updated', thread);
    }
  }

  /**
   * Sync a moderation action result.
   *
   * After a moderator acts on content the server returns a UnifiedModeration
   * record. We broadcast it over the socket so other connected clients can
   * react (e.g. hide the comment immediately) and then invalidate the relevant
   * comment cache so the next read reflects the new moderation status.
   */
  syncModerationAction(moderation: UnifiedModeration, billId: number): void {
    // Broadcast to other connected clients
    if (this.wsManager?.isConnected()) {
      this.wsManager.emit('moderation:action', moderation);
    }

    // Invalidate the comment cache for this bill so any hidden/removed
    // comments are re-fetched with their updated moderation status.
    this.queryClient.invalidateQueries({ queryKey: ['comments', billId] });
  }

  /**
   * Handle incoming WebSocket events and sync with React Query
   */
  handleWebSocketEvent<T>(event: string, data: T): void {
    switch (event) {
      case 'comment:new': {
        const newComment = data as SyncableComment;
        const billId =
          typeof newComment.billId === 'string'
            ? parseInt(newComment.billId, 10)
            : newComment.billId;
        this.updateCommentsCache(billId, comments => {
          if (comments.some(c => c.id === newComment.id)) return comments;
          return [newComment, ...comments];
        });
        break;
      }

      case 'comment:updated': {
        const updatedComment = data as SyncableComment;
        const billId =
          typeof updatedComment.billId === 'string'
            ? parseInt(updatedComment.billId, 10)
            : updatedComment.billId;
        this.updateCommentsCache(billId, comments =>
          comments.map(c => (c.id === updatedComment.id ? updatedComment : c))
        );
        break;
      }

      case 'comment:deleted': {
        const { id } = data as { id: number };
        const queries = this.queryClient.getQueriesData({ queryKey: ['comments'] });
        queries.forEach(([, queryData]) => {
          if (Array.isArray(queryData)) {
            const filtered = (queryData as SyncableComment[]).filter(c => c.id !== id);
            this.queryClient.setQueryData(queryData, filtered);
          }
        });
        break;
      }

      case 'thread:created': {
        const newThread = data as UnifiedThread;
        const billId =
          typeof newThread.billId === 'string' ? parseInt(newThread.billId, 10) : newThread.billId;
        this.queryClient.setQueryData(['threads', billId], (old: UnifiedThread[] = []) => {
          if (old.some(t => t.id === newThread.id)) return old;
          return [newThread, ...old];
        });
        break;
      }

      case 'thread:updated': {
        const updatedThread = data as UnifiedThread;
        const billId =
          typeof updatedThread.billId === 'string'
            ? parseInt(updatedThread.billId, 10)
            : updatedThread.billId;
        this.queryClient.setQueryData(['threads', billId], (old: UnifiedThread[] = []) =>
          old.map(t => (t.id === updatedThread.id ? updatedThread : t))
        );
        break;
      }

      case 'moderation:action': {
        // When a peer broadcasts a moderation action, invalidate local comment
        // cache so the UI reflects the updated moderation status on next read.
        this.queryClient.invalidateQueries({
          predicate: query =>
            Array.isArray(query.queryKey) && query.queryKey[0] === 'comments',
        });
        break;
      }
    }
  }

  /**
   * Invalidate related queries when data changes
   */
  invalidateRelatedQueries(billId: number, threadId?: string): void {
    this.queryClient.invalidateQueries({ queryKey: ['comments', billId] });
    this.queryClient.invalidateQueries({ queryKey: ['threads', billId] });

    if (threadId) {
      this.queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private updateCommentsCache(
    billId: number,
    updater: (comments: SyncableComment[]) => SyncableComment[]
  ): void {
    const queryKeys = [
      ['comments', billId, 'newest', 'all'],
      ['comments', billId, 'oldest', 'all'],
      ['comments', billId, 'score', 'all'],
      ['comments', billId, 'quality', 'all'],
      ['comments', billId, 'newest', 'expert_verified'],
      ['comments', billId, 'newest', 'high_quality'],
    ];

    queryKeys.forEach(queryKey => {
      this.queryClient.setQueryData(queryKey, (old: SyncableComment[] = []) => {
        try {
          return updater(old);
        } catch (error) {
          console.error('Error updating comments cache:', error);
          return old;
        }
      });
    });
  }

  private updateThreadCommentCount(threadId: number | undefined, delta: number): void {
    if (!threadId) return;

    const threadQueries = this.queryClient.getQueriesData({ queryKey: ['threads'] });

    threadQueries.forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const updatedThreads = (data as UnifiedThread[]).map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              messageCount: Math.max(0, (thread.messageCount || 0) + delta),
              lastActivity: new Date().toISOString(),
            };
          }
          return thread;
        });

        this.queryClient.setQueryData(queryKey, updatedThreads);
      }
    });
  }
}