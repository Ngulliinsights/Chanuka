import React from 'react';

import { cn } from '@client/lib/design-system/utils/cn';
import { ChanukaLogo } from './ChanukaLogo';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  variant?: 'default' | 'white' | 'dark';
}

export const Logo = React.memo<LogoProps>(
  ({ className = '', size = 'md', showText = true, variant = 'default' }) => {
    // Map legacy variant 'dark' to 'default' or handle effectively
    const brandVariant = variant === 'dark' ? 'default' : variant; // 'dark' usually means dark text on light bg, which is our default

    const sizeMap = {
      sm: 32,
      md: 48,
      lg: 64,
      xl: 96,
    };

    return (
      <div className={cn("flex items-center", className)}>
        <ChanukaLogo size={typeof size === 'number' ? size : sizeMap[size]} variant={brandVariant as any} />
      </div>
    );
  }
);

Logo.displayName = 'Logo';

export default Logo;
