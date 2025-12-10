/**
 * SearchTips Component
 *
 * Interactive search tips and help component with examples,
 * tooltips, and keyboard shortcuts for advanced search features.
 */

import {
  Search,
  Info,
  Settings,
  BookOpen,
  CheckCircle,
  Target,
  Filter,
  Lightbulb,
  Keyboard,
  Quote
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';

interface SearchTip {
  id: string;
  title: string;
  description: string;
  example: string;
  result: string;
  category: 'basic' | 'advanced' | 'syntax' | 'filters';
  icon: React.ReactNode;
}

interface SearchTipsProps {
  className?: string;
  compact?: boolean;
  showKeyboardShortcuts?: boolean;
  onTipSelect?: (tip: SearchTip) => void;
}

const SEARCH_TIPS: SearchTip[] = [
  {
    id: 'basic-search',
    title: 'Basic Search',
    description: 'Search for keywords in bills, sponsors, and comments',
    example: 'healthcare reform',
    result: 'Finds all content containing "healthcare" or "reform"',
    category: 'basic',
    icon: <Search className="h-4 w-4" />
  },
  {
    id: 'exact-phrase',
    title: 'Exact Phrase',
    description: 'Use quotes to search for exact phrases',
    example: '"climate change"',
    result: 'Finds content with the exact phrase "climate change"',
    category: 'basic',
    icon: <Quote className="h-4 w-4" />
  },
  {
    id: 'boolean-and',
    title: 'AND Operator',
    description: 'Find content containing all specified terms',
    example: 'healthcare AND insurance',
    result: 'Finds content containing both "healthcare" and "insurance"',
    category: 'advanced',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'boolean-or',
    title: 'OR Operator',
    description: 'Find content containing any of the specified terms',
    example: 'tax OR taxation',
    result: 'Finds content containing either "tax" or "taxation"',
    category: 'advanced',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'exclude-terms',
    title: 'Exclude Terms',
    description: 'Use minus sign to exclude specific terms',
    example: 'budget -military',
    result: 'Finds budget-related content excluding military topics',
    category: 'advanced',
    icon: <Filter className="h-4 w-4" />
  },
  {
    id: 'wildcard-search',
    title: 'Wildcard Search',
    description: 'Use asterisk for partial word matching',
    example: 'environ*',
    result: 'Finds "environment", "environmental", "environmentally", etc.',
    category: 'syntax',
    icon: <Settings className="h-4 w-4" />
  },
  {
    id: 'field-search',
    title: 'Field-Specific Search',
    description: 'Search within specific fields',
    example: 'sponsor:smith',
    result: 'Finds bills sponsored by anyone named Smith',
    category: 'filters',
    icon: <Filter className="h-4 w-4" />
  },
  {
    id: 'date-range',
    title: 'Date Range',
    description: 'Search within specific date ranges',
    example: 'date:2024',
    result: 'Finds content from 2024',
    category: 'filters',
    icon: <Filter className="h-4 w-4" />
  }
];

const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl + K', description: 'Open search' },
  { key: 'Ctrl + /', description: 'Show search tips' },
  { key: 'Enter', description: 'Execute search' },
  { key: 'Ctrl + Enter', description: 'Advanced search' },
  { key: 'Esc', description: 'Clear search' },
  { key: '↑ ↓', description: 'Navigate suggestions' }
];

/**
 * SearchTips - Interactive search help and examples
 */
export function SearchTips({ 
  className, 
  compact = false, 
  showKeyboardShortcuts = true,
  onTipSelect 
}: SearchTipsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [selectedTip, setSelectedTip] = useState<SearchTip | null>(null);

  const categories = [
    { id: 'basic', label: 'Basic', icon: <Search className="h-4 w-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Target className="h-4 w-4" /> },
    { id: 'syntax', label: 'Syntax', icon: <Settings className="h-4 w-4" /> },
    { id: 'filters', label: 'Filters', icon: <Filter className="h-4 w-4" /> }
  ];

  const filteredTips = SEARCH_TIPS.filter(tip => tip.category === activeCategory);

  const handleTipClick = (tip: SearchTip) => {
    setSelectedTip(tip);
    onTipSelect?.(tip);
  };

  const copyExample = async (example: string) => {
    try {
      await navigator.clipboard.writeText(example);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy example:', err);
    }
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {SEARCH_TIPS.slice(0, 3).map((tip) => (
            <div key={tip.id} className="text-xs">
              <div className="font-medium">{tip.title}</div>
              <div className="text-muted-foreground">{tip.example}</div>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full text-xs">
            View All Tips
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Search Tips & Help
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-4">
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                <span className="flex items-center gap-1">
                  {category.icon}
                  {category.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-4">
              <div className="grid gap-3">
                {filteredTips.map((tip) => (
                  <Card 
                    key={tip.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedTip?.id === tip.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTipClick(tip)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                          {tip.icon}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{tip.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {tip.category}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {tip.description}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Example:</span>
                              <code 
                                className="text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyExample(tip.example);
                                }}
                              >
                                {tip.example}
                              </code>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Result:</span> {tip.result}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {showKeyboardShortcuts && (
          <>
            <Separator className="my-6" />
            
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Keyboard Shortcuts
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <Separator className="my-6" />
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Search Guide
          </Button>
          
          <Button variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Examples
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Advanced Options
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchTips;