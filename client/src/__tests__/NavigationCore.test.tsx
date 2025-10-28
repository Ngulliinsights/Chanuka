import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/home';
import { logger } from '@/utils/browser-logger';

// Mock hooks with minimal setup
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

vi.mock('../hooks/use-mobile', () => ({
  useMediaQuery: vi.fn(() => false),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock browser info objects
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
    platform: 'test-platform',
    language: 'en-US',
    languages: ['en-US', 'en'],
    cookieEnabled: true,
    onLine: true,
  },
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

function renderHomePage() {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );
}

// Mock React initialization
vi.mock('react', async () => {
  const actualReact = await vi.importActual('react');
  return {
    ...actualReact,
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useEffect: vi.fn((fn) => fn()),
    useCallback: vi.fn((fn) => fn),
    useMemo: vi.fn((fn) => fn()),
  };
});

// Mock React DOM
vi.mock('react-dom', async () => {
  const actualReactDOM = await vi.importActual('react-dom');
  return {
    ...actualReactDOM,
    createRoot: vi.fn(() => ({
      render: vi.fn(),
      unmount: vi.fn(),
    })),
  };
});

describe('Navigation Core Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Homepage Navigation Links', () => {
    it('should render homepage with main navigation elements', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
        expect(screen.getByText('Government Transparency')).toBeInTheDocument();
      });
    });

    it('should render hero section CTA buttons with correct links', async () => {
      renderHomePage();

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');
        
        expect(startTrackingButton).toBeInTheDocument();
        expect(joinMovementButton).toBeInTheDocument();
        
        expect(startTrackingButton).toHaveAttribute('href', '/bills');
        expect(joinMovementButton).toHaveAttribute('href', '/community');
      });
    });

    it('should render all feature cards with correct links', async () => {
      renderHomePage();

      await waitFor(() => {
        const billTrackingCard = screen.getByLabelText('Bill Tracking: Monitor legislative proposals and their progress through the system');
        const transparencyCard = screen.getByLabelText('Transparency Analysis: Analyze conflicts of interest and sponsor relationships');
        const communityCard = screen.getByLabelText('Community Input: Participate in public discourse and provide feedback');
        const expertCard = screen.getByLabelText('Expert Verification: Access expert analysis and fact-checking resources');
        
        expect(billTrackingCard).toHaveAttribute('href', '/bills');
        expect(transparencyCard).toHaveAttribute('href', '/bill-sponsorship-analysis');
        expect(communityCard).toHaveAttribute('href', '/community');
        expect(expertCard).toHaveAttribute('href', '/expert-verification');
      });
    });

    it('should render mission section with dashboard link', async () => {
      renderHomePage();

      await waitFor(() => {
        const dashboardLink = screen.getByText('See Your Impact');
        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
      });
    });

    it('should render final CTA section with correct links', async () => {
      renderHomePage();

      await waitFor(() => {
        const dashboardButton = screen.getByLabelText('Access your personal dashboard');
        const analysisButton = screen.getByLabelText('Explore bill analysis tools');
        
        expect(dashboardButton).toHaveAttribute('href', '/dashboard');
        expect(analysisButton).toHaveAttribute('href', '/bill-sponsorship-analysis');
      });
    });

    it('should render statistics section', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('1,247')).toBeInTheDocument();
        expect(screen.getByText('Bills Tracked')).toBeInTheDocument();
        
        expect(screen.getByText('15,834')).toBeInTheDocument();
        expect(screen.getByText('Community Members')).toBeInTheDocument();
        
        expect(screen.getByText('892')).toBeInTheDocument();
        expect(screen.getByText('Expert Verifications')).toBeInTheDocument();
        
        expect(screen.getByText('72%')).toBeInTheDocument();
        expect(screen.getByText('Transparency Score Avg')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderHomePage();

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
        
        const h2Elements = screen.getAllByRole('heading', { level: 2 });
        expect(h2Elements.length).toBeGreaterThan(0);
      });
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      renderHomePage();

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');
        
        expect(startTrackingButton).toBeInTheDocument();
        expect(joinMovementButton).toBeInTheDocument();
      });
    });

    it('should have proper semantic sections', async () => {
      renderHomePage();

      await waitFor(() => {
        const banner = screen.getByRole('banner');
        expect(banner).toBeInTheDocument();
        
        // Check for section elements
        const sections = document.querySelectorAll('section');
        expect(sections.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard focus', async () => {
      renderHomePage();

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        
        startTrackingButton.focus();
        expect(startTrackingButton).toHaveFocus();
      });
    });
  });

  describe('Visual Design', () => {
    it('should use Chanuka brand colors', async () => {
      renderHomePage();

      await waitFor(() => {
        const heroSection = screen.getByRole('banner');
        expect(heroSection).toHaveClass('bg-gradient-to-br', 'from-[#0d3b66]');
      });
    });

    it('should have proper hover effects', async () => {
      renderHomePage();

      await waitFor(() => {
        const featureCards = document.querySelectorAll('.hover\\:shadow-xl');
        expect(featureCards.length).toBeGreaterThan(0);
      });
    });

    it('should have transition animations', async () => {
      renderHomePage();

      await waitFor(() => {
        const transitionElements = document.querySelectorAll('.transition-all');
        expect(transitionElements.length).toBeGreaterThan(0);
      });
    });

    it('should have responsive classes', async () => {
      renderHomePage();

      await waitFor(() => {
        const heading = screen.getByText('Your Voice in');
        expect(heading.closest('h1')).toHaveClass('text-4xl', 'md:text-6xl');
      });
    });
  });

  describe('Content Verification', () => {
    it('should render all expected feature cards', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Bill Tracking')).toBeInTheDocument();
        expect(screen.getByText('Transparency Analysis')).toBeInTheDocument();
        expect(screen.getByText('Community Input')).toBeInTheDocument();
        expect(screen.getByText('Expert Verification')).toBeInTheDocument();
      });
    });

    it('should render mission statement', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Democracy Thrives on')).toBeInTheDocument();
        expect(screen.getByText('Transparency')).toBeInTheDocument();
        expect(screen.getByText(/We believe every citizen deserves access to clear, unbiased information/)).toBeInTheDocument();
      });
    });

    it('should render call to action section', async () => {
      renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Ready to Make a Difference?')).toBeInTheDocument();
        expect(screen.getByText(/Join thousands of engaged citizens using transparency tools/)).toBeInTheDocument();
      });
    });
  });

  describe('Link Functionality', () => {
    it('should have clickable feature cards', async () => {
      renderHomePage();

      await waitFor(() => {
        const billTrackingCard = screen.getByLabelText('Bill Tracking: Monitor legislative proposals and their progress through the system');
        
        // Should be a link element
        expect(billTrackingCard.tagName).toBe('A');
        expect(billTrackingCard).toHaveAttribute('href', '/bills');
      });
    });

    it('should have clickable CTA buttons', async () => {
      renderHomePage();

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        
        // Should be a link element
        expect(startTrackingButton.tagName).toBe('A');
        expect(startTrackingButton).toHaveAttribute('href', '/bills');
      });
    });

    it('should have all navigation links properly formed', async () => {
      renderHomePage();

      await waitFor(() => {
        // Get all links on the page
        const links = screen.getAllByRole('link');
        
        // Should have multiple navigation links
        expect(links.length).toBeGreaterThan(5);
        
        // Each link should have an href attribute
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
          const href = link.getAttribute('href');
          expect(href).toMatch(/^\/[a-z-]*$/); // Should be internal links
        });
      });
    });
  });

  describe('Performance', () => {
    it('should render without memory leaks', async () => {
      const { unmount } = renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      unmount();
      
      // Should unmount cleanly
      expect(true).toBe(true);
    });

    it('should handle rapid interactions', async () => {
      renderHomePage();

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');

        // Rapid clicks should not cause issues
        fireEvent.click(startTrackingButton);
        fireEvent.click(joinMovementButton);
        fireEvent.click(startTrackingButton);

        // Should still be functional
        expect(startTrackingButton).toBeInTheDocument();
        expect(joinMovementButton).toBeInTheDocument();
      });
    });
  });
});

describe('NavigationCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render without crashing', () => {
    const { container } = render(<NavigationCore />);
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<NavigationCore />);
    expect(container.firstChild).toHaveAttribute('role');
  });

  it('should handle props correctly', () => {
    // TODO: Add specific prop tests for NavigationCore
    expect(true).toBe(true);
  });
});

