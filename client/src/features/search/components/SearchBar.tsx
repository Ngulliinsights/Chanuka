import { Search, X, Clock, Star, TrendingUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useSearchSuggestions, useLiveSearch, useSearchHistory } from '../hooks/useSearch';

// Define SearchSuggestion type locally
interface SearchSuggestion {
  text: string;
  type: string;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  showHistory?: boolean;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Search bills, users, comments...",
  showSuggestions = true,
  showHistory = true,
  className = ""
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useSearchSuggestions(query, showSuggestions && isFocused);
  const { data: liveResults } = useLiveSearch(query, undefined, showSuggestions && isFocused);
  const { history } = useSearchHistory();

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;

      const totalItems = (suggestions?.length || 0) + (liveResults?.results?.length || 0) + (showHistory ? (history?.data?.length || 0) : 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleSelect(selectedIndex);
          } else {
            performSearch();
          }
          break;
        case 'Escape':
          setIsFocused(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, selectedIndex, suggestions, liveResults, history]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setIsFocused(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelect = (index: number) => {
    let currentIndex = 0;

    // Check suggestions
    if (suggestions && index < suggestions.length && suggestions[index]) {
      setQuery(suggestions[index].text);
      onSearch(suggestions[index].text);
      setIsFocused(false);
      return;
    }
    currentIndex += suggestions?.length || 0;

    // Check live results
    if (liveResults?.results && index < currentIndex + liveResults.results.length) {
      const resultIndex = index - (suggestions?.length || 0);
      const result = liveResults.results[resultIndex];
      if (result) {
        setQuery(result.title || result.content);
        onSearch(result.title || result.content);
        setIsFocused(false);
        return;
      }
    }
    currentIndex += liveResults?.results?.length || 0;

    // Check history
    if (showHistory && history?.data && index < currentIndex + history.data.length) {
      const historyIndex = index - currentIndex;
      const historyItem = history.data[historyIndex];
      if (historyItem) {
        setQuery(historyItem.query);
        onSearch(historyItem.query);
        setIsFocused(false);
        return;
      }
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const renderDropdown = () => {
    if (!isFocused || (!suggestions?.length && !liveResults?.results?.length && (!showHistory || !history?.data?.length))) {
      return null;
    }

    return (
      <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Suggestions
                </div>
                {suggestions.map((suggestion: any, index: number) => (
                  <button
                    key={`suggestion-${index}`}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent flex items-center ${
                      selectedIndex === index ? 'bg-accent' : ''
                    }`}
                    onClick={() => handleSelect(index)}
                  >
                    <Search className="h-3 w-3 mr-2 text-muted-foreground" />
                    {suggestion.text}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {suggestion.type}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {/* Live Results */}
            {liveResults?.results && liveResults.results.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">Results</div>
                {liveResults.results.slice(0, 3).map((result: any, index: number) => {
                  const actualIndex = (suggestions?.length || 0) + index;
                  return (
                    <button
                      key={`result-${index}`}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent ${
                        selectedIndex === actualIndex ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleSelect(actualIndex)}
                    >
                      <div className="font-medium">{result.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.excerpt || result.content}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {result.type}
                      </Badge>
                    </button>
                  );
                })}
                {liveResults.total > 3 && (
                  <div className="text-xs text-muted-foreground px-3 py-1">
                    +{liveResults.total - 3} more results...
                  </div>
                )}
              </div>
            )}

            {/* Search History */}
            {showHistory && history?.data && history.data.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Recent Searches
                </div>
                {history.data.slice(0, 3).map((item: any, index: number) => {
                  const actualIndex = (suggestions?.length || 0) + (liveResults?.results?.length || 0) + index;
                  return (
                    <button
                      key={`history-${index}`}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent flex items-center ${
                        selectedIndex === actualIndex ? 'bg-accent' : ''
                      }`}
                      onClick={() => handleSelect(actualIndex)}
                    >
                      <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
                      {item.query}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {item.resultCount} results
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click events on dropdown
            setTimeout(() => setIsFocused(false), 150);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              performSearch();
            }
          }}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      <div ref={dropdownRef}>
        {renderDropdown()}
      </div>
    </div>
  );
}

