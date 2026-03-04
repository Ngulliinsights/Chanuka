/**
 * Test API Client
 * Provides typed API client for integration tests
 */

export interface TestApiClient {
  // Bills
  createBill(data: any): Promise<any>;
  getBill(id: string): Promise<any>;
  updateBill(id: string, data: any): Promise<any>;
  listBills(params?: any): Promise<any>;
  
  // Users
  createUser(data: any): Promise<any>;
  getUser(id: string): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  authenticateUser(credentials: any): Promise<any>;
  
  // Comments
  createComment(data: any): Promise<any>;
  getComments(billId: string): Promise<any>;
  
  // Search
  search(query: string, params?: any): Promise<any>;
  
  // Notifications
  getNotifications(userId: string): Promise<any>;
  markNotificationRead(id: string): Promise<any>;
}

/**
 * Create test API client
 */
export function createTestApiClient(baseUrl: string): TestApiClient {
  const apiUrl = `${baseUrl}/api`;
  
  async function request(method: string, path: string, data?: any) {
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
    
    return response.json();
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
