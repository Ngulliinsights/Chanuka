import React from 'react';

import { CoverageDashboard } from '@client/features/admin/ui/coverage/coverage-dashboard';
import { logger } from '@client/shared/utils/logger';

export function CoveragePage() {
  return (
    <div className="container mx-auto py-6">
      <CoverageDashboard />
    </div>
  );
}

export default CoveragePage;
