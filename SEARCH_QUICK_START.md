# Search Feature Quick Start Guide

## For Developers

### Using the Search Feature

#### 1. Basic Search (Client)
```typescript
import { useSearch } from '@client/features/search';

function MyComponent() {
  const { data, isLoading, error } = useSearch('healthcare', {
    billStatus: ['active'],
    categories: ['health']
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.results.map(result => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

#### 2. Intelligent Search with Dual Engines
```typescript
import { intelligentSearch } from '@client/features/search';

async function performSearch() {
  const results = await intelligentSearch.search({
    q: 'education reform',
    type: 'bills',
    enableFuzzy: true,
    combineResults: true,
    maxResults: 50,
    highlightMatches: true
  });

  console.log('Results:', results.results);
  console.log('Search time:', results.searchTime);
  console.log('Engines used:', results.engines);
}
```

#### 3. Autocomplete
```typescript
import { useSearchSuggestions } from '@client/features/search';

function SearchBar() {
  const [query, setQuery] = useState('');
  const { data: suggestions } = useSearchSuggestions(query);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {suggestions?.map(suggestion => (
        <div key={suggestion.text}>{suggestion.text}</div>
      ))}
    </div>
  );
}
```

#### 4. Saved Searches
```typescript
import { useSavedSearches } from '@client/features/search';

function SavedSearchList() {
  const { savedSearches, saveSearch, executeSavedSearch } = useSavedSearches();

  const handleSave = async () => {
    await saveSearch.mutateAsync({
      name: 'My Search',
      query: { q: 'healthcare' },
      description: 'Healthcare bills'
    });
  };

  const handleExecute = async (searchId: string) => {
    const results = await executeSavedSearch.mutateAsync(searchId);
    console.log('Results:', results);
  };

  return (
    <div>
      {savedSearches.data?.map(search => (
        <div key={search.id}>
          <span>{search.name}</span>
          <button onClick={() => handleExecute(search.id)}>
            Execute
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### 5. Streaming Search
```typescript
import { useStreamingSearch } from '@client/features/search';

function StreamingSearchComponent() {
  const {
    results,
    isActive,
    progress,
    startSearch,
    cancelSearch
  } = useStreamingSearch({
    onResult: (result) => console.log('New result:', result),
    onProgress: (progress) => console.log('Progress:', progress),
    onComplete: (results) => console.log('Complete:', results)
  });

  return (
    <div>
      <button onClick={() => startSearch({ q: 'education' })}>
        Start Search
      </button>
      {isActive && (
        <>
          <div>Progress: {progress.percentage}%</div>
          <button onClick={cancelSearch}>Cancel</button>
        </>
      )}
      <div>Results: {results.length}</div>
    </div>
  );
}
```

### Server-Side Usage

#### 1. Using Search Service
```typescript
import { searchBills } from '@server/features/search';

async function handleSearch(req, res) {
  const results = await searchBills({
    text: req.query.q,
    filters: {
      category: ['health'],
      status: ['active']
    },
    pagination: {
      page: 1,
      limit: 20,
      sortBy: 'relevance',
      sortOrder: 'desc'
    },
    options: {
      includeSnippets: true,
      includeHighlights: true,
      searchType: 'simple'
    }
  });

  res.json(results);
}
```

#### 2. Semantic Search
```typescript
import { semanticSearchEngine } from '@server/features/search';

async function semanticSearch(query: string) {
  const results = await semanticSearchEngine.search({
    query,
    limit: 10,
    minScore: 0.7
  });

  return results;
}
```

#### 3. Query Intent Detection
```typescript
import { queryIntentService } from '@server/features/search';

async function analyzeQuery(query: string) {
  const intent = await queryIntentService.detectIntent(query);

  console.log('Intent:', intent.primaryIntent);
  console.log('Confidence:', intent.confidence);
  console.log('Suggested strategy:', intent.suggestedStrategy);

  return intent;
}
```

#### 4. Typo Correction
```typescript
import { typoCorrectionService } from '@server/features/search';

async function correctTypos(query: string) {
  const correction = await typoCorrectionService.correctQuery(query);

  if (correction.hasSuggestion) {
    console.log('Did you mean:', correction.suggestion);
    console.log('Confidence:', correction.confidence);
  }

  return correction;
}
```

## API Reference

### Client Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useSearch(query, filters)` | Basic search | `{ data, isLoading, error }` |
| `useSearchSuggestions(query)` | Autocomplete | `{ data, isLoading }` |
| `useLiveSearch(query, type)` | Live typeahead | `{ data, isLoading }` |
| `useSearchHistory()` | History management | `{ history, clearHistory }` |
| `useSavedSearches()` | Saved searches | `{ savedSearches, saveSearch, ... }` |
| `usePopularSearches(limit)` | Popular searches | `{ data, isLoading }` |
| `useRelatedSearches(query)` | Related searches | `{ data, isLoading }` |
| `useSearchMetadata()` | Filter metadata | `{ data, isLoading }` |
| `useIntelligentSearch(options)` | Dual-engine search | `{ results, search, ... }` |
| `useStreamingSearch(options)` | Streaming search | `{ results, startSearch, ... }` |

### Server Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `searchBills(query)` | Main search | `SearchQuery` |
| `getSearchSuggestions(query, limit)` | Suggestions | `string, number` |
| `getPopularSearchTerms(limit)` | Popular terms | `number` |
| `streamSearchBills(query, res, req)` | Streaming | `SearchQuery, Response, Request` |
| `cancelSearch(searchId)` | Cancel search | `string` |
| `getSearchAnalytics(start, end)` | Analytics | `Date?, Date?` |
| `rebuildSearchIndexes(batchSize)` | Rebuild indexes | `number` |
| `getSearchIndexHealth()` | Index health | none |

## Common Patterns

### 1. Search with Filters
```typescript
const { data } = useSearch('healthcare', {
  billStatus: ['active', 'passed'],
  categories: ['health', 'insurance'],
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
});
```

### 2. Advanced Search
```typescript
const { data } = useSearch('healthcare', {
  billStatus: ['active']
}, {
  advanced: {
    exactPhrase: true,
    excludeWords: ['tax'],
    fuzzyMatching: true,
    proximity: 10
  }
});
```

### 3. Paginated Search
```typescript
const [page, setPage] = useState(1);
const { data } = useSearch('healthcare', {}, {
  limit: 20,
  offset: (page - 1) * 20
});
```

### 4. Export Results
```typescript
const { mutate: exportResults } = useSearchExport();

exportResults({
  request: { q: 'healthcare' },
  format: 'csv'
});
```

## Performance Tips

### 1. Use Debouncing
```typescript
import { useDebouncedValue } from '@client/lib/hooks';

const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 300);
const { data } = useSearch(debouncedQuery);
```

### 2. Enable Caching
```typescript
const { data } = useSearch(query, filters, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000 // 10 minutes
});
```

### 3. Optimize Filters
```typescript
// Good: Specific filters
const filters = {
  billStatus: ['active'],
  categories: ['health']
};

// Bad: Too broad
const filters = {
  billStatus: ['active', 'passed', 'failed', 'pending']
};
```

### 4. Limit Results
```typescript
// Good: Reasonable limit
const { data } = useSearch(query, filters, { limit: 20 });

// Bad: Too many results
const { data } = useSearch(query, filters, { limit: 1000 });
```

## Troubleshooting

### Issue: No results returned
**Solution**: Check query syntax and filters
```typescript
// Debug query
console.log('Query:', query);
console.log('Filters:', filters);
console.log('Results:', data?.results);
```

### Issue: Slow search performance
**Solution**: Enable caching and reduce result limit
```typescript
const { data } = useSearch(query, filters, {
  limit: 20, // Reduce from 100
  staleTime: 5 * 60 * 1000 // Enable caching
});
```

### Issue: Autocomplete not working
**Solution**: Check minimum query length
```typescript
// Autocomplete requires at least 2 characters
const { data } = useSearchSuggestions(query, query.length >= 2);
```

### Issue: Streaming search not starting
**Solution**: Check WebSocket connection
```typescript
const { isActive, error } = useStreamingSearch({
  onError: (err) => console.error('Streaming error:', err)
});
```

## Best Practices

### 1. Always Handle Loading States
```typescript
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

### 2. Provide User Feedback
```typescript
const { toast } = useToast();

const handleSearch = async () => {
  try {
    await search(query);
    toast({ title: 'Search completed' });
  } catch (error) {
    toast({ title: 'Search failed', variant: 'destructive' });
  }
};
```

### 3. Implement Keyboard Shortcuts
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openSearchModal();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 4. Track Analytics
```typescript
const handleSearch = async (query: string) => {
  // Track search event
  analytics.track('search_performed', {
    query,
    timestamp: new Date().toISOString()
  });

  await search(query);
};
```

## Resources

- [Full API Documentation](./SEARCH_INTEGRATION_SUMMARY.md)
- [Test Plan](./SEARCH_INTEGRATION_TEST_PLAN.md)
- [Type Definitions](./client/src/lib/types/search.ts)
- [Server Implementation](./server/features/search/)
- [Client Implementation](./client/src/features/search/)

## Support

For issues or questions:
1. Check the [Integration Summary](./SEARCH_INTEGRATION_SUMMARY.md)
2. Review the [Test Plan](./SEARCH_INTEGRATION_TEST_PLAN.md)
3. Check server logs: `tail -f server/logs/app.log`
4. Check client console for errors
5. Run diagnostics: `npm run test:integration`

---

**Last Updated**: 2026-02-25
**Status**: ✅ Fully Operational
