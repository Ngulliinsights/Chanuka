/**
 * Mobile Bill Detail Component
 * 
 * Mobile-optimized version of the bill detail page with touch-friendly interactions,
 * swipe navigation between tabs, and responsive layouts.
 * 
 * Features:
 * - Touch-optimized tab navigation with swipe gestures
 * - Mobile-friendly layouts and typography
 * - Quick actions with 44px minimum touch targets
 * - Progressive disclosure for complex content
 * - Mobile data visualizations
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MessageCircle, 
  Bell, 
  Eye,
  Calendar,
  Users,
  AlertTriangle,
  FileText,
  BarChart3,
  User,
  Globe
} from 'lucide-react';
import {
  MobileLayout,
  MobileContainer,
  MobileSection,
  MobileTabSelector,
  useMobileTabs,
  SwipeGestures,
  MobileMetricCard,
  MobileBarChart,
  MobilePieChart,
  type MobileTab,
  type ChartData
} from '../mobile';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../../lib/utils';

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
  constitutionalFlags: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    provision: string;
  }>;
  sponsors: Array<{
    id: string;
    name: string;
    role: string;
    party: string;
    avatar?: string;
  }>;
  policyAreas: string[];
  relatedBills: Array<{
    id: number;
    title: string;
    relationship: string;
  }>;
  communityEngagement: {
    supportPercentage: number;
    totalParticipants: number;
    expertAnalyses: number;
    discussions: number;
  };
}

// Mock bill data
const mockBillData: BillData = {
  id: 1,
  title: 'Healthcare Access Reform Act',
  summary: 'Comprehensive healthcare reform legislation aimed at improving access to healthcare services and reducing costs for all citizens. This bill introduces new provisions for universal coverage, prescription drug pricing controls, and expanded mental health services.',
  fullText: 'SECTION 1. SHORT TITLE.\nThis Act may be cited as the "Healthcare Access Reform Act".\n\nSECTION 2. FINDINGS.\nCongress finds that...',
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
      description: 'Potential commerce clause implications',
      provision: 'Section 3(a)'
    },
    {
      id: '2',
      severity: 'low',
      description: 'State sovereignty considerations',
      provision: 'Section 5(b)'
    }
  ],
  sponsors: [
    {
      id: '1',
      name: 'Rep. Sarah Johnson',
      role: 'Primary Sponsor',
      party: 'Democrat',
      avatar: undefined
    },
    {
      id: '2',
      name: 'Sen. Michael Smith',
      role: 'Co-Sponsor',
      party: 'Republican',
      avatar: undefined
    }
  ],
  policyAreas: ['Healthcare', 'Social Policy', 'Budget'],
  relatedBills: [
    { id: 2, title: 'Mental Health Parity Act', relationship: 'Related' },
    { id: 3, title: 'Prescription Drug Pricing Reform', relationship: 'Companion' }
  ],
  communityEngagement: {
    supportPercentage: 67,
    totalParticipants: 1420,
    expertAnalyses: 8,
    discussions: 23
  }
};

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

export function MobileBillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill] = useState<BillData>(mockBillData);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Mobile tabs for different sections
  const tabs: MobileTab[] = [
    { id: 'overview', label: 'Overview', icon: <FileText className="h-4 w-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'sponsors', label: 'Sponsors', icon: <User className="h-4 w-4" /> },
    { id: 'community', label: 'Community', icon: <Users className="h-4 w-4" />, badge: bill.commentCount.toString() },
    { id: 'related', label: 'Related', icon: <Globe className="h-4 w-4" /> },
  ];

  const { activeTab, changeTab } = useMobileTabs('overview');

  // Handle swipe navigation between tabs
  const handleSwipeLeft = useCallback(() => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      changeTab(tabs[currentIndex + 1].id);
    }
  }, [activeTab, tabs, changeTab]);

  const handleSwipeRight = useCallback(() => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      changeTab(tabs[currentIndex - 1].id);
    }
  }, [activeTab, tabs, changeTab]);

  // Handle actions
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSave = useCallback(() => {
    setIsSaved(!isSaved);
    // TODO: Implement save functionality
  }, [isSaved]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: bill.title,
        text: bill.summary,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers without Web Share API
      navigator.clipboard.writeText(window.location.href);
    }
  }, [bill]);

  const handleFollow = useCallback(() => {
    setIsFollowing(!isFollowing);
    // TODO: Implement follow functionality
  }, [isFollowing]);

  const handleComment = useCallback(() => {
    navigate(`/bills/${id}/comments`);
  }, [navigate, id]);

  // Chart data for analysis
  const supportChart: ChartData = {
    title: 'Community Support',
    type: 'pie',
    data: [
      { label: 'Support', value: bill.communityEngagement.supportPercentage, color: 'bg-green-500' },
      { label: 'Oppose', value: 100 - bill.communityEngagement.supportPercentage, color: 'bg-red-500' },
    ],
  };

  const engagementChart: ChartData = {
    title: 'Engagement Metrics',
    type: 'bar',
    data: [
      { label: 'Views', value: bill.viewCount, color: 'bg-blue-500' },
      { label: 'Saves', value: bill.saveCount, color: 'bg-green-500' },
      { label: 'Comments', value: bill.commentCount, color: 'bg-purple-500' },
      { label: 'Shares', value: bill.shareCount, color: 'bg-orange-500' },
    ],
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Bill Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{bill.summary}</p>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MobileMetricCard
                title="Views"
                value={bill.viewCount.toLocaleString()}
                icon={<Eye className="h-4 w-4" />}
              />
              <MobileMetricCard
                title="Saves"
                value={bill.saveCount}
                icon={<Heart className="h-4 w-4" />}
              />
              <MobileMetricCard
                title="Comments"
                value={bill.commentCount}
                icon={<MessageCircle className="h-4 w-4" />}
              />
              <MobileMetricCard
                title="Shares"
                value={bill.shareCount}
                icon={<Share2 className="h-4 w-4" />}
              />
            </div>

            {/* Policy Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Policy Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {bill.policyAreas.map((area) => (
                    <Badge key={area} variant="outline">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Constitutional Flags */}
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
                    {bill.constitutionalFlags.map((flag) => (
                      <div key={flag.id} className="p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{flag.provision}</span>
                          <Badge 
                            className={cn(
                              'text-xs',
                              flag.severity === 'critical' && 'bg-red-100 text-red-800',
                              flag.severity === 'high' && 'bg-orange-100 text-orange-800',
                              flag.severity === 'medium' && 'bg-yellow-100 text-yellow-800',
                              flag.severity === 'low' && 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {flag.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{flag.description}</p>
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
            <MobilePieChart data={supportChart} />
            <MobileBarChart data={engagementChart} />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expert Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Expert analyses will appear here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'sponsors':
        return (
          <div className="space-y-4">
            {bill.sponsors.map((sponsor) => (
              <Card key={sponsor.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={sponsor.avatar} alt={sponsor.name} />
                      <AvatarFallback>
                        {sponsor.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{sponsor.name}</h3>
                      <p className="text-sm text-muted-foreground">{sponsor.role}</p>
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
            {/* Community Stats */}
            <div className="grid grid-cols-2 gap-3">
              <MobileMetricCard
                title="Support"
                value={`${bill.communityEngagement.supportPercentage}%`}
                icon={<Heart className="h-4 w-4" />}
              />
              <MobileMetricCard
                title="Participants"
                value={bill.communityEngagement.totalParticipants.toLocaleString()}
                icon={<Users className="h-4 w-4" />}
              />
            </div>

            {/* Discussion Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Community Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-4">Join the conversation about this bill</p>
                  <Button onClick={handleComment} className="w-full">
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
            {bill.relatedBills.map((relatedBill) => (
              <Card key={relatedBill.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {relatedBill.title}
                      </h3>
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
  };

  return (
    <MobileLayout>
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-10 w-10 p-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base line-clamp-1">{bill.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn('text-xs', statusColors[bill.status])}>
                {bill.status}
              </Badge>
              <Badge className={cn('text-xs', urgencyColors[bill.urgency])}>
                {bill.urgency}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={isSaved ? 'default' : 'outline'}
              size="sm"
              onClick={handleSave}
              className="h-9"
            >
              <Heart className={cn('h-4 w-4 mr-1', isSaved && 'fill-current')} />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
          
          <Button
            variant={isFollowing ? 'default' : 'outline'}
            size="sm"
            onClick={handleFollow}
            className="h-9"
          >
            <Bell className={cn('h-4 w-4 mr-1', isFollowing && 'fill-current')} />
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-2">
          <MobileTabSelector
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={changeTab}
            variant="underline"
          />
        </div>
      </div>

      {/* Tab Content with Swipe Navigation */}
      <SwipeGestures
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        minDistance={50}
      >
        <MobileContainer>
          <MobileSection>
            {renderTabContent()}
          </MobileSection>
        </MobileContainer>
      </SwipeGestures>
    </MobileLayout>
  );
}