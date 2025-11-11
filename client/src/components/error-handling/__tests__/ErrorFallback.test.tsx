import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { ErrorFallback, ApiErrorFallback, ComponentErrorFallback } from '../ErrorFallback';
import { logger } from '../../../utils/logger';

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3000/test',
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.open
window.open = vi.fn();

const mockProps = {
  error: new Error('Test error message'),
  resetError: vi.fn(),
  context: 'page' as const,
  retryCount: 0,
};

describe('ErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error message and action buttons', () => {
    render(<ErrorFallback {...mockProps} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('This page encountered an unexpected error and cannot be displayed.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
    expect(screen.getByText('Go to Homepage')).toBeInTheDocument();
    expect(screen.getByText('Report this issue')).toBeInTheDocument();
  });

  it('calls resetError when Try Again button is clicked', () => {
    render(<ErrorFallback {...mockProps} />);

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    expect(mockProps.resetError).toHaveBeenCalled();
  });

  it('reloads page when Reload Page button is clicked', () => {
    render(<ErrorFallback {...mockProps} />);

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(mockLocation.reload).toHaveBeenCalled();
  });

  it('navigates to homepage when Go to Homepage button is clicked', () => {
    render(<ErrorFallback {...mockProps} />);

    const homeButton = screen.getByText('Go to Homepage');
    fireEvent.click(homeButton);

    expect(mockLocation.href).toBe('/');
  });

  it('opens bug report when Report this issue button is clicked', () => {
    render(<ErrorFallback {...mockProps} />);

    const reportButton = screen.getByText('Report this issue');
    fireEvent.click(reportButton);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('mailto:support@example.com')
    );
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(<ErrorFallback {...mockProps} />);

    expect(screen.getByText('Error Details:')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides Try Again button when max retries reached', () => {
    const propsWithMaxRetries = {
      ...mockProps,
      retryCount: 3,
    };

    render(<ErrorFallback {...propsWithMaxRetries} />);

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
  });

  it('shows retry count in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const propsWithRetry = {
      ...mockProps,
      retryCount: 2,
    };

    render(<ErrorFallback {...propsWithRetry} />);

    expect(screen.getByText('Retry attempt: 2/3')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('shows different messages for different contexts', () => {
    const apiProps = { ...mockProps, context: 'api' as const };
    const { rerender } = render(<ErrorFallback {...apiProps} />);
    expect(screen.getByText('There was a problem connecting to our services.')).toBeInTheDocument();

    const componentProps = { ...mockProps, context: 'component' as const };
    rerender(<ErrorFallback {...componentProps} />);
    expect(screen.getByText('A component on this page failed to load properly.')).toBeInTheDocument();
  });
});

describe('ApiErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders API-specific error message', () => {
    render(<ApiErrorFallback {...mockProps} />);

    expect(screen.getByText('Connection Problem')).toBeInTheDocument();
    expect(screen.getByText('Unable to load data. Please check your internet connection and try again.')).toBeInTheDocument();
  });

  it('calls resetError when Retry button is clicked', () => {
    render(<ApiErrorFallback {...mockProps} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockProps.resetError).toHaveBeenCalled();
  });
});

describe('ComponentErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component-specific error message', () => {
    render(<ComponentErrorFallback {...mockProps} />);

    expect(screen.getByText('This component failed to load.')).toBeInTheDocument();
  });

  it('calls resetError when retry button is clicked', () => {
    render(<ComponentErrorFallback {...mockProps} />);

    const retryButton = screen.getByRole('button');
    fireEvent.click(retryButton);

    expect(mockProps.resetError).toHaveBeenCalled();
  });
});

