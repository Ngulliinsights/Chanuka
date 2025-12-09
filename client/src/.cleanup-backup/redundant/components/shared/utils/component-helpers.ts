// Shared utility functions for components

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate test IDs for components
 */
export function generateTestId(component: string, element?: string): string {
  return element ? `${component}-${element}` : component;
}

/**
 * Common component size mappings
 */
export const componentSizes = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
} as const;

/**
 * Common theme mappings
 */
export const componentThemes = {
  light: 'bg-white text-gray-900',
  dark: 'bg-gray-900 text-white',
} as const;

/**
 * Common layout mappings
 */
export const componentLayouts = {
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  list: 'flex flex-col space-y-2',
} as const;

/**
 * Debounce function for component handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for component handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}