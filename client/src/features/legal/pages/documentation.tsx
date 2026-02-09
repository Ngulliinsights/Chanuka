import React from 'react';

export default function DocumentationPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Welcome to Chanuka! This documentation will help you understand and use all the features
          of our civic engagement platform.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Core Features</h2>
        
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-2">Bills Portal</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Search, track, and analyze legislation at federal, state, and local levels.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
              <li>Advanced search with filters</li>
              <li>Real-time bill tracking</li>
              <li>Vote history and analysis</li>
              <li>Impact assessments</li>
            </ul>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-2">Community Hub</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Engage with other citizens and experts on legislative issues.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
              <li>Discussion forums</li>
              <li>Expert verification system</li>
              <li>Community voting and feedback</li>
              <li>Collaborative analysis</li>
            </ul>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-2">Universal Search</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Powerful search across all platform content with intelligent filtering.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
              <li>Natural language queries</li>
              <li>Multi-source aggregation</li>
              <li>Relevance ranking</li>
              <li>Saved searches</li>
            </ul>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-2">User Dashboard</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Personalized dashboard to manage your civic engagement activities.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300 ml-4">
              <li>Tracked bills and updates</li>
              <li>Notification preferences</li>
              <li>Activity history</li>
              <li>Saved searches and filters</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">User Guides</h2>
        
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-1">Creating an Account</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Learn how to register and set up your profile for personalized civic engagement.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-1">Tracking Legislation</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Step-by-step guide to finding, following, and analyzing bills that matter to you.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-1">Engaging with Community</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Best practices for participating in discussions and contributing to civic dialogue.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold mb-1">Expert Verification</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              How to apply for expert status and contribute authoritative analysis.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">API Documentation</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          For developers interested in integrating with Chanuka:
        </p>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            API documentation is currently in development. Contact us at{' '}
            <a href="mailto:api@chanuka.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              api@chanuka.com
            </a>{' '}
            for early access.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Accessibility</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Chanuka is committed to accessibility for all users. Our platform follows WCAG 2.1 Level AA guidelines.
          Learn more about our <a href="/legal/accessibility" className="text-blue-600 dark:text-blue-400 hover:underline">
            accessibility features and policies
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Need More Help?</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Can't find what you're looking for? Visit our{' '}
          <a href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">
            Support page
          </a>{' '}
          or contact us directly.
        </p>
      </section>
    </div>
  );
}
