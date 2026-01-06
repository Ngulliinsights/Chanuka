/**
 * Enhanced Dashboard Page Component
 *
 * Main dashboard page that displays the personalized user dashboard
 * with adaptive layouts based on user persona, progressive disclosure, and enhanced UX.
 *
 * Requirements: 7.4, 7.5
 */

import React, { useState } from 'react';

import type { PersonaType } from '@client/core/personalization/types';
import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import { useDeviceInfo } from '@client/hooks/mobile/useDeviceInfo';
import { AdaptiveDashboard } from '@client/shared/ui/dashboard';
import { RealTimeDashboard } from '@client/shared/ui/realtime';
import { logger } from '@client/utils/logger';

export default function Dashboard() {
  const { data: user } = useUserProfile();
  const { isMobile } = useDeviceInfo();
  const [currentPersona, setCurrentPersona] = useState<PersonaType>('novice');

  React.useEffect(() => {
    logger.info('Adaptive Dashboard page loaded', {
      component: 'AdaptiveDashboard',
      userId: user?.id || 'unknown',
      isMobile,
      timestamp: new Date().toISOString(),
    });

    // Performance monitoring - track dashboard load time
    const startTime = performance.now();

    const trackLoadTime = () => {
      const loadTime = performance.now() - startTime;
      logger.info('Dashboard load performance', {
        loadTimeMs: Math.round(loadTime),
        userId: user?.id,
        isMobile,
        persona: currentPersona,
      });

      // Ensure dashboard loads within 3 seconds requirement
      if (loadTime > 3000) {
        logger.warn('Dashboard load time exceeded 3 second requirement', {
          loadTimeMs: Math.round(loadTime),
          userId: user?.id,
        });
      }
    };

    // Track when dashboard is fully loaded
    const timer = setTimeout(trackLoadTime, 100);
    return () => clearTimeout(timer);
  }, [user?.id, isMobile, currentPersona]);

  const handlePersonaChange = (persona: PersonaType) => {
    setCurrentPersona(persona);
    logger.info('User persona changed', {
      userId: user?.id,
      newPersona: persona,
      previousPersona: currentPersona,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`container mx-auto px-4 py-6 ${isMobile ? 'space-y-4' : 'space-y-6'}`}>
        {/* Adaptive Dashboard with Persona-based Layout */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
          {/* Main Adaptive Dashboard Content */}
          <div className={isMobile ? 'col-span-1' : 'lg:col-span-3'}>
            <AdaptiveDashboard
              variant="full-page"
              enableCustomization={true}
              showPersonaIndicator={true}
              onPersonaChange={handlePersonaChange}
              className="w-full"
            />
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
