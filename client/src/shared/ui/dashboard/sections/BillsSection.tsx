import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, Star } from 'lucide-react';

import { Badge } from '@/shared/design-system';
import { Button } from '@/shared/design-system';
import {
import React from 'react';

  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/design-system';
import { TrackedBill, BillRecommendation } from '@/shared/types/user-dashboard';

interface BillsSectionProps {
  trackedBills?: TrackedBill[];
  recommendations?: BillRecommendation[];
  loading?: boolean;
  compact?: boolean;
  showRecommendations?: boolean;
}

export function BillsSection({
  trackedBills = [],
  recommendations = [],
  loading,
  compact = false,
  showRecommendations = true,
}: BillsSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {compact ? 'Tracked Bills' : 'Saved Bills'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-6">
        {/* Tracked Bills Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Tracked Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trackedBills.length ? (
              <div className="space-y-4">
                {trackedBills.slice(0, 5).map(bill => (
                  <div key={bill.id} className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">{bill.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {bill.billNumber} • {bill.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated{' '}
                        {formatDistanceToNow(new Date(bill.lastStatusChange), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = `/bills/${bill.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Tracked Bills</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking bills to stay informed about their progress.
                </p>
                <Button onClick={() => (window.location.href = '/bills')}>Browse Bills</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {showRecommendations && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recommended Bills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length ? (
                <div className="space-y-4">
                  {recommendations.slice(0, 3).map(recommendation => (
                    <div key={recommendation.bill.id} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-1">{recommendation.bill.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {recommendation.bill.billNumber} • {recommendation.bill.status}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{recommendation.bill.urgencyLevel}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            (window.location.href = `/bills/${recommendation.bill.id}`)
                          }
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recommendations available
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Bills ({trackedBills.length})</CardTitle>
        <CardDescription>Bills you&apos;ve saved for tracking and future reference</CardDescription>
      </CardHeader>
      <CardContent>
        {trackedBills.length ? (
          <div className="space-y-4">
            {trackedBills.map(trackedBill => (
              <div key={trackedBill.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{trackedBill.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {trackedBill.billNumber} • {trackedBill.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated{' '}
                      {formatDistanceToNow(new Date(trackedBill.lastStatusChange), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = `/bills/${trackedBill.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Saved Bills</h3>
            <p className="text-muted-foreground mb-4">
              Start saving bills to track their progress and stay informed.
            </p>
            <Button onClick={() => (window.location.href = '/bills')}>Browse Bills</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
