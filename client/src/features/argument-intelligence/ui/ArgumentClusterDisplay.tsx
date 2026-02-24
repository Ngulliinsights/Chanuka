/**
 * Argument Cluster Display Component
 * 
 * Displays argument clusters with visual grouping and statistics.
 */

import React from 'react';
import type { ArgumentCluster } from '../types';

interface ArgumentClusterDisplayProps {
  clusters: ArgumentCluster[];
  onClusterClick?: (cluster: ArgumentCluster) => void;
  selectedClusterId?: string;
}

export function ArgumentClusterDisplay({
  clusters,
  onClusterClick,
  selectedClusterId,
}: ArgumentClusterDisplayProps) {
  if (clusters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No argument clusters available
      </div>
    );
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'support':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'oppose':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'neutral':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Argument Clusters</h3>
        <span className="text-sm text-gray-600">
          {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${getPositionColor(cluster.position)}
              ${selectedClusterId === cluster.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
            `}
            onClick={() => onClusterClick?.(cluster)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getPositionIcon(cluster.position)}</span>
                <h4 className="font-semibold text-sm">{cluster.name}</h4>
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-white rounded">
                {cluster.size} args
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Cohesion:</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${cluster.cohesion * 100}%` }}
                    />
                  </div>
                  <span className="font-medium">{(cluster.cohesion * 100).toFixed(0)}%</span>
                </div>
              </div>

              {cluster.representativeClaims.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <p className="text-xs font-medium mb-1">Key Claims:</p>
                  <ul className="text-xs space-y-1">
                    {cluster.representativeClaims.slice(0, 2).map((claim, idx) => (
                      <li key={idx} className="line-clamp-2">
                        • {claim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
