/**
 * ScrollToTopButton - Floating button to scroll to top
 * 
 * Appears after scrolling down a certain distance.
 * Provides quick navigation back to top of page.
 * 
 * @module components/mobile/interaction/ScrollToTopButton
 */

import { ChevronUp } from 'lucide-react';
import { type ReactNode } from 'react';

import { useScrollManager } from '@client/hooks/mobile';
import { cn } from '@client/lib/utils';

interface ScrollToTopButtonProps {
  /**
   * Custom button content (default: arrow up icon)
   */
  children?: ReactNode;
  /**
   * CSS class name
   */
  className?: string;
  /**
   * Distance scrolled before button shows (pixels)
   * @default 300
   */
  threshold?: number;
  /**
   * Callback when button is clicked
   */
  onClick?: () => void;
  /**
   * ARIA label for accessibility
   * @default "Scroll to top"
   */
  ariaLabel?: string;
}

/**
 * Scroll to top button component
 * 
 * Shows a floating button that appears after scrolling.
 * Automatically scrolls page to top with smooth animation.
 * 
 * @example
 * ```tsx
 * <ScrollToTopButton threshold={400} />
 * ```
 */
export function ScrollToTopButton({
  children,
  className,
  threshold = 300,
  onClick,
  ariaLabel = 'Scroll to top',
}: ScrollToTopButtonProps): JSX.Element | null {
  const { showScrollTop } = useScrollManager({
    isEnabled: true,
    showScrollToTop: true,
    scrollTopThreshold: threshold,
  });

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    onClick?.();
  };

  if (!showScrollTop) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'fixed bottom-4 right-4 z-40',
        'p-3 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-300 ease-out',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'min-h-[44px] min-w-[44px] flex items-center justify-center',
        className
      )}
      aria-label={ariaLabel}
    >
      {children || <ChevronUp className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
