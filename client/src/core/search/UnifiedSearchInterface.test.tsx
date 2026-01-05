/**
 * UnifiedSearchInterface Integration Tests
 *
 * Tests for search service switching and integration
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedSearchInterface } from './UnifiedSearchInterface';
import type { UnifiedSearchQuery, UnifiedSearchResult } from './types';

// Mock the search services
vi.mock('../../features/search/services/intelligent-search', () => ({
  intelligentSearch: {
    search: vi.fn().mockResolvedValue({
      results: [
        { id: '1', title: 'Test Bill 1', type: 'bill', content: 'Test content', score: 0.9 }
      ],
      metadata: { query: 'test', executionTime: 100 },
      suggestions: ['test suggestion'],
      facets: { categories: ['category1'], sponsors: [], tags: [], statuses: [] }
    })
  }
}));

vi.mock('../../features/search/services/streaming-search', () => ({
  streamingSearch: {
    search: vi.fn().mockImplementation((query, options) => {
      // Simulate streaming behavior
      setTimeout(() => {
        options.onResult?.({ id: '2', title: 'Streaming Result', type: 'bill', content: 'Streaming content', score: 0.8 });
        options.onComplete?.([
          { id: '2', title: 'Streaming Result', type: 'bill', content: 'Streaming content', score: 0.8 }
        ], 1);
      }, 100);
    })
  }
}));

vi.mock('../api/search', () => ({
  searchApiClient: {
    search: vi.fn().mockResolvedValue({
      results: [
        { id: '3', title: 'API Result', type: 'bill', content: 'API content', score: 0.7 }
      ],
      metadata: { query: 'test', executionTime: 50 }
    })
  }
}));

// Mock the hooks
vi.mock('../../features/search/hooks/useIntelligentSearch', () => ({
  useIntelligentSearch: vi.fn(() => ({
    search: vi.fn(),
    results: [],
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../features/search/hooks/useStreamingSearch', () => ({
  useStreamingSearch: vi.fn(() => ({
    search: vi.fn(),
    results: [],
    isLoading: false,
    error: null,
    progress: { loaded: 0, total: 0, percentage: 0 }
  }))
}));

// Mock the IntelligentAutocomplete component
vi.mock('../../features/search/ui/interface/IntelligentAutocomplete', () => ({
  default: ({ query, onSelect, onSearch }: any) => (
    <div data-testid="autocomplete">
      <div>Query: {query}</div>
      <button type="button" onClick={() => onSelect('suggestion 1')}>Suggestion 1</button>
      <button type="button" onClick={() => onSearch('test search')}>Search</button>
    </div>
  )
}));

// Mock the cn utility
vi.mock('../../shared/design-system/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

describe('UnifiedSearchInterface', () => {
  const mockOnSearch = vi.fn();
  const mockOnResults = vi.fn();
  const mockOnProgress = vi.fn();
  const mockOnError = vi.fn();

  const defaultProps = {
    onSearch: mockOnSearch,
    onResults: mockOnResults,
    onProgress: mockOnProgress,
    onError: mockOnError
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    });
  });

  describe('Rendering', () => {
    it('renders search input with default placeholder', () => {
      render(<UnifiedSearchInterface {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search bills, sponsors, or topics...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(
        <UnifiedSearchInterface
          {...defaultProps}
          placeholder="Custom search placeholder"
        />
      );

      expect(screen.getByPlaceholderText('Custom search placeholder')).toBeInTheDocument();
    });

    it('renders different variants correctly', () => {
      const { rerender } = render(
        <UnifiedSearchInterface {...defaultProps} variant="header" />
      );

      let input = screen.getByRole('textbox');
      expect(input.parentElement).toHaveClass('h-9');

      rerender(<UnifiedSearchInterface {...defaultProps} variant="page" />);
      input = screen.getByRole('textbox');
      expect(input.parentElement).toHaveClass('h-12');

      rerender(<UnifiedSearchInterface {...defaultProps} variant="embedded" />);
      input = screen.getByRole('textbox');
      expect(input.parentElement).toHaveClass('h-10');
    });

    it('shows voice search button when enabled', () => {
      render(<UnifiedSearchInterface {...defaultProps} enableVoiceSearch={true} />);

      expect(screen.getByLabelText('Voice search')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('handles text input changes', () => {
      render(<UnifiedSearchInterface {...defaultProps} showSuggestions={true} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test query' } });

      expect(input).toHaveValue('test query');
    });

    it('shows suggestions when typing', () => {
      render(<UnifiedSearchInterface {...defaultProps} showSuggestions={true} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(screen.getByTestId('autocomplete')).toBeInTheDocument();
    });

    it('executes search on Enter key', async () => {
      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            q: 'test query',
            strategy: expect.any(String)
          })
        );
      });
    });

    it('clears search when clear button is clicked', () => {
      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test query' } });

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(input).toHaveValue('');
    });
  });

  describe('Strategy Selection', () => {
    it('selects intelligent strategy for complex queries', async () => {
      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'complex search query with multiple terms' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            strategy: 'intelligent'
          })
        );
      });
    });

    it('uses custom strategy configuration', async () => {
      const customConfig = {
        strategy: 'api' as const,
        thresholds: {
          resultCountForStreaming: 500,
          queryLengthForIntelligent: 10,
          timeoutMs: 3000
        }
      };

      render(
        <UnifiedSearchInterface
          {...defaultProps}
          config={customConfig}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'short' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });
    });
  });

  describe('Suggestion Handling', () => {
    it('handles suggestion selection', async () => {
      render(<UnifiedSearchInterface {...defaultProps} showSuggestions={true} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      const suggestion = screen.getByText('Suggestion 1');
      fireEvent.click(suggestion);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            q: 'suggestion 1'
          })
        );
      });
    });

    it('hides suggestions on Escape key', () => {
      render(<UnifiedSearchInterface {...defaultProps} showSuggestions={true} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });

      expect(screen.getByTestId('autocomplete')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByTestId('autocomplete')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator during search', async () => {
      // Mock a delayed search
      const { intelligentSearch } = await import('../../features/search/services/intelligent-search');
      vi.mocked(intelligentSearch.search).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should show loading state
      expect(screen.getByText(/Searching with .* strategy/)).toBeInTheDocument();
    });

    it('disables input during search', async () => {
      const { intelligentSearch } = await import('../../features/search/services/intelligent-search');
      vi.mocked(intelligentSearch.search).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(input).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('calls onError when search fails', async () => {
      const { intelligentSearch } = await import('../../features/search/services/intelligent-search');
      const searchError = new Error('Search failed');
      vi.mocked(intelligentSearch.search).mockRejectedValue(searchError);

      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(searchError);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<UnifiedSearchInterface {...defaultProps} enableVoiceSearch={true} />);

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
      expect(screen.getByLabelText('Voice search')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<UnifiedSearchInterface {...defaultProps} />);

      const input = screen.getByRole('textbox');

      // Should be focusable
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });
});
