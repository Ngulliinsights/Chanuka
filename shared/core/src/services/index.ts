/**
 * Service Layer Exports
 *
 * Central export point for all service interfaces and implementations.
 * Provides dependency-injected service abstractions for bills and notifications.
 */

// Service Interfaces
export type { IBillService } from './interfaces/bill-service.interface';
export type { INotificationService } from './interfaces/notification-service.interface';

// Test Service Implementations
export { BillTestService } from './test-implementations/bill-test-service';
export { NotificationTestService } from './test-implementations/notification-test-service';

