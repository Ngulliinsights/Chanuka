/**
 * Authentication Domain Types
 * Standardized authentication types following the exemplary pattern
 */

export * from './user';
// export * from './auth-state'; // Commented out to avoid duplicate isAuthenticated export

/**
 * Authentication domain version and metadata
 */
export const AUTHENTICATION_DOMAIN_VERSION = '1.0.0' as const;
export const AUTHENTICATION_DOMAIN_DESCRIPTION = 'Standardized authentication and user management types' as const;