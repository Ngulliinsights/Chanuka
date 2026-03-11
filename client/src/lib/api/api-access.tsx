import { FileText, Lock, Book, Zap, Shield, CheckCircle } from 'lucide-react';
import { useState } from 'react';

/**
 * API Access Page
 * 
 * Information about Chanuka API access and documentation
 */
export default function ApiAccessPage() {
  const [email, setEmail] = useState('');

  const features = [
    {
      title: 'RESTful API',
      description: 'Clean, intuitive REST endpoints for all legislative data',
      icon: FileText
    },
    {
      title: 'Real-time Updates',
      description: 'WebSocket support for live bill status updates',
      icon: Zap
    },
    {
      title: 'Secure Authentication',
      description: 'OAuth 2.0 and API key authentication',
      icon: Shield
    },
    {
      title: 'Comprehensive Docs',
      description: 'Detailed documentation with code examples',
      icon: Book
    }
  ];

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/bills',
      description: 'List all bills with filtering and pagination'
    },
    {
      method: 'GET',
      path: '/api/v1/bills/:id',
      description: 'Get detailed information about a specific bill'
    },
    {
      method: 'GET',
      path: '/api/v1/counties',
      description: 'List all 47 counties with legislative data'
    },
    {
      method: 'GET',
      path: '/api/v1/representatives',
      description: 'Get information about MPs and Senators'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle API key request
    console.log('API key requested for:', email);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Chanuka API</h1>
            <p className="text-xl text-blue-100 mb-8">
              Access Kenya's legislative data programmatically
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="#request-access"
                className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Request API Access
              </a>
              <a
                href="#documentation"
                className="bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors"
              >
                View Documentation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">API Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Example Endpoints */}
      <section id="documentation" className="bg-white dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">API Endpoints</h2>
            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start space-x-4">
                    <span className={`px-3 py-1 rounded text-xs font-mono font-semibold ${
                      endpoint.method === 'GET' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {endpoint.method}
                    </span>
                    <div className="flex-1">
                      <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {endpoint.path}
                      </code>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {endpoint.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Code Example */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Example Request</h3>
              <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                <pre className="text-sm text-gray-100">
                  <code>{`curl -X GET "https://api.chanuka.org/v1/bills?county=nairobi&status=active" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

// Response
{
  "data": [
    {
      "id": "bill-001",
      "title": "Nairobi City County Finance Bill 2024",
      "status": "active",
      "stage": "second_reading",
      "county": "nairobi",
      "introduced_date": "2024-01-15"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Rate Limits & Pricing</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4">Free Tier</h3>
              <div className="text-3xl font-bold text-blue-600 mb-4">KES 0</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">1,000 requests/day</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Basic endpoints</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Community support</span>
                </li>
              </ul>
              <button className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold px-4 py-2 rounded-lg">
                Current Plan
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-blue-600">
              <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                POPULAR
              </div>
              <h3 className="text-xl font-semibold mb-4">Pro</h3>
              <div className="text-3xl font-bold text-blue-600 mb-4">KES 5,000<span className="text-sm text-gray-600">/mo</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">50,000 requests/day</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">All endpoints</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">WebSocket access</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
              <button className="w-full bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Upgrade to Pro
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4">Enterprise</h3>
              <div className="text-3xl font-bold text-blue-600 mb-4">Custom</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Unlimited requests</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Custom endpoints</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">SLA guarantee</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Dedicated support</span>
                </li>
              </ul>
              <button className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Request Access */}
      <section id="request-access" className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center text-white">
            <Lock className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Request API Access</h2>
            <p className="text-blue-100 mb-8">
              Get started with the Chanuka API today. We'll send you an API key within 24 hours.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                Request Access
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
