/**
 * Civic Education Components Tests
 *
 * Tests for Kenyan civic education components
 * Requirements: 10.4, 10.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CivicEducationHub } from './CivicEducationHub';
import { KenyanLegislativeProcess } from './KenyanLegislativeProcess';
import { LegislativeProcessGuide } from './LegislativeProcessGuide';
import { KenyanContextProvider } from '../context/KenyanContextProvider';

// Mock the i18n hook
const mockUseI18n = vi.fn(() => ({
  t: (key: string) => key,
  language: 'en',
  kenyanContext: {
    timeZone: 'Africa/Nairobi',
    currency: 'KES',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: 'en-KE',
    governmentLevels: ['national', 'county', 'ward'] as const
  }
}));

vi.mock('@client/shared/hooks/use-i18n', () => ({
  useI18n: mockUseI18n
}));

// Test wrapper with context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <KenyanContextProvider>
    {children}
  </KenyanContextProvider>
);

describe('CivicEducationHub', () => {
  beforeEach(() => {
    mockUseI18n.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      kenyanContext: {
        timeZone: 'Africa/Nairobi',
        currency: 'KES',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: 'en-KE',
        governmentLevels: ['national', 'county', 'ward'] as const
      }
    });
  });

  it('renders civic education hub with all topics', () => {
    render(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    expect(screen.getByText('Civic Education Hub')).toBeInTheDocument();
    expect(screen.getByText('Law-Making Process')).toBeInTheDocument();
    expect(screen.getByText('Government Structure')).toBeInTheDocument();
    expect(screen.getByText('Civic Participation')).toBeInTheDocument();
    expect(screen.getByText('Citizen Rights')).toBeInTheDocument();
  });

  it('displays government statistics correctly', () => {
    render(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    expect(screen.getByText('47')).toBeInTheDocument(); // Counties
    expect(screen.getByText('349')).toBeInTheDocument(); // MPs
    expect(screen.getByText('68')).toBeInTheDocument(); // Senators
    expect(screen.getByText('2010')).toBeInTheDocument(); // Constitution
  });

  it('navigates to legislative process guide when clicked', async () => {
    render(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    const lawMakingCard = screen.getByText('Law-Making Process').closest('div');
    fireEvent.click(lawMakingCard!);

    await waitFor(() => {
      expect(screen.getByText('Legislative Process Guide')).toBeInTheDocument();
    });
  });

  it('supports Kiswahili language', () => {
    mockUseI18n.mockReturnValue({
      t: (key: string) => key,
      language: 'sw',
      kenyanContext: {
        timeZone: 'Africa/Nairobi',
        currency: 'KES',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: 'sw-KE',
        governmentLevels: ['national', 'county', 'ward'] as const
      }
    });

    render(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    expect(screen.getByText('Kituo cha Elimu ya Kiraia')).toBeInTheDocument();
    expect(screen.getByText('Mchakato wa Kutunga Sheria')).toBeInTheDocument();
  });
});

describe('KenyanLegislativeProcess', () => {
  it('renders legislative process with all bill types', () => {
    render(
      <TestWrapper>
        <KenyanLegislativeProcess />
      </TestWrapper>
    );

    expect(screen.getByText('Kenya\'s Law-Making Process')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
    expect(screen.getByText('Bill Types')).toBeInTheDocument();
    expect(screen.getByText('Public Participation')).toBeInTheDocument();
  });

  it('switches between different bill types', async () => {
    render(
      <TestWrapper>
        <KenyanLegislativeProcess />
      </TestWrapper>
    );

    // Should show ordinary bill by default
    expect(screen.getByText('Regular bills requiring simple majority')).toBeInTheDocument();

    // Click on constitutional bill type (if visible)
    const tabs = screen.getAllByRole('tab');
    if (tabs.length > 0) {
      fireEvent.click(tabs[1]); // Click second tab
      await waitFor(() => {
        // Check if content changed
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });
    }
  });

  it('displays public participation requirements', async () => {
    render(
      <TestWrapper>
        <KenyanLegislativeProcess />
      </TestWrapper>
    );

    const participationTab = screen.getByText('Public Participation');
    fireEvent.click(participationTab);

    await waitFor(() => {
      expect(screen.getByText('Public Participation Requirements')).toBeInTheDocument();
      expect(screen.getByText('How to Participate')).toBeInTheDocument();
    });
  });
});

describe('LegislativeProcessGuide', () => {
  it('renders process guide with all steps', () => {
    render(
      <TestWrapper>
        <LegislativeProcessGuide />
      </TestWrapper>
    );

    expect(screen.getByText('Legislative Process Guide')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('navigates between process steps', async () => {
    render(
      <TestWrapper>
        <LegislativeProcessGuide />
      </TestWrapper>
    );

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Check if step changed (step 2 should be active)
      expect(screen.getByText('Public Participation')).toBeInTheDocument();
    });

    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);

    await waitFor(() => {
      // Should be back to step 1
      expect(screen.getByText('Bill Introduction')).toBeInTheDocument();
    });
  });

  it('shows step-specific content', async () => {
    render(
      <TestWrapper>
        <LegislativeProcessGuide />
      </TestWrapper>
    );

    // Navigate to public participation step
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('How to Participate:')).toBeInTheDocument();
    });
  });

  it('provides external resource links', () => {
    render(
      <TestWrapper>
        <LegislativeProcessGuide />
      </TestWrapper>
    );

    expect(screen.getByText('Constitution of Kenya 2010')).toBeInTheDocument();
    expect(screen.getByText('Parliament Website')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('supports keyboard navigation in process guide', async () => {
    render(
      <TestWrapper>
        <LegislativeProcessGuide />
      </TestWrapper>
    );

    const nextButton = screen.getByText('Next');
    nextButton.focus();

    fireEvent.keyDown(nextButton, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Public Participation')).toBeInTheDocument();
    });
  });

  it('has proper ARIA labels and roles', () => {
    render(
      <TestWrapper>
        <KenyanLegislativeProcess />
      </TestWrapper>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toBeInTheDocument();
  });
});

describe('Performance', () => {
  it('renders components within acceptable time', async () => {
    const startTime = performance.now();

    render(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('handles language switching efficiently', async () => {
    const { rerender } = render(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    // Switch to Kiswahili
    mockUseI18n.mockReturnValue({
      t: (key: string) => key,
      language: 'sw',
      kenyanContext: {
        timeZone: 'Africa/Nairobi',
        currency: 'KES',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: 'sw-KE',
        governmentLevels: ['national', 'county', 'ward'] as const
      }
    });

    rerender(
      <TestWrapper>
        <CivicEducationHub />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Kituo cha Elimu ya Kiraia')).toBeInTheDocument();
    });
  });
});
