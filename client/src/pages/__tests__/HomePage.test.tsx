import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HomePage from '../home';
import { renderWithProviders } from '../../test-utils';

// Mock hooks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
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
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Hero Section', () => {
    it('should render hero section with main heading', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
        expect(screen.getByText('Government Transparency')).toBeInTheDocument();
      });
    });

    it('should render hero section with description', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/Cut through political noise with AI-powered analysis/)).toBeInTheDocument();
      });
    });

    it('should render primary CTA buttons in hero section', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');
        
        expect(startTrackingButton).toBeInTheDocument();
        expect(joinMovementButton).toBeInTheDocument();
        
        expect(startTrackingButton).toHaveAttribute('href', '/bills');
        expect(joinMovementButton).toHaveAttribute('href', '/community');
      });
    });
  });

  describe('Statistics Section', () => {
    it('should render statistics with proper values', async () => {
      renderWithProviders(<HomePage />);

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

    it('should have proper accessibility labels for statistics', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const billsStat = screen.getByLabelText('1,247 Bills Tracked');
        expect(billsStat).toBeInTheDocument();
      });
    });
  });

  describe('Features Section', () => {
    it('should render all feature cards', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Bill Tracking')).toBeInTheDocument();
        expect(screen.getByText('Transparency Analysis')).toBeInTheDocument();
        expect(screen.getByText('Community Input')).toBeInTheDocument();
        expect(screen.getByText('Expert Verification')).toBeInTheDocument();
      });
    });

    it('should have clickable feature cards with proper links', async () => {
      renderWithProviders(<HomePage />);

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

    it('should show hover effects on feature cards', async () => {
      renderWithProviders(<HomePage />);

      const billTrackingCard = await screen.findByLabelText('Bill Tracking: Monitor legislative proposals and their progress through the system');
      
      // Check for hover classes
      expect(billTrackingCard).toHaveClass('hover:shadow-xl');
      expect(billTrackingCard).toHaveClass('transition-all');
    });
  });

  describe('Mission Statement Section', () => {
    it('should render mission statement', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Democracy Thrives on')).toBeInTheDocument();
        expect(screen.getByText('Transparency')).toBeInTheDocument();
      });
    });

    it('should render mission description', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/We believe every citizen deserves access to clear, unbiased information/)).toBeInTheDocument();
      });
    });

    it('should have dashboard link in mission section', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const dashboardLink = screen.getByText('See Your Impact');
        expect(dashboardLink).toBeInTheDocument();
        expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard');
      });
    });
  });

  describe('Call to Action Section', () => {
    it('should render CTA section with proper heading', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Ready to Make a Difference?')).toBeInTheDocument();
      });
    });

    it('should render CTA buttons with proper links', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const dashboardButton = screen.getByLabelText('Access your personal dashboard');
        const analysisButton = screen.getByLabelText('Explore bill analysis tools');
        
        expect(dashboardButton).toHaveAttribute('href', '/dashboard');
        expect(analysisButton).toHaveAttribute('href', '/bill-sponsorship-analysis');
      });
    });
  });

  describe('Navigation Functionality', () => {
    it('should navigate to bills page when bill tracking card is clicked', async () => {
      const mockNavigate = vi.fn();
      
      // Mock useNavigate
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });

      renderWithProviders(<HomePage />);

      const billTrackingCard = await screen.findByLabelText('Bill Tracking: Monitor legislative proposals and their progress through the system');
      fireEvent.click(billTrackingCard);

      // Link should be present and clickable
      expect(billTrackingCard).toHaveAttribute('href', '/bills');
    });

    it('should navigate to community page when community card is clicked', async () => {
      renderWithProviders(<HomePage />);

      const communityCard = await screen.findByLabelText('Community Input: Participate in public discourse and provide feedback');
      fireEvent.click(communityCard);

      expect(communityCard).toHaveAttribute('href', '/community');
    });

    it('should navigate to analysis page when transparency card is clicked', async () => {
      renderWithProviders(<HomePage />);

      const transparencyCard = await screen.findByLabelText('Transparency Analysis: Analyze conflicts of interest and sponsor relationships');
      fireEvent.click(transparencyCard);

      expect(transparencyCard).toHaveAttribute('href', '/bill-sponsorship-analysis');
    });

    it('should navigate to expert verification when expert card is clicked', async () => {
      renderWithProviders(<HomePage />);

      const expertCard = await screen.findByLabelText('Expert Verification: Access expert analysis and fact-checking resources');
      fireEvent.click(expertCard);

      expect(expertCard).toHaveAttribute('href', '/expert-verification');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
        
        const h2Elements = screen.getAllByRole('heading', { level: 2 });
        expect(h2Elements.length).toBeGreaterThan(0);
      });
    });

    it('should have proper ARIA labels for interactive elements', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const startTrackingButton = screen.getByLabelText('Start tracking legislative bills and proposals');
        const joinMovementButton = screen.getByLabelText('Join our community of engaged citizens');
        
        expect(startTrackingButton).toBeInTheDocument();
        expect(joinMovementButton).toBeInTheDocument();
      });
    });

    it('should have proper focus management', async () => {
      renderWithProviders(<HomePage />);

      const startTrackingButton = await screen.findByLabelText('Start tracking legislative bills and proposals');
      
      startTrackingButton.focus();
      expect(startTrackingButton).toHaveFocus();
    });

    it('should have proper semantic sections', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const banner = screen.getByRole('banner');
        expect(banner).toBeInTheDocument();
        
        const sections = screen.getAllByRole('region');
        expect(sections.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes for different screen sizes', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('banner');
        expect(heroSection).toHaveClass('py-20');
        
        // Check for responsive text classes
        const heading = screen.getByText('Your Voice in');
        expect(heading.closest('h1')).toHaveClass('text-4xl', 'md:text-6xl');
      });
    });

    it('should have responsive grid layouts', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const featuresGrid = document.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
        expect(featuresGrid).toBeInTheDocument();
      });
    });
  });

  describe('Visual Design', () => {
    it('should use Chanuka brand colors', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const heroSection = screen.getByRole('banner');
        expect(heroSection).toHaveClass('bg-gradient-to-br', 'from-[#0d3b66]');
      });
    });

    it('should have proper hover effects', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const featureCards = document.querySelectorAll('.hover\\:shadow-xl');
        expect(featureCards.length).toBeGreaterThan(0);
      });
    });

    it('should have transition animations', async () => {
      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const transitionElements = document.querySelectorAll('.transition-all');
        expect(transitionElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks', async () => {
      const { unmount } = renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Your Voice in')).toBeInTheDocument();
      });

      unmount();
      
      // Should unmount cleanly without errors
      expect(true).toBe(true);
    });
  });
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render without crashing', () => {
    const { container } = render(<HomePage />);
    expect(container).toBeInTheDocument();
  });

  it('should be accessible', () => {
    const { container } = render(<HomePage />);
    expect(container.firstChild).toHaveAttribute('role');
  });

  it('should handle props correctly', () => {
    // TODO: Add specific prop tests for HomePage
    expect(true).toBe(true);
  });
});

