/**
 * Bill Card Component
 *
 * A card component for displaying bill information in lists and grids.
 * This component is specific to the bills feature.
 */

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

import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { cn } from '@client/lib/design-system';
import { Bill, Sponsor } from '@client/lib/types';

interface BillCardProps {
  bill: Bill;
  onSave?: (billId: string) => void;
  onShare?: (billId: string) => void;
  onComment?: (billId: string) => void;
  isSaved?: boolean;
  showQuickActions?: boolean;
  viewMode?: 'grid' | 'list';
}

const statusLabels: Record<string, string> = {
  introduced: 'Introduced',
  committee: 'Committee',
  floor_debate: 'Floor Debate',
  passed_house: 'Passed National Assembly',
  passed_senate: 'Passed Senate',
  passed: 'Passed',
  failed: 'Failed',
  signed: 'Assented',
  vetoed: 'Referred Back',
  override_attempt: 'Override Attempt',
  rejected: 'Rejected',
  // Add mapping for new BillStatus enum values if needed
  first_reading: 'First Reading',
  second_reading: 'Second Reading',
  third_reading: 'Third Reading',
  committee_stage: 'Committee Stage',
  enacted: 'Enacted',
  presidential_assent: 'Assented',
  withdrawn: 'Withdrawn',
  lost: 'Lost',
};

const statusColors: Record<string, string> = {
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
  // New statuses
  first_reading: 'bg-blue-100 text-blue-800',
  second_reading: 'bg-orange-100 text-orange-800',
  third_reading: 'bg-green-100 text-green-800',
  committee_stage: 'bg-yellow-100 text-yellow-800',
  enacted: 'bg-emerald-100 text-emerald-800',
  presidential_assent: 'bg-emerald-100 text-emerald-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  lost: 'bg-red-100 text-red-800',
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
    statusColors[bill.status] || statusColors.introduced;

  // Check for conflicts of interest
  const hasConflicts = bill.sponsors?.some(
    (sponsor: Sponsor) => sponsor.conflictOfInterest === true
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
  const viewCount = bill.engagement?.views || 0;
  const commentCount = bill.engagement?.comments || 0;
  const shareCount = bill.engagement?.shares || 0;

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
            onClick={() => onSave?.(String(bill.id))}
            onFocus={() => setQuickActionFocus('save')}
            onBlur={() => setQuickActionFocus(null)}
            onKeyDown={e => handleKeyDown(e, () => onSave?.(String(bill.id)))}
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
            onClick={() => onShare?.(String(bill.id))}
            onFocus={() => setQuickActionFocus('share')}
            onBlur={() => setQuickActionFocus(null)}
            onKeyDown={e => handleKeyDown(e, () => onShare?.(String(bill.id)))}
            aria-label="Share bill"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
            onClick={() => onComment?.(String(bill.id))}
            onFocus={() => setQuickActionFocus('comment')}
            onBlur={() => setQuickActionFocus(null)}
            onKeyDown={e => handleKeyDown(e, () => onComment?.(String(bill.id)))}
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
              <span className="font-mono">{bill.billNumber}</span>
              {bill.introductionDate && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(bill.introductionDate).toLocaleDateString()}</span>
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

          {bill.billType && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {bill.billType}
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
            {statusLabels[bill.status] || bill.status}
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
