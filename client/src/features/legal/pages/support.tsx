import { Mail, MessageSquare, HelpCircle, Clock, Phone, MapPin } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Support Center</h1>
            <p className="text-xl text-blue-100">
              We're here to help you navigate Kenya's legislative landscape with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Help */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">Need Quick Help?</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Check our <a href="/help" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Help Center</a> for
              guides, tutorials, and answers to common questions about using Chanuka.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Get in Touch</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email Support */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email Support</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                For general inquiries and support requests
              </p>
              <a 
                href="mailto:support@chanuka.org" 
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                support@chanuka.org
              </a>
            </div>

            {/* Technical Support */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <HelpCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Technical Support</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                For technical issues and bug reports
              </p>
              <a 
                href="mailto:tech@chanuka.org" 
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                tech@chanuka.org
              </a>
            </div>

            {/* Phone Support */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Phone Support</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Call us during business hours (EAT)
              </p>
              <a 
                href="tel:+254712345678" 
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                +254 712 345 678
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Mon-Fri: 8:00 AM - 6:00 PM EAT
              </p>
            </div>

            {/* Community Forum */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community Forum</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Join discussions and get help from the community
              </p>
              <a 
                href="/community" 
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Visit Community Hub →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Office Location */}
      <section className="bg-gray-100 dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Visit Our Office</h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Chanuka Platform</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Westlands, Nairobi<br />
                    Kenya<br />
                    P.O. Box 12345-00100
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                    Office Hours: Monday - Friday, 8:00 AM - 6:00 PM EAT
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                <span>How do I create an account?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Click the "Sign Up" button in the navigation bar and follow the registration process.
                You'll need to provide a valid email address and create a secure password. Once registered,
                you can start tracking bills from the National Assembly, Senate, and County Assemblies.
              </p>
            </details>

            <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                <span>How do I track bills from my county?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Navigate to the Bills Portal and use the filter options to select your county. You can track
                bills from all 47 counties, the National Assembly, and the Senate. Save bills to your dashboard
                to receive notifications about updates and progress.
              </p>
            </details>

            <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                <span>Is my data secure?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Yes, we take security seriously and comply with the Kenya Data Protection Act 2019. All data
                is encrypted in transit and at rest. Read our{' '}
                <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>
                {' '}for complete details on how we protect your information.
              </p>
            </details>

            <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                <span>Can I use Chanuka in Kiswahili?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Yes! Chanuka supports both English and Kiswahili. Use the language switcher in the navigation
                menu to toggle between languages. We're committed to making civic engagement accessible to all Kenyans.
              </p>
            </details>

            <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                <span>How do I report a bug or technical issue?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Email us at{' '}
                <a href="mailto:tech@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  tech@chanuka.org
                </a>
                {' '}with a detailed description of the issue, including steps to reproduce, browser information,
                and any error messages you see. Include screenshots if possible.
              </p>
            </details>

            <details className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 group">
              <summary className="font-semibold cursor-pointer flex items-center justify-between">
                <span>How can I become a verified expert?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Visit the{' '}
                <a href="/community/expert-verification" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Expert Verification
                </a>
                {' '}page to learn about the requirements and application process. We verify legal professionals,
                policy experts, and civic leaders who can provide authoritative analysis of Kenyan legislation.
              </p>
            </details>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Can't find what you're looking for?
            </p>
            <a
              href="/help"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Visit Full Help Center
            </a>
          </div>
        </div>
      </section>

      {/* Response Times */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Response Times</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We strive to respond to all inquiries promptly:
                </p>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span><strong>Critical issues:</strong> Within 4 hours</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span><strong>Technical support:</strong> Within 24 hours</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span><strong>General inquiries:</strong> Within 48 hours</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                  Response times are based on East Africa Time (EAT) business hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
