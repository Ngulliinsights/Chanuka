/**
 * Visual Regression Tests for UI Consistency
 * 
 * Tests visual consistency across:
 * - Different browsers
 * - Various viewport sizes
 * - Component states
 * - Theme variations
 * - Accessibility modes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  renderWithProviders,
  takeScreenshot,
  compareScreenshots,
  TestDataFactory,
  screen,
  fireEvent,
  waitFor
} from '../test-utilities';
import { visualRegressionConfig } from '../comprehensive-test-config';
import { BillCard } from '../../components/bills/BillCard';
import { BillsDashboard } from '../../components/bills/BillsDashboard';
import { FilterPanel } from '../../components/bills/FilterPanel';
import { IntelligentSearchPage } from '../../pages/IntelligentSearchPage';
import { BillDetailView } from '../../components/bill-detail/BillDetailView';
import { DiscussionThread } from '../../components/community/DiscussionThread';
import { ExpertBadge } from '../../components/verification/ExpertBadge';

// Mock screenshot utilities for testing
const mockScreenshots: Record<string, string> = {};

vi.mock('../test-utilities', async () => {
  const actual = await vi.importActual('../test-utilities');
  return {
    ...actual,
    takeScreenshot: vi.fn(async (component, name, options) => {
      const screenshot = `screenshot-${name}-${options?.viewport || 'desktop'}-${Date.now()}`;
      mockScree