import React from 'react';
import { cn } from '@client/lib/design-system/utils/cn';
import { ChanukaShield } from './ChanukaShield';
import { ChanukaWordmark } from './ChanukaWordmark';

export interface ChanukaLogoProps {
  className?: string;
  size?: number; // Height of the shield
  variant?: 'brand' | 'white' | 'monochrome';
  showWordmark?: boolean;
  wordmarkClassName?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

/**
 * ChanukaLogo Component
 * 
 * A composite brand asset that combines the ChanukaShield and ChanukaWordmark.
 * 
 * @param size - Height of the shield in pixels (default: 48)
 * @param variant - Color variant: 'brand' (default), 'white', or 'monochrome'
 * @param showWordmark - Whether to display the wordmark alongside the shield
 * @param className - Additional classes for the container
 * @param wordmarkClassName - Additional classes for the wordmark
 */
export const ChanukaLogo = React.memo<ChanukaLogoProps>(({
  className,
  size = 48,
  variant = 'brand',
  showWordmark = false,
  wordmarkClassName,
  onClick,
  'aria-label': ariaLabel = 'Chanuka',
}) => {
  // Calculate wordmark size proportionally (wordmark is wide, shield is tall)
  // Reverting to ~4.5x ratio which works for the aspect ratios involved
  const wordmarkSize = Math.round(size * 4.5);
  
  // Determine wordmark color based on variant
  const wordmarkColor = variant === 'white' 
    ? 'white' 
    : variant === 'monochrome' 
    ? 'currentColor' 
    : '#1a2e49'; // Brand navy

  const isInteractive = Boolean(onClick);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 transition-all duration-300',
        isInteractive && 'cursor-pointer group',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      aria-label={ariaLabel}
    >
      {/* Shield with hover glow effect */}
      <div className="relative">
        {/* Glow effect */}
        <div 
          className={cn(
            'absolute inset-0 rounded-full blur-md opacity-0 transition-opacity duration-300',
            isInteractive && 'group-hover:opacity-50 group-focus-visible:opacity-50',
            variant === 'brand' && 'bg-blue-400',
            variant === 'white' && 'bg-white',
            variant === 'monochrome' && 'bg-current'
          )}
          aria-hidden="true"
        />
        
        {/* Shield */}
        <ChanukaShield
          size={size}
          variant={variant}
          className={cn(
            'relative z-10 transition-transform duration-300',
            isInteractive && 'group-hover:scale-105 group-focus-visible:scale-105'
          )}
        />
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <ChanukaWordmark
          size={wordmarkSize}
          color={wordmarkColor}
          className={cn(
            'transition-opacity duration-300',
            isInteractive && 'group-hover:opacity-90',
            wordmarkClassName
          )}
        />
      )}
    </div>
  );
});

ChanukaLogo.displayName = 'ChanukaLogo';

export default ChanukaLogo;