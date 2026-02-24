// ============================================================================
// FEATURE FLAGS PAGE - Main admin page for feature flag management
// ============================================================================

import React, { useState } from 'react';
import { FlagList } from '../ui/FlagList';
import { FlagEditor } from '../ui/FlagEditor';
import { AnalyticsDashboard } from '../ui/AnalyticsDashboard';
import type { FeatureFlag } from '../types';

export function FeatureFlagsPage() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | undefined>();
  const [analyticsFlag, setAnalyticsFlag] = useState<string | undefined>();

  const handleCreate = () => {
    setEditingFlag(undefined);
    setShowEditor(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingFlag(undefined);
  };

  const handleViewAnalytics = (flag: FeatureFlag) => {
    setAnalyticsFlag(flag.name);
  };

  const handleCloseAnalytics = () => {
    setAnalyticsFlag(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage feature flags, rollouts, and A/B tests
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Flag
            </button>
          </div>
        </div>

        {/* Flag List */}
        <FlagList onEdit={handleEdit} onViewAnalytics={handleViewAnalytics} />

        {/* Editor Modal */}
        {showEditor && (
          <FlagEditor
            flag={editingFlag}
            onClose={handleCloseEditor}
            onSuccess={handleCloseEditor}
          />
        )}

        {/* Analytics Modal */}
        {analyticsFlag && (
          <AnalyticsDashboard flagName={analyticsFlag} onClose={handleCloseAnalytics} />
        )}
      </div>
    </div>
  );
}
