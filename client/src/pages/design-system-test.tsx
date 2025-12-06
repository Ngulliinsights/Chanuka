import React from 'react';

import HybridDesignSystemTest from '@client/components/ui/test-components';

/**
 * Design System Test Page
 *
 * This page provides a comprehensive test environment for the hybrid design system
 * implementation, allowing verification of all key components and their functionality.
 */

const DesignSystemTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <HybridDesignSystemTest />
    </div>
  );
};

export default DesignSystemTestPage;