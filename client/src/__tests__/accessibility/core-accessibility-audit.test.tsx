/**
 * Core Accessibility Audit
 * 
 * Essential accessibility tests for WCAG 2.1 AA compliance
 * focusing on the most critical accessibility features
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Core Accessibility Audit', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Set up document language
    document.documentElement.lang = 'en';
  });

  describe('Document Structure', () => {
    it('should have proper document language', () => {
      expect(document.documentElement).toHaveAttribute('lang', 'en');
    });

    it('should have proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <section>
            <h2>Section Title</h2>
            <article>
              <h3>Article Title</h3>
            </article>
          </section>
        </div>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent('Main Title');
      expect(h2).toHaveTextContent('Section Title');
      expect(h3).toHaveTextContent('Article Title');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should use proper landmark roles', async () => {
      const { container } = render(
        <div>
          <header>Header Content</header>
          <nav aria-label="Main navigation">
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <main>
            <h1>Main Content</h1>
            <p>This is the main content area.</p>
          </main>
          <aside>
            <h2>Sidebar</h2>
            <p>Sidebar content</p>
          </aside>
          <footer>Footer Content</footer>
        </div>
      );

      // Check landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Accessibility', () => {
    it('should have properly labeled form controls', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="username">Username</label>
            <input id="username" type="text" required />
          </div>
          <div>
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required />
          </div>
          <button type="submit">Submit</button>
        </form>
      );

      // Check form labels
      const usernameInput = screen.getByLabelText('Username');
      const emailInput = screen.getByLabelText('Email Address');
      const passwordInput = screen.getByLabelText('Password');

      expect(usernameInput).toBeRequired();
      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide error messages with proper associations', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="email-input">Email Address</label>
            <input 
              id="email-input" 
              type="email" 
              required 
              aria-describedby="email-error"
              aria-invalid="true"
            />
            <div id="email-error" role="alert">
              Please enter a valid email address
            </div>
          </div>
        </form>
      );

      const input = screen.getByLabelText('Email Address');
      const errorMessage = screen.getByRole('alert');

      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(errorMessage).toHaveTextContent('Please enter a valid email address');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should use fieldsets for grouped form controls', async () => {
      const { container } = render(
        <form>
          <fieldset>
            <legend>Contact Preferences</legend>
            <div>
              <input type="checkbox" id="email-pref" name="contact" value="email" />
              <label htmlFor="email-pref">Email notifications</label>
            </div>
            <div>
              <input type="checkbox" id="sms-pref" name="contact" value="sms" />
              <label htmlFor="sms-pref">SMS notifications</label>
            </div>
          </fieldset>
        </form>
      );

      const fieldset = screen.getByRole('group', { name: 'Contact Preferences' });
      expect(fieldset).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible buttons', async () => {
      const { container } = render(
        <div>
          <button>Regular Button</button>
          <button aria-label="Close dialog">×</button>
          <button aria-describedby="save-help">Save</button>
          <div id="save-help">Save your current progress</div>
        </div>
      );

      const regularButton = screen.getByText('Regular Button');
      const closeButton = screen.getByLabelText('Close dialog');
      const saveButton = screen.getByText('Save');

      expect(regularButton).toHaveAccessibleName();
      expect(closeButton).toHaveAccessibleName();
      expect(saveButton).toHaveAccessibleName();
      expect(saveButton).toHaveAttribute('aria-describedby', 'save-help');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible links', async () => {
      const { container } = render(
        <div>
          <a href="/home">Home Page</a>
          <a href="/external" target="_blank" rel="noopener noreferrer">
            External Link
            <span className="sr-only">(opens in new window)</span>
          </a>
          <a href="#section1" aria-describedby="link-help">
            Jump to Section 1
          </a>
          <div id="link-help">Navigate to the first section of this page</div>
        </div>
      );

      const homeLink = screen.getByText('Home Page');
      const externalLink = screen.getByText('External Link');
      const jumpLink = screen.getByText('Jump to Section 1');

      expect(homeLink).toHaveAccessibleName();
      expect(externalLink).toHaveAccessibleName();
      expect(jumpLink).toHaveAccessibleName();
      expect(jumpLink).toHaveAttribute('aria-describedby', 'link-help');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images and Media', () => {
    it('should have proper alt text for images', async () => {
      const { container } = render(
        <div>
          <img src="/chart.jpg" alt="Bill approval ratings over time showing 65% approval" />
          <img src="/decoration.jpg" alt="" role="presentation" />
          <img src="/logo.jpg" alt="Chanuka Platform Logo" />
        </div>
      );

      const chartImage = screen.getByAltText('Bill approval ratings over time showing 65% approval');
      const decorativeImage = screen.getByRole('presentation');
      const logoImage = screen.getByAltText('Chanuka Platform Logo');

      expect(chartImage).toBeInTheDocument();
      expect(decorativeImage).toHaveAttribute('alt', '');
      expect(logoImage).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tables', () => {
    it('should have accessible table structure', async () => {
      const { container } = render(
        <table>
          <caption>Legislative Bills Summary</caption>
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
              <td>Healthcare Reform Act</td>
              <td>Active</td>
              <td>
                <button aria-label="View details for HB-2024-001">View</button>
              </td>
            </tr>
            <tr>
              <th scope="row">SB-2024-002</th>
              <td>Education Funding Bill</td>
              <td>In Committee</td>
              <td>
                <button aria-label="View details for SB-2024-002">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      );

      const table = screen.getByRole('table', { name: 'Legislative Bills Summary' });
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4);

      const rowHeaders = screen.getAllByRole('rowheader');
      expect(rowHeaders).toHaveLength(2);

      const viewButtons = screen.getAllByText('View');
      expect(viewButtons[0]).toHaveAttribute('aria-label', 'View details for HB-2024-001');
      expect(viewButtons[1]).toHaveAttribute('aria-label', 'View details for SB-2024-002');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Lists', () => {
    it('should have proper list structure', async () => {
      const { container } = render(
        <div>
          <ul aria-label="Navigation menu">
            <li><a href="/bills">Bills</a></li>
            <li><a href="/community">Community</a></li>
            <li><a href="/profile">Profile</a></li>
          </ul>
          <ol aria-label="Steps to complete">
            <li>Review the bill</li>
            <li>Submit comments</li>
            <li>Share with community</li>
          </ol>
          <dl>
            <dt>Bill Status</dt>
            <dd>Currently active in committee review</dd>
            <dt>Sponsor</dt>
            <dd>Representative Jane Smith</dd>
          </dl>
        </div>
      );

      const navList = screen.getByLabelText('Navigation menu');
      const stepsList = screen.getByLabelText('Steps to complete');

      expect(navList).toBeInTheDocument();
      expect(stepsList).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(6); // 3 from ul + 3 from ol

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Live Regions', () => {
    it('should announce status updates', async () => {
      const StatusComponent = () => {
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

      const { container } = render(<StatusComponent />);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveTextContent('Status: Ready');

      const startButton = screen.getByText('Start Process');
      await user.click(startButton);
      expect(statusRegion).toHaveTextContent('Status: Loading...');

      const finishButton = screen.getByText('Finish Process');
      await user.click(finishButton);
      expect(statusRegion).toHaveTextContent('Status: Complete');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce alerts', async () => {
      const AlertComponent = () => {
        const [alert, setAlert] = React.useState('');
        
        return (
          <div>
            <button onClick={() => setAlert('Error: Something went wrong')}>
              Trigger Error
            </button>
            <button onClick={() => setAlert('Success: Operation completed')}>
              Trigger Success
            </button>
            <div role="alert" aria-live="assertive">
              {alert}
            </div>
          </div>
        );
      };

      const { container } = render(<AlertComponent />);

      const alertRegion = screen.getByRole('alert');
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive');

      const errorButton = screen.getByText('Trigger Error');
      await user.click(errorButton);
      expect(alertRegion).toHaveTextContent('Error: Something went wrong');

      const successButton = screen.getByText('Trigger Success');
      await user.click(successButton);
      expect(alertRegion).toHaveTextContent('Success: Operation completed');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support basic keyboard navigation', async () => {
      render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <input type="text" placeholder="Text input" />
          <a href="/link">Link</a>
        </div>
      );

      const button1 = screen.getByText('Button 1');
      const button2 = screen.getByText('Button 2');
      const input = screen.getByPlaceholderText('Text input');
      const link = screen.getByText('Link');

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBe(button1);

      await user.tab();
      expect(document.activeElement).toBe(button2);

      await user.tab();
      expect(document.activeElement).toBe(input);

      await user.tab();
      expect(document.activeElement).toBe(link);
    });

    it('should handle Enter and Space key activation', async () => {
      const handleClick = vi.fn();
      
      render(
        <div>
          <button onClick={handleClick}>Click Me</button>
        </div>
      );

      const button = screen.getByText('Click Me');
      button.focus();

      // Test Enter key
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Focus Management', () => {
    it('should provide visible focus indicators', async () => {
      const { container } = render(
        <div>
          <button>Focusable Button</button>
          <input type="text" placeholder="Focusable Input" />
          <a href="/test">Focusable Link</a>
        </div>
      );

      const button = screen.getByText('Focusable Button');
      const input = screen.getByPlaceholderText('Focusable Input');
      const link = screen.getByText('Focusable Link');

      // Test focus indicators
      button.focus();
      expect(button).toHaveFocus();

      input.focus();
      expect(input).toHaveFocus();

      link.focus();
      expect(link).toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle modal focus management', async () => {
      const ModalComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            {isOpen && (
              <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h2 id="modal-title">Modal Title</h2>
                <p>Modal content goes here.</p>
                <button onClick={() => setIsOpen(false)}>Close</button>
              </div>
            )}
          </div>
        );
      };

      const { container } = render(<ModalComponent />);

      const openButton = screen.getByText('Open Modal');
      await user.click(openButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

      const closeButton = screen.getByText('Close');
      expect(closeButton).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Content', () => {
    it('should provide screen reader only content', async () => {
      const { container } = render(
        <div>
          <button aria-label="Save bill to reading list">
            <span className="sr-only">Save bill to reading list</span>
            <span aria-hidden="true">💾</span>
          </button>
          <a href="/external" target="_blank" rel="noopener noreferrer">
            External Link
            <span className="sr-only">(opens in new window)</span>
          </a>
        </div>
      );

      const saveButton = screen.getByLabelText('Save bill to reading list');
      expect(saveButton).toBeInTheDocument();

      const externalLinkContext = screen.getByText('(opens in new window)');
      expect(externalLinkContext).toHaveClass('sr-only');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should hide decorative content from screen readers', async () => {
      const { container } = render(
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
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Important Announcement 📢');

      const decorativeImage = screen.getByRole('presentation');
      expect(decorativeImage).toHaveAttribute('alt', '');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});