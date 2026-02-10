/**
 * Dashboard Footer Component
 *
 * Footer with branding, links, and additional information
 */

import React from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@client/lib/design-system';
import type { DashboardConfig } from '@client/lib/types/dashboard';

interface DashboardFooterProps {
  /** Dashboard configuration */
  config: DashboardConfig;
  /** Custom footer content */
  content?: React.ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * Dashboard Footer Component with memo optimization
 */
import { Globe } from 'lucide-react';
import { ChanukaLogo } from '@client/lib/design-system/media/ChanukaLogo';

const navigation = {
  solutions: [
    { name: 'Bill Tracking', href: '/bills' },
    { name: 'Analysis', href: '/analysis' },
    { name: 'Representatives', href: '/representatives' },
    { name: 'Insights', href: '/insights' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'API Status', href: '/status' },
    { name: 'Contact Us', href: '/contact' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Partners', href: '/partners' },
    { name: 'Careers', href: '/careers' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
    { name: 'Accessibility', href: '/accessibility' },
  ],
  social: [
    { name: 'Social', href: '#', icon: Globe },
  ],
};

/**
 * Dashboard Footer Component with memo optimization
 */
const DashboardFooterComponent = ({ config, content, className }: DashboardFooterProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <footer className="bg-[#1a2e49] text-white border-t border-[#f29b06]/20 mt-auto">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:py-12 lg:px-8">
        {/* Mobile: Collapsible Footer */}
        <div className="lg:hidden">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ChanukaLogo size={32} variant="white" showWordmark={true} />
            </div>
            <p className="text-sm leading-6 text-gray-300">
              Empowering citizens with transparent legislative tracking.
            </p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-[#f29b06] hover:text-[#f29b06]/80 transition-colors"
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Show Less' : 'Show More Links'}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-6 space-y-6">
              {[
                { title: 'Solutions', items: navigation.solutions },
                { title: 'Support', items: navigation.support },
                { title: 'Company', items: navigation.company },
                { title: 'Legal', items: navigation.legal },
              ].map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-semibold text-[#f29b06] mb-3">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.name}>
                        <Link to={item.href} className="text-sm text-gray-300 hover:text-white transition-colors">
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: Full Footer */}
        <div className="hidden lg:block">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ChanukaLogo size={40} variant="white" showWordmark={true} />
              </div>
              <p className="text-sm leading-6 text-gray-300">
                Empowering citizens with transparent legislative tracking and analysis.
              </p>
              <div className="flex space-x-6">
                {navigation.social.map((item) => (
                  <a key={item.name} href={item.href} className="text-gray-400 hover:text-[#f29b06] transition-colors">
                    <span className="sr-only">{item.name}</span>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
            <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-[#f29b06]">Solutions</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.solutions.map((item) => (
                      <li key={item.name}>
                        <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white transition-colors">
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-[#f29b06]">Support</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.support.map((item) => (
                      <li key={item.name}>
                        <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white transition-colors">
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold leading-6 text-[#f29b06]">Company</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.company.map((item) => (
                      <li key={item.name}>
                        <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white transition-colors">
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 md:mt-0">
                  <h3 className="text-sm font-semibold leading-6 text-[#f29b06]">Legal</h3>
                  <ul role="list" className="mt-6 space-y-4">
                    {navigation.legal.map((item) => (
                      <li key={item.name}>
                        <Link to={item.href} className="text-sm leading-6 text-gray-300 hover:text-white transition-colors">
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 lg:mt-16 lg:pt-8">
          <p className="text-xs leading-5 text-gray-400">
            &copy; {new Date().getFullYear()} Chanuka. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

 
export const DashboardFooter = React.memo(DashboardFooterComponent);
