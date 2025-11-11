/**
 * Enhanced Bills Dashboard Page
 * 
 * Wrapper page component that exports the EnhancedBillsDashboard as the default export
 * for use in the routing system.
 */

import React from 'react';
import { EnhancedBillsDashboard } from '../components/bills/enhanced-bills-dashboard';

export default function EnhancedBillsDashboardPage() {
  return <EnhancedBillsDashboard />;
}