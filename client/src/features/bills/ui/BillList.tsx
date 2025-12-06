import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@client/components/ui/button';
import { BillCard } from './BillCard';
import { Loader2, AlertCircle, Filter, LayoutGrid, LayoutList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@client/components/ui/card';
import { Badge } from '@client/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@client/components/ui/dropdown-menu';
import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';
import type { Bill, BillsQueryParams } from '@client/features/bills/model/types';

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

export const BillList = ({
  bills,
  isLoading,
  error,
  title = "Bills",
  onLoadMore,
  hasMore = false,
  filters = {},
  onFiltersChange,
  showPagination = false,
  itemsPerPage = 10,
  onSave,
  onShare,
  onComment,
  savedBills = new Set()
}: BillListProps) => {
  const [localFilter, setLocalFilter] = useState<'introduced' | 'committee' | 'passed' | 'all'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'card' | 'list'>('list');

  // Memoize filtered bills for local filtering when no external filter handler
  const filteredBills = useMemo(() => {
    if (onFiltersChange) {
      // Use external filtering
      return bills;
    }
    
    // Use local filtering
    if (localFilter === 'all') return bills;
    return bills.filter(bill => 
      bill.status.toLowerCase() === localFilter.toLowerCase() ||
      (localFilter === 'introduced' && bill.status.toLowerCase() === 'active') ||
      (localFilter === 'committee' && bill.status.toLowerCase() === 'upcoming')
    );
  }, [bills, localFilter, onFiltersChange]);

  // Memoize paginated bills for local pagination
  const paginatedBills = useMemo(() => {
    if (!showPagination) return filteredBills;
    return filteredBills.slice(0, page * itemsPerPage);
  }, [filteredBills, page, itemsPerPage, showPagination]);

  const hasMoreLocal = showPagination && paginatedBills.length < filteredBills.length;

  // Memoize status styles to avoid recreating the object on every render
  const getStatusStyle = useMemo(() => (status: string) => {
    switch(status.toLowerCase()) {
      case 'introduced':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'committee':
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'passed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'signed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'vetoed':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }, []);

  // Helper function to format numbers with proper pluralization
  const formatCount = (count: number, singular: string, plural: string = singular + 's') => {
    return `${count} ${count === 1 ? singular : plural}`;
  };

  // Reset page when filter changes to avoid showing empty results
  const handleLocalFilterChange = (newFilter: 'introduced' | 'committee' | 'passed' | 'all') => {
    setLocalFilter(newFilter);
    setPage(1);
  };

  // Handle external filter changes
  const handleExternalFilterChange = (status: string[]) => {
    if (onFiltersChange) {
      onFiltersChange({ ...filters, status });
    }
  };

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

  const displayBills = showPagination ? paginatedBills : filteredBills;
  const currentHasMore = showPagination ? hasMoreLocal : hasMore;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Displaying {formatCount(displayBills.length, 'bill')}
            {onFiltersChange ? '' : ` of ${formatCount(filteredBills.length, `${localFilter === 'all' ? '' : localFilter + ' '}bill`)}`}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-end">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('card')}
              className="px-2"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="px-2"
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Controls */}
          {onFiltersChange ? (
            // External filter management
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
                <DropdownMenuItem onClick={() => onFiltersChange({})}>
                  Clear Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Local filter management
            <>
              {/* Desktop filter buttons */}
              <div className="hidden md:flex rounded-md shadow-sm" role="group" aria-label="Filter bills by status">
                <Button
                  variant={localFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-l-md rounded-r-none border-r-0"
                  onClick={() => handleLocalFilterChange('all')}
                  aria-pressed={localFilter === 'all'}
                >
                  All
                </Button>
                <Button
                  variant={localFilter === 'introduced' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-none border-r-0"
                  onClick={() => handleLocalFilterChange('introduced')}
                  aria-pressed={localFilter === 'introduced'}
                >
                  Introduced
                </Button>
                <Button
                  variant={localFilter === 'committee' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-none border-r-0"
                  onClick={() => handleLocalFilterChange('committee')}
                  aria-pressed={localFilter === 'committee'}
                >
                  Committee
                </Button>
                <Button
                  variant={localFilter === 'passed' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-r-md rounded-l-none"
                  onClick={() => handleLocalFilterChange('passed')}
                  aria-pressed={localFilter === 'passed'}
                >
                  Passed
                </Button>
              </div>

              {/* Mobile dropdown filter */}
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

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p>Loading bills...</p>
          </div>
        ) : displayBills.length > 0 ? (
          <>
            {view === 'card' ? (
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
                            {new Date(bill.introduced_date).toLocaleDateString()}
                          </div>
                        </div>
                        <CardTitle className="text-xl mt-2 text-primary-700 group-hover:text-primary-800 transition-colors">
                          {bill.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {bill.summary}
                        </CardDescription>
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

            {currentHasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={showPagination ? () => setPage(prev => prev + 1) : onLoadMore}
                  className="min-w-[150px]"
                >
                  Load More Bills
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-gray-500 mb-2">
              No {onFiltersChange ? '' : (localFilter === 'all' ? '' : localFilter + ' ')}bills found
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onFiltersChange) {
                  onFiltersChange({});
                } else {
                  handleLocalFilterChange('all');
                }
              }}
            >
              {onFiltersChange ? 'Clear Filters' : 'Show All Bills'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

