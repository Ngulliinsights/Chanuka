/**
 * Test API Client
 * HTTP client for making requests to test server
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class TestApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      validateStatus: () => true, // Don't throw on any status code
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  /**
   * Login and set auth token
   */
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.post('/api/auth/login', { email, password });
    
    if (response.status === 200 && response.data.token) {
      this.setAuthToken(response.data.token);
      return response.data;
    }
    
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  /**
   * Logout and clear auth token
   */
  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } finally {
      this.clearAuthToken();
    }
  }

  /**
   * Register a new user
   */
  async register(userData: { email: string; password: string; username?: string }): Promise<any> {
    const response = await this.post('/api/auth/register', userData);
    return response.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.get('/api/auth/me');
    return response.data;
  }

  /**
   * Create a user (admin endpoint)
   */
  async createUser(userData: any): Promise<any> {
    const response = await this.post('/api/users', userData);
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<any> {
    const response = await this.get(`/api/users/${userId}`);
    return response.data;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, userData: any): Promise<any> {
    const response = await this.put(`/api/users/${userId}`, userData);
    return response.data;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await this.delete(`/api/users/${userId}`);
  }

  /**
   * Create a bill
   */
  async createBill(billData: any): Promise<any> {
    const response = await this.post('/api/bills', billData);
    return response.data;
  }

  /**
   * Get bill by ID
   */
  async getBill(billId: string): Promise<any> {
    const response = await this.get(`/api/bills/${billId}`);
    return response.data;
  }

  /**
   * Update bill
   */
  async updateBill(billId: string, billData: any): Promise<any> {
    const response = await this.put(`/api/bills/${billId}`, billData);
    return response.data;
  }

  /**
   * Get all bills
   */
  async getBills(params?: Record<string, any>): Promise<any> {
    const response = await this.get('/api/bills', { params });
    return response.data;
  }

  /**
   * Create a comment
   */
  async createComment(commentData: any): Promise<any> {
    const response = await this.post('/api/comments', commentData);
    return response.data;
  }

  /**
   * Get comments for a bill
   */
  async getBillComments(billId: string): Promise<any> {
    const response = await this.get(`/api/bills/${billId}/comments`);
    return response.data;
  }
}

/**
 * Create a test API client
 */
export function createTestApiClient(baseUrl: string): TestApiClient {
  return new TestApiClient({ baseUrl });
}
