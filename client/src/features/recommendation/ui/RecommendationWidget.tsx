/**
 * Recommendation Widget Component
 * 
 * Main widget for displaying recommendations with loading and error states
 */

import React from 'react';
import { AlertCircle, Loader2, TrendingUp, Users, Sparkles } from 'lucide-react';
import { RecommendationList } from './RecommendationList';
import type { BillRecommendation } from '../types';

interface RecommendationWidgetProps {
  recommendations: BillRecommendation[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  title: string;
  icon?: 'trending' | 'collaborative' | 'personalized';
  emptyMessage?: string;
  onClickTracking?: boolean;
}

const iconMap = {
  trending: TrendingUp,
  collaborative: Users,
  personalized: Sparkles,
};

export function RecommendationWidget({
  recommendations,
  isLoading,
  isError,
  error,
  title,
  icon = 'personalized',
  emptyMessage,
  onClickTracking = true,
}: RecommendationWidgetProps) {
  const Icon = iconMap[icon];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Failed to load recommendations
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && (
        <RecommendationList
          recommendations={recommendations}
          emptyMessage={emptyMessage}
          onClickTracking={onClickTracking}
        />
      )}
    </div>
  );
}
