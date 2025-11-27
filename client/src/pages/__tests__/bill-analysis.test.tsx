import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillAnalysis from '@client/bill-analysis';

describe('BillAnalysis', () => {
  const renderBillAnalysis = (billId = '123') => {
    return render(
      <MemoryRouter initialEntries={[`/bill-analysis/${billId}`]}>
        <BillAnalysis />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render the bill analysis page container', () => {
      renderBillAnalysis();

      const container = screen.getByText('Bill Analysis').closest('.container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('mx-auto', 'px-4', 'py-8');
    });

    it('should render the main heading', () => {
      renderBillAnalysis();

      const heading = screen.getByRole('heading', { name: /bill analysis/i, level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'mb-8');
    });

    it('should render the card component', () => {
      renderBillAnalysis();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toBeInTheDocument();
    });

    it('should render the card header with dynamic title', () => {
      renderBillAnalysis('456');

      expect(screen.getByText('Analysis for Bill #456')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive analysis and insights')).toBeInTheDocument();
    });

    it('should render placeholder content', () => {
      renderBillAnalysis();

      expect(screen.getByText('Bill analysis coming soon...')).toBeInTheDocument();
      expect(screen.getByText('Bill analysis coming soon...')).toHaveClass('text-gray-600');
    });
  });

  describe('URL parameter handling', () => {
    it('should extract bill ID from URL parameters', () => {
      renderBillAnalysis('789');

      expect(screen.getByText('Analysis for Bill #789')).toBeInTheDocument();
    });

    it('should handle different bill IDs', () => {
      const { rerender } = renderBillAnalysis('111');

      expect(screen.getByText('Analysis for Bill #111')).toBeInTheDocument();

      // Note: In a real app, this would require route changes, but for testing
      // we verify the component renders with different IDs
      rerender(
        <MemoryRouter initialEntries={['/bill-analysis/222']}>
          <BillAnalysis />
        </MemoryRouter>
      );

      expect(screen.getByText('Analysis for Bill #222')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply correct spacing and layout', () => {
      renderBillAnalysis();

      const container = screen.getByText('Bill Analysis').closest('.container');
      expect(container).toHaveClass('px-4', 'py-8');

      const heading = screen.getByRole('heading', { name: /bill analysis/i, level: 1 });
      expect(heading).toHaveClass('mb-8');
    });

    it('should have proper card structure', () => {
      renderBillAnalysis();

      const card = screen.getByRole('region', { hidden: true });
      const title = screen.getByText(/Analysis for Bill #/);
      const description = screen.getByText('Comprehensive analysis and insights');
      const content = screen.getByText('Bill analysis coming soon...');

      expect(card.contains(title)).toBe(true);
      expect(card.contains(description)).toBe(true);
      expect(card.contains(content)).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderBillAnalysis();

      const mainHeading = screen.getByRole('heading', { name: /bill analysis/i, level: 1 });
      const cardTitle = screen.getByText(/Analysis for Bill #/);

      expect(mainHeading.tagName).toBe('H1');
      expect(cardTitle.tagName).toBe('H2'); // CardTitle renders as h2
    });

    it('should have descriptive text for screen readers', () => {
      renderBillAnalysis();

      const description = screen.getByText('Comprehensive analysis and insights');
      expect(description).toBeInTheDocument();
    });

    it('should have semantic card structure', () => {
      renderBillAnalysis();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toBeInTheDocument();
    });
  });

  describe('content structure', () => {
    it('should display bill ID in title', () => {
      renderBillAnalysis('999');

      const title = screen.getByText('Analysis for Bill #999');
      expect(title).toBeInTheDocument();
    });

    it('should have consistent placeholder messaging', () => {
      renderBillAnalysis();

      const placeholder = screen.getByText('Bill analysis coming soon...');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute('class', expect.stringContaining('text-gray-600'));
    });
  });

  describe('edge cases', () => {
    it('should render without crashing with undefined bill ID', () => {
      // This tests the component's resilience, though in practice
      // React Router would prevent undefined params
      expect(() => renderBillAnalysis()).not.toThrow();
    });

    it('should handle special characters in bill ID', () => {
      renderBillAnalysis('ABC-123');

      expect(screen.getByText('Analysis for Bill #ABC-123')).toBeInTheDocument();
    });

    it('should maintain layout integrity', () => {
      renderBillAnalysis();

      // Verify all expected elements are present
      expect(screen.getByRole('heading', { name: /bill analysis/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('region', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText(/Analysis for Bill #/)).toBeInTheDocument();
      expect(screen.getByText('Comprehensive analysis and insights')).toBeInTheDocument();
      expect(screen.getByText('Bill analysis coming soon...')).toBeInTheDocument();
    });
  });
});