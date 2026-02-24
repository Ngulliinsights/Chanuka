/**
 * Quality Metrics Display Component
 * 
 * Displays the 5 quality dimensions for arguments.
 */

import React from 'react';
import type { QualityMetrics } from '../types';

interface QualityMetricsDisplayProps {
  metrics: QualityMetrics;
  className?: string;
  showLabels?: boolean;
}

export function QualityMetricsDisplay({
  metrics,
  className = '',
  showLabels = true,
}: QualityMetricsDisplayProps) {
  const metricItems = [
    { key: 'clarity', label: 'Clarity', value: metrics.clarity, icon: '💡', color: 'blue' },
    { key: 'evidence', label: 'Evidence', value: metrics.evidence, icon: '📊', color: 'green' },
    { key: 'reasoning', label: 'Reasoning', value: metrics.reasoning, icon: '🧠', color: 'purple' },
    { key: 'relevance', label: 'Relevance', value: metrics.relevance, icon: '🎯', color: 'orange' },
    { key: 'constructiveness', label: 'Constructiveness', value: metrics.constructiveness, icon: '🤝', color: 'teal' },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; bar: string; text: string }> = {
      blue: { bg: 'bg-blue-50', bar: 'bg-blue-500', text: 'text-blue-700' },
      green: { bg: 'bg-green-50', bar: 'bg-green-500', text: 'text-green-700' },
      purple: { bg: 'bg-purple-50', bar: 'bg-purple-500', text: 'text-purple-700' },
      orange: { bg: 'bg-orange-50', bar: 'bg-orange-500', text: 'text-orange-700' },
      teal: { bg: 'bg-teal-50', bar: 'bg-teal-500', text: 'text-teal-700' },
    };
    return colors[color] || colors.blue;
  };

  const averageScore = Object.values(metrics).reduce((sum, val) => sum + val, 0) / 5;

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Quality Metrics</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Overall:</span>
          <span className="text-lg font-bold text-blue-600">
            {(averageScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {metricItems.map((item) => {
          const colors = getColorClasses(item.color);
          const percentage = item.value * 100;
          
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  {showLabels && (
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-semibold ${colors.text}`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
              
              <div className={`w-full h-3 ${colors.bg} rounded-full overflow-hidden`}>
                <div
                  className={`h-full ${colors.bar} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar Chart Alternative (Text-based) */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-xs font-medium text-gray-600 mb-3">Quality Profile</p>
        <div className="grid grid-cols-5 gap-2">
          {metricItems.map((item) => {
            const height = item.value * 100;
            return (
              <div key={item.key} className="flex flex-col items-center">
                <div className="w-full h-20 flex items-end">
                  <div
                    className={`w-full ${getColorClasses(item.color).bar} rounded-t transition-all`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs mt-1 text-center">{item.icon}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quality Interpretation */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <p className="font-medium mb-1">Quality Assessment:</p>
        <p>
          {averageScore >= 0.8
            ? '✅ Excellent quality argument with strong evidence and reasoning'
            : averageScore >= 0.6
            ? '👍 Good quality argument with solid foundation'
            : averageScore >= 0.4
            ? '⚠️ Moderate quality - could benefit from more evidence or clarity'
            : '❌ Low quality - needs significant improvement'}
        </p>
      </div>
    </div>
  );
}
