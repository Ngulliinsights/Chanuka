/**
 * Position Tracking Chart Component
 * 
 * Visualizes how user positions change over time.
 */

import React from 'react';
import type { PositionTracking } from '../types';

interface PositionTrackingChartProps {
  tracking: PositionTracking;
  className?: string;
}

export function PositionTrackingChart({ tracking, className = '' }: PositionTrackingChartProps) {
  if (tracking.positions.length === 0) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-2">Position Tracking</h3>
        <p className="text-sm text-gray-500">No position history available</p>
      </div>
    );
  }

  const getPositionValue = (position: string) => {
    switch (position) {
      case 'support':
        return 1;
      case 'neutral':
        return 0;
      case 'oppose':
        return -1;
      default:
        return 0;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'support':
        return 'text-green-600';
      case 'oppose':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPositionLabel = (position: string) => {
    return position.charAt(0).toUpperCase() + position.slice(1);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const currentPosition = tracking.positions[tracking.positions.length - 1];
  const previousPosition = tracking.positions.length > 1 ? tracking.positions[tracking.positions.length - 2] : null;
  
  const hasChanged = previousPosition && previousPosition.position !== currentPosition.position;

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Position Tracking</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current:</span>
          <span className={`text-sm font-bold ${getPositionColor(currentPosition.position)}`}>
            {getPositionLabel(currentPosition.position)}
          </span>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="relative mb-6">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200" />
        
        <div className="relative flex justify-between items-center">
          {tracking.positions.map((pos, idx) => {
            const value = getPositionValue(pos.position);
            const yOffset = value * 30; // Vertical offset based on position
            
            return (
              <div
                key={idx}
                className="relative flex flex-col items-center"
                style={{ transform: `translateY(${-yOffset}px)` }}
              >
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 border-white shadow-md
                    ${pos.position === 'support' ? 'bg-green-500' : ''}
                    ${pos.position === 'oppose' ? 'bg-red-500' : ''}
                    ${pos.position === 'neutral' ? 'bg-gray-400' : ''}
                  `}
                  title={`${getPositionLabel(pos.position)} - ${formatDate(pos.timestamp)}`}
                />
                {idx === tracking.positions.length - 1 && (
                  <div className="absolute -bottom-6 text-xs font-medium whitespace-nowrap">
                    {formatDate(pos.timestamp)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Position History List */}
      <div className="space-y-2 mt-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">History</h4>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {tracking.positions.slice().reverse().map((pos, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`
                    w-3 h-3 rounded-full
                    ${pos.position === 'support' ? 'bg-green-500' : ''}
                    ${pos.position === 'oppose' ? 'bg-red-500' : ''}
                    ${pos.position === 'neutral' ? 'bg-gray-400' : ''}
                  `}
                />
                <span className={`font-medium ${getPositionColor(pos.position)}`}>
                  {getPositionLabel(pos.position)}
                </span>
                <span className="text-gray-500">
                  (Strength: {(pos.strength * 100).toFixed(0)}%)
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {formatDate(pos.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Change Indicator */}
      {hasChanged && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-medium text-blue-800">
            📊 Position Changed
          </p>
          <p className="text-blue-600 text-xs mt-1">
            From {getPositionLabel(previousPosition.position)} to {getPositionLabel(currentPosition.position)}
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-600">Total Changes</p>
          <p className="text-lg font-bold">{tracking.positions.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Avg Strength</p>
          <p className="text-lg font-bold">
            {(tracking.positions.reduce((sum, p) => sum + p.strength, 0) / tracking.positions.length * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Consistency</p>
          <p className="text-lg font-bold">
            {hasChanged ? 'Variable' : 'Stable'}
          </p>
        </div>
      </div>
    </div>
  );
}
