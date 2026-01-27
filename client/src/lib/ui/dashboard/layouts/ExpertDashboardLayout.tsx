/**
 * Expert Dashboard Layout
 *
 * Three-column layout for expert users with advanced analytics,
 * professional tools, and comprehensive data access.
 */

// import React from 'react';
import type {
  PersonaType,
  PersonaClassification,
  PersonaPreferences,
} from '@client/core/personalization/types';
import {
  BarChart3,
  Shield,
  Database,
  Download,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  // Users, // Unused
  FileText,
  Globe,
  Zap,
  Target,
  ArrowRight,
  ExternalLink,
  Calendar,
  Clock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';

interface ExpertDashboardLayoutProps {
  persona: PersonaType;
  preferences: PersonaPreferences | null;
  expandedSections: Set<string>;
  hiddenWidgets: Set<string>;
  classification: PersonaClassification | null;
  variant: 'full-page' | 'embedded';
  onSectionToggle: (sectionId: string) => void;
  onWidgetToggle: (widgetId: string) => void;
}

export function ExpertDashboardLayout({
  preferences: _preferences,
  expandedSections,
  hiddenWidgets,
  classification,
  onSectionToggle: _onSectionToggle,
}: ExpertDashboardLayoutProps) {
  const isExpanded = (sectionId: string) => expandedSections.has(sectionId);
  const isHidden = (widgetId: string) => hiddenWidgets.has(widgetId);

  return (
    <div className="expert-dashboard-layout">
      {/* Three-column grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Analytics & Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Professional Analytics Dashboard */}
          {!isHidden('analytics-dashboard') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Legislative Intelligence Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                    <TabsTrigger value="impact">Impact</TabsTrigger>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">247</div>
                        <div className="text-xs text-muted-foreground">Bills Analyzed</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">89</div>
                        <div className="text-xs text-muted-foreground">Verifications</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">156</div>
                        <div className="text-xs text-muted-foreground">Expert Insights</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">94%</div>
                        <div className="text-xs text-muted-foreground">Accuracy Rate</div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Professional Impact Summary
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Your expert contributions have helped{' '}
                        {classification?.confidence
                          ? Math.round(classification.confidence * 1000)
                          : 500}
                        + citizens better understand complex legislation this month.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">Top 5% Contributor</Badge>
                        <Badge variant="secondary">Constitutional Expert</Badge>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="trends" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Legislative Trend Analysis</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Healthcare and education bills showing 34% increase in activity
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/analytics/trends">
                            View Full Analysis
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="impact" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Constitutional Impact Assessment</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          12 bills flagged for constitutional review this quarter
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/expert/constitutional-review">
                            Review Queue
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="predictions" className="mt-4">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Passage Probability Models</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          AI-powered predictions for bill success rates
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/analytics/predictions">
                            View Models
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Advanced Tracking & Monitoring */}
          {!isHidden('advanced-tracking') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Advanced Bill Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(bill => (
                    <div key={bill} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-sm mb-1">
                            Constitutional Amendment #{bill}: Judicial Reform
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Complex constitutional implications requiring expert analysis
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="destructive" className="text-xs">
                            High Impact
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Constitutional
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="text-sm font-bold text-red-600">23%</div>
                          <div className="text-xs text-muted-foreground">Passage Prob.</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="text-sm font-bold text-yellow-600">High</div>
                          <div className="text-xs text-muted-foreground">Complexity</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-sm font-bold text-blue-600">87</div>
                          <div className="text-xs text-muted-foreground">Stakeholders</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Next: Expert panel review Dec 20
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/expert/analysis/${bill}`}>Analyze</a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/bills/constitutional-${bill}`}>Full Text</a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workaround Detection System */}
          {!isHidden('workaround-detection') && isExpanded('workaround-detection') && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  Constitutional Workaround Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-red-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-red-800">
                        Potential Workaround Detected: Bill #HB-2024-156
                      </h4>
                      <Badge variant="destructive" className="text-xs">
                        High Risk
                      </Badge>
                    </div>
                    <p className="text-xs text-red-700 mb-3">
                      Bill structure suggests potential circumvention of constitutional spending
                      limits
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-red-300 text-red-700">
                        Review Analysis
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-300 text-red-700">
                        Flag for Committee
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-yellow-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-yellow-800">
                        Monitoring: Bill #SB-2024-089
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        Medium Risk
                      </Badge>
                    </div>
                    <p className="text-xs text-yellow-700 mb-3">
                      Unusual amendment pattern requires expert review
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-yellow-300 text-yellow-700"
                    >
                      Schedule Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle Column - Professional Tools */}
        <div className="space-y-6">
          {/* Expert Tools */}
          {!isHidden('expert-tools') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  Expert Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/expert/verification-queue">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verification Queue (12)
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/expert/constitutional-analysis">
                    <FileText className="h-4 w-4 mr-2" />
                    Constitutional Analysis
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/expert/workaround-detection">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Workaround Detection
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/api/documentation">
                    <Database className="h-4 w-4 mr-2" />
                    API Access
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/expert/data-export">
                    <Download className="h-4 w-4 mr-2" />
                    Data Export
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Verification Queue */}
          {!isHidden('verification-queue') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Pending Verifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Bill Analysis: Healthcare Reform</h4>
                      <Badge variant="outline" className="text-xs">
                        Priority
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Community analysis needs expert verification
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />2 days remaining
                      </span>
                      <Button variant="ghost" size="sm">
                        Review
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Constitutional Compliance Check</h4>
                      <Badge variant="secondary" className="text-xs">
                        Standard
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      New bill requires constitutional review
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />5 days remaining
                      </span>
                      <Button variant="ghost" size="sm">
                        Review
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t mt-3">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <a href="/expert/verification-queue">View All (12)</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Network */}
          {!isHidden('professional-network') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  Professional Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <p className="text-sm font-medium">Expert Collaboration</p>
                      <p className="text-xs text-muted-foreground">24 active experts</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/expert/network">Join</a>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div>
                      <p className="text-sm font-medium">Peer Review</p>
                      <p className="text-xs text-muted-foreground">3 pending reviews</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/expert/peer-review">Review</a>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <div>
                      <p className="text-sm font-medium">Research Groups</p>
                      <p className="text-xs text-muted-foreground">5 active groups</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href="/expert/research-groups">Browse</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Insights & Monitoring */}
        <div className="space-y-6">
          {/* Real-time Monitoring */}
          {!isHidden('realtime-monitoring') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Live Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-sm font-medium text-green-800">Bill Status Update</p>
                    </div>
                    <p className="text-xs text-green-600">HB-2024-156 moved to committee</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>

                  <div className="p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <p className="text-sm font-medium text-blue-800">New Analysis Request</p>
                    </div>
                    <p className="text-xs text-blue-600">Constitutional review needed</p>
                    <p className="text-xs text-muted-foreground">2 min ago</p>
                  </div>

                  <div className="p-2 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                      <p className="text-sm font-medium text-purple-800">Expert Verification</p>
                    </div>
                    <p className="text-xs text-purple-600">Analysis verified by peer</p>
                    <p className="text-xs text-muted-foreground">5 min ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          {!isHidden('performance-metrics') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Verification Accuracy</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Response Time</span>
                    <span>2.3 days avg</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Community Impact</span>
                    <span>High</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>

                <div className="pt-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <a href="/expert/performance">
                      Detailed Metrics
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Status */}
          {!isHidden('system-status') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Operational
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Sync</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Up to date
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analysis Engine</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Running
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verification Queue</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      12 pending
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
