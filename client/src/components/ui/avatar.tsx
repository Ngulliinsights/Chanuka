/**
 * Avatar Component
 * User avatar display with fallback
 */

import React from 'react';
import { cn } from '@client/lib/utils';

interface AvatarProps {
  className?: string;
  children: React.ReactNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

interface AvatarFallbackProps {
  className?: string;
  children: React.ReactNode;
}

export function Avatar({ className, children }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt, className }: AvatarImageProps) {
  if (!src) return null;
  
  return (
    <img
      src={src}
      alt={alt}
      className={cn('aspect-square h-full w-full object-cover', className)}
    />
  );
}

export function AvatarFallback({ className, children }: AvatarFallbackProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium',
        className
      )}
    >
      {children}
    </div>
  );
}

export { Avatar as default };