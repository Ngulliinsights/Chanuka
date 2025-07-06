const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async put(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};

// Bills API
export const billsApi = {
  async getBills() {
    return api.get('/api/bills');
  },
  
  async getBill(id: number) {
    return api.get(`/api/bills/${id}`);
  },
  
  async getBillComments(id: number) {
    return api.get(`/api/bills/${id}/comments`);
  },
  
  async createBillComment(billId: number, comment: any) {
    return api.post(`/api/bills/${billId}/comments`, comment);
  },
  
  async recordEngagement(billId: number, engagement: any) {
    return api.post(`/api/bills/${billId}/engagement`, engagement);
  },
  
  async getBillCategories() {
    return api.get('/api/bills/meta/categories');
  },
  
  async getBillStatuses() {
    return api.get('/api/bills/meta/statuses');
  }
};

// System API
export const systemApi = {
  async getHealth() {
    return api.get('/api/health');
  },
  
  async getStats() {
    return api.get('/api/health/stats');
  },
  
  async getActivity() {
    return api.get('/api/health/activity');
  },
  
  async getSchema() {
    return api.get('/api/system/schema');
  }
};