import { Loader2, AlertCircle, Filter, LayoutGrid, LayoutList } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@client/shared/lib/utils';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@client/shared/design-system';
import type { Bill, BillsQueryParams } from '@client/shared/types';

import { BillCard } from './BillCard';

interface BillListProps {
  bills: Bill[];
  isLoading: boolean;
  error: Error | null;
  title?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  filters?: BillsQueryParams;
  onFiltersChange?: (filters: BillsQueryParams) => void;
  showPagination?: boolean;
  itemsPerPage?: number;
  onSave?: (billId: string) => void;
  onShare?: (billId: string) => void;
  onComment?: (billId: string) => void;
  savedBills?: Set<string>;
}

type FilterStatus = 'introduced' | 'committee' | 'passed' | 'all';
type ViewMode = 'card' | 'list';

// Extract status badge styling logic outside component to prevent recreation
const STATUS_STYLES: Record<string, string> = {
  introduced: 'bg-green-100 text-green-800 border-green-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  committee: 'bg-blue-100 text-blue-800 border-blue-300',
  upcoming: 'bg-blue-100 text-blue-800 border-blue-300',
  passed: 'bg-purple-100 text-purple-800 border-purple-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  signed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  vetoed: 'bg-orange-100 text-orange-800 border-orange-300',
  default: 'bg-gray-100 text-gray-800 border-gray-300',
};

// Pure function for status style lookup
const getStatusStyle = (status: string): string => {
  return STATUS_STYLES[status.toLowerCase()] || STATUS_STYLES.default;
};

// Pure utility function for count formatting with pluralization
const formatCount = (count: number, singular: string, plural?: string): string => {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
};

// Pure function to check if bill matches filter criteria
const billMatchesFilter = (bill: Bill, filter: FilterStatus): boolean => {
  if (filter === 'all') return true;

  const status = bill.status.toLowerCase();
  return (
    status === filter.toLowerCase() ||
    (filter === 'introduced' && status === 'active') ||
    (filter === 'committee' && status === 'upcoming')
  );
};

export const BillList = ({
  bills,
  isLoading,
  error,
  title = 'Bills',
  onLoadMore,
  hasMore = false,
  filters = {},
  onFiltersChange,
  showPagination = false,
  itemsPerPage = 10,
  onSave,
  onShare,
  onComment,
  savedBills = new Set(),
}: BillListProps) => {
  const [localFilter, setLocalFilter] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>('list');

  // Determine if we're using external or local filtering
  const isExternalFiltering = Boolean(onFiltersChange);

  // Memoize filtered bills with optimized filtering logic
  const filteredBills = useMemo(() => {
    if (isExternalFiltering) {
      // Parent component handles filtering via API or other means
      return bills;
    }

    // Apply local client-side filtering only when needed
    if (localFilter === 'all') return bills;

    // Use the pure function for cleaner filtering
    return bills.filter(bill => billMatchesFilter(bill, localFilter));
  }, [bills, localFilter, isExternalFiltering]);

  // Memoize paginated bills to avoid recalculation on unrelated renders
  const paginatedBills = useMemo(() => {
    if (!showPagination) return filteredBills;

    const endIndex = page * itemsPerPage;
    return filteredBills.slice(0, endIndex);
  }, [filteredBills, page, itemsPerPage, showPagination]);

  // Calculate if more local content exists for pagination
  const hasMoreLocal = showPagination && paginatedBills.length < filteredBills.length;

  // Memoized callbacks prevent unnecessary child component re-renders
  const handleLocalFilterChange = useCallback((newFilter: FilterStatus) => {
    setLocalFilter(newFilter);
    setPage(1); // Reset to first page when filter changes
  }, []);

  const handleExternalFilterChange = useCallback(
    (status: string[]) => {
      if (onFiltersChange) {
        onFiltersChange({ ...filters, status });
      }
    },
    [onFiltersChange, filters]
  );

  const handleClearFilters = useCallback(() => {
    if (isExternalFiltering) {
      onFiltersChange?.({});
    } else {
      handleLocalFilterChange('all');
    }
  }, [isExternalFiltering, onFiltersChange, handleLocalFilterChange]);

  const handleLoadMore = useCallback(() => {
    if (showPagination) {
      setPage(prev => prev + 1);
    } else if (onLoadMore) {
      onLoadMore();
    }
  }, [showPagination, onLoadMore]);

  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView);
  }, []);

  // Error state with retry functionality
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <h3 className="font-semibold">Error Loading {title}</h3>
        </div>
        <p className="text-sm pl-7">{error.message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 ml-7 border-red-300 text-red-700 hover:bg-red-100"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Determine which bills to display and whether more exist
  const displayBills = showPagination ? paginatedBills : filteredBills;
  const currentHasMore = showPagination ? hasMoreLocal : hasMore;

  // Generate subtitle text showing filtered results count
  const subtitleText = isExternalFiltering
    ? formatCount(displayBills.length, 'bill')
    : `${formatCount(displayBills.length, 'bill')} of ${formatCount(
        filteredBills.length,
        `${localFilter === 'all' ? '' : localFilter + ' '}bill`
      )}`;

  return (
    <div>
      {/* Header section with title, count, view toggle, and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1">Displaying {subtitleText}</p>
        </div>

        <div className="flex items-center space-x-2 self-end">
          {/* View mode toggle between grid and list layouts */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={view === 'card' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('card')}
              className="px-2"
              aria-label="Grid view"
              aria-pressed={view === 'card'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('list')}
              className="px-2"
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter controls adapt based on filtering strategy */}
          {isExternalFiltering ? (
            // External filtering through parent component with API calls
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Filter bills">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>Filters</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExternalFilterChange(['introduced'])}>
                  Introduced Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExternalFilterChange(['committee'])}>
                  In Committee
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExternalFilterChange(['passed'])}>
                  Passed Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFiltersChange?.({})}>
                  Clear Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Local client-side filtering with responsive UI
            <>
              {/* Desktop: button group for quick filter access */}
              <div
                className="hidden md:flex rounded-md shadow-sm"
                role="group"
                aria-label="Filter bills by status"
              >
                <Button
                  variant={localFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-l-md rounded-r-none border-r-0"
                  onClick={() => handleLocalFilterChange('all')}
                  aria-pressed={localFilter === 'all'}
                >
                  All
                </Button>
                <Button
                  variant={localFilter === 'introduced' ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-none border-r-0"
                  onClick={() => handleLocalFilterChange('introduced')}
                  aria-pressed={localFilter === 'introduced'}
                >
                  Introduced
                </Button>
                <Button
                  variant={localFilter === 'committee' ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-none border-r-0"
                  onClick={() => handleLocalFilterChange('committee')}
                  aria-pressed={localFilter === 'committee'}
                >
                  Committee
                </Button>
                <Button
                  variant={localFilter === 'passed' ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-r-md rounded-l-none"
                  onClick={() => handleLocalFilterChange('passed')}
                  aria-pressed={localFilter === 'passed'}
                >
                  Passed
                </Button>
              </div>

              {/* Mobile: compact dropdown for space efficiency */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="outline" size="sm" aria-label="Filter bills">
                    <Filter className="mr-2 h-4 w-4" />
                    <span className="capitalize">Filter: {localFilter}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleLocalFilterChange('all')}>
                    All Bills
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLocalFilterChange('introduced')}>
                    Introduced Bills
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLocalFilterChange('committee')}>
                    Committee Bills
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLocalFilterChange('passed')}>
                    Passed Bills
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Main content area with loading, content, and empty states */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          // Loading state with spinner animation
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p>Loading bills...</p>
          </div>
        ) : displayBills.length > 0 ? (
          <>
            {view === 'card' ? (
              // Grid view: responsive card layout optimized for scanning
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayBills.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onSave={onSave}
                    onShare={onShare}
                    onComment={onComment}
                    isSaved={savedBills.has(bill.id)}
                    showQuickActions={!!(onSave || onShare || onComment)}
                    viewMode="grid"
                  />
                ))}
              </div>
            ) : (
              // List view: full-width cards with comprehensive details
              <div className="space-y-4">
                {displayBills.map(bill => (
                  <Link key={bill.id} to={`/bills/${bill.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <Badge className={cn(getStatusStyle(bill.status), 'capitalize')}>
                            {bill.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {new Date(bill.introducedDate).toLocaleDateString()}
                          </div>
                        </div>
                        <CardTitle className="text-xl mt-2 text-primary-700 group-hover:text-primary-800 transition-colors">
                          {bill.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">{bill.summary}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="text-sm">
                          {bill.sponsors && bill.sponsors.length > 0 && (
                            <>
                              <span className="font-medium">Sponsor:</span> {bill.sponsors[0]?.name}
                              {bill.sponsors.length > 1 && (
                                <span className="ml-1 text-muted-foreground">
                                  +{formatCount(bill.sponsors.length - 1, 'cosponsor')}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 border-t flex justify-between text-sm text-muted-foreground">
                        <div className="flex gap-4">
                          {bill.engagementMetrics && (
                            <>
                              <div className="flex items-center">
                                <span className="mr-1">🔍</span>
                                <span>{formatCount(bill.engagementMetrics.views, 'view')}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="mr-1">💬</span>
                                <span>{formatCount(bill.comments?.length || 0, 'comment')}</span>
                              </div>
                            </>
                          )}
                        </div>
                        {bill.trackingCount && (
                          <div className="flex items-center">
                            <span className="mr-1">👁️</span>
                            <span>{formatCount(bill.trackingCount, 'tracking')}</span>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Load more button appears when additional content exists */}
            {currentHasMore && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={handleLoadMore} className="min-w-[150px]">
                  Load More Bills
                </Button>
              </div>
            )}
          </>
        ) : (
          // Empty state when no bills match current filters
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-gray-500 mb-2">
              No {isExternalFiltering ? '' : localFilter === 'all' ? '' : localFilter + ' '}bills
              found
            </div>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              {isExternalFiltering ? 'Clear Filters' : 'Show All Bills'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
