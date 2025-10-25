/**
 * ResponsiveButton Component Tests
 * 
 * Tests for the ResponsiveButton component functionality.
 * 
 * Requirements: 9.1, 9.5
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ResponsiveButton from '@/components/ResponsiveButton';

// Mock the responsive hook
const mockUseResponsive = vi.fn();
vi.mock('../responsive', () => ({
  useResponsive: () => mockUseResponsive(),
}));

describe('ResponsiveButton', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      currentBreakpoint: 'laptop',
      isTouchDevice: false,
      prefersReducedMotion: false,
    });
  });

  it('should render button with correct text', () => {
    render(<ResponsiveButton>Click me</ResponsiveButton>);
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should apply responsive button classes', () => {
    render(<ResponsiveButton data-testid="button">Click me</ResponsiveButton>);
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('responsive-button');
    expect(button).toHaveClass('inline-flex');
    expect(button).toHaveClass('items-center');
    expect(button).toHaveClass('justify-center');
  });

  it('should apply correct variant classes', () => {
    render(
      <ResponsiveButton variant="secondary" data-testid="button">
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('bg-gray-600');
    expect(button).toHaveClass('text-white');
  });

  it('should apply correct size classes for non-touch devices', () => {
    render(
      <ResponsiveButton size="large" data-testid="button">
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('min-h-[40px]');
  });

  it('should apply touch-friendly sizes for touch devices', () => {
    mockUseResponsive.mockReturnValue({
      currentBreakpoint: 'mobile',
      isTouchDevice: true,
      prefersReducedMotion: false,
    });

    render(
      <ResponsiveButton size="medium" data-testid="button">
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('min-h-[44px]');
  });

  it('should apply touch-specific classes for touch devices', () => {
    mockUseResponsive.mockReturnValue({
      currentBreakpoint: 'mobile',
      isTouchDevice: true,
      prefersReducedMotion: false,
    });

    render(<ResponsiveButton data-testid="button">Click me</ResponsiveButton>);
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('touch-manipulation');
    expect(button).toHaveClass('select-none');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<ResponsiveButton onClick={handleClick}>Click me</ResponsiveButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard events', () => {
    const handleClick = vi.fn();
    render(<ResponsiveButton onClick={handleClick}>Click me</ResponsiveButton>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not trigger events when disabled', () => {
    const handleClick = vi.fn();
    render(
      <ResponsiveButton onClick={handleClick} disabled>
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not trigger events when loading', () => {
    const handleClick = vi.fn();
    render(
      <ResponsiveButton onClick={handleClick} loading>
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading spinner when loading', () => {
    render(<ResponsiveButton loading>Click me</ResponsiveButton>);
    
    const spinner = screen.getByRole('button').querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should apply full width class when fullWidth is true', () => {
    render(
      <ResponsiveButton fullWidth data-testid="button">
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('w-full');
  });

  it('should render as anchor when as="a"', () => {
    render(
      <ResponsiveButton as="a" href="/test" data-testid="link">
        Click me
      </ResponsiveButton>
    );
    
    const link = screen.getByTestId('link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveAttribute('role', 'button');
  });

  it('should not have href when disabled and as="a"', () => {
    render(
      <ResponsiveButton as="a" href="/test" disabled data-testid="link">
        Click me
      </ResponsiveButton>
    );
    
    const link = screen.getByTestId('link');
    expect(link).not.toHaveAttribute('href');
    expect(link).toHaveAttribute('tabIndex', '-1');
  });

  it('should apply correct button type', () => {
    render(
      <ResponsiveButton type="submit" data-testid="button">
        Submit
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should apply aria attributes', () => {
    render(
      <ResponsiveButton 
        aria-label="Custom label" 
        aria-describedby="description"
        data-testid="button"
      >
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  it('should not apply transition classes when reduced motion is preferred', () => {
    mockUseResponsive.mockReturnValue({
      currentBreakpoint: 'laptop',
      isTouchDevice: false,
      prefersReducedMotion: true,
    });

    render(<ResponsiveButton data-testid="button">Click me</ResponsiveButton>);
    
    const button = screen.getByTestId('button');
    expect(button).not.toHaveClass('transition-all');
  });

  it('should merge custom className with default classes', () => {
    render(
      <ResponsiveButton className="custom-class" data-testid="button">
        Click me
      </ResponsiveButton>
    );
    
    const button = screen.getByTestId('button');
    expect(button).toHaveClass('responsive-button');
    expect(button).toHaveClass('custom-class');
  });
});