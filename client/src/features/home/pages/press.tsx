import { Download, Mail, FileText, Image, ExternalLink } from 'lucide-react';

export default function PressPage() {
  const pressReleases = [
    {
      date: '2024-01-15',
      title: 'Chanuka Launches Enhanced Bill Tracking Features',
      excerpt: 'New real-time notifications and analysis tools help citizens stay informed about legislative changes.',
      link: '#'
    },
    {
      date: '2023-12-01',
      title: 'Chanuka Reaches 100,000 Active Users Milestone',
      excerpt: 'Platform growth reflects increasing demand for transparent access to legislative information.',
      link: '#'
    },
    {
      date: '2023-10-15',
      title: 'Partnership Announcement: Civic Tech Coalition',
      excerpt: 'Chanuka joins forces with leading civic technology organizations to expand democratic engagement.',
      link: '#'
    }
  ];

  const mediaKit = [
    {
      title: 'Brand Guidelines',
      description: 'Logo usage, colors, typography, and brand standards',
      icon: FileText,
      size: '2.4 MB',
      format: 'PDF'
    },
    {
      title: 'Logo Package',
      description: 'High-resolution logos in various formats',
      icon: Image,
      size: '8.1 MB',
      format: 'ZIP'
    },
    {
      title: 'Product Screenshots',
      description: 'High-quality screenshots of our platform',
      icon: Image,
      size: '15.3 MB',
      format: 'ZIP'
    },
    {
      title: 'Demo Video',
      description: 'Platform overview and feature demonstrations',
      icon: FileText,
      size: '45.2 MB',
      format: 'MP4'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Press & Media</h1>
            <p className="text-xl text-blue-100">
              Resources and information for journalists, bloggers, and media professionals.
            </p>
          </div>
        </div>
      </section>

      {/* Press Contact */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Media Inquiries</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Press Contact</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  For all media inquiries, interviews, and press-related questions:
                </p>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:press@chanuka.org" className="hover:underline">
                    press@chanuka.org
                  </a>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Response Time</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We typically respond to media inquiries within 24 hours during business days.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  For urgent requests, please indicate "URGENT" in your subject line.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Recent Press Releases</h2>
          <div className="space-y-6">
            {pressReleases.map((release, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {new Date(release.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <h3 className="text-xl font-semibold mb-2">{release.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{release.excerpt}</p>
                    <a
                      href={release.link}
                      className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Read Full Release</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="bg-gray-100 dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Media Kit</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {mediaKit.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {item.format} • {item.size}
                          </span>
                          <button className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline text-sm">
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Company Facts */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Company Facts</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Quick Facts</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Founded</dt>
                    <dd className="font-medium">2023</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Headquarters</dt>
                    <dd className="font-medium">Nairobi, Kenya</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Active Users</dt>
                    <dd className="font-medium">100,000+</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Bills Tracked</dt>
                    <dd className="font-medium">50,000+</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Counties Covered</dt>
                    <dd className="font-medium">All 47 Counties</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Mission</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Chanuka empowers Kenyan citizens with transparent access to legislative information from the National Assembly, Senate, and County Assemblies, strengthening democratic participation through technology.
                </p>
                <h3 className="font-semibold mb-2">Key Features</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Real-time bill tracking across all 47 counties</li>
                  <li>• Legislative analysis tools</li>
                  <li>• Community engagement platform</li>
                  <li>• Expert verification system</li>
                  <li>• Bilingual support (English & Kiswahili)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">In the News</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Chanuka has been featured in leading Kenyan and international publications covering civic technology and democratic innovation.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              For a complete list of media coverage and mentions:
            </p>
            <a
              href="mailto:press@chanuka.org"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Request Media Coverage List
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
