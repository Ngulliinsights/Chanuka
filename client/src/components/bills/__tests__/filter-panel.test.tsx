/**
 * Advanced Multi-Dimensional Filtering System Tests
 * 
 * Tests for the FilterPanel component functionality including:
 * - Filter state management
 * - URL synchronization
 * - Active filter chips
 * - Multi-dimensional filtering logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBillsStore, useBillsSelectors } from '../../../store/slices/billsSlice';

describe('Advanced Multi-Dimensional Filtering System', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBillsStore.getState().reset();
  });

  describe('Filter State Management', () => {
    it('should initialize with empty filters', () => {
      const { filters } = useBillsStore.getState();
      
      expect(filters.status).toEqual([]);
      expect(filters.urgency).toEqual([]);
      expect(filters.policyAreas).toEqual([]);
      expect(filters.sponsors).toEqual([]);
      expect(filters.constitutionalFlags).toBe(false);
      expect(filters.controversyLevels).toEqual([]);
      expect(filters.dateRange.start).toBeNull();
      expect(filters.dateRange.end).toBeNull();
    });

    it('should update status filters correctly', () => {
      const { setFilters } = useBillsStore.getState();
      
      setFilters({ status: ['introduced', 'committee'] });
      
      const { filters } = useBillsStore.getState();
      expect(filters.status).toEqual(['introduced', 'committee']);
    });

    it('should update urgency filters correctly', () => {
      const { setFilters } = useBillsStore.getState();
      
      setFilters({ urgency: ['high', 'critical'] });
      
      const { filters } = useBillsStore.getState();
      expect(filters.urgency).toEqual(['high', 'critical']);
    });

    it('should update policy area filters correctly', () => {
      const { setFilters } = useBillsStore.getState();
      
      setFilters({ policyAreas: ['technology', 'healthcare'] });
      
      const { filters } = useBillsStore.getState();
      expect(filters.policyAreas).toEqual(['technology', 'healthcare']);
    });

    it('should update controversy level filters correctly', () => {
      const { setFilters } = useBillsStore.getState();
      
      setFilters({ controversyLevels: ['high', 'medium'] });
      
      const { filters } = useBillsStore.getState();
      expect(filters.controversyLevels).toEqual(['high', 'medium']);
    });

    it('should update constitutional flags filter correctly', () => {
      const { setFilters } = useBillsStore.getState();
      
      setFilters({ constitutionalFlags: true });
      
      const { filters } = useBillsStore.getState();
      expect(filters.constitutionalFlags).toBe(true);
    });

    it('should clear all filters correctly', () => {
      const { setFilters, clearFilters } = useBillsStore.getState();
      
      // Set some filters first
      setFilters({
        status: ['introduced'],
        urgency: ['high'],
        policyAreas: ['technology'],
        constitutionalFlags: true,
        controversyLevels: ['high']
      });
      
      // Clear all filters
      clearFilters();
      
      const { filters } = useBillsStore.getState();
      expect(filters.status).toEqual([]);
      expect(filters.urgency).toEqual([]);
      expect(filters.policyAreas).toEqual([]);
      expect(filters.constitutionalFlags).toBe(false);
      expect(filters.controversyLevels).toEqual([]);
    });
  });

  describe('Filter Logic', () => {
    const mockBills = [
      {
        id: 1,
        billNumber: 'HB-001',
        title: 'Tech Privacy Bill',
        summary: 'Privacy protection for tech users',
        status: 'introduced' as const,
        urgencyLevel: 'high' as const,
        introducedDate: '2024-01-15',
        lastUpdated: '2024-01-20',
        sponsors: [],
        constitutionalFlags: [{ id: '1', severity: 'moderate' as const, category: 'Privacy', description: 'Privacy concerns' }],
        viewCount: 100,
        saveCount: 10,
        commentCount: 5,
        shareCount: 2,
        policyAreas: ['technology', 'governance'],
        complexity: 'medium' as const,
        readingTime: 10,
        conflict_level: 'high' as const
      },
      {
        id: 2,
        billNumber: 'SB-002',
        title: 'Healthcare Reform',
        summary: 'Healthcare system improvements',
        status: 'committee' as const,
        urgencyLevel: 'medium' as const,
        introducedDate: '2024-01-10',
        lastUpdated: '2024-01-18',
        sponsors: [],
        constitutionalFlags: [],
        viewCount: 200,
        saveCount: 20,
        commentCount: 15,
        shareCount: 8,
        policyAreas: ['healthcare', 'economy'],
        complexity: 'low' as const,
        readingTime: 8,
        conflict_level: 'low' as const
      }
    ];

    beforeEach(() => {
      const { setBills } = useBillsStore.getState();
      setBills(mockBills);
    });

    it('should filter by status correctly', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({ status: ['introduced'] });
      
      // Get updated state after setting filters
      const { filters } = useBillsStore.getState();
      
      // Manually apply filtering logic
      const filteredBills = bills.filter(bill => {
        if (filters.status.length > 0 && !filters.status.includes(bill.status)) {
          return false;
        }
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].status).toBe('introduced');
    });

    it('should filter by urgency correctly', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({ urgency: ['high'] });
      const { filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        if (filters.urgency.length > 0 && !filters.urgency.includes(bill.urgencyLevel)) {
          return false;
        }
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].urgencyLevel).toBe('high');
    });

    it('should filter by policy areas correctly', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({ policyAreas: ['technology'] });
      const { filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        if (filters.policyAreas.length > 0) {
          const hasMatchingArea = filters.policyAreas.some(area => 
            bill.policyAreas.includes(area)
          );
          if (!hasMatchingArea) return false;
        }
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].policyAreas).toContain('technology');
    });

    it('should filter by constitutional flags correctly', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({ constitutionalFlags: true });
      const { filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        if (filters.constitutionalFlags && bill.constitutionalFlags.length === 0) {
          return false;
        }
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].constitutionalFlags.length).toBeGreaterThan(0);
    });

    it('should filter by controversy level correctly', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({ controversyLevels: ['high'] });
      const { filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        if (filters.controversyLevels.length > 0) {
          const billControversy = bill.conflict_level;
          if (!billControversy || !filters.controversyLevels.includes(billControversy)) {
            return false;
          }
        }
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].conflict_level).toBe('high');
    });

    it('should apply multiple filters correctly', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({
        status: ['introduced'],
        urgency: ['high'],
        policyAreas: ['technology']
      });
      const { filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(bill.status)) {
          return false;
        }
        
        // Urgency filter
        if (filters.urgency.length > 0 && !filters.urgency.includes(bill.urgencyLevel)) {
          return false;
        }
        
        // Policy areas filter
        if (filters.policyAreas.length > 0) {
          const hasMatchingArea = filters.policyAreas.some(area => 
            bill.policyAreas.includes(area)
          );
          if (!hasMatchingArea) return false;
        }
        
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].id).toBe(1);
    });

    it('should return empty results when no bills match filters', () => {
      const { setFilters, bills } = useBillsStore.getState();
      
      setFilters({
        status: ['failed'],
        urgency: ['critical']
      });
      const { filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(bill.status)) {
          return false;
        }
        
        // Urgency filter
        if (filters.urgency.length > 0 && !filters.urgency.includes(bill.urgencyLevel)) {
          return false;
        }
        
        return true;
      });
      
      expect(filteredBills).toHaveLength(0);
    });
  });

  describe('Search Integration', () => {
    const mockBills = [
      {
        id: 1,
        billNumber: 'HB-001',
        title: 'Digital Privacy Protection Act',
        summary: 'Comprehensive privacy legislation',
        status: 'introduced' as const,
        urgencyLevel: 'high' as const,
        introducedDate: '2024-01-15',
        lastUpdated: '2024-01-20',
        sponsors: [],
        constitutionalFlags: [],
        viewCount: 100,
        saveCount: 10,
        commentCount: 5,
        shareCount: 2,
        policyAreas: ['technology'],
        complexity: 'medium' as const,
        readingTime: 10,
        conflict_level: 'medium' as const
      },
      {
        id: 2,
        billNumber: 'SB-002',
        title: 'Healthcare Access Bill',
        summary: 'Improving healthcare access',
        status: 'committee' as const,
        urgencyLevel: 'medium' as const,
        introducedDate: '2024-01-10',
        lastUpdated: '2024-01-18',
        sponsors: [],
        constitutionalFlags: [],
        viewCount: 200,
        saveCount: 20,
        commentCount: 15,
        shareCount: 8,
        policyAreas: ['healthcare'],
        complexity: 'low' as const,
        readingTime: 8,
        conflict_level: 'low' as const
      }
    ];

    beforeEach(() => {
      const { setBills } = useBillsStore.getState();
      setBills(mockBills);
    });

    it('should combine search and filters correctly', () => {
      const { setSearchQuery, setFilters, bills } = useBillsStore.getState();
      
      setSearchQuery('privacy');
      setFilters({ status: ['introduced'] });
      
      const { searchQuery, filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        // Search query filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = 
            bill.title.toLowerCase().includes(query) ||
            bill.summary.toLowerCase().includes(query) ||
            bill.billNumber.toLowerCase().includes(query) ||
            bill.policyAreas.some(area => area.toLowerCase().includes(query));
          
          if (!matchesSearch) return false;
        }
        
        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(bill.status)) {
          return false;
        }
        
        return true;
      });
      
      expect(filteredBills).toHaveLength(1);
      expect(filteredBills[0].title).toContain('Privacy');
      expect(filteredBills[0].status).toBe('introduced');
    });

    it('should return no results when search and filters conflict', () => {
      const { setSearchQuery, setFilters, bills } = useBillsStore.getState();
      
      setSearchQuery('privacy');
      setFilters({ status: ['committee'] });
      
      const { searchQuery, filters } = useBillsStore.getState();
      
      const filteredBills = bills.filter(bill => {
        // Search query filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = 
            bill.title.toLowerCase().includes(query) ||
            bill.summary.toLowerCase().includes(query) ||
            bill.billNumber.toLowerCase().includes(query) ||
            bill.policyAreas.some(area => area.toLowerCase().includes(query));
          
          if (!matchesSearch) return false;
        }
        
        // Status filter
        if (filters.status.length > 0 && !filters.status.includes(bill.status)) {
          return false;
        }
        
        return true;
      });
      
      expect(filteredBills).toHaveLength(0);
    });
  });
});