// ============================================================================
// ROLLOUT CONTROLS - Manage feature rollout percentage
// ============================================================================

import { useState } from 'react';
import { useUpdateRollout, useFeatureFlags } from '../hooks/useFeatureFlags';
import { logger } from '@client/lib/utils/logger';

interface RolloutControlsProps {
  flagName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RolloutControls({ flagName, onClose, onSuccess }: RolloutControlsProps) {
  const { data: flags = [] } = useFeatureFlags();
  const flag = flags.find((f) => f.name === flagName);
  const [percentage, setPercentage] = useState(flag?.rolloutPercentage ?? 0);
  const updateRollout = useUpdateRollout();

  if (!flag) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <p className="text-red-600">Flag not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleUpdate = async () => {
    try {
      await updateRollout.mutateAsync({ name: flag.name, percentage });
      onSuccess();
    } catch (error) {
      logger.error('Failed to update rollout:', { error });
    }
  };

  const hasChanges = percentage !== flag.rolloutPercentage;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rollout Controls</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Rollout Percentage</label>
              <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={percentage}
              onChange={e => setPercentage(parseInt(e.target.value, 10))}
              aria-label="Rollout percentage"
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

          <div className="flex items-center gap-2 flex-wrap">
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
        </div>

        {hasChanges && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <p className="text-sm text-gray-600">
              Current: {flag.rolloutPercentage}% → New: {percentage}%
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updateRollout.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updateRollout.isPending ? 'Updating...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        )}

        {!hasChanges && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
