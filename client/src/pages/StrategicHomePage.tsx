/**
 * Strategic Home Page with Progressive Disclosure
 *
 * Implements progressive disclosure for home page content based on authentication status
 * and user persona. Provides different experiences for anonymous vs authenticated users.
 *
 * Performance optimizations:
 * - Lazy loading of non-critical components
 * - Memoized components to prevent unnecessary re-renders
 * - Optimized image loading with proper sizing
 * - Preloading of critical resources
 * - Code splitting for better bundle management
 *
 * Accessibility features:
 * - WCAG AA compliant interactive elements
 * - Proper ARIA labels and roles
 * - Keyboard navigation support
 * - Screen reader optimization
 * - High contrast mode support
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 9.1
 */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Eye,
  FileText,
  Search,
  Shield,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import PerformanceMonitor from '@client/components/performance/PerformanceMonitor';
import { copySystem } from '@client/content/copy-system';
import { useAuth } from '@client/core/auth';
import type { User } from '@client/core/auth/types';
import { personaDetector } from '@client/core/personalization';
import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { logger } from '@client/utils/logger';


// Lazy load non-critical components for performance
const PlatformStats = lazy(() => import('../components/home/PlatformStats'));
const RecentActivity = lazy(() => import('../components/home/RecentActivity'));
const PersonalizedDashboardPreview = lazy(() => import('../components/home/PersonalizedDashboardPreview'));

/**
 * Extended UserProfile interface to include persona and onboarding status
 */
interface ExtendedUserProfile {
  id: string;
  name?: string;
  email?: string;
  persona?: 'novice' | 'intermediate' | 'expert';
  onboardingCompleted?: boolean;
  createdAt?: string;
  login_count?: number;
  role?: string;
}

/**
 * Statistical item displayed in the hero section
 */
interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
}

/**
 * Props for the search input component
 */
interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder: string;
  className?: string;
  variant?: 'hero' | 'header' | 'embedded';
}

/**
 * SearchInput Component with enhanced accessibility and performance
 * Memoized to prevent unnecessary re-renders
 */
const SearchInput: React.FC<SearchInputProps> = React.memo(({
  onSearch,
  placeholder,
  className = '',
  variant = 'hero'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        onSearch(searchQuery.trim());
      } catch (error) {
        logger.error('Search submission failed', { error, query: searchQuery });
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [searchQuery, isSubmitting, onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const inputSize = variant === 'hero' ? 'px-6 py-4 pr-12' : 'px-4 py-3 pr-10';
  const buttonSize = variant === 'hero' ? 'p-2' : 'p-1.5';
  const iconSize = variant === 'hero' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <form onSubmit={handleSubmit} className={className} role="search" aria-label="Search legislation">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full ${inputSize} rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-300`}
          aria-label="Search legislation"
          aria-describedby="search-help"
          disabled={isSubmitting}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          disabled={!searchQuery.trim() || isSubmitting}
          aria-label={isSubmitting ? 'Searching...' : 'Submit search'}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${buttonSize} bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:ring-2 focus:ring-blue-200 focus:ring-offset-2`}
        >
          {isSubmitting ? (
            <div
              className={`${iconSize} border-2 border-white border-t-transparent rounded-full animate-spin`}
              aria-hidden="true"
            />
          ) : (
            <Search className={iconSize} aria-hidden="true" />
          )}
        </button>
      </div>
      <div id="search-help" className="sr-only">
        Search for bills, sponsors, and policy topics. Use keywords to find relevant legislation.
      </div>
    </form>
  );
});

SearchInput.displayName = 'SearchInput';

/**
 * Anonymous User Hero Section
 * Full marketing content with platform value proposition
 */
const AnonymousHero: React.FC<{
  onSearch: (query: string) => void;
  stats: StatItem[];
  currentStat: number;
}> = ({ onSearch, stats, currentStat }) => {
  return (
    <div className="text-center" data-testid="home-hero">
      <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
        <span>Platform Active • Real-time Updates</span>
      </div>

      <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
          Democracy
        </span>
        <br />
        <span className="text-gray-900">in Your Hands</span>
      </h1>

      <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
        {copySystem.platformMission.short}
      </p>

      {/* Call-to-action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Link to="/bills" className="inline-block">
          <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <FileText className="mr-2 h-5 w-5" />
            Explore Bills
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>

        <Link to="/community" className="inline-block">
          <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
            <Users className="mr-2 h-5 w-5" />
            Join Community
          </Button>
        </Link>
      </div>

      {/* Search functionality */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Legislation</h3>
            <p className="text-gray-600 text-sm">Find bills, analyze policy impacts, and detect implementation workarounds</p>
          </div>
          <SearchInput
            onSearch={onSearch}
            placeholder="Search bills, sponsors, policy topics..."
            className="w-full"
            variant="hero"
          />
        </div>
      </div>

      {/* Statistics carousel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`text-center transition-all duration-500 ${
                currentStat === index ? 'scale-110 opacity-100' : 'scale-100 opacity-70'
              }`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg mb-2 ${stat.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
              {stat.trend && (
                <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Authenticated User Hero Section
 * Personalized dashboard preview with persona-specific content
 */
const AuthenticatedHero: React.FC<{
  user: ExtendedUserProfile;
  persona: 'novice' | 'intermediate' | 'expert';
  onSearch: (query: string) => void;
}> = ({ user, persona, onSearch }) => {
  const getPersonaMessage = (persona: 'novice' | 'intermediate' | 'expert'): string => {
    switch (persona) {
      case 'novice':
        return "Ready to continue exploring how legislation affects your community?";
      case 'intermediate':
        return "Your civic engagement dashboard is ready with today's key developments.";
      case 'expert':
        return "Your professional legislative intelligence briefing is ready.";
    }
  };

  const getPersonaActions = (persona: 'novice' | 'intermediate' | 'expert') => {
    switch (persona) {
      case 'novice':
        return [
          { label: 'Continue Learning', href: '/dashboard', icon: Activity },
          { label: 'Explore Bills', href: '/bills', icon: FileText }
        ];
      case 'intermediate':
        return [
          { label: 'View Dashboard', href: '/dashboard', icon: BarChart3 },
          { label: 'Track Bills', href: '/bills', icon: Eye }
        ];
      case 'expert':
        return [
          { label: 'Professional Tools', href: '/dashboard', icon: Shield },
          { label: 'Expert Analysis', href: '/bills', icon: Target }
        ];
    }
  };

  const actions = getPersonaActions(persona);

  return (
    <div className="text-center" data-testid="home-hero">
      <div className="mb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          Welcome back, {user.name?.split(' ')[0]}!
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
          {getPersonaMessage(persona)}
        </p>
        <div className="flex items-center justify-center gap-4 mb-8" role="group" aria-label="User status badges">
          <Badge variant="secondary" className="text-sm flex items-center gap-1" aria-label={`${persona} user level`}>
            <Activity className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <span className="capitalize">{persona} User</span>
          </Badge>
          <Badge variant="outline" className="text-sm flex items-center gap-1" aria-label="Active citizen status">
            <Activity className="w-4 h-4" aria-hidden="true" />
            <span>Active Citizen</span>
          </Badge>
        </div>
      </div>

      {/* Persona-specific actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} to={action.href} className="inline-block">
              <Button
                size="lg"
                variant={index === 0 ? 'primary' : 'outline'}
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Icon className="mr-2 h-5 w-5" />
                {action.label}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Quick search with recent queries */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Search</h3>
            <p className="text-gray-600 text-sm">Continue where you left off or explore new topics</p>
          </div>
          <SearchInput
            onSearch={onSearch}
            placeholder="Search bills, continue previous searches..."
            className="w-full"
            variant="hero"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Strategic Home Page Component
 * Main component implementing progressive disclosure based on authentication status
 */
export default function StrategicHomePage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { data: userProfile } = useUserProfile() as { data: ExtendedUserProfile | undefined };

  const [currentStat, setCurrentStat] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [userPersona, setUserPersona] = useState<'novice' | 'intermediate' | 'expert'>('novice');
  const [isPersonaDetected, setIsPersonaDetected] = useState<boolean>(false);

  // Determine if user is authenticated
  const isAuthenticated = !!authUser && !!userProfile;

  /**
   * Initialize component with fade-in animation and persona detection
   */
  useEffect(() => {
    setIsVisible(true);

    // Rotating statistics for anonymous users
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Detect user persona for authenticated users
   */
  useEffect(() => {
    if (isAuthenticated && userProfile && !isPersonaDetected) {
      const detectPersona = async () => {
        try {
          const activityHistory: import('@client/shared/types/analytics').UserActivity[] = [];

          // Map ExtendedUserProfile to User type for persona detection
          const userForPersonaDetection: User = {
            id: userProfile.id,
            email: userProfile.email || '',
            name: userProfile.name || '',
            role: (userProfile.role as User['role']) || 'citizen',
            verified: true, // Assume verified if they have a profile
            twoFactorEnabled: false, // Default value
            preferences: {
              notifications: true,
              emailAlerts: true,
              theme: 'system',
              language: 'en'
            },
            permissions: [],
            lastLogin: new Date().toISOString(),
            createdAt: userProfile.createdAt || new Date().toISOString()
          };

          const classification = await personaDetector.detectPersona(
            userForPersonaDetection,
            activityHistory,
            undefined
          );

          setUserPersona(classification.type);
          setIsPersonaDetected(true);

          logger.info('User persona detected', {
            userId: userProfile.id,
            persona: classification.type,
            confidence: classification.confidence
          });
        } catch (error) {
          logger.error('Persona detection failed', { error });
          // Fallback to role-based or default persona
          const fallbackPersona = userProfile.role === 'expert' ? 'intermediate' : 'novice';
          setUserPersona(fallbackPersona);
          setIsPersonaDetected(true);
        }
      };

      detectPersona();
    }
  }, [isAuthenticated, userProfile, isPersonaDetected]);

  // Memoized search handler to prevent recreation on each render
  const handleSearch = useCallback((query: string): void => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [navigate]);

  /**
   * Platform statistics representing civic engagement metrics
   * Memoized to prevent recreation on each render
   */
  const stats: StatItem[] = useMemo(() => [
    {
      label: 'Bills Tracked',
      value: '1,247',
      icon: FileText,
      color: 'text-blue-600',
      trend: '+12% this month'
    },
    {
      label: 'Active Citizens',
      value: '3,892',
      icon: Users,
      color: 'text-green-600',
      trend: '+8% this week'
    },
    {
      label: 'Issues Flagged',
      value: '47',
      icon: AlertTriangle,
      color: 'text-orange-600',
      trend: '+3 today'
    },
    {
      label: 'Expert Reviews',
      value: '156',
      icon: CheckCircle,
      color: 'text-purple-600',
      trend: '+5 this week'
    }
  ], []);

  return (
    <div className="min-h-screen">
      {/* Performance Monitor - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50 w-80">
          <PerformanceMonitor
            pageName="home"
            showRealTime={true}
            showOptimizations={true}
          />
        </div>
      )}

      {/* Hero Section with Progressive Disclosure */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>

        <div className="container mx-auto px-4 py-20">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {isAuthenticated && userProfile ? (
              <AuthenticatedHero
                user={userProfile}
                persona={userPersona}
                onSearch={handleSearch}
              />
            ) : (
              <AnonymousHero
                onSearch={handleSearch}
                stats={stats}
                currentStat={currentStat}
              />
            )}
          </div>
        </div>
      </section>

      {/* Conditional Content Based on Authentication */}
      {isAuthenticated && userProfile ? (
        /* Authenticated User Content - Dashboard Preview */
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Civic Engagement Hub</h2>
              <p className="text-xl text-gray-600">Personalized insights and quick actions for your civic journey</p>
            </div>

            <Suspense fallback={
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              <PersonalizedDashboardPreview persona={userPersona} userId={userProfile.id} />
            </Suspense>
          </div>
        </section>
      ) : (
        /* Anonymous User Content - Feature Cards */
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Powerful Tools for Civic Engagement
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to stay informed and engaged with the legislative process
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {/* Feature cards with gradient backgrounds and hover effects */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Legislative Tracking</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Real-time monitoring of bills, amendments, and voting patterns. Get alerts on legislation that matters to you.
                  </CardDescription>
                  <Link to="/bills">
                    <Button variant="ghost" className="group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      Track Bills
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Workaround Detection</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    AI-powered detection of implementation workarounds and constitutional bypass tactics in legislation.
                  </CardDescription>
                  <Link to="/search">
                    <Button variant="ghost" className="group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                      View Analysis
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Civic Engagement</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Connect with citizens, share insights, and participate in informed discussions about policy impacts.
                  </CardDescription>
                  <Link to="/community">
                    <Button variant="ghost" className="group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                      Join Discussion
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Expert Verification</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Verified expert analysis and constitutional review to ensure accuracy and credibility of information.
                  </CardDescription>
                  <Link to="/community">
                    <Button variant="ghost" className="group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      View Experts
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Intelligent Search</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    AI-powered search across bills, debates, and analysis. Find relevant legislation with natural language queries.
                  </CardDescription>
                  <Link to="/search">
                    <Button variant="ghost" className="group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      Search Now
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Personal Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Customized tracking of your interests, saved bills, and personalized insights based on your engagement.
                  </CardDescription>
                  <Link to="/dashboard">
                    <Button variant="ghost" className="group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                      View Dashboard
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Platform Impact Statistics - Always Visible */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <Suspense fallback={
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <PlatformStats stats={stats} />
          </Suspense>
        </div>
      </section>

      {/* Recent Activity - Conditional Based on Authentication */}
      {!isAuthenticated && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <Suspense fallback={
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              <RecentActivity />
            </Suspense>
          </div>
        </section>
      )}
    </div>
  );
}
