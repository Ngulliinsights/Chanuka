/**
 * Argument Filters Component
 * 
 * Provides filtering and search capabilities for arguments.
 */

import React, { useState } from 'react';
import type { ArgumentFilters as Filters } from '../types';

interface ArgumentFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
  onSearch: (query: string) => void;
  className?: string;
}

export function ArgumentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  onSearch,
  className = '',
}: ArgumentFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters & Search</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search arguments..."
            className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            🔍
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {/* Position Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Position
          </label>
          <div className="flex gap-2">
            {['support', 'oppose', 'neutral'].map((position) => (
              <button
                key={position}
                onClick={() => onFiltersChange({ position: filters.position === position ? undefined : position as any })}
                className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-colors
                  ${filters.position === position
                    ? position === 'support'
                      ? 'bg-green-500 text-white'
                      : position === 'oppose'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {position === 'support' ? '👍' : position === 'oppose' ? '👎' : '🤔'}{' '}
                {position.charAt(0).toUpperCase() + position.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Argument Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Argument Type
          </label>
          <select
            value={filters.argumentType || ''}
            onChange={(e) => onFiltersChange({ argumentType: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="evidence-based">Evidence-Based</option>
            <option value="normative">Normative</option>
            <option value="causal">Causal</option>
            <option value="comparative">Comparative</option>
          </select>
        </div>

        {/* Confidence Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Confidence: {filters.minConfidence !== undefined ? `${(filters.minConfidence * 100).toFixed(0)}%` : 'Any'}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={filters.minConfidence !== undefined ? filters.minConfidence * 100 : 0}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              onFiltersChange({ minConfidence: value > 0 ? value / 100 : undefined });
            }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Strength Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Strength: {filters.minStrength !== undefined ? `${(filters.minStrength * 100).toFixed(0)}%` : 'Any'}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={filters.minStrength !== undefined ? filters.minStrength * 100 : 0}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              onFiltersChange({ minStrength: value > 0 ? value / 100 : undefined });
            }}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-gray-600 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {filters.position && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Position: {filters.position}
              </span>
            )}
            {filters.argumentType && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Type: {filters.argumentType}
              </span>
            )}
            {filters.minConfidence !== undefined && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Confidence ≥ {(filters.minConfidence * 100).toFixed(0)}%
              </span>
            )}
            {filters.minStrength !== undefined && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Strength ≥ {(filters.minStrength * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
