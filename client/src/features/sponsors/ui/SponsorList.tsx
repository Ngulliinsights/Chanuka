/**
 * SponsorList Component
 * Displays a list of sponsors with filtering and search capabilities
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@client/lib/design-system/interactive';
import { Button } from '@client/lib/design-system/interactive';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/lib/design-system/interactive';
import { LoadingSpinner } from '@client/lib/design-system/feedback';
import { Alert, AlertDescription } from '@client/lib/design-system/feedback';
import { Search, Filter, RefreshCw, Plus } from 'lucide-react';

import { useSponsors, useParties, useConstituencies } from '../hooks';
import { SponsorCard } from './SponsorCard';
import type { Sponsor, SponsorsQueryParams } from '../types';

// ============================================================================
// Types
// ============================================================================

interface SponsorListProps {
  onSponsorSelect?: (sponsor: Sponsor) => void;
  onViewConflicts?: (sponsor: Sponsor) => void;
  onCreateSponsor?: () => void;
  showConflictIndicators?: boolean;
  initialFilters?: Partial<SponsorsQueryParams>;
}

// ============================================================================
// Component
// ============================================================================

export function SponsorList({
  onSponsorSelect,
  onViewConflicts,
  onCreateSponsor,
  showConflictIndicators = false,
  initialFilters = {},
}: SponsorListProps) {
  // State for filters and search
  const [searchQuery, setSearchQuery] = useState(initialFilters.query || '');
  const [selectedParty, setSelectedParty] = useState(initialFilters.party || '');
  const [selectedConstituency, setSelectedConstituency] = useState(initialFilters.constituency || '');
  const [activeOnly, setActiveOnly] = useState(initialFilters.is_active ?? true);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'name');
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder || 'asc');
  const [currentPage, setCurrentPage] = useState(initialFilters.page || 1);

  // Build query parameters
  const queryParams = useMemo((): SponsorsQueryParams => ({
    query: searchQuery || undefined,
    party: selectedParty || undefined,
    constituency: selectedConstituency || undefined,
    is_active: activeOnly,
    sortBy,
    sortOrder,
    page: currentPage,
    limit: 20,
  }), [searchQuery, selectedParty, selectedConstituency, activeOnly, sortBy, sortOrder, currentPage]);

  // Data fetching
  const { data: sponsorsData, isLoading, error, refetch } = useSponsors(queryParams);
  const { data: parties } = useParties();
  const { data: constituencies } = useConstituencies();

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedParty, selectedConstituency, activeOnly, sortBy, sortOrder]);

  // Event handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedParty('');
    setSelectedConstituency('');
    setActiveOnly(true);
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  // Loading state
  if (isLoading && !sponsorsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading sponsors...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load sponsors. Please try again.
          <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const sponsors = sponsorsData?.data || [];
  const hasNextPage = sponsors.length === queryParams.limit;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sponsors</h2>
          <p className="text-gray-600">
            {sponsorsData?.count || 0} sponsor{(sponsorsData?.count || 0) !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {onCreateSponsor && (
          <Button onClick={onCreateSponsor}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sponsor
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sponsors by name, party, or constituency..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Party Filter */}
          <Select value={selectedParty} onValueChange={setSelectedParty}>
            <SelectTrigger>
              <SelectValue placeholder="All parties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All parties</SelectItem>
              {parties?.map((party) => (
                <SelectItem key={party} value={party}>
                  {party}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Constituency Filter */}
          <Select value={selectedConstituency} onValueChange={setSelectedConstituency}>
            <SelectTrigger>
              <SelectValue placeholder="All constituencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All constituencies</SelectItem>
              {constituencies?.map((constituency) => (
                <SelectItem key={constituency} value={constituency}>
                  {constituency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="party">Party</SelectItem>
              <SelectItem value="transparency_score">Transparency Score</SelectItem>
              <SelectItem value="financial_exposure">Financial Exposure</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Active sponsors only
            </label>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Sponsors Grid */}
      {sponsors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No sponsors found matching your criteria.</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sponsors.map((sponsor) => (
            <SponsorCard
              key={sponsor.id}
              sponsor={sponsor}
              onViewDetails={onSponsorSelect}
              onViewConflicts={onViewConflicts}
              showConflictIndicator={showConflictIndicators}
              // TODO: Add conflict data when available
              conflictLevel="low"
              conflictCount={0}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(hasNextPage || hasPrevPage) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={!hasPrevPage || isLoading}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage}
          </span>
          
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={!hasNextPage || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default SponsorList;