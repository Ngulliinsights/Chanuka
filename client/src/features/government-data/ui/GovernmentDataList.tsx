/**
 * Government Data List Component
 * Displays a filterable, searchable, paginated list of government data
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useDebounce } from '@client/lib/hooks/use-debounce';
import { GovernmentDataCard } from './GovernmentDataCard';
import { useGovernmentDataList, useGovernmentDataTypes, useGovernmentDataSources } from '../hooks';
import {
  GovernmentDataListProps,
  GovernmentDataFilters,
  GovernmentDataQueryOptions,
  GovernmentDataSortField,
  SortOrder,
} from '../types';

export const GovernmentDataList: React.FC<GovernmentDataListProps> = ({
  filters: externalFilters,
  onFiltersChange,
  onDataSelect,
  selectable = false,
  showActions = true,
  pageSize = 20,
}) => {
  // Local state
  const [localFilters, setLocalFilters] = useState<GovernmentDataFilters>({
    search: '',
    dataType: '',
    source: '',
    status: '',
    ...externalFilters,
  });
  const [sortField, setSortField] = useState<GovernmentDataSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search to avoid excessive API calls

  // Build query options
  const queryOptions: GovernmentDataQueryOptions = useMemo(
    () => ({
      dataType: localFilters.dataType || undefined,
      source: localFilters.source || undefined,
      status: localFilters.status || undefined,
      dateFrom: localFilters.dateRange?.from,
      dateTo: localFilters.dateRange?.to,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      sortBy: sortField,
      sortOrder,
    }),
    [localFilters, sortField, sortOrder, currentPage, pageSize]
  );

  // Fetch data
  const { data: listResponse, isLoading, error, refetch } = useGovernmentDataList(queryOptions);

  const { data: dataTypesResponse } = useGovernmentDataTypes();
  const { data: sourcesResponse } = useGovernmentDataSources();

  // Handle filter changes
  const handleFiltersChange = (newFilters: Partial<GovernmentDataFilters>) => {
    const updatedFilters = { ...localFilters, ...newFilters };
    setLocalFilters(updatedFilters);
    setCurrentPage(1); // Reset to first page when filters change
    onFiltersChange?.(updatedFilters);
  };

  // Handle sorting
  const handleSort = (field: GovernmentDataSortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters: GovernmentDataFilters = {
      search: '',
      dataType: '',
      source: '',
      status: '',
    };
    setLocalFilters(clearedFilters);
    setCurrentPage(1);
    onFiltersChange?.(clearedFilters);
  };

  // Get available options
  const dataTypes = dataTypesResponse?.data || [];
  const sources = sourcesResponse?.data || [];
  const statuses = ['active', 'inactive', 'draft', 'archived', 'pending'];

  // Calculate pagination info
  const totalItems = listResponse?.pagination?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = listResponse?.pagination?.hasMore || false;
  const hasPrevPage = currentPage > 1;

  // Active filters count
  const activeFiltersCount = [
    localFilters.dataType,
    localFilters.source,
    localFilters.status,
    localFilters.dateRange,
  ].filter(Boolean).length;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load government data</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Government Data</h2>
          <p className="text-gray-600">{totalItems} records found</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Data
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search government data..."
                  value={localFilters.search || ''}
                  onChange={e => handleFiltersChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <Select
                  value={localFilters.dataType || ''}
                  onValueChange={value => handleFiltersChange({ dataType: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {dataTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={localFilters.source || ''}
                  onValueChange={value => handleFiltersChange({ source: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sources</SelectItem>
                    {sources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={localFilters.status || ''}
                  onValueChange={value => handleFiltersChange({ status: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sort by:</span>
        {(['created_at', 'updated_at', 'data_type', 'source'] as GovernmentDataSortField[]).map(
          field => (
            <Button
              key={field}
              variant={sortField === field ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort(field)}
              className="capitalize"
            >
              {field.replace('_', ' ')}
              {sortField === field &&
                (sortOrder === 'asc' ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </Button>
          )
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading government data...</span>
        </div>
      )}

      {/* Data List */}
      {!isLoading && listResponse?.data && (
        <>
          {listResponse.data.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500 mb-4">No government data found</p>
                <p className="text-sm text-gray-400">
                  Try adjusting your search criteria or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {listResponse.data.map(data => (
                <GovernmentDataCard
                  key={data.id}
                  data={data}
                  onView={onDataSelect}
                  showActions={showActions}
                  compact={false}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant={currentPage === totalPages ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
