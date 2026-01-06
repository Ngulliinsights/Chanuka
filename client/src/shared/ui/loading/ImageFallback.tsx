import { Image as ImageIcon, AlertCircle } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';

import { cn } from '@/shared/design-system/utils/cn';

/**
 * Image fallback props
 */
export interface ImageFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  retryAttempts?: number;
  retryDelay?: number;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  showErrorState?: boolean;
}

/**
 * Image fallback component with retry logic
 */
export const ImageFallback = React.memo<ImageFallbackProps>(
  ({
    src,
    fallbackSrc,
    placeholder,
    retryAttempts = 2,
    retryDelay = 1000,
    onLoad,
    onError,
    showErrorState = true,
    className,
    alt = '',
    ...props
  }) => {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const handleLoad = useCallback(
      (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoading(false);
        setHasError(false);
        onLoad?.(event);
      },
      [onLoad]
    );

    const handleError = useCallback(
      (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoading(false);
        setHasError(true);

        // Try fallback first
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          setIsLoading(true);
          setHasError(false);
          return;
        }

        // Retry original source
        if (retryCount < retryAttempts && currentSrc === src) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            setCurrentSrc(`${src}?retry=${retryCount + 1}`);
            setIsLoading(true);
            setHasError(false);
          }, retryDelay);
          return;
        }

        onError?.(event);
      },
      [hasError, fallbackSrc, currentSrc, retryCount, retryAttempts, src, onError, retryDelay]
    );

    // Reset when src changes
    useEffect(() => {
      if (src !== currentSrc) {
        setCurrentSrc(src);
        setIsLoading(true);
        setHasError(false);
        setRetryCount(0);
      }
    }, [src, currentSrc]);

    // Loading state
    if (isLoading && !hasError) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded',
            className
          )}
        >
          {placeholder || (
            <div className="flex flex-col items-center gap-2 p-4">
              <ImageIcon className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          )}
        </div>
      );
    }

    // Error state
    if (hasError && showErrorState) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded',
            className
          )}
        >
          <div className="flex flex-col items-center gap-2 p-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="text-sm text-gray-500">Failed to load image</span>
          </div>
        </div>
      );
    }

    // Success state
    return (
      <img
        {...props}
        src={currentSrc}
        alt={alt}
        className={cn(className)}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          ...props.style,
          display: hasError && !showErrorState ? 'none' : undefined,
        }}
      />
    );
  }
);

ImageFallback.displayName = 'ImageFallback';

/**
 * Simple image placeholder component
 */
export const ImagePlaceholder = React.memo<{ className?: string }>(({ className }) => (
  <div
    className={cn(
      'flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded',
      className
    )}
  >
    <ImageIcon className="h-8 w-8 text-gray-400" />
  </div>
));

ImagePlaceholder.displayName = 'ImagePlaceholder';

/**
 * Safe image component with built-in fallbacks
 */
export const SafeImage = React.memo<ImageFallbackProps>(props => (
  <ImageFallback
    {...props}
    placeholder={<ImagePlaceholder className={props.className} />}
    showErrorState={true}
  />
));

SafeImage.displayName = 'SafeImage';

export default ImageFallback;
