/**
 * Bills Dashboard with Enhanced Filtering and React Query Integration
 *
 * This component serves as the main interface for legislative bill tracking,
 * featuring advanced filtering, search capabilities, real-time updates, and
 * personalized user guidance. Built with performance optimization through
 * React Query for efficient data fetching and caching.
 */

import {
  AlertCircle,
  AlertTriangle,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Heart,
  LayoutGrid,
  LayoutList,
  Lightbulb,
  MessageCircle,
  RefreshCw,
  Search,
  Share2,
  Target,
  TrendingUp,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { BillStatus } from '@shared/types';

// ... (existing imports)

import { useUserPreferences } from '@client/features/users/hooks/useUserAPI';
import { copySystem } from '@client/lib/content/copy-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Input } from '@client/lib/design-system';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/lib/design-system';
import { cn } from '@client/lib/design-system/utils/cn';
import { useDeviceInfo } from '@client/lib/hooks/mobile/useDeviceInfo';
import { useToast } from '@client/lib/hooks/use-toast';
import { logger } from '@client/lib/utils/logger';
import { VirtualList } from '@client/lib/ui/virtual-list';

import { useBills } from '../hooks';
import type { Bill, BillsQueryParams } from '../types';

import { FilterPanel } from './filter-panel';
import { StatsOverview } from './stats-overview';
import VirtualBillGrid from './virtual-bill-grid';

// ============================================================================
// Type Definitions
// ============================================================================

interface BillsDashboardProps {
  className?: string;
  initialFilters?: Partial<BillsQueryParams>;
}

interface DashboardStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}

type ViewMode = 'grid' | 'list';
type SortField = NonNullable<BillsQueryParams['sortBy']>;
type SortOrder = 'asc' | 'desc';

interface ExtendedFilters extends BillsQueryParams {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

// Extended Bill type with all properties used in the component
// Extended Bill type with all properties used in the component
interface ExtendedBill extends Bill {
  description?: string;
  sponsor_name?: string;
  urgencyLevel?: string;
  viewCount?: number;
  saveCount?: number;
  commentCount?: number;
  shareCount?: number;
  // constitutionalFlags property is inherited from Bill as ConstitutionalFlag[]
  introduced_date?: string;
}

// Extended response type with pagination metadata
// Extended response type with pagination metadata (matching shared type structure via cast/interface)
import type { PaginatedBillsResponse } from '@client/lib/types/bill';

// ============================================================================
// Constants
// ============================================================================

const SEARCH_DEBOUNCE_MS = 500;
const MIN_SEARCH_LENGTH = 2;
const URGENT_BILL_DAYS_THRESHOLD = 30;
const TRENDING_PERCENTAGE = 0.15;
const DEFAULT_PAGE_SIZE_MOBILE = 8;
const DEFAULT_PAGE_SIZE_DESKTOP = 12;

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * This hook delays the updating of a value until the user has stopped changing
 * it for a specified amount of time. Think of it like waiting for someone to
 * finish typing before you start searching - you don't want to search after
 * every single keystroke, which would be inefficient and potentially overwhelming.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer that will update the debounced value after the delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up function: if the value changes before the timer completes,
    // cancel the old timer and start a new one. This ensures we only update
    // after the user has stopped typing for the full delay period.
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * This hook calculates meaningful statistics from the bills data. We memoize
 * this calculation to avoid recomputing it on every render - it only recalculates
 * when the actual bills array or total count changes. This is a performance
 * optimization that becomes important when dealing with large datasets.
 */
function useDashboardStats(bills: ExtendedBill[], totalItems: number): DashboardStats {
  return useMemo(() => {
    // Handle the empty state gracefully
    if (!bills.length) {
      return {
        totalBills: 0,
        urgentCount: 0,
        constitutionalFlags: 0,
        trendingCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const now = new Date();

    // Calculate urgency based on how recently the bill was introduced and its status.
    // Bills are considered urgent if they're active and were introduced within the
    // last 30 days, as these likely need immediate attention and action.
    const urgentCount = bills.filter(bill => {
      if (!bill.introduced_date) return false;

      const introducedDate = new Date(bill.introduced_date);
      const daysSinceIntroduction = Math.floor(
        (now.getTime() - introducedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return (bill.status === BillStatus.FIRST_READING || 
              bill.status === BillStatus.SECOND_READING || 
              bill.status === BillStatus.COMMITTEE_STAGE) && 
             daysSinceIntroduction < URGENT_BILL_DAYS_THRESHOLD;
    }).length;

    // Identify bills that might have constitutional implications by searching
    // for relevant keywords in their titles. In a production system, this would
    // ideally be a tagged field in the database for more accurate classification.
    const constitutionalFlags = bills.filter(bill => {
      const titleLower = bill.title?.toLowerCase() || '';
      return (
        titleLower.includes('constitutional') ||
        titleLower.includes('amendment') ||
        titleLower.includes('rights')
      );
    }).length;

    // Calculate trending bills. In a real system, this would be based on actual
    // engagement metrics like views, comments, or social media activity. Here we
    // use a simple percentage as a placeholder for demonstration purposes.
    const trendingCount = Math.floor(bills.length * TRENDING_PERCENTAGE);

    return {
      totalBills: totalItems,
      urgentCount,
      constitutionalFlags,
      trendingCount,
      lastUpdated: new Date().toISOString(),
    };
  }, [bills, totalItems]);
}

/**
 * This hook encapsulates all the logic needed to export bills data to a CSV file.
 * CSV export involves several steps: transforming the data into a flat structure,
 * properly escaping special characters that could break the CSV format, formatting
 * it as comma-separated values, and triggering a browser download. By putting all
 * this logic in a hook, we keep the main component clean and make this functionality
 * easily reusable across different components.
 */
function useExportBills(bills: ExtendedBill[]) {
  const { toast } = useToast();

  return useCallback(() => {
    try {
      // First, validate that we have data to export
      if (bills.length === 0) {
        toast({
          title: 'No bills to export',
          description: 'Apply filters to see bills available for export.',
          variant: 'destructive',
        });
        return;
      }

      // Transform bills into a flat structure suitable for CSV. We select only
      // the most important fields that would be useful in a spreadsheet format.
      const csvData = bills.map(bill => ({
        'Bill ID': bill.id ?? '',
        Title: bill.title ?? '',
        Status: bill.status ?? '',
        'Introduced Date': bill.introduced_date ?? '',
        Description: bill.description ?? '',
        Sponsor: bill.sponsor_name ?? '',
      }));

      // Build the CSV string with proper escaping. CSV format requires that we:
      // 1. Wrap values containing commas, newlines, or quotes in double quotes
      // 2. Escape internal quotes by doubling them ("" becomes the escape for ")
      // This prevents values from being split across columns incorrectly.
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row =>
          headers
            .map(header => {
              const value = String(row[header as keyof typeof row]);
              const needsQuotes =
                value.includes(',') || value.includes('\n') || value.includes('"');

              if (needsQuotes) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ].join('\n');

      // Create a blob (binary large object) containing our CSV data, then
      // create a temporary link element to trigger the download. We use the
      // blob approach because it works consistently across all modern browsers.
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `bills-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL to prevent memory leaks. This is important because
      // blob URLs consume memory until they're explicitly revoked or the page closes.
      URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Exported ${csvData.length} bills to CSV`,
      });

      logger.info('Bills exported successfully', {
        component: 'BillsDashboard',
        count: csvData.length,
      });
    } catch (error) {
      logger.error('Failed to export bills', {
        component: 'BillsDashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Export failed',
        description: 'Unable to export bills. Please try again.',
        variant: 'destructive',
      });
    }
  }, [bills, toast]);
}

// ============================================================================
// Main Component
// ============================================================================

export function BillsDashboard({ className, initialFilters = {} }: BillsDashboardProps) {
  const { isMobile } = useDeviceInfo();
  const { toast } = useToast();

  // Fetch user preferences using React Query, which provides automatic caching
  // and background refetching to keep user settings fresh
  const { data: userPreferences } = useUserPreferences();

  // Local UI state that doesn't need to be synced with the server
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showPersonalizedHelp, setShowPersonalizedHelp] = useState(false);

  // Mobile-specific state
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'trending' | 'saved'>('all');
  const [displayedBills, setDisplayedBills] = useState<ExtendedBill[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Debounce the search input so we don't trigger API calls on every keystroke.
  // This improves performance and reduces unnecessary server load.
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // Build the complete filter state that will be sent to the API. We separate
  // this from individual UI controls to have a single source of truth for filtering.
  const [filters, setFilters] = useState<ExtendedFilters>({
    ...initialFilters,
    searchQuery: '',
    page: 1,
    pageSize: isMobile ? DEFAULT_PAGE_SIZE_MOBILE : DEFAULT_PAGE_SIZE_DESKTOP,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // React Query hook that handles data fetching, caching, and background updates.
  // It provides loading states, error handling, and automatic refetching when
  // filters change, making our component much simpler than manual fetch logic.
  const { data: billsResponse, isLoading, isFetching, error, refetch } = useBills(filters);

  // Extract bills array from the response, with a safe fallback to empty array.
  // Using useMemo here prevents unnecessary re-renders when billsResponse object
  // reference changes but the actual bills array hasn't changed.
  const bills = useMemo(
    () => (billsResponse?.data || []) as ExtendedBill[],
    [billsResponse?.data]
  );

  // Get total count from the API response, using the correct property name
  const totalItems = billsResponse?.pagination?.total || 0;

  // Calculate dashboard statistics based on current bills data
  const stats = useDashboardStats(bills, totalItems);

  // When the debounced search value changes, update the filters and reset to
  // page 1. We only trigger this when the search is either cleared (length 0)
  // or has at least the minimum search length to avoid premature searches.
  useEffect(() => {
    if (debouncedSearch.length >= MIN_SEARCH_LENGTH || debouncedSearch.length === 0) {
      setFilters(prev => ({
        ...prev,
        searchQuery: debouncedSearch,
        page: 1,
      }));
    }
  }, [debouncedSearch]);

  // When sort settings change, reset to page 1 since the order of results
  // will be different and the user should start from the beginning
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder,
      page: 1,
    }));
  }, [sortBy, sortOrder]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle filter changes from the FilterPanel component. This function merges
   * new filters with existing ones while resetting pagination, since changing
   * filters means we're looking at a new subset of data.
   */
  const handleFiltersChange = useCallback((newFilters: Partial<BillsQueryParams>) => {
    setFilters(
      prev =>
        ({
          ...prev,
          ...newFilters,
          page: 1,
        }) as ExtendedFilters
    );
  }, []);

  /**
   * Handle saving a bill to the user's personal collection. In a full
   * implementation, this would use a React Query mutation to update the
   * server and automatically invalidate cached queries that include this bill.
   */
  const handleSave = useCallback(
    async (billId: string) => {
      try {
        const id = String(billId);
        // TODO: Implement with useSaveBill mutation hook
        // await saveBillMutation.mutateAsync(id);

        toast({
          title: 'Bill saved',
          description: 'This bill has been added to your saved list.',
        });

        logger.info('Bill saved', {
          component: 'BillsDashboard',
          billId: id,
        });
      } catch (error) {
        logger.error('Failed to save bill', {
          component: 'BillsDashboard',
          billId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        toast({
          title: 'Save failed',
          description: 'Unable to save bill. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );
  /**
   * Handle sharing a bill using the Web Share API when available (primarily on
   * mobile devices), with a clipboard fallback for desktop browsers. This provides
   * a native, platform-appropriate sharing experience for users.
   */
  const handleShare = useCallback(
    async (billId: string) => {
      try {
        const id = String(billId);
        const bill = bills.find(b => String(b.id) === id);
        if (!bill) {
          toast({
            title: 'Bill not found',
            description: 'Unable to share this bill.',
            variant: 'destructive',
          });
          return;
        }

        const shareData = {
          title: bill.title || 'Legislative Bill',
          text: bill.description || 'Check out this legislative bill',
          url: `${window.location.origin}/bills/${id}`,
        };

        // Try to use native share API first (better UX on mobile)
        if (navigator.share) {
          await navigator.share(shareData);

          toast({
            title: 'Bill shared',
            description: 'Thank you for sharing this bill!',
          });
        } else {
          // Fallback to clipboard for desktop browsers
          await navigator.clipboard.writeText(shareData.url);

          toast({
            title: 'Link copied',
            description: 'Bill link copied to clipboard!',
          });
        }

        logger.info('Bill shared', {
          component: 'BillsDashboard',
          billId,
          method: typeof navigator.share === 'function' ? 'native' : 'clipboard',
        });
      } catch (error) {
        // Only show error if it's not a user cancellation (which is expected behavior)
        if (error instanceof Error && error.name !== 'AbortError') {
          logger.error('Failed to share bill', {
            component: 'BillsDashboard',
            billId,
            error: error.message,
          });

          toast({
            title: 'Share failed',
            description: 'Unable to share bill. Please try again.',
            variant: 'destructive',
          });
        }
      }
    },
    [bills, toast]
  );

  /**
   * Navigate to the bill detail page with the comments section focused. This
   * uses a hash fragment to scroll to and focus the comments area, improving
   * the user experience by taking them directly to where they can engage.
   */
  const handleComment = useCallback((billId: string) => {
    const id = String(billId);
    window.location.href = `/bills/${id}#comments`;
  }, []);

  /**
   * Manually trigger a refetch of the bills data. React Query's refetch function
   * bypasses the cache and makes a fresh API request, useful when the user
   * wants to ensure they're seeing the most up-to-date information.
   */
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast({
        title: 'Dashboard refreshed',
        description: 'Latest bills data loaded successfully.',
      });
    } catch (error) {
      logger.error('Failed to refresh dashboard', {
        component: 'BillsDashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      toast({
        title: 'Refresh failed',
        description: 'Unable to refresh data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [refetch, toast]);

  /**
   * Handle changes to the sort field from the dropdown selector
   */
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as SortField);
  }, []);

  /**
   * Toggle between ascending and descending sort order. This provides a quick
   * way for users to reverse the current sort without going through the dropdown.
   */
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  /**
   * Handle focus on the search input for personalized help flow
   */
  const handleStartExploring = useCallback(() => {
    setShowPersonalizedHelp(false);
    // Use setTimeout to ensure the help panel has closed before focusing
    setTimeout(() => {
      const searchEl = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      searchEl?.focus();
    }, 100);
  }, []);

  // Use our custom export hook
  const handleExport = useExportBills(bills);

  // Mobile-specific bill card renderer
  const renderMobileBillCard = (bill: ExtendedBill) => (
    <Card
      key={bill.id}
      className="cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98] touch-manipulation"
      onClick={() => (window.location.href = `/bills/${bill.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">{bill.title}</CardTitle>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
              {bill.status}
            </span>
            {bill.urgencyLevel && bill.urgencyLevel !== 'LOW' && (
              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                {bill.urgencyLevel}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {bill.description || bill.title}
        </p>

        {/* Metadata row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {bill.viewCount || 0}
          </div>
          {bill.introduced_date && (
            <div className="flex items-center gap-1">
              <span>{new Date(bill.introduced_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Policy areas */}
        {bill.policyAreas && bill.policyAreas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {bill.policyAreas.slice(0, 2).map(area => (
              <span key={area} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {area}
              </span>
            ))}
            {bill.policyAreas.length > 2 && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                +{bill.policyAreas.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Action buttons with 44px minimum touch target */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                handleSave(bill.id || '');
              }}
              className="h-11 px-3 text-xs touch-manipulation"
            >
              <Heart className="h-4 w-4 mr-1" />
              {bill.saveCount || 0}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                handleComment(bill.id || '');
              }}
              className="h-11 px-3 text-xs touch-manipulation"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {bill.commentCount || 0}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              handleShare(bill.id || '');
            }}
            className="h-11 px-3 text-xs touch-manipulation"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Calculate pagination metadata for display
  const currentPage = filters.page || 1;
  const pageSize = filters.pageSize || DEFAULT_PAGE_SIZE_DESKTOP;
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasMultiplePages = totalPages > 1;

  // ============================================================================
  // Render Error State
  // ============================================================================

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4 max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <p className="text-lg font-semibold text-destructive mb-2">Error loading bills</p>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred while loading bills data'}
                </p>
              </div>
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

  // Get user level for personalized content, with a safe default
  // Note: userPreferences may be null if preferences are managed elsewhere
  const userLevel = (userPreferences && typeof userPreferences === 'object' && 'level' in userPreferences) 
    ? (userPreferences as { level?: string }).level || 'novice'
    : 'novice';
  const isNoviceUser = userLevel === 'novice';

  // Retrieve localized copy based on user level and preferences
  const billTrackingCopy = copySystem.getCopy('billTracking', {
    userLevel: userLevel as 'novice' | 'intermediate' | 'expert',
    pageType: 'feature',
    emotionalTone: 'empowering',
    contentComplexity: userLevel === 'expert' ? 'technical' : 'simple',
  });

  // ============================================================================
  // Render Main Dashboard
  // ============================================================================

  return (
    <div className={cn('container mx-auto px-4 py-6', className)}>
      {/* Header Section */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight mb-2">{billTrackingCopy.headline}</h1>
            <p className="text-muted-foreground">{billTrackingCopy.description}</p>

            {/* Personalized help prompt for novice users */}
            {isNoviceUser && !showPersonalizedHelp && (
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              aria-label="Refresh bills data"
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', (isLoading || isFetching) && 'animate-spin')}
              />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={bills.length === 0 || isLoading}
              aria-label="Export bills to CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Personalized help panel for novice users */}
        {showPersonalizedHelp && isNoviceUser && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-800 text-lg">
                  <Target className="w-5 h-5" />
                  Getting Started with Bill Tracking
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPersonalizedHelp(false)}
                  className="text-blue-600 hover:text-blue-700 h-auto p-1"
                  aria-label="Close help panel"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-blue-700">
                <p className="text-sm">
                  Start by searching for topics you care about, like healthcare, education, or
                  environmental protection. The search looks through bill titles and content to find
                  what matters to you.
                </p>
                <p className="text-sm">
                  Save bills that interest you to get updates when their status changes. You&apos;ll
                  be notified about important developments so you can stay engaged without constant
                  checking.
                </p>
                <p className="text-sm">
                  Use filters to narrow your search by status (like &quot;active&quot; or
                  &quot;passed&quot;), urgency level, or policy area. This helps you focus on the
                  bills most relevant to your interests.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={handleStartExploring}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Exploring Bills
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics overview */}
        <StatsOverview stats={stats} />

        {/* Mobile-specific tab navigation */}
        {isMobile && (
          <div className="bg-white border-b overflow-x-auto">
            <div className="flex px-4 gap-2 min-w-max">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation',
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600'
                )}
              >
                <FileText className="h-4 w-4" />
                All Bills
              </button>
              <button
                onClick={() => setActiveTab('urgent')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation',
                  activeTab === 'urgent'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600'
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                Urgent
                {stats.urgentCount > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {stats.urgentCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation',
                  activeTab === 'trending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600'
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-manipulation',
                  activeTab === 'saved'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600'
                )}
              >
                <Bookmark className="h-4 w-4" />
                Saved
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area with filter panel and bills grid */}
      <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-5')}>
        {/* Desktop filter panel - only shown on larger screens */}
        {!isMobile && (
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              resultCount={bills.length}
              totalCount={totalItems}
            />
          </div>
        )}

        {/* Bills display area */}
        <div className={cn('space-y-6', isMobile ? 'col-span-1' : 'lg:col-span-4')}>
          {/* Search and controls card */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    placeholder="Search bills by title, number, or content..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="pl-10"
                    aria-label="Search bills"
                    disabled={isLoading}
                  />
                  {searchInput.length > 0 && searchInput.length < MIN_SEARCH_LENGTH && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter at least {MIN_SEARCH_LENGTH} characters to search
                    </p>
                  )}
                </div>

                {/* Filters and view controls */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Mobile filter panel trigger */}
                    {isMobile && (
                      <FilterPanel
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        isMobile={true}
                        resultCount={bills.length}
                        totalCount={totalItems}
                      />
                    )}

                    {/* Sort selector */}
                    <Select
                      value={sortBy}
                      onValueChange={handleSortChange}
                      disabled={isLoading || bills.length === 0}
                    >
                      <SelectTrigger className="w-[140px]" aria-label="Sort by">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="urgency">Urgency</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort order toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSortOrder}
                      className="px-2"
                      disabled={isLoading || bills.length === 0}
                      aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                      title={`Currently sorting ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                    >
                      {sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* View mode toggle */}
                  <div
                    className="flex items-center gap-1 border rounded-md p-1"
                    role="group"
                    aria-label="View mode"
                  >
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-2"
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                      disabled={isLoading}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-2"
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                      disabled={isLoading}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bills display or loading/empty states */}
          {isLoading ? (
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
                <div className="text-center space-y-4 max-w-md">
                  <p className="text-lg font-medium">No bills found</p>
                  <p className="text-muted-foreground">
                    {searchInput.length >= MIN_SEARCH_LENGTH
                      ? `No bills match "${searchInput}". Try different search terms or adjust your filters.`
                      : 'Try adjusting your search criteria or filters to see available bills.'}
                  </p>
                  {(searchInput ||
                    Object.keys(filters).some(
                      key =>
                        key !== 'page' &&
                        key !== 'pageSize' &&
                        filters[key as keyof ExtendedFilters]
                    )) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchInput('');
                        setFilters({
                          page: 1,
                          pageSize: isMobile ? DEFAULT_PAGE_SIZE_MOBILE : DEFAULT_PAGE_SIZE_DESKTOP,
                          sortBy: 'date',
                          sortOrder: 'desc',
                        });
                      }}
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Bills display - mobile vs desktop */}
              {isMobile ? (
                /* Mobile bills list with virtual scrolling */
                <VirtualList
                  items={bills}
                  itemHeight={280}
                  containerHeight={800}
                  overscan={2}
                  renderItem={(bill, index) => renderMobileBillCard(bill)}
                  className="space-y-4"
                />
              ) : (
                /* Desktop bills grid with virtualization */
                <VirtualBillGrid
                  bills={bills}
                  onSave={handleSave}
                  onShare={handleShare}
                  onComment={handleComment}
                  viewMode={viewMode}
                  isLoading={isFetching}
                />
              )}

              {/* Pagination info */}
              {hasMultiplePages && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, totalItems)} of {totalItems} bills
                      </div>
                      <div className="text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
