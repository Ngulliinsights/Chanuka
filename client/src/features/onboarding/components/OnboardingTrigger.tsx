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
 * - First-time users
 * - Users after major updates
 * - Users who haven't completed onboarding
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

    // First-time users - trigger immediately
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

    // Existing users - check for version updates
    if (onboardingVersion !== currentVersion) {
      const updateTourShown = localStorage.getItem(`chanuka_update_tour_${currentVersion}`);

      if (!updateTourShown) {
        logger.info('Showing update tour notification', {
          component: 'OnboardingTrigger',
          userId: user.id,
          version: currentVersion,
        });

        // Show non-intrusive notification about new features
        toast({
          title: '🎉 New Features Available!',
          description: "Discover what's new in Chanuka 2.0",
          duration: 10000,
          action: (
            <Button
              size="sm"
              onClick={() => {
                localStorage.setItem(`chanuka_update_tour_${currentVersion}`, 'true');
                navigate('/welcome?mode=update');
              }}
            >
              Take Tour
            </Button>
          ),
        });

        // Mark as shown after 1 minute (user had chance to see it)
        setTimeout(() => {
          localStorage.setItem(`chanuka_update_tour_${currentVersion}`, 'true');
        }, 60000);
      }
    }

    // Check if user wants onboarding tips
    const showOnboardingTips = user.preferences?.show_onboarding_tips;
    if (showOnboardingTips === false) {
      return; // User has disabled onboarding tips
    }

    // Context-sensitive tips based on page
    const tipShownKey = `chanuka_tip_shown_${location.pathname}`;
    const tipShown = sessionStorage.getItem(tipShownKey);

    if (!tipShown && shouldShowTipForPage(location.pathname)) {
      const tip = getTipForPage(location.pathname);
      if (tip) {
        setTimeout(() => {
          toast({
            title: tip.title,
            description: tip.description,
            duration: 8000,
          });
          sessionStorage.setItem(tipShownKey, 'true');
        }, 2000);
      }
    }
  }, [user, isAuthenticated, location.pathname, navigate, toast]);

  return null; // This component doesn't render anything
}

/**
 * Determine if we should show a tip for this page
 */
function shouldShowTipForPage(pathname: string): boolean {
  const tippablePages = ['/bills', '/search', '/community', '/dashboard', '/account'];

  return tippablePages.some(page => pathname.startsWith(page));
}

/**
 * Get contextual tip for the current page
 */
function getTipForPage(pathname: string): { title: string; description: string } | null {
  const tips: Record<string, { title: string; description: string }> = {
    '/bills': {
      title: '💡 Pro Tip: Collections',
      description:
        'Create collections to organize bills by topic or campaign. Click the bookmark icon on any bill.',
    },
    '/search': {
      title: '💡 Pro Tip: Advanced Search',
      description:
        'Use filters to narrow your search by date, status, or sponsor. Try the command palette (⌘K) for quick access.',
    },
    '/community': {
      title: '💡 Pro Tip: Expert Insights',
      description:
        'Follow experts in your areas of interest to get notified when they share insights on bills.',
    },
    '/dashboard': {
      title: '💡 Pro Tip: Customize Your Dashboard',
      description:
        'Drag and drop widgets to customize your dashboard layout. Click the settings icon to add more widgets.',
    },
    '/account': {
      title: '💡 Pro Tip: Notification Preferences',
      description:
        'Fine-tune your notification settings to get alerts only for bills and topics you care about.',
    },
  };

  for (const [path, tip] of Object.entries(tips)) {
    if (pathname.startsWith(path)) {
      return tip;
    }
  }

  return null;
}

export default OnboardingTrigger;
