import React, { useState } from 'react';
import { Heart, Bell, Eye, Share2, MessageCircle, TrendingUp, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Bill {
  id: number;
  title: string;
  summary: string;
  status: string;
  category: string;
  introducedDate: string;
  sponsor: string;
}

interface BillTrackingProps {
  billId: number;
}

interface TrackingPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
}

const BillTracking: React.FC<BillTrackingProps> = ({ billId }) => {
  const [preferences, setPreferences] = useState<TrackingPreferences>({
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is tracking this bill
  const { data: trackingStatus, isLoading: trackingLoading } = useQuery({
    queryKey: ['bill-tracking', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bill-tracking/${billId}/tracking-status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to check tracking status');
      return response.json();
    }
  });

  // Get engagement stats
  const { data: engagementStats } = useQuery({
    queryKey: ['bill-engagement', billId],
    queryFn: async () => {
      const response = await fetch(`/api/bill-tracking/${billId}/engagement`);
      if (!response.ok) throw new Error('Failed to fetch engagement stats');
      return response.json();
    }
  });

  // Track bill mutation
  const trackBillMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bill-tracking/${billId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          trackingType: 'follow',
          alertPreferences: preferences
        })
      });
      if (!response.ok) throw new Error('Failed to track bill');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-tracking', billId] });
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
      const response = await fetch(`/api/bill-tracking/${billId}/track`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to untrack bill');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-tracking', billId] });
      toast({
        title: 'Bill tracking disabled',
        description: 'You will no longer receive notifications about this bill.'
      });
    },
    onError: () => {
      toast({
        title: 'Untracking failed',
        description: 'Failed to disable bill tracking. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Record view mutation
  const recordViewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/bill-tracking/${billId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to record view');
      return response.json();
    }
  });

  // Record view on component mount
  React.useEffect(() => {
    recordViewMutation.mutate();
  }, [billId]);

  const handleTrackingToggle = () => {
    if (trackingStatus?.isTracking) {
      untrackBillMutation.mutate();
    } else {
      trackBillMutation.mutate();
    }
  };

  const handlePreferenceChange = (key: keyof TrackingPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'committee_review': return 'bg-blue-100 text-blue-800';
      case 'floor_vote': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Tracking Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <span>Track This Bill</span>
            </span>
            <Button
              onClick={handleTrackingToggle}
              disabled={trackingLoading || trackBillMutation.isPending || untrackBillMutation.isPending}
              variant={trackingStatus?.isTracking ? "default" : "outline"}
            >
              {trackingStatus?.isTracking ? (
                <>
                  <Heart className="h-4 w-4 mr-2 fill-current" />
                  Tracking
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
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
          
          {trackingStatus?.isTracking && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Notification Preferences</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="status-changes" className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span>Status changes</span>
                    </Label>
                    <Switch
                      id="status-changes"
                      checked={preferences.statusChanges}
                      onCheckedChange={(checked) => handlePreferenceChange('statusChanges', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-comments" className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>New comments</span>
                    </Label>
                    <Switch
                      id="new-comments"
                      checked={preferences.newComments}
                      onCheckedChange={(checked) => handlePreferenceChange('newComments', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voting-schedule" className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Voting schedule</span>
                    </Label>
                    <Switch
                      id="voting-schedule"
                      checked={preferences.votingSchedule}
                      onCheckedChange={(checked) => handlePreferenceChange('votingSchedule', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amendments" className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Amendments</span>
                    </Label>
                    <Switch
                      id="amendments"
                      checked={preferences.amendments}
                      onCheckedChange={(checked) => handlePreferenceChange('amendments', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Statistics */}
      {engagementStats && (
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
                <p className="text-2xl font-bold">{formatNumber(engagementStats.totalViews)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">Comments</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(engagementStats.totalComments)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">Shares</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(engagementStats.totalShares)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Followers</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(engagementStats.uniqueViewers)}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Engagement Score</span>
              <Badge variant="outline" className="font-mono">
                {engagementStats.engagementScore}
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
            <Button variant="outline" className="justify-start">
              <Share2 className="h-4 w-4 mr-2" />
              Share Bill
            </Button>
            <Button variant="outline" className="justify-start">
              <MessageCircle className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
            <Button variant="outline" className="justify-start">
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