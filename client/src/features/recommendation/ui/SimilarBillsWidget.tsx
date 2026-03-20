/**
 * Similar Bills Widget
 * 
 * Widget for displaying similar bills on bill detail pages
 */

import React from 'react';
import { useSimilarBills } from '../hooks/useRecommendations';
import { RecommendationWidget } from './RecommendationWidget';
import type { BillRecommendation } from '../types';

interface SimilarBillsWidgetProps {
  billId: number;
  limit?: number;
}

export function SimilarBillsWidget({ 
  billId, 
  limit = 5 
}: SimilarBillsWidgetProps) {
  const { data, isLoading, isError, error } = useSimilarBills(billId, limit);

  const recommendations = (data?.data || []) as BillRecommendation[];

  return (
    <RecommendationWidget
      recommendations={recommendations}
      isLoading={isLoading}
      isError={isError}
      error={error}
      title="Similar Bills"
      icon="collaborative"
      emptyMessage="No similar bills found"
    />
  );
}
