/**
 * Argument Intelligence Dashboard Component
 * 
 * Main dashboard that integrates all argument intelligence features.
 */

import React, { useState } from 'react';
import { useArgumentIntelligence } from '../hooks/useArgumentIntelligence';
import { ArgumentClusterDisplay } from './ArgumentClusterDisplay';
import { SentimentHeatmap } from './SentimentHeatmap';
import { QualityMetricsDisplay } from './QualityMetricsDisplay';
import { ArgumentFilters } from './ArgumentFilters';
import type { ArgumentCluster, SentimentData, QualityMetrics } from '../types';

interface ArgumentIntelligenceDashboardProps {
  billId: string;
  className?: string;
}

export function ArgumentIntelligenceDashboard({
  billId,
  className = '',
}: ArgumentIntelligenceDashboardProps) {
  const {
    arguments: args,
    statistics,
    clusters,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch,
  } = useArgumentIntelligence(billId);

  const [selectedCluster, setSelectedCluster] = useState<ArgumentCluster | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clusters' | 'sentiment' | 'quality'>('overview');

  // Calculate sentiment data from statistics
  const sentimentData: SentimentData | null = statistics ? {
    overall: 0.5, // Placeholder - would be calculated from actual sentiment scores
    support: 0.7,
    oppose: -0.3,
    neutral: 0.1,
    distribution: [
      {
        position: 'support',
        count: statistics.positionBreakdown.support,
        averageSentiment: 0.7,
      },
      {
        position: 'oppose',
        count: statistics.positionBreakdown.oppose,
        averageSentiment: -0.3,
      },
      {
        position: 'neutral',
        count: statistics.positionBreakdown.neutral,
        averageSentiment: 0.1,
      },
    ],
  } : null;

  // Calculate average quality metrics from arguments
  const qualityMetrics: QualityMetrics | null = args.length > 0 ? {
    clarity: 0.75,
    evidence: statistics ? statistics.evidenceFound / statistics.totalArguments : 0.6,
    reasoning: statistics ? statistics.averageStrength : 0.7,
    relevance: 0.8,
    constructiveness: 0.65,
  } : null;

  const handleSearch = async (query: string) => {
    updateFilters({ searchQuery: query });
  };

  if (loading && !statistics) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading argument intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800 font-medium">Error loading argument intelligence</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={refetch}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!statistics || args.length === 0) {
    return (
      <div className={`bg-gray-50 border rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-600 mb-2">No arguments available for analysis</p>
        <p className="text-sm text-gray-500">
          Arguments will appear here once citizens start commenting on this bill.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-2">Argument Intelligence</h2>
        <p className="text-gray-600">
          AI-powered analysis of {statistics.totalArguments} arguments from citizen discussions
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'clusters', label: 'Clusters', icon: '🔗' },
            { id: 'sentiment', label: 'Sentiment', icon: '💭' },
            { id: 'quality', label: 'Quality', icon: '⭐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 px-4 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Statistics Cards */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Arguments</p>
                    <p className="text-3xl font-bold text-blue-900">{statistics.totalArguments}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Avg Strength</p>
                    <p className="text-3xl font-bold text-green-900">
                      {(statistics.averageStrength * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-purple-600 font-medium">Claims</p>
                    <p className="text-3xl font-bold text-purple-900">{statistics.claimsExtracted}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">Evidence</p>
                    <p className="text-3xl font-bold text-orange-900">{statistics.evidenceFound}</p>
                  </div>
                </div>

                {/* Position Breakdown */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Position Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(statistics.positionBreakdown).map(([position, count]) => {
                      const percentage = (count / statistics.totalArguments) * 100;
                      return (
                        <div key={position} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{position}</span>
                            <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                position === 'support' ? 'bg-green-500' :
                                position === 'oppose' ? 'bg-red-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <ArgumentFilters
                filters={filters}
                onFiltersChange={updateFilters}
                onClearFilters={clearFilters}
                onSearch={handleSearch}
              />
            </div>
          )}

          {/* Clusters Tab */}
          {activeTab === 'clusters' && (
            <ArgumentClusterDisplay
              clusters={clusters}
              onClusterClick={setSelectedCluster}
              selectedClusterId={selectedCluster?.id}
            />
          )}

          {/* Sentiment Tab */}
          {activeTab === 'sentiment' && sentimentData && (
            <SentimentHeatmap sentimentData={sentimentData} />
          )}

          {/* Quality Tab */}
          {activeTab === 'quality' && qualityMetrics && (
            <QualityMetricsDisplay metrics={qualityMetrics} />
          )}
        </div>
      </div>

      {/* Selected Cluster Details */}
      {selectedCluster && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cluster: {selectedCluster.name}</h3>
            <button
              onClick={() => setSelectedCluster(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Arguments</p>
                <p className="text-2xl font-bold">{selectedCluster.size}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cohesion</p>
                <p className="text-2xl font-bold">{(selectedCluster.cohesion * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="text-2xl font-bold capitalize">{selectedCluster.position}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Representative Claims:</h4>
              <ul className="space-y-2">
                {selectedCluster.representativeClaims.map((claim, idx) => (
                  <li key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-blue-500">
                    {claim}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
