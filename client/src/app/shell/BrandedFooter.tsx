/**
 * Branded Footer Component
 * 
 * Comprehensive footer with brand integration, navigation links,
 * and trust indicators.
 */

import { Mail, Share2 } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { ChanukaWordmark, DocumentShieldIcon } from '@client/lib/design-system';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Browse Bills', href: '/bills' },
      { label: 'Community', href: '/community' },
      { label: 'Analysis Tools', href: '/analysis' },
      { label: 'Expert Insights', href: '/expert' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'How It Works', href: '/about' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API Access', href: '/api' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press Kit', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
];

const socialLinks = [
  { icon: Share2, href: 'https://twitter.com/chanuka', label: 'Twitter' },
  { icon: Share2, href: 'https://facebook.com/chanuka', label: 'Facebook' },
  { icon: Share2, href: 'https://linkedin.com/company/chanuka', label: 'LinkedIn' },
  { icon: Share2, href: 'https://github.com/chanuka', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@chanuka.org', label: 'Email' },
];

export const BrandedFooter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-gray-900 text-gray-300 ${className}`}>
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <ChanukaWordmark size="md" className="h-8 w-auto brightness-0 invert" />
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Empowering citizens with transparent access to legislative information and civic
              engagement tools.
            </p>

            {/* Trust Indicator */}
            <div className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg">
              <DocumentShieldIcon size="sm" className="brightness-0 invert opacity-80" />
              <div>
                <p className="text-sm font-semibold text-white">Secure & Trusted</p>
                <p className="text-xs text-gray-400">256-bit encryption</p>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-gray-400">
              © {currentYear} Chanuka. All rights reserved.
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-400">
              Made with ❤️ for democracy
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 space-y-2 md:space-y-0">
            <div>
              Chanuka is a non-partisan platform dedicated to civic transparency and engagement.
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/status" className="hover:text-gray-300 transition-colors">
                System Status
              </Link>
              <span>•</span>
              <Link to="/security" className="hover:text-gray-300 transition-colors">
                Security
              </Link>
              <span>•</span>
              <Link to="/sitemap" className="hover:text-gray-300 transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BrandedFooter;
