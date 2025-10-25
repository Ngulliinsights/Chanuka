import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging CSS classes conditionally
 * Combines clsx for conditional classes and tailwind-merge for resolving conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Common utility functions for design system components
 */

/**
 * Generate a unique ID for components
 */
export function generateId(prefix = "ds"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function for performance optimization
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
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a number with appropriate units (for spacing, sizing, etc.)
 */
export function formatUnit(value: number, unit: string = "px"): string {
  return `${value}${unit}`;
}

/**
 * Create a range of numbers
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}