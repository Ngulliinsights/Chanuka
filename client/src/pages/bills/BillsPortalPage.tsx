import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Grid,
  List,
  ArrowUp,
  ArrowDown,
  Bookmark,
  Download,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  FileText
} from 'lucide-react';

import { Button } from '@client/shared/design-system';
import { Input } from '@client/shared/design-system';
import { Card, CardContent } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@client/shared/design-system';

import { useBills } from '@client/features/bills/hooks';
import { BillCard } from '@client/features/bills';
import { FilterPanel } from '@client/features/bills/ui/filter-panel';
import VirtualBillGrid from '@client/features/bills/ui/virtual-bill-grid';
import { useToast } from '@client/hooks/use-toast';
import { useDeviceInfo } from '@client/hooks/mobile/useDeviceInfo';
import { logger } from '@client/utils/logger';
import { cn } from '@client/shared/design-system/utils/cn';

import type { BillsQueryParams } from '@client/features/bills/types';

// Types for the portal
interface BillsPortalFilters extends BillsQueryParams {
  searchQuery?: string;
  sortBy?: 'date' | 'title' | 'status' | 'urgency' | 'engagement';
  sortOrder?: 'asc' | 'desc';
  viewMode?: 'grid' | 'list';
  category?: 'all' | 'urgent' | 'trending' | 'saved' | 'recent';
}

interface BillsPortalStats {
  total: number;
  active: number;
  urgent: number;
  trending: number;
  saved: number;
}

/**
 * Consolidated Bills Portal Page
 *
 * This component serves as the unified interface for all bill-related functionality,
 * consolidating the previous separate pages (bills-dashboard-page, bill-detail,
 * bill-analysis, bill-sponsorship-analysis) into a single, cohesive portal.
 *
 * Features:
 * - Unified bills list and detail views
 * - Advanced filtering and sorting
 * - Multiple view modes (grid/list)
 * - Quick access categories (urgent, trending, saved)
 * - Search functionality
 * - Export capabilities
 * - Responsive design
 */
export default function BillsPortalPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile } = useDeviceInfo();
  const { toast } = useToast();

  // Extract current filters from URL params
  const currentFilters = useMemo<BillsPortalFilters>(() => ({
    searchQuery: searchParams.get('search') || '',
    status: searchParams.get('status') || undefined,
    sortBy: (searchParams.get('sortBy') as BillsPortalFilters['sortBy']) || 'date',
    sortOrder: (searchParams.get('sortOrder') as BillsPortalFilters['sortOrder']) || 'desc',
    viewMode: (searchParams.get('view') as BillsPortalFilters['viewMode']) || 'grid',
    category: (searchParams.get('category') as BillsPortalFilters['category']) || 'all',
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || (isMobile ? '8' : '12'))
  }), [searchParams, isMobile]);

  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBills, setSelectedBills] = useState<string[]>([]);

  // Fetch bills data
  const {
    data: billsResponse,
    isLoading,
    isFetching,
    error,
    refetch
  } = useBills(currentFilters);

  const bills = useMemo(() => billsResponse?.bills || [], [billsResponse?.bills]);
  const totalBills = billsResponse?.total || 0;

  // Calculate stats
  const stats = useMemo<BillsPortalStats>(() => {
    if (!bills.length) {
      return { total: 0, active: 0, urgent: 0, trending: 0, saved: 0 };
    }

    return {
      total: totalBills,
      active: bills.filter(bill => bill.status === 'active').length,
      urgent: bills.filter(bill => bill.urgencyLevel === 'HIGH' || bill.urgencyLevel === 'URGENT').length,
      trending: bills.filter(bill => (bill as any).trending).length,
      saved: bills.filter(bill => (bill as any).saved).length
    };
  }, [bills, totalBills]);

  // Update URL params when filters change
  const updateFilters = useCallback((newFilters: Partial<BillsPortalFilters>) => {
    const updatedParams = new URLSearchParams(searchParams);

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        updatedParams.set(key, String(value));
      } else {
        updatedParams.delete(key);
      }
    });

    // Reset page when changing filters (except for page itself)
    if (!newFilters.page) {
      updatedParams.set('page', '1');
    }

    setSearchParams(updatedParams);
  }, [searchParams, setSearchParams]);

  // Event handlers
  const handleSearch = useCallback((searchQuery: string) => {
    updateFilters({ searchQuery, page: 1 });
  }, [updateFilters]);

  const handleCategoryChange = useCallback((category: BillsPortalFilters['category']) => {
    updateFilters({ category, page: 1 });
  }, [updateFilters]);

  const handleSortChange = useCallback((sortBy: BillsPortalFilters['sortBy']) => {
    updateFilters({ sortBy, page: 1 });
  }, [updateFilters]);

  const handleSortOrderToggle = useCallback(() => {
    const newOrder = currentFilters.sortOrder === 'asc' ? 'desc' : 'asc';
    updateFilters({ sortOrder: newOrder });
  }, [currentFilters.sortOrder, updateFilters]);

  const handleViewModeChange = useCallback((viewMode: BillsPortalFilters['viewMode']) => {
    updateFilters({ viewMode });
  }, [updateFilters]);

  const handleBillSelect = useCallback((billId: string) => {
    setSelectedBills(prev =>
      prev.includes(billId)
        ? prev.filter(id => id !== billId)
        : [...prev, billId]
    );
  }, []);

  const handleBillClick = useCallback((billId: string) => {
    navigate(`/bills/${billId}`);
  }, [navigate]);

  const handleExport = useCallback(() => {
    try {
      const billsToExport = selectedBills.length > 0
        ? bills.filter(bill => selectedBills.includes(bill.id || ''))
        : bills;

      if (billsToExport.length === 0) {
        toast({
          title: "No bills to export",
          description: "Select bills or apply filters to export data.",
          variant: "destructive"
        });
        return;
      }

      // Create CSV content
      const csvData = billsToExport.map(bill => ({
        'ID': bill.id || '',
        'Title': bill.title || '',
        'Status': bill.status || '',
        'Introduced': bill.introduced_date || '',
        'Sponsor': (bill as any).sponsor_name || '',
        'Description': (bill as any).description || ''
      }));

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row =>
          headers.map(header => {
            const value = String(row[header as keyof typeof row]);
            return value.includes(',') ? `"${value}"` : value;
          }).join(',')
        )
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bills-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Exported ${csvData.length} bills to CSV`
      });

      logger.info('Bills exported', { count: csvData.length });
    } catch (error) {
      logger.error('Export failed', { error });
      toast({
        title: "Export failed",
        description: "Unable to export bills. Please try again.",
        variant: "destructive"
      });
    }
  }, [bills, selectedBills, toast]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      toast({
        title: "Bills refreshed",
        description: "Latest bills data loaded successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive"
      });
    }
  }, [refetch, toast]);

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4 max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h2 className="text-lg font-semibold text-destructive mb-2">
                  Error loading bills
                </h2>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills Portal</h1>
          <p className="text-muted-foreground">
            Track, analyze, and engage with legislative bills in one unified interface
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              (isLoading || isFetching) && "animate-spin"
            )} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={bills.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {selectedBills.length > 0 && (
            <Badge variant="secondary">
              {selectedBills.length} selected
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleCategoryChange('all')}>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Bills</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleCategoryChange('urgent')}>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <div className="text-sm text-muted-foreground">Urgent</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleCategoryChange('trending')}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.trending}</div>
            <div className="text-sm text-muted-foreground">Trending</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleCategoryChange('saved')}>
          <CardContent className="p-4 text-center">
            <Bookmark className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{stats.saved}</div>
            <div className="text-sm text-muted-foreground">Saved</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bills by title, sponsor, or content..."
            value={currentFilters.searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Select value={currentFilters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="urgency">Urgency</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSortOrderToggle}
          >
            {currentFilters.sortOrder === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>

          <div className="flex border rounded-md">
            <Button
              variant={currentFilters.viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={currentFilters.viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <FilterPanel
              filters={currentFilters}
              onFiltersChange={(newFilters) => updateFilters(newFilters)}
            />
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={currentFilters.category} onValueChange={handleCategoryChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Bills</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value={currentFilters.category} className="mt-6">
          {/* Bills Display */}
          {currentFilters.viewMode === 'grid' ? (
            <VirtualBillGrid
              bills={bills}
              isLoading={isLoading}
              onBillClick={handleBillClick}
              onBillSelect={handleBillSelect}
              selectedBills={selectedBills}
            />
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading bills...</span>
                </div>
              ) : bills.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No bills found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                bills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onClick={() => handleBillClick(bill.id || '')}
                    onSelect={() => handleBillSelect(bill.id || '')}
                    isSelected={selectedBills.includes(bill.id || '')}
                    showCheckbox={true}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalBills > (currentFilters.pageSize || 12) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentFilters.page || 1) - 1) * (currentFilters.pageSize || 12) + 1} to{' '}
            {Math.min((currentFilters.page || 1) * (currentFilters.pageSize || 12), totalBills)} of{' '}
            {totalBills} bills
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={(currentFilters.page || 1) <= 1}
              onClick={() => updateFilters({ page: (currentFilters.page || 1) - 1 })}
            >
              Previous
            </Button>

            <span className="text-sm">
              Page {currentFilters.page || 1} of {Math.ceil(totalBills / (currentFilters.pageSize || 12))}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={(currentFilters.page || 1) >= Math.ceil(totalBills / (currentFilters.pageSize || 12))}
              onClick={() => updateFilters({ page: (currentFilters.page || 1) + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
