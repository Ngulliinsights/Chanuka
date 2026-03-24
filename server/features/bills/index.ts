import { bills } from '@server/infrastructure/schema';
// Bills Feature - Main Exports
// This is the public API for the bills feature

// Routes
export { router } from './presentation/http/bills.routes';

// Factory and Services (NEW - Repository Pattern)
export { 
  getBillServices, 
  createBillServices,
  resetBillServices,
  setBillServices,
  billTrackingService 
} from './bill.factory';

export type { BillServices } from './bill.factory';

// Legacy Services (for backward compatibility)
export { cachedBillService } from './application/bill-service';
export { BillServiceAdapter } from './application/bill-service-adapter';

// Integration Components (NEW - Cross-Feature Integration)
export { billIntegrationOrchestrator, BillIntegrationOrchestrator } from './application/bill-integration-orchestrator';
export { billLifecycleHooks, BillLifecycleHooks } from './application/bill-lifecycle-hooks';

// Domain
export { BillRepository } from './domain/repositories/bill.repository';
export { BillDomainService } from './domain/services/bill.domain.service';

// Types
export type { 
  Bill, 
  InsertBill, 
  BillStatus,
  BillQueryOptions,
  BillSearchOptions 
} from './domain/repositories/bill.repository';








































