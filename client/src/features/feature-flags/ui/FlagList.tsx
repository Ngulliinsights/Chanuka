// ============================================================================
// FLAG LIST - Display all feature flags
// ============================================================================

import React from 'react';
import { useFeatureFlags, useToggleFlag, useDeleteFlag } from '../hooks/useFeatureFlags';
import type { FeatureFlag } from '../types';

interface FlagListProps {
  onEdit: (flag: FeatureFlag) => void;
  onViewAnalytics: (flag: FeatureFlag) => void;
}

export function FlagList({ onEdit, onViewAnalytics }: FlagListProps) {
  const { data: flags, isLoading, error } = useFeatureFlags();
  const toggleFlag = useToggleFlag();
  const deleteFlag = useDeleteFlag();

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await toggleFlag.mutateAsync({ name: flag.name, enabled: !flag.enabled });
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  const handleDelete = async (flag: FeatureFlag) => {
    if (!confirm(`Are you sure you want to delete flag "${flag.name}"?`)) {
      return;
    }
    try {
      await deleteFlag.mutateAsync(flag.name);
    } catch (error) {
      console.error('Failed to delete flag:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading feature flags...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Failed to load feature flags</p>
      </div>
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600">
        No feature flags found. Create your first flag to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flags.map((flag) => (
        <div
          key={flag.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{flag.name}</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    flag.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>Rollout: {flag.rolloutPercentage}%</span>
                {flag.abTestConfig && (
                  <span>A/B Test: {flag.abTestConfig.variants.length} variants</span>
                )}
                {flag.dependencies.length > 0 && (
                  <span>Dependencies: {flag.dependencies.length}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleToggle(flag)}
                disabled={toggleFlag.isPending}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  flag.enabled
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {flag.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => onViewAnalytics(flag)}
                className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                Analytics
              </button>
              <button
                onClick={() => onEdit(flag)}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(flag)}
                disabled={deleteFlag.isPending}
                className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
