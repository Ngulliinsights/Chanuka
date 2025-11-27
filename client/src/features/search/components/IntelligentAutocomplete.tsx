/**
 * Intelligent Autocomplete Component
 * 
 * Provides advanced autocomplete with recent searches, popular queries,
 * bill title suggestions, and real-time search results.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, TrendingUp, FileText, Star, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { intelligentSearch } from '../services/intelligent-search';
import { useDebounce } from '@/hooks/useDebounce';
import { logger } from '@/utils/logger';
import type { SearchSuggestion, AutocompleteResult } from '@client/types';

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
}

interface AutocompleteState {
  isOpen: boolean;
  isLoading: boolean;
  selectedIndex: number;
  results: AutocompleteResult | null;
  error: string | null;
}

export function IntelligentAutocomplete({
  onSearch,
  onSelect,
  placeholder = "Search bills, sponsors, comments...",
  className = "",
  showRecentSearches = true,
  showPopularQueries = true,
  showBillTitles = true,
  maxSuggestions = 10,
  debounceMs = 300
}: IntelligentAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    isLoading: false,
    selectedIndex: -1,
    results: null,
    error: null
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, debounceMs);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setState(prev => ({ ...prev, results: null, isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const results = await intelligentSearch.getAutocomplete(searchQuery, {
        limit: maxSuggestions,
        includeRecent: showRecentSearches,
        includePopular: showPopularQueries,
        includeBillTitles: showBillTitles
      });

      setState(prev => ({
        ...prev,
        results,
        isLoading: false,
        selectedIndex: -1
      }));

    } catch (error) {
      logger.error('Autocomplete failed', {
        query: searchQuery,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      setState(prev => ({
        ...prev,
        error: 'Failed to load suggestions',
        isLoading: false,
        results: null
      }));
    }
  }, [maxSuggestions, showRecentSearches, showPopularQueries, showBillTitles]);

  // Effect to fetch suggestions when query changes
  useEffect(() => {
    if (state.isOpen && debouncedQuery) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery, state.isOpen, fetchSuggestions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isOpen || !state.results) return;

      const totalItems = state.results.suggestions.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, totalItems - 1)
          }));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            selectedIndex: Math.max(prev.selectedIndex - 1, -1)
          }));
          break;

        case 'Enter':
          e.preventDefault();
          if (state.selectedIndex >= 0 && state.results.suggestions[state.selectedIndex]) {
            handleSelect(state.results.suggestions[state.selectedIndex]);
          } else if (query.trim()) {
            handleSearch();
          }
          break;

        case 'Escape':
          setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
          inputRef.current?.blur();
          break;

        case 'Tab':
          if (state.selectedIndex >= 0 && state.results.suggestions[state.selectedIndex]) {
            e.preventDefault();
            setQuery(state.results.suggestions[state.selectedIndex].term);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen, state.selectedIndex, state.results, query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length >= 2) {
      setState(prev => ({ ...prev, isOpen: true }));
    } else {
      setState(prev => ({ ...prev, isOpen: false, results: null }));
    }
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setState(prev => ({ ...prev, isOpen: true }));
      fetchSuggestions(query);
    }
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.term);
    setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
    
    if (onSelect) {
      onSelect(suggestion);
    } else {
      onSearch(suggestion.term);
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      setState(prev => ({ ...prev, isOpen: false, selectedIndex: -1 }));
      onSearch(query.trim());
    }
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return <Clock className="h-3 w-3" />;
      case 'popular':
        return <TrendingUp className="h-3 w-3" />;
      case 'bill_title':
        return <FileText className="h-3 w-3" />;
      default:
        return <Search className="h-3 w-3" />;
    }
  };

  const getSuggestionLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'recent':
        return 'Recent';
      case 'popular':
        return 'Popular';
      case 'bill_title':
        return 'Bill';
      default:
        return 'Suggestion';
    }
  };

  const groupSuggestionsByType = (suggestions: SearchSuggestion[]) => {
    const groups: Record<string, SearchSuggestion[]> = {};
    
    suggestions.forEach(suggestion => {
      if (!groups[suggestion.type]) {
        groups[suggestion.type] = [];
      }
      groups[suggestion.type].push(suggestion);
    });

    return groups;
  };

  const renderSuggestionGroup = (type: string, suggestions: SearchSuggestion[], startIndex: number) => {
    const typeLabels: Record<string, string> = {
      'bill_title': 'Bills',
      'popular': 'Popular Searches',
      'recent': 'Recent Searches',
      'completion': 'Suggestions'
    };

    return (
      <div key={type} className="p-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
          {getSuggestionIcon(type as SearchSuggestion['type'])}
          <span className="ml-1">{typeLabels[type] || 'Suggestions'}</span>
        </div>
        {suggestions.map((suggestion, index) => {
          const globalIndex = startIndex + index;
          return (
            <button
              key={`${type}-${index}`}
              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${
                state.selectedIndex === globalIndex ? 'bg-accent' : ''
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setState(prev => ({ ...prev, selectedIndex: globalIndex }))}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{suggestion.term}</div>
                  {suggestion.metadata?.description && (
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {suggestion.metadata.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {suggestion.frequency && suggestion.frequency > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.frequency}
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
        })}
      </div>
    );
  };

  const renderDropdown = () => {
    if (!state.isOpen) return null;

    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto shadow-lg">
        <CardContent className="p-0">
          {state.isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Loading suggestions...</span>
              </div>
            </div>
          )}

          {state.error && (
            <div className="p-4 text-center text-sm text-destructive">
              {state.error}
            </div>
          )}

          {state.results && state.results.suggestions.length > 0 && (
            <div className="divide-y">
              {(() => {
                const groups = groupSuggestionsByType(state.results.suggestions);
                let currentIndex = 0;
                
                return Object.entries(groups).map(([type, suggestions]) => {
                  const startIndex = currentIndex;
                  currentIndex += suggestions.length;
                  return renderSuggestionGroup(type, suggestions, startIndex);
                });
              })()}
            </div>
          )}

          {state.results && state.results.suggestions.length === 0 && !state.isLoading && !state.error && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}

          {query.trim() && (
            <>
              <Separator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={handleSearch}
                >
                  <Search className="h-3 w-3 mr-2" />
                  Search for "{query}"
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !state.isOpen) {
              handleSearch();
            }
          }}
          className="pl-10"
          autoComplete="off"
        />
      </div>

      <div ref={dropdownRef}>
        {renderDropdown()}
      </div>
    </div>
  );
}

export default IntelligentAutocomplete;