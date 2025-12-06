/**
 * Baseline test app - no utils imports
 * Used to establish baseline bundle size
 */
import React from 'react';
import { render } from '@testing-library/react';

const BaselineApp: React.FC = () => {
  return (
    <div>
      <h1>Baseline App</h1>
      <p>This app imports no utilities from @chanuka/utils</p>
    </div>
  );
};

describe('Baseline App Bundle Size Test', () => {
  it('renders without importing any utils', () => {
    const { container } = render(<BaselineApp />);
    expect(container.querySelector('h1')).toHaveTextContent('Baseline App');
  });
});

export { BaselineApp };