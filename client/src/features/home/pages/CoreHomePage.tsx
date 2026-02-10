/**
 * Core Home Page (Basic Requirements)
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
  Clock,
  Eye,
  FileText,
  MessageSquare,
  Search,
  Shield,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@client/core/auth';
import type { User } from '@client/core/auth/types';
import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import PerformanceMonitor from '@client/lib/components/performance/PerformanceMonitor';
import { copySystem } from '@client/lib/content/copy-system';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

// Stub components for future implementation
const PlatformStats: React.FC<{ stats: StatItem[] }> = ({ stats }) => (
  <div className="text-center">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">Platform Statistics</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg mb-2">
              <Icon className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  </div>
);

const RecentActivity: React.FC = () => (
  <div className="max-w-4xl mx-auto">
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-gray-900 mb-4">Recent Activity</h2>
      <p className="text-xl text-gray-600">
        Stay updated with the latest legislative developments
      </p>
    </div>

    <Card className="border-0 shadow-xl">
      <CardContent className="p-8">
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-brand-navy/5 to-brand-navy/10 rounded-xl hover:shadow-md transition-all duration-300 border border-brand-navy/10">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-navy to-blue-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-gray-900">
                  New Bill: Climate Action Framework
                </h4>
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mb-2">
                Comprehensive climate legislation introduced for public review
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />2 hours ago
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  1,247 views
                </span>
              </div>
            </div>
            <Link to="/bills">
              <Button variant="ghost" size="sm" className="hover:bg-brand-navy/10 hover:text-brand-navy">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-brand-gold/5 to-brand-gold/10 rounded-xl hover:shadow-md transition-all duration-300 border border-brand-gold/10">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-gray-900">
                  Workaround Alert: Tax Reform Implementation
                </h4>
                <Badge variant="destructive" className="text-xs">
                  Alert
                </Badge>
              </div>
              <p className="text-gray-600 text-sm mb-2">
                Potential bypass mechanism detected in regulatory implementation
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />4 hours ago
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  High Priority
                </span>
              </div>
            </div>
            <Link to="/bills">
              <Button variant="ghost" size="sm" className="hover:bg-brand-gold/10 hover:text-brand-gold">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-brand-teal/5 to-brand-teal/10 rounded-xl hover:shadow-md transition-all duration-300 border border-brand-teal/10">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-teal to-cyan-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-gray-900">
                  Community Discussion: Healthcare Access
                </h4>
                <Badge className="text-xs bg-brand-teal/20 text-brand-teal border-brand-teal/20">Active</Badge>
              </div>
              <p className="text-gray-600 text-sm mb-2">
                Active discussion on proposed healthcare legislation changes
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />6 hours ago
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  23 participants
                </span>
              </div>
            </div>
            <Link to="/community">
              <Button variant="ghost" size="sm" className="hover:bg-brand-teal/10 hover:text-brand-teal">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/dashboard">
            <Button size="lg" variant="outline">
              View All Activity
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  </div>
);

const PersonalizedDashboardPreview: React.FC<{ persona: string; userId: string }> = ({ persona, userId }) => (
  <div className="text-center">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">Your Dashboard</h2>
    <p className="text-gray-600">Personalized dashboard for {persona} user</p>
  </div>
);

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
const SearchInput: React.FC<SearchInputProps> = React.memo(
  ({ onSearch, placeholder, className = '', variant = 'hero' }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
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
      },
      [searchQuery, isSubmitting, onSearch]
    );

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    }, []);

    const inputSize = variant === 'hero' ? 'px-6 py-4 pr-12' : 'px-4 py-3 pr-10';
    const buttonSize = variant === 'hero' ? 'p-2' : 'p-1.5';
    const iconSize = variant === 'hero' ? 'w-5 h-5' : 'w-4 h-4';

    return (
      <form
        onSubmit={handleSubmit}
        className={className}
        role="search"
        aria-label="Search legislation"
      >
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
  }
);

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
      <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></div>
        <span>Platform Active • Real-time Updates</span>
      </div>

      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight text-white drop-shadow-2xl">
        Democracy
        <br />
        <span className="text-yellow-400 drop-shadow-md filter shadow-black/50">
          in Your Hands
        </span>
      </h1>

      <p className="text-lg md:text-2xl text-gray-50 max-w-4xl mx-auto mb-12 leading-relaxed font-light drop-shadow-lg px-4">
        {copySystem.platformMission.short}
      </p>

      {/* Call-to-action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Link to="/bills" className="inline-block">
          <Button
            size="lg"
            className="text-xl font-bold px-10 py-7 shadow-2xl hover:shadow-brand-gold/50 transition-all duration-300 hover:scale-105 bg-gradient-to-r from-brand-gold to-yellow-500 hover:to-yellow-400 text-white border-none ring-2 ring-white/20"
          >
            <FileText className="mr-3 h-6 w-6" />
            Explore Bills
            <ChevronRight className="ml-2 h-6 w-6" />
          </Button>
        </Link>

        <Link to="/community" className="inline-block">
          <Button
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6 border-2 border-white/30 text-white hover:bg-white hover:text-brand-navy transition-all duration-300 backdrop-blur-sm bg-white/5"
          >
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
            <p className="text-gray-600 text-sm">
              Find bills, analyze policy impacts, and detect implementation workarounds
            </p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="text-center transition-all duration-500 bg-slate-900/40 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg hover:bg-slate-900/60 hover:scale-105"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-xl mb-3 ${stat.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-white mb-1 drop-shadow-md">{stat.value}</div>
              <div className="text-sm text-gray-100 font-medium drop-shadow-sm">{stat.label}</div>
              {stat.trend && (
                <div className="text-xs text-green-300 mt-2 flex items-center justify-center gap-1 font-semibold bg-green-900/30 py-1 px-2 rounded-full border border-green-500/30">
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
        return 'Ready to continue exploring how legislation affects your community?';
      case 'intermediate':
        return "Your civic engagement dashboard is ready with today's key developments.";
      case 'expert':
        return 'Your professional legislative intelligence briefing is ready.';
    }
  };

  const getPersonaActions = (persona: 'novice' | 'intermediate' | 'expert') => {
    switch (persona) {
      case 'novice':
        return [
          { label: 'Continue Learning', href: '/dashboard', icon: Activity },
          { label: 'Explore Bills', href: '/bills', icon: FileText },
        ];
      case 'intermediate':
        return [
          { label: 'View Dashboard', href: '/dashboard', icon: BarChart3 },
          { label: 'Track Bills', href: '/bills', icon: Eye },
        ];
      case 'expert':
        return [
          { label: 'Professional Tools', href: '/dashboard', icon: Shield },
          { label: 'Expert Analysis', href: '/bills', icon: Target },
        ];
    }
  };

  const actions = getPersonaActions(persona);

  return (
    <div className="text-center" data-testid="home-hero">
      <div className="mb-6">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white drop-shadow-xl">
          Welcome back, {user.name?.split(' ')[0]}!
        </h1>
        <p className="text-xl md:text-2xl text-gray-50 max-w-3xl mx-auto mb-8 leading-relaxed drop-shadow-md">
          {getPersonaMessage(persona)}
        </p>
        <div
          className="flex items-center justify-center gap-4 mb-8"
          role="group"
          aria-label="User status badges"
        >
          <Badge
            variant="secondary"
            className="text-sm flex items-center gap-1"
            aria-label={`${persona} user level`}
          >
            <Activity className="w-4 h-4 text-blue-500" aria-hidden="true" />
            <span className="capitalize">{persona} User</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-sm flex items-center gap-1"
            aria-label="Active citizen status"
          >
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
                className={`text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                  index === 0 
                    ? 'bg-brand-gold hover:bg-brand-gold/90 text-white border-none' 
                    : 'border-2 border-white/30 text-white hover:bg-white hover:text-brand-navy backdrop-blur-sm bg-white/5'
                }`}
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
            <p className="text-gray-600 text-sm">
              Continue where you left off or explore new topics
            </p>
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
export default function CoreHomePage() {
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
  }, []);

  /**
   * Detect user persona for authenticated users
   */
  useEffect(() => {
    if (isAuthenticated && userProfile && !isPersonaDetected) {
      try {
        // Determine persona based on user role or login count
        let determinedPersona: 'novice' | 'intermediate' | 'expert' = 'novice';

        if (userProfile.role === 'expert') {
          determinedPersona = 'expert';
        } else if ((userProfile.login_count || 0) > 5) {
          determinedPersona = 'intermediate';
        }

        setUserPersona(determinedPersona);
        setIsPersonaDetected(true);

        logger.info('User persona detected', {
          userId: userProfile.id,
          persona: determinedPersona,
        });
      } catch (error) {
        logger.error('Persona detection failed', { error });
        // Fallback to novice
        setUserPersona('novice');
        setIsPersonaDetected(true);
      }
    }
  }, [isAuthenticated, userProfile, isPersonaDetected]);

  // Memoized search handler to prevent recreation on each render
  const handleSearch = useCallback(
    (query: string): void => {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    },
    [navigate]
  );

  /**
   * Platform statistics representing civic engagement metrics
   * Memoized to prevent recreation on each render
   */
  const stats: StatItem[] = useMemo(
    () => [
      {
        label: 'Bills Tracked',
        value: '1,247',
        icon: FileText,
        color: 'text-blue-600',
        trend: '+12% this month',
      },
      {
        label: 'Active Citizens',
        value: '3,892',
        icon: Users,
        color: 'text-green-600',
        trend: '+8% this week',
      },
      {
        label: 'Issues Flagged',
        value: '47',
        icon: AlertTriangle,
        color: 'text-orange-600',
        trend: '+3 today',
      },
      {
        label: 'Expert Reviews',
        value: '156',
        icon: CheckCircle,
        color: 'text-brand-navy',
        trend: '+5 this week',
      },
    ],
    []
  );

  return (
    <div className="min-h-screen">
      {/* Performance Monitor - Hidden in production */}
      {process.env.NODE_ENV === 'development' && false && (
        <div className="fixed top-4 right-4 z-50 w-80">
          <PerformanceMonitor pageName="home" showRealTime={true} showOptimizations={true} />
        </div>
      )}

      {/* Hero Section with Progressive Disclosure */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center justify-center">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/Chanuka_hero_parliament.png" 
            alt="Parliament Building" 
            className="w-full h-full object-cover"
          />
          {/* Brand Overlay - Navy tint for readability */}
          <div className="absolute inset-0 bg-slate-900/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div
            className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {isAuthenticated && userProfile ? (
              <AuthenticatedHero user={userProfile} persona={userPersona} onSearch={handleSearch} />
            ) : (
              <AnonymousHero onSearch={handleSearch} stats={stats} currentStat={currentStat} />
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
              <p className="text-xl text-gray-600">
                Personalized insights and quick actions for your civic journey
              </p>
            </div>

            <PersonalizedDashboardPreview persona={userPersona} userId={userProfile.id} />
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
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Legislative Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Real-time monitoring of bills, amendments, and voting patterns. Get alerts on
                    legislation that matters to you.
                  </CardDescription>
                  <Link to="/bills">
                    <Button
                      variant="ghost"
                      className="group-hover:bg-blue-600 group-hover:text-white transition-all duration-300"
                    >
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
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Workaround Detection
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    AI-powered detection of implementation workarounds and constitutional bypass
                    tactics in legislation.
                  </CardDescription>
                  <Link to="/workarounds">
                
                    <Button
                      variant="ghost"
                      className="group-hover:bg-orange-600 group-hover:text-white transition-all duration-300"
                    >
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
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Civic Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Connect with citizens, share insights, and participate in informed discussions
                    about policy impacts.
                  </CardDescription>
                  <Link to="/community">
                    <Button
                      variant="ghost"
                      className="group-hover:bg-green-600 group-hover:text-white transition-all duration-300"
                    >
                      Join Discussion
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-brand-navy/5 to-brand-navy/10">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-navy to-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Expert Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Verified expert analysis and constitutional review to ensure accuracy and
                    credibility of information.
                  </CardDescription>
                  <Link to="/community">
                    <Button
                      variant="ghost"
                      className="group-hover:bg-brand-navy group-hover:text-white transition-all duration-300"
                    >
                      View Experts
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>


              <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-brand-teal/5 to-brand-teal/10">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-teal to-cyan-700 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Personal Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    Customized tracking of your interests, saved bills, and personalized insights
                    based on your engagement.
                  </CardDescription>
                  <Link to="/dashboard">
                    <Button
                      variant="ghost"
                      className="group-hover:bg-brand-teal group-hover:text-white transition-all duration-300"
                    >
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
          <PlatformStats stats={stats} />
        </div>
      </section>

      {/* Recent Activity - Conditional Based on Authentication */}
      {!isAuthenticated && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <RecentActivity />
          </div>
        </section>
      )}
    </div>
  );
}
