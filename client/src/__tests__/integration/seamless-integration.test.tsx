/**
 * Seamless Integration Tests
 * 
 * Tests for the seamless shared module integration system
 */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { seamlessIntegration } from '../../adapters/seamless-shared-integration';
import { IntegrationProvider } from '../../components/integration/IntegrationProvider';
import { useValidation, useFormatting, useSeamlessIntegration } from '../../hooks/useSeamlessIntegration';

// Mock shared modules to test fallback behavior
jest.mock('@shared/core/utils/common-utils', () => {
  throw new Error('Shared modules not available');
});

jest.mock('@shared/platform/kenya/anonymity', () => {
  throw new Error('Shared modules not available');
});

// Test component that uses integration hooks
function TestComponent() {
  const validation = useValidation();
  const formatting = useFormatting();
  const { initialized, loading, sharedAvailable, integrationMode } = useSeamlessIntegration();

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="initialized">{initialized ? 'true' : 'false'}</div>
      <div data-testid="shared-available">{sharedAvailable ? 'true' : 'false'}</div>
      <div data-testid="integration-mode">{integrationMode}</div>
      <div data-testid="email-validation">{validation.email('test@example.com') ? 'valid' : 'invalid'}</div>
      <div data-testid="currency-format">{formatting.currency(100, 'KES')}</div>
    </div>
  );
}

describe('Seamless Integration System', () => {
  beforeEach(() => {
    // Reset integration state before each test
    jest.clearAllMocks();
  });

  describe('SeamlessSharedIntegration', () => {
    it('should initialize successfully', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      expect(seamlessIntegration.getStatus().initialized).toBe(true);
    });

    it('should detect shared modules unavailable and use fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const status = seamlessIntegration.getStatus();
      expect(status.sharedModulesAvailable).toBe(false);
      expect(status.integrationMode).toBe('client-only');
    });

    it('should provide working validation fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const validation = seamlessIntegration.validation;
      
      // Test email validation fallback
      expect(validation.email('test@example.com')).toBe(true);
      expect(validation.email('invalid-email')).toBe(false);
      
      // Test phone validation fallback
      expect(validation.phone('+254712345678')).toBe(true);
      expect(validation.phone('0712345678')).toBe(true);
      expect(validation.phone('invalid-phone')).toBe(false);
      
      // Test bill number validation fallback
      expect(validation.billNumber('HB 123/2024')).toBe(true);
      expect(validation.billNumber('invalid-bill')).toBe(false);
      
      // Test URL validation fallback
      expect(validation.url('https://example.com')).toBe(true);
      expect(validation.url('invalid-url')).toBe(false);
    });

    it('should provide working formatting fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const formatting = seamlessIntegration.formatting;
      
      // Test currency formatting
      const currency = formatting.currency(1000, 'KES');
      expect(currency).toContain('1,000');
      
      // Test date formatting
      const date = formatting.date(new Date('2024-01-01'));
      expect(date).toBeTruthy();
      
      // Test relative time
      const relativeTime = formatting.relativeTime(new Date(Date.now() - 86400000));
      expect(relativeTime).toContain('day');
      
      // Test number formatting
      const number = formatting.number(1234.56);
      expect(number).toContain('1,234');
      
      // Test percentage
      const percentage = formatting.percentage(75, 100);
      expect(percentage).toBe('75.0%');
    });

    it('should provide working string utilities fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const strings = seamlessIntegration.strings;
      
      expect(strings.slugify('Hello World!')).toBe('hello-world');
      expect(strings.truncate('Long text here', 5)).toBe('Long ...');
      expect(strings.capitalize('hello')).toBe('Hello');
      expect(strings.titleCase('hello world')).toBe('Hello World');
      expect(strings.camelCase('hello world')).toBe('helloWorld');
      expect(strings.kebabCase('Hello World')).toBe('hello-world');
    });

    it('should provide working array utilities fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const arrays = seamlessIntegration.arrays;
      
      expect(arrays.unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
      expect(arrays.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      
      const grouped = arrays.groupBy([{role: 'admin'}, {role: 'user'}, {role: 'admin'}], 'role');
      expect(grouped.admin).toHaveLength(2);
      expect(grouped.user).toHaveLength(1);
      
      const shuffled = arrays.shuffle([1, 2, 3, 4]);
      expect(shuffled).toHaveLength(4);
      expect(shuffled).toEqual(expect.arrayContaining([1, 2, 3, 4]));
    });

    it('should provide working civic utilities fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const civic = seamlessIntegration.civic;
      
      const mockBill = {
        status: 'SECOND_READING' as const,
        lastUpdated: new Date().toISOString()
      };
      
      const urgency = civic.calculateUrgencyScore(mockBill);
      expect(typeof urgency).toBe('number');
      expect(urgency).toBeGreaterThanOrEqual(0);
      expect(urgency).toBeLessThanOrEqual(100);
      
      const summary = civic.generateEngagementSummary(mockBill);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should provide working anonymity utilities fallbacks', async () => {
      await act(async () => {
        await seamlessIntegration.initialize();
      });

      const anonymity = seamlessIntegration.anonymity;
      
      const id = anonymity.generateId();
      expect(id).toMatch(/^anon_/);
      
      const identity = anonymity.getDisplayIdentity({name: 'John Doe'}, 'PARTIAL');
      expect(identity.name).toBe('J***');
      expect(identity.identifier).toMatch(/^partial_/);
      
      const suggestions = anonymity.generatePseudonymSuggestions(3);
      expect(suggestions).toHaveLength(3);
      suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });
  });

  describe('IntegrationProvider', () => {
    it('should render children when integration succeeds', async () => {
      render(
        <IntegrationProvider>
          <TestComponent />
        </IntegrationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('shared-available')).toHaveTextContent('false');
      expect(screen.getByTestId('integration-mode')).toHaveTextContent('client-only');
    });

    it('should show fallback while loading', () => {
      const fallback = <div data-testid="fallback">Loading integration...</div>;
      
      render(
        <IntegrationProvider fallback={fallback}>
          <TestComponent />
        </IntegrationProvider>
      );

      // Should show fallback initially
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should handle integration errors gracefully', async () => {
      const onError = jest.fn();
      
      render(
        <IntegrationProvider onError={onError}>
          <TestComponent />
        </IntegrationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      // Should still work in fallback mode
      expect(screen.getByTestId('integration-mode')).toHaveTextContent('client-only');
    });
  });

  describe('Integration Hooks', () => {
    it('should provide validation utilities through hooks', async () => {
      render(
        <IntegrationProvider>
          <TestComponent />
        </IntegrationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('email-validation')).toHaveTextContent('valid');
      });
    });

    it('should provide formatting utilities through hooks', async () => {
      render(
        <IntegrationProvider>
          <TestComponent />
        </IntegrationProvider>
      );

      await waitFor(() => {
        const currencyElement = screen.getByTestId('currency-format');
        expect(currencyElement.textContent).toContain('100');
      });
    });

    it('should work even when hooks are called before initialization', () => {
      function EarlyHookComponent() {
        // Call hooks before provider is ready
        const validation = useValidation();
        const formatting = useFormatting();
        
        return (
          <div>
            <div data-testid="early-email">{validation.email('test@example.com') ? 'valid' : 'invalid'}</div>
            <div data-testid="early-currency">{formatting.currency(50, 'KES')}</div>
          </div>
        );
      }

      render(
        <IntegrationProvider>
          <EarlyHookComponent />
        </IntegrationProvider>
      );

      // Should provide basic functionality even before full initialization
      expect(screen.getByTestId('early-email')).toHaveTextContent('valid');
      expect(screen.getByTestId('early-currency')).toHaveTextContent('50');
    });
  });

  describe('Error Recovery', () => {
    it('should continue working after initialization errors', async () => {
      // Mock console.warn to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      render(
        <IntegrationProvider>
          <TestComponent />
        </IntegrationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      // Should work in fallback mode
      expect(screen.getByTestId('integration-mode')).toHaveTextContent('client-only');
      expect(screen.getByTestId('email-validation')).toHaveTextContent('valid');
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Integration Configuration', () => {
  it('should respect environment configuration', async () => {
    // Test that configuration affects behavior
    await act(async () => {
      await seamlessIntegration.initialize();
    });

    const status = seamlessIntegration.getStatus();
    expect(status.environment).toBeDefined();
  });
});