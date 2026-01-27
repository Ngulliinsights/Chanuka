/**
 * ArgumentsTab Component
 * 
 * Displays all arguments on a bill grouped by position (support/oppose/neutral)
 * Integrates with argument-intelligence feature
 * 
 * Features:
 * - Filter by position
 * - Sort by strength/confidence
 * - Search arguments
 * - Display evidence supporting each argument
 */

import React, { useState } from 'react';

import { useArgumentsForBill } from '@/features/community';

import type { Argument, ArgumentPosition } from '@/types/domains/arguments';

interface ArgumentsTabProps {
  billId: string;
}

export function ArgumentsTab({ billId }: ArgumentsTabProps) {
  const { data: argumentsList, isLoading, error } = useArgumentsForBill(billId);
  const [positionFilter, setPositionFilter] = useState<'all' | 'support' | 'oppose' | 'neutral'>('all');
  const [sortBy, setSortBy] = useState<'strength' | 'confidence' | 'newest'>('strength');
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-gray-600">Loading arguments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Failed to load arguments</p>
      </div>
    );
  }

  if (!argumentsList || argumentsList.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>No arguments yet. Be the first to share your perspective!</p>
      </div>
    );
  }

  // Filter arguments
  let filtered = argumentsList;
  
  if (positionFilter !== 'all') {
    filtered = filtered.filter(arg => arg.position === positionFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(arg =>
      arg.argument_text?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort arguments
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'strength':
        return (b.strength_score || 0) - (a.strength_score || 0);
      case 'confidence':
        return (b.confidence_score || 0) - (a.confidence_score || 0);
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  // Count by position
  const supportCount = argumentsList.filter(a => a.position === 'support').length;
  const opposeCount = argumentsList.filter(a => a.position === 'oppose').length;
  const neutralCount = argumentsList.filter(a => a.position === 'neutral').length;
  const total = argumentsList.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{supportCount}</div>
          <div className="text-sm text-green-600">Support ({Math.round(supportCount/total*100)}%)</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{opposeCount}</div>
          <div className="text-sm text-red-600">Oppose ({Math.round(opposeCount/total*100)}%)</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-700">{neutralCount}</div>
          <div className="text-sm text-gray-600">Neutral ({Math.round(neutralCount/total*100)}%)</div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search arguments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-select" className="block text-sm font-medium text-gray-700 mb-2">Filter</label>
            <select
              id="filter-select"
              title="Filter arguments by position"
              value={positionFilter}
              onChange={(e) => {
                const value = e.target.value as 'all' | 'support' | 'oppose' | 'neutral';
                setPositionFilter(value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Positions ({argumentsList.length})</option>
              <option value="support">Support ({supportCount})</option>
              <option value="oppose">Oppose ({opposeCount})</option>
              <option value="neutral">Neutral ({neutralCount})</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              id="sort-select"
              title="Sort arguments by metric"
              value={sortBy}
              onChange={(e) => {
                const value = e.target.value as 'strength' | 'confidence' | 'newest';
                setSortBy(value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="strength">Strongest Arguments</option>
              <option value="confidence">Most Confident</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Arguments List */}
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No arguments match your filters
          </div>
        ) : (
          sorted.map((arg) => (
            <ArgumentCard key={arg.id} argument={arg} billId={billId} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * ArgumentCard Component - Displays a single argument
 */
function ArgumentCard({ argument, billId }: { argument: Argument; billId: string }) {
  const [expanded, setExpanded] = useState(false);

  const positionColors: Record<ArgumentPosition, string> = {
    support: 'bg-green-50 border-green-200',
    oppose: 'bg-red-50 border-red-200',
    neutral: 'bg-gray-50 border-gray-200',
    conditional: 'bg-blue-50 border-blue-200'
  };

  const positionBadgeColors: Record<ArgumentPosition, string> = {
    support: 'bg-green-100 text-green-800',
    oppose: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800',
    conditional: 'bg-blue-100 text-blue-800'
  };

  const positionLabel: Record<ArgumentPosition, string> = {
    support: '✓ Support',
    oppose: '✗ Oppose',
    neutral: '○ Neutral',
    conditional: '≈ Conditional'
  };

  const position: ArgumentPosition = argument.position || 'neutral';
  
  return (
    <div className={`border rounded-lg p-4 cursor-pointer transition ${positionColors[position]}`}
         onClick={() => setExpanded(!expanded)}>
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${positionBadgeColors[position]}`}>
              {positionLabel[position]}
            </span>
            <span className="text-xs text-gray-600">
              Strength: {Math.round((argument.strength_score || 0) * 100)}%
            </span>
            <span className="text-xs text-gray-600">
              Confidence: {Math.round((argument.confidence_score || 0) * 100)}%
            </span>
          </div>
          
          <p className="text-gray-800 font-medium line-clamp-2">
            {argument.argument_text}
          </p>
        </div>

        <button className="ml-4 text-gray-600 hover:text-gray-800 text-xl">
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Full Argument</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              {argument.argument_text}
            </p>
          </div>

          {argument.summary && (
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Summary</h4>
              <p className="text-gray-600 text-sm">
                {argument.summary}
              </p>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white bg-opacity-50 p-2 rounded">
                <div className="text-2xl font-bold text-gray-800">
                  {Math.round((argument.strength_score || 0) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Argument Strength</div>
              </div>
              <div className="bg-white bg-opacity-50 p-2 rounded">
                <div className="text-2xl font-bold text-gray-800">
                  {Math.round((argument.confidence_score || 0) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Confidence</div>
              </div>
            </div>
          </div>

          <button className="w-full mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition">
            Endorse This Argument
          </button>
        </div>
      )}
    </div>
  );
}
