/**
 * ConflictOfInterestAnalysis Component Tests
 * 
 * Tests for the main conflict of interest analysis component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ConflictOfInterestAnalysis } from '../ConflictOfInterestAnalysis';
import { Bill } from '../../../store/slices/billsSlice';

// Mock the recharts components to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radial-bar-chart">{children}</div>,
  RadialBar: () => <div data-testid="radial-bar" />,
}));

// Mock D3 to avoid DOM manipulation issues in tests
vi.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
    })),
    append: vi.fn(() => ({
      attr: vi.fn().mockReturnThis(),
      selectAll: vi.fn(() => ({
        data: vi.fn(() => ({
          enter: vi.fn(() => ({
            append: vi.fn(() => ({
              attr: vi.fn().mockReturnThis(),
              style: vi.fn().mockReturnThis(),
              text: vi.fn().mockReturnThis(),
              on: vi.fn().mockReturnThis(),
              call: vi.fn().mockReturnThis(),
            })),
          })),
        })),
      })),
    })),
    call: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  })),
  forceSimulation: vi.fn(() => ({
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    strength: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCenter: vi.fn(),
  forceCollide: vi.fn(() => ({
    radius: vi.fn().mockReturnThis(),
  })),
  drag: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
  })),
  zoomIdentity: {},
}));

const mockBill: Bill = {
  id: 1,
  billNumber: 'HB-2024-001',
  title: 'Test Healthcare Bill',
  summary: 'A test bill for healthcare reform',
  status: 'committee',
  urgencyLevel: 'medium',
  introducedDate: '2024-01-15',
  lastUpdated: '2024-01-20',
  sponsors: [
    {
      id: 1,
      name: 'Rep. Jane Smith',
      party: 'D',
      role: 'primary'
    }
  ],
  constitutionalFlags: [],
  viewCount: 100,
  saveCount: 25,
  commentCount: 15,
  shareCount: 5,
  policyAreas: ['Healthcare'],
  complexity: 'medium',
  readingTime: 10,
  category: 'Healthcare',
  conflict_level: 'medium',
  sponsor_count: 1
};

describe('ConflictOfInterestAnalysis', () => {
  it('renders without crashing', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText('Conflict of Interest Analysis')).toBeInTheDocument();
  });

  it('displays the sponsor name', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText(/Rep\. Jane Smith/)).toBeInTheDocument();
  });

  it('shows risk assessment information', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText('Overall Risk Level')).toBeInTheDocument();
    expect(screen.getByText('Financial Exposure')).toBeInTheDocument();
    expect(screen.getByText('Transparency Score')).toBeInTheDocument();
  });

  it('displays navigation tabs', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Financial')).toBeInTheDocument();
    expect(screen.getByText('Transparency')).toBeInTheDocument();
    expect(screen.getByText('Patterns')).toBeInTheDocument();
    expect(screen.getByText('Workarounds')).toBeInTheDocument();
  });

  it('shows export and share buttons', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('displays analysis summary', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
    expect(screen.getByText('Key Findings')).toBeInTheDocument();
  });

  it('shows quick navigation buttons', () => {
    render(<ConflictOfInterestAnalysis bill={mockBill} />);
    
    expect(screen.getByText('View Network Visualization')).toBeInTheDocument();
    expect(screen.getByText('Analyze Financial Exposure')).toBeInTheDocument();
    expect(screen.getByText('Review Transparency Score')).toBeInTheDocument();
    expect(screen.getByText('Examine Voting Patterns')).toBeInTheDocument();
    expect(screen.getByText('Track Implementation Workarounds')).toBeInTheDocument();
  });
});