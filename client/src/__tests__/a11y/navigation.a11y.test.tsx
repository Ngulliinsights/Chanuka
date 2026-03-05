import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { axe, axeConfig } from '../setup/a11y-setup';
import { MobileNavigation } from '@client/lib/ui/mobile/MobileNavigation';

describe('Navigation Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <MobileNavigation />
      </BrowserRouter>
    );

    const results = await axe(container, axeConfig);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels', () => {
    const { getByRole } = render(
      <BrowserRouter>
        <MobileNavigation />
      </BrowserRouter>
    );

    const nav = getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');
  });

  it('should indicate current page', () => {
    const { getAllByRole } = render(
      <BrowserRouter>
        <MobileNavigation />
      </BrowserRouter>
    );

    const buttons = getAllByRole('button');
    const currentButton = buttons.find(btn => btn.getAttribute('aria-current') === 'page');
    expect(currentButton).toBeDefined();
  });
});
