import React from 'react';
import { CoverageDashboard } from '@/components/coverage/coverage-dashboard';

export function CoveragePage() {
  return (
    <div className="container mx-auto py-6">
      <CoverageDashboard />
    </div>
  );
}

export default CoveragePage;