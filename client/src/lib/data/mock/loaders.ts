/**
 * Mock Data Loaders
 * Provides mock data loading functionality for development
 */

export const mockDataLoaders = {
  loadBills: async () => {
    return [];
  },
  
  loadSponsors: async () => {
    return [];
  },
  
  loadUsers: async () => {
    return [];
  },
};

export default mockDataLoaders;


export const dataLoaders = mockDataLoaders;
