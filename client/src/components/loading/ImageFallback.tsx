import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, Image as ImageIcon } from 'lucide-react';

export interface ImageFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'onLoad'> {
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  showError?: boolean;
  errorMessage?: string;
  retryAttempts?: number;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * ImageFallback component provides graceful degradation when images fail to load.
 * Features:
 * - Automatic fallback to placeholder or alternative image
 * - Retry mechanism for failed loads
 * - Accessible error states
 * - Progressive enhancement
 */
export const ImageFallback: React.FC<ImageFallbackProps> = ({
  src,
  alt,
  fallbackSrc,
  placeholder,
  showError = false,
  errorMessage = 'Image failed to load',
  retryAttempts = 1,
  onError,
  onLoad,
  className,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setImageLoaded(true);
    setHasError(false);
    onLoad?.(event);
  }, [onLoad]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);

    // Try fallback source first
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      return;
    }

    // Try retry if available
    if (retryCount < retryAttempts && currentSrc === src) {
      setRetryCount(prev => prev + 1);
      setCurrentSrc(src + `?retry=${retryCount + 1}`);
      setHasError(false);
      return;
    }

    // All attempts failed
    setHasError(true);
    onError?.(event);
  }, [hasError, fallbackSrc, currentSrc, retryCount, retryAttempts, src, onError]);

  // Reset state when src changes
  React.useEffect(() => {
    if (src !== currentSrc) {
      setCurrentSrc(src);
      setHasError(false);
      setIsLoading(true);
      setImageLoaded(false);
      setRetryCount(0);
    }
  }, [src, currentSrc]);

  // Render error state
  if (hasError && showError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted border-2 border-dashed border-muted-foreground/25 rounded-md',
          className
        )}
        style={{ width: props.width || '100%', height: props.height || '200px' }}
        role="img"
        aria-label={`${errorMessage}: ${alt || 'Image'}`}
      >
        <div className="flex flex-col items-center space-y-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm text-center px-2">{errorMessage}</span>
          {alt && <span className="text-xs text-center px-2 opacity-75">{alt}</span>}
        </div>
      </div>
    );
  }

  // Render placeholder while loading
  if (isLoading && placeholder && !imageLoaded) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ width: props.width || '100%', height: props.height || '200px' }}
        role="img"
        aria-label={`Loading: ${alt || 'Image'}`}
      >
        {placeholder}
      </div>
    );
  }

  // Render default placeholder
  if (hasError && !showError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-md',
          className
        )}
        style={{ width: props.width || '100%', height: props.height || '200px' }}
        role="img"
        aria-label={`${alt || 'Image'} (unavailable)`}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Render actual image
  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        isLoading ? 'opacity-0' : 'opacity-100',
        className
      )}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        ...props.style,
        display: isLoading && !imageLoaded ? 'none' : 'block',
      }}
    />
  );
};

// Default placeholder component
export const ImagePlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse bg-muted rounded-md flex items-center justify-center', className)}>
    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
  </div>
);

// Specialized image component with built-in loading states
export const SafeImage: React.FC<ImageFallbackProps> = (props) => (
  <ImageFallback
    {...props}
    placeholder={<ImagePlaceholder className="w-full h-full" />}
  />
);

export default ImageFallback;