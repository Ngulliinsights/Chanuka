/**
 * Main API Service
 * Centralized API exports for the client application
 */

// Re-export from apiService for backward compatibility
export { apiService as api } from './apiService';

// Re-export specific API services
export { billsApiService as billsApi } from './billsApiService';

// System API placeholder
export const systemApi = {
  getHealth: async () => {
    const response = await fetch('/api/health');
    return response.json();
  },
  getStats: async () => {
    const response = await fetch('/api/stats');
    return response.json();
  },
  getActivity: async () => {
    const response = await fetch('/api/activity');
    return response.json();
  }
};

// Auth API functions
export const login = async (credentials: { email: string; password: string }) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return response.json();
};

export const register = async (userData: any) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch('/api/auth/me');
  return response.json();
};

// Bills API functions
export const getBills = async (params?: any) => {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  const response = await fetch(`/api/bills${queryString ? `?${queryString}` : ''}`);
  return response.json();
};

export const getBill = async (id: string | number) => {
  const response = await fetch(`/api/bills/${id}`);
  return response.json();
};

export const searchBills = async (query: string, filters?: any) => {
  const params = { query, ...filters };
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`/api/bills/search?${queryString}`);
  return response.json();
};

// Comments API functions
export const getComments = async (billId: string | number) => {
  const response = await fetch(`/api/bills/${billId}/comments`);
  return response.json();
};

export const createComment = async (billId: string | number, content: string) => {
  const response = await fetch(`/api/bills/${billId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  return response.json();
};

// User profile API functions
export const updateProfile = async (profileData: any) => {
  const response = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  return response.json();
};

export const updatePreferences = async (preferences: any) => {
  const response = await fetch('/api/user/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences)
  });
  return response.json();
};

// Error handling
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  throw error;
};

export const createApiClient = () => {
  // Return a basic API client
  return {
    get: async (url: string) => {
      const response = await fetch(url);
      return { data: await response.json() };
    },
    post: async (url: string, data: any) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return { data: await response.json() };
    }
  };
};

export const apiClient = createApiClient();