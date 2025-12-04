/**
 * Filter Panel Component
 * 
 * Provides filtering options for the bills dashboard
 */

import { Filter, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { Select, SelectItem } from '@client/components/ui/select';

interface FilterPanelProps {
  filters: {
    status?: string;
    urgency?: string;
    policyArea?: string;
  };
  onFiltersChange: (filters: any) => void;
  isMobile?: boolean;
  resultCount: number;
  totalCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  isMobile = false,
  resultCount,
  totalCount,
}) => {
  const [isOpen, setIsOpen] = useState(!isMobile);

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== 'all');

  if (isMobile) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between"
        >
          <span className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters {hasActiveFilters && `(${Object.values(filters).filter(Boolean).length})`}
          </span>
        </Button>
        
        {isOpen && (
          <Card className="mt-2">
            <CardContent className="p-4">
              <FilterContent
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                resultCount={resultCount}
                totalCount={totalCount}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <FilterContent
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          resultCount={resultCount}
          totalCount={totalCount}
        />
      </CardContent>
    </Card>
  );
};

interface FilterContentProps {
  filters: any;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
  totalCount: number;
}

const FilterContent: React.FC<FilterContentProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  resultCount,
  totalCount,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Showing {resultCount} of {totalCount} bills
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <Select
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="introduced">Introduced</SelectItem>
            <SelectItem value="first_reading">First Reading</SelectItem>
            <SelectItem value="committee_review">Committee Review</SelectItem>
            <SelectItem value="second_reading">Second Reading</SelectItem>
            <SelectItem value="third_reading">Third Reading</SelectItem>
            <SelectItem value="presidential_assent">Presidential Assent</SelectItem>
            <SelectItem value="enacted">Enacted</SelectItem>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Urgency Level
          </label>
          <Select
            value={filters.urgency || 'all'}
            onChange={(e) => onFilterChange('urgency', e.target.value)}
          >
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Policy Area
          </label>
          <Select
            value={filters.policyArea || 'all'}
            onChange={(e) => onFilterChange('policyArea', e.target.value)}
          >
            <SelectItem value="all">All Areas</SelectItem>
            <SelectItem value="public_finance">Public Finance</SelectItem>
            <SelectItem value="governance">Governance</SelectItem>
            <SelectItem value="environment">Environment</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="agriculture">Agriculture</SelectItem>
            <SelectItem value="security">Security</SelectItem>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;