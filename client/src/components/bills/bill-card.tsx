
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Calendar, 
  Users, 
  AlertCircle, 
  TrendingUp, 
  Eye, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  BookmarkCheck,
  Clock,
  Flag
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { Bill } from '@/core/api/types';

interface BillCardProps {
  bill: Bill;
  onSave?: (billId: number) => void;
  onShare?: (billId: number) => void;
  onComment?: (billId: number) => void;
  isSaved?: boolean;
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
};

const statusColors = {
  introduced: 'chanuka-status-badge bg-[hsl(var(--status-introduced))] text-white',
  committee: 'chanuka-status-badge bg-[hsl(var(--status-committee))] text-white',
  floor_debate: 'chanuka-status-badge bg-[hsl(var(--status-committee))] text-white',
  passed_house: 'chanuka-status-badge bg-[hsl(var(--status-passed))] text-white',
  passed_senate: 'chanuka-status-badge bg-[hsl(var(--status-passed))] text-white',
  passed: 'chanuka-status-badge bg-[hsl(var(--status-passed))] text-white',
  failed: 'chanuka-status-badge bg-[hsl(var(--status-failed))] text-white',
  signed: 'chanuka-status-badge bg-[hsl(var(--status-signed))] text-white',
  vetoed: 'chanuka-status-badge bg-[hsl(var(--status-vetoed))] text-white',
  override_attempt: 'chanuka-status-badge bg-[hsl(var(--status-vetoed))] text-white',
};

const urgencyColors = {
  low: 'chanuka-status-badge bg-gray-100 text-gray-800',
  medium: 'chanuka-status-badge bg-yellow-100 text-yellow-800',
  high: 'chanuka-status-badge bg-orange-100 text-orange-800',
  critical: 'chanuka-status-badge bg-red-100 text-red-800',
};

const conflictColors = {
  low: 'chanuka-status-badge bg-green-100 text-green-800',
  medium: 'chanuka-status-badge bg-yellow-100 text-yellow-800',
  high: 'chanuka-status-badge bg-red-100 text-red-800',
};

export function BillCard({ bill, onSave, onShare, onComment, isSaved = false }: BillCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [quickActionFocus, setQuickActionFocus] = useState<string | null>(null);

  const statusColor = statusColors[bill.status] || statusColors.introduced;
  const urgencyColor = urgencyColors[bill.urgencyLevel];

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

  return (
    <Card 
      className={cn(
        "chanuka-card group relative transition-all duration-200 hover:shadow-lg hover:shadow-primary/10",
        "border border-border hover:border-primary/20"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Quick Actions Overlay */}
      <div 
        className={cn(
          "absolute top-2 right-2 flex gap-1 transition-all duration-200 z-10",
          isHovered || quickActionFocus ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
      >
        <Button
          size="sm"
          variant="secondary"
          className="chanuka-btn h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
          onClick={() => onSave?.(bill.id)}
          onFocus={() => setQuickActionFocus('save')}
          onBlur={() => setQuickActionFocus(null)}
          onKeyDown={(e) => handleKeyDown(e, () => onSave?.(bill.id))}
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
          className="chanuka-btn h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
          onClick={() => onShare?.(bill.id)}
          onFocus={() => setQuickActionFocus('share')}
          onBlur={() => setQuickActionFocus(null)}
          onKeyDown={(e) => handleKeyDown(e, () => onShare?.(bill.id))}
          aria-label="Share bill"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        
        <Button
          size="sm"
          variant="secondary"
          className="chanuka-btn h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
          onClick={() => onComment?.(bill.id)}
          onFocus={() => setQuickActionFocus('comment')}
          onBlur={() => setQuickActionFocus(null)}
          onKeyDown={(e) => handleKeyDown(e, () => onComment?.(bill.id))}
          aria-label="View comments"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 pr-20">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{bill.billNumber}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{bill.readingTime} min read</span>
              </div>
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
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {bill.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {bill.summary}
          </p>
        )}
        
        {/* Status and Urgency Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColor}>
            {statusLabels[bill.status] || bill.status}
          </Badge>
          
          <Badge className={urgencyColor}>
            {bill.urgencyLevel.charAt(0).toUpperCase() + bill.urgencyLevel.slice(1)} Priority
          </Badge>

          {bill.constitutionalFlags.length > 0 && (
            <Badge className="chanuka-status-badge bg-[hsl(var(--civic-constitutional))] text-white">
              <Flag className="h-3 w-3 mr-1" />
              Constitutional Issues
            </Badge>
          )}
        </div>
        
        {/* Policy Areas */}
        {bill.policyAreas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bill.policyAreas.slice(0, 3).map((area, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
            {bill.policyAreas.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{bill.policyAreas.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Metadata and Engagement */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(bill.introducedDate).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{bill.sponsors.length} sponsors</span>
            </div>
          </div>
        </div>
        
        {/* Engagement Metrics */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{formatEngagementCount(bill.viewCount)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{formatEngagementCount(bill.commentCount)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Bookmark className="h-3 w-3" />
              <span>{formatEngagementCount(bill.saveCount)}</span>
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

