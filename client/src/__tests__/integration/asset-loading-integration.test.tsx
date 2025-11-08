import { logger } from '../../utils/browser-logger';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
// Note: AssetLoadingIndicator was moved to components/loading/
import { AssetLoadingIndicator } from '../../components/loading/AssetLoadingIndicator';
import { AssetLoadingManager } from '../../utils/asset-loading';

// Mock the asset loading manager
const mockAssetLoadingManager = {
  onProgress: (callback: any) => {
    // Simulate progress updates
    setTimeout(() => {
      callback({
        loaded: 1,
        total: 3,
        phase: 'critical',
        currentAsset: '/test-asset.js',
      });
    }, 100);
    
    setTimeout(() => {
      callback({
        loaded: 3,
        total: 3,
        phase: 'complete',
      });
    }, 200);
    
    return () => {}; // Unsubscribe function
  },
  getLoadingStats: () => ({
    loaded: 1,
    failed: 0,
    isOnline: true,
    connectionType: 'fast',
  }),
};

// Mock the asset loading utility
vi.mock('@/utils/asset-loading', () => ({
  assetLoadingManager: mockAssetLoadingManager,
  useAssetLoading: () => ({
    progress: {
      loaded: 1,
      total: 3,
      phase: 'critical',
      currentAsset: '/test-asset.js',
    },
    getStats: () => mockAssetLoadingManager.getLoadingStats(),
  }),
}));

describe('Asset Loading Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  
  });

  it('should render asset loading indicator with progress', async () => {
    render(
      <AssetLoadingProvider>
        <AssetLoadingIndicator showProgress={true} showDetails={true} />
      </AssetLoadingProvider>
    );

    // Should show loading message
    expect(screen.getByText(/Loading essential resources/)).toBeInTheDocument();
    
    // Should show progress information
    expect(screen.getByText(/1 of 3 loaded/)).toBeInTheDocument();
    
    // Should show current asset being loaded
    expect(screen.getByText(/test-asset.js/)).toBeInTheDocument();
  });

  it('should render minimal asset loading indicator', () => {
    render(
      <AssetLoadingProvider>
        <AssetLoadingIndicator minimal={true} />
      </AssetLoadingProvider>
    );

    // Should show minimal loading state
    expect(screen.getByText(/Loading essential resources/)).toBeInTheDocument();
    
    // Should not show detailed progress in minimal mode
    expect(screen.queryByText(/1 of 3 loaded/)).not.toBeInTheDocument();
  });

  it('should show connection status in detailed mode', () => {
    render(
      <AssetLoadingProvider>
        <AssetLoadingIndicator showDetails={true} />
      </AssetLoadingProvider>
    );

    // Should show connection information
    expect(screen.getByText(/Connection:/)).toBeInTheDocument();
    expect(screen.getByText(/fast/)).toBeInTheDocument();
    expect(screen.getByText(/Online/)).toBeInTheDocument();
  });

  it('should handle different loading phases', async () => {
    const TestComponent = () => {
      const [phase, setPhase] = React.useState<'preload' | 'critical' | 'complete'>('preload');
      
      React.useEffect(() => {
        const timer1 = setTimeout(() => setPhase('critical'), 100);
        const timer2 = setTimeout(() => setPhase('complete'), 200);
        
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      }, []);
      
      // Mock the progress based on phase
      const mockProgress = {
        loaded: phase === 'complete' ? 3 : 1,
        total: 3,
        phase,
        currentAsset: phase === 'complete' ? undefined : '/test-asset.js',
      };
      
      return (
        <div>
          <div data-testid="phase">{phase}</div>
          <AssetLoadingIndicator />
        </div>
      );
    };
    
    render(
      <AssetLoadingProvider>
        <TestComponent />
      </AssetLoadingProvider>
    );

    // Should start with preload phase
    expect(screen.getByTestId('phase')).toHaveTextContent('preload');
    
    // Should progress to critical phase
    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('critical');
    });
    
    // Should complete
    await waitFor(() => {
      expect(screen.getByTestId('phase')).toHaveTextContent('complete');
    });
  });

  it('should handle asset loading errors gracefully', () => {
    const mockStatsWithErrors = {
      loaded: 2,
      failed: 1,
      isOnline: true,
      connectionType: 'fast',
    };
    
    // Override the mock for this test
    vi.mocked(mockAssetLoadingManager.getLoadingStats).mockReturnValue(mockStatsWithErrors);
    
    render(
      <AssetLoadingProvider>
        <AssetLoadingIndicator showDetails={true} />
      </AssetLoadingProvider>
    );

    // Should show error information
    expect(screen.getByText(/Failed:/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
    
    // Should show warning message about failed assets
    expect(screen.getByText(/Some assets failed to load/)).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(
      <AssetLoadingProvider>
        <AssetLoadingIndicator />
      </AssetLoadingProvider>
    );

    // Should have proper ARIA attributes
    const loadingElement = screen.getByRole('status', { hidden: true });
    expect(loadingElement).toBeInTheDocument();
  });
});

// Import React for the test component
import React from 'react';
import { vi } from 'vitest';

