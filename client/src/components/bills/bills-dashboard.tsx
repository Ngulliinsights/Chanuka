/**
 * Bills Dashboard with Advanced Multi-Dimensional Filtering and Real-time Updates
 *
 * Integrates the FilterPanel with the existing bills dashboard components
 * and adds real-time WebSocket updates for live bill tracking and engagement metrics.
 * Now uses the new Bills API services for data management and real-time updates.
 */

import { useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useBillsAPI, useInfiniteScroll } from '../../hooks/useBillsAPI';
import { FilterPanel } from './filter-panel';
import { BillGrid } from './virtual-bill-grid';
import { StatsOverview } from './stats-overview';
import { RealTimeDashboard } from '../realtime/RealTimeDashboard';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, RefreshCw, Download, ChevronUp, ChevronDown, LayoutGrid, LayoutList } from 'lucide-react';
import { cn } from '../../lib/utils';
import { logger } from '../../utils/logger';

interface BillsDashboardProps {
  className?: string;
}

export function BillsDashboard({ className }: BillsDashboardProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Local state for search input and view preferences
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'urgency' | 'engagement'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bills API integration with real-time updates and infinite scroll
  const {
    bills,
    stats,
    loading,
    error,
    loadBills,
    searchBills,
    refreshData,
    recordEngagement,
  } = useBillsAPI({
    enableRealTime: true,
    enablePagination: true,
    enableCaching: true,
    onLoadComplete: (loadedBills: any[]) => {
      logger.info('Bills loaded in dashboard', {
        component: 'BillsDashboard',
        count: loadedBills.length,
      });
    },
  });

  // Derived state for filtering and pagination
  const filteredBills = bills; // TODO: Implement client-side filtering if needed
  const paginatedBills = bills; // TODO: Implement client-side pagination if needed
  const hasNextPage = false; // TODO: Implement pagination state
  const isLoadingMore = false; // TODO: Implement loading more state
  const currentPage = 1; // TODO: Implement current page state
  const totalPages = 1; // TODO: Implement total pages calculation
  const totalItems = bills.length;

  // Infinite scroll integration
  const { isLoadingMore: infiniteScrollLoading } = useInfiniteScroll(0.8);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        searchBills({ query: searchInput });
      } else {
        loadBills();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchBills, loadBills]);

  // Handle bill engagement actions
  const handleSave = useCallback(
    async (billId: number) => {
      try {
        await recordEngagement(billId, 'save');
        logger.info('Bill saved', {
          component: 'BillsDashboard',
          billId,
        });
      } catch (error) {
        logger.error('Failed to save bill', {
          component: 'BillsDashboard',
          billId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [recordEngagement]
  );

  const handleShare = useCallback(
    async (billId: number) => {
      try {
        await recordEngagement(billId, 'share');

        // Implement actual sharing logic
        if (navigator.share) {
          const bill = bills.find(b => b.id === billId);
          if (bill) {
            await navigator.share({
              title: bill.title,
              text: bill.summary,
              url: `${window.location.origin}/bills/${billId}`,
            });
          }
        } else {
          // Fallback: copy to clipboard
          const url = `${window.location.origin}/bills/${billId}`;
          await navigator.clipboard.writeText(url);
          // TODO: Show toast notification
        }

        logger.info('Bill shared', {
          component: 'BillsDashboard',
          billId,
        });
      } catch (error) {
        logger.error('Failed to share bill', {
          component: 'BillsDashboard',
          billId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [recordEngagement, bills]
  );

  const handleComment = useCallback((billId: number) => {
    // Navigate to bill detail page with comment section focused
    window.location.href = `/bills/${billId}#comments`;
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshData();
      logger.info('Dashboard data refreshed', {
        component: 'BillsDashboard',
      });
    } catch (error) {
      logger.error('Failed to refresh dashboard data', {
        component: 'BillsDashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [refreshData]);

  const handleExport = useCallback(() => {
    try {
      // Create CSV data from filtered bills
      const csvData = filteredBills.map((bill: any) => ({
        'Bill Number': bill.billNumber,
        Title: bill.title,
        Status: bill.status,
        Urgency: bill.urgencyLevel,
        'Introduced Date': bill.introducedDate,
        'Policy Areas': bill.policyAreas?.join('; ') || '',
        'View Count': bill.viewCount || 0,
        'Comment Count': bill.commentCount || 0,
      }));

      // Convert to CSV string
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map((row: any) =>
          headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
        ),
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bills-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logger.info('Bills exported to CSV', {
        component: 'BillsDashboard',
        count: csvData.length,
      });
    } catch (error) {
      logger.error('Failed to export bills', {
        component: 'BillsDashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [filteredBills]);

  const handleSortChange = useCallback(
    (newSortBy: string) => {
      const sortField = newSortBy as 'date' | 'title' | 'urgency' | 'engagement';
      setSortBy(sortField);

      // Trigger new search with updated sorting
      const searchParams = {
        query: searchInput,
        sortBy: sortField,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      if (searchInput.trim()) {
        searchBills(searchParams);
      } else {
        loadBills(searchParams);
      }
    },
    [searchInput, sortOrder, searchBills, loadBills]
  );

  const toggleSortOrder = useCallback(() => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);

    // Trigger new search with updated sorting
    const searchParams = {
      query: searchInput,
      sortBy,
      sortOrder: newSortOrder as 'asc' | 'desc',
    };

    if (searchInput.trim()) {
      searchBills(searchParams);
    } else {
      loadBills(searchParams);
    }
  }, [sortOrder, searchInput, sortBy, searchBills, loadBills]);


  const handleClearCache = useCallback(() => {
    // TODO: Implement cache clearing
    logger.info('Cache cleared from dashboard', {
      component: 'BillsDashboard',
    });
  }, []);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="chanuka-card">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading bills: {error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('container mx-auto px-4 py-6', className)}>
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bills Dashboard</h1>
            <p className="text-muted-foreground">
              Discover and track legislative bills with advanced filtering and real-time updates
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Cache stats and controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              title="Clear cache and reload data"
            >
              Clear Cache
            </Button>

            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredBills.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview stats={stats} />
      </div>

      {/* Main Content */}
      <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-5')}>
        {/* Filter Panel - Desktop Sidebar */}
        {!isMobile && (
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <FilterPanel
                resultCount={filteredBills.length}
                totalCount={totalItems}
              />

              {/* Real-time Dashboard - Desktop Sidebar */}
              <RealTimeDashboard
                className="sticky top-4"
                showNotifications={true}
                showEngagementMetrics={true}
                showRecentActivity={true}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn('space-y-6', isMobile ? 'col-span-1' : 'lg:col-span-4')}>
          {/* Real-time Dashboard - Mobile */}
          {isMobile && (
            <RealTimeDashboard
              showNotifications={true}
              showEngagementMetrics={false}
              showRecentActivity={false}
            />
          )}
          {/* Search and Controls */}
          <Card className="chanuka-card">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search bills by title, number, or content..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {/* Mobile Filter Button */}
                    {isMobile && (
                      <FilterPanel
                        isMobile={true}
                        resultCount={filteredBills.length}
                        totalCount={totalItems}
                      />
                    )}

                    {/* Sort Controls */}
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="urgency">Urgency</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={toggleSortOrder} className="px-2">
                      {sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-2"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-2"
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bills Grid */}
          {loading ? (
            <Card className="chanuka-card">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Loading bills...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredBills.length === 0 ? (
            <Card className="chanuka-card">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <p className="text-lg font-medium">No bills found</p>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div data-infinite-scroll>
              <BillGrid
                bills={paginatedBills}
                onSave={handleSave}
                onShare={handleShare}
                onComment={handleComment}
                savedBills={new Set()} // TODO: Implement saved bills tracking
                viewMode={viewMode}
              />

              {/* Infinite scroll loading indicator */}
              {(isLoadingMore || infiniteScrollLoading) && (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading more bills...</span>
                </div>
              )}
            </div>
          )}

          {/* Pagination Info */}
          {totalPages > 1 && (
            <Card className="chanuka-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {paginatedBills.length} of {totalItems} bills
                    {hasNextPage && (
                      <span className="ml-2 text-blue-600">(Scroll down for more)</span>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
