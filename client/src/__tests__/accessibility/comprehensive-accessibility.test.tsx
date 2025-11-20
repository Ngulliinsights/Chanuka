/**
 * Comprehensive Accessibility Tests
 * Enhanced WCAG 2.1 AA compliance testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { 
  renderWithProviders, 
  MockDataFactory, 
  AccessibilityTestUtils,
  screen,
  waitFor,
  userEvent
} from '../../test-utils/comprehensive-test-setup';
import { BillCard } from '@client/components/bills/BillCard';
import { BillsDashboard } from '@client/components/bills/bills-dashboard';
import { IntelligentSearchPage } from '@client/pages/IntelligentSearchPage';
import { ExpertBadge } from '@client/components/verification/ExpertBadge';
import { DiscussionThread } from '@client/components/community/DiscussionThread';
import { App } from '../../App';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Comprehensive Accessibility Tests', () => {
  let mockBills: any[];
  let mockUser: any;
  let mockExpert: any;
  let mockComments: any[];

  beforeEach(() => {
    mockBills = Array.from({ length: 5 }, () => MockDataFactory.createMockBill());
    mockUser = MockDataFactory.createMockUser();
    mockExpert = MockDataFactory.createMockExpert();
    mockComments = Array.from({ length: 3 }, () => MockDataFactory.createMockComment());
    
    // Mock API responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockBills }),
    });
  });

  // =============================================================================
  // WCAG 2.1 AA COMPLIANCE TESTS
  // =============================================================================

  describe('WCAG 2.1 AA Compliance', () => {
    it('should pass axe accessibility audit for BillCard', async () => {
      const { container } = renderWithProviders(
        <BillCard 
          bill={mockBills[0]} 
          onSave={vi.fn()} 
          onShare={vi.fn()} 
          onComment={vi.fn()} 
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViola