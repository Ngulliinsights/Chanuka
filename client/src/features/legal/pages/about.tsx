import React from 'react';
import { Users, Target, Heart, Shield, Globe, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            About Chanuka
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            Empowering Kenyan citizens with transparent access to legislative information and civic engagement tools.
            We believe democracy thrives when information is accessible to all, and we're committed to strengthening
            Kenya's democratic institutions through technology.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
              <p className="text-gray-600 dark:text-gray-400">
                To make Kenya's legislative processes transparent and accessible, enabling informed civic participation
                and strengthening democratic engagement across all 47 counties.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Values</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Transparency, accessibility, non-partisanship, and community-driven innovation guide
                everything we build and every decision we make.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
              <p className="text-gray-600 dark:text-gray-400">
                A world where every citizen has the tools and information needed to participate
                meaningfully in democracy and hold leaders accountable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Chanuka was born from a simple observation: legislative information in Kenya is public, but it's not accessible.
              Bills are written in complex legal language, scattered across different systems, and difficult to track.
              Citizens who want to engage with their democracy face unnecessary barriers.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We set out to change that. By combining modern technology with a commitment to transparency,
              we've created a platform that makes legislative information from both the National Assembly and Senate
              understandable, trackable, and actionable - in both English and Kiswahili.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Today, Chanuka serves thousands of engaged Kenyan citizens, researchers, journalists, and advocates who
              use our platform to stay informed about national and county legislation, analyze bills, and participate
              in the democratic process as envisioned by the Constitution of Kenya 2010.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-100 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">What Makes Us Different</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Non-Partisan</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    We present facts without bias, letting you form your own opinions based on complete information.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Community-Driven</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Our platform is shaped by user feedback and community needs, not corporate interests.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Real-Time Updates</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Track bills as they move through the legislative process with instant notifications.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Comprehensive Coverage</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    National Assembly, Senate, and County Assembly legislation all in one place with powerful search and analysis tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Our Team</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            We're a diverse team of engineers, designers, policy experts, and civic technologists
            united by a passion for democratic transparency.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
            <p className="text-lg font-semibold mb-2">Want to join us?</p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're always looking for talented people who share our mission.
            </p>
            <a
              href="/careers"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              View Open Positions
            </a>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Have questions, feedback, or want to partner with us? We'd love to hear from you.
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
}
