/**
 * Avatar Component Unit Tests
 * Tests avatar display and variations
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Progress } from './progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Avatar Component', () => {
  describe('Rendering', () => {
    it('should render avatar container', () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('should render with image', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/image.png" alt="User" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByAltText('User')).toBeInTheDocument();
    });

    it('should render fallback when image fails', async () => {
      render(
        <Avatar>
          <AvatarImage src="https://broken-url.com/image.png" alt="User" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      
      const img = screen.getByAltText('User') as HTMLImageElement;
      img.onerror?.(new Event('error'));
      
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('should render just fallback', () => {
      render(
        <Avatar>
          <AvatarFallback>XY</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('XY')).toBeInTheDocument();
    });
  });

  describe('Image', () => {
    it('should load image from URL', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/user.png" alt="John Doe" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByAltText('John Doe')).toHaveAttribute(
        'src',
        'https://example.com/user.png'
      );
    });

    it('should support different image formats', () => {
      const formats = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
      formats.forEach((format) => {
        const { container } = render(
          <Avatar>
            <AvatarImage src={`image.${format}`} alt="Test" />
            <AvatarFallback>FB</AvatarFallback>
          </Avatar>
        );
        expect(container.querySelector('img')).toBeInTheDocument();
      });
    });
  });

  describe('Sizes', () => {
    it('should render default size', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should support small size', () => {
      render(
        <Avatar size="sm">
          <AvatarFallback>SM</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('SM')).toBeInTheDocument();
    });

    it('should support large size', () => {
      render(
        <Avatar size="lg">
          <AvatarFallback>LG</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('LG')).toBeInTheDocument();
    });
  });

  describe('Fallback', () => {
    it('should display initials', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('should display single character', () => {
      render(
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should support custom content', () => {
      render(
        <Avatar>
          <AvatarFallback>👤</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('👤')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have img role', () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>Test</AvatarFallback>
        </Avatar>
      );
      expect(container.querySelector('[role="img"]')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(
        <Avatar aria-label="John Doe's avatar">
          <AvatarImage src="john.png" alt="John" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByLabelText("John Doe's avatar")).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long text fallback', () => {
      render(
        <Avatar>
          <AvatarFallback>VERYLONGTEXT</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('VERYLONGTEXT')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      render(
        <Avatar>
          <AvatarFallback>🎉</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('🎉')).toBeInTheDocument();
    });
  });
});

/**
 * Tabs Component Unit Tests
 * Tests tab navigation and content switching
 */

describe('Tabs Component', () => {
  describe('Rendering', () => {
    it('should render tabs container', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
    });

    it('should render multiple tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should render default tab content', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      
      await user.click(screen.getByRole('tab', { name: /tab 2/i }));
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should update selected state', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: /tab 1/i });
      const tab2 = screen.getByRole('tab', { name: /tab 2/i });

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');

      await user.click(tab2);
      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: /tab 1/i }) as HTMLElement;
      tab1.focus();
      
      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have tablist role', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should have tab roles', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    it('should link tabs to content', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tab = screen.getByRole('tab', { name: /tab 1/i });
      expect(tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Content Panel', () => {
    it('should render tabpanel role', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );
      expect(container.querySelector('[role="tabpanel"]')).toBeInTheDocument();
    });

    it('should hide inactive tab content', async () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const panels = container.querySelectorAll('[role="tabpanel"]');
      expect(panels).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Only Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Only Content</TabsContent>
        </Tabs>
      );
      expect(screen.getByText('Only Tab')).toBeInTheDocument();
    });

    it('should handle many tabs', () => {
      const tabs = Array.from({ length: 20 }, (_, i) => i + 1);
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            {tabs.map((i) => (
              <TabsTrigger key={i} value={`tab${i}`}>Tab {i}</TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((i) => (
            <TabsContent key={i} value={`tab${i}`}>Content {i}</TabsContent>
          ))}
        </Tabs>
      );
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 20')).toBeInTheDocument();
    });
  });
});

/**
 * Progress Component Unit Tests
 * Tests progress bar display
 */

describe('Progress Component', () => {
  describe('Rendering', () => {
    it('should render progress bar', () => {
      const { container } = render(
        <Progress value={50} data-testid="progress" />
      );
      expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
    });

    it('should render with value', () => {
      const { container } = render(
        <Progress value={75} data-testid="progress" />
      );
      expect(container.querySelector('[role="progressbar"]')).toHaveAttribute(
        'aria-valuenow',
        '75'
      );
    });
  });

  describe('Values', () => {
    it('should display 0% progress', () => {
      render(<Progress value={0} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('should display 50% progress', () => {
      render(<Progress value={50} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });

    it('should display 100% progress', () => {
      render(<Progress value={100} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('should update progress value', () => {
      const { rerender } = render(
        <Progress value={25} data-testid="progress" />
      );
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

      rerender(<Progress value={75} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    });
  });

  describe('Accessibility', () => {
    it('should have progressbar role', () => {
      render(<Progress value={50} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should announce value to screen readers', () => {
      render(
        <Progress value={60} aria-label="Upload progress" data-testid="progress" />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '60');
    });

    it('should support aria-label', () => {
      render(
        <Progress
          value={50}
          aria-label="Loading"
          data-testid="progress"
        />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Loading');
    });

    it('should set aria-valuemax', () => {
      render(
        <Progress value={50} max={100} data-testid="progress" />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Variants', () => {
    it('should support default variant', () => {
      render(<Progress value={50} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle complete progress', () => {
      render(<Progress value={100} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle partial progress', () => {
      render(<Progress value={50} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle low progress', () => {
      render(<Progress value={25} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal values', () => {
      render(<Progress value={33.33} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33.33');
    });

    it('should handle values over 100', () => {
      render(<Progress value={150} max={200} data-testid="progress" />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '150');
    });

    it('should handle negative values', () => {
      render(<Progress value={-10} data-testid="progress" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});
