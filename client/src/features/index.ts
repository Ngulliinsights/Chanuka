/**
 * Features Module Index
 *
 * Central export point for all feature modules
 * Follows Feature-Sliced Design (FSD) architecture
 * 
 * Note: Using selective exports to avoid naming conflicts
 */

// Analytics Features moved to infrastructure

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

// Pretext Detection moved to analysis

// Search Features
export * from './search';

// Security Features
export * from './security';

// Users Features - selective exports to avoid conflicts
export {
  useProfile,
  useUpdateUserProfile,
  // NotificationPreferences, UserSettings excluded due to conflicts or missing exports
} from './users';

// Admin Features
export * from './admin';

// Monitoring Features
// Monitoring Features moved to admin

// Notifications Features moved to infrastructure

// Realtime Features moved or don't exist

// Accountability Features
export * from './accountability';
