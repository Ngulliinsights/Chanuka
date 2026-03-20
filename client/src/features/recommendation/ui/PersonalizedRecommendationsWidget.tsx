/**
 * Personalized Recommendations Widget
 * 
 * Widget for displaying personalized bill recommendations on the dashboard
 */

import React from 'react';
import { usePersonalizedRecommendations } from '../hooks/useRecommendations';
import { RecommendationWidget } from './RecommendationWidget';
import type { BillRecommendation } from '../types';

interface PersonalizedRecommendationsWidgetProps {
  limit?: number;
}

export function PersonalizedRecommendationsWidget({ 
  limit = 5 
}: PersonalizedRecommendationsWidgetProps) {
  const { data, isLoading, isError, error } = usePersonalizedRecommendations(limit);

  const recommendations = (data?.data || []) as BillRecommendation[];

  return (
    <RecommendationWidget
      recommendations={recommendations}
      isLoading={isLoading}
      isError={isError}
      error={error}
      title="Recommended for You"
      icon="personalized"
      emptyMessage="No personalized recommendations yet. Start engaging with bills to get recommendations!"
    />
  );
}
