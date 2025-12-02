/**
 * Dashboard Page Component
 * 
 * Main dashboard page that displays the personalized user dashboard
 * with tracked bills, civic metrics, and engagement history.
 */

import React from 'react';
import { UserDashboard } from '@client/components/shared/dashboard';
import { logger } from '@client/utils/logger';

export default function Dashboard() {
  React.useEffect(() => {
    logger.info('Dashboard page loaded', {
      component: 'Dashboard',
      timestamp: new Date().toISOString()
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <UserDashboard variant="full-page" />
    </div>
  );
}

