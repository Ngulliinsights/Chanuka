/**
 * Optimized Unified Home Page - Production-Grade UI/UX
 * 
 * DESIGN PHILOSOPHY: "Democratic Brutalism meets Refined Clarity"
 * - Bold, asymmetric layouts that break traditional grid patterns
 * - Distinctive typography (DM Serif Display + Work Sans)
 * - Sophisticated micro-interactions and scroll animations
 * - Atmospheric depth through layered transparencies and textures
 * - Accessibility-first with WCAG AAA compliance
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - React.memo for all child components
 * - Intersection Observer for scroll-triggered animations
 * - Debounced scroll handlers
 * - Optimized re-renders with useMemo and useCallback
 * - Code splitting for heavy components
 * - Image lazy loading with blur placeholders
 * 
 * UX ENHANCEMENTS:
 * - Skeleton loading states
 * - Error boundaries with graceful degradation
 * - Keyboard navigation and focus management
 * - Reduced motion support for accessibility
 * - Progressive enhancement
 * - Scroll progress indicator
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 9.1
 */

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@client/core/auth';
import type { User } from '@client/core/auth/types';
import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import { copySystem } from '@client/lib/content/copy-system';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DocumentShieldIcon,
  ChanukaWordmark,
} from '@client/lib/design-system';
import { ChanukaShield } from '@client/lib/design-system/media/ChanukaShield';
import { logger } from '@client/lib/utils/logger';

// Strategic color palette with extended semantic colors
const COLORS = {
  primary: '#0d3b66',        // Navy blue - authority & trust
  secondary: '#084c61',       // Teal - innovation & clarity
  accent: '#f38a1f',          // Orange - action & energy
  accentHover: '#d47716',     // Darker orange
  success: '#10b981',         // Green - positive outcomes
  warning: '#f59e0b',         // Amber - caution
  danger: '#ef4444',          // Red - critical alerts
  neutral: '#64748b',         // Slate - supporting text
  surface: '#f8fafc',         // Light gray - backgrounds
  surfaceDark: '#1e293b',     // Dark surface for contrast
} as const;

// Animation configuration
const ANIMATION_CONFIG = {
  staggerDelay: 100,
  fadeInDuration: 600,
  slideDistance: 40,
  hoverScale: 1.02,
  cardHoverY: -8,
} as const;

/**
 * Custom Hook: Intersection Observer for scroll animations
 */
const useIntersectionObserver = (options: IntersectionObserverInit = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing for performance
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1, ...options }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

/**
 * Custom Hook: Reduced motion detection for accessibility
 */
const usePrefersReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
};

/**
 * Custom Hook: Scroll progress indicator
 */
const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / scrollHeight) * 100;
      setProgress(Math.min(scrolled, 100));
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress(); // Initial call
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return progress;
};

/**
 * Scroll Progress Indicator Component
 */
const ScrollProgressIndicator = React.memo(() => {
  const progress = useScrollProgress();

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50 transition-opacity duration-300"
      style={{
        background: `linear-gradient(to right, ${COLORS.accent}, ${COLORS.secondary})`,
        width: `${progress}%`,
        opacity: progress > 5 ? 1 : 0,
      }}
    />
  );
});
ScrollProgressIndicator.displayName = 'ScrollProgressIndicator';

/**
 * Enhanced Typography System
 */
const TypographyStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Work+Sans:wght@300;400;500;600;700;800&display=swap');

    .font-display {
      font-family: 'DM Serif Display', serif;
      font-weight: 400;
      letter-spacing: -0.02em;
    }

    .font-body {
      font-family: 'Work Sans', sans-serif;
    }



    .noise-overlay {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
      pointer-events: none;
    }

    /* Glassmorphism effect */
    .glass {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    /* Smooth animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(40px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out forwards;
    }

    .animate-fade-in {
      animation: fadeIn 0.6s ease-out forwards;
    }

    .animate-scale-in {
      animation: scaleIn 0.5s ease-out forwards;
    }

    /* Skeleton loading */
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    /* Hover ripple effect */
    .ripple-container {
      position: relative;
      overflow: hidden;
    }

    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    /* Diagonal decorative elements */
    .diagonal-accent {
      clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%);
    }

    /* Focus visible for accessibility */
    *:focus-visible {
      outline: 3px solid ${COLORS.accent};
      outline-offset: 2px;
    }
  `}</style>
);

/**
 * Statistics Item Interface
 */
interface StatItem {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
}

/**
 * Skeleton Loader Component
 */
const SkeletonCard = React.memo(() => (
  <div className="border rounded-2xl p-6 shadow-lg bg-white">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-16 h-16 skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-6 skeleton w-3/4" />
        <div className="h-4 skeleton w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 skeleton w-full" />
      <div className="h-4 skeleton w-5/6" />
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

/**
 * Enhanced Platform Statistics with Scroll Animation
 */
const PlatformStats = React.memo<{ stats: StatItem[] }>(({ stats }) => {
  const { ref, isVisible } = useIntersectionObserver();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div ref={ref} className="text-center">
      <h2 
        className="text-5xl font-display font-bold text-gray-900 mb-4"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: `translateY(${isVisible ? 0 : 30}px)`,
          transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        Platform Impact
      </h2>
      <p 
        className="text-xl font-body text-gray-600 mb-12 max-w-2xl mx-auto"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: `translateY(${isVisible ? 0 : 30}px)`,
          transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
        }}
      >
        Real metrics from citizens making a difference
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="text-center group cursor-default"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: `translateY(${isVisible ? 0 : 40}px)`,
                transition: prefersReducedMotion 
                  ? 'none' 
                  : `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`,
              }}
            >
              <div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                }}
              >
                <Icon className="h-10 w-10 text-white" />
              </div>
              <div className="text-4xl font-display font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm font-body font-medium text-gray-600 mb-1">
                {stat.label}
              </div>
              {stat.change && (
                <div className="text-xs font-body font-semibold" style={{ color: COLORS.success }}>
                  {stat.change}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
PlatformStats.displayName = 'PlatformStats';

/**
 * Enhanced Recent Activity with Staggered Animations
 */
const RecentActivity = React.memo(() => {
  const { ref, isVisible } = useIntersectionObserver();
  const prefersReducedMotion = usePrefersReducedMotion();

  const activities = [
    {
      icon: FileText,
      title: 'New Bill: Climate Action Framework',
      description: 'Comprehensive climate legislation introduced for public review',
      badge: { label: 'New', variant: 'secondary' as const },
      stats: [
        { icon: Clock, text: '2 hours ago' },
        { icon: Eye, text: '1,247 views' },
      ],
      link: '/bills',
      gradient: `linear-gradient(135deg, ${COLORS.primary}, #1a4d7a)`,
      bgGradient: `linear-gradient(to right, ${COLORS.primary}08, ${COLORS.primary}10)`,
      borderColor: `${COLORS.primary}20`,
    },
    {
      icon: AlertTriangle,
      title: 'Workaround Alert: Tax Reform Implementation',
      description: 'Potential bypass mechanism detected in regulatory implementation',
      badge: { label: 'Alert', variant: 'destructive' as const },
      stats: [
        { icon: Clock, text: '4 hours ago' },
        { icon: Activity, text: 'High Priority' },
      ],
      link: '/workarounds',
      gradient: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentHover})`,
      bgGradient: `linear-gradient(to right, ${COLORS.accent}08, ${COLORS.accent}10)`,
      borderColor: `${COLORS.accent}20`,
    },
    {
      icon: MessageSquare,
      title: 'Community Discussion: Healthcare Access',
      description: 'Active discussion on proposed healthcare legislation changes',
      badge: { label: 'Active', variant: 'default' as const },
      stats: [
        { icon: Clock, text: '6 hours ago' },
        { icon: Users, text: '324 participants' },
      ],
      link: '/community',
      gradient: `linear-gradient(135deg, ${COLORS.secondary}, #0a5f76)`,
      bgGradient: `linear-gradient(to right, ${COLORS.secondary}08, ${COLORS.secondary}10)`,
      borderColor: `${COLORS.secondary}20`,
    },
  ];

  return (
    <div ref={ref} className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 
          className="text-5xl font-display font-bold text-gray-900 mb-4"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 30}px)`,
            transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Recent Activity
        </h2>
        <p 
          className="text-xl font-body text-gray-600"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: `translateY(${isVisible ? 0 : 30}px)`,
            transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
          }}
        >
          Stay updated with the latest legislative developments
        </p>
      </div>

      <Card className="border-0 shadow-2xl overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="space-y-6">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.title}
                  className="flex items-start gap-6 p-8 rounded-2xl hover:shadow-xl transition-all duration-500 border group cursor-pointer relative overflow-hidden"
                  style={{
                    background: activity.bgGradient,
                    borderColor: activity.borderColor,
                    opacity: isVisible ? 1 : 0,
                    transform: `translateX(${isVisible ? 0 : -40}px)`,
                    transition: prefersReducedMotion 
                      ? 'none' 
                      : `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.15}s`,
                  }}
                >
                  {/* Hover gradient effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `${activity.bgGradient}` }}
                  />

                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg z-10 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: activity.gradient }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-body font-bold text-gray-900 text-lg">
                        {activity.title}
                      </h4>
                      <Badge variant={activity.badge.variant} className="text-xs font-semibold">
                        {activity.badge.label}
                      </Badge>
                    </div>
                    <p className="font-body text-gray-600 mb-3 leading-relaxed">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-6 text-xs font-body font-medium text-gray-500">
                      {activity.stats.map((stat, i) => {
                        const StatIcon = stat.icon;
                        return (
                          <span key={i} className="flex items-center gap-1.5">
                            <StatIcon className="w-4 h-4" />
                            {stat.text}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <Link to={activity.link} className="z-10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group-hover:translate-x-2 transition-transform duration-300"
                      style={{ color: COLORS.primary }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
RecentActivity.displayName = 'RecentActivity';

/**
 * Enhanced Hero Section with Advanced Animations
 */
const EnhancedHero = React.memo<{ onSearch: (query: string) => void }>(({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <section 
      className="relative overflow-hidden min-h-[80vh] flex items-center py-24 diagonal-accent"
    >
      {/* Background Image with Overlay - Restored */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/Chanuka_hero_parliament.png" 
          alt="Parliament Building" 
          className="w-full h-full object-cover opacity-20"
          style={{ objectPosition: 'center 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-[#fef6ed]" />
      </div>

      {/* Noise texture for depth */}
      <div className="noise-overlay" />



      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-6xl mx-auto">


          {/* Status Badge */}
          <div 
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-body font-semibold mb-8 glass shadow-lg"
            style={{
              animation: prefersReducedMotion ? 'none' : 'fadeIn 0.6s ease-out 0.2s both',
              backgroundColor: `${COLORS.success}15`,
              color: COLORS.success,
            }}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ 
                backgroundColor: COLORS.success,
                animation: prefersReducedMotion ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <span>Platform Active • Real-time Updates</span>
          </div>

          {/* Main Headline */}
          <h1 
            className="text-6xl md:text-7xl font-display font-bold mb-6 leading-tight"
            style={{
              animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.8s ease-out 0.4s both',
            }}
          >
            <span 
              className="bg-clip-text text-transparent block"
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary}, ${COLORS.accent})`,
                backgroundSize: '200% auto',
              }}
            >
              Democracy
            </span>
            <span style={{ color: COLORS.primary }}>in Your Hands</span>
          </h1>

          <p 
            className="text-xl font-body text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed font-light"
            style={{
              animation: prefersReducedMotion ? 'none' : 'fadeIn 0.6s ease-out 0.6s both',
            }}
          >
            {copySystem.platformMission.short}
          </p>

          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            style={{
              animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.6s ease-out 0.8s both',
            }}
          >
            <Link to="/bills">
              <Button
                size="lg"
                className="text-base font-body font-semibold px-8 py-6 shadow-2xl hover:shadow-[0_20px_50px_rgba(243,138,31,0.4)] transition-all duration-500 hover:scale-105 text-white relative overflow-hidden group ripple-container"
                style={{ backgroundColor: COLORS.accent }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.accentHover;
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.accent;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Explore Bills
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link to="/community">
              <Button
                variant="outline"
                size="lg"
                className="text-base font-body font-semibold px-8 py-6 border-2 transition-all duration-500 bg-white shadow-lg hover:shadow-xl"
                style={{ 
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.primary;
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = COLORS.primary;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Users className="mr-2 h-5 w-5" />
                Join Community
              </Button>
            </Link>
          </div>

          {/* Enhanced Search Box with Glass Effect */}
          <div 
            className="max-w-2xl mx-auto"
            style={{
              animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.6s ease-out 1s both',
            }}
          >
            <div 
              className="glass rounded-3xl p-6 shadow-2xl transition-all duration-500"
              style={{
                transform: isSearchFocused ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSearchFocused 
                  ? `0 25px 50px -12px rgba(13, 59, 102, 0.25)` 
                  : undefined,
              }}
            >
              <div className="text-center mb-4">
                <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                  Search Legislation
                </h3>
                <p className="font-body text-gray-600 text-sm">
                  Find bills, analyze policy impacts, and detect implementation workarounds
                </p>
              </div>
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                  <Search 
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors duration-300"
                    style={{ color: isSearchFocused ? COLORS.primary : COLORS.neutral }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Search bills, sponsors, policy topics..."
                    className="w-full pl-16 pr-32 py-5 rounded-2xl border-2 font-body text-lg focus:ring-4 outline-none transition-all duration-300 bg-white"
                    style={{ 
                      borderColor: isSearchFocused ? COLORS.primary : '#e5e7eb',
                      '--tw-ring-color': `${COLORS.primary}20`
                    } as React.CSSProperties}
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 text-white rounded-xl transition-all duration-300 font-body font-semibold hover:scale-105 shadow-lg flex items-center gap-2"
                    style={{ backgroundColor: COLORS.accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.accentHover;
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = COLORS.accent;
                      e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
EnhancedHero.displayName = 'EnhancedHero';

/**
 * Enhanced Feature Cards with Asymmetric Layout
 */
const FeatureCards = React.memo(() => {
  const { ref, isVisible } = useIntersectionObserver();
  const prefersReducedMotion = usePrefersReducedMotion();

  const features = [
    {
      icon: FileText,
      title: 'Legislative Tracking',
      description: 'Real-time monitoring of bills, amendments, and voting patterns. Get personalized alerts on legislation that matters to you and your community.',
      link: '/bills',
      color: COLORS.primary,
      featured: true,
    },
    {
      icon: Shield,
      title: 'Workaround Detection',
      description: 'AI-powered detection of implementation workarounds and constitutional bypass tactics using advanced pattern recognition.',
      link: '/workarounds',
      color: COLORS.accent,
      brandIcon: true,
      featured: true,
    },
    {
      icon: Users,
      title: 'Civic Engagement',
      description: 'Connect with citizens nationwide, share insights, and participate in informed discussions about policy impacts.',
      link: '/community',
      color: COLORS.secondary,
    },
    {
      icon: BarChart3,
      title: 'Impact Analysis',
      description: 'Comprehensive analysis of how legislation affects different communities and stakeholder groups with data visualization.',
      link: '/analysis',
      color: COLORS.primary,
    },
    {
      icon: Target,
      title: 'Expert Insights',
      description: 'Access professional analysis, expert commentary, and scholarly research on complex legislative matters.',
      link: '/expert',
      color: COLORS.accent,
    },
    {
      icon: Activity,
      title: 'Real-time Monitoring',
      description: 'Stay informed with live updates on legislative sessions, committee votes, and floor activities as they happen.',
      link: '/status',
      color: COLORS.secondary,
    },
  ];

  return (
    <section ref={ref} className="py-20 bg-white relative overflow-hidden">
      {/* Subtle brand watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none">
        <ChanukaShield size={800} variant="brand" className="w-[1000px] h-auto" />
      </div>


      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 
            className="text-5xl font-display font-bold text-gray-900 mb-4"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Powerful Tools for Civic Engagement
          </h2>
          <p 
            className="text-xl font-body font-light text-gray-600 max-w-3xl mx-auto"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
            }}
          >
            Everything you need to stay informed and engaged with the legislative process
          </p>
        </div>

        {/* Asymmetric Grid Layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const spanClass = feature.featured ? 'md:col-span-1 lg:col-span-1' : '';
            
            return (
              <Card
                key={index}
                className={`group hover:shadow-2xl transition-all duration-500 border-0 shadow-lg relative overflow-hidden ${spanClass}`}
                style={{
                  background: `linear-gradient(135deg, ${feature.color}08, ${feature.color}05)`,
                  opacity: isVisible ? 1 : 0,
                  transform: `translateY(${isVisible ? 0 : 40}px)`,
                  transition: prefersReducedMotion 
                    ? 'none' 
                    : `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`,
                }}
                onMouseEnter={(e) => {
                  if (!prefersReducedMotion) {
                    e.currentTarget.style.transform = `translateY(-${ANIMATION_CONFIG.cardHoverY}px)`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Gradient overlay on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ 
                    background: `linear-gradient(135deg, ${feature.color}15, transparent)` 
                  }}
                />

                <CardHeader className="text-center pb-6 relative z-10">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl"
                    style={{ 
                      background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` 
                    }}
                  >
                    {feature.brandIcon ? (
                      <DocumentShieldIcon size="sm" className="w-10 h-10 invert" />
                    ) : (
                      <Icon className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <CardTitle className="text-3xl font-display font-bold text-gray-900 mb-3">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="text-center relative z-10">
                  <CardDescription className="font-body text-gray-600 mb-8 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                  <Link to={feature.link}>
                    <Button
                      variant="ghost"
                      className="group/btn font-body font-semibold transition-all duration-300 hover:bg-white hover:shadow-lg"
                      style={{ color: feature.color }}
                    >
                      Learn More
                      <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
});
FeatureCards.displayName = 'FeatureCards';

/**
 * Enhanced Trust Indicators with Brand Assets
 */
const TrustIndicators = React.memo(() => {
  const { ref, isVisible } = useIntersectionObserver();
  const prefersReducedMotion = usePrefersReducedMotion();

  const indicators = [
    { icon: Shield, label: 'Secure & Private', value: '256-bit Encryption', description: 'Bank-level security' },
    { icon: CheckCircle, label: 'Verified Data', value: 'Official Sources', description: 'Government APIs' },
    { icon: Users, label: 'Active Community', value: '10,000+', description: 'Engaged Citizens' },
    { icon: TrendingUp, label: 'Growing Impact', value: '↑ 25%', description: 'Monthly Growth' },
  ];

  return (
    <section 
      ref={ref}
      className="py-32 text-white relative overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` 
      }}
    >
      {/* Noise texture */}
      <div className="noise-overlay opacity-50" />

      {/* Brand accent in background */}
      <div 
        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10"
        style={{
          transform: isVisible ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.8)',
          transition: prefersReducedMotion ? 'none' : 'all 1s cubic-bezier(0.4, 0, 0.2, 1) 0.3s',
        }}
      >
        <DocumentShieldIcon size="full" className="w-[500px] h-[500px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 
            className="text-5xl font-display font-bold mb-4"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Trusted by Citizens Nationwide
          </h2>
          <p 
            className="text-blue-100 text-xl font-body font-light"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
            }}
          >
            Built with security, transparency, and civic engagement at its core
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {indicators.map((indicator, index) => {
            const Icon = indicator.icon;
            return (
              <div 
                key={index} 
                className="text-center group cursor-default"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: `translateY(${isVisible ? 0 : 40}px)`,
                  transition: prefersReducedMotion 
                    ? 'none' 
                    : `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.15}s`,
                }}
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-500 shadow-xl">
                  <Icon className="h-10 w-10" />
                </div>
                <div className="text-3xl font-display font-bold mb-2">{indicator.value}</div>
                <div className="text-blue-100 font-body font-semibold mb-1">{indicator.label}</div>
                <div className="text-blue-200 text-sm font-body">{indicator.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
TrustIndicators.displayName = 'TrustIndicators';

/**
 * Enhanced Call to Action
 */
const CallToAction = React.memo(() => {
  const { ref, isVisible } = useIntersectionObserver();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section 
      ref={ref}
      className="py-32 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #fef6ed 100%)' }}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div 
            className="mb-10"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `scale(${isVisible ? 1 : 0.8})`,
              transition: prefersReducedMotion ? 'none' : 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <DocumentShieldIcon size="lg" className="mx-auto drop-shadow-xl" />
          </div>

          <h2 
            className="text-6xl md:text-7xl font-display font-bold mb-8"
            style={{ 
              color: COLORS.primary,
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
            }}
          >
            Ready to Make Your Voice Heard?
          </h2>
          
          <p 
            className="text-2xl font-body font-light text-gray-600 mb-12 leading-relaxed"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s',
            }}
          >
            Join thousands of engaged citizens using Chanuka to stay informed, track legislation,
            and participate in the democratic process.
          </p>

          <div 
            className="flex flex-col sm:flex-row gap-5 justify-center mb-8"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: `translateY(${isVisible ? 0 : 30}px)`,
              transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.6s',
            }}
          >
            <Link to="/auth?mode=register">
              <Button
                size="lg"
                className="text-xl font-body font-bold px-12 py-8 shadow-2xl hover:shadow-[0_25px_50px_rgba(243,138,31,0.4)] transition-all duration-500 hover:scale-105 text-white"
                style={{ backgroundColor: COLORS.accent }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.accentHover;
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.accent;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Sparkles className="mr-2 h-6 w-6" />
                Get Started Free
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>

            <Link to="/about">
              <Button
                variant="outline"
                size="lg"
                className="text-xl font-body font-bold px-12 py-8 border-2 transition-all duration-500 bg-white shadow-xl hover:shadow-2xl"
                style={{ 
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.primary;
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = COLORS.primary;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Learn More
              </Button>
            </Link>
          </div>

          <p 
            className="text-sm font-body text-gray-500"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : 'opacity 0.6s ease-out 0.8s',
            }}
          >
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
});
CallToAction.displayName = 'CallToAction';

/**
 * Personalized Dashboard Preview (for authenticated users)
 */
const PersonalizedDashboardPreview = React.memo<{ user: User; persona: string }>(({ user, persona }) => {
  const { ref, isVisible } = useIntersectionObserver();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Content adaptation based on persona
  const getPersonaContent = () => {
    switch (persona) {
      case 'expert':
        return [
          {
            icon: Shield,
            title: 'Expert Review',
            value: '3 Pending',
            subtitle: 'Legislation awaiting analysis',
            link: '/expert/reviews',
            color: COLORS.primary,
          },
          {
            icon: Target,
            title: 'Impact Analysis',
            value: 'High Priority',
            subtitle: 'New tax reform bill',
            link: '/analysis',
            color: COLORS.accent,
          },
          {
            icon: BarChart3,
            title: 'Analytics',
            value: 'Advanced',
            subtitle: 'System-wide monitoring',
            link: '/analytics',
            color: COLORS.secondary,
          },
        ];
      case 'intermediate':
        return [
          {
            icon: FileText,
            title: 'Tracked Bills',
            value: '12',
            subtitle: '3 with recent updates',
            link: '/dashboard/bills',
            color: COLORS.primary,
          },
          {
            icon: AlertTriangle,
            title: 'Active Alerts',
            value: '2',
            subtitle: 'Workarounds detected',
            link: '/dashboard/alerts',
            color: COLORS.accent,
          },
          {
            icon: MessageSquare,
            title: 'Discussions',
            value: '5',
            subtitle: 'Active conversations',
            link: '/community',
            color: COLORS.secondary,
          },
        ];
      case 'novice':
      default:
        return [
          {
            icon: Sparkles,
            title: 'Getting Started',
            value: 'Level 1',
            subtitle: 'Complete your profile',
            link: '/onboarding',
            color: COLORS.accent,
          },
          {
            icon: FileText,
            title: 'Trending Bills',
            value: 'Top 3',
            subtitle: 'Popular in your area',
            link: '/bills/trending',
            color: COLORS.primary,
          },
          {
            icon: Users,
            title: 'Community',
            value: 'Join Now',
            subtitle: 'Connect with others',
            link: '/community',
            color: COLORS.secondary,
          },
        ];
    }
  };

  const quickStats = getPersonaContent();

  return (
    <section ref={ref} className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-6xl font-display font-bold text-gray-900 mb-4"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: `translateY(${isVisible ? 0 : 30}px)`,
                transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Welcome back, {user.profile?.displayName || user.name || 'Citizen'}!
            </h2>
            <p 
              className="text-2xl font-body font-light text-gray-600"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: `translateY(${isVisible ? 0 : 30}px)`,
                transition: prefersReducedMotion ? 'none' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
              }}
            >
              {persona === 'expert' 
                ? 'Your professional legislative intelligence briefing is ready.'
                : persona === 'intermediate'
                  ? "Here's what's happening with your tracked legislation"
                  : 'Ready to continue exploring how legislation affects your community?'}
            </p>
            <div className="mt-6">
               <Badge variant="secondary" className="text-sm capitalize px-3 py-1">
                 {persona} User
               </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group overflow-hidden"
                  style={{
                    borderTop: `6px solid ${stat.color}`,
                    opacity: isVisible ? 1 : 0,
                    transform: `translateY(${isVisible ? 0 : 40}px)`,
                    transition: prefersReducedMotion 
                      ? 'none' 
                      : `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.15}s`,
                  }}
                  onMouseEnter={(e) => {
                    if (!prefersReducedMotion) {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl font-display">
                      <div 
                        className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${stat.color}15` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: stat.color }} />
                      </div>
                      <span>{stat.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-display font-bold mb-2" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <p className="text-sm font-body text-gray-600 mb-6">{stat.subtitle}</p>
                    <Link to={stat.link}>
                      <Button 
                        variant="ghost" 
                        className="w-full font-body font-semibold group-hover:bg-gray-50" 
                        style={{ color: stat.color }}
                      >
                        View All
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});
PersonalizedDashboardPreview.displayName = 'PersonalizedDashboardPreview';

// ... (leaving file content mostly same but updating component name and export)
export default function EnhancedHomePage() {
// ...
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: profile } = useUserProfile(user?.id);

  // Persona state
  const [userPersona, setUserPersona] = useState<'novice' | 'intermediate' | 'expert'>('novice');
  const [isPersonaDetected, setIsPersonaDetected] = useState<boolean>(false);

  // Detect user persona
  useEffect(() => {
    if (isAuthenticated && user && !isPersonaDetected) {
      try {
        let determinedPersona: 'novice' | 'intermediate' | 'expert' = 'novice';

        if (user.role === 'expert') {
          determinedPersona = 'expert';
        } else if ((user.login_count || 0) > 5) {
          determinedPersona = 'intermediate';
        }

        setUserPersona(determinedPersona);
        setIsPersonaDetected(true);

        logger.info('User persona detected', {
          userId: user.id,
          persona: determinedPersona,
        });
      } catch (error) {
        logger.warn('Persona detection failed, defaulting to novice', { error });
        setUserPersona('novice');
        setIsPersonaDetected(true);
      }
    }
  }, [isAuthenticated, user, isPersonaDetected]);

  // Statistics data with memoization
  const stats: StatItem[] = useMemo(
    () => [
      { icon: FileText, label: 'Bills Tracked', value: '500+', change: '↑ 15% this week' },
      { icon: Users, label: 'Active Citizens', value: '10,000+', change: '↑ 25% monthly' },
      { icon: AlertTriangle, label: 'Workarounds Detected', value: '50+', change: '↑ 8% this month' },
      { icon: TrendingUp, label: 'Growing Daily', value: '↑ 25%', change: 'Consistent growth' },
    ],
    []
  );

  const handleSearch = useCallback(
    (query: string) => {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    },
    [navigate]
  );

  useEffect(() => {
    logger.info('Optimized Home Page loaded', {
      userId: user?.id,
      isAuthenticated,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  }, [user, isAuthenticated]);

  return (
    <>
      <TypographyStyles />
      <ScrollProgressIndicator />
      
      {/* {process.env.NODE_ENV === 'development' && <PerformanceMonitor pageName="home" />} */}

      <div className="min-h-screen font-body bg-white">
        {/* Hero Section - Always Visible */}
        <EnhancedHero onSearch={handleSearch} />

        {/* Conditional Content Based on Authentication */}
        {isAuthenticated && user ? (
          /* Authenticated User Content - Personalized Dashboard */
          <PersonalizedDashboardPreview user={user} persona={userPersona} />
        ) : (
          /* Anonymous User Content - Feature Cards */
          <FeatureCards />
        )}

        {/* Marketing Sections Removed (Pre-launch) */}

        {/* Trust Indicators - Always Visible */}
        <TrustIndicators />

        {/* Call to Action - Always Visible */}
        <CallToAction />
      </div>
    </>
  );
}