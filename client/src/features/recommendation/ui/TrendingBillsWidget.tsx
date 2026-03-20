/**
 * Trending Bills Widget
 * 
 * Widget for displaying trending bills on the dashboard
 */

import React from 'react';
import { useTrendingBills } from '../hooks/useRecommendations';
import { RecommendationWidget } from './RecommendationWidget';
import type { BillRecommendation } from '../types';

interface TrendingBillsWidgetProps {
  days?: number;
  limit?: number;
}

export function TrendingBillsWidget({ 
  days = 7, 
  limit = 5 
}: TrendingBillsWidgetProps) {
  const { data, isLoading, isError, error } = useTrendingBills(days, limit);

  const recommendations = (data?.data || []) as BillRecommendation[];

  return (
    <RecommendationWidget
      recommendations={recommendations}
      isLoading={isLoading}
      isError={isError}
      error={error}
      title="Trending Bills"
      icon="trending"
      emptyMessage="No trending bills at the moment"
    />
  );
}
