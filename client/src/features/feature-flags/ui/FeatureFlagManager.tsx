/**
 * Feature Flag Manager Component
 * 
 * Main admin UI for managing feature flags
 */

import React, { useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, TrendingUp } from 'lucide-react';
import { useFeatureFlags, useDeleteFlag, useToggleFlag } from '../hooks/useFeatureFlags';
import { FlagEditor } from './FlagEditor';
import { RolloutControls } from './RolloutControls';
import { FlagAnalyticsDashboard } from './FlagAnalyticsDashboard';
import type { FeatureFlag } from '../types';

export function FeatureFlagManager() {
  const { data: flags = [], isLoading, refetch } = useFeatureFlags();
  const deleteFlag = useDeleteFlag();
  const toggleFlag = useToggleFlag();

  const [showEditor, setShowEditor] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | undefined>();
  const [showRollout, setShowRollout] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleCreate = () => {
    setEditingFlag(undefined);
    setShowEditor(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setShowEditor(true);
  };

  const handleDelete = async (flagName: string) => {
    if (confirm(`Are you sure you want to delete the flag "${flagName}"?`)) {
      await deleteFlag.mutateAsync(flagName);
      refetch();
    }
  };

  const handleToggle = async (flagName: string, enabled: boolean) => {
    await toggleFlag.mutateAsync({ name: flagName, enabled });
    refetch();
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingFlag(undefined);
  };

  const handleEditorSuccess = () => {
    setShowEditor(false);
    setEditingFlag(undefined);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600 mt-2">
            Manage feature rollouts, A/B tests, and user targeting
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Flag
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Flags</div>
          <div className="text-3xl font-bold text-gray-900">{flags.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Enabled</div>
          <div className="text-3xl font-bold text-green-600">
            {flags.filter((f) => f.enabled).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Disabled</div>
          <div className="text-3xl font-bold text-gray-600">
            {flags.filter((f) => !f.enabled).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">A/B Tests</div>
          <div className="text-3xl font-bold text-purple-600">
            {flags.filter((f) => f.abTestConfig).length}
          </div>
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flag Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rollout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flags.map((flag) => (
                <tr key={flag.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                      <div className="text-sm text-gray-500">{flag.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(flag.name, !flag.enabled)}
                      className="flex items-center gap-2"
                    >
                      {flag.enabled ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Enabled</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">Disabled</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setShowRollout(flag.name)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {flag.rolloutPercentage}%
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {flag.abTestConfig ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        A/B Test
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(flag)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(flag.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {flags.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No feature flags yet</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Flag
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditor && (
        <FlagEditor flag={editingFlag} onClose={handleEditorClose} onSuccess={handleEditorSuccess} />
      )}

      {showRollout && (
        <RolloutControls
          flagName={showRollout}
          onClose={() => setShowRollout(null)}
          onSuccess={() => {
            setShowRollout(null);
            refetch();
          }}
        />
      )}

      {showAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Feature Flag Analytics</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <FlagAnalyticsDashboard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
