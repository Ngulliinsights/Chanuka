import React from 'react';
import { cn } from '@client/lib/design-system/utils/cn';

export interface LogoPatternProps {
  className?: string;
  opacity?: number;
  scale?: number;
  rotation?: number;
  color?: string;
  density?: 'sparse' | 'normal' | 'dense';
  animated?: boolean;
}

/**
 * LogoPattern Component
 * 
 * Renders a subtle, tiled background pattern using the Chanuka shield logo.
 * Perfect for section backgrounds, card decorations, or sidebar overlays.
 * 
 * @param opacity - Pattern opacity (0-1, default: 0.03)
 * @param scale - Size multiplier (default: 1)
 * @param rotation - Rotation in degrees (default: 0)
 * @param color - SVG fill color (default: 'currentColor')
 * @param density - Pattern density ('sparse' | 'normal' | 'dense', default: 'normal')
 * @param animated - Enable subtle floating animation (default: false)
 * 
 * @example
 * <LogoPattern opacity={0.05} rotation={15} density="dense" />
 */
export const LogoPattern = React.memo<LogoPatternProps>(({
  className,
  opacity = 0.03,
  scale = 1,
  rotation = 0,
  color = 'currentColor',
  density = 'normal',
  animated = false,
}) => {
  // Shield path from the Chanuka brand shield
  const shieldPath = "m0,557.35c3.79-11.65,7.29-22.45,11.28-34.7,3.59,12.11,6.84,23.08,10.28,34.7H0Z m1210.57,425.14c.6,5.79,1.71,12,1.8,18.22.24,16.97.94,34-.16,50.9-1.78,27.49-5.35,54.8-12.75,81.49-17.35,62.58-47.06,118.63-87.84,169.07-39.29,48.58-85.53,89.32-137.4,123.86-3.52,2.34-7.55,3.92-11.28,5.96-5.08,2.78-9.05-.48-12.41-3.02-22.41-16.91-44.75-33.92-66.73-51.39-8.82-7.01-16.8-15.12-24.92-22.98-38.85-37.64-73.51-78.64-99.13-126.58-11.42-21.36-21.7-43.32-29.52-66.34-8.98-26.4-15.68-53.24-19.34-80.99-2.96-22.43-4.34-44.87-3.43-67.33,2.08-51,12.48-100.38,33.16-147.16,18.22-41.2,42.6-78.76,71.34-113.42,10.62-12.8,21.69-25.29,33.29-37.21,28.7-29.47,58.55-57.69,93.15-80.36,3.33-2.18,6.68-4.34,9.92-6.65,7.87-5.6,15.66-6.18,23.66-.17,20.58,15.46,41.58,30.4,61.7,46.44,10.58,8.43,19.62,18.78,29.43,28.18,36.45,34.9,68.26,73.55,93.41,117.36,8.49,14.78,15.8,30.31,22.68,45.92,6.23,14.16,11.89,28.67,16.43,43.44,4.2,13.67,6.67,27.88,9.7,41.9,1.86,8.61,3.36,17.3,4.95,25.97.27,1.46.19,2.97.3,4.88Z";

  // Pattern density settings
  const densityScale = {
    sparse: 0.2,
    normal: 0.15,
    dense: 0.1,
  };

  const patternId = React.useId();

  return (
    <div 
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none z-0",
        animated && "animate-pattern-float",
        className
      )}
      aria-hidden="true"
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="xMidYMid slice"
        className={cn(
          "w-full h-full",
          animated && "transition-transform duration-[30000ms] ease-in-out"
        )}
        style={{ 
          opacity,
          transform: animated ? 'translateY(-2%)' : undefined,
        }}
      >
        <defs>
          <pattern 
            id={patternId}
            x="0" 
            y="0" 
            width={densityScale[density] * scale} 
            height={densityScale[density] * scale} 
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${rotation})`}
          >
            <path 
              d={shieldPath} 
              fill={color} 
              transform="scale(0.04)"
              className="transition-colors duration-500"
            />
          </pattern>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill={`url(#${patternId})`} 
        />
      </svg>

      {/* Optional gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/10" />
    </div>
  );
});

LogoPattern.displayName = 'LogoPattern';

export default LogoPattern;