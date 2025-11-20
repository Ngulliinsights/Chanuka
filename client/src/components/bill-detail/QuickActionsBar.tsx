import { useState } from 'react';
import { Button } from '../ui/button';
import { Share2, Bell, ExternalLink, Bookmark, MessageCircle, BookmarkCheck } from 'lucide-react';
import { Bill } from '@/core/api/types';

interface QuickActionsBarProps {
  bill: Bill;
  className?: string;
}

/**
 * QuickActionsBar component with save, share, comment, alert buttons
 * Sticky on desktop, bottom panel on mobile
 */
export function QuickActionsBar({ bill, className = '' }: QuickActionsBarProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement actual save functionality
    console.log(`${isSaved ? 'Unsaved' : 'Saved'} bill:`, bill.id);
  };

  const handleShare = async () => {
    const shareData = {
      title: bill.title,
      text: bill.summary,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // TODO: Show toast notification
        console.log('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleComment = () => {
    // Scroll to community tab or open comment modal
    const communityTab = document.querySelector('[data-tab="community"]');
    if (communityTab) {
      communityTab.scrollIntoView({ behavior: 'smooth' });
    }
    console.log('Navigate to comments for bill:', bill.id);
  };

  const handleTrackAlerts = () => {
    setIsTracking(!isTracking);
    // TODO: Implement alert subscription
    console.log(`${isTracking ? 'Stopped tracking' : 'Started tracking'} bill:`, bill.id);
  };

  const handleViewSource = () => {
    // TODO: Open official source link
    console.log('View official source for bill:', bill.id);
  };

  return (
    <>
      {/* Desktop Sticky Actions Bar */}
      <div className={`
        hidden lg:flex
        fixed top-20 right-6 z-40
        flex-col gap-2 p-3
        bg-card/95 backdrop-blur-sm
        border border-border rounded-lg shadow-lg
        transition-all duration-200
        ${className}
      `}>
        <Button
          variant={isSaved ? "default" : "outline"}
          size="sm"
          onClick={handleSave}
          className="w-full justify-start gap-2"
          style={{ 
            backgroundColor: isSaved ? 'hsl(var(--civic-community))' : undefined,
            borderColor: isSaved ? 'hsl(var(--civic-community))' : undefined
          }}
          aria-label={isSaved ? 'Remove from saved bills' : 'Save this bill'}
        >
          {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {isSaved ? 'Saved' : 'Save'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="w-full justify-start gap-2"
          aria-label="Share this bill"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleComment}
          className="w-full justify-start gap-2"
          aria-label="View comments and discussions"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </Button>

        <Button
          variant={isTracking ? "default" : "outline"}
          size="sm"
          onClick={handleTrackAlerts}
          className="w-full justify-start gap-2"
          style={{ 
            backgroundColor: isTracking ? 'hsl(var(--civic-urgent))' : undefined,
            borderColor: isTracking ? 'hsl(var(--civic-urgent))' : undefined
          }}
          aria-label={isTracking ? 'Stop tracking updates' : 'Track bill updates'}
        >
          <Bell className="h-4 w-4" />
          {isTracking ? 'Tracking' : 'Track'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleViewSource}
          className="w-full justify-start gap-2"
          aria-label="View official bill source"
        >
          <ExternalLink className="h-4 w-4" />
          Source
        </Button>
      </div>

      {/* Mobile Bottom Actions Panel */}
      <div className={`
        lg:hidden
        fixed bottom-0 left-0 right-0 z-50
        bg-card/95 backdrop-blur-sm
        border-t border-border
        p-4 pb-safe
        ${className}
      `}>
        <div className="flex items-center justify-around gap-2 max-w-md mx-auto">
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            className="flex-1 gap-1"
            style={{ 
              backgroundColor: isSaved ? 'hsl(var(--civic-community))' : undefined,
              borderColor: isSaved ? 'hsl(var(--civic-community))' : undefined,
              minHeight: '44px' // Touch-friendly
            }}
            aria-label={isSaved ? 'Remove from saved bills' : 'Save this bill'}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 gap-1"
            style={{ minHeight: '44px' }}
            aria-label="Share this bill"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleComment}
            className="flex-1 gap-1"
            style={{ minHeight: '44px' }}
            aria-label="View comments and discussions"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Comment</span>
          </Button>

          <Button
            variant={isTracking ? "default" : "outline"}
            size="sm"
            onClick={handleTrackAlerts}
            className="flex-1 gap-1"
            style={{ 
              backgroundColor: isTracking ? 'hsl(var(--civic-urgent))' : undefined,
              borderColor: isTracking ? 'hsl(var(--civic-urgent))' : undefined,
              minHeight: '44px'
            }}
            aria-label={isTracking ? 'Stop tracking updates' : 'Track bill updates'}
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{isTracking ? 'Tracking' : 'Track'}</span>
          </Button>
        </div>
      </div>

      {/* Mobile bottom padding to prevent content overlap */}
      <div className="lg:hidden h-20" aria-hidden="true" />
    </>
  );
}