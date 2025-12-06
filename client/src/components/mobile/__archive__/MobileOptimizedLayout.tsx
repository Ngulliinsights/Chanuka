/**
 * Mobile UI Components & Layout Utilities
 * 
 * This file contains reusable mobile-optimized components for displaying content
 * and organizing layout. These components are designed to work within the
 * UnifiedMobileLayout system and provide touch-friendly, accessible interfaces
 * for displaying bills, creating structured layouts, and organizing content.
 * 
 * Components:
 * - TouchOptimizedCard: Base card with touch feedback
 * - MobileBillCard: Specialized card for legislative bill content
 * - MobileContainer: Responsive container with padding options
 * - MobileSection: Semantic section with optional heading
 * - MobileGrid: Responsive grid layout system
 */

import React, { memo, useCallback, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card } from '@client/components/ui/card';
import { useAppStore } from '@client/store/unified-state-manager';
import { cn } from '@client/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a legislative bill with its essential metadata.
 * This structure contains all the information needed to display
 * a bill card in the mobile interface, including status indicators,
 * urgency levels, and action buttons.
 */
export interface Bill {
  id: string;
  title: string;
  status: string;
  urgency: 'low' | 'medium' | 'high';
  summary: string;
}

interface TouchOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface MobileBillCardProps {
  bill: Bill;
  onSave: (id: string) => void;
  onShare: (id: string) => void;
  onComment: (id: string) => void;
}

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'default' | 'lg';
}

interface MobileSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

interface MobileGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2;
  gap?: 'sm' | 'default' | 'lg';
}

// ============================================================================
// Touch-Optimized Card Component
// ============================================================================

/**
 * TouchOptimizedCard provides a base card component with touch-friendly
 * interactions. When clickable, it includes hover and active states with
 * smooth transitions, as well as a subtle scale effect on press to provide
 * haptic-like visual feedback. The component automatically handles focus
 * states for keyboard navigation and screen readers.
 * 
 * This component serves as a foundation for more specialized card types
 * like MobileBillCard, providing consistent touch behavior across the app.
 */
export const TouchOptimizedCard = memo(function TouchOptimizedCard({ 
  children, 
  className = '', 
  onClick,
  ...props 
}: TouchOptimizedCardProps & React.ComponentProps<typeof Card>) {
  return (
    <Card 
      className={cn(
        'transition-all duration-150',
        onClick && [
          'cursor-pointer hover:shadow-md active:scale-[0.98]',
          'focus-visible:ring-2 focus-visible:ring-primary'
        ],
        className
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      {...props}
    >
      {children}
    </Card>
  );
});

// ============================================================================
// Mobile Bill Card Component
// ============================================================================

/**
 * MobileBillCard is a specialized card designed for displaying legislative
 * bills in a mobile interface. It presents the bill's title, status, and
 * urgency level at the top, followed by a summary and action buttons.
 * 
 * The card uses memoization extensively to prevent unnecessary re-renders,
 * especially important when rendering large lists of bills. Each action
 * button (save, share, comment) has its own memoized callback to ensure
 * that clicking one button doesn't cause all other buttons to re-render.
 * 
 * The urgency indicator uses color coding (red for high, neutral for others)
 * to provide quick visual scanning. The save button shows a filled heart
 * when the bill is saved, giving immediate feedback about the saved state.
 */
export const MobileBillCard = memo(function MobileBillCard({
  bill,
  onSave,
  onShare,
  onComment
}: MobileBillCardProps) {
  const savedBills = useAppStore(state => state.user.savedBills);
  const isSaved = savedBills.has(bill.id);

  /**
   * The urgency variant is memoized because it's derived from the bill's
   * urgency level and only needs to be recalculated when that specific
   * property changes, not on every render.
   */
  const urgencyVariant = useMemo(() => {
    return bill.urgency === 'high' ? 'destructive' : 'secondary';
  }, [bill.urgency]);

  /**
   * Each action handler is wrapped in useCallback with the bill ID as a
   * dependency. This ensures that the callback reference remains stable
   * unless the bill ID changes, preventing unnecessary re-renders of
   * child button components.
   */
  const handleSave = useCallback(() => onSave(bill.id), [bill.id, onSave]);
  const handleShare = useCallback(() => onShare(bill.id), [bill.id, onShare]);
  const handleComment = useCallback(() => onComment(bill.id), [bill.id, onComment]);

  return (
    <TouchOptimizedCard className="p-4">
      <div className="space-y-3">
        {/* Bill header with title and urgency indicator */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight line-clamp-2">
              {bill.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Bill {bill.id} • {bill.status}
            </p>
          </div>
          <Badge 
            variant={urgencyVariant}
            className="text-xs flex-shrink-0"
          >
            {bill.urgency}
          </Badge>
        </div>

        {/* Bill summary with line clamping for consistent card heights */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {bill.summary}
        </p>

        {/* Action buttons with semantic emoji icons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={cn("h-9 px-3 focus-visible:ring-2", isSaved && "text-red-600")}
              aria-label={isSaved ? "Unsave bill" : "Save bill"}
            >
              <span className="text-base" aria-hidden="true">{isSaved ? '❤️' : '🤍'}</span>
              <span className="ml-1 text-xs">Save</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-9 px-3 focus-visible:ring-2"
              aria-label="Share bill"
            >
              <span className="text-base" aria-hidden="true">📤</span>
              <span className="ml-1 text-xs">Share</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="h-9 px-3 focus-visible:ring-2"
              aria-label="Comment on bill"
            >
              <span className="text-base" aria-hidden="true">💬</span>
              <span className="ml-1 text-xs">Comment</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 px-3 focus-visible:ring-2"
          >
            <a href={`/bills/${bill.id}`}>
              <span className="text-xs">View</span>
              <ChevronRight className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </TouchOptimizedCard>
  );
});

// ============================================================================
// Mobile Container Component
// ============================================================================

/**
 * MobileContainer provides a responsive wrapper with configurable padding
 * options. This component establishes consistent spacing patterns across
 * the mobile interface and ensures content has appropriate breathing room
 * from screen edges.
 * 
 * The padding system uses predefined levels (none, sm, default, lg) that
 * maintain consistency throughout the application. This approach makes it
 * easy to adjust spacing globally if needed, since the padding values are
 * defined in one place.
 * 
 * The container is full-width and horizontally centered, making it suitable
 * for both single-column mobile layouts and wider tablet views that need
 * content constraints.
 */
export function MobileContainer({ 
  children, 
  className,
  padding = 'default' 
}: MobileContainerProps) {
  const paddingClasses = {
    none: '',
    sm: 'px-2 py-2',
    default: 'px-4 py-4',
    lg: 'px-6 py-6',
  };

  return (
    <div className={cn(
      'w-full mx-auto',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

// ============================================================================
// Mobile Section Component
// ============================================================================

/**
 * MobileSection creates semantic sections with optional headings and
 * descriptions. This component helps organize content into logical groups
 * while maintaining consistent spacing between elements.
 * 
 * The section uses native HTML5 semantic markup (the <section> element),
 * which helps screen readers understand the document structure. When a
 * title is provided, it uses an h2 heading, assuming sections are used
 * within a page that already has an h1 for the main title.
 * 
 * The vertical spacing (space-y-4) creates visual rhythm between section
 * elements while the space-y-1 between title and description creates a
 * tighter grouping that shows their relationship.
 */
export function MobileSection({ 
  children, 
  className,
  title,
  description 
}: MobileSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================================================
// Mobile Grid Component
// ============================================================================

/**
 * MobileGrid provides a responsive grid system optimized for mobile devices.
 * It defaults to a single column on mobile but can expand to two columns on
 * slightly larger screens (using the 'sm:' breakpoint).
 * 
 * The grid uses CSS Grid rather than Flexbox because Grid provides better
 * control over column sizing and makes it easier to create truly equal-width
 * columns. The gap system uses the same small/default/large pattern as other
 * components for consistency.
 * 
 * The two-column option is particularly useful for displaying lists of cards
 * or tiles that benefit from side-by-side presentation on wider mobile screens
 * or tablets, while still maintaining the single-column safety of portrait
 * phone layouts.
 */
export function MobileGrid({ 
  children, 
  className,
  columns = 1,
  gap = 'default'
}: MobileGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    default: 'gap-4',
    lg: 'gap-6',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
  };

  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}