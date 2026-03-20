import React from 'react';
import { Shield } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8" aria-hidden="true" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Security & Incident Response</h1>
            <p className="text-xl text-blue-100">
              Our commitment to protecting your data and maintaining platform security
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Security & Incident Response</h1>
        <p className="text-sm text-gray-700">
          Outline security practices, vulnerability disclosure, and incident response details here.
        </p>
      </div>
    </div>
  );
}
