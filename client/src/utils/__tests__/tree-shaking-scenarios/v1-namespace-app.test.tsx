/**
 * V1 namespace import test app
 * Tests bundle size when importing from v1 namespace
 */
import React from 'react';
import { render } from '@testing-library/react';
import { v1 } from '../../../index';

const V1NamespaceApp: React.FC = () => {
  React.useEffect(() => {
    // Use logger from v1 namespace
    v1.logger.info('V1 namespace app loaded');
  }, []);

  return (
    <div>
      <h1>V1 Namespace App</h1>
      <p>This app imports from v1 namespace: {v1 ? 'loaded' : 'not loaded'}</p>
    </div>
  );
};

describe('V1 Namespace Import Bundle Size Test', () => {
  it('renders with v1 namespace import', () => {
    const { container } = render(<V1NamespaceApp />);
    expect(container.querySelector('h1')).toHaveTextContent('V1 Namespace App');
  });
});

export { V1NamespaceApp };