import React from 'react';
import { Shield, Lock, Eye, Database, User, FileText } from 'lucide-react';

export default function PrivacyPage() {
  const lastUpdated = 'January 15, 2024';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Quick Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Privacy at a Glance</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start space-x-2">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Data Encryption</p>
                  <p className="text-gray-600 dark:text-gray-400">All data encrypted in transit and at rest</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No Selling</p>
                  <p className="text-gray-600 dark:text-gray-400">We never sell your personal data</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Your Control</p>
                  <p className="text-gray-600 dark:text-gray-400">Access, export, or delete your data anytime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h2>1. Information We Collect</h2>
              
              <h3>1.1 Information You Provide</h3>
              <ul>
                <li><strong>Account Information:</strong> Email address, username, password</li>
                <li><strong>Profile Information:</strong> Name, bio, avatar (optional)</li>
                <li><strong>User Content:</strong> Comments, analysis, saved bills, preferences</li>
                <li><strong>Communications:</strong> Messages sent through our platform</li>
              </ul>

              <h3>1.2 Automatically Collected Information</h3>
              <ul>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
                <li><strong>Cookies:</strong> See our <a href="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">Cookie Policy</a></li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Provide and improve our services</li>
                <li>Personalize your experience</li>
                <li>Send notifications about bills you're tracking</li>
                <li>Communicate important updates</li>
                <li>Analyze usage patterns to improve the platform</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2>3. Information Sharing</h2>
              <p>We do not sell your personal information. We may share information with:</p>
              
              <h3>3.1 Service Providers</h3>
              <p>
                Third-party vendors who help us operate the platform (hosting, analytics, email delivery).
                These providers are contractually obligated to protect your data.
              </p>

              <h3>3.2 Legal Requirements</h3>
              <p>
                When required by law, court order, or to protect our rights and safety.
              </p>

              <h3>3.3 Public Information</h3>
              <p>
                Content you choose to make public (comments, analysis) is visible to other users.
              </p>

              <h2>4. Data Security</h2>
              <p>We implement industry-standard security measures:</p>
              <ul>
                <li>256-bit SSL/TLS encryption for data in transit</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Multi-factor authentication options</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Regular backups and disaster recovery procedures</li>
              </ul>

              <h2>5. Your Rights and Choices</h2>
              
              <h3>5.1 Access and Portability</h3>
              <p>You can access and export your data at any time through your account settings.</p>

              <h3>5.2 Correction and Deletion</h3>
              <p>You can update or delete your information through your account settings or by contacting us.</p>

              <h3>5.3 Communication Preferences</h3>
              <p>Control email notifications and alerts in your account settings.</p>

              <h3>5.4 Cookie Management</h3>
              <p>Manage cookie preferences through your browser settings or our cookie consent tool.</p>

              <h2>6. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide services.
                After account deletion, we may retain certain information for legal compliance, fraud prevention,
                and legitimate business purposes.
              </p>

              <h2>7. Children's Privacy</h2>
              <p>
                Our Service is not directed to children under 13. We do not knowingly collect information from
                children under 13. If you believe we have collected such information, please contact us immediately.
              </p>

              <h2>8. Legal Basis for Processing</h2>
              <p>
                Under the Kenya Data Protection Act 2019, we process your personal data based on the following legal grounds:
              </p>
              <ul>
                <li><strong>Consent:</strong> You have given clear consent for us to process your personal data for specific purposes</li>
                <li><strong>Contract:</strong> Processing is necessary for the performance of our service agreement with you</li>
                <li><strong>Legal Obligation:</strong> Processing is necessary to comply with Kenyan law</li>
                <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate interests (e.g., fraud prevention, security)</li>
              </ul>

              <h2>9. Kenya Data Protection Rights</h2>
              <p>Under the Kenya Data Protection Act 2019, you have the following rights:</p>
              <ul>
                <li><strong>Right to Access:</strong> Request access to your personal data we hold</li>
                <li><strong>Right to Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Right to Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, commonly used format</li>
                <li><strong>Right to Restrict Processing:</strong> Request restriction of processing in certain circumstances</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
                <li><strong>Right to Lodge a Complaint:</strong> Lodge a complaint with the Office of the Data Protection Commissioner</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  privacy@chanuka.org
                </a>
                {' '}or the Office of the Data Protection Commissioner at{' '}
                <a href="https://www.odpc.go.ke" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  www.odpc.go.ke
                </a>
              </p>

              <h2>10. Cross-Border Data Transfers</h2>
              <p>
                Your information is primarily stored and processed in Kenya. If we transfer data outside Kenya, we
                ensure appropriate safeguards are in place as required by the Kenya Data Protection Act 2019, including
                data transfer agreements and ensuring adequate data protection standards in the receiving country.
              </p>

              <h2>11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of material changes via email
                or through the Service. Your continued use after changes constitutes acceptance.
              </p>

              <h2>12. Data Protection Officer</h2>
              <p>
                We have appointed a Data Protection Officer (DPO) as required by the Kenya Data Protection Act 2019.
                For data protection inquiries, contact our DPO at:{' '}
                <a href="mailto:dpo@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  dpo@chanuka.org
                </a>
              </p>

              <h2>13. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact us at:{' '}
                <a href="mailto:privacy@chanuka.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  privacy@chanuka.org
                </a>
              </p>
              <p className="mt-4">
                Or write to us at:<br />
                Chanuka Privacy Team<br />
                Westlands, Nairobi<br />
                Kenya<br />
                P.O. Box 12345-00100<br />
                Phone: <a href="tel:+254712345678" className="text-blue-600 dark:text-blue-400 hover:underline">+254 712 345 678</a>
              </p>
              <p className="mt-4">
                <strong>Office of the Data Protection Commissioner:</strong><br />
                Website: <a href="https://www.odpc.go.ke" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">www.odpc.go.ke</a><br />
                Email: <a href="mailto:info@odpc.go.ke" className="text-blue-600 dark:text-blue-400 hover:underline">info@odpc.go.ke</a>
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </a>
              <a href="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">
                Cookie Policy
              </a>
              <a href="/security" className="text-blue-600 dark:text-blue-400 hover:underline">
                Security
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
