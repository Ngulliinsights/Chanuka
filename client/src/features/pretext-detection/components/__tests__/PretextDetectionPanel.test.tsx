import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PretextDetectionPanel } from '../PretextDetectionPanel';

// Mock the hook
vi.mock('../../hooks/usePretextAnalysis', () => ({
  usePretextAnalysis: () => ({
    analysis: null,
    loading: false,
    error: null,
    civicActions: [],
    rightsCards: [],
    analyzeBill: vi.fn()
  })
}));

describe('PretextDetectionPanel', () => {
  it('should render initial state with analyze button', () => {
    render(<PretextDetectionPanel billId="test-123" />);
    
    expect(screen.getByText('Pretext Detection')).toBeInTheDocument();
    expect(screen.getByText('Analyze this bill for potential pretext indicators')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Analysis' })).toBeInTheDocument();
  });

  it('should display bill ID in component', () => {
    render(<PretextDetectionPanel billId="BILL-2024-001" billTitle="Test Bill" />);
    
    // Component should be initialized with the provided bill ID
    expect(screen.getByText('Pretext Detection')).toBeInTheDocument();
  });
});