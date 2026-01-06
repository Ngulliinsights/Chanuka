/**
 * Novice Dashboard Layout
 *
 * Single-column layout optimized for new users with simple widgets
 * and guided learning experiences.
 */

import React from 'react';
import { BookOpen, Target, Users, ArrowRight, HelpCircle } from 'lucide-react';

import type {
  PersonaType,
  PersonaClassification,
  PersonaPreferences,
} from '@client/core/personalization/types';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';

interface NoviceDashboardLayoutProps {
  persona: PersonaType;
  preferences: PersonaPreferences | null;
  expandedSections: Set<string>;
  hiddenWidgets: Set<string>;
  classification: PersonaClassification | null;
  variant: 'full-page' | 'embedded';
  onSectionToggle: (sectionId: string) => void;
  onWidgetToggle: (widgetId: string) => void;
}

export function NoviceDashboardLayout({
  preferences: _preferences,
  expandedSections,
  hiddenWidgets,
  classification,
  onSectionToggle,
}: NoviceDashboardLayoutProps) {
  const isExpanded = (sectionId: string) => expandedSections.has(sectionId);
  const isHidden = (widgetId: string) => hiddenWidgets.has(widgetId);

  // Use onSectionToggle if needed
  const _ = { onSectionToggle };

  return (
    <div className="novice-dashboard-layout space-y-6">
      {/* Welcome & Getting Started Section */}
      {!isHidden('welcome') && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <BookOpen className="h-5 w-5" />
              Welcome to Civic Engagement!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700">
              You&apos;re taking your first steps into understanding how legislation affects your daily
              life. We&apos;ll guide you through the process step by step.
            </p>

            {classification?.nextLevelRequirements && (
              <div className="bg-white/50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Your Learning Path:</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  {classification.nextLevelRequirements.map((requirement, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a href="/civic-education">
                  Start Learning
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/bills?guided=true">Explore Bills</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Progress Tracker */}
      {!isHidden('progress') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Your Civic Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Getting Started</span>
                <Badge variant="secondary">25%</Badge>
              </div>
              <Progress value={25} className="h-2" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-xs text-muted-foreground">Bills Saved</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-xs text-muted-foreground">Comments Posted</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-xs text-muted-foreground">Discussions Joined</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Bills Widget */}
      {!isHidden('popular-bills') && isExpanded('popular-bills') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-orange-500" />
                Popular Bills This Week
              </span>
              <Button variant="ghost" size="sm" onClick={() => onSectionToggle('popular-bills')}>
                Hide
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(bill => (
                <div key={bill} className="p-3 border rounded-lg hover:bg-accent transition-colors">
                  <h4 className="font-medium text-sm mb-1">
                    Sample Bill #{bill}: Community Development Act
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    This bill focuses on improving local infrastructure and community services.
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Easy to understand
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/bills/sample-${bill}`}>
                        Learn More
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <a href="/bills">View All Bills</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Civic Education Widget */}
      {!isHidden('civic-education') && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <HelpCircle className="h-5 w-5" />
              Learn How Government Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-purple-700 text-sm">
              Understanding the legislative process helps you become a more effective citizen.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <a href="/civic-education/how-bills-become-law">
                  <BookOpen className="h-4 w-4 mr-2" />
                  How Bills Become Law
                </a>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <a href="/civic-education/your-representatives">
                  <Users className="h-4 w-4 mr-2" />
                  Your Representatives
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Actions Widget */}
      {!isHidden('simple-actions') && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="justify-start h-auto p-4" asChild>
                <a href="/bills?category=local">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Find Bills That Affect You</div>
                      <div className="text-sm text-muted-foreground">
                        Discover legislation relevant to your community
                      </div>
                    </div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4" asChild>
                <a href="/community">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Join Community Discussions</div>
                      <div className="text-sm text-muted-foreground">
                        Connect with other engaged citizens
                      </div>
                    </div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4" asChild>
                <a href="/civic-education">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Learn About Civic Engagement</div>
                      <div className="text-sm text-muted-foreground">
                        Understand how you can make a difference
                      </div>
                    </div>
                  </div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help & Support */}
      {!isHidden('help-support') && (
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <HelpCircle className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm mb-4">
              We&apos;re here to help you navigate your civic engagement journey.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/help/getting-started">Getting Started Guide</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/help/faq">FAQ</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/contact">Contact Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
