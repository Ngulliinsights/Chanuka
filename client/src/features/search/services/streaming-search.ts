/**
 * Streaming Search Service
 *
 * Handles real-time streaming search results using Server-Sent Events (SSE)
 * or progressive loading with proper session management and cancellation.
 */

import { streamSearch, cancelSearch } from '@client/infrastructure/api/search';
import { logger } from '@client/lib/utils/logger';
import type { SearchResult, SearchRequest as SearchQuery, SearchProgress } from '@client/lib/types/search';

// Define types locally
// Local types removed in favor of shared types

export interface StreamingSearchOptions {
  onResult?: (result: SearchResult) => void;
  onProgress?: (progress: SearchProgress) => void;
  onComplete?: (results: SearchResult[], totalCount: number) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
  maxResults?: number;
}

// Local types removed in favor of shared types

export interface StreamingSearchSession {
  id: string;
  query: SearchQuery;
  isActive: boolean;
  results: SearchResult[];
  progress: SearchProgress;
  startTime: number;
  abortController: AbortController;
}

class StreamingSearchService {
  private activeSessions = new Map<string, StreamingSearchSession>();
  private eventSources = new Map<string, EventSource>();

  /**
   * Start a streaming search session
   */
  async startStreamingSearch(
    query: SearchQuery,
    options: StreamingSearchOptions = {}
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const abortController = new AbortController();

    const session: StreamingSearchSession = {
      id: sessionId,
      query,
      isActive: true,
      results: [],
      progress: {
        loaded: 0,
        total: 0,
        percentage: 0,
        currentEngine: '',
        searchTime: 0,
      },
      startTime: Date.now(),
      abortController,
    };

    this.activeSessions.set(sessionId, session);

    try {
      // Try SSE first, fallback to polling if not supported
      if (this.supportsServerSentEvents()) {
        await this.startSSESearch(session, options);
      } else {
        await this.startPollingSearch(session, options);
      }
    } catch (error) {
      logger.error('Failed to start streaming search', {
        sessionId,
        query: query.q,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.cleanupSession(sessionId);
      options.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    }

    return sessionId;
  }

  /**
   * Cancel a streaming search session
   */
  async cancelSearch(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to cancel non-existent search session', { sessionId });
      return;
    }

    try {
      // Cancel on server side
      await cancelSearch(sessionId);

      // Cancel local session
      this.cleanupSession(sessionId);

      logger.info('Search session cancelled', { sessionId });
    } catch (error) {
      logger.error('Failed to cancel search session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): StreamingSearchSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): StreamingSearchSession[] {
    return Array.from(this.activeSessions.values()).filter(s => s.isActive);
  }

  /**
   * Check if browser supports Server-Sent Events
   */
  private supportsServerSentEvents(): boolean {
    return typeof EventSource !== 'undefined';
  }

  /**
   * Start search using Server-Sent Events
   */
  private async startSSESearch(
    session: StreamingSearchSession,
    options: StreamingSearchOptions
  ): Promise<void> {
    const params = new URLSearchParams({
      q: session.query.q,
      sessionId: session.id,
      ...(session.query.type && { type: session.query.type }),
      ...(session.query.limit && { limit: session.query.limit.toString() }),
      ...(session.query.offset && { offset: session.query.offset.toString() }),
    });

    const eventSource = new EventSource(`/api/search/stream?${params.toString()}`);
    this.eventSources.set(session.id, eventSource);

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'result') {
          const result = data.result as SearchResult;
          session.results.push(result);
          session.progress.loaded = session.results.length;
          options.onResult?.(result);
        } else if (data.type === 'progress') {
          session.progress = { ...session.progress, ...data.progress };
          options.onProgress?.(session.progress);
        } else if (data.type === 'complete') {
          session.progress.total = data.totalCount;
          session.progress.percentage = 100;
          session.isActive = false;
          options.onComplete?.(session.results, data.totalCount);
          this.cleanupSession(session.id);
        }
      } catch (error) {
        logger.error('Failed to parse SSE data', {
          sessionId: session.id,
          data: event.data,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    eventSource.onerror = error => {
      logger.error('SSE connection error', {
        sessionId: session.id,
        error,
      });

      this.cleanupSession(session.id);
      options.onError?.(new Error('Streaming connection failed'));
    };

    // Set up abort handling
    session.abortController.signal.addEventListener('abort', () => {
      eventSource.close();
      this.cleanupSession(session.id);
    });
  }

  /**
   * Start search using polling as fallback
   */
  private async startPollingSearch(
    session: StreamingSearchSession,
    options: StreamingSearchOptions
  ): Promise<void> {
    const pollInterval = 1000; // 1 second
    let isComplete = false;

    const poll = async () => {
      if (!session.isActive || session.abortController.signal.aborted) {
        return;
      }

      try {
        const params: Record<string, string | number | boolean> = {
          q: session.query.q,
          sessionId: session.id,
          limit: session.query.limit || 50,
          offset: session.results.length,
        };

        if (session.query.type) {
          params.type = session.query.type;
        }

        const response = await streamSearch(params);

        if (response) {
          const { results, totalCount, isComplete: complete, progress } = response;

          // Add new results
          if (results && Array.isArray(results)) {
            for (const result of results) {
              if (!session.results.find(r => r.id === result.id)) {
                session.results.push(result);
                options.onResult?.(result);
              }
            }
          }

          // Update progress
          if (progress) {
            session.progress = { ...session.progress, ...progress };
            options.onProgress?.(session.progress);
          }

          // Check if complete
          if (complete || session.results.length >= (session.query.limit || 50)) {
            isComplete = true;
            session.progress.total = totalCount || session.results.length;
            session.progress.percentage = 100;
            session.isActive = false;
            options.onComplete?.(session.results, totalCount || session.results.length);
            this.cleanupSession(session.id);
            return;
          }
        }

        // Continue polling if not complete
        if (!isComplete) {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        logger.error('Polling search failed', {
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        this.cleanupSession(session.id);
        options.onError?.(error instanceof Error ? error : new Error('Polling failed'));
      }
    };

    // Start polling
    poll();
  }

  /**
   * Clean up a session
   */
  private cleanupSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.abortController.abort();
    }

    const eventSource = this.eventSources.get(sessionId);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(sessionId);
    }

    // Keep session in map for a short time to allow status queries
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
    }, 5000);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up all sessions (for cleanup)
   */
  cleanup(): void {
    for (const sessionId of this.activeSessions.keys()) {
      this.cleanupSession(sessionId);
    }

    logger.info('Streaming search service cleaned up');
  }
}

// Export singleton instance
export const streamingSearchService = new StreamingSearchService();
export default streamingSearchService;
