/**
 * Recommendation Card Component
 * 
 * Displays a single recommendation in card format
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { BillRecommendation } from '../types';
import { useTrackEngagement } from '../hooks/useRecommendations';

interface RecommendationCardProps {
  recommendation: BillRecommendation;
  onClickTracking?: boolean;
}

export function RecommendationCard({ 
  recommendation, 
  onClickTracking = true 
}: RecommendationCardProps) {
  const trackEngagement = useTrackEngagement();
  const { metadata, score, reason } = recommendation;

  const handleClick = () => {
    if (onClickTracking) {
      trackEngagement.mutate({
        bill_id: metadata.billId,
        engagement_type: 'click',
      });
    }
  };

  return (
    <Link
      to={`/bills/${metadata.billId}`}
      onClick={handleClick}
      className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {metadata.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {metadata.billNumber} • {metadata.status}
          </p>
        </div>
        <div className="ml-2 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {Math.round(score * 100)}%
          </span>
        </div>
      </div>
      
      {metadata.summary && (
        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
          {metadata.summary}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          {reason}
        </p>
        {metadata.introducedDate && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(metadata.introducedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </Link>
  );
}
