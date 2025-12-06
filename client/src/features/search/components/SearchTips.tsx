/**
 * SearchTips Component
 *
 * Interactive search tips and help component with examples,
 * tooltips, and keyboard shortcuts for advanced search features.
 */

import {
  HelpCircle,
  Search,
  Info,
  Settings,
  BookOpen,
  CheckCircle,
  Target,
  Filter
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

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
    title: 'Exact Phrases',
    description: 'Use quotes for exact phrase matching',
    example: '"climate change"',
    result: 'Finds content with the exact phrase "climate change"',
    category: 'syntax',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'field-search',
    title: 'Field Search',
    description: 'Search within specific fields using field:keyword syntax',
    example: 'title:healthcare',
    result: 'Finds bills with "healthcare" in the title',
    category: 'advanced',
    icon: <Filter className="h-4 w-4" />
  },
  {
    id: 'exclusion',
    title: 'Exclude Terms',
    description: 'Use minus sign to exclude specific terms',
    example: 'education -funding',
    result: 'Finds education content but excludes funding-related results',
    category: 'syntax',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'boolean-and',
    title: 'AND Operator',
    description: 'Find content that contains both terms',
    example: 'education AND funding',
    result: 'Finds content with both "education" and "funding"',
    category: 'advanced',
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    id: 'boolean-or',
    title: 'OR Operator',
    description: 'Find content that contains either term',
    example: 'education OR healthcare',
    result: 'Finds content with either "education" or "healthcare"',
    category: 'advanced',
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    id: 'proximity',
    title: 'Proximity Search',
    description: 'Find terms within a certain distance of each other',
    example: '"education funding"~5',
    result: 'Finds "education" and "funding" within 5 words of each other',
    category: 'advanced',
    icon: <Target className="h-4 w-4" />
  },
  {
    id: 'wildcard',
    title: 'Wildcard Search',
    description: 'Use asterisks for partial matching',
    example: 'educat*',
    result: 'Finds "education", "educational", "educate", etc.',
    category: 'syntax',
    icon: <Search className="h-4 w-4" />
  }
];

const KEYBOARD_SHORTCUTS = [
  { key: '/', description: 'Focus search input' },
  { key: 'Ctrl+K', description: 'Open advanced search' },
  { key: 'Enter', description: 'Execute search' },
  { key: 'Esc', description: 'Clear search / Close dialogs' },
  { key: '↑↓', description: 'Navigate suggestions' },
  { key: 'Tab', description: 'Accept suggestion' }
];

export function SearchTips({ className = '', compact = false, showKeyboardShortcuts = true }: SearchTipsProps) {
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedExample(id);
      setTimeout(() => setCopiedExample(null), 2000);

      toast({
        title: "Copied!",
        description: "Search example copied to clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getTipsByCategory = (category: SearchTip['category']) => {
    return SEARCH_TIPS.filter(tip => tip.category === category);
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Info className="h-5 w-5 text-blue-500" />
            <span>Search Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SEARCH_TIPS.slice(0, 4).map((tip) => (
            <div key={tip.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
              <div className="text-primary mt-0.5">{tip.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{tip.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tip.example, tip.id)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedExample === tip.id ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Info className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                <code className="text-xs bg-background px-2 py-1 rounded mt-2 block">
                  {tip.example}
                </code>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <span>Search Guide</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="syntax">Syntax</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              {showKeyboardShortcuts && (
                <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-3">
                {getTipsByCategory('basic').map((tip) => (
                  <SearchTipCard
                    key={tip.id}
                    tip={tip}
                    copiedExample={copiedExample}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="syntax" className="space-y-4 mt-4">
              <div className="space-y-3">
                {getTipsByCategory('syntax').map((tip) => (
                  <SearchTipCard
                    key={tip.id}
                    tip={tip}
                    copiedExample={copiedExample}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-3">
                {getTipsByCategory('advanced').map((tip) => (
                  <SearchTipCard
                    key={tip.id}
                    tip={tip}
                    copiedExample={copiedExample}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            </TabsContent>

            {showKeyboardShortcuts && (
              <TabsContent value="shortcuts" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Keyboard Shortcuts</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span className="text-sm">{shortcut.description}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {shortcut.key}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface SearchTipCardProps {
  tip: SearchTip;
  copiedExample: string | null;
  onCopy: (text: string, id: string) => void;
}

function SearchTipCard({ tip, copiedExample, onCopy }: SearchTipCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-primary">{tip.icon}</div>
          <h4 className="font-medium">{tip.title}</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(tip.example, tip.id)}
          className="h-8 w-8 p-0"
        >
          {copiedExample === tip.id ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{tip.description}</p>

      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Example:</span>
          <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
            {tip.example}
          </code>
        </div>
        <div>
          <span className="text-xs font-medium text-muted-foreground">Result:</span>
          <span className="ml-2 text-sm">{tip.result}</span>
        </div>
      </div>
    </div>
  );
}

export default SearchTips;