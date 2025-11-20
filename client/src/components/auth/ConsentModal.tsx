/**
 * Consent Modal Component
 * GDPR-compliant consent collection with detailed information
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  Info, 
  Shield, 
  BarChart3, 
  Mail, 
  Share2, 
  MapPin, 
  Cookie,
  ExternalLink
} from 'lucide-react';
import { ConsentRecord } from '@client/types/auth';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consentType: ConsentRecord['consent_type'];
  onConsent: (granted: boolean) => void;
}

const consentDetails = {
  analytics: {
    title: 'Analytics & Performance',
    icon: BarChart3,
    description: 'Help us improve the platform by sharing anonymous usage data',
    whatWeCollect: [
      'Page views and navigation patterns',
      'Feature usage statistics',
      'Performance metrics (load times, errors)',
      'Device and browser information',
      'Aggregated user behavior patterns'
    ],
    whyWeNeed: [
      'Identify and fix technical issues',
      'Understand which features are most valuable',
      'Optimize platform performance',
      'Make data-driven improvements',
      'Ensure accessibility compliance'
    ],
    whoWeShare: [
      'Internal development team (anonymized)',
      'Third-party analytics services (Google Analytics, privacy-focused alternatives)',
      'Performance monitoring services'
    ],
    retention: '2 years',
    legalBasis: 'Consent (GDPR Article 6(1)(a))',
    canWithdraw: true,
  },
  marketing: {
    title: 'Marketing Communications',
    icon: Mail,
    description: 'Receive updates about new features and civic engagement opportunities',
    whatWeCollect: [
      'Email address and communication preferences',
      'Engagement with our communications',
      'Interest categories based on platform usage',
      'Subscription and unsubscription history'
    ],
    whyWeNeed: [
      'Send relevant updates about platform improvements',
      'Notify about important civic engagement opportunities',
      'Share educational content about democratic processes',
      'Announce new features that match your interests'
    ],
    whoWeShare: [
      'Email service providers (with data processing agreements)',
      'No third-party marketing companies',
      'No data brokers or advertisers'
    ],
    retention: '1 year after last interaction',
    legalBasis: 'Consent (GDPR Article 6(1)(a))',
    canWithdraw: true,
  },
  data_sharing: {
    title: 'Research Data Sharing',
    icon: Share2,
    description: 'Allow sharing of anonymized data with academic researchers',
    whatWeCollect: [
      'Anonymized civic engagement patterns',
      'Aggregated voting and participation data',
      'Demographic information (age ranges, general location)',
      'Platform usage statistics'
    ],
    whyWeNeed: [
      'Advance research on digital democracy',
      'Support academic studies on civic engagement',
      'Contribute to evidence-based policy making',
      'Help improve democratic processes'
    ],
    whoWeShare: [
      'Academic institutions with approved research projects',
      'Non-profit organizations studying democracy',
      'Government agencies for policy research (anonymized only)'
    ],
    retention: '5 years for research validity',
    legalBasis: 'Consent (GDPR Article 6(1)(a)) + Legitimate Interest for research',
    canWithdraw: true,
  },
  cookies: {
    title: 'Cookie Preferences',
    icon: Cookie,
    description: 'Manage how we use cookies to enhance your experience',
    whatWeCollect: [
      'Session identifiers for login state',
      'Preference settings (theme, language)',
      'Analytics cookies (if analytics consent given)',
      'Functional cookies for platform features'
    ],
    whyWeNeed: [
      'Keep you logged in during your session',
      'Remember your preferences and settings',
      'Provide personalized content',
      'Ensure platform security and functionality'
    ],
    whoWeShare: [
      'Essential cookies are not shared',
      'Analytics cookies shared with analytics providers',
      'No advertising or tracking cookies'
    ],
    retention: 'Varies by cookie type (session to 2 years)',
    legalBasis: 'Consent (GDPR Article 6(1)(a)) + Legitimate Interest for essential cookies',
    canWithdraw: true,
  },
  location: {
    title: 'Location Services',
    icon: MapPin,
    description: 'Use your location to show relevant local legislation and representatives',
    whatWeCollect: [
      'Approximate location (city/region level)',
      'IP address geolocation',
      'Manually entered location preferences',
      'Location-based content interactions'
    ],
    whyWeNeed: [
      'Show bills and legislation relevant to your area',
      'Connect you with your local representatives',
      'Provide location-specific civic engagement opportunities',
      'Customize content for your jurisdiction'
    ],
    whoWeShare: [
      'Location data is processed internally only',
      'Aggregated regional statistics may be shared for research',
      'No precise location data is ever shared'
    ],
    retention: 'Until consent is withdrawn',
    legalBasis: 'Consent (GDPR Article 6(1)(a))',
    canWithdraw: true,
  },
};

export function ConsentModal({ isOpen, onClose, consentType, onConsent }: ConsentModalProps) {
  const details = consentDetails[consentType];
  const IconComponent = details.icon;

  const handleAccept = () => {
    onConsent(true);
  };

  const handleDecline = () => {
    onConsent(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {details.title}
          </DialogTitle>
          <DialogDescription>
            {details.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Legal Basis */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Legal Basis:</strong> {details.legalBasis}
              {details.canWithdraw && (
                <span className="block mt-1 text-sm">
                  You can withdraw your consent at any time in your privacy settings.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* What We Collect */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              What Information We Collect
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {details.whatWeCollect.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why We Need It */}
          <div>
            <h4 className="font-medium mb-2">Why We Need This Information</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {details.whyWeNeed.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Who We Share With */}
          <div>
            <h4 className="font-medium mb-2">Who We Share This With</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {details.whoWeShare.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Retention and Rights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Data Retention</h4>
              <Badge variant="outline" className="text-sm">
                {details.retention}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium mb-2">Your Rights</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• Access your data</p>
                <p>• Correct inaccuracies</p>
                <p>• Delete your data</p>
                <p>• Withdraw consent</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              For more detailed information about our data practices, please read our{' '}
              <a 
                href="/privacy-policy" 
                className="text-blue-600 hover:underline inline-flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
              {' '}and{' '}
              <a 
                href="/cookie-policy" 
                className="text-blue-600 hover:underline inline-flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cookie Policy
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
              .
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleDecline} className="flex-1">
              Decline
            </Button>
            <Button onClick={handleAccept} className="flex-1">
              Accept
            </Button>
          </div>

          {/* Granular Control Note */}
          <p className="text-xs text-gray-500 text-center">
            You can change these preferences at any time in your privacy settings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}