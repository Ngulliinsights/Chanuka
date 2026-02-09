/**
 * Enhanced Home Page with Strategic Brand Integration
 * 
 * Leverages SVG brand assets throughout the page for:
 * - Visual hierarchy and brand recognition
 * - Trust indicators and security messaging
 * - Decorative accents that enhance UX
 * - Loading states and transitions
 */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronRight,
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
import { copySystem } from '@client/lib/content/copy-system';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChanukaFullLogo,
  DocumentShieldIcon,
  FloatingBrandAccent,
  HeroBrandElement,
  ChanukaSmallLogo,
} from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

/**
 * Enhanced Hero Section with Brand Integration
 */
const EnhancedHero: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-orange-50 py-20">
      {/* Floating brand accents for visual interest */}
      <FloatingBrandAccent position="top-right" className="opacity-3" />
      <FloatingBrandAccent position="bottom-left" className="opacity-3" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Hero Brand Element */}
          <div className="mb-8 flex justify-center">
            <HeroBrandElement className="animate-fade-in" />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Platform Active • Real-time Updates</span>
          </div>

          {/* Main Headline - Using brand colors */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-[#1a2e49] via-[#11505c] to-[#1a2e49] bg-clip-text text-transparent">
              Democracy
            </span>
            <br />
            <span className="text-[#1a2e49]">in Your Hands</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
            {copySystem.platformMission.short}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/bills">
              <Button
                size="lg"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-[#f29b06] hover:bg-[#d98905] text-white"
              >
                <FileText className="mr-2 h-5 w-5" />
                Explore Bills
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/community">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2 border-[#1a2e49] text-[#1a2e49] hover:bg-[#1a2e49] hover:text-white transition-all duration-300"
              >
                <Users className="mr-2 h-5 w-5" />
                Join Community
              </Button>
            </Link>
          </div>

          {/* Enhanced Search Box */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Legislation</h3>
                <p className="text-gray-600 text-sm">
                  Find bills, analyze policy impacts, and detect implementation workarounds
                </p>
              </div>
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search bills, sponsors, policy topics..."
                  className="w-full px-6 py-4 pr-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-300"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#f29b06] text-white rounded-lg hover:bg-[#d98905] transition-all duration-300"
                >
                  <Search className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Feature Cards with Brand Integration
 */
const FeatureCards: React.FC = () => {
  const features = [
    {
      icon: FileText,
      title: 'Legislative Tracking',
      description:
        'Real-time monitoring of bills, amendments, and voting patterns. Get alerts on legislation that matters to you.',
      link: '/bills',
      gradient: 'from-[#1a2e49]/10 to-[#1a2e49]/20',
      iconGradient: 'from-[#1a2e49] to-[#11505c]',
    },
    {
      icon: Shield,
      title: 'Workaround Detection',
      description:
        'AI-powered detection of implementation workarounds and constitutional bypass tactics in legislation.',
      link: '/workarounds',
      gradient: 'from-[#f29b06]/10 to-[#f29b06]/20',
      iconGradient: 'from-[#f29b06] to-[#d98905]',
      brandIcon: true, // Use DocumentShieldIcon
    },
    {
      icon: Users,
      title: 'Civic Engagement',
      description:
        'Connect with citizens, share insights, and participate in informed discussions about policy impacts.',
      link: '/community',
      gradient: 'from-[#11505c]/10 to-[#11505c]/20',
      iconGradient: 'from-[#11505c] to-[#0e404a]',
    },
    {
      icon: BarChart3,
      title: 'Impact Analysis',
      description:
        'Comprehensive analysis of how legislation affects different communities and stakeholder groups.',
      link: '/analysis',
      gradient: 'from-[#1a2e49]/10 to-[#1a2e49]/20',
      iconGradient: 'from-[#1a2e49] to-[#11505c]',
    },
    {
      icon: Target,
      title: 'Expert Insights',
      description:
        'Access professional analysis and expert commentary on complex legislative matters.',
      link: '/expert',
      gradient: 'from-[#f29b06]/10 to-[#f29b06]/20',
      iconGradient: 'from-[#f29b06] to-[#d98905]',
    },
    {
      icon: Activity,
      title: 'Real-time Monitoring',
      description:
        'Stay informed with live updates on legislative sessions, votes, and committee activities.',
      link: '/monitoring',
      gradient: 'from-[#11505c]/10 to-[#11505c]/20',
      iconGradient: 'from-[#11505c] to-[#0e404a]',
    },
  ];

  return (
    <section className="py-20 bg-white relative">
      {/* Subtle brand watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
        <ChanukaFullLogo size="full" className="w-[800px] h-auto" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Tools for Civic Engagement
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to stay informed and engaged with the legislative process
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={`group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br ${feature.gradient}`}
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.iconGradient} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    {feature.brandIcon ? (
                      <DocumentShieldIcon size="sm" className="w-8 h-8 invert" />
                    ) : (
                      <Icon className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <Link to={feature.link}>
                    <Button
                      variant="ghost"
                      className="group-hover:bg-white group-hover:shadow-md transition-all duration-300"
                    >
                      Learn More
                      <ChevronRight className="ml-2 w-4 h-4" />
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
};

/**
 * Trust Indicators Section with Brand Assets
 */
const TrustIndicators: React.FC = () => {
  const indicators = [
    { icon: Shield, label: 'Secure & Private', value: '256-bit Encryption' },
    { icon: CheckCircle, label: 'Verified Data', value: 'Official Sources' },
    { icon: Users, label: 'Active Community', value: '10,000+ Citizens' },
    { icon: TrendingUp, label: 'Growing Impact', value: '50+ Bills Tracked' },
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-[#1a2e49] to-[#11505c] text-white relative overflow-hidden">
      {/* Brand accent in background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10">
        <DocumentShieldIcon size="full" className="w-96 h-96" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Trusted by Citizens Nationwide</h2>
          <p className="text-blue-100 text-lg">
            Built with security, transparency, and civic engagement at its core
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {indicators.map((indicator, index) => {
            const Icon = indicator.icon;
            return (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mb-4">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="text-2xl font-bold mb-1">{indicator.value}</div>
                <div className="text-blue-100 text-sm">{indicator.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Call to Action Section with Brand Integration
 */
const CallToAction: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-orange-50 relative overflow-hidden">
      {/* Decorative brand elements */}
      <div className="absolute left-0 top-0 opacity-5">
        <ChanukaSmallLogo size="full" className="w-64 h-64" />
      </div>
      <div className="absolute right-0 bottom-0 opacity-5">
        <ChanukaSmallLogo size="full" className="w-64 h-64" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <DocumentShieldIcon size="lg" className="mx-auto" />
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-[#1a2e49] mb-6">
            Ready to Make Your Voice Heard?
          </h2>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Join thousands of engaged citizens using Chanuka to stay informed, track legislation,
            and participate in the democratic process.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?mode=register">
              <Button
                size="lg"
                className="text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-[#f29b06] hover:bg-[#d98905] text-white"
              >
                Get Started Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/about">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-10 py-6 border-2 border-[#1a2e49] text-[#1a2e49] hover:bg-[#1a2e49] hover:text-white transition-all duration-300"
              >
                Learn More
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

/**
 * Main Enhanced Home Page Component
 */
export default function EnhancedHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSearch = useCallback(
    (query: string) => {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    },
    [navigate]
  );

  useEffect(() => {
    logger.info('Enhanced Home Page loaded', { userId: user?.id });
  }, [user]);

  return (
    <div className="min-h-screen">
      <EnhancedHero onSearch={handleSearch} />
      <FeatureCards />
      <TrustIndicators />
      <CallToAction />
    </div>
  );
}
