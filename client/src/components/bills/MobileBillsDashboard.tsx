/**
 * Mobile Bills Dashboard Component
 * 
 * Enhanced mobile version of the bills dashboard with touch-optimized interactions,
 * pull-to-refresh, infinite scroll, and mobile-specific layouts.
 * 
 * Features:
 * - Touch-optimized bill cards with 44px minimum touch targets
 * - Pull-to-refresh for updating bill data
 * - Infinite scroll for loading more bills
 * - Mobile bottom sheet for filters
 * - Swipe gestures for navigation
 * - Responsive data visualizations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Filter, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  Users,
  Clock,
  Eye,
  Heart,
  Share2,
  MessageCircle
} from 'lucide-react';
import {
  MobileLayout,
  MobileContainer,
  MobileSection,
  MobileGrid,
  MobileBottomSheet,
  useBottomSheet,
  PullToRefresh,
  InfiniteScroll,
  useInfiniteScroll,
  MobileTabSelector,
  useMobileTabs,
  MobileMetricCard,
  MobileBarChart,
  type MobileTab,
  type ChartData
} from '../mobile';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { useBillsStore, useBillsSelectors } from '../../store/slices/billsSlice';

interface Bill {
  id: number;
  title: string;
  summary: string;
  status: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed' | 'vetoed';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  introducedDate: string;
  viewCount: number;
  saveCount: number;
  commentCount: number;
  shareCount: number;
  constitutionalFlags: number;
  sponsors: string[];
  policyAreas: string[];
}

const mockBills: Bill[] = [
  {
    id: 1,
    title: 'Healthcare Access Reform Act',
    summary: 'Comprehensive healthcare reform to improve access and reduce costs for all citizens.',
    status: 'committee',
    urgency: 'high',
    introducedDate: '2024-01-15',
    viewCount: 1250,
    saveCount: 89,
    commentCount: 23,
    shareCount: 45,
    constitutionalFlags: 2,
    sponsors: ['Rep. Johnson', 'Sen. Smith'],
    policyAreas: ['Healthcare', 'Social Policy'],
  },
  {
    id: 2,
    title: 'Digital Privacy Protection Bill',
    summary: 'Strengthens digital privacy rights and data protection for consumers.',
    status: 'introduced',
    urgency: 'medium',
    introducedDate: '2024-01-20',
    viewCount: 890,
    saveCount: 67,
    commentCount: 15,
    shareCount: 32,
    constitutionalFlags: 1,
    sponsors: ['Rep. Davis'],
    policyAreas: ['Technology', 'Privacy'],
  },
  // Add more mock bills as needed
];

const statusColors = {
  introduced: 'bg-blue-100 text-blue-800',
  committee: 'bg-yellow-100 text-yellow-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  signed: 'bg-green-100 text-green-800',
  vetoed: 'bg-red-100 text-red-800',
};

const urgencyColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export function MobileBillsDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mobile tabs for different views
  const tabs: MobileTab[] = [
    { id: 'all', label: 'All Bills', icon: <FileText className="h-4 w-4" /> },
    { id: 'urgent', label: 'Urgent', icon: <AlertTriangle className="h-4 w-4" />, badge: '12' },
    { id: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'saved', label: 'Saved', icon: <Heart className="h-4 w-4" /> },
  ];
  
  const { activeTab, changeTab } = useMobileTabs('all');
  const filterSheet = useBottomSheet();
  
  // Infinite scroll for bills
  const {
    items: bills,
    hasMore,
    isLoading,
    error,
    loadMore,
    reset,
    retry
  } = useInfiniteScroll<Bill>();

  // Mock data for charts
  const billStatusChart: ChartData = {
    title: 'Bills by Status',
    type: 'pie',
    data: [
      { label: 'In Committee', value: 45, color: 'bg-yellow-500' },
      { label: 'Introduced', value: 32, color: 'bg-blue-500' },
      { label: 'Passed', value: 18, color: 'bg-green-500' },
      { label: 'Failed', value: 5, color: 'bg-red-500' },
    ],
  };

  const urgencyChart: ChartData = {
    title: 'Bills by Urgency',
    type: 'bar',
    data: [
      { label: 'Critical', value: 8, color: 'bg-red-500' },
      { label: 'High', value: 23, color: 'bg-orange-500' },
      { label: 'Medium', value: 45, color: 'bg-yellow-500' },
      { label: 'Low', value: 24, color: 'bg-gray-500' },
    ],
  };

  // Load bills function
  const loadBills = useCallback(async (page: number) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pageSize = 10;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const pageBills = mockBills.slice(startIndex, endIndex);
    
    return {
      items: pageBills,
      hasMore: endIndex < mockBills.length,
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadMore(loadBills);
  }, [loadMore, loadBills]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      reset();
      await loadMore(loadBills);
    } finally {
      setIsRefreshing(false);
    }
  }, [reset, loadMore, loadBills]);

  // Handle bill card click
  const handleBillClick = useCallback((bill: Bill) => {
    navigate(`/bills/${bill.id}`);
  }, [navigate]);

  // Handle bill actions
  const handleSaveBill = useCallback((e: React.MouseEvent, billId: number) => {
    e.stopPropagation();
    console.log('Save bill:', billId);
    // TODO: Implement save functionality
  }, []);

  const handleShareBill = useCallback((e: React.MouseEvent, billId: number) => {
    e.stopPropagation();
    console.log('Share bill:', billId);
    // TODO: Implement share functionality
  }, []);

  const handleCommentBill = useCallback((e: React.MouseEvent, billId: number) => {
    e.stopPropagation();
    navigate(`/bills/${billId}/comments`);
  }, [navigate]);

  // Render bill card
  const renderBillCard = (bill: Bill, index: number) => (
    <Card 
      key={bill.id}
      className="cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]"
      onClick={() => handleBillClick(bill)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight line-clamp-2">
            {bill.title}
          </CardTitle>
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Badge className={cn('text-xs', statusColors[bill.status])}>
              {bill.status}
            </Badge>
            {bill.urgency !== 'low' && (
              <Badge className={cn('text-xs', urgencyColors[bill.urgency])}>
                {bill.urgency}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {bill.summary}
        </p>
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(bill.introducedDate).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {bill.viewCount}
          </div>
          {bill.constitutionalFlags > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              {bill.constitutionalFlags}
            </div>
          )}
        </div>
        
        {/* Policy Areas */}
        <div className="flex flex-wrap gap-1 mb-3">
          {bill.policyAreas.slice(0, 2).map((area) => (
            <Badge key={area} variant="outline" className="text-xs">
              {area}
            </Badge>
          ))}
          {bill.policyAreas.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{bill.policyAreas.length - 2}
            </Badge>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleSaveBill(e, bill.id)}
              className="h-8 px-2 text-xs"
            >
              <Heart className="h-3 w-3 mr-1" />
              {bill.saveCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleCommentBill(e, bill.id)}
              className="h-8 px-2 text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              {bill.commentCount}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleShareBill(e, bill.id)}
            className="h-8 px-2 text-xs"
          >
            <Share2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Filter content for bottom sheet
  const filterContent = (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="font-medium mb-3">Status</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(statusColors).map((status) => (
            <Button
              key={status}
              variant={selectedFilters.includes(status) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedFilters(prev => 
                  prev.includes(status) 
                    ? prev.filter(f => f !== status)
                    : [...prev, status]
                );
              }}
              className="justify-start capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Urgency</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(urgencyColors).map((urgency) => (
            <Button
              key={urgency}
              variant={selectedFilters.includes(urgency) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedFilters(prev => 
                  prev.includes(urgency) 
                    ? prev.filter(f => f !== urgency)
                    : [...prev, urgency]
                );
              }}
              className="justify-start capitalize"
            >
              {urgency}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-2 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => setSelectedFilters([])}
          className="flex-1"
        >
          Clear All
        </Button>
        <Button 
          onClick={filterSheet.close}
          className="flex-1"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );

  return (
    <MobileLayout
      showPullToRefresh={true}
      onRefresh={handleRefresh}
      showFilterButton={true}
      filterContent={filterContent}
    >
      <MobileContainer>
        {/* Search Bar */}
        <MobileSection>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bills, topics, or sponsors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base" // Larger for mobile
            />
          </div>
        </MobileSection>

        {/* Stats Overview */}
        <MobileSection title="Overview">
          <MobileGrid columns={2} gap="sm">
            <MobileMetricCard
              title="Total Bills"
              value={100}
              icon={<FileText className="h-4 w-4" />}
              change={{ value: 12, type: 'increase', period: 'this month' }}
            />
            <MobileMetricCard
              title="Urgent Bills"
              value={23}
              icon={<AlertTriangle className="h-4 w-4" />}
              change={{ value: 5, type: 'increase', period: 'this week' }}
            />
            <MobileMetricCard
              title="Community Active"
              value="2.4K"
              icon={<Users className="h-4 w-4" />}
              change={{ value: 8, type: 'increase', period: 'today' }}
            />
            <MobileMetricCard
              title="Engagement"
              value="89%"
              icon={<TrendingUp className="h-4 w-4" />}
              change={{ value: 3, type: 'increase', period: 'this week' }}
            />
          </MobileGrid>
        </MobileSection>

        {/* Charts */}
        <MobileSection title="Analytics">
          <div className="space-y-4">
            <MobileBarChart data={billStatusChart} />
            <MobileBarChart data={urgencyChart} />
          </div>
        </MobileSection>

        {/* Tab Navigation */}
        <MobileSection>
          <MobileTabSelector
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={changeTab}
            variant="pills"
          />
        </MobileSection>

        {/* Bills List */}
        <MobileSection title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Bills`}>
          <InfiniteScroll
            items={bills}
            hasMore={hasMore}
            isLoading={isLoading}
            error={error}
            onLoadMore={() => loadMore(loadBills)}
            onRetry={retry}
            renderItem={renderBillCard}
            getItemKey={(bill) => bill.id.toString()}
            containerTag="div"
            itemTag="div"
            className="space-y-4"
          />
        </MobileSection>
      </MobileContainer>
    </MobileLayout>
  );
}