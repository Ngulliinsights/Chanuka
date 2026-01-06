import { useQuery } from '@tanstack/react-query';
import { RefreshCw, LayoutGrid } from 'lucide-react';
import React from 'react';
import { useReducer, useEffect, useMemo, useCallback, useRef } from 'react';

import { useAuth } from '@client/core/auth';
import { personaDetector } from '@client/core/personalization';
import type {
  PersonaType,
  PersonaClassification,
  PersonaPreferences,
} from '@client/core/personalization/types';
import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@client/shared/design-system';
import type { UserActivity } from '@client/shared/types/analytics';
import { logger } from '@client/utils/logger';

import { ExpertDashboardLayout } from './layouts/ExpertDashboardLayout';
import { IntermediateDashboardLayout } from './layouts/IntermediateDashboardLayout';
import { NoviceDashboardLayout } from './layouts/NoviceDashboardLayout';
import { SmartDashboard } from './SmartDashboard';
import { UserDashboard } from './UserDashboard';
import { useDashboardPerformance } from './utils/performance';
import { DashboardCustomizer } from './widgets/DashboardCustomizer';
import { PersonaIndicator } from './widgets/PersonaIndicator';
import { ProgressiveDisclosure } from './widgets/ProgressiveDisclosure';

export interface AdaptiveDashboardProps {
  className?: string;
  variant?: 'full-page' | 'embedded';
  enableCustomization?: boolean;
  showPersonaIndicator?: boolean;
  onPersonaChange?: (persona: PersonaType) => void;
}

interface DashboardState {
  persona: PersonaType;
  classification: PersonaClassification | null;
  preferences: PersonaPreferences | null;
  isCustomizing: boolean;
  expandedSections: Set<string>;
  hiddenWidgets: Set<string>;
  loading: boolean;
  error: string | null;
}

type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | {
      type: 'SET_PERSONA_DATA';
      payload: {
        persona: PersonaType;
        classification: PersonaClassification;
        preferences: PersonaPreferences;
      };
    }
  | { type: 'TOGGLE_CUSTOMIZATION' }
  | { type: 'TOGGLE_SECTION'; payload: string }
  | { type: 'TOGGLE_WIDGET'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<PersonaPreferences> }
  | { type: 'RESET' };

const initialState: DashboardState = {
  persona: 'novice',
  classification: null,
  preferences: null,
  isCustomizing: false,
  expandedSections: new Set(['overview', 'quick-actions']),
  hiddenWidgets: new Set(),
  loading: true,
  error: null,
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_PERSONA_DATA':
      return {
        ...state,
        persona: action.payload.persona,
        classification: action.payload.classification,
        preferences: action.payload.preferences,
        loading: false,
        error: null,
      };

    case 'TOGGLE_CUSTOMIZATION':
      return { ...state, isCustomizing: !state.isCustomizing };

    case 'TOGGLE_SECTION': {
      const newExpanded = new Set(state.expandedSections);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedSections: newExpanded };
    }

    case 'TOGGLE_WIDGET': {
      const newHidden = new Set(state.hiddenWidgets);
      if (newHidden.has(action.payload)) {
        newHidden.delete(action.payload);
      } else {
        newHidden.add(action.payload);
      }
      return { ...state, hiddenWidgets: newHidden };
    }

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: state.preferences ? { ...state.preferences, ...action.payload } : null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function AdaptiveDashboard({
  className = '',
  variant = 'full-page',
  enableCustomization = true,
  showPersonaIndicator = true,
  onPersonaChange,
}: AdaptiveDashboardProps) {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const performanceMonitor = useDashboardPerformance();

  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const previousPersonaRef = useRef<PersonaType | null>(null);

  const { data: userActivity = [] } = useQuery<UserActivity[]>({
    queryKey: ['userActivity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/activity`);
      if (!response.ok) throw new Error('Failed to fetch user activity');
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['userPersonaProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/users/${user.id}/persona-profile`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const detectPersona = async () => {
      if (!user || !userProfile) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        performanceMonitor.markPersonaDetectionStart();
        performanceMonitor.markDataFetchStart();

        const classification = await personaDetector.detectPersona(
          userProfile,
          userActivity,
          existingProfile
        );

        const preferences = personaDetector.getDefaultPreferences(classification.type);

        performanceMonitor.markPersonaDetectionEnd();
        performanceMonitor.markDataFetchEnd();

        dispatch({
          type: 'SET_PERSONA_DATA',
          payload: {
            persona: classification.type,
            classification,
            preferences,
          },
        });

        // Trigger callback only when persona actually changes
        if (onPersonaChange && previousPersonaRef.current !== classification.type) {
          previousPersonaRef.current = classification.type;
          onPersonaChange(classification.type);
        }

        logger.info('Persona detected for dashboard', {
          userId: user.id,
          persona: classification.type,
          confidence: classification.confidence,
          reasons: classification.reasons,
          loadTime: performanceMonitor.getMetrics().personaDetectionTime,
        });
      } catch (error) {
        logger.error('Failed to detect persona for dashboard', { error, userId: user.id });
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to personalize dashboard',
        });
      }
    };

    detectPersona();
  }, [user, userProfile, userActivity, existingProfile, onPersonaChange, performanceMonitor]);

  const DashboardLayout = useMemo(() => {
    switch (state.persona) {
      case 'novice':
        return NoviceDashboardLayout;
      case 'intermediate':
        return IntermediateDashboardLayout;
      case 'expert':
        return ExpertDashboardLayout;
      default:
        return NoviceDashboardLayout;
    }
  }, [state.persona]);

  const handleToggleCustomization = useCallback(() => {
    dispatch({ type: 'TOGGLE_CUSTOMIZATION' });
  }, []);

  const handleSectionToggle = useCallback((sectionId: string) => {
    dispatch({ type: 'TOGGLE_SECTION', payload: sectionId });
  }, []);

  const handleWidgetToggle = useCallback((widgetId: string) => {
    dispatch({ type: 'TOGGLE_WIDGET', payload: widgetId });
  }, []);

  const handlePreferencesUpdate = useCallback((newPreferences: Partial<PersonaPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: newPreferences });
  }, []);

  const handleRefreshDashboard = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    window.location.reload();
  }, []);

  const handleDismissError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  if (state.loading) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${className}`}>
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Personalizing your dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Analyzing your activity to create the best experience...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${className}`}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Dashboard Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{state.error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRefreshDashboard} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={handleDismissError} variant="ghost" size="sm">
                Continue with basic dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-[400px] flex items-center justify-center ${className}`}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Chanuka</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Sign in to access your personalized civic engagement dashboard.
            </p>
            <Button asChild>
              <a href="/auth/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { classification, preferences, isCustomizing, expandedSections, hiddenWidgets } = state;

  return (
    <div className={`adaptive-dashboard ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Your Civic Dashboard</h1>
            <p className="text-muted-foreground">
              Personalized for your {state.persona} experience level
            </p>
          </div>

          {showPersonaIndicator && classification && (
            <PersonaIndicator classification={classification} showDetails={true} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshDashboard}
            disabled={state.loading}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {enableCustomization && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleCustomization}
              aria-label={isCustomizing ? 'Finish customization' : 'Customize dashboard'}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              {isCustomizing ? 'Done' : 'Customize'}
            </Button>
          )}
        </div>
      </div>

      {isCustomizing && enableCustomization && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Dashboard Customization</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardCustomizer
              persona={state.persona}
              preferences={preferences}
              expandedSections={expandedSections}
              hiddenWidgets={hiddenWidgets}
              onPreferencesUpdate={handlePreferencesUpdate}
              onSectionToggle={handleSectionToggle}
              onWidgetToggle={handleWidgetToggle}
            />
          </CardContent>
        </Card>
      )}

      {classification?.nextLevelRequirements && (
        <ProgressiveDisclosure
          currentPersona={state.persona}
          classification={classification}
          className="mb-6"
        />
      )}

      <DashboardLayout
        persona={state.persona}
        preferences={preferences}
        expandedSections={expandedSections}
        hiddenWidgets={hiddenWidgets}
        classification={classification}
        variant={variant}
        onSectionToggle={handleSectionToggle}
        onWidgetToggle={handleWidgetToggle}
      />

      {variant === 'full-page' && (
        <div className="mt-8 pt-8 border-t">
          <Tabs defaultValue="legacy" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="legacy">Classic View</TabsTrigger>
              <TabsTrigger value="smart">Smart View</TabsTrigger>
            </TabsList>

            <TabsContent value="legacy" className="mt-6">
              <UserDashboard variant="full-page" />
            </TabsContent>

            <TabsContent value="smart" className="mt-6">
              <SmartDashboard />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default AdaptiveDashboard;
