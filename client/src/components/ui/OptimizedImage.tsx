import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { logger } from '../utils/logger.js';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: 'blur' | 'empty' | string;
  quality?: number;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  lazy = true,
  placeholder = 'blur',
  quality = 75,
  priority = false,
  sizes,
  onLoad,
  onError,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, isInView]);

  // Generate optimized image URL
  const getOptimizedSrc = (originalSrc: string, width?: number, height?: number, quality?: number) => {
    // In a real implementation, you might use a service like Cloudinary, ImageKit, or Next.js Image Optimization
    // For now, we'll return the original src with query parameters for potential server-side optimization
    const url = new URL(originalSrc, window.location.origin);
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    if (quality) url.searchParams.set('q', quality.toString());
    
    return url.toString();
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc: string, width?: number) => {
    if (!width) return undefined;

    const breakpoints = [0.5, 1, 1.5, 2]; // Different pixel densities
    return breakpoints
      .map((multiplier) => {
        const scaledWidth = Math.round(width * multiplier);
        const optimizedSrc = getOptimizedSrc(originalSrc, scaledWidth, undefined, quality);
        return `${optimizedSrc} ${multiplier}x`;
      })
      .join(', ');
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Placeholder component
  const renderPlaceholder = () => {
    if (placeholder === 'empty') return null;
    
    if (typeof placeholder === 'string' && placeholder !== 'blur') {
      return (
        <img
          src={placeholder}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
      );
    }

    // Default blur placeholder
    return (
      <div
        className={cn(
          'absolute inset-0 bg-muted animate-pulse transition-opacity duration-300',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)',
          backgroundSize: '20px 20px',
        }}
      />
    );
  };

  // Error fallback
  const renderError = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {hasError ? (
        renderError()
      ) : (
        <>
          {renderPlaceholder()}
          {isInView && (
            <img
              src={getOptimizedSrc(src, width, height, quality)}
              srcSet={generateSrcSet(src, width)}
              sizes={sizes}
              alt={alt}
              loading={lazy && !priority ? 'lazy' : 'eager'}
              onLoad={handleLoad}
              onError={handleError}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              {...props}
            />
          )}
        </>
      )}
    </div>
  );
};

// Avatar component with optimized image
export interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

export const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  alt,
  size = 'md',
  fallback,
  className,
}) => {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const dimension = sizeMap[size];

  if (!src) {
    return (
      <div className={cn(
        'rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium',
        sizeClasses[size],
        className
      )}>
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn('rounded-full', sizeClasses[size], className)}
      priority={size === 'xl'} // Prioritize larger avatars
    />
  );
};

// Card image component
export interface OptimizedCardImageProps {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  className?: string;
}

export const OptimizedCardImage: React.FC<OptimizedCardImageProps> = ({
  src,
  alt,
  aspectRatio = 'video',
  className,
}) => {
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
  };

  return (
    <div className={cn('relative overflow-hidden rounded-lg', aspectRatioClasses[aspectRatio], className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="absolute inset-0"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

// Hero image component
export interface OptimizedHeroImageProps {
  src: string;
  alt: string;
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const OptimizedHeroImage: React.FC<OptimizedHeroImageProps> = ({
  src,
  alt,
  overlay = false,
  className,
  children,
}) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        priority={true} // Hero images should load immediately
        className="absolute inset-0"
        sizes="100vw"
      />
      {overlay && (
        <div className="absolute inset-0 bg-black/20" />
      )}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};