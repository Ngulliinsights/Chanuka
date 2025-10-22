import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { logger } from '@shared/core';
import {
  createSafeLazyPage,
  createSafeLazyComponent,
  retryLazyComponentLoad,
  createRetryableLazyComponent,
  PageLoader,
  ComponentLoader,
} from '../safe-lazy-loading';

// Mock components for testing
const MockSuccessComponent = () => <div>Mock component loaded</div>;
const MockFailingComponent = () => {
  throw new Error('Component failed to load');
};

describe('PageLoader', () => {
  it('should render loading spinner', () => {
    render(<PageLoader />);
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });
});

describe('ComponentLoader', () => {
  it('should render loading spinner', () => {
    render(<ComponentLoader />);
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });
});

describe('createSafeLazyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create lazy component that loads successfully', async () => {
    const LazyComponent = createSafeLazyPage(
      () => Promise.resolve({ default: MockSuccessComponent }),
      'TestComponent'
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should load component
    await waitFor(() => {
      expect(screen.getByText('Mock component loaded')).toBeInTheDocument();
    });
  });

  it('should handle component load failure gracefully', async () => {
    const LazyComponent = createSafeLazyPage(
      () => Promise.reject(new Error('Load failed')),
      'FailingComponent'
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load component')).toBeInTheDocument();
    });
  });
});

describe('createSafeLazyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should create lazy component with error boundary', async () => {
    const LazyComponent = createSafeLazyComponent(
      () => Promise.resolve({ default: MockSuccessComponent }),
      'TestComponent'
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText('Mock component loaded')).toBeInTheDocument();
    });
  });
});

describe('retryLazyComponentLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry failed loads', async () => {
    let attempts = 0;
    const mockImport = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Load failed'));
      }
      return Promise.resolve({ default: MockSuccessComponent });
    });

    const retryableImport = retryLazyComponentLoad(mockImport, 3, 100);

    const promise = retryableImport();
    
    // Advance timers to trigger retries
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(200);
    
    const result = await promise;
    
    expect(mockImport).toHaveBeenCalledTimes(3);
    expect(result.default).toBe(MockSuccessComponent);
  });

  it('should throw error after max retries', async () => {
    const mockImport = vi.fn().mockRejectedValue(new Error('Load failed'));
    const retryableImport = retryLazyComponentLoad(mockImport, 2, 100);

    const promise = retryableImport();
    
    // Advance timers to trigger retries
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(200);
    
    await expect(promise).rejects.toThrow('Load failed');
    expect(mockImport).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should succeed on first try if no error', async () => {
    const mockImport = vi.fn().mockResolvedValue({ default: MockSuccessComponent });
    const retryableImport = retryLazyComponentLoad(mockImport, 3, 100);

    const result = await retryableImport();
    
    expect(mockImport).toHaveBeenCalledTimes(1);
    expect(result.default).toBe(MockSuccessComponent);
  });
});

describe('createRetryableLazyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create retryable lazy component', async () => {
    let attempts = 0;
    const mockImport = () => {
      attempts++;
      if (attempts < 2) {
        return Promise.reject(new Error('Load failed'));
      }
      return Promise.resolve({ default: MockSuccessComponent });
    };

    const LazyComponent = createRetryableLazyComponent(
      mockImport,
      'RetryableComponent',
      2
    );

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );

    // Advance timers to allow retries
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Mock component loaded')).toBeInTheDocument();
    });
  });
});