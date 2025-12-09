/**
 * Advanced Search Interface Component
 *
 * Provides field-specific searching, Boolean operators, and advanced filtering
 * capabilities for power users and detailed search requirements.
 */

import {
  Search,
  Plus,
  Minus,
  Settings,
  Save,
  Download,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@client/shared/design-system/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system/primitives/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@client/shared/design-system/primitives/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@client/shared/design-system/primitives/dialog';
import { Input } from '@client/shared/design-system/primitives/input';
import { Label } from '@client/shared/design-system/primitives/label';
import { Separator } from '@client/shared/design-system/primitives/separator';
import { Switch } from '@client/shared/design-system/primitives/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@client/shared/design-system/primitives/tooltip';
import { useToast } from '../../../hooks/use-toast';
import type { DualSearchRequest } from '../../services/intelligent-search';

// Define types locally
interface SearchFilters {
  billStatus?: string[];
  categories?: string[];
  sponsors?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

interface AdvancedSearchOptions {
  exactPhrase?: boolean;
  excludeWords?: string[];
  fuzzyMatching?: boolean;
  proximity?: number;
  dateBoost?: 'recent' | 'none';
}

interface SearchField {
  id: string;
  field: 'title' | 'content' | 'author' | 'category' | 'status' | 'sponsor' | 'any';
  operator: 'contains' | 'exact' | 'starts_with' | 'ends_with' | 'not_contains';
  value: string;
  booleanOperator: 'AND' | 'OR' | 'NOT';
}

interface SearchConfig {
  name: string;
  fields: SearchField[];
  filters: SearchFilters;
  advancedOptions: AdvancedSearchOptions;
  searchSettings: SearchSettings;
}

interface SearchSettings {
  enableFuzzy: boolean;
  combineResults: boolean;
  maxResults: number;
  highlightMatches: boolean;
}

interface AdvancedSearchInterfaceProps {
  onSearch: (request: DualSearchRequest) => void;
  onSave?: (searchConfig: SearchConfig) => void;
  onExport?: (format: 'csv' | 'json') => void;
  initialQuery?: string;
  className?: string;
}

const FIELD_OPTIONS = [
  { value: 'any', label: 'Any Field' },
  { value: 'title', label: 'Title' },
  { value: 'content', label: 'Content/Summary' },
  { value: 'author', label: 'Author/Sponsor' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
] as const;

const OPERATOR_OPTIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'not_contains', label: 'Does Not Contain' },
] as const;

const BOOLEAN_OPERATORS = [
  { value: 'AND', label: 'AND', description: 'All conditions must match' },
  { value: 'OR', label: 'OR', description: 'Any condition can match' },
  { value: 'NOT', label: 'NOT', description: 'Exclude this condition' },
] as const;

export function AdvancedSearchInterface({
  onSearch,
  onSave,
  onExport,
  initialQuery = '',
  className = '',
}: AdvancedSearchInterfaceProps) {
  const [searchFields, setSearchFields] = useState<SearchField[]>([
    {
      id: '1',
      field: 'any',
      operator: 'contains',
      value: initialQuery,
      booleanOperator: 'AND',
    },
  ]);

  const [filters, setFilters] = useState<SearchFilters>({
    billStatus: [],
    categories: [],
    sponsors: [],
    tags: [],
    dateRange: { start: '', end: '' },
  });

  const [advancedOptions, setAdvancedOptions] = useState<AdvancedSearchOptions>({
    exactPhrase: false,
    excludeWords: [],
    fuzzyMatching: true,
    proximity: 10,
    dateBoost: 'recent',
  });

  const [searchSettings, setSearchSettings] = useState<SearchSettings>({
    enableFuzzy: true,
    combineResults: true,
    maxResults: 50,
    highlightMatches: true,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [excludeWords, setExcludeWords] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  const { toast } = useToast();

  // Add new search field
  const addSearchField = () => {
    const newField: SearchField = {
      id: Date.now().toString(),
      field: 'any',
      operator: 'contains',
      value: '',
      booleanOperator: 'AND',
    };
    setSearchFields([...searchFields, newField]);
  };

  // Remove search field
  const removeSearchField = (id: string) => {
    if (searchFields.length > 1) {
      setSearchFields(searchFields.filter(field => field.id !== id));
    }
  };

  // Update search field with type safety
  const updateSearchField = (id: string, updates: Partial<SearchField>) => {
    setSearchFields(
      searchFields.map(field => (field.id === id ? { ...field, ...updates } : field))
    );
  };

  // Build search query from fields
  const buildSearchQuery = (): string => {
    return searchFields
      .filter(field => field.value.trim())
      .map(field => {
        let query = field.value.trim();

        // Apply field-specific search
        if (field.field !== 'any') {
          query = `${field.field}:${query}`;
        }

        // Apply operator
        switch (field.operator) {
          case 'exact':
            query = `"${query}"`;
            break;
          case 'starts_with':
            query = `${query}*`;
            break;
          case 'ends_with':
            query = `*${query}`;
            break;
          case 'not_contains':
            query = `-${query}`;
            break;
        }

        return query;
      })
      .join(' ');
  };

  // Handle search execution
  const handleSearch = () => {
    const query = buildSearchQuery();

    if (!query.trim()) {
      toast({
        title: 'Search Error',
        description: 'Please enter at least one search term.',
        variant: 'destructive',
      });
      return;
    }

    // Parse exclude words and update advanced options
    const excludeWordsList = excludeWords
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    // Update the advanced options with the current exclude words
    const updatedAdvancedOptions = {
      ...advancedOptions,
      excludeWords: excludeWordsList,
    };

    // Build the search request with proper typing
    const searchRequest: DualSearchRequest = {
      q: query,
      type: 'all',
      filters,
      sort: 'relevance',
      limit: searchSettings.maxResults,
      enableFuzzy: searchSettings.enableFuzzy,
      combineResults: searchSettings.combineResults,
      maxResults: searchSettings.maxResults,
      highlightMatches: searchSettings.highlightMatches,
    };

    // Store the updated options for potential future use
    setAdvancedOptions(updatedAdvancedOptions);

    onSearch(searchRequest);
  };

  // Save search configuration
  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast({
        title: 'Save Error',
        description: 'Please enter a name for your search.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const searchConfig: SearchConfig = {
        name: searchName,
        fields: searchFields,
        filters,
        advancedOptions,
        searchSettings,
      };

      if (onSave) {
        onSave(searchConfig);
      }

      toast({
        title: 'Search Saved',
        description: `"${searchName}" has been saved successfully.`,
      });

      setSaveDialogOpen(false);
      setSearchName('');
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save search configuration.',
        variant: 'destructive',
      });
    }
  };

  // Reset all fields to defaults
  const handleReset = () => {
    setSearchFields([
      {
        id: '1',
        field: 'any',
        operator: 'contains',
        value: '',
        booleanOperator: 'AND',
      },
    ]);
    setFilters({
      billStatus: [],
      categories: [],
      sponsors: [],
      tags: [],
      dateRange: { start: '', end: '' },
    });
    setAdvancedOptions({
      exactPhrase: false,
      excludeWords: [],
      fuzzyMatching: true,
      proximity: 10,
      dateBoost: 'recent',
    });
    setExcludeWords('');
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Advanced Search</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show search help</p>
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Search Fields */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Search Conditions</Label>
            {searchFields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-2">
                {/* Boolean operator dropdown - only shown for fields after the first */}
                {index > 0 && (
                  <select
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={field.booleanOperator}
                    onChange={(e) =>
                      updateSearchField(field.id, { booleanOperator: e.target.value as 'AND' | 'OR' | 'NOT' })
                    }
                    aria-label="Boolean operator"
                  >
                    {BOOLEAN_OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Field selector - determines which field to search in */}
                <select
                  className="w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={field.field}
                  onChange={(e) =>
                    updateSearchField(field.id, { field: e.target.value as SearchField['field'] })
                  }
                  aria-label="Search field"
                >
                  {FIELD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Operator selector - determines how to match the search term */}
                <select
                  className="w-36 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={field.operator}
                  onChange={(e) =>
                    updateSearchField(field.id, { operator: e.target.value as SearchField['operator'] })
                  }
                  aria-label="Search operator"
                >
                  {OPERATOR_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Search term input */}
                <Input
                  placeholder="Search term..."
                  value={field.value}
                  onChange={e => updateSearchField(field.id, { value: e.target.value })}
                  className="flex-1"
                />

                {/* Remove field button - disabled when only one field remains */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSearchField(field.id)}
                  disabled={searchFields.length === 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addSearchField} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Search Condition
            </Button>
          </div>

          {/* Exclude Words */}
          <div className="space-y-2">
            <Label htmlFor="exclude-words">Exclude Words (comma-separated)</Label>
            <Input
              id="exclude-words"
              placeholder="word1, word2, word3..."
              value={excludeWords}
              onChange={e => setExcludeWords(e.target.value)}
            />
          </div>

          {/* Collapsible Advanced Options */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Options
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 mt-4">
              {/* Search Settings - toggle switches for various search behaviors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fuzzy-matching">Fuzzy Matching</Label>
                  <Switch
                    id="fuzzy-matching"
                    checked={searchSettings.enableFuzzy}
                    onCheckedChange={checked =>
                      setSearchSettings(prev => ({ ...prev, enableFuzzy: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="combine-results">Combine Results</Label>
                  <Switch
                    id="combine-results"
                    checked={searchSettings.combineResults}
                    onCheckedChange={checked =>
                      setSearchSettings(prev => ({ ...prev, combineResults: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="exact-phrase">Exact Phrase</Label>
                  <Switch
                    id="exact-phrase"
                    checked={advancedOptions.exactPhrase}
                    onCheckedChange={checked =>
                      setAdvancedOptions(prev => ({ ...prev, exactPhrase: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="highlight-matches">Highlight Matches</Label>
                  <Switch
                    id="highlight-matches"
                    checked={searchSettings.highlightMatches}
                    onCheckedChange={checked =>
                      setSearchSettings(prev => ({ ...prev, highlightMatches: checked }))
                    }
                  />
                </div>
              </div>

              {/* Proximity and Results Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proximity">Word Proximity</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={advancedOptions.proximity?.toString()}
                    onChange={(e) =>
                      setAdvancedOptions(prev => ({ ...prev, proximity: parseInt(e.target.value) }))
                    }
                    aria-label="Word proximity"
                  >
                    <option value="5">5 words</option>
                    <option value="10">10 words</option>
                    <option value="20">20 words</option>
                    <option value="50">50 words</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-results">Max Results</Label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={searchSettings.maxResults.toString()}
                    onChange={(e) =>
                      setSearchSettings(prev => ({ ...prev, maxResults: parseInt(e.target.value) }))
                    }
                    aria-label="Maximum results"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>
              </div>

              {/* Date Boost */}
              <div className="space-y-2">
                <Label htmlFor="date-boost">Date Relevance Boost</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={advancedOptions.dateBoost}
                  onChange={(e) =>
                    setAdvancedOptions(prev => ({ ...prev, dateBoost: e.target.value as 'recent' | 'none' }))
                  }
                  aria-label="Date relevance boost"
                >
                  <option value="recent">Boost Recent Content</option>
                  <option value="none">No Date Boost</option>
                </select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button onClick={handleSearch} className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Button>

              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {onExport && (
                <Button variant="outline" onClick={() => onExport('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}

              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-name">Search Name</Label>
                      <Input
                        id="search-name"
                        placeholder="Enter a name for this search..."
                        value={searchName}
                        onChange={e => setSearchName(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSearch}>Save Search</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Query Preview - shows the constructed search query */}
          {searchFields.some(field => field.value.trim()) && (
            <div className="space-y-2">
              <Label>Query Preview</Label>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-sm">{buildSearchQuery()}</code>
              </div>
            </div>
          )}
        </CardContent>

        {/* Help Dialog */}
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Advanced Search Help</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Search Fields</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    <strong>Any Field:</strong> Searches across all content
                  </li>
                  <li>
                    <strong>Title:</strong> Searches only in titles
                  </li>
                  <li>
                    <strong>Content:</strong> Searches in summaries and descriptions
                  </li>
                  <li>
                    <strong>Author/Sponsor:</strong> Searches by author or sponsor names
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Operators</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    <strong>Contains:</strong> Field contains the search term
                  </li>
                  <li>
                    <strong>Exact Match:</strong> Field exactly matches the term
                  </li>
                  <li>
                    <strong>Starts With:</strong> Field starts with the term
                  </li>
                  <li>
                    <strong>Ends With:</strong> Field ends with the term
                  </li>
                  <li>
                    <strong>Does Not Contain:</strong> Field does not contain the term
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Boolean Operators</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>
                    <strong>AND:</strong> All conditions must be true
                  </li>
                  <li>
                    <strong>OR:</strong> Any condition can be true
                  </li>
                  <li>
                    <strong>NOT:</strong> Exclude results matching this condition
                  </li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  );
}

export default AdvancedSearchInterface;