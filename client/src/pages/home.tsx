
import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  // Data structures moved to the top for better organization and maintainability
  // This makes the component easier to modify and test
  const features = [
    {
      title: 'Bill Tracking',
      description: 'Monitor legislative proposals and their progress through the system',
      icon: '📜',
      link: '/bills-dashboard',
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
      link: '/community-input',
    },
    {
      title: 'Expert Verification',
      description: 'Access expert analysis and fact-checking resources',
      icon: '✅',
      link: '/expert-verification',
    },
  ];

  const stats = [
    { label: 'Bills Tracked', value: '1,247' },
    { label: 'Community Members', value: '15,834' },
    { label: 'Expert Verifications', value: '892' },
    { label: 'Transparency Score Avg', value: '72%' },
  ];

  // Shared CSS classes for consistency and maintainability using Chanuka colors
  const containerClasses = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

  return (
    <div className="min-h-screen">
      {/* Hero Section - Enhanced with Chanuka brand colors and engaging copy */}
      <section className="bg-gradient-to-br from-[#0d3b66] via-[#084c61] to-[#0d3b66] text-white py-20 relative overflow-hidden" role="banner">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className={`${containerClasses} relative z-10`}>
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/20">
              <span className="text-[#f38a1f] mr-2">🔥</span>
              Empowering Democratic Participation
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Voice in 
              <span className="text-[#f38a1f] block">Government Transparency</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto opacity-90 leading-relaxed">
              Cut through political noise with AI-powered analysis. Track legislation, 
              expose conflicts of interest, and make your voice heard in the decisions that shape our future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/bills-dashboard"
                className="bg-[#f38a1f] hover:bg-[#e67e22] text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#f38a1f] focus:ring-offset-2 focus:ring-offset-[#0d3b66]"
                aria-label="Start tracking legislative bills and proposals"
              >
                Start Tracking Bills
              </Link>
              <Link
                to="/community-input"
                className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0d3b66]"
                aria-label="Join our community of engaged citizens"
              >
                Join the Movement
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced with Chanuka colors */}
      <section className="py-16 bg-white border-b border-gray-100" aria-labelledby="stats-heading">
        <div className={containerClasses}>
          <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={`stat-${index}`} className="text-center group hover:transform hover:scale-105 transition-transform duration-200">
                <div className="text-3xl md:text-4xl font-bold text-[#0d3b66] mb-2 group-hover:text-[#f38a1f] transition-colors duration-200" aria-label={`${stat.value} ${stat.label}`}>
                  {stat.value}
                </div>
                <div className="text-[#084c61] text-sm md:text-base font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Improved with Chanuka design system */}
      <section className="py-20 bg-gray-50" aria-labelledby="features-heading">
        <div className={containerClasses}>
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-[#0d3b66] mb-4">
              Powerful Tools for Civic Engagement
            </h2>
            <p className="text-xl text-[#084c61] max-w-2xl mx-auto">
              Everything you need to stay informed and make your voice heard in the democratic process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Link
                key={`feature-${index}`}
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
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement - Enhanced with Chanuka colors */}
      <section className="py-20 bg-[#0d3b66] text-white relative overflow-hidden" aria-labelledby="mission-heading">
        <div className="absolute inset-0 bg-gradient-to-r from-[#084c61]/20 to-transparent"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 id="mission-heading" className="text-3xl md:text-4xl font-bold mb-6">
            Democracy Thrives on 
            <span className="text-[#f38a1f] block">Transparency</span>
          </h2>
          <p className="text-lg md:text-xl opacity-90 leading-relaxed mb-8">
            We believe every citizen deserves access to clear, unbiased information about legislation. 
            Our mission is to expose hidden connections, simplify complex bills, and empower you 
            to participate meaningfully in shaping the policies that affect your life.
          </p>
          <div className="flex justify-center">
            <Link
              to="/dashboard"
              className="bg-[#f38a1f] hover:bg-[#e67e22] text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#f38a1f] focus:ring-offset-2 focus:ring-offset-[#0d3b66]"
            >
              See Your Impact
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action - Enhanced design with proper links */}
      <section className="py-16 bg-white" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="cta-heading" className="text-3xl font-bold text-[#0d3b66] mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-[#084c61] mb-8">
            Join thousands of engaged citizens using transparency tools to hold government accountable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-[#0d3b66] hover:bg-[#084c61] text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:ring-offset-2"
              aria-label="Access your personal dashboard"
            >
              Access Dashboard
            </Link>
            <Link
              to="/bill-analysis"
              className="border-2 border-[#0d3b66] text-[#0d3b66] hover:bg-[#0d3b66] hover:text-white px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#0d3b66] focus:ring-offset-2"
              aria-label="Explore bill analysis tools"
            >
              Explore Analysis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
