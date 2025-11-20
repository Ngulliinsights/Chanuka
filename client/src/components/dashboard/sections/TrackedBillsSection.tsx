/**
 * Tracked Bills Section Component
 * 
 * Displays user's tracked bills with status updates and engagement metrics.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  BookOpen, 
  Bell, 
  BellOff, 
  Eye, 
  MessageSquare, 
  Share2, 
  Trash2,
  ExternalLink,
  Clock,
  TrendingUp
} from 'lucide-react';
import { TrackedBill } from '@client/types/user-dashboard';
import { useUserDashboardStore } from '@client/store/slices/userDashboardSlice';
import { formatDistanceToNow } from 'date-fns';

interface TrackedBillsSectionProps {
  bills: TrackedBill[];
  loading?: boolean;
  compact?: boolean;
}

export function TrackedBillsSection({ 
  bills, 
  loading = false, 
  compact = false 
}: TrackedBillsSectionProps) {
  const { untrackBill, updateBillNotifications } = useUserDashboardStore();

  const getStatusColor = (status: TrackedBill['status']) => {
    switch (status) {
      case 'introduced':
        return 'hsl(var(--status-introduced))';
      case 'committee':
        return 'hsl(var(--status-committee))';
      case 'passed':
        return 'hsl(var(--status-passed))';
      case 'failed':
        return 'hsl(var(--status-failed))';
      case 'signed':
        return 'hsl(var(--status-signed))';
      case 'vetoed':
        return 'hsl(var(--status-vetoed))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const getUrgencyColor = (urgency: TrackedBill['urgencyLevel']) => {
    switch (urgency) {
      case 'critical':
        return 'hsl(var(--civic-urgent))';
      case 'high':
        return 'hsl(var(--status-high))';
      case 'medium':
        return 'hsl(var(--status-moderate))';
      case 'low':
        return 'hsl(var(--status-low))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const handleToggleNotifications = (billId: number, notificationType: keyof TrackedBill['notifications']) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const updatedNotifications = {
      ...bill.notifications,
      [notificationType]: !bill.notifications[notificationType]
    };

    updateBillNotifications(billId, updatedNotifications);
  };

  const handleUntrackBill = (billId: number) => {
    if (confirm('Are you sure you want to stop tracking this bill?')) {
      untrackBill(billId);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tracked Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tracked Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No bills tracked yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start tracking bills to see their status updates and engage with the community.
            </p>
            <Button variant="outline" size="sm">
              Browse Bills
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tracked Bills
            <Badge variant="secondary">{bills.length}</Badge>
          </CardTitle>
          {!compact && (
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="chanuka-card p-4 hover:shadow-md transition-shadow"
            >
              {/* Bill Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="outline"
                      style={{ borderColor: getStatusColor(bill.status) }}
                    >
                      {bill.status.toUpperCase()}
                    </Badge>
                    <Badge 
                      variant="outline"
                      style={{ borderColor: getUrgencyColor(bill.urgencyLevel) }}
                    >
                      {bill.urgencyLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-1">
                    {bill.billNumber}
                  </h4>
                  <p className="text-sm font-semibold line-clamp-2">
                    {bill.title}
                  </p>
                </div>
                
                {!compact && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUntrackBill(bill.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Engagement Metrics */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {bill.userEngagement.viewCount}
                </div>
                {bill.userEngagement.commented && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Commented
                  </div>
                )}
                {bill.userEngagement.shared && (
                  <div className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    Shared
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(bill.userEngagement.lastViewed), { addSuffix: true })}
                </div>
              </div>

              {/* Status Update */}
              <div className="text-xs text-muted-foreground mb-3">
                Last status change: {formatDistanceToNow(new Date(bill.lastStatusChange), { addSuffix: true })}
              </div>

              {/* Notification Controls */}
              {!compact && (
                <div className="flex items-center gap-2 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">Notifications:</span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleNotifications(bill.id, 'statusChanges')}
                    className={`h-6 px-2 text-xs ${
                      bill.notifications.statusChanges 
                        ? 'bg-civic-community text-white' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {bill.notifications.statusChanges ? (
                      <Bell className="h-3 w-3 mr-1" />
                    ) : (
                      <BellOff className="h-3 w-3 mr-1" />
                    )}
                    Status
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleNotifications(bill.id, 'newComments')}
                    className={`h-6 px-2 text-xs ${
                      bill.notifications.newComments 
                        ? 'bg-civic-community text-white' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {bill.notifications.newComments ? (
                      <Bell className="h-3 w-3 mr-1" />
                    ) : (
                      <BellOff className="h-3 w-3 mr-1" />
                    )}
                    Comments
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleNotifications(bill.id, 'expertAnalysis')}
                    className={`h-6 px-2 text-xs ${
                      bill.notifications.expertAnalysis 
                        ? 'bg-civic-expert text-white' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {bill.notifications.expertAnalysis ? (
                      <Bell className="h-3 w-3 mr-1" />
                    ) : (
                      <BellOff className="h-3 w-3 mr-1" />
                    )}
                    Expert
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {compact && bills.length > 5 && (
          <div className="pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View All {bills.length} Tracked Bills
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}