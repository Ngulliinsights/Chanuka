import { FileText, Users, BookOpen, Shield, Building, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Sitemap Page
 * 
 * Hierarchical site navigation map
 */
export default function SitemapPage() {
  const sections = [
    {
      title: 'Platform',
      icon: FileText,
      links: [
        { label: 'Home', href: '/' },
        { label: 'Browse Bills', href: '/bills' },
        { label: 'Search', href: '/search' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analysis Tools', href: '/analysis' },
      ]
    },
    {
      title: 'Community',
      icon: Users,
      links: [
        { label: 'Community Hub', href: '/community' },
        { label: 'Expert Verification', href: '/community/expert-verification' },
        { label: 'Expert Insights', href: '/expert' },
      ]
    },
    {
      title: 'Education',
      icon: BookOpen,
      links: [
        { label: 'Civic Education', href: '/civic-education' },
        { label: 'Documentation', href: '/documentation' },
        { label: 'Blog', href: '/blog' },
        { label: 'API Access', href: '/api' },
      ]
    },
    {
      title: 'Legal',
      icon: Shield,
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
        { label: 'Accessibility', href: '/accessibility' },
      ]
    },
    {
      title: 'Company',
      icon: Building,
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: 'Press Kit', href: '/press' },
        { label: 'Contact', href: '/contact' },
      ]
    },
    {
      title: 'Support',
      icon: Mail,
      links: [
        { label: 'Support Center', href: '/support' },
        { label: 'System Status', href: '/status' },
        { label: 'Security', href: '/security' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Sitemap</h1>
            <p className="text-xl text-blue-100">
              Navigate all pages and features of the Chanuka platform
            </p>
          </div>
        </div>
      </section>

      {/* Sitemap Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                  </div>
                  <ul className="space-y-2">
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link
                          to={link.href}
                          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Last Updated */}
      <section className="container mx-auto px-4 pb-12">
        <div className="max-w-6xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </section>
    </div>
  );
}
