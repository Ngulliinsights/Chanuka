import { useState, useEffect } from 'react';
import { Star, Bell, Eye, Share2, MessageSquare, TrendingUp, Calendar, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@client/hooks/use-toast';
import { useSafeQuery } from '@client/hooks/use-safe-query';
import AuthenticatedAPI from '@client/utils/authenticated-api';
import { logger } from '@client/utils/logger';

interface Bill {
  id: number;
  title: string;
  summary: string;
  status: string;
  category: string;
  introduced_date: string;
  sponsor: string;
}

interface BillTrackingProps { bill_id: number;
 }

interface TrackingPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
}

const BillTracking = ({ bill_id  }: BillTrackingProps): JSX.Element => {
  const [preferences, setPreferences] = useState<TrackingPreferences>({
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is tracking this bill
  const { data: trackingStatus, isLoading: trackingLoading } = useSafeQuery({ queryKey: ['bill-tracking', bill_id],
    queryFn: () => AuthenticatedAPI.get(`/api/bill-tracking/${bill_id }/tracking-status`)
  });

  // Get engagement stats
  const { data: engagementStats } = useSafeQuery({ queryKey: ['bill-engagement', bill_id],
    queryFn: () => AuthenticatedAPI.get(`/api/bill-tracking/${bill_id }/engagement`)
  });

  // Track bill mutation
  const trackBillMutation = useMutation({ mutationFn: async () => {
      return AuthenticatedAPI.post(`/api/bill-tracking/${bill_id }/track`, {
        trackingType: 'follow',
        alertPreferences: preferences
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bill-tracking', bill_id]  });
      toast({
        title: 'Bill tracking enabled',
        description: 'You will receive notifications about this bills.'
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
  const untrackBillMutation = useMutation({ mutationFn: async () => {
      return AuthenticatedAPI.delete(`/api/bill-tracking/${bill_id }/track`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bill-tracking', bill_id]  });
      toast({
        title: 'Bill tracking disabled',
        description: 'You will no longer receive notifications about this bills.'
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
  const recordViewMutation = useMutation({ mutationFn: async () => {
      return AuthenticatedAPI.post(`/api/bill-tracking/${bill_id }/view`);
    }
  });

  // Record view on component mount
  useEffect(() => {
    recordViewMutation.mutate();
  }, [bill_id]);

  const handleTrackingToggle = () => {
    if ((trackingStatus?.data as any)?.isTracking) {
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
              <Star className="h-5 w-5" />
              <span>Track This Bill</span>
            </span>
            <Button
              onClick={handleTrackingToggle}
              disabled={trackingLoading || trackBillMutation.isPending || untrackBillMutation.isPending}
              variant={(trackingStatus?.data as any)?.isTracking ? "default" : "outline"}
            >
              {(trackingStatus?.data as any)?.isTracking ? (
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
          
          {(trackingStatus?.data as any)?.isTracking && (
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
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('statusChanges', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-comments" className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>New comments</span>
                    </Label>
                    <Switch
                      id="new-comments"
                      checked={preferences.newComments}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('newComments', checked)}
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
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('votingSchedule', checked)}
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
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('amendments', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Statistics */}
      {engagementStats?.data ? (
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
                <p className="text-2xl font-bold">{formatNumber((engagementStats.data as { totalViews?: number })?.totalViews || 0)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">Comments</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber((engagementStats.data as { totalComments?: number })?.totalComments || 0)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">Shares</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber((engagementStats.data as { totalShares?: number })?.totalShares || 0)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Followers</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber((engagementStats.data as { uniqueViewers?: number })?.uniqueViewers || 0)}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Engagement Score</span>
              <Badge variant="outline" className="font-mono">
                {(engagementStats.data as { engagement_score?: number })?.engagement_score || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
              <MessageSquare className="h-4 w-4 mr-2" />
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

