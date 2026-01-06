/**
 * Mobile Bill Detail Component - Optimized Version
 *
 * A mobile-first bill viewing experience with touch-optimized interactions,
 * swipe navigation, and progressive content disclosure. This component demonstrates
 * best practices for mobile web applications including proper memoization,
 * accessibility support, and performance optimization.
 */

import React from 'react';
import {
  ArrowLeft,
  Share2,
  Bell,
  Eye,
  Users,
  AlertTriangle,
  FileText,
  BarChart3,
  User,
  MessageSquare,
  Bookmark,
  Globe,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';

// Type definitions for better type safety and code documentation
interface ConstitutionalFlag {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  provision: string;
}

interface Sponsor {
  id: string;
  name: string;
  role: string;
  party: string;
  avatar?: string;
}

interface RelatedBill {
  id: number;
  title: string;
  relationship: string;
}

interface CommunityEngagement {
  supportPercentage: number;
  totalParticipants: number;
  expertAnalyses: number;
  discussions: number;
}

interface BillData {
  id: number;
  title: string;
  summary: string;
  fullText: string;
  status: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed' | 'vetoed';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  introducedDate: string;
  lastUpdated: string;
  viewCount: number;
  saveCount: number;
  commentCount: number;
  shareCount: number;
  constitutionalFlags: ConstitutionalFlag[];
  sponsors: Sponsor[];
  policyAreas: string[];
  relatedBills: RelatedBill[];
  communityEngagement: CommunityEngagement;
}

// Configuration constants - keeping these outside the component prevents recreation
const STATUS_COLORS = {
  introduced: 'bg-blue-100 text-blue-800',
  committee: 'bg-yellow-100 text-yellow-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  signed: 'bg-green-100 text-green-800',
  vetoed: 'bg-red-100 text-red-800',
} as const;

const URGENCY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
} as const;

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-800',
} as const;

// Mock data - in production this would come from a data fetching hook
const MOCK_BILL_DATA: BillData = {
  id: 1,
  title: 'Healthcare Access Reform Act',
  summary:
    'Comprehensive healthcare reform legislation aimed at improving access to healthcare services and reducing costs for all citizens. This bill introduces new provisions for universal coverage, prescription drug pricing controls, and expanded mental health services.',
  fullText:
    'SECTION 1. SHORT TITLE.\nThis Act may be cited as the "Healthcare Access Reform Act".\n\nSECTION 2. FINDINGS.\nCongress finds that...',
  status: 'committee',
  urgency: 'high',
  introducedDate: '2024-01-15',
  lastUpdated: '2024-01-22',
  viewCount: 1250,
  saveCount: 89,
  commentCount: 23,
  shareCount: 45,
  constitutionalFlags: [
    {
      id: '1',
      severity: 'medium',
      description: 'Potential commerce clause implications requiring careful constitutional review',
      provision: 'Section 3(a)',
    },
    {
      id: '2',
      severity: 'low',
      description: 'State sovereignty considerations in healthcare regulation',
      provision: 'Section 5(b)',
    },
  ],
  sponsors: [
    {
      id: '1',
      name: 'Rep. Sarah Johnson',
      role: 'Primary Sponsor',
      party: 'Democrat',
    },
    {
      id: '2',
      name: 'Sen. Michael Smith',
      role: 'Co-Sponsor',
      party: 'Republican',
    },
  ],
  policyAreas: ['Healthcare', 'Social Policy', 'Budget'],
  relatedBills: [
    { id: 2, title: 'Mental Health Parity Act', relationship: 'Related' },
    { id: 3, title: 'Prescription Drug Pricing Reform', relationship: 'Companion' },
  ],
  communityEngagement: {
    supportPercentage: 67,
    totalParticipants: 1420,
    expertAnalyses: 8,
    discussions: 23,
  },
};

// Utility function for conditional class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// Simple UI components that match the imported component API
function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn('bg-white rounded-lg border shadow-sm', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-4 pb-2">{children}</div>;
}

function CardTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn('font-semibold', className)}>{children}</h2>;
}

function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('p-4 pt-2', className)}>{children}</div>;
}

function Badge({
  children,
  className = '',
  variant = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
}) {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  const variantClasses = variant === 'outline' ? 'border' : '';
  return <span className={cn(baseClasses, variantClasses, className)}>{children}</span>;
}

function Button({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'primary';
  size?: 'default' | 'sm';
  className?: string;
  [key: string]: unknown;
}) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors';
  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';
  const variantClasses = {
    default: 'bg-primary text-white hover:bg-primary/90',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
    ghost: 'hover:bg-gray-100',
  }[variant];

  return (
    <button
      className={cn(baseClasses, sizeClasses, variantClasses, className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

function Avatar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}>
      {children}
    </div>
  );
}

function AvatarFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-700 font-medium">
      {children}
    </div>
  );
}

// Reusable metric card component for displaying statistics
function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple bar chart component for mobile visualization
function SimpleBarChart({
  data,
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Engagement Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-gray-600">{item.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full', item.color)}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple pie chart component for mobile visualization
function SimplePieChart({
  data,
}: {
  data: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Community Support</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded', item.color)} />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-sm font-semibold">{item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MobileBillDetail() {
  // State management - keeping all state at the top for clarity
  const [bill] = useState<BillData>(MOCK_BILL_DATA);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Tab configuration - memoized to prevent recreation
  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: <FileText className="h-4 w-4" /> },
      { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="h-4 w-4" /> },
      { id: 'sponsors', label: 'Sponsors', icon: <User className="h-4 w-4" /> },
      { id: 'community', label: 'Community', icon: <Users className="h-4 w-4" /> },
      { id: 'related', label: 'Related', icon: <Globe className="h-4 w-4" /> },
    ],
    []
  );

  // Chart data - memoized to prevent recalculation on every render
  const supportChartData = useMemo(
    () => [
      {
        label: 'Support',
        value: bill.communityEngagement.supportPercentage,
        color: 'bg-green-500',
      },
      {
        label: 'Oppose',
        value: 100 - bill.communityEngagement.supportPercentage,
        color: 'bg-red-500',
      },
    ],
    [bill.communityEngagement.supportPercentage]
  );

  const engagementChartData = useMemo(
    () => [
      { label: 'Views', value: bill.viewCount, color: 'bg-blue-500' },
      { label: 'Saves', value: bill.saveCount, color: 'bg-green-500' },
      { label: 'Comments', value: bill.commentCount, color: 'bg-purple-500' },
      { label: 'Shares', value: bill.shareCount, color: 'bg-orange-500' },
    ],
    [bill.viewCount, bill.saveCount, bill.commentCount, bill.shareCount]
  );

  // Navigation handlers - properly memoized with stable dependencies
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleSave = useCallback(() => {
    setIsSaved(prev => !prev);
    // In production: Make API call to persist the saved state
    console.log('Bill save toggled:', !isSaved);
  }, [isSaved]);

  const handleShare = useCallback(async () => {
    // Modern Web Share API provides native sharing on mobile devices
    if (navigator.share) {
      try {
        await navigator.share({
          title: bill.title,
          text: bill.summary,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or share failed - this is normal, no action needed
        if (error instanceof Error && error.name !== 'AbortError') {
          console.log('Share failed:', error);
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  }, [bill.title, bill.summary]);

  const handleFollow = useCallback(() => {
    setIsFollowing(prev => !prev);
    // In production: Make API call to manage notification preferences
    console.log('Bill follow toggled:', !isFollowing);
  }, [isFollowing]);

  const handleRelatedBillClick = useCallback((billId: number) => {
    // In production: Use React Router navigation
    console.log('Navigate to bill:', billId);
    window.location.hash = `#/bills/${billId}`;
  }, []);

  const handleCommentClick = useCallback(() => {
    // In production: Navigate to comments section
    console.log('Navigate to comments');
    window.location.hash = `#/bills/${bill.id}/comments`;
  }, [bill.id]);

  // Touch gesture handling for swipe navigation between tabs
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);

    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      // Swipe left - move to next tab
      setActiveTab(tabs[currentIndex + 1].id);
    } else if (isRightSwipe && currentIndex > 0) {
      // Swipe right - move to previous tab
      setActiveTab(tabs[currentIndex - 1].id);
    }

    // Reset touch tracking
    setTouchStart(0);
    setTouchEnd(0);
  }, [touchStart, touchEnd, activeTab, tabs]);

  // Tab content renderer - separated for better organization and readability
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-gray-700">{bill.summary}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Views"
                value={bill.viewCount.toLocaleString()}
                icon={<Eye className="h-5 w-5" />}
              />
              <MetricCard
                title="Saves"
                value={bill.saveCount}
                icon={<Bookmark className="h-5 w-5" />}
              />
              <MetricCard
                title="Comments"
                value={bill.commentCount}
                icon={<MessageSquare className="h-5 w-5" />}
              />
              <MetricCard
                title="Shares"
                value={bill.shareCount}
                icon={<Share2 className="h-5 w-5" />}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Policy Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {bill.policyAreas.map(area => (
                    <Badge key={area} variant="outline" className="text-sm">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {bill.constitutionalFlags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Constitutional Considerations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bill.constitutionalFlags.map(flag => (
                      <div key={flag.id} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{flag.provision}</span>
                          <Badge className={cn('text-xs', SEVERITY_COLORS[flag.severity])}>
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{flag.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'analysis':
        return (
          <div className="space-y-6">
            <SimplePieChart data={supportChartData} />
            <SimpleBarChart data={engagementChartData} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expert Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    {bill.communityEngagement.expertAnalyses} expert analyses available
                  </p>
                  <p className="text-xs mt-1">Coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'sponsors':
        return (
          <div className="space-y-4">
            {bill.sponsors.map(sponsor => (
              <Card key={sponsor.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {sponsor.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base truncate">{sponsor.name}</h3>
                      <p className="text-sm text-gray-500">{sponsor.role}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {sponsor.party}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'community':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Support"
                value={`${bill.communityEngagement.supportPercentage}%`}
                icon={<Users className="h-5 w-5" />}
              />
              <MetricCard
                title="Participants"
                value={bill.communityEngagement.totalParticipants.toLocaleString()}
                icon={<Users className="h-5 w-5" />}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Community Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-600 mb-4">
                    Join the conversation about this bill
                  </p>
                  <Button onClick={handleCommentClick} className="w-full" variant="primary">
                    View Comments ({bill.commentCount})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'related':
        return (
          <div className="space-y-4">
            {bill.relatedBills.map(relatedBill => (
              <Card
                key={relatedBill.id}
                className="cursor-pointer hover:shadow-md transition-shadow active:scale-98"
                onClick={() => handleRelatedBillClick(relatedBill.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-2 leading-snug">{relatedBill.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {relatedBill.relationship}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return null;
    }
  }, [
    activeTab,
    bill,
    supportChartData,
    engagementChartData,
    handleCommentClick,
    handleRelatedBillClick,
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header with bill information and primary actions */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        {/* Top navigation bar */}
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-10 w-10 p-0 shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base leading-tight line-clamp-1">{bill.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={cn('text-xs capitalize', STATUS_COLORS[bill.status])}>
                {bill.status}
              </Badge>
              <Badge className={cn('text-xs capitalize', URGENCY_COLORS[bill.urgency])}>
                {bill.urgency}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons - 44px minimum touch target for accessibility */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={isSaved ? 'primary' : 'outline'}
              size="sm"
              onClick={handleSave}
              className="h-11 min-w-[88px]"
              aria-label={isSaved ? 'Remove from saved' : 'Save bill'}
            >
              <Bookmark className={cn('h-4 w-4 mr-1.5', isSaved && 'fill-current')} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-11 min-w-[88px]"
              aria-label="Share bill"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          </div>

          <Button
            variant={isFollowing ? 'primary' : 'outline'}
            size="sm"
            onClick={handleFollow}
            className="h-11 min-w-[100px]"
            aria-label={isFollowing ? 'Unfollow bill' : 'Follow bill for updates'}
          >
            <Bell className={cn('h-4 w-4 mr-1.5', isFollowing && 'fill-current')} />
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="px-4 overflow-x-auto">
          <div className="flex gap-1 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                  'border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area with swipe gesture support */}
      <div
        className="p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
