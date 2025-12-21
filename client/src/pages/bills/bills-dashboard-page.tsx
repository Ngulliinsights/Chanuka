import React from 'react';
/**
 * Bills Dashboard Page
 * 
 * Wrapper page component that exports the BillsDashboard as the default export
 * for use in the routing system.
 */

import { BillsDashboard } from '@client/features/bills';

export default function BillsDashboardPage() {
  return <BillsDashboard />;
}