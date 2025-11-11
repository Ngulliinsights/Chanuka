/**
 * Enhanced UI Components
 * Provides business logic enhanced versions of shadcn/ui components
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Progress } from './progress';
import { Badge } from './badge';
import { cn } from '../../lib/utils';
import { logger } from '../../utils/logger';
import { UIComponentError } from './errors';
import { attemptUIRecovery } from './recovery';

// Enhanced Tabs with analytics and state management
interface EnhancedTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  trackAnalytics?: boolean;
  onTabChange?: (tabId: string, analytics: { timeSpent: number; previousTab?: string }) => void;
}

export const EnhancedTabs: React.FC<EnhancedTabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  trackAnalytics = false,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(value || defaultValue || '');
  const [tabStartTime, setTabStartTime] = useState<number>(Date.now());
  const [previousTab, setPreviousTab] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);

  const handleTabChange = useCallback(async (newTab: string) => {
    try {
      if (trackAnalytics && activeTab) {
        const timeSpent = Date.now() - tabStartTime;
        onTabChange?.(activeTab, { timeSpent, previousTab });
      }

      setPreviousTab(activeTab);
      setActiveTab(newTab);
      setTabStartTime(Date.now());
      onValueChange?.(newTab);

      if (trackAnalytics) {
        logger.info('Tab changed', { 
          component: 'EnhancedTabs',
          from: activeTab,
          to: newTab,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Tab change error:', error);
      const componentError = new UIComponentError('enhanced-tabs', 'change', error instanceof Error ? error.message : 'Tab change failed');
      
      try {
        const recoveryResult = await attemptUIRecovery('enhanced-tabs', componentError, retryCount);
        if (recoveryResult.shouldRetry) {
          setRetryCount(prev => prev + 1);
        }
      } catch (recoveryError) {
        logger.error('Tab recovery error:', recoveryError);
      }
    }
  }, [activeTab, tabStartTime, previousTab, trackAnalytics, onTabChange, onValueChange, retryCount]);

  return (
    <Tabs
      value={value || activeTab}
      onValueChange={handleTabChange}
      className={className}
    >
      {children}
    </Tabs>
  );
};

// Enhanced Tooltip with delay and analytics
interface EnhancedTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  trackInteractions?: boolean;
  onShow?: () => void;
  onHide?: () => void;
}

export const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  trackInteractions = false,
  onShow,
  onHide,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const showTimeRef = useRef<number>(0);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    
    if (open) {
      showTimeRef.current = Date.now();
      onShow?.();
      
      if (trackInteractions) {
        logger.info('Tooltip shown', { 
          component: 'EnhancedTooltip',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      const viewDuration = Date.now() - showTimeRef.current;
      onHide?.();
      
      if (trackInteractions && viewDuration > 100) { // Only track if viewed for more than 100ms
        logger.info('Tooltip hidden', { 
          component: 'EnhancedTooltip',
          viewDuration,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [onShow, onHide, trackInteractions]);

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip open={isOpen} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Enhanced Avatar with fallback handling and loading states
interface EnhancedAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onLoadError?: (error: Event) => void;
  showLoadingState?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

export const EnhancedAvatar: React.FC<EnhancedAvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  className,
  onLoadError,
  showLoadingState = true,
  status,
}) => {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback((error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    onLoadError?.(error.nativeEvent);
    
    logger.warn('Avatar image failed to load', {
      component: 'EnhancedAvatar',
      src,
      alt
    });
  }, [onLoadError, src, alt]);

  return (
    <div className={cn('relative', className)}>
      <Avatar className={cn(sizeClasses[size], isLoading && showLoadingState && 'animate-pulse')}>
        {src && !hasError && (
          <AvatarImage
            src={src}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        <AvatarFallback className={isLoading ? 'bg-muted' : ''}>
          {isLoading && showLoadingState ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          ) : (
            fallback || alt?.charAt(0)?.toUpperCase() || '?'
          )}
        </AvatarFallback>
      </Avatar>
      
      {status && (
        <div
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
            statusColors[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

// Enhanced Progress with animations and milestones
interface EnhancedProgressProps {
  value?: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  showMilestones?: boolean;
  milestones?: number[];
  animated?: boolean;
  color?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  onMilestoneReached?: (milestone: number) => void;
}

export const EnhancedProgress: React.FC<EnhancedProgressProps> = ({
  value = 0,
  max = 100,
  className,
  showPercentage = false,
  showMilestones = false,
  milestones = [25, 50, 75],
  animated = true,
  color = 'default',
  size = 'md',
  onMilestoneReached,
}) => {
  const [previousValue, setPreviousValue] = useState(value);
  const [reachedMilestones, setReachedMilestones] = useState<Set<number>>(new Set());

  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    default: '[&>div]:bg-primary',
    success: '[&>div]:bg-green-500',
    warning: '[&>div]:bg-yellow-500',
    error: '[&>div]:bg-red-500',
  };

  // Check for milestone achievements
  useEffect(() => {
    if (value > previousValue) {
      milestones.forEach(milestone => {
        if (value >= milestone && !reachedMilestones.has(milestone) && previousValue < milestone) {
          setReachedMilestones(prev => new Set([...prev, milestone]));
          onMilestoneReached?.(milestone);
          
          logger.info('Progress milestone reached', {
            component: 'EnhancedProgress',
            milestone,
            currentValue: value,
            percentage: (milestone / max) * 100
          });
        }
      });
    }
    setPreviousValue(value);
  }, [value, previousValue, milestones, max, reachedMilestones, onMilestoneReached]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        {showPercentage && (
          <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
        )}
      </div>
      
      <div className="relative">
        <Progress
          value={percentage}
          className={cn(
            sizeClasses[size],
            colorClasses[color],
            animated && 'transition-all duration-500 ease-out'
          )}
        />
        
        {showMilestones && (
          <div className="absolute inset-0 flex items-center">
            {milestones.map(milestone => {
              const milestonePosition = (milestone / max) * 100;
              const isReached = reachedMilestones.has(milestone);
              
              return (
                <div
                  key={milestone}
                  className="absolute h-full w-px bg-background"
                  style={{ left: `${milestonePosition}%` }}
                >
                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full border-2 border-background',
                      isReached ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Badge with animations and interactions
interface EnhancedBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

export const EnhancedBadge: React.FC<EnhancedBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  animated = false,
  interactive = false,
  onClick,
  onRemove,
  showRemove = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const handleClick = useCallback(() => {
    if (interactive && onClick) {
      onClick();
      
      logger.info('Badge clicked', {
        component: 'EnhancedBadge',
        variant,
        timestamp: new Date().toISOString()
      });
    }
  }, [interactive, onClick, variant]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
    
    logger.info('Badge removed', {
      component: 'EnhancedBadge',
      variant,
      timestamp: new Date().toISOString()
    });
  }, [onRemove, variant]);

  return (
    <Badge
      variant={variant}
      className={cn(
        sizeClasses[size],
        interactive && 'cursor-pointer hover:opacity-80',
        animated && 'transition-all duration-200',
        animated && isHovered && 'scale-105',
        showRemove && 'pr-1',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="flex items-center gap-1">
        {children}
        {showRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="ml-1 rounded-full hover:bg-background/20 p-0.5"
            aria-label="Remove badge"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    </Badge>
  );
};