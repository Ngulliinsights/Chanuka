import { Eye, Keyboard, MessageSquare, Smartphone, Mail, AlertCircle } from 'lucide-react';

export default function AccessibilityPage() {
  const lastUpdated = 'January 15, 2024';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Accessibility Statement</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Commitment Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Chanuka is committed to ensuring digital accessibility for all Kenyans, including persons with
              disabilities. We continuously work to improve the accessibility and usability of our platform to
              ensure that everyone can participate in Kenya's democratic processes.
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2>1. Accessibility Standards</h2>
              <p>
                Chanuka strives to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.
                These guidelines explain how to make web content more accessible for people with disabilities and
                improve usability for all users.
              </p>

              <h2>2. Accessibility Features</h2>
              
              <div className="space-y-6 not-prose">
                {/* Keyboard Navigation */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Keyboard Navigation</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        Our platform is fully navigable using only a keyboard:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <li>• Tab key to move forward through interactive elements</li>
                        <li>• Shift + Tab to move backward</li>
                        <li>• Enter or Space to activate buttons and links</li>
                        <li>• Arrow keys for dropdown menus and lists</li>
                        <li>• Escape key to close dialogs and menus</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Screen Reader Support */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Screen Reader Compatibility</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        We've tested our platform with popular screen readers:
                      </p>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <li>• NVDA (Windows)</li>
                        <li>• JAWS (Windows)</li>
                        <li>• VoiceOver (macOS, iOS)</li>
                        <li>• TalkBack (Android)</li>
                      </ul>
                      <p className="text-gray-700 dark:text-gray-300 mt-3">
                        All images include descriptive alt text, and interactive elements have appropriate ARIA labels.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Accessibility */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <Eye className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Visual Accessibility</h3>
                      <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Color Contrast:</strong> All text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)</li>
                        <li><strong>Dark Mode:</strong> Full dark mode support for reduced eye strain</li>
                        <li><strong>Resizable Text:</strong> Text can be resized up to 200% without loss of functionality</li>
                        <li><strong>Focus Indicators:</strong> Clear visual indicators for keyboard focus</li>
                        <li><strong>No Color-Only Information:</strong> Information is never conveyed by color alone</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Mobile Accessibility */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Mobile Accessibility</h3>
                      <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                        <li><strong>Touch Targets:</strong> All interactive elements are at least 44x44 pixels</li>
                        <li><strong>Responsive Design:</strong> Fully functional on all screen sizes</li>
                        <li><strong>Gesture Alternatives:</strong> All gestures have button alternatives</li>
                        <li><strong>Screen Reader Support:</strong> Compatible with mobile screen readers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="mt-8">3. Language Support</h2>
              <p>
                Chanuka supports both English and Kiswahili to ensure accessibility for all Kenyans. You can switch
                languages at any time using the language selector in the navigation menu.
              </p>

              <h2>4. Document Accessibility</h2>
              <p>
                We strive to make all documents accessible:
              </p>
              <ul>
                <li>PDFs include proper tagging and structure</li>
                <li>Alternative formats available upon request</li>
                <li>Legislative documents include plain language summaries</li>
                <li>Complex data visualizations include text alternatives</li>
              </ul>

              <h2>5. Known Limitations</h2>
              <p>
                Despite our best efforts, some limitations may exist:
              </p>
              <ul>
                <li>Some third-party embedded content may not be fully accessible</li>
                <li>Historical legislative documents may not meet current accessibility standards</li>
                <li>Complex data visualizations may require additional context</li>
              </ul>
              <p>
                We are actively working to address these limitations. If you encounter accessibility barriers,
                please let us know.
              </p>

              <h2>6. Assistive Technologies</h2>
              <p>
                Chanuka is designed to work with:
              </p>
              <ul>
                <li>Screen readers (NVDA, JAWS, VoiceOver, TalkBack)</li>
                <li>Screen magnification software</li>
                <li>Speech recognition software</li>
                <li>Alternative input devices</li>
                <li>Browser accessibility features</li>
              </ul>

              <h2>7. Ongoing Improvements</h2>
              <p>
                We continuously work to improve accessibility:
              </p>
              <ul>
                <li>Regular accessibility audits using automated and manual testing</li>
                <li>User testing with persons with disabilities</li>
                <li>Staff training on accessibility best practices</li>
                <li>Incorporating accessibility into our development process</li>
                <li>Monitoring and addressing user feedback</li>
              </ul>

              <h2>8. Feedback and Contact</h2>
              <p>
                We welcome your feedback on the accessibility of Chanuka. If you encounter accessibility barriers
                or have suggestions for improvement, please contact us:
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 my-6 not-prose">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold mb-2">Accessibility Coordinator</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Email: <a href="mailto:accessibility@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">accessibility@chanuka.org</a><br />
                      Phone: <a href="tel:+254712345678" className="text-blue-600 dark:text-blue-400 hover:underline">+254 712 345 678</a><br />
                      Address: Chanuka Platform, Westlands, Nairobi, Kenya<br />
                      P.O. Box 12345-00100
                    </p>
                  </div>
                </div>
              </div>

              <p>
                We aim to respond to accessibility feedback within 5 business days and will work with you to
                provide the information or service you need in an accessible format.
              </p>

              <h2>9. Legal Framework</h2>
              <p>
                Our accessibility commitment aligns with:
              </p>
              <ul>
                <li>Constitution of Kenya 2010 (Article 54 - Persons with Disabilities)</li>
                <li>Persons with Disabilities Act, 2003</li>
                <li>Kenya Data Protection Act 2019</li>
                <li>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</li>
              </ul>

              <h2>10. Third-Party Content</h2>
              <p>
                Some content on Chanuka comes from third-party sources (e.g., government databases, embedded videos).
                While we cannot control the accessibility of third-party content, we:
              </p>
              <ul>
                <li>Choose accessible third-party services when possible</li>
                <li>Provide alternative ways to access information</li>
                <li>Work with partners to improve accessibility</li>
                <li>Clearly label third-party content</li>
              </ul>

              <h2>11. Formal Complaints</h2>
              <p>
                If you are not satisfied with our response to your accessibility concern, you may file a formal
                complaint with:
              </p>
              <p>
                <strong>National Council for Persons with Disabilities</strong><br />
                Website: <a href="https://www.ncpwd.go.ke" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">www.ncpwd.go.ke</a><br />
                Email: <a href="mailto:info@ncpwd.go.ke" className="text-blue-600 dark:text-blue-400 hover:underline">info@ncpwd.go.ke</a>
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
              <a href="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">
                Cookie Policy
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
