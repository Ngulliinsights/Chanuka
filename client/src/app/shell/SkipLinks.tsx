import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@client/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface SkipLinksProps {
  links?: Array<{
    href: string;
    label: string;
    onClick?: () => void;
  }>;
  className?: string;
  showOnFocus?: boolean;
}

/**
 * Individual skip link component
 * Provides keyboard navigation to specific page sections
 */
export function SkipLink({ href, children, className, onClick }: SkipLinkProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Execute custom onClick if provided
    if (onClick) {
      onClick();
      return;
    }

    // Find target element
    const targetId = href.replace('#', '');
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      // Focus the target element
      targetElement.focus();
      
      // If the element isn't naturally focusable, make it focusable temporarily
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
        
        // Remove tabindex after focus to maintain natural tab order
        const handleBlur = () => {
          targetElement.removeAttribute('tabindex');
          targetElement.removeEventListener('blur', handleBlur);
        };
        targetElement.addEventListener('blur', handleBlur);
      }
      
      // Scroll to element with smooth behavior
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Announce to screen readers
      const announcement = `Navigated to ${children}`;
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.textContent = announcement;
      document.body.appendChild(announcer);
      
      setTimeout(() => {
        document.body.removeChild(announcer);
      }, 1000);
    }
  };

  return (
    <a
      ref={linkRef}
      href={href}
      onClick={handleClick}
      className={cn(
        // Base styles - hidden by default
        "absolute left-0 top-0 z-50 px-4 py-2 bg-blue-600 text-white font-medium rounded-br-md",
        "transform -translate-y-full transition-transform duration-200 ease-in-out",
        "focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        // Ensure it's accessible but hidden from visual users when not focused
        "sr-only focus:not-sr-only",
        className
      )}
      tabIndex={0}
    >
      {children}
    </a>
  );
}

/**
 * Default skip links for common page sections
 */
const defaultSkipLinks = [
  {
    href: '#main-content',
    label: 'Skip to main content'
  },
  {
    href: '#navigation',
    label: 'Skip to navigation'
  },
  {
    href: '#search',
    label: 'Skip to search'
  },
  {
    href: '#footer',
    label: 'Skip to footer'
  }
];

/**
 * SkipLinks component provides keyboard navigation shortcuts
 * 
 * Features:
 * - Accessible skip navigation
 * - Customizable link destinations
 * - Screen reader announcements
 * - Smooth scrolling to targets
 * - Focus management
 * - WCAG 2.1 AA compliance
 */
export function SkipLinks({ 
  links = defaultSkipLinks, 
  className,
  showOnFocus = true 
}: SkipLinksProps) {
  const [isVisible, setIsVisible] = useState(!showOnFocus);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle focus events to show/hide skip links
  useEffect(() => {
    if (!showOnFocus) return;

    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = () => {
      setIsVisible(true);
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Check if focus is moving to another skip link
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget || !container.contains(relatedTarget)) {
        setIsVisible(false);
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [showOnFocus]);

  // Handle keyboard navigation within skip links
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Hide skip links and return focus to body
      setIsVisible(false);
      document.body.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed top-0 left-0 z-50",
        showOnFocus && !isVisible && "sr-only",
        className
      )}
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Skip navigation links"
    >
      {links.map((link, index) => (
        <SkipLink
          key={`${link.href}-${index}`}
          href={link.href}
          onClick={link.onClick}
          className={cn(
            // Position skip links in a row
            index > 0 && "ml-2",
            // Ensure proper stacking
            "relative",
            // Add visual separation
            "border border-blue-700"
          )}
        >
          {link.label}
        </SkipLink>
      ))}
    </div>
  );
}

/**
 * Hook for managing skip link targets
 * Ensures target elements are properly configured for skip navigation
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSkipLinkTargets(targetIds: string[]) {
  useEffect(() => {
    targetIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        // Ensure the element can receive focus
        if (!element.hasAttribute('tabindex') && 
            !['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)) {
          element.setAttribute('tabindex', '-1');
        }
        
        // Add skip target class for styling
        element.classList.add('skip-link-target');
      }
    });

    // Cleanup function
    return () => {
      targetIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.classList.remove('skip-link-target');
        }
      });
    };
  }, [targetIds]);
}

/**
 * Higher-order component that adds skip link functionality to a page
 */
// eslint-disable-next-line react-refresh/only-export-components
export function withSkipLinks<P extends object>(
  Component: React.ComponentType<P>,
  customLinks?: SkipLinksProps['links']
) {
  return function SkipLinksWrapper(props: P) {
    return (
      <>
        <SkipLinks links={customLinks} />
        <Component {...props} />
      </>
    );
  };
}

export default SkipLinks;