/**
 * Features Module Index
 *
 * Central export point for all feature modules
 * Follows Feature-Sliced Design (FSD) architecture
 * 
 * Note: Using selective exports to avoid naming conflicts
 */

// Analytics Features
export * from './analytics';

// Bills Features - selective exports to avoid conflicts
export { 
  BillCard,
  BillList,
  BillHeader,
  useBills,
  // BillAnalysis, BillsPage, BillDetailPage, useBillDetail, useTrackBill excluded due to conflicts or missing exports
} from './bills';

// Community Features
export * from './community';

// Pretext Detection Features
export * from './pretext-detection';

// Search Features
export * from './search';

// Security Features
export * from './security';

// Users Features - selective exports to avoid conflicts
export type {
  UserProfile,
} from './users';
export {
  useUserProfile,
  useUpdateUserProfile,
  // NotificationPreferences, UserSettings excluded due to conflicts or missing exports
} from './users';

// Admin Features
export * from './admin';

// Monitoring Features
export * from './monitoring';

// Notifications Features
export * from './notifications';

// Realtime Features
export * from './realtime';
