/**
 * Test API Client
 * Provides typed API client for integration tests
 */

import type { ApiResponse } from '../../../shared/types/api/contracts/core.contracts';
import type {
  CreateBillRequest,
  CreateBillResponse,
  GetBillResponse,
  UpdateBillRequest,
  UpdateBillResponse,
  ListBillsResponse,
} from '../../../shared/types/api/contracts/bill.contract';
import type {
  CreateUserResponse,
  GetUserResponse,
  UpdateUserResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../../shared/types/api/contracts/user.contract';
import type {
  CreateCommentRequest,
  CreateCommentResponse,
  ListCommentsResponse,
} from '../../../shared/types/api/contracts/comment.contract';
import type {
  SearchRequest,
  SearchResponse,
} from '../../../shared/types/api/contracts/search.contract';
import type {
  GetNotificationsResponse,
  MarkNotificationReadResponse,
} from '../../../shared/types/api/contracts/notification.contract';

export interface TestApiClient {
  // Bills
  createBill(data: CreateBillRequest): Promise<ApiResponse<CreateBillResponse>>;
  getBill(id: string): Promise<ApiResponse<GetBillResponse>>;
  updateBill(id: string, data: UpdateBillRequest): Promise<ApiResponse<UpdateBillResponse>>;
  listBills(params?: Record<string, string>): Promise<ApiResponse<ListBillsResponse>>;
  
  // Users
  createUser(data: CreateUserRequest): Promise<ApiResponse<CreateUserResponse>>;
  getUser(id: string): Promise<ApiResponse<GetUserResponse>>;
  updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<UpdateUserResponse>>;
  authenticateUser(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string }>>;
  
  // Comments
  createComment(data: CreateCommentRequest): Promise<ApiResponse<CreateCommentResponse>>;
  getComments(billId: string): Promise<ApiResponse<ListCommentsResponse>>;
  
  // Search
  search(query: string, params?: Record<string, string>): Promise<ApiResponse<SearchResponse>>;
  
  // Notifications
  getNotifications(userId: string): Promise<ApiResponse<GetNotificationsResponse>>;
  markNotificationRead(id: string): Promise<ApiResponse<MarkNotificationReadResponse>>;
}

/**
 * Create test API client
 */
export function createTestApiClient(baseUrl: string): TestApiClient {
  const apiUrl = `${baseUrl}/api`;
  
  async function request<T>(method: string, path: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<ApiResponse<T>>;
  }
  
  return {
    // Bills
    createBill: (data) => request('POST', '/bills', data),
    getBill: (id) => request('GET', `/bills/${id}`),
    updateBill: (id, data) => request('PUT', `/bills/${id}`, data),
    listBills: (params) => request('GET', `/bills${params ? '?' + new URLSearchParams(params) : ''}`),
    
    // Users
    createUser: (data) => request('POST', '/users', data),
    getUser: (id) => request('GET', `/users/${id}`),
    updateUser: (id, data) => request('PUT', `/users/${id}`, data),
    authenticateUser: (credentials) => request('POST', '/auth/login', credentials),
    
    // Comments
    createComment: (data) => request('POST', '/comments', data),
    getComments: (billId) => request('GET', `/comments?bill_id=${billId}`),
    
    // Search
    search: (query, params) => request('GET', `/search?q=${query}${params ? '&' + new URLSearchParams(params) : ''}`),
    
    // Notifications
    getNotifications: (userId) => request('GET', `/notifications?user_id=${userId}`),
    markNotificationRead: (id) => request('PUT', `/notifications/${id}/read`),
  };
}
