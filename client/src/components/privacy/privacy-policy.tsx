import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '..\ui\card';
import { Badge } from '..\ui\badge';
import { Shield, Eye, Lock, Clock, Users, Globe } from 'lucide-react';
import { logger } from '..\..\utils\browser-logger';

export function PrivacyPolicy() {
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-xl text-gray-600">
          Your privacy is our priority. Learn how we protect and handle your data.
        </p>
        <Badge variant="outline" className="text-sm">
          Last updated: {new Date().toLocaleDateString()}
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Data Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span>What Data We Collect</span>
            </CardTitle>
            <CardDescription>
              Information we collect to provide and improve our services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Email address and name</li>
                  <li>• Profile information you provide</li>
                  <li>• Professional credentials (if verified)</li>
                  <li>• Communication preferences</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Information</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Bills you view and track</li>
                  <li>• Comments and interactions</li>
                  <li>• Search queries and preferences</li>
                  <li>• Device and browser information</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>How We Use Your Data</span>
            </CardTitle>
            <CardDescription>
              The purposes for which we process your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-green-600">Essential Services</h4>
                  <p className="text-sm text-gray-600">
                    Account management, authentication, and core platform functionality
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-600">Personalization</h4>
                  <p className="text-sm text-gray-600">
                    Customized bill recommendations and relevant content delivery
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-purple-600">Analytics</h4>
                  <p className="text-sm text-gray-600">
                    Platform improvement and usage analytics (with your consent)
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-600">Communications</h4>
                  <p className="text-sm text-gray-600">
                    Bill updates, notifications, and important platform announcements
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-red-600" />
              <span>How We Protect Your Data</span>
            </CardTitle>
            <CardDescription>
              Security measures and safeguards we implement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold">Encryption</h4>
                <p className="text-sm text-gray-600">
                  AES-256 encryption for data at rest and TLS 1.3 for data in transit
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Lock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold">Access Controls</h4>
                <p className="text-sm text-gray-600">
                  Role-based access controls and multi-factor authentication
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Eye className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold">Monitoring</h4>
                <p className="text-sm text-gray-600">
                  24/7 security monitoring and automated threat detection
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span>Data Retention</span>
            </CardTitle>
            <CardDescription>
              How long we keep different types of information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Account Data</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Kept while your account is active and for 30 days after deletion request
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Comments & Engagement</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Kept according to your preferences (default: 24 months)
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Notifications</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Automatically deleted after 90 days once read
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Audit Logs</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Kept for 12 months for security and compliance purposes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              <span>Your Privacy Rights</span>
            </CardTitle>
            <CardDescription>
              Rights you have regarding your personal data under GDPR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-blue-600">Right to Access</h4>
                  <p className="text-sm text-gray-600">
                    Request a copy of all personal data we hold about you
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-green-600">Right to Rectification</h4>
                  <p className="text-sm text-gray-600">
                    Correct inaccurate or incomplete personal information
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-red-600">Right to Erasure</h4>
                  <p className="text-sm text-gray-600">
                    Request deletion of your personal data ("right to be forgotten")
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-purple-600">Right to Portability</h4>
                  <p className="text-sm text-gray-600">
                    Receive your data in a structured, machine-readable format
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-600">Right to Object</h4>
                  <p className="text-sm text-gray-600">
                    Object to processing of your data for specific purposes
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-600">Right to Withdraw Consent</h4>
                  <p className="text-sm text-gray-600">
                    Withdraw consent for data processing at any time
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-teal-600" />
              <span>Data Sharing</span>
            </CardTitle>
            <CardDescription>
              When and how we share your information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">We DO NOT sell your data</h4>
                <p className="text-sm text-green-700">
                  We never sell, rent, or trade your personal information to third parties for commercial purposes.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Limited sharing occurs only for:</h4>
                <ul className="text-sm space-y-2 text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><strong>Service Providers:</strong> Trusted partners who help us operate the platform (with strict data protection agreements)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><strong>Public Information:</strong> Comments and profile information you choose to make public</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>
              Questions about this privacy policy or your data rights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Data Protection Officer:</strong> privacy@chanuka-platform.org
              </p>
              <p className="text-sm">
                <strong>Privacy Requests:</strong> Use the Privacy Dashboard in your account settings
              </p>
              <p className="text-sm">
                <strong>General Inquiries:</strong> support@chanuka-platform.org
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-sm text-gray-500 border-t pt-6">
        <p>
          This privacy policy is effective as of {new Date().toLocaleDateString()} and may be updated from time to time. 
          We will notify you of any material changes.
        </p>
      </div>
    </div>
  );
}