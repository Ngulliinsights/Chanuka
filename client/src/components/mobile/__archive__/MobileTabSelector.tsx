/**
 * Mobile Tab Selector Component
 * 
 * A mobile-optimized tab selector with gesture-based navigation.
 * Provides horizontal scrolling tabs with swipe support and touch-friendly interactions.
 * 
 * Features:
 * - Touch-optimized with 44px minimum touch targets
 * - Horizontal scrolling for many tabs
 * - Swipe gestures for tab navigation
 * - Keyboard navigation support
 * - Active tab indicator with smooth animation
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useRef, useEffect, useState, useCallback } from 'react';

import { cn } from '@client/lib/utils';
import { Button } from '../../ui/button';

export interface MobileTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface MobileTabSelectorProps {
  tabs: MobileTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  showScrollButtons?: boolean;
  variant?: 'default' | 'pills' | 'underline';
}

export function MobileTabSelector({
  tabs,
  activeTab,
  onTabChange,
  className,
  showScrollButtons = true,
  variant = 'default',
}: MobileTabSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStartX, setScrollStartX] = useState(0);

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Scroll to active tab
  const scrollToActiveTab = useCallback(() => {
    if (!activeTabRef.current || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const activeTab = activeTabRef.current;
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    const scrollLeft = container.scrollLeft;
    const tabLeft = tabRect.left - containerRect.left + scrollLeft;
    const tabRight = tabLeft + tabRect.width;

    // Check if tab is fully visible
    if (tabLeft < scrollLeft) {
      // Tab is cut off on the left
      container.scrollTo({
        left: tabLeft - 16, // Add some padding
        behavior: 'smooth',
      });
    } else if (tabRight > scrollLeft + containerRect.width) {
      // Tab is cut off on the right
      container.scrollTo({
        left: tabRight - containerRect.width + 16, // Add some padding
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkScrollState();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    checkScrollState();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [checkScrollState]);

  // Scroll to active tab when it changes
  useEffect(() => {
    scrollToActiveTab();
  }, [activeTab, scrollToActiveTab]);

  // Touch event handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStartX(touch.clientX);
    setScrollStartX(scrollContainerRef.current?.scrollLeft || 0);
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const touch = e.touches[0];
    const deltaX = dragStartX - touch.clientX;
    const newScrollLeft = scrollStartX + deltaX;

    scrollContainerRef.current.scrollLeft = newScrollLeft;
  }, [isDragging, dragStartX, scrollStartX]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Scroll button handlers
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    
    container.scrollTo({
      left: container.scrollLeft - scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    
    container.scrollTo({
      left: container.scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevTab = tabs[currentIndex - 1];
          if (!prevTab.disabled) {
            onTabChange(prevTab.id);
          }
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentIndex < tabs.length - 1) {
          const nextTab = tabs[currentIndex + 1];
          if (!nextTab.disabled) {
            onTabChange(nextTab.id);
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        const firstEnabledTab = tabs.find(tab => !tab.disabled);
        if (firstEnabledTab) {
          onTabChange(firstEnabledTab.id);
        }
        break;
      case 'End':
        e.preventDefault();
        const lastEnabledTab = tabs.slice().reverse().find(tab => !tab.disabled);
        if (lastEnabledTab) {
          onTabChange(lastEnabledTab.id);
        }
        break;
    }
  }, [tabs, onTabChange]);

  const getTabClasses = (tab: MobileTab, isActive: boolean) => {
    const baseClasses = cn(
      'relative flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium',
      'transition-all duration-200 ease-in-out',
      'min-w-[44px] min-h-[44px]', // Touch target minimum
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        'touch-manipulation': true, // Optimize for touch
      }
    );

    switch (variant) {
      case 'pills':
        return cn(
          baseClasses,
          'rounded-full border',
          isActive
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
        );
      case 'underline':
        return cn(
          baseClasses,
          'border-b-2 rounded-none',
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
        );
      default:
        return cn(
          baseClasses,
          'rounded-md',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        );
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Left scroll button */}
      {showScrollButtons && canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollLeft}
          className="absolute left-0 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm shadow-sm"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Tab container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide gap-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="tablist"
        aria-label="Tab navigation"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              onClick={() => !tab.disabled && onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              disabled={tab.disabled}
              className={getTabClasses(tab, isActive)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
            >
              {tab.icon && (
                <span className="flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              <span className="whitespace-nowrap">
                {tab.label}
              </span>
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right scroll button */}
      {showScrollButtons && canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollRight}
          className="absolute right-0 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm shadow-sm"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Hook for managing mobile tab state
 */
export function useMobileTabs(initialTab: string) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const changeTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  return {
    activeTab,
    changeTab,
  };
}