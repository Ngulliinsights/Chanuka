import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  History, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Scale
} from 'lucide-react';

interface LegislationOutcome {
  id: string;
  title: string;
  year: number;
  jurisdiction: string;
  status: 'passed' | 'failed' | 'amended' | 'withdrawn' | 'pending';
  similarity: 'high' | 'medium' | 'low';
  keyProvisions: string[];
  outcome: {
    result: 'successful' | 'unsuccessful' | 'mixed' | 'unknown';
    impact: string;
    lessons: string[];
    challenges: string[];
  };
  constitutionalChallenges?: {
    filed: boolean;
    outcome?: 'upheld' | 'struck_down' | 'modified' | 'pending';
    details?: string;
  };
  publicSupport: {
    initial: number; // percentage
    final: number; // percentage
    keyFactors: string[];
  };
  timeline: {
    introduced: string;
    passed?: string;
    implemented?: string;
    challenged?: string;
  };
}

interface HistoricalPrecedentsProps {
  billId: string;
  billTitle: string;
  precedents: LegislationOutcome[];
  className?: string;
}

/**
 * HistoricalPrecedents - Shows similar legislation outcomes and lessons learned
 * Features: Outcome analysis, success factors, constitutional challenges, public support trends
 */
export function HistoricalPrecedents({ 
  billId, 
  billTitle, 
  precedents,
  className = ""
}: HistoricalPrecedentsProps) {
  const [expandedPrecedents, setExpandedPrecedents] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSimilarity, setFilterSimilarity] = useState<string | null>(null);

  const togglePrecedent = (precedentId: string) => {
    const newExpanded = new Set(expandedPrecedents);
    if (newExpanded.has(precedentId)) {
      newExpanded.delete(precedentId);
    } else {
      newExpanded.add(precedentId);
    }
    setExpandedPrecedents(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'amended': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'withdrawn': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'amended': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'withdrawn': return <Minus className="h-4 w-4 text-gray-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSimilarityColor = (similarity: string) => {
    switch (similarity) {
      case 'high': return 'bg-purple-100 text-purple-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeIcon = (result: string) => {
    switch (result) {
      case 'successful': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'unsuccessful': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'mixed': return <Minus className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSupportTrend = (initial: number, final: number) => {
    const diff = final - initial;
    if (diff > 5) return { icon: <TrendingUp className="h-3 w-3 text-green-600" />, color: 'text-green-600' };
    if (diff < -5) return { icon: <TrendingDown className="h-3 w-3 text-red-600" />, color: 'text-red-600' };
    return { icon: <Minus className="h-3 w-3 text-gray-600" />, color: 'text-gray-600' };
  };

  const filteredPrecedents = precedents.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSimilarity && p.similarity !== filterSimilarity) return false;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: precedents.length,
    passed: precedents.filter(p => p.status === 'passed').length,
    failed: precedents.filter(p => p.status === 'failed').length,
    avgSupport: Math.round(precedents.reduce((acc, p) => acc + p.publicSupport.final, 0) / precedents.length),
    constitutionalChallenges: precedents.filter(p => p.constitutionalChallenges?.filed).length
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            Historical Precedents
          </CardTitle>
          <CardDescription>
            Learn from similar legislation outcomes and historical patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-orange-50">
              <div className="text-2xl font-bold text-orange-600">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">Similar Bills</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {stats.passed}
              </div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {stats.avgSupport}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Support</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {stats.constitutionalChallenges}
              </div>
              <div className="text-sm text-muted-foreground">Challenged</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Precedents</CardTitle>
          <CardDescription>
            Focus on specific types of outcomes or similarity levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">By Status</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterStatus === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(null)}
                >
                  All Status
                </Button>
                {['passed', 'failed', 'amended', 'withdrawn', 'pending'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {getStatusIcon(status)}
                    <span className="ml-1 capitalize">{status}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">By Similarity</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterSimilarity === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterSimilarity(null)}
                >
                  All Levels
                </Button>
                {['high', 'medium', 'low'].map((similarity) => (
                  <Button
                    key={similarity}
                    variant={filterSimilarity === similarity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterSimilarity(similarity)}
                  >
                    <span className="capitalize">{similarity} Similarity</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Precedents */}
      <div className="space-y-4">
        {filteredPrecedents.map((precedent) => (
          <Collapsible 
            key={precedent.id}
            open={expandedPrecedents.has(precedent.id)}
            onOpenChange={() => togglePrecedent(precedent.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(precedent.status)}
                        <div>
                          <CardTitle className="text-base">{precedent.title}</CardTitle>
                          <CardDescription className="text-sm mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {precedent.year}
                            <MapPin className="h-3 w-3 ml-2" />
                            {precedent.jurisdiction}
                          </CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(precedent.status)}`}
                            >
                              {precedent.status}
                            </Badge>
                            <Badge className={`text-xs ${getSimilarityColor(precedent.similarity)}`}>
                              {precedent.similarity} similarity
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getSupportTrend(precedent.publicSupport.initial, precedent.publicSupport.final).icon}
                              <span className={getSupportTrend(precedent.publicSupport.initial, precedent.publicSupport.final).color}>
                                {precedent.publicSupport.final}% support
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {expandedPrecedents.has(precedent.id) ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-6">
                    {/* Key Provisions */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Key Provisions
                      </h4>
                      <ul className="space-y-1">
                        {precedent.keyProvisions.map((provision, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0"></span>
                            {provision}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Outcome Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          {getOutcomeIcon(precedent.outcome.result)}
                          Outcome Analysis
                        </h4>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <h5 className="font-medium text-sm mb-1">Impact</h5>
                            <p className="text-sm text-muted-foreground">{precedent.outcome.impact}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm mb-2">Lessons Learned</h5>
                            <ul className="space-y-1">
                              {precedent.outcome.lessons.map((lesson, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                                  <span>{lesson}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm mb-2">Challenges Faced</h5>
                            <ul className="space-y-1">
                              {precedent.outcome.challenges.map((challenge, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <XCircle className="h-3 w-3 text-red-600 mt-1 flex-shrink-0" />
                                  <span>{challenge}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Public Support Trend */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            Public Support
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Initial Support:</span>
                              <span className="font-medium">{precedent.publicSupport.initial}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Final Support:</span>
                              <span className="font-medium flex items-center gap-1">
                                {getSupportTrend(precedent.publicSupport.initial, precedent.publicSupport.final).icon}
                                {precedent.publicSupport.final}%
                              </span>
                            </div>
                            <div className="mt-2">
                              <h6 className="text-xs font-medium mb-1">Key Factors:</h6>
                              <ul className="space-y-1">
                                {precedent.publicSupport.keyFactors.map((factor, index) => (
                                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0"></span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Constitutional Challenges */}
                        {precedent.constitutionalChallenges?.filed && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Scale className="h-4 w-4 text-purple-600" />
                              Constitutional Challenge
                            </h4>
                            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {precedent.constitutionalChallenges.outcome || 'pending'}
                                </Badge>
                              </div>
                              {precedent.constitutionalChallenges.details && (
                                <p className="text-sm text-muted-foreground">
                                  {precedent.constitutionalChallenges.details}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-600" />
                            Timeline
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Introduced:</span>
                              <span>{precedent.timeline.introduced}</span>
                            </div>
                            {precedent.timeline.passed && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Passed:</span>
                                <span>{precedent.timeline.passed}</span>
                              </div>
                            )}
                            {precedent.timeline.implemented && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Implemented:</span>
                                <span>{precedent.timeline.implemented}</span>
                              </div>
                            )}
                            {precedent.timeline.challenged && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Challenged:</span>
                                <span>{precedent.timeline.challenged}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Insights Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Insights</CardTitle>
          <CardDescription>
            What history tells us about similar legislation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Success Factors</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Strong bipartisan support increases passage likelihood by 60%</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Clear constitutional basis reduces challenge risk</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Gradual implementation improves public acceptance</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Common Pitfalls</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Insufficient funding mechanisms lead to implementation failures</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Vague language creates enforcement challenges</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>Lack of stakeholder consultation increases opposition</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}