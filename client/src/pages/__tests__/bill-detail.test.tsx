import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillDetail from '@client/bill-detail';

describe('BillDetail', () => {
  const renderBillDetail = (billId = '123') => {
    return render(
      <MemoryRouter initialEntries={[`/bill-detail/${billId}`]}>
        <BillDetail />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render the bill detail page container', () => {
      renderBillDetail();

      const container = screen.getByText('Bill Details').closest('.container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('mx-auto', 'px-4', 'py-8');
    });

    it('should render the main heading', () => {
      renderBillDetail();

      const heading = screen.getByRole('heading', { name: /bill details/i, level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'mb-8');
    });

    it('should render the card component', () => {
      renderBillDetail();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toBeInTheDocument();
    });

    it('should render the card header with dynamic title', () => {
      renderBillDetail('456');

      expect(screen.getByText('Bill #456')).toBeInTheDocument();
      expect(screen.getByText('Detailed information about this bill')).toBeInTheDocument();
    });

    it('should render placeholder content', () => {
      renderBillDetail();

      expect(screen.getByText('Bill details coming soon...')).toBeInTheDocument();
      expect(screen.getByText('Bill details coming soon...')).toHaveClass('text-gray-600');
    });
  });

  describe('URL parameter handling', () => {
    it('should extract bill ID from URL parameters', () => {
      renderBillDetail('789');

      expect(screen.getByText('Bill #789')).toBeInTheDocument();
    });

    it('should handle different bill IDs', () => {
      const { rerender } = renderBillDetail('111');

      expect(screen.getByText('Bill #111')).toBeInTheDocument();

      // Test with different ID by rerendering
      rerender(
        <MemoryRouter initialEntries={['/bill-detail/222']}>
          <BillDetail />
        </MemoryRouter>
      );

      expect(screen.getByText('Bill #222')).toBeInTheDocument();
    });

    it('should handle numeric bill IDs', () => {
      renderBillDetail('12345');

      expect(screen.getByText('Bill #12345')).toBeInTheDocument();
    });

    it('should handle alphanumeric bill IDs', () => {
      renderBillDetail('BILL-2024-001');

      expect(screen.getByText('Bill #BILL-2024-001')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply correct spacing and layout', () => {
      renderBillDetail();

      const container = screen.getByText('Bill Details').closest('.container');
      expect(container).toHaveClass('px-4', 'py-8');

      const heading = screen.getByRole('heading', { name: /bill details/i, level: 1 });
      expect(heading).toHaveClass('mb-8');
    });

    it('should have proper card structure', () => {
      renderBillDetail();

      const card = screen.getByRole('region', { hidden: true });
      const title = screen.getByText(/Bill #/);
      const description = screen.getByText('Detailed information about this bill');
      const content = screen.getByText('Bill details coming soon...');

      expect(card.contains(title)).toBe(true);
      expect(card.contains(description)).toBe(true);
      expect(card.contains(content)).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderBillDetail();

      const mainHeading = screen.getByRole('heading', { name: /bill details/i, level: 1 });
      const cardTitle = screen.getByText(/Bill #/);

      expect(mainHeading.tagName).toBe('H1');
      expect(cardTitle.tagName).toBe('H2'); // CardTitle renders as h2
    });

    it('should have descriptive text for screen readers', () => {
      renderBillDetail();

      const description = screen.getByText('Detailed information about this bill');
      expect(description).toBeInTheDocument();
    });

    it('should have semantic card structure', () => {
      renderBillDetail();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toBeInTheDocument();
    });
  });

  describe('content structure', () => {
    it('should display bill ID in title', () => {
      renderBillDetail('999');

      const title = screen.getByText('Bill #999');
      expect(title).toBeInTheDocument();
    });

    it('should have consistent placeholder messaging', () => {
      renderBillDetail();

      const placeholder = screen.getByText('Bill details coming soon...');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute('class', expect.stringContaining('text-gray-600'));
    });
  });

  describe('edge cases', () => {
    it('should render without crashing', () => {
      expect(() => renderBillDetail()).not.toThrow();
    });

    it('should handle special characters in bill ID', () => {
      renderBillDetail('ABC-123_DEF');

      expect(screen.getByText('Bill #ABC-123_DEF')).toBeInTheDocument();
    });

    it('should handle very long bill IDs', () => {
      const longId = 'VERY-LONG-BILL-ID-THAT-MIGHT-BE-USED-IN-SOME-SYSTEMS-123456789';
      renderBillDetail(longId);

      expect(screen.getByText(`Bill #${longId}`)).toBeInTheDocument();
    });

    it('should maintain layout integrity with different content', () => {
      renderBillDetail();

      // Verify all expected elements are present and properly structured
      expect(screen.getByRole('heading', { name: /bill details/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('region', { hidden: true })).toBeInTheDocument();
      expect(screen.getByText(/Bill #/)).toBeInTheDocument();
      expect(screen.getByText('Detailed information about this bill')).toBeInTheDocument();
      expect(screen.getByText('Bill details coming soon...')).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should have responsive container classes', () => {
      renderBillDetail();

      const container = screen.getByText('Bill Details').closest('.container');
      expect(container).toHaveClass('mx-auto', 'px-4', 'py-8');
    });
  });
});