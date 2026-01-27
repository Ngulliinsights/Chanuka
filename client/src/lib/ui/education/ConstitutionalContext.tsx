import {
  Scale,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Users,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { Badge } from '@client/lib/design-system/feedback/Badge';
import { Button } from '@client/lib/design-system/interactive/Button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@client/lib/design-system/interactive/Collapsible';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system/typography/Card';

interface ConstitutionalProvision {
  id: string;
  article: string;
  section?: string;
  title: string;
  text: string;
  relevance: 'direct' | 'indirect' | 'contextual';
  impact: 'supports' | 'conflicts' | 'neutral' | 'unclear';
  explanation: string;
}

interface BillProvision {
  id: string;
  sectionNumber: string;
  title: string;
  summary: string;
  constitutionalBasis: ConstitutionalProvision[];
  concerns: string[];
  precedents: string[];
}

interface ConstitutionalContextProps {
  billId: string;
  billTitle: string;
  provisions: BillProvision[];
  className?: string;
}

/**
 * ConstitutionalContext - Integrates constitutional context with bill provisions
 * Features: Article-by-article analysis, constitutional basis, conflict identification
 */
export function ConstitutionalContext({ provisions, className = '' }: ConstitutionalContextProps) {
  const [expandedProvisions, setExpandedProvisions] = useState<Set<string>>(new Set());
  const [selectedConstitutionalArticle, setSelectedConstitutionalArticle] = useState<string | null>(
    null
  );

  const toggleProvision = (provisionId: string) => {
    const newExpanded = new Set(expandedProvisions);
    if (newExpanded.has(provisionId)) {
      newExpanded.delete(provisionId);
    } else {
      newExpanded.add(provisionId);
    }
    setExpandedProvisions(newExpanded);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'supports':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'conflicts':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'unclear':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'supports':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'conflicts':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'unclear':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'direct':
        return 'bg-purple-100 text-purple-800';
      case 'indirect':
        return 'bg-blue-100 text-blue-800';
      case 'contextual':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract all constitutional articles referenced
  const allConstitutionalArticles = Array.from(
    new Set(provisions.flatMap(p => p.constitutionalBasis.map(cb => cb.article)))
  ).sort();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-600" />
            Constitutional Context
          </CardTitle>
          <CardDescription>
            How this bill relates to constitutional provisions and principles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {allConstitutionalArticles.length}
              </div>
              <div className="text-sm text-muted-foreground">Articles Referenced</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {
                  provisions
                    .flatMap(p => p.constitutionalBasis)
                    .filter(cb => cb.impact === 'supports').length
                }
              </div>
              <div className="text-sm text-muted-foreground">Supporting</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {
                  provisions
                    .flatMap(p => p.constitutionalBasis)
                    .filter(cb => cb.impact === 'conflicts').length
                }
              </div>
              <div className="text-sm text-muted-foreground">Conflicts</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  provisions
                    .flatMap(p => p.constitutionalBasis)
                    .filter(cb => cb.impact === 'unclear').length
                }
              </div>
              <div className="text-sm text-muted-foreground">Unclear</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constitutional Articles Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constitutional Articles Referenced</CardTitle>
          <CardDescription>Click on an article to highlight related provisions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedConstitutionalArticle === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedConstitutionalArticle(null)}
            >
              All Articles
            </Button>
            {allConstitutionalArticles.map(article => (
              <Button
                key={article}
                variant={selectedConstitutionalArticle === article ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedConstitutionalArticle(article)}
              >
                {article}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bill Provisions with Constitutional Context */}
      <div className="space-y-4">
        {provisions
          .filter(
            provision =>
              selectedConstitutionalArticle === null ||
              provision.constitutionalBasis.some(cb => cb.article === selectedConstitutionalArticle)
          )
          .map(provision => (
            <Collapsible
              key={provision.id}
              open={expandedProvisions.has(provision.id)}
              onOpenChange={() => toggleProvision(provision.id)}
            >
              <Card
                className={
                  selectedConstitutionalArticle &&
                  provision.constitutionalBasis.some(
                    cb => cb.article === selectedConstitutionalArticle
                  )
                    ? 'ring-2 ring-purple-200'
                    : ''
                }
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-purple-600" />
                          <div>
                            <CardTitle className="text-base">
                              Section {provision.sectionNumber}: {provision.title}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {provision.summary}
                            </CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              {provision.constitutionalBasis.map((cb, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className={`text-xs ${getImpactColor(cb.impact)}`}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    {getImpactIcon(cb.impact)}
                                    <span>{cb.article}</span>
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      {expandedProvisions.has(provision.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Constitutional Basis */}
                      <div>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Scale className="h-4 w-4 text-purple-600" />
                          Constitutional Basis
                        </h4>
                        <div className="space-y-3">
                          {provision.constitutionalBasis.map((cb, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border ${getImpactColor(cb.impact)}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={getRelevanceColor(cb.relevance)}>
                                    {cb.relevance} relevance
                                  </Badge>
                                  <Badge variant="outline">
                                    {cb.article} {cb.section && `§${cb.section}`}
                                  </Badge>
                                </div>
                                {getImpactIcon(cb.impact)}
                              </div>
                              <h5 className="font-medium text-sm mb-1">{cb.title}</h5>
                              <p className="text-xs text-muted-foreground mb-2 font-mono leading-relaxed">
                                &quot;{cb.text}&quot;
                              </p>
                              <p className="text-sm">{cb.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Constitutional Concerns */}
                      {provision.concerns.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            Constitutional Concerns
                          </h4>
                          <ul className="space-y-2">
                            {provision.concerns.map((concern, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <span>{concern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Legal Precedents */}
                      {provision.precedents.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Relevant Precedents
                          </h4>
                          <ul className="space-y-2">
                            {provision.precedents.map((precedent, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <span>{precedent}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
      </div>

      {/* Constitutional Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constitutional Resources</CardTitle>
          <CardDescription>Learn more about the constitutional principles involved</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Constitution of Kenya 2010</div>
                  <div className="text-xs opacity-80">Read the full constitutional text</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Constitutional Cases</div>
                  <div className="text-xs opacity-80">Explore relevant court decisions</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Expert Analysis</div>
                  <div className="text-xs opacity-80">Read constitutional expert opinions</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Legal Resources</div>
                  <div className="text-xs opacity-80">Access legal databases and guides</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
