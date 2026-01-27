/**
 * Community Hub - Main community engagement interface
 *
 * Features:
 * - Activity feed with real-time updates
 * - Trending topics with velocity-based algorithm
 * - Expert insights with verification
 * - Action center with campaigns and petitions
 * - Local impact filtering
 * - Feed customization
 */

import { ThumbsUp } from 'lucide-react';
import {
  Activity,
  TrendingUp,
  Users,
  MapPin,
  Filter,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import React from 'react';
import { useEffect, useState, useCallback } from 'react';

import { cn } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent } from '@client/lib/design-system';
import { useDeviceInfo } from '@client/lib/hooks/mobile/useDeviceInfo';

interface ExpertInsight {
  id: number;
  expert: string;
  title: string;
  insight: string;
  billId: number;
  timestamp: string;
  likes: number;
}

interface CommunityHubProps {
  className?: string;
}

export function CommunityHub({ className }: CommunityHubProps) {
  const [activeTab, setActiveTab] = useState('activity');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expertInsights, setExpertInsights] = useState<ExpertInsight[]>([]);
  const { isMobile } = useDeviceInfo();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    // Load initial data
    setExpertInsights([
      {
        id: 1,
        expert: 'Dr. Sarah Chen',
        title: 'Constitutional Analysis',
        insight: 'This bill raises important questions about federal vs state jurisdiction...',
        billId: 123,
        timestamp: '2 hours ago',
        likes: 24,
      },
    ]);
  }, []);

  return (
    <div className={cn('community-hub space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground">Connect with fellow citizens and experts</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            {!isMobile && 'Refresh'}
          </Button>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            {!isMobile && 'Filter'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">2,847</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Discussions</p>
                <p className="text-2xl font-bold">156</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Trending Bills</p>
                <p className="text-2xl font-bold">23</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Actions Today</p>
                <p className="text-2xl font-bold">89</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="tabs-container">
        <div className="flex border-b">
          {[
            { id: 'activity', label: 'Activity Feed', icon: Activity },
            { id: 'trending', label: 'Trending', icon: TrendingUp },
            { id: 'experts', label: 'Expert Insights', icon: Users },
            { id: 'local', label: 'Local Impact', icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {!isMobile && tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <p className="text-muted-foreground">Activity feed content would go here...</p>
            </div>
          )}

          {activeTab === 'trending' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Trending Topics</h3>
              <p className="text-muted-foreground">Trending topics content would go here...</p>
            </div>
          )}

          {activeTab === 'experts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Expert Insights</h3>
              {expertInsights.map(insight => (
                <Card key={insight.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{insight.expert}</span>
                          <Badge variant="secondary" className="text-xs">
                            Expert
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-2">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{insight.insight}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{insight.timestamp}</span>
                          <button className="flex items-center gap-1 hover:text-foreground">
                            <ThumbsUp className="h-3 w-3" />
                            {insight.likes}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'local' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Local Impact</h3>
              <p className="text-muted-foreground">Local impact content would go here...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommunityHub;
