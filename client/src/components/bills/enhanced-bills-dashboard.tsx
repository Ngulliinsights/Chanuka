/**
 * Enhanced Bills Dashboard with Advanced Multi-Dimensional Filtering and Real-time Updates
 *
 * Integrates the FilterPanel with the existing bills dashboard components
 * and adds real-time WebSocket updates for live bill tracking and engagement metrics.
 */

import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWebSocket } from '../../hooks/useWebSocket';
import { FilterPanel } from './filter-panel';
import { BillGrid } from './virtual-bill-grid';
import { StatsOverview } from './stats-overview';
import { RealTimeDashboard } from '../realtime/RealTimeDashboard';
import { useBillsStore, useBillsSelectors } from '../../store/slices/billsSlice';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Grid3x3, List, ArrowUpDown, RefreshCw, Download, Activity, Wifi, WifiOff, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EnhancedBillsDashboardProps {
  className?: string;
}

export function EnhancedBillsDashboard({ className }: EnhancedBillsDashboardProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    sortOrder,
    setSorting,
    viewMode,
    setViewMode,
    loading,
    error,
    setLoading,
    setError,
  } = useBillsStore();

  // WebSocket integration for real-time updates
  const {
    isConnected,
    connectionQuality,
    notifications,
    notificationCount,
    getBillUpdates,
    getEngagementMetrics
  } = useWebSocket({
    autoConnect: true,
    subscriptions: [
      { type: 'user_notifications', id: 'user' }
    ],
    handlers: {
      onBillUpdate: (update) => {
        // Handle real-time bill updates
        console.log('Bill update received:', update);
        // TODO: Update bills store with real-time data
      },
      onEngagementUpdate: (metrics) => {
        // Handle engagement metrics updates
        console.log('Engagement metrics updated:', metrics);
        // TODO: Update engagement metrics in bills store
      },
      onNotification: (notification) => {
        // Handle new notifications
        console.log('New notification:', notification);
      }
    }
  });

  const {
    paginatedBills,
    filteredBills,
    stats,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
  } = useBillsSelectors();

  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setSearchQuery]);

  const handleSave = (billId: number) => {
    console.log('Save bill:', billId);
    // TODO: Implement save functionality
  };

  const handleShare = (billId: number) => {
    console.log('Share bill:', billId);
    // TODO: Implement share functionality
  };

  const handleComment = (billId: number) => {
    console.log('Comment on bill:', billId);
    // TODO: Implement comment functionality
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // TODO: Implement data refresh
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    console.log('Export filtered bills');
    // TODO: Implement export functionality
  };

  const toggleSortOrder = () => {
    setSorting(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

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
            {/* Real-time connection status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted/50">
              {isConnected ? (
                <Wifi className={cn(
                  'h-4 w-4',
                  connectionQuality === 'excellent' ? 'text-green-500' :
                  connectionQuality === 'good' ? 'text-yellow-500' :
                  connectionQuality === 'poor' ? 'text-orange-500' : 'text-red-500'
                )} />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Notifications indicator */}
            {notificationCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">{notificationCount}</span>
              </div>
            )}

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
              <FilterPanel resultCount={filteredBills.length} totalCount={stats.totalBills} />
              
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
                        totalCount={stats.totalBills}
                      />
                    )}

                    {/* Sort Controls */}
                    <Select
                      value={sortBy}
                      onValueChange={value => setSorting(value as any, sortOrder)}
                    >
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
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
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
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-2"
                    >
                      <List className="h-4 w-4" />
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
            <BillGrid
              bills={paginatedBills}
              onSave={handleSave}
              onShare={handleShare}
              onComment={handleComment}
              savedBills={new Set()} // TODO: Implement saved bills tracking
              viewMode={viewMode}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="chanuka-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasPreviousPage}
                      onClick={() => useBillsStore.getState().setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasNextPage}
                      onClick={() => useBillsStore.getState().setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
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
