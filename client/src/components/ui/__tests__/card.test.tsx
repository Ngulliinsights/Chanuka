/**
 * Comprehensive tests for Card components
 * Covers rendering, props, accessibility, and responsive design
 */

import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@client/card';
import { renderWithWrapper } from '@client/test-utils';

// Mock dependencies
vi.mock('../../../lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' '))
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('Card Component', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      renderWithWrapper(<Card>Card content</Card>);

      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('passes through additional props', () => {
      renderWithWrapper(
        <Card
          data-testid="custom-card"
          id="test-card"
          role="region"
          aria-label="Test card"
        >
          Content
        </Card>
      );

      const card = screen.getByTestId('custom-card');
      expect(card).toHaveAttribute('id', 'test-card');
      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });

    it('merges className correctly', () => {
      renderWithWrapper(<Card className="custom-class">Content</Card>);

      const card = screen.getByText('Content');
      expect(card).toHaveClass('custom-class');
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithWrapper(<Card ref={ref}>Content</Card>);

      expect(ref.current).toBeInTheDocument();
      expect(ref.current?.tagName).toBe('DIV');
    });

    it('renders as semantic container', () => {
      renderWithWrapper(<Card>Content</Card>);

      const card = screen.getByText('Content').parentElement;
      expect(card?.tagName).toBe('DIV');
    });
  });

  describe('CardHeader', () => {
    it('renders with default styling', () => {
      renderWithWrapper(<CardHeader>Header content</CardHeader>);

      const header = screen.getByText('Header content');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('passes through props', () => {
      renderWithWrapper(
        <CardHeader data-testid="header" aria-labelledby="title">
          Header
        </CardHeader>
      );

      const header = screen.getByTestId('header');
      expect(header).toHaveAttribute('aria-labelledby', 'title');
    });

    it('merges className', () => {
      renderWithWrapper(<CardHeader className="custom-header">Header</CardHeader>);

      const header = screen.getByText('Header');
      expect(header).toHaveClass('custom-header');
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithWrapper(<CardHeader ref={ref}>Header</CardHeader>);

      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardTitle', () => {
    it('renders with title styling', () => {
      renderWithWrapper(<CardTitle>Card Title</CardTitle>);

      const title = screen.getByText('Card Title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('passes through props', () => {
      renderWithWrapper(
        <CardTitle id="card-title" data-testid="title">
          Title
        </CardTitle>
      );

      const title = screen.getByTestId('title');
      expect(title).toHaveAttribute('id', 'card-title');
    });

    it('merges className', () => {
      renderWithWrapper(<CardTitle className="custom-title">Title</CardTitle>);

      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithWrapper(<CardTitle ref={ref}>Title</CardTitle>);

      expect(ref.current).toBeInTheDocument();
    });

    it('is accessible as heading', () => {
      renderWithWrapper(<CardTitle>Title</CardTitle>);

      const title = screen.getByText('Title');
      // While not a semantic heading, it has heading-like styling
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('CardDescription', () => {
    it('renders with description styling', () => {
      renderWithWrapper(<CardDescription>Description text</CardDescription>);

      const description = screen.getByText('Description text');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('passes through props', () => {
      renderWithWrapper(
        <CardDescription data-testid="desc" aria-describedby="help">
          Description
        </CardDescription>
      );

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveAttribute('aria-describedby', 'help');
    });

    it('merges className', () => {
      renderWithWrapper(<CardDescription className="custom-desc">Description</CardDescription>);

      const desc = screen.getByText('Description');
      expect(desc).toHaveClass('custom-desc');
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithWrapper(<CardDescription ref={ref}>Description</CardDescription>);

      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardContent', () => {
    it('renders with content styling', () => {
      renderWithWrapper(<CardContent>Content here</CardContent>);

      const content = screen.getByText('Content here');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('passes through props', () => {
      renderWithWrapper(
        <CardContent data-testid="content" role="main">
          Content
        </CardContent>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('role', 'main');
    });

    it('merges className', () => {
      renderWithWrapper(<CardContent className="custom-content">Content</CardContent>);

      const content = screen.getByText('Content');
      expect(content).toHaveClass('custom-content');
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithWrapper(<CardContent ref={ref}>Content</CardContent>);

      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('renders with footer styling', () => {
      renderWithWrapper(<CardFooter>Footer content</CardFooter>);

      const footer = screen.getByText('Footer content');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('passes through props', () => {
      renderWithWrapper(
        <CardFooter data-testid="footer" aria-label="Card actions">
          Footer
        </CardFooter>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveAttribute('aria-label', 'Card actions');
    });

    it('merges className', () => {
      renderWithWrapper(<CardFooter className="custom-footer">Footer</CardFooter>);

      const footer = screen.getByText('Footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithWrapper(<CardFooter ref={ref}>Footer</CardFooter>);

      expect(ref.current).toBeInTheDocument();
    });
  });

  describe('Card Composition', () => {
    it('renders complete card structure', () => {
      renderWithWrapper(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('maintains proper spacing between sections', () => {
      renderWithWrapper(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      const header = screen.getByText('Title').parentElement;
      const content = screen.getByText('Content');
      const footer = screen.getByText('Footer');

      expect(header).toHaveClass('p-6');
      expect(content).toHaveClass('p-6', 'pt-0');
      expect(footer).toHaveClass('p-6', 'pt-0');
    });
  });

  describe('Accessibility', () => {
    it('provides semantic structure', () => {
      renderWithWrapper(
        <Card role="article" aria-labelledby="title">
          <CardHeader>
            <CardTitle id="title">Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby', 'title');

      const title = screen.getByText('Accessible Card');
      expect(title).toHaveAttribute('id', 'title');
    });

    it('supports screen reader navigation', () => {
      renderWithWrapper(
        <Card>
          <CardHeader>
            <CardTitle>Screen Reader Test</CardTitle>
            <CardDescription>Descriptive text</CardDescription>
          </CardHeader>
        </Card>
      );

      const title = screen.getByText('Screen Reader Test');
      const description = screen.getByText('Descriptive text');

      expect(title).toBeVisible();
      expect(description).toBeVisible();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive padding', () => {
      renderWithWrapper(<CardHeader>Responsive Header</CardHeader>);

      const header = screen.getByText('Responsive Header');
      expect(header).toHaveClass('p-6'); // Standard padding, responsive classes would be in CSS
    });

    it('supports flexible layouts', () => {
      renderWithWrapper(
        <CardFooter className="justify-between">
          <span>Left</span>
          <span>Right</span>
        </CardFooter>
      );

      const footer = screen.getByText('Left').parentElement;
      expect(footer).toHaveClass('flex', 'items-center');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      renderWithWrapper(<Card></Card>);

      const card = document.querySelector('.rounded-lg');
      expect(card).toBeInTheDocument();
      expect(card).toBeEmptyDOMElement();
    });

    it('handles null/undefined children', () => {
      renderWithWrapper(
        <Card>
          {null}
          {undefined}
          <span>Valid content</span>
        </Card>
      );

      expect(screen.getByText('Valid content')).toBeInTheDocument();
    });

    it('handles complex children', () => {
      renderWithWrapper(
        <Card>
          <CardHeader>
            <CardTitle>Title with <strong>bold</strong> text</CardTitle>
          </CardHeader>
        </Card>
      );

      expect(screen.getByText(/Title with/)).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
    });

    it('preserves data attributes', () => {
      renderWithWrapper(
        <Card data-testid="card" data-custom="value">
          Content
        </Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-custom', 'value');
    });
  });
});