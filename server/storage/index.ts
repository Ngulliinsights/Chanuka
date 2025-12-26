/**
 * Server Storage Module
 * 
 * Provides lightweight storage abstractions with caching capabilities
 * for the Chanuka Legislative Transparency Platform.
 */

// Export the base storage class
export { BaseStorage } from './base';
export type { StorageConfig } from './base';

// Export specific storage implementations
export { UserStorage } from './user-storage';
export { BillStorage } from './bill-storage';

// Re-export for convenience
export default {
  BaseStorage: () => import('./base').then(m => m.BaseStorage),
  UserStorage: () => import('./user-storage').then(m => m.UserStorage),
  BillStorage: () => import('./bill-storage').then(m => m.BillStorage),
};