import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EnhancedBillsDashboardPage from '../../../pages/enhanced-bills-dashboard-page';
import { useBillsStore } from '../../../store/slices/billsSlice';

// Mock the WebSocket hook
jest.mock('../../../services/websocket-client', () => ({
  useWebSocket: () => ({
    isConnected: false,
    on: jest.fn(() => jest.fn()),
  }),
}));

// Mock react-window for testing
jest.mock('react-window', () => ({
  FixedSizeGrid: ({ children, itemData, columnCount, rowCount }: any) => (
    <div data-testid="virtual-grid">
      {Array.from({ length: Math.min(rowCount * columnCount, 6) }).map((_, index) => {
        const rowIndex = Math.floor(index / columnCount);
        const columnIndex = index % columnCount;
        return children({
          columnIndex,
          rowIndex,
          style: {},
          data: itemData,
        });
      })}
    </div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('EnhancedBillsDashboard', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBillsStore.getState().reset();
  });

  it('renders the dashboard header', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Track and analyze legislative activity in real-time')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    expect(screen.getByText('Loading bills...')).toBeInTheDocument();
  });

  it('displays stats overview after loading', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Legislative Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Bills')).toBeInTheDocument();
      expect(screen.getByText('Urgent Bills')).toBeInTheDocument();
      expect(screen.getByText('Constitutional Issues')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
    });
  });

  it('allows searching for bills', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Legislative Overview')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search bills by title, number, or policy area...');
    fireEvent.change(searchInput, { target: { value: 'Digital Privacy' } });

    expect(searchInput).toHaveValue('Digital Privacy');
  });

  it('displays filter options', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Legislative Overview')).toBeInTheDocument();
    });

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    expect(screen.getByText('Filter by Status')).toBeInTheDocument();
    expect(screen.getByText('Filter by Urgency')).toBeInTheDocument();
  });

  it('allows changing view mode', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Legislative Overview')).toBeInTheDocument();
    });

    const viewButton = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    expect(screen.getByText('Grid View')).toBeInTheDocument();
    expect(screen.getByText('List View')).toBeInTheDocument();
  });

  it('displays bill cards after loading', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Digital Privacy Protection Act')).toBeInTheDocument();
      expect(screen.getByText('Clean Energy Infrastructure Investment')).toBeInTheDocument();
    });
  });

  it('shows correct bill metadata', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('HB-2024-001')).toBeInTheDocument();
      expect(screen.getByText('12 min read')).toBeInTheDocument();
      expect(screen.getByText('High Priority')).toBeInTheDocument();
      expect(screen.getByText('Constitutional Issues')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    render(
      <TestWrapper>
        <EnhancedBillsDashboardPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Legislative Overview')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Should show loading state briefly
    expect(refreshButton).toBeDisabled();
  });
});