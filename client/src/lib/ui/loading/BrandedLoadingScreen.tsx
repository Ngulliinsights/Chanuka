/**
 * Branded Loading Screen Component
 * 
 * Uses Chanuka brand assets to create an engaging loading experience
 * that reinforces brand identity while content loads.
 */

import React from 'react';

import { AnimatedChanukaLogo, ChanukaSmallLogo } from '@client/lib/design-system';

interface BrandedLoadingScreenProps {
  message?: string;
  variant?: 'full' | 'inline' | 'minimal';
  showProgress?: boolean;
  progress?: number;
}

/**
 * Full-screen branded loading experience
 */
export const BrandedLoadingScreen: React.FC<BrandedLoadingScreenProps> = ({
  message = 'Loading...',
  variant = 'full',
  showProgress = false,
  progress = 0,
}) => {
  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin">
          <ChanukaSmallLogo size="sm" />
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AnimatedChanukaLogo size="md" animate={true} />
        <p className="text-gray-600 text-sm">{message}</p>
        {showProgress && (
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Full screen variant
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        {/* Animated logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl animate-pulse" />
          <AnimatedChanukaLogo size="xl" animate={true} className="relative z-10" />
        </div>

        {/* Loading message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
          <p className="text-gray-600">Preparing your civic engagement platform</p>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-64 mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 transition-all duration-300 animate-shimmer"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}%</p>
          </div>
        )}

        {/* Loading dots animation */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton loader with brand accent
 */
export const BrandedSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="flex items-center space-x-4">
        <ChanukaSmallLogo size="xs" className="opacity-20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
};

export default BrandedLoadingScreen;
