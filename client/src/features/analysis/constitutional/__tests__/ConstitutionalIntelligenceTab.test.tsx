/**
 * Constitutional Intelligence Tab Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConstitutionalIntelligenceTab } from '../ui/ConstitutionalIntelligenceTab';
import type { Bill } from '@client/features/bills/types';

// Mock the hooks
vi.mock('../hooks/useConstitutionalAnalysis', () => ({
  useConstitutionalAnalysis: vi.fn(),
  useAnalyzeBill: vi.fn(),
}));

const mockBill: Bill = {
  id: 1,
  title: 'Test Bill 2026',
  bill_number: 'TB-001-2026',
  summary: 'Test bill summary',
  full_text: 'Full text of test bill',
  status: 'First Reading',
  introduced_date: '2026-01-01',
  category: 'Public',
  sponsor_id: 1,
  sponsor_name: 'Test Sponsor',
  stage: 'committee',
  votes_for: 0,
  votes_against: 0,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const mockAnalysis = {
  billId: '1',
  alignmentScore: 0.85,
  violations: [
    {
      violationType: 'Rights Violation',
      severity: 'medium' as const,
      description: 'Potential conflict with Article 45',
      affectedArticles: ['Article 45'],
      recommendation: 'Review and clarify language',
    },
  ],
  recommendations: ['Consider additional stakeholder consultation'],
  precedents: [
    {
      caseId: 'CASE-001',
      caseName: 'Test Case v. State',
      relevance: 0.95,
      summary: 'Relevant precedent summary',
    },
  ],
  analyzedAt: '2026-02-25T10:00:00Z',
  processingTime: 1500,
};

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('ConstitutionalIntelligenceTab', () => {
  it('should render loading state', () => {
    const { useConstitutionalAnalysis } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/loading constitutional analysis/i)).toBeInTheDocument();
  });

  it('should render error state', () => {
    const { useConstitutionalAnalysis } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/failed to load constitutional analysis/i)).toBeInTheDocument();
  });

  it('should render no analysis state with analyze button', () => {
    const { useConstitutionalAnalysis, useAnalyzeBill } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
    useAnalyzeBill.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/no constitutional analysis available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze bill/i })).toBeInTheDocument();
  });

  it('should trigger analysis when analyze button is clicked', async () => {
    const { useConstitutionalAnalysis, useAnalyzeBill } = require('../hooks/useConstitutionalAnalysis');
    const mutateMock = vi.fn();
    
    useConstitutionalAnalysis.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
    useAnalyzeBill.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    const analyzeButton = screen.getByRole('button', { name: /analyze bill/i });
    await userEvent.click(analyzeButton);

    expect(mutateMock).toHaveBeenCalledWith({
      billId: '1',
      billText: mockBill.full_text,
      billTitle: mockBill.title,
      billType: 'public',
      affectedInstitutions: [],
      proposedChanges: [],
    });
  });

  it('should render analysis display when data is available', () => {
    const { useConstitutionalAnalysis, useAnalyzeBill } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: mockAnalysis,
      isLoading: false,
      isError: false,
    });
    useAnalyzeBill.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/constitutional intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
    expect(screen.getByText(/rights violation/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /re-analyze/i })).toBeInTheDocument();
  });

  it('should display violations with correct severity', () => {
    const { useConstitutionalAnalysis, useAnalyzeBill } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: mockAnalysis,
      isLoading: false,
      isError: false,
    });
    useAnalyzeBill.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/MEDIUM/)).toBeInTheDocument();
    expect(screen.getByText(/potential conflict with article 45/i)).toBeInTheDocument();
  });

  it('should display precedents', () => {
    const { useConstitutionalAnalysis, useAnalyzeBill } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: mockAnalysis,
      isLoading: false,
      isError: false,
    });
    useAnalyzeBill.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/test case v\. state/i)).toBeInTheDocument();
    expect(screen.getByText(/95% relevant/i)).toBeInTheDocument();
  });

  it('should display recommendations', () => {
    const { useConstitutionalAnalysis, useAnalyzeBill } = require('../hooks/useConstitutionalAnalysis');
    useConstitutionalAnalysis.mockReturnValue({
      data: mockAnalysis,
      isLoading: false,
      isError: false,
    });
    useAnalyzeBill.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    });

    renderWithProviders(<ConstitutionalIntelligenceTab bill={mockBill} />);

    expect(screen.getByText(/consider additional stakeholder consultation/i)).toBeInTheDocument();
  });
});
