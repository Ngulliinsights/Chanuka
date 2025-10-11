import React from 'react';
import { cn } from '@/lib/utils';
import { logger } from '../utils/logger.js';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  variant?: 'default' | 'white' | 'dark';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8', 
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl', 
  xl: 'text-2xl'
};

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  textClassName = '',
  variant = 'default'
}) => {
  const logoClasses = cn(
    'object-contain transition-all duration-200',
    sizeClasses[size],
    variant === 'white' && 'filter brightness-0 invert',
    variant === 'dark' && 'filter brightness-0',
    className
  );

  const textClasses = cn(
    'font-bold text-primary transition-all duration-200',
    textSizeClasses[size],
    variant === 'white' && 'text-white',
    variant === 'dark' && 'text-gray-900',
    textClassName
  );

  return (
    <div className="flex items-center space-x-2">
      <img 
        src="/Chanuka_logo.svg" 
        alt="Chanuka Logo" 
        className={logoClasses}
      />
      {showText && (
        <span className={textClasses}>
          Chanuka
        </span>
      )}
    </div>
  );
};

export default Logo;