/**
 * Argument Intelligence Widget Component
 * 
 * Compact widget for displaying argument intelligence on bill pages.
 * Can be embedded in community discussions or bill detail pages.
 */

import React, { useState } from 'react';
import { useArgumentIntelligence } from '../hooks/useArgumentIntelligence';
import type { ArgumentCluster } from '../types';

interface ArgumentIntelligenceWidgetProps {
  billId: string;
  compact?: boolean;
  className?: string;
}

export function ArgumentIntelligenceWidget({
  billId,
  compact = false,
  className = '',
}: ArgumentIntelligenceWidgetProps) {
  const { statistics, clusters, loading, error } = useArgumentIntelligence(billId);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return null; // Silently fail for widget
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'support':
        return '👍';
      case 'oppose':
        return '👎';
      case 'neutral':
        return '🤔';
      default:
        return '💬';
    }
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <h3 className="font-semibold text-gray-900">Argument Intelligence</h3>
        </div>
        {!compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Total Arguments</p>
          <p className="text-2xl font-bold text-gray-900">{statistics.totalArguments}</p>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Avg Quality</p>
          <p className="text-2xl font-bold text-green-600">
            {(statistics.averageStrength * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Position Breakdown */}
      <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Position Distribution</p>
        <div className="flex gap-1 h-6 rounded-full overflow-hidden">
          {Object.entries(statistics.positionBreakdown).map(([position, count]) => {
            const percentage = (count / statistics.totalArguments) * 100;
            return (
              <div
                key={position}
                className={`
                  ${position === 'support' ? 'bg-green-500' : ''}
                  ${position === 'oppose' ? 'bg-red-500' : ''}
                  ${position === 'neutral' ? 'bg-gray-400' : ''}
                `}
                style={{ width: `${percentage}%` }}
                title={`${position}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs">
          {Object.entries(statistics.positionBreakdown).map(([position, count]) => (
            <span key={position} className="flex items-center gap-1">
              {getPositionIcon(position)}
              <span className="font-medium">{count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && !compact && (
        <>
          {/* Top Clusters */}
          {clusters.length > 0 && (
            <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Top Argument Clusters ({clusters.length})
              </p>
              <div className="space-y-2">
                {clusters.slice(0, 3).map((cluster) => (
                  <div
                    key={cluster.id}
                    className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{getPositionIcon(cluster.position)}</span>
                      <span className="font-medium truncate">{cluster.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>{cluster.size} args</span>
                      <span>•</span>
                      <span>{(cluster.cohesion * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence & Claims */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Claims Extracted</p>
              <p className="text-xl font-bold text-purple-600">{statistics.claimsExtracted}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Evidence Found</p>
              <p className="text-xl font-bold text-orange-600">{statistics.evidenceFound}</p>
            </div>
          </div>
        </>
      )}

      {/* View Full Analysis Link */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <a
          href={`/bills/${billId}/arguments`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
        >
          View Full Analysis
          <span>→</span>
        </a>
      </div>
    </div>
  );
}
