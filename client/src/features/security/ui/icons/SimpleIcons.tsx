/**
 * SimpleIcons - Custom icon components
 * 
 * This file provides custom icons that are not available in lucide-react.
 * Re-exported for use in features/security UI components.
 */

import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * DataPrivacy icon for privacy-related features
 */
export const DataPrivacy: React.FC<IconProps> = ({ 
  className, 
  size = 24, 
  ...props 
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

/**
 * ActivityPulse icon for real-time monitoring
 */
export const ActivityPulse: React.FC<IconProps> = ({ 
  className, 
  size = 24, 
  ...props 
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export default {
  DataPrivacy,
  ActivityPulse,
};
