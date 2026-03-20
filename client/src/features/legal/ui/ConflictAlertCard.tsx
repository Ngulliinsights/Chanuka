/**
 * ConflictAlertCard Component
 * 
 * Displays a constitutional conflict in a compact alert format
 * Used in bill listings and dashboards to show high-level conflict information
 */

import React, { useState } from 'react';

export interface ConstitutionalConflict {
  id: string;
  analysis_id: string;
  bill_id: string;
  constitutional_provision: string;
  bill_language: string;
  conflict_description: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  suggested_amendment?: string;
  created_at: string;
}

interface ConflictAlertCardProps {
  conflict: ConstitutionalConflict;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export function ConflictAlertCard({ conflict, expanded = false, onExpandChange }: ConflictAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpandChange?.(newState);
  };

  const severityConfig = {
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-800',
      icon: '🔴'
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-800',
      icon: '🟠'
    },
    moderate: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: '🟡'
    },
    low: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-800',
      icon: '🟢'
    }
  };

  const config = severityConfig[conflict.severity];

  return (
    <div className={`border rounded-lg transition-all ${config.bg} ${config.border} border-l-4`}>
      <button
        onClick={handleToggle}
        className="w-full text-left p-4 hover:opacity-90 transition"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{config.icon}</span>
              <h4 className={`font-semibold ${config.text} truncate`}>
                {conflict.constitutional_provision}
              </h4>
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${config.badge}`}>
                {conflict.severity.toUpperCase()}
              </span>
            </div>
            <p className={`text-sm ${config.text} opacity-90 line-clamp-2`}>
              {conflict.conflict_description}
            </p>
          </div>
          <div className="flex-shrink-0 pt-1">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className={`border-t ${config.border} p-4 space-y-3`}>
          {/* Conflicting Language */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Bill Language</h5>
            <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 border border-gray-200 max-h-32 overflow-y-auto">
              {conflict.bill_language}
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">Conflict Analysis</h5>
            <p className="text-sm text-gray-700 leading-relaxed">
              {conflict.conflict_description}
            </p>
          </div>

          {/* Suggested Amendment */}
          {conflict.suggested_amendment && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h5 className="text-sm font-semibold text-blue-900 mb-2">Suggested Amendment</h5>
              <p className="text-sm text-blue-800">{conflict.suggested_amendment}</p>
            </div>
          )}

          {/* Meta Information */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs text-gray-600">
            <span>Constitutional Provision: {conflict.constitutional_provision}</span>
            <span>{new Date(conflict.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ConflictAlertGrid Component
 * 
 * Displays multiple conflicts in a grid/list format
 */
interface ConflictAlertGridProps {
  conflicts: ConstitutionalConflict[];
  maxVisible?: number;
  onConflictClick?: (conflict: ConstitutionalConflict) => void;
}

export function ConflictAlertGrid({ conflicts, maxVisible = 5, onConflictClick }: ConflictAlertGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const visibleConflicts = conflicts.slice(0, maxVisible);
  const hiddenCount = Math.max(0, conflicts.length - maxVisible);

  return (
    <div className="space-y-3">
      {visibleConflicts.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <p>No constitutional conflicts identified</p>
        </div>
      ) : (
        <>
          {visibleConflicts.map(conflict => (
            <ConflictAlertCard
              key={conflict.id}
              conflict={conflict}
              expanded={expandedId === conflict.id}
              onExpandChange={expanded => {
                setExpandedId(expanded ? conflict.id : null);
                onConflictClick?.(conflict);
              }}
            />
          ))}
          {hiddenCount > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                <strong>{hiddenCount}</strong> more conflict{hiddenCount !== 1 ? 's' : ''} identified
              </p>
              <p className="text-xs text-gray-500 mt-1">View legal analysis for complete details</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ConflictSummary Component
 * 
 * Shows high-level conflict summary metrics
 */
interface ConflictSummaryProps {
  totalConflicts: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
}

export function ConflictSummary({
  totalConflicts,
  criticalCount,
  highCount,
  moderateCount,
  lowCount
}: ConflictSummaryProps) {
  const severities = [
    { level: 'critical', count: criticalCount, color: 'text-red-600', bg: 'bg-red-50' },
    { level: 'high', count: highCount, color: 'text-orange-600', bg: 'bg-orange-50' },
    { level: 'moderate', count: moderateCount, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { level: 'low', count: lowCount, color: 'text-green-600', bg: 'bg-green-50' }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-800 mb-3">Constitutional Conflicts Summary</h4>
      
      {totalConflicts === 0 ? (
        <div className="text-center py-6">
          <p className="text-green-600 font-medium">✓ No conflicts identified</p>
        </div>
      ) : (
        <div className="space-y-2">
          {severities.map(severity => (
            <div key={severity.level} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${severity.color}`} />
                <span className="text-sm capitalize text-gray-700">{severity.level}</span>
              </div>
              <div className={`px-2 py-1 rounded ${severity.bg}`}>
                <span className={`text-sm font-semibold ${severity.color}`}>
                  {severity.count}
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Total</span>
              <span className="text-lg font-bold text-gray-900">{totalConflicts}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
