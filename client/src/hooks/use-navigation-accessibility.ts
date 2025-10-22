import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@shared/core';

/**
 * @deprecated The focus and keyboard navigation detection parts of this hook are deprecated.
 * Please use `use-keyboard-focus` for focus management and `isKeyboardUser` from `use-unified-navigation`.
 */

/**
 * Accessibility hook for navigation components
 * Provides ARIA labels, keyboard navigation, screen reader support, and focus management
 */
export function useNavigationAccessibility() {
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusTrapRef = useRef<HTMLElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  /**
   * Announce text to screen readers
   */
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear existing timeout
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }

    // Create announcement element
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only chanuka-sr-announcement';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Add to announcements state for debugging
    setAnnouncements(prev => [...prev.slice(-4), message]);
    
    // Clean up after announcement
    announcementTimeoutRef.current = setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  /**
   * Generate ARIA label for navigation items
   */
  const getAriaLabel = useCallback((
    label: string,
    isActive?: boolean,
    hasSubItems?: boolean,
    badge?: number
  ): string => {
    let ariaLabel = label;
    
    if (isActive) {
      ariaLabel += ', current page';
    }
    
    if (hasSubItems) {
      ariaLabel += ', has submenu';
    }
    
    if (badge && badge > 0) {
      ariaLabel += `, ${badge} notification${badge > 1 ? 's' : ''}`;
    }
    
    return ariaLabel;
  }, []);

  /**
   * Generate ARIA attributes for navigation elements
   */
  const getAriaAttributes = useCallback((
    role: 'navigation' | 'menubar' | 'menu' | 'menuitem' | 'button' | 'link',
    options: {
      label?: string;
      expanded?: boolean;
      hasPopup?: boolean;
      current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
      describedBy?: string;
      controls?: string;
      level?: number;
      setSize?: number;
      posInSet?: number;
    } = {}
  ) => {
    const attributes: Record<string, string | boolean | number> = {
      role
    };

    if (options.label) {
      attributes['aria-label'] = options.label;
    }

    if (options.expanded !== undefined) {
      attributes['aria-expanded'] = options.expanded;
    }

    if (options.hasPopup) {
      attributes['aria-haspopup'] = true;
    }

    if (options.current) {
      attributes['aria-current'] = options.current;
    }

    if (options.describedBy) {
      attributes['aria-describedby'] = options.describedBy;
    }

    if (options.controls) {
      attributes['aria-controls'] = options.controls;
    }

    if (options.level) {
      attributes['aria-level'] = options.level;
    }

    if (options.setSize) {
      attributes['aria-setsize'] = options.setSize;
    }

    if (options.posInSet) {
      attributes['aria-posinset'] = options.posInSet;
    }

    return attributes;
  }, []);

  /**
   * Handle keyboard navigation within a container
   */
  const handleKeyboardNavigation = useCallback((
    event: React.KeyboardEvent,
    container: HTMLElement,
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      wrap?: boolean;
      homeEndKeys?: boolean;
      typeAhead?: boolean;
    } = {}
  ) => {
    const {
      orientation = 'vertical',
      wrap = true,
      homeEndKeys = true,
      typeAhead = false
    } = options;

    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    if (focusableElements.length === 0) return;

    const currentIndex = Array.from(focusableElements).indexOf(event.target as Element);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : wrap ? 0 : currentIndex;
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : wrap ? focusableElements.length - 1 : currentIndex;
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : wrap ? 0 : currentIndex;
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : wrap ? focusableElements.length - 1 : currentIndex;
        }
        break;

      case 'Home':
        if (homeEndKeys) {
          event.preventDefault();
          nextIndex = 0;
        }
        break;

      case 'End':
        if (homeEndKeys) {
          event.preventDefault();
          nextIndex = focusableElements.length - 1;
        }
        break;

      default:
        if (typeAhead && event.key.length === 1) {
          // Simple type-ahead implementation
          const searchChar = event.key.toLowerCase();
          const startIndex = (currentIndex + 1) % focusableElements.length;
          
          for (let i = 0; i < focusableElements.length; i++) {
            const index = (startIndex + i) % focusableElements.length;
            const element = focusableElements[index] as HTMLElement;
            const text = element.textContent?.toLowerCase() || '';
            
            if (text.startsWith(searchChar)) {
              nextIndex = index;
              break;
            }
          }
        }
        break;
    }

    if (nextIndex !== currentIndex) {
      (focusableElements[nextIndex] as HTMLElement).focus();
      setFocusedElement(focusableElements[nextIndex] as HTMLElement);
    }
  }, []);

  /**
   * Create a focus trap for modal dialogs or drawers
   */
  const createFocusTrap = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Store the currently focused element
    lastFocusedElementRef.current = document.activeElement as HTMLElement;

    // Focus the first element
    firstElement.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (event.key === 'Escape') {
        // Allow escape to close the trap
        releaseFocusTrap();
      }
    };

    const releaseFocusTrap = () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (lastFocusedElementRef.current) {
        lastFocusedElementRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    focusTrapRef.current = container;

    return releaseFocusTrap;
  }, []);

  /**
   * Generate skip links for better navigation
   */
  const generateSkipLinks = useCallback((targets: Array<{ id: string; label: string }>) => {
    return targets.map(({ id, label }) => ({
      href: `#${id}`,
      label: `Skip to ${label}`,
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const target = document.getElementById(id);
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth' });
          announce(`Skipped to ${label}`);
        }
      }
    }));
  }, [announce]);

  /**
   * Manage focus for route changes
   */
  const handleRouteChange = useCallback((routeName: string) => {
    // Announce route change
    announce(`Navigated to ${routeName}`);
    
    // Focus the main content area
    const mainContent = document.querySelector('main, [role="main"]') as HTMLElement;
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, [announce]);

  /**
   * Check if an element is visible to screen readers
   */
  const isVisibleToScreenReader = useCallback((element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    
    return !(
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      element.hasAttribute('aria-hidden') ||
      element.getAttribute('aria-hidden') === 'true'
    );
  }, []);

  /**
   * Generate landmark roles and labels
   */
  const getLandmarkAttributes = useCallback((
    type: 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search' | 'form',
    label?: string
  ) => {
    const attributes: Record<string, string> = {
      role: type
    };

    if (label) {
      attributes['aria-label'] = label;
    }

    return attributes;
  }, []);

  /**
   * Clean up announcements
   */
  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    announcements,
    focusedElement,
    
    // Announcement functions
    announce,
    clearAnnouncements,
    
    // ARIA utilities
    getAriaLabel,
    getAriaAttributes,
    getLandmarkAttributes,
    
    // Keyboard navigation
    handleKeyboardNavigation,
    
    // Focus management
    createFocusTrap,
    handleRouteChange,
    
    // Skip links
    generateSkipLinks,
    
    // Utilities
    isVisibleToScreenReader
  };
}

/**
 * Hook for managing keyboard shortcuts in navigation
 */
export function useNavigationKeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<Map<string, () => void>>(new Map());
  
  const registerShortcut = useCallback((
    key: string,
    callback: () => void,
    options: {
      ctrl?: boolean;
      alt?: boolean;
      shift?: boolean;
      meta?: boolean;
    } = {}
  ) => {
    const shortcutKey = `${options.ctrl ? 'ctrl+' : ''}${options.alt ? 'alt+' : ''}${options.shift ? 'shift+' : ''}${options.meta ? 'meta+' : ''}${key}`;
    
    setShortcuts(prev => new Map(prev.set(shortcutKey, callback)));
    
    return () => {
      setShortcuts(prev => {
        const newMap = new Map(prev);
        newMap.delete(shortcutKey);
        return newMap;
      });
    };
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const shortcutKey = `${event.ctrlKey ? 'ctrl+' : ''}${event.altKey ? 'alt+' : ''}${event.shiftKey ? 'shift+' : ''}${event.metaKey ? 'meta+' : ''}${key}`;
      
      const callback = shortcuts.get(shortcutKey);
      if (callback) {
        event.preventDefault();
        callback();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
  
  return { registerShortcut };
}












































