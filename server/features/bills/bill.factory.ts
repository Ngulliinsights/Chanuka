// ============================================================================
// BILL FACTORY - Dependency Injection
// ============================================================================
// Creates bill services with proper dependency injection.
// Single source of truth for dependency wiring.

import { BillRepository } from './domain/repositories/bill.repository';
import { SponsorRepository } from '@server/features/sponsors/domain/repositories/sponsor.repository';
import { BillDomainService } from './domain/services/bill.domain.service';
import { BillTrackingService } from './application/bill-tracking.service';

/**
 * Bill services container
 */
export interface BillServices {
  billRepository: BillRepository;
  sponsorRepository: SponsorRepository;
  billDomainService: BillDomainService;
  billTrackingService: BillTrackingService;
}

/**
 * Create bill services with dependency injection
 * 
 * @returns Bill services container
 * 
 * @example
 * ```typescript
 * const services = createBillServices();
 * 
 * // Use domain service
 * const result = await services.billDomainService.createBill({
 *   billNumber: 'BILL-2024-001',
 *   title: 'Test Bill',
 *   description: 'Test description',
 *   sponsorId: 'sponsor-123',
 *   affectedCounties: ['Nairobi']
 * });
 * 
 * // Use tracking service
 * await services.billTrackingService.trackBill('user-123', 1);
 * ```
 */
export function createBillServices(): BillServices {
  // Create repositories
  const billRepository = new BillRepository();
  const sponsorRepository = new SponsorRepository();

  // Create domain service with injected repositories
  const billDomainService = new BillDomainService(
    billRepository,
    sponsorRepository
  );

  // Create application service with injected dependencies
  const billTrackingService = new BillTrackingService(
    billRepository
  );

  return {
    billRepository,
    sponsorRepository,
    billDomainService,
    billTrackingService,
  };
}

/**
 * Singleton instance of bill services
 */
let billServicesInstance: BillServices | null = null;

/**
 * Get bill services singleton instance
 * 
 * @returns Bill services container
 */
export function getBillServices(): BillServices {
  if (!billServicesInstance) {
    billServicesInstance = createBillServices();
  }
  return billServicesInstance;
}

/**
 * Reset bill services (for testing)
 */
export function resetBillServices(): void {
  billServicesInstance = null;
}

/**
 * Set bill services (for testing with mocks)
 * 
 * @param services - Mock services
 */
export function setBillServices(services: BillServices): void {
  billServicesInstance = services;
}

/**
 * Export singleton instances for backward compatibility
 * 
 * MIGRATION NOTE: Prefer using getBillServices() for better testability
 */
export const billTrackingService = getBillServices().billTrackingService;
