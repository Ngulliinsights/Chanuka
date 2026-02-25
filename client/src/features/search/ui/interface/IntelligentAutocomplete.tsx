/**
 * Intelligent Autocomplete Component (Optimized)
 *
 * Features:
 * - Advanced autocomplete with recent, popular, and bill title suggestions
 * - Optimized performance with memoization and efficient re-renders
 * - Full keyboard navigation and accessibility support
 * - Debounced search with loading states
 * - Grouped suggestions with visual hierarchy
 */

import { Search, Clock, TrendingUp, FileText, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import { Input } from '@client/lib/design-system';
import { Separator } from '@client/lib/design-system';
import { useDebounce } from '@client/lib/hooks/use-debounce';
import { logger } from '@client/lib/utils/logger';

import { intelligentSearch } from '../../services/intelligent-search';
import type { AutocompleteResult, SearchSuggestion } from '@client/lib/types/search';

interface IntelligentAutocompleteProps {
  onSearch: (query: string) => void;
  onSelect?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
  showPopularQueries?: boolean;
  showBillTitles?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
  autoFocus?: boolean;
}

interface AutocompleteState {
  isOpen: boolean;
  isLoading: boolean;
  selectedIndex: number;
  results: AutocompleteResult | null;
  error: string | null;
}

type SuggestionType = 'bill_title' | 'popular' | 'recent' | 'completion';

// ============================================================================
// Constants
// ============================================================================

const MIN_QUERY_LENGTH = 2;

const TYPE_CONFIG: Record<SuggestionType, { label: string; icon: React.ReactNode }> = {
  bill_title: {
    label: 'Bills',
    icon: <FileText className="h-3 w-3" />,
  },
  popular: {
    label: 'Popular Searches',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  recent: {
    label: 'Recent Searches',
    icon: <Clock className="h-3 w-3" />,
  },
  completion: {
    label: 'Suggestions',
    icon: <Search className="h-3 w-3" />,
  },
};

const BADGE_LABELS: Record<string, string> = {
  recent: 'Recent',
  popular: 'Popular',
  bill_title: 'Bill',
  completion: 'Suggestion',
};

// ============================================================================
// Helper Functions
// ============================================================================

const groupSuggestionsByType = (suggestions: SearchSuggestion[]) => {
  const groups = new Map<string, SearchSuggestion[]>();

  suggestions.forEach(suggestion => {
    const existing = groups.get(suggestion.type) || [];
    groups.set(suggestion.type, [...existing, suggestion]);
  });

  return groups;
};

const getSuggestionIcon = (type: string) => {
  return TYPE_CONFIG[type as SuggestionType]?.icon || <Search className="h-3 w-3" />;
};

const getSuggestionLabel = (type: string) => {
  return BADGE_LABELS[type] || 'Suggestion';
};

const getGroupLabel = (type: string) => {
  return TYPE_CONFIG[type as SuggestionType]?.label || 'Suggestions';
};

// ============================================================================
// Main Component
// ============================================================================

export function IntelligentAutocomplete({
  onSearch,
  onSelect,
  placeholder = 'Search bills, sponsors, comments...',
  className = '',
  showRecentSearches = true,
  showPopularQueries = true,
  showBillTitles = true,
  maxSuggestions = 10,
  debounceMs = 300,
  autoFocus = false,
}: IntelligentAutocompleteProps) {
  // ============================================================================
  // State & Refs
  // ============================================================================

  const [query, setQuery] = useState('');
  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    isLoading: false,
    selectedIndex: -1,
    results: null,
    error: null,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, debounceMs);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const totalSuggestions = useMemo(
    () => state.results?.suggestions.length || 0,
    [state.results?.suggestions.length]
  );

  const groupedSuggestions = useMemo(() => {
    if (!state.results?.suggestions) return null;
    return groupSuggestionsByType(state.results.suggestions);
  }, [state.results?.suggestions]);

  const hasValidQuery = useMemo(() => query.trim().length > 0, [query]);

  // ============================================================================
  // Callbacks
  // ============================================================================

  const closeDropdown = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
  }, []);

  const handleSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      setQuery(suggestion.text);
      closeDropdown();

      if (onSelect) {
        onSelect(suggestion);
      } else {
        onSearch(suggestion.text);
      }
    },
    [onSelect, onSearch, closeDropdown]
  );

  const handleSearch = useCallback(() => {
    if (hasValidQuery) {
      closeDropdown();
      onSearch(query.trim());
    }
  }, [hasValidQuery, query, onSearch, closeDropdown]);

  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < MIN_QUERY_LENGTH) {
        setState(prev => ({ ...prev, results: null, isLoading: false }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const results = await intelligentSearch.getAutocomplete(searchQuery, {
          limit: maxSuggestions,
          includeRecent: showRecentSearches,
          includePopular: showPopularQueries,
          includeBillTitles: showBillTitles,
        });

        setState(prev => ({
          ...prev,
          results,
          isLoading: false,
          selectedIndex: -1,
        }));
      } catch (error) {
        logger.error('Autocomplete failed', {
          query: searchQuery,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        setState(prev => ({
          ...prev,
          error: 'Failed to load suggestions',
          isLoading: false,
          results: null,
        }));
      }
    },
    [maxSuggestions, showRecentSearches, showPopularQueries, showBillTitles]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length >= MIN_QUERY_LENGTH) {
      setState(prev => ({ ...prev, isOpen: true }));
    } else {
      setState(prev => ({ ...prev, isOpen: false, results: null }));
    }
  }, []);

  const handleInputFocus = useCallback(() => {
    if (query.length >= MIN_QUERY_LENGTH) {
      setState(prev => ({ ...prev, isOpen: true }));
      fetchSuggestions(query);
    }
  }, [query, fetchSuggestions]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (state.isOpen && debouncedQuery) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery, state.isOpen, fetchSuggestions]);

  // Keyboard navigation
  useEffect(() => {
    if (!state.isOpen || !state.results) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const totalItems = state.results!.suggestions.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            selectedIndex: prev.selectedIndex < totalItems - 1 ? prev.selectedIndex + 1 : 0,
          }));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            selectedIndex: prev.selectedIndex > 0 ? prev.selectedIndex - 1 : totalItems - 1,
          }));
          break;

        case 'Enter':
          e.preventDefault();
          if (state.selectedIndex >= 0 && state.results!.suggestions[state.selectedIndex]) {
            handleSelect(state.results!.suggestions[state.selectedIndex]);
          } else if (hasValidQuery) {
            handleSearch();
          }
          break;

        case 'Escape':
          e.preventDefault();
          closeDropdown();
          inputRef.current?.blur();
          break;

        case 'Tab':
          if (state.selectedIndex >= 0 && state.results!.suggestions[state.selectedIndex]) {
            e.preventDefault();
            setQuery(state.results!.suggestions[state.selectedIndex].text);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    state.isOpen,
    state.selectedIndex,
    state.results,
    hasValidQuery,
    handleSelect,
    handleSearch,
    closeDropdown,
  ]);

  // Click outside to close
  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.isOpen, closeDropdown]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderSuggestionItem = useCallback(
    (suggestion: SearchSuggestion, globalIndex: number) => {
      const isSelected = state.selectedIndex === globalIndex;

      return (
        <button
          type="button"
          key={`${suggestion.type}-${suggestion.id || globalIndex}`}
          id={`suggestion-${globalIndex}`}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
            isSelected ? 'bg-accent' : 'hover:bg-accent/50'
          }`}
          onClick={() => handleSelect(suggestion)}
          onMouseEnter={() => setState(prev => ({ ...prev, selectedIndex: globalIndex }))}
          role="option"
          aria-selected={isSelected}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{suggestion.text}</div>
              {(() => {
                const description = suggestion.metadata?.description;
                return description && typeof description === 'string' ? (
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {description}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {suggestion.count && suggestion.count > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {suggestion.count}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {getSuggestionLabel(suggestion.type)}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </button>
      );
    },
    [state.selectedIndex, handleSelect]
  );

  const renderSuggestionGroup = useCallback(
    (type: string, suggestions: SearchSuggestion[], startIndex: number) => (
      <div key={type} className="p-2" role="group" aria-label={getGroupLabel(type)}>
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1 px-1">
          {getSuggestionIcon(type)}
          <span>{getGroupLabel(type)}</span>
        </div>
        <div className="space-y-1">
          {suggestions.map((suggestion, index) =>
            renderSuggestionItem(suggestion, startIndex + index)
          )}
        </div>
      </div>
    ),
    [renderSuggestionItem]
  );

  const renderDropdownContent = () => {
    if (state.isLoading) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            <span>Loading suggestions...</span>
          </div>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="p-4 text-center text-sm text-destructive" role="alert">
          {state.error}
        </div>
      );
    }

    if (groupedSuggestions && totalSuggestions > 0) {
      let currentIndex = 0;
      return (
        <div className="divide-y" role="listbox" aria-label="Search suggestions">
          {Array.from(groupedSuggestions.entries()).map(([type, suggestions]) => {
            const startIndex = currentIndex;
            currentIndex += suggestions.length;
            return renderSuggestionGroup(type, suggestions, startIndex);
          })}
        </div>
      );
    }

    if (state.results && totalSuggestions === 0) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">No suggestions found</div>
      );
    }

    return null;
  };

  const renderDropdown = () => {
    if (!state.isOpen) return null;

    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto shadow-lg border">
        <CardContent className="p-0">
          {renderDropdownContent()}

          {hasValidQuery && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-sm font-normal hover:bg-accent"
                  onClick={handleSearch}
                >
                  <Search className="h-3 w-3 mr-2" />
                  Search for &quot;{query}&quot;
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={e => {
            if (e.key === 'Enter' && !state.isOpen) {
              handleSearch();
            }
          }}
          className="pl-10"
          autoComplete="off"
          aria-label="Search input"
          aria-autocomplete="list"
          aria-expanded={state.isOpen}
          aria-controls="autocomplete-dropdown"
          aria-activedescendant={
            state.selectedIndex >= 0 ? `suggestion-${state.selectedIndex}` : undefined
          }
        />
      </div>

      <div ref={dropdownRef} id="autocomplete-dropdown">
        {renderDropdown()}
      </div>
    </div>
  );
}

export default IntelligentAutocomplete;
