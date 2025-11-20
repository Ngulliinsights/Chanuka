# Implementation Guide: Codebase Structure Improvements
## Step-by-Step Instructions for Implementing Audit Recommendations

This guide provides detailed implementation steps for the recommendations in the Codebase Structure Audit Report.

---

## Phase 1: Critical Fixes (High Priority)

### Task 1.1: Create Missing Legal Pages

#### Step 1: Create About Page

```typescript
// client/src/pages/about.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, FileText, Globe, Heart, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import AppLayout from '../components/layout/app-layout';

export default function AboutPage() {
  const values = [
    {
      icon: Shield,
      title: 'Transparency',
      description: 'Making government processes visible and understandable to all citizens.',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Empowering citizens to engage meaningfully with democratic processes.',
    },
    {
      icon: FileText,
      title: 'Accuracy',
      description: 'Providing verified, fact-based information about legislation.',
    },
    {
      icon: Globe,
      title: 'Accessibility',
      description: 'Ensuring all Kenyans can participate regardless of technical ability.',
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Shield className="mx-auto h-16 w-16 text-blue-600 mb-6" />
          <h1 className="text-5xl font-bold mb-4">About Chanuka Platform</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Empowering Kenyan citizens with transparent access to legislative information
            and democratic engagement tools.
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-12">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-3xl">Our Mission</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-lg">
            <p>
              The Chanuka Platform was created to bridge the gap between citizens and their
              government by providing accessible, comprehensive tools for understanding and
              engaging with legislative processes.
            </p>
            <p>
              We believe that democracy thrives when citizens are informed, engaged, and
              empowered. Our platform makes complex legislative information understandable,
              tracks implementation of passed laws, and detects workarounds that may undermine
              democratic intent.
            </p>
          </CardContent>
        </Card>

        {/* Values Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Our Core Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index}>
                  <CardHeader>
                    <Icon className="h-8 w-8 text-blue-600 mb-2" />
                    <CardTitle>{value.title}</CardTitle>
                    <CardDescription className="text-base">
                      {value.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* What We Do */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-3xl">What We Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Legislative Tracking
              </h3>
              <p className="text-gray-600">
                We track all bills introduced in Parliament, providing real-time updates,
                summaries, and analysis in plain language that every Kenyan can understand.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Implementation Monitoring
              </h3>
              <p className="text-gray-600">
                Beyond tracking legislation, we monitor how laws are actually implemented,
                identifying discrepancies and workarounds that may undermine their intent.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Community Engagement
              </h3>
              <p className="text-gray-600">
                Our platform facilitates meaningful civic engagement through discussions,
                expert analysis, and tools for contacting representatives.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technology */}
        <Card className="mb-12 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="text-3xl">Built with Modern Technology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              The Chanuka Platform leverages cutting-edge web technologies to provide a fast,
              reliable, and accessible experience:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Real-time updates through WebSocket connections</li>
              <li>Advanced search and filtering capabilities</li>
              <li>Mobile-responsive design for access anywhere</li>
              <li>Accessibility features for users with disabilities</li>
              <li>Secure authentication and data protection</li>
            </ul>
          </CardContent>
        </Card>

        {/* Team */}
        <Card className="mb-12">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-6 w-6 text-red-500" />
              <CardTitle className="text-3xl">Our Team</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-gray-600 mb-4">
              Chanuka Platform is built and maintained by a dedicated team of developers,
              civic technologists, legal experts, and democracy advocates committed to
              strengthening Kenya's democratic institutions.
            </p>
            <p className="text-gray-600">
              We are proud to be a non-partisan, independent platform serving all Kenyans
              regardless of political affiliation.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Join Us in Strengthening Democracy</h2>
          <p className="text-xl mb-8 opacity-90">
            Create an account to start tracking bills, engaging with your community,
            and making your voice heard.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth?mode=register">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
```

#### Step 2: Create Terms of Service Page

```typescript
// client/src/pages/terms.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import AppLayout from '../components/layout/app-layout';

export default function TermsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <FileText className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold mb-2 text-center">Terms of Service</h1>
          <p className="text-center text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Alert className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please read these terms carefully before using the Chanuka Platform.
            By accessing or using our service, you agree to be bound by these terms.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              By accessing and using the Chanuka Platform ("the Service"), you accept and
              agree to be bound by the terms and provision of this agreement.
            </p>
            <p>
              If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              The Chanuka Platform provides citizens with tools to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access and track legislative information</li>
              <li>Analyze bills and their potential impacts</li>
              <li>Engage with community discussions</li>
              <li>Monitor implementation of passed legislation</li>
              <li>Contact representatives and take civic action</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              <strong>3.1 Account Creation:</strong> To access certain features, you must
              create an account. You agree to provide accurate, current, and complete
              information during registration.
            </p>
            <p>
              <strong>3.2 Account Security:</strong> You are responsible for maintaining
              the confidentiality of your account credentials and for all activities that
              occur under your account.
            </p>
            <p>
              <strong>3.3 Account Termination:</strong> We reserve the right to suspend
              or terminate accounts that violate these terms or engage in prohibited conduct.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. User Conduct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Post false, misleading, or defamatory content</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use the Service for any illegal purpose</li>
              <li>Spam or post unsolicited commercial content</li>
              <li>Impersonate others or misrepresent your identity</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Content and Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              <strong>5.1 User Content:</strong> You retain ownership of content you post.
              By posting, you grant us a non-exclusive license to use, modify, and display
              your content in connection with the Service.
            </p>
            <p>
              <strong>5.2 Platform Content:</strong> All platform content, design, and
              functionality are owned by Chanuka Platform and protected by intellectual
              property laws.
            </p>
            <p>
              <strong>5.3 Legislative Data:</strong> Legislative information is in the
              public domain. Our analysis and presentation are original works.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              Your use of the Service is also governed by our{' '}
              <Link to="/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal information.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Disclaimers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              <strong>7.1 Information Accuracy:</strong> We strive for accuracy but cannot
              guarantee that all information is complete, current, or error-free. Always
              verify critical information with official sources.
            </p>
            <p>
              <strong>7.2 No Legal Advice:</strong> The Service provides information and
              analysis but does not constitute legal advice. Consult qualified professionals
              for legal matters.
            </p>
            <p>
              <strong>7.3 Service Availability:</strong> We do not guarantee uninterrupted
              or error-free service and may modify or discontinue features without notice.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              To the maximum extent permitted by law, Chanuka Platform shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages
              arising from your use of the Service.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We reserve the right to modify these terms at any time. We will notify users
              of significant changes via email or platform notification. Continued use after
              changes constitutes acceptance of new terms.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              These Terms shall be governed by and construed in accordance with the laws
              of the Republic of Kenya, without regard to conflict of law provisions.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>11. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              For questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Email:</strong> legal@chanukaplatform.ke</p>
              <p><strong>Address:</strong> [Your Physical Address]</p>
            </div>
            <p>
              You can also visit our{' '}
              <Link to="/contact" className="text-blue-600 hover:underline">
                Contact Page
              </Link>
              {' '}for more information.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Chanuka Platform. All rights reserved.</p>
        </div>
      </div>
    </AppLayout>
  );
}
```

#### Step 3: Create Privacy Policy Page

```typescript
// client/src/pages/privacy-policy.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import AppLayout from '../components/layout/app-layout';

export default function PrivacyPolicyPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold mb-2 text-center">Privacy Policy</h1>
          <p className="text-center text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Alert className="mb-8">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your privacy is important to us. This policy explains how we collect, use,
            and protect your personal information.
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>1. Information We Collect</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">1.1 Information You Provide</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Account registration information (name, email, password)</li>
                <li>Profile information (optional bio, location, interests)</li>
                <li>Content you post (comments, discussions, feedback)</li>
                <li>Communication with us (support requests, feedback)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">1.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Device information (browser type, operating system)</li>
                <li>IP address and general location</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <CardTitle>2. How We Use Your Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and maintain the Service</li>
              <li>Personalize your experience</li>
              <li>Send notifications about bills you're tracking</li>
              <li>Improve our platform and develop new features</li>
              <li>Prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
              <li>Communicate with you about updates and features</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <CardTitle>3. Information Sharing</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              <strong>We do NOT sell your personal information.</strong>
            </p>
            <p>We may share information with:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Service Providers:</strong> Third parties who help us operate the platform</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
              <li><strong>Public Content:</strong> Comments and discussions you post publicly</li>
              <li><strong>Aggregated Data:</strong> Anonymous, aggregated statistics for research</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              <CardTitle>4. Data Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>We implement industry-standard security measures:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Encrypted storage of sensitive information</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Secure password hashing (bcrypt)</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the internet is 100% secure.
              We cannot guarantee absolute security.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Your Privacy Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate information</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Export your data in a standard format</li>
              <li><strong>Objection:</strong> Object to certain data processing</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, visit your{' '}
              <Link to="/account?tab=privacy" className="text-blue-600 hover:underline">
                Privacy Settings
              </Link>
              {' '}or contact us.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>We use cookies for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the platform</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings, but this may affect
              platform functionality.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We retain your information for as long as your account is active or as needed
              to provide services. When you delete your account:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Personal information is deleted within 30 days</li>
              <li>Public content may remain (anonymized)</li>
              <li>Some data retained for legal compliance (e.g., audit logs)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>Our platform may link to third-party services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>OAuth providers (Google) for authentication</li>
              <li>Analytics services</li>
              <li>External legislative databases</li>
            </ul>
            <p className="mt-4">
              These services have their own privacy policies. We are not responsible for
              their practices.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              The Service is not intended for children under 13. We do not knowingly collect
              personal information from children. If we discover such collection, we will
              delete it promptly.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. International Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              The Service is operated in Kenya. If you access from other countries, your
              information may be transferred to and processed in Kenya. By using the Service,
              you consent to this transfer.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>11. Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes via email or platform notification. Your continued use
              after changes constitutes acceptance.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>12. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-700">
            <p>
              For questions about this Privacy Policy or to exercise your rights:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Email:</strong> privacy@chanukaplatform.ke</p>
              <p><strong>Data Protection Officer:</strong> dpo@chanukaplatform.ke</p>
              <p><strong>Address:</strong> [Your Physical Address]</p>
            </div>
            <p>
              You can also visit our{' '}
              <Link to="/contact" className="text-blue-600 hover:underline">
                Contact Page
              </Link>.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Chanuka Platform. All rights reserved.</p>
        </div>
      </div>
    </AppLayout>
  );
}
```

#### Step 4: Create Contact Page

```typescript
// client/src/pages/contact.tsx
import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import AppLayout from '../components/layout/app-layout';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
    setFormData({ name: '', email: '', subject: '', message: '' });

    // Reset success message after 5 seconds
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email',
      value: 'support@chanukaplatform.ke',
      description: 'Send us an email anytime',
      link: 'mailto:support@chanukaplatform.ke',
    },
    {
      icon: Phone,
      title: 'Phone',
      value: '+254 XXX XXX XXX',
      description: 'Mon-Fri from 8am to 5pm',
      link: 'tel:+254XXXXXXXXX',
    },
    {
      icon: MapPin,
      title: 'Office',
      value: 'Nairobi, Kenya',
      description: '[Your physical address]',
      link: null,
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <MessageSquare className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question, feedback, or need support? We're here to help.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            return (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <CardTitle>{method.title}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {method.link ? (
                    <a
                      href={method.link}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {method.value}
                    </a>
                  ) : (
                    <p className="font-medium text-gray-700">{method.value}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send Us a Message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Thank you for your message! We'll respond within 24-48 hours.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ / Help Topics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Help</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">General Inquiries</h3>
                  <p className="text-sm text-gray-600">
                    Questions about the platform, features, or how to use specific tools.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Technical Support</h3>
                  <p className="text-sm text-gray-600">
                    Issues with your account, bugs, or technical difficulties.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Media & Press</h3>
                  <p className="text-sm text-gray-600">
                    Media inquiries, interviews, or partnership opportunities.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Data Requests</h3>
                  <p className="text-sm text-gray-600">
                    GDPR requests, data export, or privacy-related inquiries.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle>Office Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Monday - Friday:</span>
                    <span>8:00 AM - 5:00 PM EAT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Saturday:</span>
                    <span>9:00 AM - 1:00 PM EAT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sunday:</span>
                    <span>Closed</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-4">
                    * Email support available 24/7. We aim to respond within 24-48 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
```

### Task 1.2: Create Error Pages

#### Error 403 Page

```typescript
// client/src/pages/error-403.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Error403() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-4 rounded-full">
              <ShieldAlert className="h-16 w-16 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900">
            403 - Access Forbidden
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            You don't have permission to access this resource.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">
              Why am I seeing this?
            </h3>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>You may not be logged in</li>
              <li>Your account doesn't have the required permissions</li>
              <li>This resource is restricted to specific user roles</li>
              <li>Your session may have expired</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">What can I do?</h3>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>

              <Button asChild className="w-full justify-start">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/auth">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Log In
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/contact">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            Need help? Contact us at{' '}
            <a href="mailto:support@chanukaplatform.ke" className="text-blue-600 hover:underline">
              support@chanukaplatform.ke
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Error 500 Page

```typescript
// client/src/pages/error-500.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ServerCrash, Home, RefreshCw, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function Error500() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-100 p-4 rounded-full">
              <ServerCrash className="h-16 w-16 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900">
            500 - Server Error
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Something went wrong on our end. We're working to fix it.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Our team has been automatically notified of this error and is investigating.
            </AlertDescription>
          </Alert>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">
              What happened?
            </h3>
            <p className="text-sm text-orange-800">
              An unexpected error occurred on our server while processing your request.
              This is not your fault - it's an issue on our end that we need to fix.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">What can I do?</h3>
            <div className="grid gap-3">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>

              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </Link>
              </Button>

              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to="/contact">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">
              If the problem persists:
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Try again in a few minutes</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try using a different browser</li>
              <li>Contact our support team with details about what you were doing</li>
            </ul>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            Error reference: {new Date().getTime()}-500
            <br />
            Contact:{' '}
            <a href="mailto:support@chanukaplatform.ke" className="text-blue-600 hover:underline">
              support@chanukaplatform.ke
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Error 503 Page

```typescript
// client/src/pages/error-503.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Home, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';

export default function Error503() {
  const [countdown, setCountdown] = useState(60);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
      setProgress(prev => Math.min(prev + (100 / 60), 100));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Wrench className="h-16 w-16 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900">
            503 - Service Unavailable
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            We're currently performing scheduled maintenance.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              The platform will be back online shortly. Auto-refreshing in {countdown} seconds...
            </AlertDescription>
          </Alert>

          <div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Maintenance in Progress
            </h3>
            <p className="text-sm text-yellow-800 mb-3">
              We're making improvements to serve you better. This usually takes just a few minutes.
            </p>
            <div className="text-xs text-yellow-700">
              <p><strong>Estimated completion:</strong> Shortly</p>
              <p><strong>Last updated:</strong> {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">What can I do?</h3>
            <div className="grid gap-3">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again Now
              </Button>

              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </Link>
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">
              Stay Updated
            </h3>
            <p className="text-sm text-blue-800">
              Follow our social media channels for real-time updates on maintenance and
              service status.
            </p>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            Thank you for your patience!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Continued in next section...

This implementation guide continues with tasks for consolidating authentication pages, updating routing, and completing all recommended improvements. Would you like me to continue with the remaining sections?
