/**
 * useStreamingSearch Hook
 *
 * React hook for real-time streaming search with progressive result loading,
 * progress tracking, and session management.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useToast } from '../../../hooks/use-toast';
import { logger } from '../../../utils/logger';
import { streamingSearchService } from '../services/streaming-search';

// Define types locally
interface SearchResult {
  id: string;
  title: string;
  type: string;
  content: string;
  score: number;
}

interface SearchQuery {
  q: string;
  filters?: Record<string, any>;
}
import type {
  StreamingSearchOptions,
  StreamingSearchSession,
  SearchProgress
} from '../services/streaming-search';

interface UseStreamingSearchOptions extends Omit<StreamingSearchOptions, 'onResult' | 'onProgress' | 'onComplete' | 'onError'> {
  autoStart?: boolean;
  onResult?: (result: SearchResult) => void;
  onProgress?: (progress: SearchProgress) => void;
  onComplete?: (results: SearchResult[], totalCount: number) => void;
  onError?: (error: Error) => void;
}

interface StreamingSearchState {
  session: StreamingSearchSession | null;
  results: SearchResult[];
  progress: SearchProgress;
  isActive: boolean;
  error: Error | null;
}

export function useStreamingSearch(options: UseStreamingSearchOptions = {}) {
  const {
    autoStart = false,
    debounceMs = 300,
    maxResults = 50,
    onResult,
    onProgress,
    onComplete,
    onError
  } = options;

  const [state, setState] = useState<StreamingSearchState>({
    session: null,
    results: [],
    progress: {
      loaded: 0,
      total: 0,
      percentage: 0,
      currentEngine: '',
      searchTime: 0
    },
    isActive: false,
    error: null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentQueryRef = useRef<SearchQuery | null>(null);

  // Handle streaming events
  const handleResult = useCallback((result: SearchResult) => {
    setState(prev => ({
      ...prev,
      results: [...prev.results, result],
      progress: {
        ...prev.progress,
        loaded: prev.results.length + 1
      }
    }));
    onResult?.(result);
  }, [onResult]);

  const handleProgress = useCallback((progress: SearchProgress) => {
    setState(prev => ({
      ...prev,
      progress
    }));
    onProgress?.(progress);
  }, [onProgress]);

  const handleComplete = useCallback((results: SearchResult[], totalCount: number) => {
    setState(prev => ({
      ...prev,
      results,
      progress: {
        ...prev.progress,
        total: totalCount,
        percentage: 100
      },
      isActive: false
    }));
    onComplete?.(results, totalCount);
  }, [onComplete]);

  const handleError = useCallback((error: Error) => {
    setState(prev => ({
      ...prev,
      error,
      isActive: false
    }));

    toast({
      title: "Search Error",
      description: error.message || "An error occurred during search.",
      variant: "destructive"
    });

    onError?.(error);
  }, [onError, toast]);

  // Start streaming search
  const startSearch = useCallback(async (query: SearchQuery) => {
    // Cancel any existing search
    if (state.session?.isActive) {
      await cancelSearch();
    }

    currentQueryRef.current = query;

    try {
      setState(prev => ({
        ...prev,
        error: null,
        isActive: true,
        results: [],
        progress: {
          loaded: 0,
          total: 0,
          percentage: 0,
          currentEngine: '',
          searchTime: 0
        }
      }));

      const sessionId = await streamingSearchService.startStreamingSearch(query, {
        onResult: handleResult,
        onProgress: handleProgress,
        onComplete: handleComplete,
        onError: handleError,
        debounceMs,
        maxResults
      });

      const session = streamingSearchService.getSession(sessionId);
      setState(prev => ({
        ...prev,
        session
      }));

      logger.info('Streaming search started', {
        sessionId,
        query: query.q
      });

    } catch (error) {
      const searchError = error instanceof Error ? error : new Error('Failed to start search');
      handleError(searchError);
    }
  }, [state.session?.isActive, handleResult, handleProgress, handleComplete, handleError, debounceMs, maxResults]);

  // Cancel current search
  const cancelSearch = useCallback(async () => {
    if (state.session?.id) {
      try {
        await streamingSearchService.cancelSearch(state.session.id);
        setState(prev => ({
          ...prev,
          isActive: false
        }));

        logger.info('Streaming search cancelled', {
          sessionId: state.session.id
        });
      } catch (error) {
        logger.error('Failed to cancel streaming search', {
          sessionId: state.session.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }, [state.session?.id]);

  // Debounced search for auto-start
  const debouncedSearch = useCallback((query: SearchQuery) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      startSearch(query);
    }, debounceMs);
  }, [startSearch, debounceMs]);

  // Set query (with optional auto-start)
  const setQuery = useCallback((query: SearchQuery | null) => {
    currentQueryRef.current = query;

    if (query && autoStart) {
      debouncedSearch(query);
    }
  }, [autoStart, debouncedSearch]);

  // Clear results and reset state
  const clearResults = useCallback(async () => {
    await cancelSearch();

    setState({
      session: null,
      results: [],
      progress: {
        loaded: 0,
        total: 0,
        percentage: 0,
        currentEngine: '',
        searchTime: 0
      },
      isActive: false,
      error: null
    });

    currentQueryRef.current = null;

    // Clear any cached results
    queryClient.removeQueries({
      queryKey: ['streaming-search']
    });
  }, [cancelSearch, queryClient]);

  // Get current session status
  const getSessionStatus = useCallback(() => {
    if (state.session?.id) {
      return streamingSearchService.getSession(state.session.id);
    }
    return null;
  }, [state.session?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (state.session?.isActive) {
        streamingSearchService.cancelSearch(state.session.id);
      }
    };
  }, [state.session?.id, state.session?.isActive]);

  return {
    // State
    results: state.results,
    progress: state.progress,
    isActive: state.isActive,
    error: state.error,
    session: state.session,

    // Status
    isLoading: state.isActive,
    hasResults: state.results.length > 0,
    hasError: state.error !== null,

    // Actions
    startSearch,
    cancelSearch,
    setQuery,
    clearResults,
    getSessionStatus,

    // Current query
    currentQuery: currentQueryRef.current
  };
}

export default useStreamingSearch;