/**
 * Similar Bills Widget
 * 
 * Widget for displaying similar bills on bill detail pages
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import { useSimilarBills } from '../hooks/useRecommendations';
import { RecommendationWidget } from './RecommendationWidget';
import { Button } from '@client/lib/design-system';
import type { BillRecommendation } from '../types';

interface SimilarBillsWidgetProps {
  billId: number;
  limit?: number;
}

export function SimilarBillsWidget({ 
  billId, 
  limit = 5 
}: SimilarBillsWidgetProps) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useSimilarBills(billId, limit);

  const recommendations = (data?.data || []) as BillRecommendation[];

  const handleCompareAll = () => {
    const billIds = [billId, ...recommendations.map(r => r.billId)];
    navigate(`/analysis/compare?bills=${billIds.join(',')}&from=bills`);
  };

  const actions = recommendations.length >= 2 ? (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCompareAll}
      className="gap-2"
    >
      <GitCompare className="w-4 h-4" />
      Compare All Similar
    </Button>
  ) : undefined;

  return (
    <RecommendationWidget
      recommendations={recommendations}
      isLoading={isLoading}
      isError={isError}
      error={error}
      title="Similar Bills"
      icon="collaborative"
      emptyMessage="No similar bills found"
      actions={actions}
    />
  );
}
