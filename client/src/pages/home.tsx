import React from 'react';

function HomePage() {
  // Data structures moved to the top for better organization and maintainability
  // This makes the component easier to modify and test
  const features = [
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
      link: '/bills',
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
      link: '/dashboard',
    },
  ];

  const stats = [
    { label: 'Bills Tracked', value: '1,247' },
    { label: 'Community Members', value: '15,834' },
    { label: 'Expert Verifications', value: '892' },
    { label: 'Transparency Score Avg', value: '72%' },
  ];

  // Shared CSS classes for consistency and maintainability
  // This reduces duplication and makes style changes easier
  const containerClasses = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";
  const primaryButtonClasses = "bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200";

  return (
    <div className="min-h-screen">
      {/* Hero Section - Enhanced with improved accessibility and performance */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20" role="banner">
        <div className={containerClasses}>
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transparent Governance Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90 leading-relaxed">
              Empowering citizens with tools to track legislation, analyze transparency, 
              and participate in democratic processes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/bills"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Explore legislative bills and proposals"
              >
                Explore Bills
              </a>
              <a
                href="/community"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Join our community of engaged citizens"
              >
                Join Community
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced with semantic HTML and better accessibility */}
      <section className="py-16 bg-white" aria-labelledby="stats-heading">
        <div className={containerClasses}>
          <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={`stat-${index}`} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2" aria-label={`${stat.value} ${stat.label}`}>
                  {stat.value}
                </div>
                <div className="text-gray-600 text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Improved interaction design and performance */}
      <section className="py-20 bg-gray-50" aria-labelledby="features-heading">
        <div className={containerClasses}>
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Platform Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools for civic engagement and government transparency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <a
                key={`feature-${index}`}
                href={feature.link}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-6 text-center group focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 block"
                aria-label={`${feature.title}: ${feature.description}`}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement - Enhanced typography and readability */}
      <section className="py-20 bg-blue-900 text-white" aria-labelledby="mission-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="mission-heading" className="text-3xl md:text-4xl font-bold mb-6">
            Our Mission
          </h2>
          <p className="text-lg md:text-xl opacity-90 leading-relaxed">
            To create transparency in legislative processes, expose conflicts of interest, 
            and empower citizens with the information and tools they need to participate 
            meaningfully in democratic governance.
          </p>
        </div>
      </section>

      {/* Call to Action - Consistent styling and improved accessibility */}
      <section className="py-16 bg-white" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="cta-heading" className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of citizens working to make government more transparent and accountable.
          </p>
          <a
            href="/dashboard"
            className={`${primaryButtonClasses} focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2`}
            aria-label="Access your personal dashboard"
          >
            Access Dashboard
          </a>
        </div>
      </section>
    </div>
  );
}

export default HomePage;