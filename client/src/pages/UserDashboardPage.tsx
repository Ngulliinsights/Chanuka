/**
 * User Dashboard Page
 * Main page component for the user dashboard with comprehensive backend integration
 */

import React from 'react';
import { UserDashboard } from '../components/user/UserDashboard';
import { UserDashboardIntegration } from '../components/user/UserDashboardIntegration';
import { useAutoSyncDashboard } from '../hooks/useUserAPI';

export function UserDashboardPage() {
  // Auto-sync dashboard data every 15 minutes
  useAutoSyncDashboard(15);

  return (
    <UserDashboardIntegration>
      <div className="container mx-auto px-4 py-8">
        <UserDashboard />
      </div>
    </UserDashboardIntegration>
  );
}

export default UserDashboardPage;