import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@client/infrastructure/auth';
import { useToast } from '@client/lib/hooks/use-toast';
import { Button } from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

/**
 * Onboarding Trigger Component
 * 
 * Automatically triggers the welcome tour for:
 * - New users (first time)
 * - Existing users after major updates
 * - Users who skipped and want to resume
 * 
 * Features:
 * - Smart detection of onboarding status
 * - Version-based update tours
 * - Non-intrusive notifications
 * - Respects user preferences
 */
export function OnboardingTrigger() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Don't trigger on auth, onboarding, or welcome pages
    const excludedPaths = ['/auth', '/welcome', '/onboarding', '/login', '/register'];
    if (excludedPaths.some(path => location.pathname.startsWith(path))) {
      return;
    }

    // Only trigger for authenticated users
    if (!isAuthenticated || !user) {
      return;
    }

    // Check onboarding status
    const onboardingCompleted = localStorage.getItem('chanuka_onboarding_completed');
    const onboardingVersion = localStorage.getItem('chanuka_onboarding_version');
    const currentVersion = '2.0.0'; // Update this with each major release

    // New user - trigger full onboarding
    if (!onboardingCompleted) {
      logger.info('Triggering onboarding for new user', {
        component: 'OnboardingTrigger',
        userId: user.id,
      });

      // Small delay to let the page load
      setTimeout(() => {
        navigate('/welcome');
      }, 1000);
      return;
    }

    // Existing user - check for version updates
    if (onboardingVersion !== currentVersion) {
      const updateTourShown = localStorage.getItem(`chanuka_update_tour_${currentVersion}`);

      if (!updateTourShown) {
        logger.info('Showing update tour notification', {
          component: 'OnboardingTrigger',
          userId: user.id,
          version: currentVersion,
        });

        // Show non-intrusive notification about new features
        setTimeout(() => {
          toast({
            title: '🎉 New Features Available!',
            description: 'We\'ve added some exciting improvements. Take a quick tour?',
            duration: 10000, // 10 seconds
            action: (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    localStorage.setItem(`chanuka_update_tour_${currentVersion}`, 'true');
                    navigate('/welcome?mode=update');
                  }}
                >
                  Take Tour
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem(`chanuka_update_tour_${currentVersion}`, 'true');
                    localStorage.setItem('chanuka_onboarding_version', currentVersion);
                  }}
                >
                  Skip
                </Button>
              </div>
            ),
          });
        }, 2000);
      }
    }

    // Check if user wants to resume onboarding
    const resumeOnboarding = sessionStorage.getItem('chanuka_resume_onboarding');
    if (resumeOnboarding === 'true') {
      sessionStorage.removeItem('chanuka_resume_onboarding');
      navigate('/welcome?resume=true');
    }
  }, [user, isAuthenticated, location.pathname, navigate, toast]);

  // Check for onboarding preferences in user profile
  useEffect(() => {
    if (!user?.preferences?.show_onboarding_tips) {
      return;
    }

    // Show contextual tips based on current page
    const showContextualTip = () => {
      const tips = {
        '/bills': {
          title: '💡 Tip: Quick Actions',
          description: 'Use the command palette (⌘K) for quick access to bills and features.',
        },
        '/search': {
          title: '💡 Tip: Advanced Search',
          description: 'Use filters to narrow down results by status, date, or topic.',
        },
        '/dashboard': {
          title: '💡 Tip: Customize Your Dashboard',
          description: 'Drag and drop widgets to personalize your dashboard layout.',
        },
      };

      const tip = tips[location.pathname as keyof typeof tips];
      if (tip) {
        const tipShown = sessionStorage.getItem(`tip_shown_${location.pathname}`);
        if (!tipShown) {
          setTimeout(() => {
            toast({
              title: tip.title,
              description: tip.description,
              duration: 8000,
            });
            sessionStorage.setItem(`tip_shown_${location.pathname}`, 'true');
          }, 3000);
        }
      }
    };

    showContextualTip();
  }, [location.pathname, user, toast]);

  return null;
}

/**
 * Helper function to manually trigger onboarding
 * Can be called from help menu or user settings
 */
export function triggerOnboarding() {
  sessionStorage.setItem('chanuka_resume_onboarding', 'true');
  window.location.href = '/welcome';
}

/**
 * Helper function to reset onboarding status
 * Useful for testing or allowing users to retake the tour
 */
export function resetOnboarding() {
  localStorage.removeItem('chanuka_onboarding_completed');
  localStorage.removeItem('chanuka_onboarding_version');
  localStorage.removeItem('chanuka_user_persona');
  
  // Clear all update tour flags
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('chanuka_update_tour_')) {
      localStorage.removeItem(key);
    }
  });

  logger.info('Onboarding status reset', { component: 'OnboardingTrigger' });
}

export default OnboardingTrigger;
