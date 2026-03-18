import { memo } from 'react';

import { cn } from '@client/lib/design-system/utils/cn';
import { ChanukaLogo } from './ChanukaLogo';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  variant?: 'default' | 'white' | 'dark';
}

export const Logo = memo<LogoProps>(({ className = '', size = 'md', variant = 'default' }) => {
  // Map legacy variant 'dark' to 'monochrome', default to 'brand'
  const brandVariant = variant === 'dark' ? 'monochrome' : variant === 'white' ? 'white' : 'brand';

  const sizeMap: Record<string, number> = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  return (
    <div className={cn('flex items-center', className)}>
      <ChanukaLogo size={typeof size === 'number' ? size : sizeMap[size]} variant={brandVariant} />
    </div>
  );
});

Logo.displayName = 'Logo';

export default Logo;
