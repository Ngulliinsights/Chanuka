/**
 * Branded Empty State Component
 * 
 * Uses brand assets to create engaging empty states that maintain
 * brand consistency and provide clear calls to action.
 */

import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Button, ChanukaSmallLogo, DocumentShieldIcon } from '@client/lib/design-system';

interface BrandedEmptyStateProps {
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
}

/**
 * Empty state component with brand integration
 */
export const BrandedEmptyState: React.FC<BrandedEmptyStateProps> = ({
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
  className = '',
}) => {
  const renderIcon = () => {
    if (customIcon) return customIcon;

    switch (icon) {
      case 'shield':
        return <DocumentShieldIcon size="lg" className="opacity-20" />;
      case 'logo':
      default:
        return <ChanukaSmallLogo size="lg" className="opacity-20" />;
    }
  };

  const renderAction = () => {
    if (!actionLabel) return null;

    if (actionLink) {
      return (
        <Link to={actionLink}>
          <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300">
            {actionLabel}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      );
    }

    return (
      <Button
        size="lg"
        onClick={onAction}
        className="shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {actionLabel}
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    );
  };

  const renderSecondaryAction = () => {
    if (!secondaryActionLabel) return null;

    if (secondaryActionLink) {
      return (
        <Link to={secondaryActionLink}>
          <Button variant="outline" size="lg">
            {secondaryActionLabel}
          </Button>
        </Link>
      );
    }

    return (
      <Button variant="outline" size="lg" onClick={onSecondaryAction}>
        {secondaryActionLabel}
      </Button>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      {/* Icon */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-2xl" />
        <div className="relative z-10">{renderIcon()}</div>
      </div>

      {/* Content */}
      <div className="text-center max-w-md space-y-4 mb-8">
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {renderAction()}
        {renderSecondaryAction()}
      </div>
    </div>
  );
};

/**
 * Preset empty states for common scenarios
 */
export const EmptyStates = {
  NoBills: () => (
    <BrandedEmptyState
      title="No Bills Found"
      description="We couldn't find any bills matching your criteria. Try adjusting your filters or search terms."
      icon="shield"
      actionLabel="Browse All Bills"
      actionLink="/bills"
      secondaryActionLabel="Clear Filters"
    />
  ),

  NoSearchResults: () => (
    <BrandedEmptyState
      title="No Results Found"
      description="Your search didn't return any results. Try different keywords or browse our featured content."
      icon="logo"
      actionLabel="Explore Bills"
      actionLink="/bills"
      secondaryActionLabel="View Community"
      secondaryActionLink="/community"
    />
  ),

  NotAuthenticated: () => (
    <BrandedEmptyState
      title="Sign In Required"
      description="Create an account or sign in to access this feature and start tracking legislation that matters to you."
      icon="shield"
      actionLabel="Sign Up Free"
      actionLink="/auth?mode=register"
      secondaryActionLabel="Sign In"
      secondaryActionLink="/auth?mode=login"
    />
  ),

  NoNotifications: () => (
    <BrandedEmptyState
      title="No Notifications"
      description="You're all caught up! We'll notify you when there are updates on bills you're tracking."
      icon="logo"
      actionLabel="Track Bills"
      actionLink="/bills"
    />
  ),

  ComingSoon: () => (
    <BrandedEmptyState
      title="Coming Soon"
      description="We're working hard to bring you this feature. Stay tuned for updates!"
      icon="logo"
      actionLabel="Back to Home"
      actionLink="/"
    />
  ),
};

export default BrandedEmptyState;
