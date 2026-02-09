import { Settings, Shield, CheckCircle, XCircle, FileText } from 'lucide-react';

export default function CookiePolicyPage() {
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
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Quick Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">What Are Cookies?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Cookies are small text files stored on your device when you visit our website. They help us provide
              you with a better experience by remembering your preferences and understanding how you use our platform.
              This policy explains how Chanuka uses cookies in compliance with the Kenya Data Protection Act 2019.
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2>1. Types of Cookies We Use</h2>

              <div className="space-y-6 not-prose">
                {/* Essential Cookies */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Essential Cookies (Required)</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        These cookies are necessary for the website to function and cannot be disabled.
                      </p>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li><strong>session_id:</strong> Maintains your login session (expires after 24 hours)</li>
                        <li><strong>csrf_token:</strong> Protects against cross-site request forgery attacks</li>
                        <li><strong>cookie_consent:</strong> Remembers your cookie preferences</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-3">
                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Functional Cookies (Optional)</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        These cookies enable enhanced functionality and personalization.
                      </p>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li><strong>theme_preference:</strong> Remembers your dark/light mode choice</li>
                        <li><strong>language:</strong> Stores your language preference (English/Kiswahili)</li>
                        <li><strong>dashboard_layout:</strong> Saves your dashboard customization</li>
                        <li><strong>notification_settings:</strong> Remembers your notification preferences</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-3">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Analytics Cookies (Optional)</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        These cookies help us understand how visitors use our platform.
                      </p>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li><strong>_ga:</strong> Google Analytics - tracks user sessions (expires after 2 years)</li>
                        <li><strong>_gid:</strong> Google Analytics - distinguishes users (expires after 24 hours)</li>
                        <li><strong>analytics_session:</strong> Our internal analytics (expires after 30 minutes)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-3">
                    <XCircle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Marketing Cookies (Not Used)</h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        We do not use marketing or advertising cookies. Chanuka is a civic platform focused on
                        transparency and does not engage in targeted advertising.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="mt-8">2. How We Use Cookies</h2>
              <p>We use cookies to:</p>
              <ul>
                <li>Keep you signed in to your account</li>
                <li>Remember your preferences and settings</li>
                <li>Understand how you use our platform to improve it</li>
                <li>Ensure the security of your account</li>
                <li>Provide personalized content and features</li>
                <li>Analyze usage patterns and performance</li>
              </ul>

              <h2>3. Managing Your Cookie Preferences</h2>
              
              <h3>3.1 Through Our Platform</h3>
              <p>
                You can manage your cookie preferences at any time through your account settings. Navigate to
                Settings → Privacy → Cookie Preferences to enable or disable optional cookies.
              </p>

              <h3>3.2 Through Your Browser</h3>
              <p>
                Most browsers allow you to control cookies through their settings. You can:
              </p>
              <ul>
                <li>View and delete cookies</li>
                <li>Block third-party cookies</li>
                <li>Block all cookies (may affect functionality)</li>
                <li>Clear cookies when you close your browser</li>
              </ul>
              <p>
                Learn more about cookie management:
              </p>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Microsoft Edge</a></li>
              </ul>

              <h2>4. Third-Party Cookies</h2>
              <p>
                We use limited third-party services that may set cookies:
              </p>
              <ul>
                <li><strong>Google Analytics:</strong> For usage analytics (only if you consent)</li>
                <li><strong>CDN Services:</strong> For faster content delivery</li>
              </ul>
              <p>
                These third parties have their own privacy policies. We do not control their cookies and recommend
                reviewing their policies.
              </p>

              <h2>5. Cookie Lifespan</h2>
              <p>Cookies we use have different lifespans:</p>
              <ul>
                <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Persistent Cookies:</strong> Remain until expiry date or manual deletion</li>
              </ul>
              <p>
                You can see the expiry date of each cookie in your browser's cookie management tools.
              </p>

              <h2>6. Data Protection Compliance</h2>
              <p>
                Our use of cookies complies with the Kenya Data Protection Act 2019. We:
              </p>
              <ul>
                <li>Obtain your consent before setting non-essential cookies</li>
                <li>Provide clear information about cookie purposes</li>
                <li>Allow you to withdraw consent at any time</li>
                <li>Minimize data collection to what's necessary</li>
                <li>Protect cookie data with appropriate security measures</li>
              </ul>

              <h2>7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy periodically to reflect changes in our practices or legal requirements.
                We will notify you of material changes through our platform or via email.
              </p>

              <h2>8. Contact Us</h2>
              <p>
                For questions about our use of cookies, contact us at:{' '}
                <a href="mailto:privacy@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  privacy@chanuka.org
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
              <p className="mt-4">
                <strong>Data Protection Officer:</strong><br />
                Email: <a href="mailto:dpo@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">dpo@chanuka.org</a>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
              <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
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
