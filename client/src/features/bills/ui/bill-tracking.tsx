import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
import React from 'react';

  Star,
  Bell,
  Eye,
  Share2,
  MessageSquare,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Label } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';
import { Switch } from '@client/shared/design-system';
import { useSafeQuery } from '@client/hooks/use-safe-query';
import { useToast } from '@client/hooks/use-toast';
import { globalApiClient } from '@client/core/api/client';

interface BillTrackingProps {
  bill_id: number;
  onShare?: () => void;
  onComment?: () => void;
  onViewAnalysis?: () => void;
}

interface TrackingPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
}

interface TrackingStatusResponse {
  isTracking: boolean;
  preferences?: TrackingPreferences;
}

interface EngagementStatsResponse {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueViewers: number;
  engagement_score: number;
}

const BillTracking = ({ 
  bill_id, 
  onShare, 
  onComment, 
  onViewAnalysis 
}: BillTrackingProps): JSX.Element => {
  // Initialize preferences from tracking status when available
  const [preferences, setPreferences] = useState<TrackingPreferences>({
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is tracking this bill and get their current preferences
  const { data: trackingStatus, isLoading: trackingLoading } = useSafeQuery<{ data: TrackingStatusResponse }>({
    queryKey: ['bill-tracking', bill_id],
    queryFn: () => globalApiClient.get(`/api/bill-tracking/${bill_id}/tracking-status`)
  });

  // Get engagement stats with longer stale time since these don't change frequently
  const { data: engagementStats } = useSafeQuery<{ data: EngagementStatsResponse }>({
    queryKey: ['bill-engagement', bill_id],
    queryFn: () => globalApiClient.get(`/api/bill-tracking/${bill_id}/engagement`),
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: false // Don't refetch when user returns to tab
  });

  // Sync local preferences with server preferences when tracking status loads
  useEffect(() => {
    if (trackingStatus?.data?.preferences) {
      setPreferences(trackingStatus.data.preferences);
    }
  }, [trackingStatus?.data?.preferences]);

  // Track bill mutation
  const trackBillMutation = useMutation({
    mutationFn: async () => {
      return globalApiClient.post(`/api/bill-tracking/${bill_id}/track`, {
        trackingType: 'follow',
        alertPreferences: preferences
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-tracking', bill_id] });
      toast({
        title: 'Bill tracking enabled',
        description: 'You will receive notifications about this bill.'
      });
    },
    onError: () => {
      toast({
        title: 'Tracking failed',
        description: 'Failed to enable bill tracking. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Untrack bill mutation
  const untrackBillMutation = useMutation({
    mutationFn: async () => {
      return globalApiClient.delete(`/api/bill-tracking/${bill_id}/track`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-tracking', bill_id] });
      toast({
        title: 'Bill tracking disabled',
        description: 'You will no longer receive notifications about this bill.'
      });
    },
    onError: () => {
      toast({
        title: 'Failed to disable tracking',
        description: 'Failed to disable bill tracking. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Update preferences mutation - persists preference changes to backend
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: TrackingPreferences) => {
      return globalApiClient.patch(`/api/bill-tracking/${bill_id}/preferences`, {
        alertPreferences: newPreferences
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-tracking', bill_id] });
    },
    onError: () => {
      // Revert to previous preferences on error
      if (trackingStatus?.data?.preferences) {
        setPreferences(trackingStatus.data.preferences);
      }
      toast({
        title: 'Update failed',
        description: 'Failed to update notification preferences.',
        variant: 'destructive'
      });
    }
  });

  // Record view mutation - tracks bill views for analytics
  const recordViewMutation = useMutation({
    mutationFn: async () => {
      return globalApiClient.post(`/api/bill-tracking/${bill_id}/view`);
    }
  });

  // Record view only once when component mounts with this bill_id
  useEffect(() => {
    // Create a flag in session storage to prevent duplicate views in the same session
    const viewKey = `bill_viewed_${bill_id}`;
    const hasViewed = sessionStorage.getItem(viewKey);

    if (!hasViewed) {
      recordViewMutation.mutate();
      sessionStorage.setItem(viewKey, 'true');
    }
  }, [bill_id, recordViewMutation]); // Only re-run if bill_id changes

  // Memoized callback to handle tracking toggle
  const handleTrackingToggle = useCallback(() => {
    if (trackingStatus?.data?.isTracking) {
      untrackBillMutation.mutate();
    } else {
      trackBillMutation.mutate();
    }
  }, [trackingStatus?.data?.isTracking, trackBillMutation, untrackBillMutation]);

  // Optimized preference change handler with debouncing effect
  const handlePreferenceChange = useCallback((key: keyof TrackingPreferences, value: boolean) => {
    // Optimistically update UI immediately
    setPreferences(prev => {
      const newPreferences = { ...prev, [key]: value };
      
      // Persist to backend after state update
      updatePreferencesMutation.mutate(newPreferences);
      
      return newPreferences;
    });
  }, [updatePreferencesMutation]);

  // Memoized number formatter to avoid recreating on every render
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  }, []);

  // Compute derived state values
  const isTracking = useMemo(() => 
    trackingStatus?.data?.isTracking ?? false, 
    [trackingStatus?.data?.isTracking]
  );

  const isUpdating = useMemo(() => 
    trackBillMutation.isPending || untrackBillMutation.isPending || updatePreferencesMutation.isPending,
    [trackBillMutation.isPending, untrackBillMutation.isPending, updatePreferencesMutation.isPending]
  );

  // Memoized engagement stats to prevent unnecessary recalculations
  const stats = useMemo(() => ({
    views: engagementStats?.data?.totalViews || 0,
    comments: engagementStats?.data?.totalComments || 0,
    shares: engagementStats?.data?.totalShares || 0,
    followers: engagementStats?.data?.uniqueViewers || 0,
    score: engagementStats?.data?.engagement_score || 0
  }), [engagementStats?.data]);

  return (
    <div className="space-y-6">
      {/* Tracking Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Track This Bill</span>
            </span>
            <Button
              onClick={handleTrackingToggle}
              disabled={trackingLoading || isUpdating}
              variant={isTracking ? "primary" : "outline"}
            >
              {isTracking ? (
                <>
                  <Star className="h-4 w-4 mr-2 fill-current" />
                  Tracking
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Track Bill
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Get notified when there are updates to this bill based on your preferences.
          </p>
          
          {isTracking && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Notification Preferences</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="status-changes" className="flex items-center space-x-2 cursor-pointer">
                      <Bell className="h-4 w-4" />
                      <span>Status changes</span>
                    </Label>
                    <Switch
                      id="status-changes"
                      checked={preferences.statusChanges}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('statusChanges', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-comments" className="flex items-center space-x-2 cursor-pointer">
                      <MessageSquare className="h-4 w-4" />
                      <span>New comments</span>
                    </Label>
                    <Switch
                      id="new-comments"
                      checked={preferences.newComments}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('newComments', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voting-schedule" className="flex items-center space-x-2 cursor-pointer">
                      <Calendar className="h-4 w-4" />
                      <span>Voting schedule</span>
                    </Label>
                    <Switch
                      id="voting-schedule"
                      checked={preferences.votingSchedule}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('votingSchedule', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amendments" className="flex items-center space-x-2 cursor-pointer">
                      <TrendingUp className="h-4 w-4" />
                      <span>Amendments</span>
                    </Label>
                    <Switch
                      id="amendments"
                      checked={preferences.amendments}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('amendments', checked)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Statistics */}
      {engagementStats?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Engagement Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Views</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.views)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">Comments</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.comments)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">Shares</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.shares)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Followers</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatNumber(stats.followers)}
                </p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Engagement Score</span>
              <Badge variant="outline" className="font-mono">
                {stats.score}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={onShare}
              disabled={!onShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Bill
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={onComment}
              disabled={!onComment}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={onViewAnalysis}
              disabled={!onViewAnalysis}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillTracking;