/**
 * BrandedEmptyState Component
 * 
 * Creates engaging empty states that maintain brand consistency
 * and provide clear calls to action. Includes preset configurations
 * for common scenarios.
 */

import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@client/lib/design-system/interactive/Button';
import { ChanukaShield } from '@client/lib/design-system/media/ChanukaShield';
import { ChanukaLogo } from '@client/lib/design-system/media/ChanukaLogo';
import { cn } from '@client/lib/design-system/utils/cn';

export interface BrandedEmptyStateProps {
  title: string;
  description: string;
  icon?: 'logo' | 'shield' | 'custom';
  customIcon?: React.ReactNode;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionLink?: string;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * BrandedEmptyState Component
 * 
 * Provides consistent, branded empty state UI with optional actions.
 * 
 * @param title - Main heading text
 * @param description - Supporting description text
 * @param icon - Icon type: 'logo', 'shield', or 'custom' (default: 'logo')
 * @param actionLabel - Primary action button text
 * @param compact - Use smaller spacing (default: false)
 * 
 * @example
 * <BrandedEmptyState
 *   title="No Results Found"
 *   description="Try adjusting your search criteria"
 *   icon="shield"
 *   actionLabel="Clear Filters"
 *   onAction={handleClearFilters}
 * />
 */
export const BrandedEmptyState = React.memo<BrandedEmptyStateProps>(({
  title,
  description,
  icon = 'logo',
  customIcon,
  actionLabel,
  actionLink,
  onAction,
  secondaryActionLabel,
  secondaryActionLink,
  onSecondaryAction,
  className,
  compact = false,
}) => {
  const renderIcon = React.useCallback(() => {
    if (customIcon) {
      return <div className="w-20 h-20 flex items-center justify-center">{customIcon}</div>;
    }

    switch (icon) {
      case 'shield':
        return (
          <ChanukaShield 
            size={compact ? 64 : 80} 
            variant="brand" 
            className="opacity-20" 
          />
        );
      case 'logo':
      default:
        return (
          <ChanukaLogo 
            size={compact ? 64 : 80} 
            variant="brand" 
            showWordmark={false}
            className="opacity-20" 
          />
        );
    }
  }, [customIcon, icon, compact]);

  const renderAction = React.useCallback(() => {
    if (!actionLabel) return null;

    const buttonContent = (
      <>
        {actionLabel}
        <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
      </>
    );

    if (actionLink) {
      return (
        <Link to={actionLink} className="inline-block">
          <Button 
            size={compact ? 'md' : 'lg'} 
            className="shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {buttonContent}
          </Button>
        </Link>
      );
    }

    return (
      <Button
        size={compact ? 'md' : 'lg'}
        onClick={onAction}
        className="shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {buttonContent}
      </Button>
    );
  }, [actionLabel, actionLink, onAction, compact]);

  const renderSecondaryAction = React.useCallback(() => {
    if (!secondaryActionLabel) return null;

    if (secondaryActionLink) {
      return (
        <Link to={secondaryActionLink} className="inline-block">
          <Button variant="outline" size={compact ? 'md' : 'lg'}>
            {secondaryActionLabel}
          </Button>
        </Link>
      );
    }

    return (
      <Button 
        variant="outline" 
        size={compact ? 'md' : 'lg'} 
        onClick={onSecondaryAction}
      >
        {secondaryActionLabel}
      </Button>
    );
  }, [secondaryActionLabel, secondaryActionLink, onSecondaryAction, compact]);

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center px-4',
        compact ? 'py-12' : 'py-16',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon with Gradient Background */}
      <div className={cn("relative", compact ? "mb-6" : "mb-8")}>
        {/* Gradient glow effect */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-brand-navy/10 via-brand-teal/10 to-brand-gold/10 blur-2xl animate-pulse" 
          aria-hidden="true"
        />
        
        {/* Icon */}
        <div className="relative z-10">
          {renderIcon()}
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "text-center max-w-md space-y-3",
        compact ? "mb-6" : "mb-8"
      )}>
        <h3 className={cn(
          "font-bold text-gray-900",
          compact ? "text-xl" : "text-2xl"
        )}>
          {title}
        </h3>
        <p className={cn(
          "text-gray-600 leading-relaxed",
          compact ? "text-sm" : "text-base"
        )}>
          {description}
        </p>
      </div>

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {renderAction()}
          {renderSecondaryAction()}
        </div>
      )}
    </div>
  );
});

BrandedEmptyState.displayName = 'BrandedEmptyState';

/**
 * Preset Empty States
 * 
 * Pre-configured empty state components for common scenarios.
 * Provides consistent messaging and actions across the application.
 */
export const EmptyStates = {
  /**
   * No Bills Found
   * Use when search/filter returns no results
   */
  NoBills: React.memo<{ onClearFilters?: () => void }>(({ onClearFilters }) => (
    <BrandedEmptyState
      title="No Bills Found"
      description="We couldn't find any bills matching your criteria. Try adjusting your filters or search terms."
      icon="shield"
      actionLabel="Browse All Bills"
      actionLink="/bills"
      secondaryActionLabel="Clear Filters"
      onSecondaryAction={onClearFilters}
    />
  )),

  /**
   * No Search Results
   * Use for general search with no matches
   */
  NoSearchResults: React.memo(() => (
    <BrandedEmptyState
      title="No Results Found"
      description="Your search didn't return any results. Try different keywords or browse our featured content."
      icon="logo"
      actionLabel="Explore Bills"
      actionLink="/bills"
      secondaryActionLabel="View Community"
      secondaryActionLink="/community"
    />
  )),

  /**
   * Authentication Required
   * Use when user needs to sign in
   */
  NotAuthenticated: React.memo(() => (
    <BrandedEmptyState
      title="Sign In Required"
      description="Create an account or sign in to access this feature and start tracking legislation that matters to you."
      icon="shield"
      actionLabel="Sign Up Free"
      actionLink="/auth?mode=register"
      secondaryActionLabel="Sign In"
      secondaryActionLink="/auth?mode=login"
    />
  )),

  /**
   * No Notifications
   * Use in notifications panel when empty
   */
  NoNotifications: React.memo(() => (
    <BrandedEmptyState
      title="No Notifications"
      description="You're all caught up! We'll notify you when there are updates on bills you're tracking."
      icon="logo"
      actionLabel="Track Bills"
      actionLink="/bills"
      compact
    />
  )),

  /**
   * Coming Soon
   * Use for features under development
   */
  ComingSoon: React.memo<{ featureName?: string }>(({ featureName }) => (
    <BrandedEmptyState
      title={featureName ? `${featureName} Coming Soon` : 'Coming Soon'}
      description="We're working hard to bring you this feature. Stay tuned for updates!"
      icon="logo"
      actionLabel="Back to Home"
      actionLink="/"
    />
  )),

  /**
   * Error State
   * Use for general errors
   */
  Error: React.memo<{ onRetry?: () => void }>(({ onRetry }) => (
    <BrandedEmptyState
      title="Something Went Wrong"
      description="We encountered an error loading this content. Please try again or contact support if the problem persists."
      icon="shield"
      actionLabel="Try Again"
      onAction={onRetry}
      secondaryActionLabel="Contact Support"
      secondaryActionLink="/support"
    />
  )),
};

// Add display names for better debugging
EmptyStates.NoBills.displayName = 'EmptyStates.NoBills';
EmptyStates.NoSearchResults.displayName = 'EmptyStates.NoSearchResults';
EmptyStates.NotAuthenticated.displayName = 'EmptyStates.NotAuthenticated';
EmptyStates.NoNotifications.displayName = 'EmptyStates.NoNotifications';
EmptyStates.ComingSoon.displayName = 'EmptyStates.ComingSoon';
EmptyStates.Error.displayName = 'EmptyStates.Error';

export default BrandedEmptyState;