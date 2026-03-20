import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { CheckCircle, AlertCircle, Mail, ExternalLink } from 'lucide-react';

/**
 * Accessibility Statement Page
 * 
 * Comprehensive accessibility statement documenting our commitment
 * to WCAG compliance and providing contact information for accessibility issues.
 */
export default function AccessibilityStatement() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8" aria-hidden="true" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Accessibility Statement</h1>
            <p className="text-xl text-blue-100">
              Chanuka is committed to ensuring digital accessibility for all people, including those with disabilities.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-4xl">

      {/* Commitment */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Our Commitment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We are committed to providing a website that is accessible to the widest possible
            audience, regardless of technology or ability. We aim to comply with all applicable
            standards and guidelines.
          </p>
          <p>
            This website strives to conform to the{' '}
            <a
              href="https://www.w3.org/WAI/WCAG21/quickref/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Web Content Accessibility Guidelines (WCAG) 2.1
              <ExternalLink className="h-3 w-3" />
            </a>{' '}
            at Level AA. These guidelines explain how to make web content more accessible for
            people with disabilities.
          </p>
        </CardContent>
      </Card>

      {/* Conformance Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Conformance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="default" className="text-sm">
              WCAG 2.1 Level AA
            </Badge>
            <span className="text-sm text-muted-foreground">Partially Conformant</span>
          </div>
          <p className="text-sm text-muted-foreground">
            "Partially conformant" means that some parts of the content do not fully conform to
            the accessibility standard. We are actively working to achieve full conformance.
          </p>
        </CardContent>
      </Card>

      {/* Accessibility Features */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Accessibility Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Keyboard Navigation</h3>
                <p className="text-sm text-muted-foreground">
                  All functionality is available using keyboard only
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Screen Reader Support</h3>
                <p className="text-sm text-muted-foreground">
                  Proper ARIA labels and semantic HTML throughout
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Color Contrast</h3>
                <p className="text-sm text-muted-foreground">
                  Minimum 4.5:1 contrast ratio for normal text
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Resizable Text</h3>
                <p className="text-sm text-muted-foreground">
                  Text can be resized up to 200% without loss of functionality
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Skip Links</h3>
                <p className="text-sm text-muted-foreground">
                  Skip to main content links on all pages
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Reduced Motion</h3>
                <p className="text-sm text-muted-foreground">
                  Respects prefers-reduced-motion preference
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Focus Indicators</h3>
                <p className="text-sm text-muted-foreground">
                  Visible focus indicators on all interactive elements
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Alternative Text</h3>
                <p className="text-sm text-muted-foreground">
                  Descriptive alt text for all meaningful images
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Known Issues */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Known Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Despite our best efforts, some limitations may exist. We are actively working to
            address the following known issues:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Some complex data visualizations may not be fully accessible to screen readers</li>
            <li>PDF documents may not meet accessibility standards (we're working on HTML alternatives)</li>
            <li>Some third-party embedded content may not be fully accessible</li>
            <li>Mobile drawer implementation is in progress</li>
          </ul>
          <p className="text-sm">
            We are committed to addressing these issues in upcoming releases.
          </p>
        </CardContent>
      </Card>

      {/* Assistive Technologies */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compatible Assistive Technologies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This website is designed to be compatible with the following assistive technologies:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-1">Screen Readers</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• NVDA (Windows)</li>
                <li>• JAWS (Windows)</li>
                <li>• VoiceOver (macOS, iOS)</li>
                <li>• TalkBack (Android)</li>
              </ul>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-1">Browsers</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Chrome (latest)</li>
                <li>• Firefox (latest)</li>
                <li>• Safari (latest)</li>
                <li>• Edge (latest)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Feedback and Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We welcome your feedback on the accessibility of Chanuka. Please let us know if you
            encounter accessibility barriers:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <a
                  href="mailto:accessibility@chanuka.org"
                  className="text-blue-600 hover:underline"
                >
                  accessibility@chanuka.org
                </a>
                <p className="text-sm text-muted-foreground mt-1">
                  We aim to respond within 2 business days
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Feedback Widget</h3>
                <p className="text-sm text-muted-foreground">
                  Use the feedback button in the bottom-right corner to report accessibility
                  issues directly from any page
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              When reporting an accessibility issue, please include:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The page URL where you encountered the issue</li>
                <li>A description of the problem</li>
                <li>The assistive technology you're using (if applicable)</li>
                <li>Your browser and operating system</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Assessment */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assessment Approach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Chanuka assessed the accessibility of this website using the following approaches:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Self-evaluation using automated testing tools (axe DevTools, Lighthouse)</li>
            <li>Manual testing with keyboard navigation</li>
            <li>Screen reader testing (NVDA, VoiceOver)</li>
            <li>Color contrast analysis</li>
            <li>User testing with people with disabilities (planned)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Formal Complaints */}
      <Card>
        <CardHeader>
          <CardTitle>Formal Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            If you are not satisfied with our response to your accessibility concern, you may
            escalate your complaint to:
          </p>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-semibold">Kenya National Commission on Human Rights</p>
            <p className="text-sm text-muted-foreground mt-1">
              Website:{' '}
              <a
                href="https://www.knchr.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                www.knchr.org
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>This accessibility statement was last updated on March 5, 2026.</p>
        <p className="mt-1">
          We review and update this statement regularly as we continue to improve accessibility.
        </p>
      </div>
    </div>
    </div>
  );
}
