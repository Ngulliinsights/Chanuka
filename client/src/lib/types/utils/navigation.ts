/**
 * Navigation-related utility types
 */

// Route utilities
export type RouteParams = Record<string, string>;
// QueryParams is re-exported from common.ts to avoid duplication
export type { QueryParams } from './common';
export type NavigationState = Record<string, any>;

// Authorization utilities
export type Permission = string;
export type Role = {
  name: string;
  permissions: Permission[];
  priority?: number;
};

export type AuthCheck = {
  authorized: boolean;
  reason?: string;
};
