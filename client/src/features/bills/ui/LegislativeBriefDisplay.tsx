/**
 * LegislativeBriefDisplay Component
 * 
 * Displays the AI-generated legislative brief summarizing all citizen input on a bill
 * Shows:
 * - Executive summary of citizen sentiment
 * - Support/oppose/neutral breakdown with percentages
 * - Top supporting and opposing arguments
 * - Common themes across all arguments
 */

import React, { useState } from 'react';

import { useLegislativeBrief } from '@/features/community';

interface LegislativeBriefDisplayProps {
  billId: string;
}

export function LegislativeBriefDisplay({ billId }: LegislativeBriefDisplayProps) {
  const { data: brief, isLoading, error } = useLegislativeBrief(billId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-blue-700">Generating brief from citizen input...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Failed to load legislative brief</p>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
        <p>No citizen input yet on this bill</p>
      </div>
    );
  }

  const total = brief.supportCount + brief.opposeCount + brief.neutralCount;
  const supportPercent = total > 0 ? Math.round((brief.supportCount / total) * 100) : 0;
  const opposePercent = total > 0 ? Math.round((brief.opposeCount / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((brief.neutralCount / total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Citizens' Consensus Brief</h3>
          <p className="text-sm text-gray-600 mt-1">
            Synthesized from {total} citizen comments
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg p-4 border border-blue-100">
        <h4 className="font-semibold text-gray-800 mb-3">Executive Summary</h4>
        <p className="text-gray-700 leading-relaxed">
          {brief.executiveSummary}
        </p>
      </div>

      {/* Position Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-green-600">{brief.supportCount}</span>
            <span className="text-sm text-green-600 font-medium">{supportPercent}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Support</p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${supportPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-red-200">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-red-600">{brief.opposeCount}</span>
            <span className="text-sm text-red-600 font-medium">{opposePercent}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Oppose</p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full"
              style={{ width: `${opposePercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-600">{brief.neutralCount}</span>
            <span className="text-sm text-gray-600 font-medium">{neutralPercent}%</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Neutral</p>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gray-500 h-2 rounded-full"
              style={{ width: `${neutralPercent}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <>
          {/* Common Themes */}
          {brief.commonThemes && brief.commonThemes.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <h4 className="font-semibold text-gray-800 mb-3">Common Themes</h4>
              <div className="flex flex-wrap gap-2">
                {brief.commonThemes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top Supporting Arguments */}
          {brief.topSupportingArguments && brief.topSupportingArguments.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <h4 className="font-semibold text-gray-800 mb-3 text-green-700">✓ Top Supporting Arguments</h4>
              <ul className="space-y-2">
                {brief.topSupportingArguments.map((arg, idx) => (
                  <li key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-green-300">
                    {arg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Opposing Arguments */}
          {brief.topOpposingArguments && brief.topOpposingArguments.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <h4 className="font-semibold text-gray-800 mb-3 text-red-700">✗ Top Opposing Arguments</h4>
              <ul className="space-y-2">
                {brief.topOpposingArguments.map((arg, idx) => (
                  <li key={idx} className="text-sm text-gray-700 pl-4 border-l-2 border-red-300">
                    {arg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Note */}
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 text-sm text-blue-800">
            <p>
              <strong>How this brief is created:</strong> Using advanced AI analysis, citizen comments are automatically extracted 
              into structured arguments, clustered by similarity, and synthesized into this brief. This helps lawmakers understand 
              the full spectrum of citizen perspectives on this bill.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
