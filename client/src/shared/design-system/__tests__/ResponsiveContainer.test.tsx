/**
 * ResponsiveContainer Component Tests
 * 
 * Tests for the ResponsiveContainer component functionality.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Mock the responsive hook
const mockUseResponsive = vi.fn();
vi.mock('../responsive', () => ({
  useResponsive: () => mockUseResponsive(),
}));

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      currentBreakpoint: 'laptop',
      isTouchDevice: false,
      prefersReducedMotion: false,
    });
  });

  it('should render children correctly', () => {
    render(
      <ResponsiveContainer>
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply responsive container classes', () => {
    render(
      <ResponsiveContainer data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('responsive-container');
    expect(container).toHaveClass('w-full');
    expect(container).toHaveClass('mx-auto');
  });

  it('should apply correct max-width class based on maxWidth prop', () => {
    render(
      <ResponsiveContainer maxWidth="tablet" data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-2xl');
  });

  it('should apply no max-width when maxWidth is "none"', () => {
    render(
      <ResponsiveContainer maxWidth="none" data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).not.toHaveClass('max-w-2xl');
    expect(container).not.toHaveClass('max-w-4xl');
  });

  it('should apply correct padding classes', () => {
    render(
      <ResponsiveContainer padding="lg" data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('px-6');
    expect(container).toHaveClass('sm:px-8');
    expect(container).toHaveClass('lg:px-12');
  });

  it('should apply no padding when padding is "none"', () => {
    render(
      <ResponsiveContainer padding="none" data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).not.toHaveClass('px-4');
    expect(container).not.toHaveClass('px-6');
  });

  it('should render as different HTML elements', () => {
    render(
      <ResponsiveContainer as="section" data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container.tagName).toBe('SECTION');
  });

  it('should merge custom className with default classes', () => {
    render(
      <ResponsiveContainer className="custom-class" data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('responsive-container');
    expect(container).toHaveClass('custom-class');
  });

  it('should use default values when props are not provided', () => {
    render(
      <ResponsiveContainer data-testid="container">
        <div>Test content</div>
      </ResponsiveContainer>
    );
    
    const container = screen.getByTestId('container');
    expect(container).toHaveClass('max-w-5xl'); // laptop-lg default
    expect(container).toHaveClass('px-4'); // md padding default
    expect(container.tagName).toBe('DIV'); // div default
  });
});