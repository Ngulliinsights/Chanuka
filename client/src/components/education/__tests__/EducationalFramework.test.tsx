import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EducationalFramework } from '@client/EducationalFramework';
import { Bill, BillStatus, UrgencyLevel, ComplexityLevel } from '@client/core/api/types';

// Mock the UI components
jest.mock('../../ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-${value}`} onClick={() => onClick?.(value)}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('../../ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button 
      data-testid="button" 
      onClick={onClick}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Mock the educational components
jest.mock('../PlainLanguageSummary', () => ({
  PlainLanguageSummary: ({ billId, billTitle }: any) => (
    <div data-testid="plain-language-summary">
      Plain Language Summary for {billTitle} (ID: {billId})
    </div>
  ),
}));

jest.mock('../ConstitutionalContext', () => ({
  ConstitutionalContext: ({ billId, billTitle }: any) => (
    <div data-testid="constitutional-context">
      Constitutional Context for {billTitle} (ID: {billId})
    </div>
  ),
}));

jest.mock('../HistoricalPrecedents', () => ({
  HistoricalPrecedents: ({ billId, billTitle }: any) => (
    <div data-testid="historical-precedents">
      Historical Precedents for {billTitle} (ID: {billId})
    </div>
  ),
}));

jest.mock('../ProcessEducation', () => ({
  ProcessEducation: ({ billId, billTitle }: any) => (
    <div data-testid="process-education">
      Process Education for {billTitle} (ID: {billId})
    </div>
  ),
}));

jest.mock('../EducationalTooltip', () => ({
  EducationalTooltip: ({ children, term, definition }: any) => (
    <span data-testid="educational-tooltip" title={`${term}: ${definition}`}>
      {children}
    </span>
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
    {children}
  </QueryClientProvider>
);

describe('EducationalFramework', () => {
  const mockBill: Bill = {
    id: 1,
    billNumber: 'HB-2024-001',
    title: 'Healthcare Access Reform Act',
    summary: 'Test bill summary',
    status: BillStatus.COMMITTEE,
    urgencyLevel: UrgencyLevel.HIGH,
    introducedDate: '2024-01-10',
    lastUpdated: '2024-01-15',
    sponsors: [],
    constitutionalFlags: [],
    viewCount: 100,
    saveCount: 10,
    commentCount: 5,
    shareCount: 2,
    policyAreas: ['Healthcare'],
    complexity: ComplexityLevel.MEDIUM,
    readingTime: 10
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the educational framework header', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    expect(screen.getByText('Educational Framework')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive educational resources to help you understand this legislation')).toBeInTheDocument();
  });

  it('displays all educational categories in the overview', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    expect(screen.getByText('Plain Language')).toBeInTheDocument();
    expect(screen.getByText('Constitutional')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
  });

  it('renders all tab triggers', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    expect(screen.getByTestId('tab-plain-language')).toBeInTheDocument();
    expect(screen.getByTestId('tab-constitutional')).toBeInTheDocument();
    expect(screen.getByTestId('tab-historical')).toBeInTheDocument();
    expect(screen.getByTestId('tab-process')).toBeInTheDocument();
  });

  it('displays plain language summary by default', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    expect(screen.getByTestId('plain-language-summary')).toBeInTheDocument();
    expect(screen.getByText(`Plain Language Summary for ${mockBill.title} (ID: ${mockBill.id})`)).toBeInTheDocument();
  });

  it('shows educational tooltips demo section', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    expect(screen.getByText('Interactive Help')).toBeInTheDocument();
    expect(screen.getByText('Hover over highlighted terms throughout the interface for instant explanations')).toBeInTheDocument();
  });

  it('displays quick learning actions', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    expect(screen.getByText('Quick Learning Actions')).toBeInTheDocument();
    expect(screen.getByText('Glossary')).toBeInTheDocument();
    expect(screen.getByText('Ask Experts')).toBeInTheDocument();
    expect(screen.getByText('External Resources')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-educational-framework';
    const { container } = render(
      <EducationalFramework bill={mockBill} className={customClass} />, { wrapper: TestWrapper }
    );

    expect(container.firstChild).toHaveClass(customClass);
  });

  it('passes correct props to educational components', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    // Check that components receive the correct bill information
    expect(screen.getByTestId('plain-language-summary')).toHaveTextContent(mockBill.title);
    expect(screen.getByTestId('plain-language-summary')).toHaveTextContent(mockBill.id.toString());
  });

  it('renders educational tooltips with correct props', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    const tooltips = screen.getAllByTestId('educational-tooltip');
    expect(tooltips.length).toBeGreaterThan(0);

    // Check that tooltips have proper attributes
    tooltips.forEach(tooltip => {
      expect(tooltip).toHaveAttribute('title');
    });
  });
});

describe('EducationalFramework Integration', () => {
  const mockBill: Bill = {
    id: 1,
    billNumber: 'HB-2024-001',
    title: 'Healthcare Access Reform Act',
    summary: 'Test bill summary',
    status: BillStatus.COMMITTEE,
    urgencyLevel: UrgencyLevel.HIGH,
    introducedDate: '2024-01-10',
    lastUpdated: '2024-01-15',
    sponsors: [],
    constitutionalFlags: [],
    viewCount: 100,
    saveCount: 10,
    commentCount: 5,
    shareCount: 2,
    policyAreas: ['Healthcare'],
    complexity: ComplexityLevel.MEDIUM,
    readingTime: 10
  };

  it('maintains consistent bill information across all educational components', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    // All components should receive the same bill ID and title
    const expectedBillId = mockBill.id.toString();
    const expectedBillTitle = mockBill.title;

    expect(screen.getByTestId('plain-language-summary')).toHaveTextContent(expectedBillId);
    expect(screen.getByTestId('plain-language-summary')).toHaveTextContent(expectedBillTitle);
  });

  it('provides comprehensive educational coverage', () => {
    render(<EducationalFramework bill={mockBill} />, { wrapper: TestWrapper });

    // Verify all educational aspects are covered
    const educationalAspects = [
      'Plain Language', // Accessibility
      'Constitutional', // Legal context
      'Historical',     // Precedents
      'Process'        // Procedural understanding
    ];

    educationalAspects.forEach(aspect => {
      expect(screen.getByText(aspect)).toBeInTheDocument();
    });
  });
});