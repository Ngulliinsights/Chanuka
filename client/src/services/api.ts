// Central API service for the legislative transparency platform
import type { 
  Bill, User, Sponsor, Analysis, BillComment,
  UserProfile, BillEngagement, Notification 
} from '@shared/schema';

const API_BASE = '/api';

// Generic API request function
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Bill API functions
export const billsApi = {
  getAll: (params?: { category?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    
    const query = searchParams.toString();
    return apiRequest<Bill[]>('GET', `/bills${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => 
    apiRequest<Bill & { 
      sponsors: (Sponsor & { sponsorshipType: string })[];
      analysis: Analysis[];
      conflicts: any[];
      engagementStats: { views: number; comments: number; bookmarks: number };
    }>('GET', `/bills/${id}`),

  getComments: (billId: number) => 
    apiRequest<BillComment[]>('GET', `/bills/${billId}/comments`),

  addComment: (billId: number, comment: { content: string; commentType?: string; userId: string }) =>
    apiRequest<BillComment>('POST', `/bills/${billId}/comments`, comment),

  recordEngagement: (billId: number, engagement: { userId: string; engagementType: string; metadata?: any }) =>
    apiRequest<BillEngagement>('POST', `/bills/${billId}/engagement`, engagement),

  getCategories: () => 
    apiRequest<string[]>('GET', '/bills/meta/categories'),

  getStatuses: () => 
    apiRequest<string[]>('GET', '/bills/meta/statuses'),

  create: (bill: any) => 
    apiRequest<Bill>('POST', '/bills', bill),

  update: (id: number, bill: Partial<Bill>) => 
    apiRequest<Bill>('PUT', `/bills/${id}`, bill),
};

// Sponsor API functions
export const sponsorsApi = {
  getAll: () => 
    apiRequest<Sponsor[]>('GET', '/sponsors'),

  getById: (id: number) => 
    apiRequest<Sponsor & { 
      affiliations: any[];
      transparency: any[];
    }>('GET', `/sponsors/${id}`),

  getAffiliations: (id: number) => 
    apiRequest<any[]>('GET', `/sponsors/${id}/affiliations`),

  getTransparency: (id: number) => 
    apiRequest<any[]>('GET', `/sponsors/${id}/transparency`),

  create: (sponsor: any) => 
    apiRequest<Sponsor>('POST', '/sponsors', sponsor),

  update: (id: number, sponsor: Partial<Sponsor>) => 
    apiRequest<Sponsor>('PUT', `/sponsors/${id}`, sponsor),
};

// Analysis API functions
export const analysisApi = {
  getBillAnalysis: (billId: number) => 
    apiRequest<Analysis[]>('GET', `/bills/${billId}/analysis`),

  createAnalysis: (billId: number, analysis: any) => 
    apiRequest<Analysis>('POST', `/bills/${billId}/analysis`, analysis),

  getBillConflicts: (billId: number) => 
    apiRequest<any[]>('GET', `/bills/${billId}/conflicts`),
};

// System API functions
export const systemApi = {
  getHealth: () => 
    apiRequest<{ 
      status: string; 
      database: string; 
      timestamp: string; 
      userCount: number;
    }>('GET', '/health'),

  getStats: () => 
    apiRequest<{
      users: number;
      bills: number;
      comments: number;
      sponsors: number;
      lastUpdated: string;
    }>('GET', '/stats'),

  getActivity: () => 
    apiRequest<{
      recentUsers: any[];
      recentBills: any[];
      timestamp: string;
    }>('GET', '/activity'),

  getSchema: () => 
    apiRequest<{
      tables: Record<string, any[]>;
      tableCount: number;
      analyzed: string;
    }>('GET', '/schema'),

  getEnvironment: () => 
    apiRequest<{
      NODE_ENV: string;
      DATABASE_URL: string;
      PORT: string;
      timestamp: string;
    }>('GET', '/environment'),
};

// User API functions (to be implemented)
export const usersApi = {
  // These would be implemented when auth is added
  getCurrent: () => Promise.resolve(null),
  updateProfile: (profile: Partial<UserProfile>) => Promise.resolve(profile),
};

export default {
  bills: billsApi,
  sponsors: sponsorsApi,
  analysis: analysisApi,
  system: systemApi,
  users: usersApi,
};