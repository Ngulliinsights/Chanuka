/**
 * Mock Bill Data Source
 * 
 * Mock implementation of the BillDataSource interface.
 * Uses the mock data service to simulate database operations.
 */

import { logger } from '@server/infrastructure/observability';
import { bills } from '@server/infrastructure/schema';
import { mockBillDataService } from '../mocks/bill-mock-data';
import {
  BillDataSource,
  BillDataRecord,
  BillFilters,
  BillStats,
  DataSourceStatus,
} from './bill-data-source.interface';

export class MockBillDataSource implements BillDataSource {
  async findById(id: string): Promise<BillDataRecord | null> {
    logger.debug({ billId: id, dataSource: 'mock' }, 'Finding bill by ID using mock data');
    return await mockBillDataService.findById(id);
  }

  async findAll(filters?: BillFilters): Promise<BillDataRecord[]> {
    logger.debug({ filters, dataSource: 'mock' }, 'Finding bills using mock data');
    return await mockBillDataService.findAll(filters);
  }

  async count(filters?: BillFilters): Promise<number> {
    logger.debug({ filters, dataSource: 'mock' }, 'Counting bills using mock data');
    return await mockBillDataService.count(filters);
  }

  async getStats(): Promise<BillStats> {
    logger.debug({ dataSource: 'mock' }, 'Getting bill stats using mock data');
    return await mockBillDataService.getStats();
  }

  async isAvailable(): Promise<boolean> {
    return await mockBillDataService.isAvailable();
  }

  getStatus(): DataSourceStatus {
    const mockStatus = mockBillDataService.getStatus();
    return {
      type: 'mock',
      available: true,
      lastCheck: new Date(),
      metadata: {
        ...mockStatus,
        note: 'Mock data source - always available for development/testing',
      },
    };
  }
}