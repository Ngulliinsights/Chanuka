// ============================================================================
// ROLLOUT CONTROLS - Manage feature rollout percentage
// ============================================================================

import React, { useState } from 'react';
import { useUpdateRollout } from '../hooks/useFeatureFlags';
import type { FeatureFlag } from '../types';

interface RolloutControlsProps {
  flag: FeatureFlag;
}

export function RolloutControls({ flag }: RolloutControlsProps) {
  const [percentage, setPercentage] = useState(flag.rolloutPercentage);
  const updateRollout = useUpdateRollout();

  const handleUpdate = async () => {
    try {
      await updateRollout.mutateAsync({ name: flag.name, percentage });
    } catch (error) {
      console.error('Failed to update rollout:', error);
    }
  };

  const hasChanges = percentage !== flag.rolloutPercentage;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rollout Controls</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Rollout Percentage
            </label>
            <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
          </div>
          
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={percentage}
            onChange={(e) => setPercentage(parseInt(e.target.value, 10))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPercentage(0)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            0%
          </button>
          <button
            onClick={() => setPercentage(10)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            10%
          </button>
          <button
            onClick={() => setPercentage(25)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            25%
          </button>
          <button
            onClick={() => setPercentage(50)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            50%
          </button>
          <button
            onClick={() => setPercentage(100)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            100%
          </button>
        </div>

        {hasChanges && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              Current: {flag.rolloutPercentage}% → New: {percentage}%
            </p>
            <button
              onClick={handleUpdate}
              disabled={updateRollout.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateRollout.isPending ? 'Updating...' : 'Apply Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
