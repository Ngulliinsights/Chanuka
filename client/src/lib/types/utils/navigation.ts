/**
 * Navigation-related utility types
 */

// Route utilities
export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string | string[] | undefined>;
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
