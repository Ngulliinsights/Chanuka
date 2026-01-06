import React from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Zap,
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/shared/design-system/feedback/Badge';
import { Button } from '@/shared/design-system/interactive/Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/design-system/interactive/Collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';

interface PlainLanguageSection {
  id: string;
  title: string;
  legalText: string;
  plainLanguage: string;
  keyPoints: string[];
  impact: {
    who: string[];
    what: string[];
    when: string;
    cost?: string;
  };
  complexity: 'low' | 'medium' | 'high';
  importance: 'low' | 'medium' | 'high' | 'critical';
}

interface PlainLanguageSummaryProps {
  billId: string;
  billTitle: string;
  sections: PlainLanguageSection[];
  className?: string;
}

/**
 * PlainLanguageSummary - Converts complex legal content into accessible language
 * Features: Section-by-section breakdown, impact analysis, complexity indicators
 */
export function PlainLanguageSummary({
  sections,
  className = ""
}: PlainLanguageSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showLegalText, setShowLegalText] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleLegalText = (sectionId: string) => {
    const newShowLegal = new Set(showLegalText);
    if (newShowLegal.has(sectionId)) {
      newShowLegal.delete(sectionId);
    } else {
      newShowLegal.add(sectionId);
    }
    setShowLegalText(newShowLegal);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Info className="h-4 w-4 text-blue-600" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Plain Language Summary
          </CardTitle>
          <CardDescription>
            Complex legal language translated into clear, accessible explanations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {sections.length}
              </div>
              <div className="text-sm text-muted-foreground">Sections Explained</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {sections.filter(s => s.importance === 'critical' || s.importance === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(sections.reduce((acc, s) => acc + (s.complexity === 'high' ? 3 : s.complexity === 'medium' ? 2 : 1), 0) / sections.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Complexity</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Summaries */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={expandedSections.has(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getImportanceIcon(section.importance)}
                        <div>
                          <CardTitle className="text-base">{section.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getComplexityColor(section.complexity)}`}
                            >
                              {section.complexity} complexity
                            </Badge>
                            <Badge
                              variant={section.importance === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {section.importance} priority
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    {expandedSections.has(section.id) ?
                      <ChevronDown className="h-4 w-4" /> :
                      <ChevronRight className="h-4 w-4" />
                    }
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-4">
                    {/* Plain Language Explanation */}
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-600" />
                        What This Means
                      </h4>
                      <p className="text-sm leading-relaxed">{section.plainLanguage}</p>
                    </div>

                    {/* Key Points */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Key Points</h4>
                      <ul className="space-y-1">
                        {section.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Impact Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm flex items-center gap-1 mb-1">
                            <Users className="h-3 w-3" />
                            Who is affected?
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {section.impact.who.map((group, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {group}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3" />
                            When does this take effect?
                          </h5>
                          <p className="text-xs text-muted-foreground">{section.impact.when}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-1">What changes?</h5>
                          <ul className="space-y-1">
                            {section.impact.what.map((change, index) => (
                              <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {section.impact.cost && (
                          <div>
                            <h5 className="font-medium text-sm flex items-center gap-1 mb-1">
                              <DollarSign className="h-3 w-3" />
                              Cost Impact
                            </h5>
                            <p className="text-xs text-muted-foreground">{section.impact.cost}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Legal Text Toggle */}
                    <div className="border-t pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLegalText(section.id)}
                        className="text-xs"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        {showLegalText.has(section.id) ? 'Hide' : 'Show'} Original Legal Text
                      </Button>
                      {showLegalText.has(section.id) && (
                        <div className="mt-2 p-3 rounded-lg bg-gray-50 border">
                          <p className="text-xs font-mono leading-relaxed text-gray-700">
                            {section.legalText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Summary Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Understanding This Bill</CardTitle>
          <CardDescription>
            Additional resources to help you understand the implications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Full Legal Text</div>
                  <div className="text-xs opacity-80">Read the complete legislation</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Ask Questions</div>
                  <div className="text-xs opacity-80">Get help from experts</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
