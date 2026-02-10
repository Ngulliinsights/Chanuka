/**
 * Centralized Brand Assets Component
 * 
 * Provides optimized, accessible SVG components for all Chanuka brand assets
 * with intelligent sizing, theming, and responsive behavior.
 * 
 * Usage:
 * - Use specific variants for different contexts (hero, navigation, footer, etc.)
 * - All components support className for custom styling
 * - Automatic accessibility attributes included
 */

import React from 'react';

interface BrandAssetProps {
  className?: string;
  variant?: 'primary' | 'white' | 'dark' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  'aria-label'?: string;
}

/**
 * Size mappings for consistent scaling - UPDATED for better visibility
 */
const sizeMap = {
  xs: 'w-8 h-8',      // 32px - Small icons
  sm: 'w-16 h-16',    // 64px - Navigation mobile
  md: 'w-32 h-32',    // 128px - Navigation desktop, cards
  lg: 'w-48 h-48',    // 192px - Section headers
  xl: 'w-64 h-64',    // 256px - Hero sections
  full: 'w-full h-auto', // Responsive full width
};

/**
 * Main Chanuka Logo with Shield and Document
 * Best for: Hero sections, splash screens, large branding moments
 */
export const ChanukaFullLogo: React.FC<BrandAssetProps> = ({
  className = '',
  size = 'md',
  'aria-label': ariaLabel = 'Chanuka - Democracy in Your Hands',
}) => {
  return (
    <img
      src="/SVG/Chanuka_logo.svg"
      alt={ariaLabel}
      className={`${sizeMap[size]} ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Chanuka Sidemark (Logo + Wordmark)
 * Best for: Navigation bars, headers, compact branding
 */
export const ChanukaSidemark: React.FC<BrandAssetProps> = ({
  className = '',
  size = 'sm',
  'aria-label': ariaLabel = 'Chanuka',
}) => {
  return (
    <img
      src="/SVG/CHANUKA_SIDEMARK.svg"
      alt={ariaLabel}
      className={`${sizeMap[size]} ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Chanuka Wordmark Only
 * Best for: Horizontal layouts, footers, minimal branding
 */
export const ChanukaWordmark: React.FC<BrandAssetProps> = ({
  className = '',
  size = 'sm',
  'aria-label': ariaLabel = 'Chanuka',
}) => {
  return (
    <img
      src="/SVG/wordmark.svg"
      alt={ariaLabel}
      className={`${sizeMap[size]} ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Document in Shield Icon
 * Best for: Security features, document protection, trust indicators
 */
export const DocumentShieldIcon: React.FC<BrandAssetProps> = ({
  className = '',
  size = 'md',
  'aria-label': ariaLabel = 'Secure Document',
}) => {
  return (
    <img
      src="/SVG/doc_in_shield.svg"
      alt={ariaLabel}
      className={`${sizeMap[size]} ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Alternative Small Logo
 * Best for: Favicons, small UI elements, loading states
 */
export const ChanukaSmallLogo: React.FC<BrandAssetProps> = ({
  className = '',
  size = 'xs',
  'aria-label': ariaLabel = 'Chanuka',
}) => {
  return (
    <img
      src="/SVG/alternative_small.svg"
      alt={ariaLabel}
      className={`${sizeMap[size]} ${className}`}
      loading="lazy"
    />
  );
};

/**
 * Animated Logo Component
 * Adds subtle animation for loading states or hero sections
 */
export const AnimatedChanukaLogo: React.FC<BrandAssetProps & { animate?: boolean }> = ({
  className = '',
  size = 'lg',
  animate = true,
  'aria-label': ariaLabel = 'Chanuka - Loading',
}) => {
  return (
    <div className={`${animate ? 'animate-pulse' : ''} ${className}`}>
      <ChanukaFullLogo size={size} aria-label={ariaLabel} />
    </div>
  );
};

/**
 * Brand Asset Grid - Showcase multiple brand elements
 * Best for: About pages, brand guidelines, design system documentation
 */
export const BrandAssetGrid: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-8 ${className}`}>
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm">
        <ChanukaFullLogo size="lg" />
        <p className="text-sm text-gray-600 font-medium">Full Logo</p>
      </div>
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm">
        <ChanukaSidemark size="lg" />
        <p className="text-sm text-gray-600 font-medium">Sidemark</p>
      </div>
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm">
        <ChanukaWordmark size="lg" />
        <p className="text-sm text-gray-600 font-medium">Wordmark</p>
      </div>
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm">
        <DocumentShieldIcon size="lg" />
        <p className="text-sm text-gray-600 font-medium">Document Shield</p>
      </div>
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm">
        <ChanukaSmallLogo size="lg" />
        <p className="text-sm text-gray-600 font-medium">Small Logo</p>
      </div>
    </div>
  );
};

/**
 * Hero Brand Element
 * Large, prominent branding for landing pages
 */
export const HeroBrandElement: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/10 to-brand-gold/10 blur-3xl" />
      <ChanukaFullLogo size="xl" className="relative z-10 drop-shadow-2xl" />
    </div>
  );
};

/**
 * Floating Brand Accent
 * Decorative background element for visual interest
 */
export const FloatingBrandAccent: React.FC<{
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
} & React.HTMLAttributes<HTMLDivElement>> = ({ className = '', position = 'top-right', style, ...props }) => {
  const positionClasses = {
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} opacity-5 pointer-events-none ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    >
      <ChanukaFullLogo size="full" className="w-96 h-96" />
    </div>
  );
};

export default {
  ChanukaFullLogo,
  ChanukaSidemark,
  ChanukaWordmark,
  DocumentShieldIcon,
  ChanukaSmallLogo,
  AnimatedChanukaLogo,
  BrandAssetGrid,
  HeroBrandElement,
  FloatingBrandAccent,
};
