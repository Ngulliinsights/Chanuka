/**
 * Enhanced Dashboard Page Component
 * 
 * Main dashboard page that displays the personalized user dashboard
 * with smart personalization, progressive disclosure, and enhanced UX.
 */

import React from 'react';

import { UserDashboard } from '@client/components/shared/dashboard';
import { SmartDashboard } from '@client/components/enhanced-user-flows/SmartDashboard';
import { RealTimeDashboard } from '@client/components/realtime/RealTimeDashboard';
import { useAppStore } from '@client/store/unified-state-manager';
import { useMediaQuery } from '@client/hooks/useMediaQuery';
import { logger } from '@client/utils/logger';

export default function Dashboard() {
  const user = useAppStore(state => state.user.user);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  React.useEffect(() => {
    logger.info('Enhanced Dashboard page loaded', {
      component: 'Dashboard',
      userPersona: user?.persona || 'unknown',
      isMobile,
      timestamp: new Date().toISOString()
    });

    // Track dashboard view
    useAppStore.getState().addActivity({
      type: 'dashboard_viewed',
      metadata: { 
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      }
    });
  }, [user?.persona, isMobile]);

  // Use smart dashboard for personalized experience
  if (user?.persona) {
    return (
      <div className="min-h-screen bg-background">
        <div className={`container mx-auto px-4 py-6 ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* Smart Dashboard with Personalization */}
          <SmartDashboard className="mb-6" />
          
          {/* Enhanced Dashboard Grid */}
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
            {/* Main Dashboard Content */}
            <div className={isMobile ? 'col-span-1' : 'lg:col-span-3'}>
              <UserDashboard variant="full-page" />
            </div>
            
            {/* Real-time Sidebar - Desktop Only */}
            {!isMobile && (
              <div className="lg:col-span-1">
                <div className="sticky top-6">
                  <RealTimeDashboard
                    showNotifications={true}
                    showEngagementMetrics={true}
                    showRecentActivity={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback to original dashboard for users without persona
  return (
    <div className="min-h-screen bg-background">
      <UserDashboard variant="full-page" />
    </div>
  );
}

