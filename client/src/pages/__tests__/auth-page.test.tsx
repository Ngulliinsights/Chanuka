import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from '@client/auth-page';

describe('AuthPage', () => {
  const renderAuthPage = () => {
    return render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render the auth page container', () => {
      renderAuthPage();

      const container = screen.getByText('Sign In').closest('.container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('mx-auto', 'px-4', 'py-16', 'max-w-md');
    });

    it('should render the card component', () => {
      renderAuthPage();

      const card = screen.getByRole('region', { hidden: true });
      expect(card).toBeInTheDocument();
    });

    it('should render the card header with title and description', () => {
      renderAuthPage();

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Access your Chanuka Platform account')).toBeInTheDocument();
    });

    it('should render sign in button', () => {
      renderAuthPage();

      const signInButton = screen.getByRole('button', { name: /sign in with email/i });
      expect(signInButton).toBeInTheDocument();
      expect(signInButton).toHaveClass('w-full');
    });

    it('should render create account button', () => {
      renderAuthPage();

      const createAccountButton = screen.getByRole('button', { name: /create account/i });
      expect(createAccountButton).toBeInTheDocument();
      expect(createAccountButton).toHaveClass('w-full');
      expect(createAccountButton).toHaveAttribute('variant', 'outline');
    });
  });

  describe('styling', () => {
    it('should apply correct spacing to card content', () => {
      renderAuthPage();

      const cardContent = screen.getByText('Sign In with Email').closest('[class*="space-y-4"]');
      expect(cardContent).toBeInTheDocument();
    });

    it('should have responsive container styling', () => {
      renderAuthPage();

      const container = screen.getByText('Sign In').closest('.container');
      expect(container).toHaveClass('px-4', 'py-16');
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderAuthPage();

      const title = screen.getByText('Sign In');
      expect(title.tagName).toBe('H2'); // CardTitle renders as h2
    });

    it('should have descriptive text for screen readers', () => {
      renderAuthPage();

      const description = screen.getByText('Access your Chanuka Platform account');
      expect(description).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      renderAuthPage();

      expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should render buttons as clickable elements', () => {
      renderAuthPage();

      const signInButton = screen.getByRole('button', { name: /sign in with email/i });
      const createAccountButton = screen.getByRole('button', { name: /create account/i });

      expect(signInButton).toBeEnabled();
      expect(createAccountButton).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('should render without crashing', () => {
      expect(() => renderAuthPage()).not.toThrow();
    });

    it('should maintain layout integrity', () => {
      renderAuthPage();

      // Check that all expected elements are present and properly nested
      const card = screen.getByRole('region', { hidden: true });
      const title = screen.getByText('Sign In');
      const description = screen.getByText('Access your Chanuka Platform account');
      const signInButton = screen.getByRole('button', { name: /sign in with email/i });
      const createAccountButton = screen.getByRole('button', { name: /create account/i });

      expect(card.contains(title)).toBe(true);
      expect(card.contains(description)).toBe(true);
      expect(card.contains(signInButton)).toBe(true);
      expect(card.contains(createAccountButton)).toBe(true);
    });
  });
});