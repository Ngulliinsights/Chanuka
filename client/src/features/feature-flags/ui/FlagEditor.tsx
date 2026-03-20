// ============================================================================
// FLAG EDITOR - Create/Edit feature flags
// ============================================================================

import React, { useState } from 'react';
import { useCreateFlag, useUpdateFlag } from '../hooks/useFeatureFlags';
import type { FeatureFlag, CreateFlagRequest } from '../types';

interface FlagEditorProps {
  flag?: FeatureFlag;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlagEditor({ flag, onClose, onSuccess }: FlagEditorProps) {
  const isEditing = !!flag;
  const createFlag = useCreateFlag();
  const updateFlag = useUpdateFlag();

  const [formData, setFormData] = useState<CreateFlagRequest>({
    name: flag?.name || '',
    description: flag?.description || '',
    enabled: flag?.enabled ?? false,
    rolloutPercentage: flag?.rolloutPercentage ?? 0,
    userTargeting: flag?.userTargeting || {},
    abTestConfig: flag?.abTestConfig,
    dependencies: flag?.dependencies || [],
  });

  const [includeUsers, setIncludeUsers] = useState(
    flag?.userTargeting?.include?.join(', ') || ''
  );
  const [excludeUsers, setExcludeUsers] = useState(
    flag?.userTargeting?.exclude?.join(', ') || ''
  );
  const [abTestEnabled, setAbTestEnabled] = useState(!!flag?.abTestConfig);
  const [variants, setVariants] = useState(
    flag?.abTestConfig?.variants.join(', ') || 'control,variant-a'
  );
  const [distribution, setDistribution] = useState(
    flag?.abTestConfig?.distribution.join(', ') || '50,50'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateFlagRequest = {
      ...formData,
      userTargeting: {
        include: includeUsers ? includeUsers.split(',').map((s) => s.trim()) : undefined,
        exclude: excludeUsers ? excludeUsers.split(',').map((s) => s.trim()) : undefined,
      },
      abTestConfig: abTestEnabled
        ? {
            variants: variants.split(',').map((s) => s.trim()),
            distribution: distribution.split(',').map((s) => parseInt(s.trim(), 10)),
            metrics: [],
          }
        : undefined,
    };

    try {
      if (isEditing) {
        await updateFlag.mutateAsync({ name: flag.name, data });
      } else {
        await createFlag.mutateAsync(data);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save flag:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isEditing ? 'Edit Feature Flag' : 'Create Feature Flag'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flag Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
                Enable flag
              </label>
            </div>

            {/* Rollout Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rollout Percentage: {formData.rolloutPercentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.rolloutPercentage}
                onChange={(e) =>
                  setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value, 10) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* User Targeting */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Targeting</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Include Users (comma-separated IDs)
                  </label>
                  <input
                    type="text"
                    value={includeUsers}
                    onChange={(e) => setIncludeUsers(e.target.value)}
                    placeholder="user1, user2, user3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exclude Users (comma-separated IDs)
                  </label>
                  <input
                    type="text"
                    value={excludeUsers}
                    onChange={(e) => setExcludeUsers(e.target.value)}
                    placeholder="user4, user5, user6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* A/B Test Configuration */}
            <div className="border-t pt-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="abTest"
                  checked={abTestEnabled}
                  onChange={(e) => setAbTestEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="abTest" className="ml-2 block text-lg font-semibold text-gray-900">
                  A/B Test Configuration
                </label>
              </div>

              {abTestEnabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variants (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={variants}
                      onChange={(e) => setVariants(e.target.value)}
                      placeholder="control, variant-a, variant-b"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distribution (comma-separated percentages, must sum to 100)
                    </label>
                    <input
                      type="text"
                      value={distribution}
                      onChange={(e) => setDistribution(e.target.value)}
                      placeholder="50, 50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFlag.isPending || updateFlag.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isEditing ? 'Update Flag' : 'Create Flag'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
