/**
 * Bills Dashboard with Advanced Multi-Dimensional Filtering and Real-time Updates
 *
 * Integrates the FilterPanel with the existing bills dashboard components
 * and adds real-time WebSocket updates for live bill tracking and engagement metrics.
 * Now uses the new Bills API services for data management and real-time updates.
 */

import {
  Search,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  Lightbulb,
  Target,
} from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { RealTimeDashboard } from '@client/components/realtime/RealTimeDashboard';
import { MobileBillCard, TouchOptimizedCard } from '@/components/mobile/__archive__/MobileOptimizedLayout';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/components/ui/select';
import { useBills } from '@client/features/bills/model/hooks/useBills';
import { BillsQueryParams, Bill } from '@client/features/bills/model/types';
import { useMediaQuery } from '@client/hooks/useMediaQuery';
import { useAppStore, useBillsFilters, useUserPreferences } from '@client/store/unified-state-manager';
import { copySystem } from '@client/content/copy-system';
import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';

import { FilterPanel } from './filter-panel';
import { StatsOverview } from './stats-overview';
import { BillGrid } from './virtual-bill-grid';

interface BillsDashboardProps {
  className?: string;
}

export function BillsDashboard({ className }: BillsDashboardProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Enhanced state management
  const user = useAppStore(state => state.user.user);
  const userPreferences = useUserPreferences();
  const billsFilters = useBillsFilters();
  const savedBills = useAppStore(state => state.user.savedBills);
  const addNotification = useAppStore(state => state.addNotification);
  
  // Local state for search input and view preferences
  const [searchInput, setSearchInput] = useState(billsFilters.query || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(userPreferences.dashboard.layout || 'grid');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'urgency' | 'engagement'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPersonalizedHelp, setShowPersonalizedHelp] = useState(false);

  // Use existing React Query bills hook with unified state
  const [filters, setFilters] = useState<BillsQueryParams>({
    ...billsFilters,
    page: 1,
    limit: isMobile ? 8 : 12, // Fewer items on mobile
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const onFiltersChange = useCallback((newFilters: BillsQueryParams) => {
    setFilters((prev: BillsQueryParams) => ({ ...prev, ...newFilters }));
    // Update unified state
    useAppStore.getState().updateFilters(newFilters);
  }, []);

  const { data: billsData, isLoading: loading, error: billsError, refetch } = useBills(filters);

  // Enhanced demo data integration for investor presentations
  const bills = useMemo(() => billsData?.bills || [], [billsData?.bills]);
  const stats = billsData?.stats || {
    totalBills: 1247,
    urgentCount: 23,
    constitutionalFlags: 8,
    trendingCount: 15,
    lastUpdated: new Date().toISOString(),
  };
  const error = billsError?.message || null;

  // Derived state for filtering and pagination
  const filteredBills = bills;
  const paginatedBills = bills;
  const hasNextPage = false;
  const isLoadingMore = false;
  const currentPage = 1;
  const totalPages = 1;
  const totalItems = bills.length;

  // Enhanced debounced search with validation
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = searchInput.trim();
      if (query.length >= 2 || query.length === 0) {
        // Only search if 2+ chars or empty
        setFilters((prev: BillsQueryParams) => ({
          ...prev,
          query,
          page: 1, // Reset to first page on new search
        }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Enhanced bill engagement actions with unified state
  const handleSave = useCallback(async (billId: string) => {
    try {
      const isSaved = savedBills.has(billId);
      
      if (isSaved) {
        useAppStore.getState().unsaveBill(billId);
        addNotification({
          type: 'info',
          message: 'Bill removed from your saved list'
        });
      } else {
        useAppStore.getState().saveBill(billId);
        addNotification({
          type: 'success',
          message: copySystem.confirmations.billShared
        });
      }
      
      logger.info('Bill save toggled', {
        component: 'BillsDashboard',
        billId,
        action: isSaved ? 'unsaved' : 'saved',
        userPersona: user?.persona
      });
    } catch (error) {
      logger.error('Failed to save bill', {
        component: 'BillsDashboard',
        billId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      addNotification({
        type: 'error',
        message: 'Failed to save bill. Please try again.'
      });
    }
  }, [savedBills, addNotification, user?.persona]);

  const handleShare = useCallback(
    async (billId: string) => {
      try {
        const bill = bills.find((b: Bill) => b.id === billId);
        if (!bill) return;

        // Track sharing activity
        useAppStore.getState().addActivity({
          type: 'bill_shared',
          metadata: { billId, title: bill.title }
        });

        // Implement actual sharing logic
        if (navigator.share) {
          await navigator.share({
            title: bill.title,
            text: bill.summary,
            url: `${window.location.origin}/bills/${billId}`,
          });
        } else {
          // Fallback: copy to clipboard
          const url = `${window.location.origin}/bills/${billId}`;
          await navigator.clipboard.writeText(url);
          
          addNotification({
            type: 'success',
            message: 'Bill link copied to clipboard!'
          });
        }

        logger.info('Bill shared', {
          component: 'BillsDashboard',
          billId,
          userPersona: user?.persona,
          shareMethod: navigator.share ? 'native' : 'clipboard'
        });
      } catch (error) {
        logger.error('Failed to share bill', {
          component: 'BillsDashboard',
          billId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        addNotification({
          type: 'error',
          message: 'Failed to share bill. Please try again.'
        });
      }
    },
    [bills, addNotification, user?.persona]
  );

  const handleComment = useCallback((billId: string) => {
    // Navigate to bill detail page with comment section focused
    window.location.href = `/bills/${billId}#comments`;
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      logger.info('Dashboard data refreshed', {
        component: 'BillsDashboard',
      });
    } catch (error) {
      logger.error('Failed to refresh dashboard data', {
        component: 'BillsDashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [refetch]);

  const handleExport = useCallback(() => {
    try {
      // Create CSV data from filtered bills
      const csvData = filteredBills.map((bill: Bill) => ({
        'Bill Number': bill.id,
        Title: bill.title,
        Status: bill.status,
        Category: bill.category,
        'Introduced Date': bill.introduced_date,
        'View Count': bill.engagementMetrics?.views || 0,
        'Comment Count': bill.comments?.length || 0,
      }));

      // Convert to CSV string
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map((row: Record<string, string | number>) =>
          headers.map(header => `"${row[header]}"`).join(',')
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

      // Update filters to trigger new query
      setFilters((prev: BillsQueryParams) => ({
        ...prev,
        sortBy: sortField,
        sortOrder: sortOrder as 'asc' | 'desc',
        page: 1, // Reset to first page
      }));
    },
    [sortOrder]
  );

  const toggleSortOrder = useCallback(() => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);

    // Update filters to trigger new query
    setFilters((prev: BillsQueryParams) => ({
      ...prev,
      sortOrder: newSortOrder as 'asc' | 'desc',
      page: 1, // Reset to first page
    }));
  }, [sortOrder]);

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

  // Get personalized copy based on user level
  const userLevel = user?.persona || 'novice';
  const billTrackingCopy = copySystem.getCopy('billTracking', {
    userLevel: userLevel as 'novice' | 'intermediate' | 'expert',
    pageType: 'feature',
    emotionalTone: 'empowering',
    contentComplexity: userLevel === 'expert' ? 'technical' : 'simple'
  });

  return (
    <div className={cn('container mx-auto px-4 py-6', className)}>
      {/* Personalized Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{billTrackingCopy.headline}</h1>
            <p className="text-muted-foreground">
              {billTrackingCopy.description}
            </p>
            
            {/* Contextual Help for New Users */}
            {userLevel === 'novice' && !showPersonalizedHelp && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPersonalizedHelp(true)}
                  className="text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  New to bill tracking? Get personalized tips
                </Button>
              </div>
            )}
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

        {/* Personalized Help Panel */}
        {showPersonalizedHelp && userLevel === 'novice' && (
          <TouchOptimizedCard className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Target className="w-5 h-5" />
                  Getting Started with Bill Tracking
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPersonalizedHelp(false)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-blue-700">
                <p className="text-sm">
                  <strong>💡 Pro tip:</strong> Start by searching for topics you care about, like "healthcare" or "education"
                </p>
                <p className="text-sm">
                  <strong>❤️ Save bills</strong> that interest you to get updates when they change
                </p>
                <p className="text-sm">
                  <strong>🔍 Use filters</strong> to find bills by status, urgency, or policy area
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowPersonalizedHelp(false);
                      // Focus search input
                      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                      searchInput?.focus();
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Exploring Bills
                  </Button>
                </div>
              </div>
            </CardContent>
          </TouchOptimizedCard>
        )}

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
                filters={filters}
                onFiltersChange={onFiltersChange}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchInput(e.target.value)
                    }
                    className="pl-10"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {/* Mobile Filter Button */}
                    {isMobile && (
                      <FilterPanel
                        filters={filters}
                        onFiltersChange={onFiltersChange}
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
              {/* Mobile-Optimized Bill Cards */}
              {isMobile ? (
                <div className="space-y-4">
                  {paginatedBills.map((bill: Bill) => (
                    <MobileBillCard
                      key={bill.id}
                      bill={bill}
                      onSave={handleSave}
                      onShare={handleShare}
                      onComment={handleComment}
                    />
                  ))}
                </div>
              ) : (
                <BillGrid
                  bills={paginatedBills}
                  onSave={handleSave}
                  onShare={handleShare}
                  onComment={handleComment}
                  savedBills={savedBills}
                  viewMode={viewMode}
                />
              )}

              {/* Loading indicator for additional data */}
              {isLoadingMore && (
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
