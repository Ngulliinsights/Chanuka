import { Link } from 'react-router-dom';
import { memo, useMemo, useCallback } from 'react';
import FavoritePageButton from '..\components\navigation\favorite-page-button';
import {
  ResponsiveLayoutProvider,
  ResponsiveContainer,
  ResponsiveGrid,
  TouchButton
} from '..\components\mobile\responsive-layout-manager';
import {
  ResponsiveCardGrid,
  ResponsiveSection,
  ResponsiveStatsGrid
} from '..\components\mobile\responsive-page-wrapper';
import { LazyLoadWrapper } from '..\components\mobile\mobile-performance-optimizations';
import { logger } from '..\utils\browser-logger';
import { navigationService } from '../services/navigation';

// Define the shape of a feature object for type safety
// This ensures we maintain consistency across the application
interface Feature {
  title: string;
  description: string;
  icon: string;
  link: string;
}

// Define props interface for the FeatureCard component
// This tells TypeScript exactly what data this component expects to receive
interface FeatureCardProps {
  feature: Feature;
  index: number;
}

// Extracted constants to prevent recreation on every render
// Using 'as const' assertion would make this even more type-safe if needed
const FEATURES: Feature[] = [
  {
    title: 'Bill Tracking',
    description: 'Monitor legislative proposals and their progress through the system',
    icon: '📜',
    link: '/bills',
  },
  {
    title: 'Transparency Analysis',
    description: 'Analyze conflicts of interest and sponsor relationships',
    icon: '🔍',
    link: '/bill-sponsorship-analysis',
  },
  {
    title: 'Community Input',
    description: 'Participate in public discourse and provide feedback',
    icon: '👥',
    link: '/community',
  },
  {
    title: 'Expert Verification',
    description: 'Access expert analysis and fact-checking resources',
    icon: '✅',
    link: '/expert-verification',
  },
];

const STATS = [
  { label: 'Bills Tracked', value: '1,247' },
  { label: 'Community Members', value: '15,834' },
  { label: 'Expert Verifications', value: '892' },
  { label: 'Transparency Score Avg', value: '72%' },
];

// Memoized feature card component with explicit TypeScript props
// The React.FC type is optional but can provide better IDE support
const FeatureCard = memo<FeatureCardProps>(({ feature, index }) => (
  <Link
    to={feature.link}
    className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 text-center group focus:outline-none focus:ring-2 focus:ring-[#f38a1f] focus:ring-offset-2 block border border-gray-100 hover:border-[#f38a1f]/20"
    aria-label={`${feature.title}: ${feature.description}`}
  >
    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
      {feature.icon}
    </div>
    <h3 className="text-lg font-semibold text-[#0d3b66] mb-2 group-hover:text-[#f38a1f] transition-colors duration-200">
      {feature.title}
    </h3>
    <p className="text-[#084c61] text-sm">
      {feature.description}
    </p>
    <div className="mt-4 text-[#f38a1f] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      Explore →
    </div>
  </Link>
));

// Adding a display name helps with React DevTools debugging
FeatureCard.displayName = 'FeatureCard';

function HomePage() {
  // Memoize the stats transformation to prevent recalculation on every render
  // The type inference here works automatically from the STATS constant
  const statsData = useMemo(() => 
    STATS.map(stat => ({
      label: stat.label,
      value: stat.value
    })), 
    [] // Empty dependency array since STATS is constant
  );

  // Memoized navigation handlers with explicit return type (void)
  // These ensure stable function references across renders
  const handleStartTracking = useCallback((): void => {
    navigationService.navigate('/bills');
  }, []);

  const handleJoinMovement = useCallback((): void => {
    navigationService.navigate('/community');
  }, []);

  const handleSeeImpact = useCallback((): void => {
    navigationService.navigate('/dashboard');
  }, []);

  const handleAccessDashboard = useCallback((): void => {
    navigationService.navigate('/dashboard');
  }, []);

  const handleExploreAnalysis = useCallback((): void => {
    navigationService.navigate('/bill-sponsorship-analysis');
  }, []);

  return (
    <ResponsiveLayoutProvider>
      <div className="min-h-screen">
        {/* Hero Section with improved semantic HTML and accessibility */}
        <ResponsiveSection 
          background="transparent" 
          spacing="lg"
          className="bg-gradient-to-br from-[#0d3b66] via-[#084c61] to-[#0d3b66] text-white relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Decorative background overlay with proper aria-hidden */}
          <div className="absolute inset-0 bg-black/10" aria-hidden="true"></div>
          
          <ResponsiveContainer maxWidth="7xl" className="relative z-10">
            <div className="text-center">
              <div className="flex flex-col sm:flex-row justify-center items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
                  <span className="text-[#f38a1f] mr-2" aria-hidden="true">🔥</span>
                  <span>Empowering Democratic Participation</span>
                </div>
                <FavoritePageButton 
                  path="/" 
                  title="Chanuka Home" 
                  variant="ghost" 
                  className="text-white hover:text-[#f38a1f] hover:bg-white/10" 
                />
              </div>
              
              <h1 id="hero-heading" className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Voice in{' '}
                <span className="text-[#f38a1f] block sm:inline">Government Transparency</span>
              </h1>
              
              <p className="text-lg sm:text-xl lg:text-2xl mb-8 max-w-4xl mx-auto opacity-90 leading-relaxed">
                Cut through political noise with AI-powered analysis. Track legislation, 
                expose conflicts of interest, and make your voice heard in the decisions that shape our future.
              </p>
              
              <ResponsiveGrid 
                columns={{ mobile: 1, tablet: 2, desktop: 2 }} 
                gap="md"
                className="max-w-2xl mx-auto"
              >
                <TouchButton
                  variant="primary"
                  size="lg"
                  onClick={handleStartTracking}
                  className="bg-[#f38a1f] hover:bg-[#e67e22] text-white shadow-lg"
                >
                  Start Tracking Bills
                </TouchButton>
                <TouchButton
                  variant="outline"
                  size="lg"
                  onClick={handleJoinMovement}
                  className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  Join the Movement
                </TouchButton>
              </ResponsiveGrid>
            </div>
          </ResponsiveContainer>
        </ResponsiveSection>

        {/* Stats Section with proper heading hierarchy */}
        <ResponsiveSection 
          background="white" 
          spacing="lg"
          aria-labelledby="stats-heading"
        >
          <ResponsiveContainer maxWidth="7xl">
            <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
            <LazyLoadWrapper height={200}>
              <ResponsiveStatsGrid stats={statsData} />
            </LazyLoadWrapper>
          </ResponsiveContainer>
        </ResponsiveSection>

        {/* Features Section with optimized rendering */}
        <ResponsiveSection 
          background="gray" 
          spacing="lg"
          title="Powerful Tools for Civic Engagement"
          subtitle="Everything you need to stay informed and make your voice heard in the democratic process"
          aria-labelledby="features-heading"
        >
          <ResponsiveContainer maxWidth="7xl">
            <LazyLoadWrapper height={400}>
              <ResponsiveCardGrid minCardWidth={280} gap="lg">
                {FEATURES.map((feature, index) => (
                  <FeatureCard 
                    key={feature.link} 
                    feature={feature} 
                    index={index} 
                  />
                ))}
              </ResponsiveCardGrid>
            </LazyLoadWrapper>
          </ResponsiveContainer>
        </ResponsiveSection>

        {/* Mission Statement with enhanced structure */}
        {/* Changed maxWidth from "4xl" to "7xl" to match allowed type values */}
        <ResponsiveSection 
          background="transparent" 
          spacing="lg"
          className="bg-[#0d3b66] text-white relative overflow-hidden"
          aria-labelledby="mission-heading"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#084c61]/20 to-transparent" aria-hidden="true"></div>
          
          <ResponsiveContainer maxWidth="7xl" className="text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              <h2 id="mission-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">
                Democracy Thrives on{' '}
                <span className="text-[#f38a1f] block sm:inline">Transparency</span>
              </h2>
              
              <p className="text-base sm:text-lg lg:text-xl opacity-90 leading-relaxed mb-8">
                We believe every citizen deserves access to clear, unbiased information about legislation. 
                Our mission is to expose hidden connections, simplify complex bills, and empower you 
                to participate meaningfully in shaping the policies that affect your life.
              </p>
              
              <TouchButton
                variant="primary"
                size="lg"
                onClick={handleSeeImpact}
                className="bg-[#f38a1f] hover:bg-[#e67e22] text-white"
              >
                See Your Impact
              </TouchButton>
            </div>
          </ResponsiveContainer>
        </ResponsiveSection>

        {/* Call to Action with improved semantics */}
        {/* Changed maxWidth from "4xl" to "7xl" to match allowed type values */}
        <ResponsiveSection 
          background="white" 
          spacing="lg"
          title="Ready to Make a Difference?"
          subtitle="Join thousands of engaged citizens using transparency tools to hold government accountable."
          aria-labelledby="cta-heading"
        >
          <ResponsiveContainer maxWidth="7xl" className="text-center">
            <div className="max-w-4xl mx-auto">
              <ResponsiveGrid 
                columns={{ mobile: 1, tablet: 2, desktop: 2 }} 
                gap="md"
                className="max-w-2xl mx-auto"
              >
                <TouchButton
                  variant="primary"
                  size="lg"
                  onClick={handleAccessDashboard}
                  className="bg-[#0d3b66] hover:bg-[#084c61] text-white"
                >
                  Access Dashboard
                </TouchButton>
                <TouchButton
                  variant="outline"
                  size="lg"
                  onClick={handleExploreAnalysis}
                  className="border-2 border-[#0d3b66] text-[#0d3b66] hover:bg-[#0d3b66] hover:text-white"
                >
                  Explore Analysis
                </TouchButton>
              </ResponsiveGrid>
            </div>
          </ResponsiveContainer>
        </ResponsiveSection>
      </div>
    </ResponsiveLayoutProvider>
  );
}

export default HomePage;