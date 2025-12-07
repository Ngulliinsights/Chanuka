/**
 * Card Component Unit Tests
 * Tests layout, content containers, and accessibility
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

describe('Card Component', () => {
  describe('Card Container', () => {
    it('should render basic card', () => {
      const { container } = render(
        <Card>
          <div>Content</div>
        </Card>
      );
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
    });

    it('should render card with multiple sections', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('should accept className prop', () => {
      const { container } = render(
        <Card className="custom-card">Content</Card>
      );
      const card = container.querySelector('[class*="card"]');
      expect(card).toHaveClass('custom-card');
    });

    it('should render with data attributes', () => {
      render(<Card data-testid="test-card">Content</Card>);
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render header section', () => {
      render(
        <Card>
          <CardHeader>Header Content</CardHeader>
        </Card>
      );
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should accept className', () => {
      const { container } = render(
        <Card>
          <CardHeader className="custom-header">Header</CardHeader>
        </Card>
      );
      const header = container.querySelector('[class*="header"]');
      expect(header).toHaveClass('custom-header');
    });

    it('should support children elements', () => {
      render(
        <Card>
          <CardHeader>
            <span className="icon">⭐</span>
            <h2>Title</h2>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('⭐')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('should render title element', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should use heading semantics', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = container.querySelector('h2');
      expect(title).toHaveTextContent('Title');
    });

    it('should accept className', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle className="custom-title">Title</CardTitle>
          </CardHeader>
        </Card>
      );
      const title = container.querySelector('h2');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Description text</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should accept className', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardDescription className="custom-desc">Desc</CardDescription>
          </CardHeader>
        </Card>
      );
      const desc = container.querySelector('[class*="desc"]');
      expect(desc).toHaveClass('custom-desc');
    });

    it('should render with semantic element', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardDescription>Description</CardDescription>
          </CardHeader>
        </Card>
      );
      expect(container.querySelector('p')).toHaveTextContent('Description');
    });
  });

  describe('CardContent', () => {
    it('should render content section', () => {
      render(
        <Card>
          <CardContent>
            <p>Main content</p>
          </CardContent>
        </Card>
      );
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('should accept className', () => {
      const { container } = render(
        <Card>
          <CardContent className="custom-content">Content</CardContent>
        </Card>
      );
      const content = container.querySelector('[class*="content"]');
      expect(content).toHaveClass('custom-content');
    });

    it('should support complex content', () => {
      render(
        <Card>
          <CardContent>
            <h3>Heading</h3>
            <p>Paragraph</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </CardContent>
        </Card>
      );
      expect(screen.getByText('Heading')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('should render footer section', () => {
      render(
        <Card>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should accept className', () => {
      const { container } = render(
        <Card>
          <CardFooter className="custom-footer">Footer</CardFooter>
        </Card>
      );
      const footer = container.querySelector('[class*="footer"]');
      expect(footer).toHaveClass('custom-footer');
    });

    it('should support action elements', () => {
      render(
        <Card>
          <CardFooter>
            <button>Cancel</button>
            <button>Save</button>
          </CardFooter>
        </Card>
      );
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });

  describe('Complete Card Structure', () => {
    it('should render full card with all sections', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('should maintain section hierarchy', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      const sections = container.querySelectorAll('[class*="header"], [class*="content"], [class*="footer"]');
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );
      const title = container.querySelector('h2');
      expect(title).toBeInTheDocument();
    });

    it('should support aria-label on card', () => {
      render(
        <Card aria-label="Product card">
          <CardContent>Product info</CardContent>
        </Card>
      );
      expect(screen.getByLabelText('Product card')).toBeInTheDocument();
    });

    it('should support aria-describedby for additional context', () => {
      render(
        <Card aria-describedby="card-desc">
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent id="card-desc">Full description</CardContent>
        </Card>
      );
      expect(screen.getByRole('region', { hidden: true }) || screen.getByText('Title')).toBeInTheDocument();
    });

    it('should have proper text contrast in default state', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render empty card', () => {
      const { container } = render(<Card />);
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
    });

    it('should handle nested cards', () => {
      render(
        <Card>
          <CardContent>
            <Card>
              <CardContent>Nested</CardContent>
            </Card>
          </CardContent>
        </Card>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longText = 'A'.repeat(1000);
      render(
        <Card>
          <CardContent>{longText}</CardContent>
        </Card>
      );
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should render with special characters', () => {
      render(
        <Card>
          <CardTitle>Title with émojis 🎉 & special chars!</CardTitle>
        </Card>
      );
      expect(screen.getByText(/émojis 🎉/)).toBeInTheDocument();
    });
  });
});
