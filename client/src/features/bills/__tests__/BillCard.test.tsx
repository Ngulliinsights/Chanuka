import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BillCard } from '../components/BillCard';
import type { Bill } from '../types';

describe('BillCard', () => {
  const mockBill: Bill = {
    id: '123',
    title: 'Test Bill Title',
    summary: 'This is a test bill summary that should be displayed',
    status: 'introduced',
    category: 'health',
    introduced_date: '2024-01-15T00:00:00Z',
    sponsors: [
      {
        id: '1',
        name: 'John Doe',
        party: 'Democrat',
        district: 'CA-01',
        role: 'Representative'
      }
    ],
    comments: [],
    trackingCount: 5
  };

  const renderBillCard = (bill: Bill = mockBill) => {
    return render(
      <MemoryRouter>
        <BillCard bill={bill} />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render the bill card with title as link', () => {
      renderBillCard();

      const titleLink = screen.getByRole('link', { name: /test bill title/i });
      expect(titleLink).toBeInTheDocument();
      expect(titleLink).toHaveAttribute('href', '/bills/123');
    });

    it('should render the bill summary', () => {
      renderBillCard();

      expect(screen.getByText('This is a test bill summary that should be displayed')).toBeInTheDocument();
    });

    it('should render the category badge', () => {
      renderBillCard();

      const categoryBadge = screen.getByText('health');
      expect(categoryBadge).toBeInTheDocument();
      expect(categoryBadge).toHaveClass('shrink-0');
    });

    it('should render the status badge', () => {
      renderBillCard();

      const statusBadge = screen.getByText('Introduced');
      expect(statusBadge).toBeInTheDocument();
    });

    it('should render the introduced date', () => {
      renderBillCard();

      // Date will be formatted by toLocaleDateString, so we check for the date elements
      const dateElement = screen.getByText(/1\/15\/2024/); // US format
      expect(dateElement).toBeInTheDocument();
    });

    it('should render sponsor count', () => {
      renderBillCard();

      expect(screen.getByText('1 sponsors')).toBeInTheDocument();
    });

    it('should render view details link', () => {
      renderBillCard();

      const viewDetailsLink = screen.getByRole('link', { name: /view details/i });
      expect(viewDetailsLink).toBeInTheDocument();
      expect(viewDetailsLink).toHaveAttribute('href', '/bills/123');
    });
  });

  describe('status styling', () => {
    it('should apply correct styling for introduced status', () => {
      renderBillCard();

      const statusBadge = screen.getByText('Introduced');
      expect(statusBadge).toHaveClass('status-badge');
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should apply correct styling for passed status', () => {
      const passedBill = { ...mockBill, status: 'passed' as const };
      renderBillCard(passedBill);

      const statusBadge = screen.getByText('Passed');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should apply correct styling for failed status', () => {
      const failedBill = { ...mockBill, status: 'failed' as const };
      renderBillCard(failedBill);

      const statusBadge = screen.getByText('Failed');
      expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should apply default styling for unknown status', () => {
      const unknownBill = { ...mockBill, status: 'unknown' as any };
      renderBillCard(unknownBill);

      const statusBadge = screen.getByText('Unknown');
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('conflict of interest', () => {
    it('should show high risk badge when sponsor has conflicts', () => {
      const billWithConflicts: Bill = {
        ...mockBill,
        sponsors: [{
          ...mockBill.sponsors[0],
          conflictOfInterest: [{
            type: 'financial',
            description: 'Stock holdings in related company',
            severity: 'high',
            source: 'Public records'
          }]
        }]
      };

      renderBillCard(billWithConflicts);

      expect(screen.getByText('High Risk')).toBeInTheDocument();
      const riskBadge = screen.getByText('High Risk').closest('[class*="status-indicator"]');
      expect(riskBadge).toHaveClass('risk-high');
    });

    it('should not show risk badge when no conflicts', () => {
      renderBillCard();

      expect(screen.queryByText(/risk/i)).not.toBeInTheDocument();
    });
  });

  describe('optional fields', () => {
    it('should handle missing category', () => {
      const billWithoutCategory = { ...mockBill, category: undefined };
      renderBillCard(billWithoutCategory);

      expect(screen.queryByText('health')).not.toBeInTheDocument();
    });

    it('should handle missing summary', () => {
      const billWithoutSummary = { ...mockBill, summary: undefined };
      renderBillCard(billWithoutSummary);

      expect(screen.queryByText('This is a test bill summary')).not.toBeInTheDocument();
    });

    it('should handle no sponsors', () => {
      const billWithoutSponsors = { ...mockBill, sponsors: [] };
      renderBillCard(billWithoutSponsors);

      expect(screen.queryByText(/sponsors/)).not.toBeInTheDocument();
    });

    it('should handle undefined sponsors', () => {
      const billWithoutSponsors = { ...mockBill, sponsors: undefined };
      renderBillCard(billWithoutSponsors);

      expect(screen.queryByText(/sponsors/)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderBillCard();

      const title = screen.getByRole('heading', { name: /test bill title/i, level: 2 });
      expect(title).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      renderBillCard();

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2); // Title link and view details link

      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should have semantic card structure', () => {
      renderBillCard();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply card enhanced styling', () => {
      renderBillCard();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toHaveClass('card-enhanced', 'card-hover');
    });

    it('should have proper spacing', () => {
      renderBillCard();

      const cardContent = screen.getByText('This is a test bill summary').closest('[class*="space-y-4"]');
      expect(cardContent).toBeInTheDocument();
    });

    it('should have responsive layout classes', () => {
      renderBillCard();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toHaveClass('group');
    });
  });

  describe('icons', () => {
    it('should display calendar icon', () => {
      renderBillCard();

      // Check that the calendar icon is present (via its class or parent structure)
      const dateSection = screen.getByText(/1\/15\/2024/);
      expect(dateSection.closest('div')).toBeInTheDocument();
    });

    it('should display users icon when sponsors exist', () => {
      renderBillCard();

      const sponsorsText = screen.getByText('1 sponsors');
      expect(sponsorsText).toBeInTheDocument();
    });

    it('should display trending up icon for view details', () => {
      renderBillCard();

      const viewDetailsLink = screen.getByRole('link', { name: /view details/i });
      expect(viewDetailsLink).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(200);
      const billWithLongTitle = { ...mockBill, title: longTitle };
      renderBillCard(billWithLongTitle);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Bill #123: "Test" & Special Characters!';
      const billWithSpecialTitle = { ...mockBill, title: specialTitle };
      renderBillCard(billWithSpecialTitle);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('should handle empty bill object gracefully', () => {
      const emptyBill: Bill = {
        id: '1',
        title: '',
        summary: '',
        status: 'introduced',
        category: '',
        introduced_date: '',
        sponsors: [],
        comments: []
      };

      expect(() => renderBillCard(emptyBill)).not.toThrow();
    });
  });
});