import React from 'react';
import { Shield, FileText, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  const lastUpdated = 'January 15, 2024';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold mb-1">Important Notice</p>
                <p>
                  By accessing and using Chanuka, you agree to be bound by these Terms of Service.
                  Please read them carefully before using our platform.
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Chanuka platform ("Service"), you agree to comply with and be bound by these
                Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                Chanuka provides a platform for accessing Kenyan legislative information, tracking bills from the
                National Assembly, Senate, and County Assemblies, and engaging in civic discourse. We aggregate
                publicly available legislative data from Kenya's 47 counties and provide tools for analysis and
                community engagement in accordance with the Constitution of Kenya 2010.
              </p>

              <h2>3. User Accounts</h2>
              <h3>3.1 Account Creation</h3>
              <p>
                To access certain features, you may need to create an account. You must provide accurate, current, and
                complete information during registration and keep your account information updated.
              </p>
              <h3>3.2 Account Security</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all
                activities that occur under your account. Notify us immediately of any unauthorized use.
              </p>

              <h2>4. User Conduct</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Post false, misleading, or defamatory content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems to access the Service without permission</li>
              </ul>

              <h2>5. Content and Intellectual Property</h2>
              <h3>5.1 Our Content</h3>
              <p>
                The Service and its original content, features, and functionality are owned by Chanuka and are
                protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <h3>5.2 User Content</h3>
              <p>
                You retain ownership of content you post on the Service. By posting content, you grant us a
                non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in
                connection with the Service.
              </p>

              <h2>6. Legislative Data</h2>
              <p>
                Legislative information provided through our Service is sourced from publicly available Kenyan
                government databases, including the National Assembly, Senate, and County Assembly records. While we
                strive for accuracy, we do not guarantee the completeness or accuracy of this information. Always
                verify critical information with official government sources such as the Kenya Law Reports (eKLR) and
                official parliamentary websites.
              </p>

              <h2>7. Privacy</h2>
              <p>
                Your use of the Service is also governed by our{' '}
                <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </a>
                . Please review it to understand our data practices.
              </p>

              <h2>8. Disclaimers</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
                IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHANUKA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
              </p>

              <h2>10. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account and access to the Service at our sole
                discretion, without notice, for conduct that we believe violates these Terms or is harmful to other
                users, us, or third parties, or for any other reason.
              </p>

              <h2>11. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify users of material changes via email or through
                the Service. Your continued use of the Service after changes constitutes acceptance of the modified
                Terms.
              </p>

              <h2>12. Governing Law and Jurisdiction</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the Laws of Kenya, including but not
                limited to the Constitution of Kenya 2010 and the Kenya Data Protection Act 2019. Any disputes arising
                from these Terms shall be subject to the exclusive jurisdiction of the courts of Kenya.
              </p>

              <h2>13. Data Protection Compliance</h2>
              <p>
                We are committed to compliance with the Kenya Data Protection Act 2019. For data protection inquiries,
                you may contact the Office of the Data Protection Commissioner at{' '}
                <a href="https://www.odpc.go.ke" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  www.odpc.go.ke
                </a>
              </p>

              <h2>14. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at:{' '}
                <a href="mailto:legal@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  legal@chanuka.org
                </a>
              </p>
              <p className="mt-4">
                Or write to us at:<br />
                Chanuka Platform<br />
                Westlands, Nairobi<br />
                Kenya<br />
                P.O. Box 12345-00100<br />
                Phone: <a href="tel:+254712345678" className="text-blue-600 dark:text-blue-400 hover:underline">+254 712 345 678</a>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
              <a href="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">
                Cookie Policy
              </a>
              <a href="/accessibility" className="text-blue-600 dark:text-blue-400 hover:underline">
                Accessibility
              </a>
              <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
