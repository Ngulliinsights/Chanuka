/**
 * Bill API Service
 * Type-safe bill API calls using endpoint contracts
 */

import { BillEndpoints } from '@shared/types/api/contracts';
import type {
  CreateBillRequest,
  CreateBillResponse,
  UpdateBillRequest,
  UpdateBillResponse,
  GetBillRequest,
  GetBillResponse,
  ListBillsRequest,
  ListBillsResponse,
  DeleteBillRequest,
  DeleteBillResponse,
  GetBillEngagementRequest,
  GetBillEngagementResponse,
} from '@shared/types/api/contracts';
import { contractApiClient } from '../contract-client';
import type { EndpointCallResult } from '@shared/types/api/contracts';

/**
 * Bill API Service
 * Provides type-safe methods for bill-related API calls
 */
export const billApiService = {
  /**
   * Create a new bill
   */
  async create(request: CreateBillRequest): Promise<EndpointCallResult<CreateBillResponse>> {
    return contractApiClient.call(BillEndpoints.create, request);
  },

  /**
   * Get bill by ID
   */
  async getById(billId: string): Promise<EndpointCallResult<GetBillResponse>> {
    return contractApiClient.callWithParams(
      BillEndpoints.getById,
      { id: billId },
      undefined
    );
  },

  /**
   * Update bill
   */
  async update(
    billId: string,
    request: UpdateBillRequest
  ): Promise<EndpointCallResult<UpdateBillResponse>> {
    return contractApiClient.callWithParams(
      BillEndpoints.update,
      { id: billId },
      request
    );
  },

  /**
   * List bills with pagination, filtering, and sorting
   */
  async list(query?: ListBillsRequest): Promise<EndpointCallResult<ListBillsResponse>> {
    return contractApiClient.callWithQuery(
      BillEndpoints.list,
      query || {}
    );
  },

  /**
   * Delete bill
   */
  async delete(billId: string): Promise<EndpointCallResult<DeleteBillResponse>> {
    return contractApiClient.callWithParams(
      BillEndpoints.delete,
      { id: billId },
      undefined
    );
  },

  /**
   * Get bill engagement metrics
   */
  async getEngagement(billId: string): Promise<EndpointCallResult<GetBillEngagementResponse>> {
    return contractApiClient.callWithParams(
      BillEndpoints.getEngagement,
      { id: billId },
      undefined
    );
  },
};
