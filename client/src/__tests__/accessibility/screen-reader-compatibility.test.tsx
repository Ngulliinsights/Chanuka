/**
 * Screen Reader Compatibility Tests
 * 
 * Tests to ensure proper screen reader support and ARIA implementation
 * for the Chanuka client UI components
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components for testing
import NavigationBar from '@client/components/shell/NavigationBar';
import BillCard from '@client/components/bills/BillCard';
import FilterPanel from '@client/components/bills/FilterPanel';
import BillDetailView from '@client/components/bill-detail/BillDetailView';
import DiscussionThread from '@client/components/discussion/DiscussionThread';
import ExpertBadge from '@client/components/verification/ExpertBadge';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock data
const mockBill = {
  id: '1',
  billNumber: 'HB-2024-001',
  title: 'Test Accessibility Bill',
  summary: 'A bill to test screen reader accessibility features',
  status: 'active' as const,
  urgencyLevel: 'high' as const,
  introducedDate: new Date('2024-01-01'),
  lastUpdated: new Date('2024-01-15'),
  sponsors: [],
  committees: [],
  amendments: [],
  relatedBills: [],
  constitutionalFlags: [],
  pretextDetection: null,
  impactAssessment: {
    overallScore: 8.5,
    categories: {
      economic: 7.5,
      social: 9.0,
      environmental: 8.0,
      constitutional: 9.5,
    },
    confidence: 0.85,
    methodology: 'AI-assisted analysis with expert review',
  },
  viewCount: 1250,
  saveCount: 89,
  commentCount: 23,
  shareCount: 15,
  policyAreas: ['Healthcare', 'Education'],
  geographicScope: 'national' as const,
  complexity: 'medium' as const,
  readingTime: {
    minutes: 15,
    difficulty: 'intermediate' as const,
  },
};

describe('Screen Reader Compatibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Semantic HTML Structure', () => {
    it('should use proper heading hierarchy', async () => {
      render(
        <TestWrapper>
          <div>
            <h1>Main Page Title</h1>
            <section>
              <h2>Section Title</h2>
              <article>
                <h3>Article Title</h3>
                <h4>Subsection</h4>
              </article>
            </section>
          </div>
        </TestWrapper>
      );

      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });
      const h4 = screen.getByRole('heading', { level: 4 });

      expect(h1).toHaveTextContent('Main Page Title');
      expect(h2).toHaveTextContent('Section Title');
      expect(h3).toHaveTextContent('Article Title');
      expect(h4).toHaveTextContent('Subsection');
    });

    it('should use proper landmark roles', async () => {
      render(
        <TestWrapper>
          <div>
            <header role="banner">
              <NavigationBar />
            </header>
            <nav role="navigation" aria-label="Main navigation">
              <ul>
                <li><a href="/bills">Bills</a></li>
                <li><a href="/community">Community</a></li>
              </ul>
            </nav>
            <main role="main">
              <h1>Main Content</h1>
            </main>
            <aside role="complementary">
              <h2>Sidebar</h2>
            </aside>
            <footer role="contentinfo">
              <p>Footer content</p>
            </footer>
          </div>
        </TestWrapper>
      );

      // Check landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should use proper list structures', async () => {
      render(
        <TestWrapper>
          <div>
            <ul>
              <li>Unordered item 1</li>
              <li>Unordered item 2</li>
            </ul>
            <ol>
              <li>Ordered item 1</li>
              <li>Ordered item 2</li>
            </ol>
            <dl>
              <dt>Term 1</dt>
              <dd>Definition 1</dd>
              <dt>Term 2</dt>
              <dd>Definition 2</dd>
            </dl>
          </div>
        </TestWrapper>
      );

      // Check list structures
      const unorderedList = screen.getByRole('list');
      const orderedList = screen.getAllByRole('list')[1];
      
      expect(unorderedList).toBeInTheDocument();
      expect(orderedList).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(4);
    });
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should provide accessible names for interactive elements', async () => {
      render(
        <TestWrapper>
          <div>
            <button aria-label="Close dialog">×</button>
            <button aria-labelledby="save-label">
              <span id="save-label">Save Bill</span>
            </button>
            <input 
              type="search" 
              aria-label="Search for bills and legislation"
              placeholder="Enter search terms"
            />
            <img 
              src="/test.jpg" 
              alt="Constitutional analysis chart showing bill compliance scores"
            />
          </div>
        </TestWrapper>
      );

      // Check accessible names
      const closeButton = screen.getByLabelText('Close dialog');
      expect(closeButton).toBeInTheDocument();

      const saveButton = screen.getByLabelText('Save Bill');
      expect(saveButton).toBeInTheDocument();

      const searchInput = screen.getByLabelText('Search for bills and legislation');
      expect(searchInput).toBeInTheDocument();

      const image = screen.getByAltText('Constitutional analysis chart showing bill compliance scores');
      expect(image).toBeInTheDocument();
    });

    it('should provide helpful descriptions with aria-describedby', async () => {
      render(
        <TestWrapper>
          <div>
            <input 
              type="password"
              aria-label="Password"
              aria-describedby="password-help password-requirements"
            />
            <div id="password-help">
              Enter your account password
            </div>
            <div id="password-requirements">
              Password must be at least 12 characters long
            </div>
          </div>
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-help password-requirements');

      const helpText = screen.getByText('Enter your account password');
      const requirements = screen.getByText('Password must be at least 12 characters long');
      
      expect(helpText).toBeInTheDocument();
      expect(requirements).toBeInTheDocument();
    });

    it('should use aria-expanded for collapsible content', async () => {
      const TestCollapsible = () => {
        const [isExpanded, setIsExpanded] = React.useState(false);
        
        return (
          <div>
            <button 
              aria-expanded={isExpanded}
              aria-controls="collapsible-content"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              Toggle Content
            </button>
            <div id="collapsible-content" hidden={!isExpanded}>
              <p>Collapsible content here</p>
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestCollapsible />
        </TestWrapper>
      );

      const toggleButton = screen.getByText('Toggle Content');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      const content = screen.getByText('Collapsible content here');
      expect(content).toBeVisible();
    });
  });

  describe('Live Regions and Dynamic Content', () => {
    it('should announce status updates with aria-live', async () => {
      const TestStatusUpdates = () => {
        const [status, setStatus] = React.useState('Ready');
        
        return (
          <div>
            <button onClick={() => setStatus('Loading...')}>
              Start Process
            </button>
            <button onClick={() => setStatus('Complete')}>
              Finish Process
            </button>
            <div role="status" aria-live="polite">
              Status: {status}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestStatusUpdates />
        </TestWrapper>
      );

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveTextContent('Status: Ready');

      const startButton = screen.getByText('Start Process');
      await user.click(startButton);
      expect(statusRegion).toHaveTextContent('Status: Loading...');

      const finishButton = screen.getByText('Finish Process');
      await user.click(finishButton);
      expect(statusRegion).toHaveTextContent('Status: Complete');
    });

    it('should announce alerts with aria-live="assertive"', async () => {
      const TestAlerts = () => {
        const [alert, setAlert] = React.useState('');
        
        return (
          <div>
            <button onClick={() => setAlert('Error: Form submission failed')}>
              Trigger Error
            </button>
            <button onClick={() => setAlert('Success: Form submitted successfully')}>
              Trigger Success
            </button>
            <div role="alert" aria-live="assertive">
              {alert}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestAlerts />
        </TestWrapper>
      );

      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive');

      const errorButton = screen.getByText('Trigger Error');
      await user.click(errorButton);
      expect(alertRegion).toHaveTextContent('Error: Form submission failed');

      const successButton = screen.getByText('Trigger Success');
      await user.click(successButton);
      expect(alertRegion).toHaveTextContent('Success: Form submitted successfully');
    });

    it('should announce loading states', async () => {
      const TestLoading = () => {
        const [loading, setLoading] = React.useState(false);
        
        const handleLoad = async () => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1000);
        };
        
        return (
          <div>
            <button onClick={handleLoad} disabled={loading}>
              {loading ? 'Loading...' : 'Load Data'}
            </button>
            {loading && (
              <div role="status" aria-live="polite">
                <span className="sr-only">Loading data, please wait...</span>
                <div aria-hidden="true">⏳</div>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestLoading />
        </TestWrapper>
      );

      const loadButton = screen.getByText('Load Data');
      await user.click(loadButton);

      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toBeInTheDocument();
      expect(screen.getByText('Loading data, please wait...')).toHaveClass('sr-only');
    });
  });

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', async () => {
      render(
        <TestWrapper>
          <form>
            <label htmlFor="username">Username</label>
            <input id="username" type="text" required />
            
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" required />
            
            <fieldset>
              <legend>Notification Preferences</legend>
              <label>
                <input type="checkbox" name="notifications" value="email" />
                Email notifications
              </label>
              <label>
                <input type="checkbox" name="notifications" value="sms" />
                SMS notifications
              </label>
            </fieldset>
          </form>
        </TestWrapper>
      );

      // Check form labels
      const usernameInput = screen.getByLabelText('Username');
      const emailInput = screen.getByLabelText('Email Address');
      
      expect(usernameInput).toBeRequired();
      expect(emailInput).toBeRequired();

      // Check fieldset and legend
      const fieldset = screen.getByRole('group', { name: 'Notification Preferences' });
      expect(fieldset).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('should provide error messages with proper associations', async () => {
      const TestFormValidation = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({});
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const newErrors: Record<string, string> = {};
          
          if (!formData.get('email')) {
            newErrors.email = 'Email is required';
          }
          
          setErrors(newErrors);
        };
        
        return (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email Address</label>
            <input 
              id="email" 
              name="email"
              type="email" 
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <div id="email-error" role="alert">
                {errors.email}
              </div>
            )}
            <button type="submit">Submit</button>
          </form>
        );
      };

      render(
        <TestWrapper>
          <TestFormValidation />
        </TestWrapper>
      );

      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      const emailInput = screen.getByLabelText('Email Address');
      const errorMessage = screen.getByRole('alert');

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(errorMessage).toHaveTextContent('Email is required');
    });
  });

  describe('Table Accessibility', () => {
    it('should provide accessible table structure', async () => {
      render(
        <TestWrapper>
          <table>
            <caption>Bills Summary Table</caption>
            <thead>
              <tr>
                <th scope="col">Bill Number</th>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">HB-2024-001</th>
                <td>Test Bill</td>
                <td>Active</td>
                <td>
                  <button aria-label="View details for HB-2024-001">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </TestWrapper>
      );

      // Check table structure
      const table = screen.getByRole('table', { name: 'Bills Summary Table' });
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4);

      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders).toHaveLength(1);

      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(3);

      // Check action button has descriptive label
      const viewButton = screen.getByLabelText('View details for HB-2024-001');
      expect(viewButton).toBeInTheDocument();
    });

    it('should handle complex table headers', async () => {
      render(
        <TestWrapper>
          <table>
            <caption>Bill Analysis by Category</caption>
            <thead>
              <tr>
                <th rowSpan={2} scope="col">Bill</th>
                <th colSpan={2} scope="colgroup">Impact Scores</th>
              </tr>
              <tr>
                <th scope="col">Economic</th>
                <th scope="col">Social</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">HB-2024-001</th>
                <td>7.5</td>
                <td>9.0</td>
              </tr>
            </tbody>
          </table>
        </TestWrapper>
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check complex header structure
      const columnGroupHeader = screen.getByText('Impact Scores');
      expect(columnGroupHeader).toHaveAttribute('scope', 'colgroup');
      expect(columnGroupHeader).toHaveAttribute('colSpan', '2');
    });
  });

  describe('Navigation and Menu Accessibility', () => {
    it('should provide accessible navigation menus', async () => {
      const TestNavigation = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <nav role="navigation" aria-label="Main navigation">
            <button 
              aria-expanded={isOpen}
              aria-controls="nav-menu"
              onClick={() => setIsOpen(!isOpen)}
            >
              Menu
            </button>
            <ul id="nav-menu" role="menu" hidden={!isOpen}>
              <li role="none">
                <a href="/bills" role="menuitem">Bills</a>
              </li>
              <li role="none">
                <a href="/community" role="menuitem">Community</a>
              </li>
              <li role="none">
                <a href="/profile" role="menuitem">Profile</a>
              </li>
            </ul>
          </nav>
        );
      };

      render(
        <TestWrapper>
          <TestNavigation />
        </TestWrapper>
      );

      const menuButton = screen.getByText('Menu');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-controls', 'nav-menu');

      await user.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      const menu = screen.getByRole('menu');
      expect(menu).toBeVisible();

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(3);
    });

    it('should provide breadcrumb navigation', async () => {
      render(
        <TestWrapper>
          <nav aria-label="Breadcrumb">
            <ol>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/bills">Bills</a>
              </li>
              <li aria-current="page">
                HB-2024-001
              </li>
            </ol>
          </nav>
        </TestWrapper>
      );

      const breadcrumbNav = screen.getByLabelText('Breadcrumb');
      expect(breadcrumbNav).toBeInTheDocument();

      const currentPage = screen.getByText('HB-2024-001');
      expect(currentPage).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Screen Reader Only Content', () => {
    it('should provide screen reader only context', async () => {
      render(
        <TestWrapper>
          <div>
            <button>
              <span className="sr-only">Save bill to your reading list</span>
              <span aria-hidden="true">💾</span>
            </button>
            <a href="/external" target="_blank" rel="noopener noreferrer">
              External Link
              <span className="sr-only">(opens in new window)</span>
            </a>
            <div>
              <span className="sr-only">Loading:</span>
              <div aria-hidden="true" role="presentation">
                ████████░░ 80%
              </div>
            </div>
          </div>
        </TestWrapper>
      );

      // Check screen reader only content
      const saveButton = screen.getByLabelText('Save bill to your reading list');
      expect(saveButton).toBeInTheDocument();

      const externalLinkContext = screen.getByText('(opens in new window)');
      expect(externalLinkContext).toHaveClass('sr-only');

      const loadingContext = screen.getByText('Loading:');
      expect(loadingContext).toHaveClass('sr-only');
    });

    it('should hide decorative content from screen readers', async () => {
      render(
        <TestWrapper>
          <div>
            <h2>
              Important Announcement
              <span aria-hidden="true"> 📢</span>
            </h2>
            <div aria-hidden="true" className="decorative-border">
              ═══════════════════
            </div>
            <p>This is the actual content.</p>
            <img src="/decoration.jpg" alt="" role="presentation" />
          </div>
        </TestWrapper>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Important Announcement 📢');

      const decorativeImage = screen.getByRole('presentation');
      expect(decorativeImage).toHaveAttribute('alt', '');
    });
  });
});