/**
 * Intermediate Dashboard Layout
 *
 * Two-column layout for users with moderate civic engagement experience.
 * Focuses on activity tracking, bill management, and community participation.
 */

import {
import React from 'react';

  Activity,
  Bookmark,
  MessageSquare,
  TrendingUp,
  Filter,
  Bell,
  BarChart3,
  Users,
  ArrowRight,
  Eye,
  Calendar
} from 'lucide-react';

import type { PersonaType, PersonaClassification, PersonaPreferences } from '@client/core/personalization/types';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';

interface IntermediateDashboardLayoutProps {
  persona: PersonaType;
  preferences: PersonaPreferences | null;
  expandedSections: Set<string>;
  hiddenWidgets: Set<string>;
  classification: PersonaClassification | null;
  variant: 'full-page' | 'embedded';
  onSectionToggle: (sectionId: string) => void;
  onWidgetToggle: (widgetId: string) => void;
}

export function IntermediateDashboardLayout({
  preferences,
  expandedSections,
  hiddenWidgets,
  classification,
  onSectionToggle
}: IntermediateDashboardLayoutProps) {

  const isExpanded = (sectionId: string) => expandedSections.has(sectionId);
  const isHidden = (widgetId: string) => hiddenWidgets.has(widgetId);

  // Use preferences and onSectionToggle if needed
  const _ = { preferences, onSectionToggle };

  return (
    <div className="intermediate-dashboard-layout">
      {/* Two-column grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Activity Summary */}
          {!isHidden('activity-summary') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Your Civic Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">12</div>
                    <div className="text-xs text-muted-foreground">Bills Tracked</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">8</div>
                    <div className="text-xs text-muted-foreground">Comments Posted</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">5</div>
                    <div className="text-xs text-muted-foreground">Discussions</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">72</div>
                    <div className="text-xs text-muted-foreground">Civic Score</div>
                  </div>
                </div>

                {classification?.nextLevelRequirements && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Path to Expert Level:
                    </h4>
                    <div className="space-y-2">
                      {classification.nextLevelRequirements.map((requirement, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-blue-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          {requirement}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tracked Bills Management */}
          {!isHidden('tracked-bills') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-green-500" />
                    Tracked Bills
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/bills/manage">
                      Manage All
                    </a>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="active">Active (8)</TabsTrigger>
                    <TabsTrigger value="updates">Updates (3)</TabsTrigger>
                    <TabsTrigger value="archived">Archived (4)</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="space-y-3 mt-4">
                    {[1, 2, 3].map((bill) => (
                      <div key={bill} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            Bill #{bill}: Healthcare Reform Act 2024
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            Committee Review
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Comprehensive healthcare reform focusing on accessibility and cost reduction.
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Next: Committee hearing on Dec 15
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/bills/sample-${bill}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="updates" className="space-y-3 mt-4">
                    <div className="text-center py-6 text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No new updates</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="archived" className="space-y-3 mt-4">
                    <div className="text-center py-6 text-muted-foreground">
                      <Bookmark className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Archived bills will appear here</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Community Engagement */}
          {!isHidden('community-engagement') && isExpanded('community-engagement') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  Community Discussions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((discussion) => (
                    <div key={discussion} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">
                          Discussion: Impact of Healthcare Reform on Rural Communities
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          12 replies
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Community members are discussing the potential effects of the proposed healthcare changes...
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          24 participants
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/community/discussion-${discussion}`}>
                            Join Discussion
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">

          {/* Quick Actions */}
          {!isHidden('quick-actions') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/search?advanced=true">
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Search
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/bills/recommendations">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Bill Recommendations
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/community/trending">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Trending Discussions
                  </a>
                </Button>

                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/analytics/personal">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    My Analytics
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Engagement Progress */}
          {!isHidden('engagement-progress') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Engagement Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Weekly Goal</span>
                    <span>7/10 bills</span>
                  </div>
                  <Progress value={70} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Community Participation</span>
                    <span>3/5 discussions</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Monthly Civic Score</span>
                    <span>72/100</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>

                <div className="pt-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <a href="/analytics/detailed">
                      View Detailed Analytics
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications & Updates */}
          {!isHidden('notifications') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      Healthcare Reform Bill
                    </p>
                    <p className="text-xs text-blue-600">
                      Moved to committee review
                    </p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>

                  <div className="p-2 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      New Discussion Reply
                    </p>
                    <p className="text-xs text-green-600">
                      Someone replied to your comment
                    </p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>

                  <div className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">
                      Weekly Digest Ready
                    </p>
                    <p className="text-xs text-purple-600">
                      Your personalized bill summary
                    </p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>

                <div className="pt-3 border-t mt-3">
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <a href="/notifications">
                      View All Notifications
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommended Content */}
          {!isHidden('recommendations') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommended for You</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">
                    Education Funding Bill
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Based on your interest in community development
                  </p>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/bills/education-funding">
                      Learn More
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>

                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">
                    Transportation Infrastructure
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Popular in your area
                  </p>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/bills/transportation">
                      Learn More
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
