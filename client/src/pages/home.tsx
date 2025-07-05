import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Transparent Governance Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
              Empowering citizens with tools to track legislation, analyze transparency, 
              and participate in democratic processes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/bills"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
              >
                Explore Bills
              </Link>
              <Link
                to="/community"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
              >
                Join Community
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
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

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Platform Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools for civic engagement and government transparency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 text-center group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Our Mission
          </h2>
          <p className="text-lg md:text-xl opacity-90 leading-relaxed">
            To create transparency in legislative processes, expose conflicts of interest, 
            and empower citizens with the information and tools they need to participate 
            meaningfully in democratic governance.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of citizens working to make government more transparent and accountable.
          </p>
          <Link
            to="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            Access Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;