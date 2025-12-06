/**
 * Bills Dashboard with Enhanced Filtering and Shared Module Integration
 * 
 * Optimized version with improved performance, type safety, and maintainability.
 * Features: advanced filtering, search, real-time updates, and civic utilities integration.
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
import { demoDataService, type DemoBill } from '@client/services/realistic-demo-data';
import { logger } from '@client/utils/logger';

import { FilterPanel } from './filter-panel';
import { StatsOverview } from './stats-overview';
import { BillGrid } from './virtual-bill-grid';

interface BillsDashboardProps {
  className?: string;
  initialFilters?: Partial<BillsQueryParams>;
}

interface BillsQueryParams {
  search?: string;
  status?: string;
  urgency?: string;
  policyArea?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'title' | 'urgency' | 'engagement';
  sortOrder?: 'asc' | 'desc';
}

interface DashboardStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}

// Use DemoBill as our Bill type for consistency
type Bill = DemoBill;

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Custom hook for debounced search with proper cleanup
 * This ensures we don't trigger excessive API calls while the user is typing
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value after the delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay completes
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to calculate dashboard statistics
 * Memoized to prevent recalculation on every render
 */
function useBillsStats(bills: Bill[], totalItems: number): DashboardStats {
  return useMemo(() => {
    if (!bills.length) {
      return {
        totalBills: 0,
        urgentCount: 0,
        constitutionalFlags: 0,
        trendingCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    // Calculate urgency scores and engagement summaries for all bills
    // Using shared civic utilities for consistent calculation logic
    const enrichedBills = bills.map(bill => ({
      ...bill,
      urgencyScore: ClientSharedAdapter.civic.calculateUrgencyScore({
        introducedDate: bill.introducedDate,
        status: bill.status,
        policyAreas: bill.policyAreas,
        constitutionalFlags: bill.constitutionalFlags
      }),
      engagementSummary: ClientSharedAdapter.civic.generateEngagementSummary({
        views: bill.engagement?.views ?? 0,
        comments: bill.engagement?.comments ?? 0,
        votes: (bill.engagement?.votes?.support ?? 0) + 
               (bill.engagement?.votes?.oppose ?? 0) + 
               (bill.engagement?.votes?.neutral ?? 0),
        shares: bill.engagement?.shares ?? 0
      })
    }));

    // Count bills meeting various criteria
    const urgentCount = enrichedBills.filter(bill => 
      bill.urgencyLevel === 'high' || 
      bill.urgencyLevel === 'critical' || 
      bill.urgencyScore >= 4
    ).length;

    const constitutionalFlags = bills.filter(bill => 
      bill.constitutionalFlags === true
    ).length;

    const trendingCount = enrichedBills.filter(bill => 
      bill.engagementSummary.includes('High') || 
      bill.engagementSummary.includes('Very high')
    ).length;

    return {
      totalBills: totalItems,
      urgentCount,
      constitutionalFlags,
      trendingCount,
      lastUpdated: new Date().toISOString()
    };
  }, [bills, totalItems]);
}

/**
 * Custom hook for CSV export functionality
 * Encapsulates the export logic with proper error handling
 */
function useExportBills(bills: Bill[]) {
  return useCallback(() => {
    try {
      if (bills.length === 0) {
        logger.warn('No bills to export', { component: 'BillsDashboard' });
        return;
      }

      // Transform bills data into CSV-friendly format
      const csvData = bills.map((bill) => ({
        'Bill Number': bill.billNumber ?? '',
        'Title': bill.title ?? '',
        'Status': bill.status ?? '',
        'Urgency': bill.urgencyLevel ?? '',
        'Introduced Date': bill.introducedDate ?? '',
        'Policy Areas': bill.policyAreas?.join('; ') ?? '',
        'View Count': bill.engagement?.views ?? 0,
        'Comment Count': bill.engagement?.comments ?? 0,
        'Support Votes': bill.engagement?.votes?.support ?? 0,
        'Oppose Votes': bill.engagement?.votes?.oppose ?? 0,
      }));

      // Build CSV string with proper escaping
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map((row) =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row]);
            // Escape quotes and wrap in quotes if contains comma or newline
            return value.includes(',') || value.includes('\n') || value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        ),
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `bills-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);

      logger.info('Bills exported successfully', {
        component: 'BillsDashboard',
        count: csvData.length,
      });
    } catch (error) {
      logger.error('Failed to export bills', {
        component: 'BillsDashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // In a real app, you'd show a toast notification here
      console.error('Export failed:', error);
    }
  }, [bills]);
}

// ============================================================================
// Main Component
// ============================================================================

export function BillsDashboard({ 
  className, 
  initialFilters = {} 
}: BillsDashboardProps) {
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

  // Update filters when debounced search changes
  useEffect(() => {
    if (debouncedSearch.length >= 2 || debouncedSearch.length === 0) {
      setFilters(prev => ({
        ...prev,
        search: debouncedSearch,
        offset: 0, // Reset pagination on new search
      }));
    }
  }, [debouncedSearch]);

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

  // Calculate pagination information
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 12)) + 1;
  const totalPages = Math.ceil(totalItems / (filters.limit || 12));

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
      } else {
        // Fallback to clipboard copy
        const url = `${window.location.origin}/bills/${billId}`;
        await navigator.clipboard.writeText(url);
        // TODO: Show success toast notification
        console.log('Link copied to clipboard');
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
      sortOrder: newSortOrder,
      offset: 0,
    }));
  }, [sortOrder]);

  const handleClearCache = useCallback(() => {
    // TODO: Implement actual cache clearing with query client
    logger.info('Cache clear requested', {
      component: 'BillsDashboard',
    });
    // queryClient.invalidateQueries({ queryKey: queryKeys.bills.all });
  }, []);

  // Use custom hook for export functionality
  const handleExport = useExportBills(bills);

  // ============================================================================
  // Render Error State
  // ============================================================================

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">Error loading bills</p>
              <p className="text-sm text-muted-foreground">{error}</p>
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
        <div className="flex items-center justify-between flex-wrap gap-4">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              title="Clear cache and reload data"
            >
              Clear Cache
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={loading || isFetching}
            >
              <RefreshCw 
                className={cn(
                  'h-4 w-4 mr-2', 
                  (loading || isFetching) && 'animate-spin'
                )} 
              />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={bills.length === 0 || loading}
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

      {/* Main Content Grid */}
      <div className={cn(
        'grid gap-6', 
        isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-5'
      )}>
        {/* Filter Panel - Desktop Sidebar */}
        {!isMobile && (
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={onFiltersChange}
              resultCount={bills.length}
              totalCount={totalItems}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn('space-y-6', isMobile ? 'col-span-1' : 'lg:col-span-4')}>
          {/* Search and Controls Card */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search bills by title, number, or content..."
                    value={searchInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchInput(e.target.value)
                    }
                    className="pl-10"
                    aria-label="Search bills"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Mobile Filter Button */}
                    {isMobile && (
                      <FilterPanel
                        filters={filters}
                        onFiltersChange={onFiltersChange}
                        isMobile={true}
                        resultCount={bills.length}
                        totalCount={totalItems}
                      />
                    )}

                    {/* Sort Controls */}
                    <Select 
                      value={sortBy} 
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="w-[140px]"
                      aria-label="Sort by"
                    >
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="urgency">Urgency</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                    </Select>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleSortOrder} 
                      className="px-2"
                      aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    >
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
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-2"
                      aria-label="List view"
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bills Content */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Loading bills...</p>
                </div>
              </CardContent>
            </Card>
          ) : bills.length === 0 ? (
            <Card>
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
          {totalPages > 1 && bills.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {bills.length} of {totalItems} bills
                    {hasNextPage && (
                      <span className="ml-2 text-blue-600 font-medium">
                        (More available)
                      </span>
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