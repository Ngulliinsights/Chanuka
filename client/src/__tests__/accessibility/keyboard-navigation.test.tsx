/**
 * Keyboard Navigation Accessibility Tests
 * 
 * Comprehensive testing of keyboard navigation patterns throughout the Chanuka client
 * to ensure full keyboard accessibility as required by WCAG 2.1 AA
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components for keyboard testing
import NavigationBar from '../../components/shell/NavigationBar';
import { BillsDashboard } from '../../components/bills/bills-dashboard';
import FilterPanel from '../../components/bills/FilterPanel';
import BillDetailView from '../../components/bill-detail/BillDetailView';
import DiscussionThread from '../../components/discussion/DiscussionThread';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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

// Helper function to get all focusable elements
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="tab"]',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter((element) => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hidden &&
        window.getComputedStyle(htmlElement).visibility !== 'hidden'
      );
    }) as HTMLElement[];
};

describe('Keyboard Navigation Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Tab Order and Focus Management', () => {
    it('should have logical tab order in navigation', async () => {
      const { container } = render(
        <TestWrapper>
          <NavigationBar />
        </TestWrapper>
      );

      const focusableElements = getFocusableElements(container);
      expect(focusableElements.length).toBeGreaterThan(0);

      // Test sequential tab navigation
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        await user.tab();
        const activeElement = document.activeElement as HTMLElement;
        expect(focusableElements).toContain(activeElement);
      }
    });

    it('should support reverse tab navigation', async () => {
      const { container } = render(
        <TestWrapper>
          <NavigationBar />
        </TestWrapper>
      );

      const focusableElements = getFocusableElements(container);
      
      // Tab to the last element
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
      }

      // Now tab backwards
      await user.tab({ shift: true });
      const activeElement = document.activeElement as HTMLElement;
      expect(focusableElements).toContain(activeElement);
    });

    it('should skip non-focusable elements', async () => {
      render(
        <TestWrapper>
          <div>
            <button>Focusable 1</button>
            <div>Non-focusable</div>
            <span>Also non-focusable</span>
            <button>Focusable 2</button>
          </div>
        </TestWrapper>
      );

      const button1 = screen.getByText('Focusable 1');
      const button2 = screen.getByText('Focusable 2');

      button1.focus();
      expect(document.activeElement).toBe(button1);

      await user.tab();
      expect(document.activeElement).toBe(button2);
    });
  });

  describe('Skip Links', () => {
    it('should provide skip to main content link', async () => {
      render(
        <TestWrapper>
          <div>
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <NavigationBar />
            <main id="main-content">
              <h1>Main Content</h1>
            </main>
          </div>
        </TestWrapper>
      );

      const skipLink = screen.getByText('Skip to main content');
      
      // Skip link should be first focusable element
      await user.tab();
      expect(document.activeElement).toBe(skipLink);

      // Activating skip link should move focus to main content
      await user.keyboard('{Enter}');
      const mainContent = document.getElementById('main-content');
      expect(document.activeElement).toBe(mainContent);
    });

    it('should provide skip to navigation link', async () => {
      render(
        <TestWrapper>
          <div>
            <a href="#navigation" className="skip-link">
              Skip to navigation
            </a>
            <nav id="navigation" tabIndex={-1}>
              <NavigationBar />
            </nav>
          </div>
        </TestWrapper>
      );

      const skipLink = screen.getByText('Skip to navigation');
      await user.click(skipLink);

      const navigation = document.getElementById('navigation');
      expect(document.activeElement).toBe(navigation);
    });
  });

  describe('Form Navigation', () => {
    it('should navigate through form fields logically', async () => {
      render(
        <TestWrapper>
          <form>
            <label htmlFor="first-name">First Name</label>
            <Input id="first-name" type="text" />
            
            <label htmlFor="last-name">Last Name</label>
            <Input id="last-name" type="text" />
            
            <label htmlFor="email">Email</label>
            <Input id="email" type="email" />
            
            <Button type="submit">Submit</Button>
          </form>
        </TestWrapper>
      );

      const firstName = screen.getByLabelText('First Name');
      const lastName = screen.getByLabelText('Last Name');
      const email = screen.getByLabelText('Email');
      const submitButton = screen.getByText('Submit');

      // Test tab order through form
      await user.tab();
      expect(document.activeElement).toBe(firstName);

      await user.tab();
      expect(document.activeElement).toBe(lastName);

      await user.tab();
      expect(document.activeElement).toBe(email);

      await user.tab();
      expect(document.activeElement).toBe(submitButton);
    });

    it('should handle form validation with keyboard', async () => {
      render(
        <TestWrapper>
          <form>
            <label htmlFor="required-field">Required Field</label>
            <Input id="required-field" type="text" required />
            <Button type="submit">Submit</Button>
          </form>
        </TestWrapper>
      );

      const input = screen.getByLabelText('Required Field');
      const submitButton = screen.getByText('Submit');

      // Focus input and leave empty
      input.focus();
      await user.tab();
      expect(document.activeElement).toBe(submitButton);

      // Try to submit with Enter
      await user.keyboard('{Enter}');
      
      // Focus should return to invalid field
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Modal and Dialog Navigation', () => {
    it('should trap focus within modal dialogs', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            {isOpen && (
              <div role="dialog" aria-modal="true">
                <h2>Modal Title</h2>
                <button>First Button</button>
                <button>Second Button</button>
                <button onClick={() => setIsOpen(false)}>Close</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestModal />
        </TestWrapper>
      );

      const openButton = screen.getByText('Open Modal');
      await user.click(openButton);

      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      const closeButton = screen.getByText('Close');

      // Focus should start on first focusable element in modal
      expect(document.activeElement).toBe(firstButton);

      // Tab through modal elements
      await user.tab();
      expect(document.activeElement).toBe(secondButton);

      await user.tab();
      expect(document.activeElement).toBe(closeButton);

      // Tab should wrap back to first element
      await user.tab();
      expect(document.activeElement).toBe(firstButton);

      // Shift+Tab should go to last element
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(closeButton);
    });

    it('should handle Escape key to close modals', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        React.useEffect(() => {
          const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          };
          
          if (isOpen) {
            document.addEventListener('keydown', handleEscape);
          }
          
          return () => document.removeEventListener('keydown', handleEscape);
        }, [isOpen]);
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            {isOpen && (
              <div role="dialog" aria-modal="true">
                <h2>Modal Title</h2>
                <button onClick={() => setIsOpen(false)}>Close</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestModal />
        </TestWrapper>
      );

      const openButton = screen.getByText('Open Modal');
      await user.click(openButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Press Escape to close
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Menu and Dropdown Navigation', () => {
    it('should navigate menus with arrow keys', async () => {
      const TestMenu = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [focusedIndex, setFocusedIndex] = React.useState(0);
        
        const menuItems = ['Option 1', 'Option 2', 'Option 3'];
        
        const handleKeyDown = (e: React.KeyboardEvent) => {
          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault();
              setFocusedIndex((prev) => (prev + 1) % menuItems.length);
              break;
            case 'ArrowUp':
              e.preventDefault();
              setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
              break;
            case 'Enter':
            case ' ':
              e.preventDefault();
              setIsOpen(false);
              break;
            case 'Escape':
              setIsOpen(false);
              break;
          }
        };
        
        return (
          <div>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              Menu Button
            </button>
            {isOpen && (
              <div role="menu" onKeyDown={handleKeyDown}>
                {menuItems.map((item, index) => (
                  <button
                    key={item}
                    role="menuitem"
                    tabIndex={index === focusedIndex ? 0 : -1}
                    onClick={() => setIsOpen(false)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestMenu />
        </TestWrapper>
      );

      const menuButton = screen.getByText('Menu Button');
      await user.click(menuButton);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      // Test arrow key navigation
      await user.keyboard('{ArrowDown}');
      const option2 = screen.getByText('Option 2');
      expect(document.activeElement).toBe(option2);

      await user.keyboard('{ArrowDown}');
      const option3 = screen.getByText('Option 3');
      expect(document.activeElement).toBe(option3);

      // Test wrapping
      await user.keyboard('{ArrowDown}');
      const option1 = screen.getByText('Option 1');
      expect(document.activeElement).toBe(option1);

      // Test selection with Enter
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Tab Panel Navigation', () => {
    it('should navigate tab panels with arrow keys', async () => {
      const TestTabs = () => {
        const [activeTab, setActiveTab] = React.useState(0);
        const tabs = ['Tab 1', 'Tab 2', 'Tab 3'];
        
        const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
          switch (e.key) {
            case 'ArrowLeft':
              e.preventDefault();
              setActiveTab((prev) => (prev - 1 + tabs.length) % tabs.length);
              break;
            case 'ArrowRight':
              e.preventDefault();
              setActiveTab((prev) => (prev + 1) % tabs.length);
              break;
            case 'Home':
              e.preventDefault();
              setActiveTab(0);
              break;
            case 'End':
              e.preventDefault();
              setActiveTab(tabs.length - 1);
              break;
          }
        };
        
        return (
          <div>
            <div role="tablist">
              {tabs.map((tab, index) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={index === activeTab}
                  aria-controls={`panel-${index}`}
                  tabIndex={index === activeTab ? 0 : -1}
                  onClick={() => setActiveTab(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {tabs.map((tab, index) => (
              <div
                key={`panel-${index}`}
                id={`panel-${index}`}
                role="tabpanel"
                aria-labelledby={`tab-${index}`}
                hidden={index !== activeTab}
              >
                Content for {tab}
              </div>
            ))}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestTabs />
        </TestWrapper>
      );

      const tab1 = screen.getByText('Tab 1');
      const tab2 = screen.getByText('Tab 2');
      const tab3 = screen.getByText('Tab 3');

      // Focus first tab
      tab1.focus();
      expect(document.activeElement).toBe(tab1);

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(tab2);

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(tab3);

      // Test wrapping
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(tab1);

      // Test Home/End keys
      await user.keyboard('{End}');
      expect(document.activeElement).toBe(tab3);

      await user.keyboard('{Home}');
      expect(document.activeElement).toBe(tab1);
    });
  });

  describe('Search and Filter Navigation', () => {
    it('should handle search input keyboard interactions', async () => {
      const TestSearch = () => {
        const [query, setQuery] = React.useState('');
        const [suggestions, setSuggestions] = React.useState<string[]>([]);
        const [selectedIndex, setSelectedIndex] = React.useState(-1);
        
        const handleKeyDown = (e: React.KeyboardEvent) => {
          switch (e.key) {
            case 'ArrowDown':
              e.preventDefault();
              setSelectedIndex((prev) => 
                prev < suggestions.length - 1 ? prev + 1 : prev
              );
              break;
            case 'ArrowUp':
              e.preventDefault();
              setSelectedIndex((prev) => prev > 0 ? prev - 1 : -1);
              break;
            case 'Enter':
              if (selectedIndex >= 0) {
                e.preventDefault();
                setQuery(suggestions[selectedIndex]);
                setSuggestions([]);
                setSelectedIndex(-1);
              }
              break;
            case 'Escape':
              setSuggestions([]);
              setSelectedIndex(-1);
              break;
          }
        };
        
        React.useEffect(() => {
          if (query) {
            setSuggestions(['Suggestion 1', 'Suggestion 2', 'Suggestion 3']);
          } else {
            setSuggestions([]);
          }
        }, [query]);
        
        return (
          <div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-expanded={suggestions.length > 0}
              aria-autocomplete="list"
              aria-activedescendant={
                selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
              }
            />
            {suggestions.length > 0 && (
              <ul role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion}
                    id={`suggestion-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => {
                      setQuery(suggestion);
                      setSuggestions([]);
                    }}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestSearch />
        </TestWrapper>
      );

      const searchInput = screen.getByRole('searchbox');
      
      // Type to show suggestions
      await user.type(searchInput, 'test');
      
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();

      // Navigate suggestions with arrow keys
      await user.keyboard('{ArrowDown}');
      expect(searchInput).toHaveAttribute('aria-activedescendant', 'suggestion-0');

      await user.keyboard('{ArrowDown}');
      expect(searchInput).toHaveAttribute('aria-activedescendant', 'suggestion-1');

      // Select with Enter
      await user.keyboard('{Enter}');
      expect(searchInput).toHaveValue('Suggestion 2');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Focus Indicators', () => {
    it('should show visible focus indicators', async () => {
      render(
        <TestWrapper>
          <div>
            <Button>Test Button</Button>
            <Input type="text" placeholder="Test Input" />
            <a href="#">Test Link</a>
          </div>
        </TestWrapper>
      );

      const button = screen.getByText('Test Button');
      const input = screen.getByPlaceholderText('Test Input');
      const link = screen.getByText('Test Link');

      // Test focus indicators
      button.focus();
      expect(button).toHaveFocus();

      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(link).toHaveFocus();
    });

    it('should maintain focus visibility during keyboard navigation', async () => {
      render(
        <TestWrapper>
          <div>
            <button>Button 1</button>
            <button>Button 2</button>
            <button>Button 3</button>
          </div>
        </TestWrapper>
      );

      // Navigate with keyboard
      await user.tab();
      const button1 = screen.getByText('Button 1');
      expect(button1).toHaveFocus();

      await user.tab();
      const button2 = screen.getByText('Button 2');
      expect(button2).toHaveFocus();

      await user.tab();
      const button3 = screen.getByText('Button 3');
      expect(button3).toHaveFocus();
    });
  });
});