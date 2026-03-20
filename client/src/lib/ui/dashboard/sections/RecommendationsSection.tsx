/**
 * Recommendations Section Component
 * 
 * Displays personalized bill recommendations on the user dashboard
 */

import React from 'react';
import { Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { RecommendationWidget } from '@client/features/recommendation/ui/RecommendationWidget';
import { useRecommendations } from '@client/features/recommendation/hooks/useRecommendations';

interface RecommendationsSectionProps {
  compact?: boolean;
}

export function RecommendationsSection({ compact = false }: RecommendationsSectionProps) {
  const personalizedQuery = useRecommendations({ type: 'personalized', limit: compact ? 5 : 10 });
  const trendingQuery = useRecommendations({ type: 'trending', limit: compact ? 5 : 10 });
  const collaborativeQuery = useRecommendations({ type: 'collaborative', limit: compact ? 5 : 10 });

  if (compact) {
    // Compact view - show only personalized recommendations
    return (
      <RecommendationWidget
        recommendations={personalizedQuery.recommendations}
        isLoading={personalizedQuery.isLoading}
        isError={personalizedQuery.isError}
        error={personalizedQuery.error}
        title="Recommended for You"
        icon="personalized"
        emptyMessage="No recommendations available yet. Start engaging with bills to get personalized suggestions!"
      />
    );
  }

  // Full view - show tabs with different recommendation types
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Bill Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personalized" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personalized" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              For You
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="collaborative" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Similar Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="mt-4">
            <RecommendationWidget
              recommendations={personalizedQuery.recommendations}
              isLoading={personalizedQuery.isLoading}
              isError={personalizedQuery.isError}
              error={personalizedQuery.error}
              title=""
              icon="personalized"
              emptyMessage="No personalized recommendations yet. Start engaging with bills to get tailored suggestions!"
            />
          </TabsContent>

          <TabsContent value="trending" className="mt-4">
            <RecommendationWidget
              recommendations={trendingQuery.recommendations}
              isLoading={trendingQuery.isLoading}
              isError={trendingQuery.isError}
              error={trendingQuery.error}
              title=""
              icon="trending"
              emptyMessage="No trending bills at the moment."
            />
          </TabsContent>

          <TabsContent value="collaborative" className="mt-4">
            <RecommendationWidget
              recommendations={collaborativeQuery.recommendations}
              isLoading={collaborativeQuery.isLoading}
              isError={collaborativeQuery.isError}
              error={collaborativeQuery.error}
              title=""
              icon="collaborative"
              emptyMessage="No collaborative recommendations yet. We need more engagement data to find similar users."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
