/**
 * Recommendation List Component
 * 
 * Displays a list of recommendations
 */

import React from 'react';
import type { BillRecommendation } from '../types';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationListProps {
  recommendations: BillRecommendation[];
  title?: string;
  emptyMessage?: string;
  onClickTracking?: boolean;
}

export function RecommendationList({ 
  recommendations, 
  title,
  emptyMessage = 'No recommendations available',
  onClickTracking = true
}: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h2>
      )}
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          onClickTracking={onClickTracking}
        />
      ))}
    </div>
  );
}
