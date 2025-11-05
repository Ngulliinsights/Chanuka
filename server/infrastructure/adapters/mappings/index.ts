/**
 * Entity Mappings Index
 * 
 * Exports all entity mappings for the DrizzleAdapter system.
 * Provides centralized access to all domain entity mappings.
 */

export { UserEntityMapping, userEntityMapping } from './user-mapping';
export { CommentEntityMapping, commentEntityMapping } from './comment-mapping';
export { BillEntityMapping, billEntityMapping, type BillEntity } from './bill-mapping';
export { NotificationEntityMapping, notificationEntityMapping } from './notification-mapping';

// Re-export the base EntityMapping interface
export type { EntityMapping } from '../drizzle-adapter';