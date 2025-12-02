/**
 * Bills Dashboard Page
 * 
 * Wrapper page component that exports the BillsDashboard as the default export
 * for use in the routing system.
 */

import { BillsDashboard } from '@client/features/bills/ui/bills-dashboard';

export default function BillsDashboardPage() {
  return <BillsDashboard />;
}