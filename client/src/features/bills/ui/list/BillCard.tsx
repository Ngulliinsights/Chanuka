/**
 * Bill Card Component
 * 
 * A card component for displaying bill information in lists and grids.
 * This component is specific to the bills feature.
 */

import { Bill } from '@client/shared/types';
import {
  Calendar,
  Users,
  TrendingUp,
  Eye,
  MessageCircle,
  Share2,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { cn } from '@client/shared/design-system';

interface BillCardProps {
  bill: Bill;
  onSave?: (billId: string) => void;
  onShare?: (billId: string) => void;
  onComment?: (billId: string) => void;
  isSaved?: boolean;
  showQuickActions?: boolean;
  viewMode?: 'grid' | 'list';
}

const statusLabels = {
  introduced: 'Introduced',
  committee: 'Committee',
  floor_debate: 'Floor Debate',
  passed_house: 'Passed House',
  passed_senate: 'Passed Senate',
  passed: 'Passed',
  failed: 'Failed',
  signed: 'Signed',
  vetoed: 'Vetoed',
  override_attempt: 'Override Attempt',
  rejected: 'Rejected',
};

const statusColors = {
  introduced: 'bg-blue-100 text-blue-800',
  committee: 'bg-yellow-100 text-yellow-800',
  floor_debate: 'bg-orange-100 text-orange-800',
  passed_house: 'bg-green-100 text-green-800',
  passed_senate: 'bg-green-100 text-green-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  signed: 'bg-emerald-100 text-emerald-800',
  vetoed: 'bg-red-100 text-red-800',
  override_attempt: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function BillCard({
  bill,
  onSave,
  onShare,
  onComment,
  isSaved = false,
  showQuickActions = true,
  viewMode = 'grid',
}: BillCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [quickActionFocus, setQuickActionFocus] = useState<string | null>(null);

  const statusColor =
    statusColors[bill.status as keyof typeof statusColors] || statusColors.introduced;

  // Check for conflicts of interest
  const hasConflicts = bill.sponsors?.some(
    sponsor => sponsor.conflictOfInterest && sponsor.conflictOfInterest.length > 0
  );

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const formatEngagementCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Get engagement metrics with fallbacks
  const viewCount = bill.engagementMetrics?.views || 0;
  const commentCount = bill.comments?.length || 0;
  const shareCount = bill.engagementMetrics?.shares || 0;

  return (
    <Card
      className={cn(
        'group relative transition-all duration-200 hover:shadow-lg hover:shadow-primary/10',
        'border border-border hover:border-primary/20',
        viewMode === 'list' && 'flex flex-row'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          className={cn(
            'absolute top-2 right-2 flex gap-1 transition-all duration-200 z-10',
            isHovered || quickActionFocus ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
            onClick={() => onSave?.(bill.id)}
            onFocus={() => setQuickActionFocus('save')}
            onBlur={() => setQuickActionFocus(null)}
            onKeyDown={e => handleKeyDown(e, () => onSave?.(bill.id))}
            aria-label={isSaved ? 'Remove from saved bills' : 'Save bill'}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
            onClick={() => onShare?.(bill.id)}
            onFocus={() => setQuickActionFocus('share')}
            onBlur={() => setQuickActionFocus(null)}
            onKeyDown={e => handleKeyDown(e, () => onShare?.(bill.id))}
            aria-label="Share bill"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
            onClick={() => onComment?.(bill.id)}
            onFocus={() => setQuickActionFocus('comment')}
            onBlur={() => setQuickActionFocus(null)}
            onKeyDown={e => handleKeyDown(e, () => onComment?.(bill.id))}
            aria-label="View comments"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className={cn('flex items-start justify-between gap-2', showQuickActions && 'pr-20')}>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{bill.id}</span>
              {bill.introduced_date && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(bill.introduced_date).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </div>

            <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
              <Link
                to={`/bills/${bill.id}`}
                className="hover:underline focus:underline focus:outline-none"
                tabIndex={0}
              >
                {bill.title}
              </Link>
            </CardTitle>
          </div>

          {bill.category && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {bill.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {bill.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {bill.summary}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColor}>
            {statusLabels[bill.status as keyof typeof statusLabels] || bill.status}
          </Badge>

          {hasConflicts && (
            <Badge className="bg-red-100 text-red-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              High Risk
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {bill.sponsors && bill.sponsors.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{bill.sponsors.length} sponsors</span>
              </div>
            )}
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{formatEngagementCount(viewCount)}</span>
            </div>

            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{formatEngagementCount(commentCount)}</span>
            </div>

            <div className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              <span>{formatEngagementCount(shareCount)}</span>
            </div>
          </div>

          <Link
            to={`/bills/${bill.id}`}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors text-sm"
            tabIndex={0}
          >
            <TrendingUp className="h-4 w-4" />
            View Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}