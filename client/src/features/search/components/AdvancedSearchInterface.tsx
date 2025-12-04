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
  Filter,
  Settings,
  Save,
  Download,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Separator } from '../../../components/ui/separator';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { useToast } from '../../../hooks/use-toast';
import { intelligentSearch } from '../services/intelligent-search';
import type { DualSearchRequest } from '../services/intelligent-search';

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

interface AdvancedSearchInterfaceProps {
  onSearch: (request: DualSearchRequest) => void;
  onSave?: (searchConfig: any) => void;
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
  { value: 'status', label: 'Status' }
];

const OPERATOR_OPTIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'not_contains', label: 'Does Not Contain' }
];

const BOOLEAN_OPERATORS = [
  { value: 'AND', label: 'AND', description: 'All conditions must match' },
  { value: 'OR', label: 'OR', description: 'Any condition can match' },
  { value: 'NOT', label: 'NOT', description: 'Exclude this condition' }
];

export function AdvancedSearchInterface({
  onSearch,
  onSave,
  onExport,
  initialQuery = '',
  className = ''
}: AdvancedSearchInterfaceProps) {
  const [searchFields, setSearchFields] = useState<SearchField[]>([
    {
      id: '1',
      field: 'any',
      operator: 'contains',
      value: initialQuery,
      booleanOperator: 'AND'
    }
  ]);

  const [filters, setFilters] = useState<SearchFilters>({
    billStatus: [],
    categories: [],
    sponsors: [],
    tags: [],
    dateRange: { start: '', end: '' }
  });

  const [advancedOptions, setAdvancedOptions] = useState<AdvancedSearchOptions>({
    exactPhrase: false,
    excludeWords: [],
    fuzzyMatching: true,
    proximity: 10,
    dateBoost: 'recent'
  });

  const [searchSettings, setSearchSettings] = useState({
    enableFuzzy: true,
    combineResults: true,
    maxResults: 50,
    highlightMatches: true
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
      booleanOperator: 'AND'
    };
    setSearchFields([...searchFields, newField]);
  };

  // Remove search field
  const removeSearchField = (id: string) => {
    if (searchFields.length > 1) {
      setSearchFields(searchFields.filter(field => field.id !== id));
    }
  };

  // Update search field
  const updateSearchField = (id: string, updates: Partial<SearchField>) => {
    setSearchFields(searchFields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    ));
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
        title: "Search Error",
        description: "Please enter at least one search term.",
        variant: "destructive"
      });
      return;
    }

    // Parse exclude words
    const excludeWordsList = excludeWords
      .split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);

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
      advanced: {
        ...advancedOptions,
        excludeWords: excludeWordsList
      }
    };

    onSearch(searchRequest);
  };

  // Save search configuration
  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast({
        title: "Save Error",
        description: "Please enter a name for your search.",
        variant: "destructive"
      });
      return;
    }

    try {
      const searchConfig = {
        name: searchName,
        fields: searchFields,
        filters,
        advancedOptions,
        searchSettings
      };

      if (onSave) {
        await onSave(searchConfig);
      }

      toast({
        title: "Search Saved",
        description: `"${searchName}" has been saved successfully.`
      });

      setSaveDialogOpen(false);
      setSearchName('');
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save search configuration.",
        variant: "destructive"
      });
    }
  };

  // Reset all fields
  const handleReset = () => {
    setSearchFields([{
      id: '1',
      field: 'any',
      operator: 'contains',
      value: '',
      booleanOperator: 'AND'
    }]);
    setFilters({
      billStatus: [],
      categories: [],
      sponsors: [],
      tags: [],
      dateRange: { start: '', end: '' }
    });
    setAdvancedOptions({
      exactPhrase: false,
      excludeWords: [],
      fuzzyMatching: true,
      proximity: 10,
      dateBoost: 'recent'
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHelp(true)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show search help</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                {index > 0 && (
                  <Select
                    value={field.booleanOperator}
                    onValueChange={(value: 'AND' | 'OR' | 'NOT') =>
                      updateSearchField(field.id, { booleanOperator: value })
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOLEAN_OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <Tooltip>
                            <TooltipTrigger>{op.label}</TooltipTrigger>
                            <TooltipContent>
                              <p>{op.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select
                  value={field.field}
                  onValueChange={(value: SearchField['field']) =>
                    updateSearchField(field.id, { field: value })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={field.operator}
                  onValueChange={(value: SearchField['operator']) =>
                    updateSearchField(field.id, { operator: value })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Search term..."
                  value={field.value}
                  onChange={(e) => updateSearchField(field.id, { value: e.target.value })}
                  className="flex-1"
                />

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

            <Button
              variant="outline"
              size="sm"
              onClick={addSearchField}
              className="w-full"
            >
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
              onChange={(e) => setExcludeWords(e.target.value)}
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
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 mt-4">
              {/* Search Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fuzzy-matching">Fuzzy Matching</Label>
                  <Switch
                    id="fuzzy-matching"
                    checked={searchSettings.enableFuzzy}
                    onCheckedChange={(checked) =>
                      setSearchSettings(prev => ({ ...prev, enableFuzzy: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="combine-results">Combine Results</Label>
                  <Switch
                    id="combine-results"
                    checked={searchSettings.combineResults}
                    onCheckedChange={(checked) =>
                      setSearchSettings(prev => ({ ...prev, combineResults: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="exact-phrase">Exact Phrase</Label>
                  <Switch
                    id="exact-phrase"
                    checked={advancedOptions.exactPhrase}
                    onCheckedChange={(checked) =>
                      setAdvancedOptions(prev => ({ ...prev, exactPhrase: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="highlight-matches">Highlight Matches</Label>
                  <Switch
                    id="highlight-matches"
                    checked={searchSettings.highlightMatches}
                    onCheckedChange={(checked) =>
                      setSearchSettings(prev => ({ ...prev, highlightMatches: checked }))
                    }
                  />
                </div>
              </div>

              {/* Proximity and Results Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proximity">Word Proximity</Label>
                  <Select
                    value={advancedOptions.proximity?.toString()}
                    onValueChange={(value) =>
                      setAdvancedOptions(prev => ({ ...prev, proximity: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 words</SelectItem>
                      <SelectItem value="10">10 words</SelectItem>
                      <SelectItem value="20">20 words</SelectItem>
                      <SelectItem value="50">50 words</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-results">Max Results</Label>
                  <Select
                    value={searchSettings.maxResults.toString()}
                    onValueChange={(value) =>
                      setSearchSettings(prev => ({ ...prev, maxResults: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Boost */}
              <div className="space-y-2">
                <Label htmlFor="date-boost">Date Relevance Boost</Label>
                <Select
                  value={advancedOptions.dateBoost}
                  onValueChange={(value: 'recent' | 'none') =>
                    setAdvancedOptions(prev => ({ ...prev, dateBoost: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Boost Recent Content</SelectItem>
                    <SelectItem value="none">No Date Boost</SelectItem>
                  </SelectContent>
                </Select>
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
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSearch}>
                        Save Search
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Query Preview */}
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
                  <li><strong>Any Field:</strong> Searches across all content</li>
                  <li><strong>Title:</strong> Searches only in titles</li>
                  <li><strong>Content:</strong> Searches in summaries and descriptions</li>
                  <li><strong>Author/Sponsor:</strong> Searches by author or sponsor names</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Operators</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li><strong>Contains:</strong> Field contains the search term</li>
                  <li><strong>Exact Match:</strong> Field exactly matches the term</li>
                  <li><strong>Starts With:</strong> Field starts with the term</li>
                  <li><strong>Ends With:</strong> Field ends with the term</li>
                  <li><strong>Does Not Contain:</strong> Field does not contain the term</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Boolean Operators</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li><strong>AND:</strong> All conditions must be true</li>
                  <li><strong>OR:</strong> Any condition can be true</li>
                  <li><strong>NOT:</strong> Exclude results matching this condition</li>
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