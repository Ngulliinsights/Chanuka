import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BillsDashboardPage from '@client/pages/bills-dashboard-page';
import { vi } from 'vitest';

// Mock the WebSocket hook
vi.mock('../../../services/websocket-client', () => ({
  useWebSocket: () => ({
    isConnected: false,
    on: vi.fn(() => vi.fn()),
  }),
}));

// Mock react-virtualized for testing
vi.mock('react-virtualized', () => ({
  Grid: ({ cellRenderer, columnCount, rowCount }: any) => (
    <div data-testid="virtual-grid">
      {Array.from({ length: Math.min(rowCount * columnCount, 6) }).map((_, index) => {
        const rowIndex = Math.floor(index / columnCount);
        const columnIndex = index % columnCount;
        return cellRenderer({
          columnIndex,
          rowIndex,
          key: `cell-${rowIndex}-${columnIndex}`,
          style: {},
        });
      })}
    </div>
  ),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe('EnhancedBillsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard header', async () => {
    render(
      <TestWrapper>
        <BillsDashboardPage />
      </TestWrapper>
    );

    expect(screen.getByText('Bills Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Track and analyze legislative activity in real-time')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <TestWrapper>
        <BillsDashboardPage />
      </TestWrapper>
    );

    expect(screen.getByText('Loading bills...')).toBeInTheDocument();
  });

  it('displays stats overview after loading', async () => {
    render(
      <TestWrapper>
        <BillsDashboardPage />
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
        <BillsDashboardPage />
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
        <BillsDashboardPage />
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
        <BillsDashboardPage />
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
        <BillsDashboardPage />
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
        <BillsDashboardPage />
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
        <BillsDashboardPage />
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