import React, { useState } from 'react';
import { Briefcase, MapPin, Clock, DollarSign, Users, Heart, Zap, Globe } from 'lucide-react';

interface JobListing {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
}

const jobListings: JobListing[] = [
  {
    id: '1',
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Nairobi (Hybrid)',
    type: 'Full-time',
    salary: 'KES 180,000 - 250,000',
    description: 'Build scalable features for our civic engagement platform using React, Node.js, and PostgreSQL.',
    requirements: [
      '5+ years of full-stack development experience',
      'Strong proficiency in TypeScript, React, and Node.js',
      'Experience with PostgreSQL and database design',
      'Passion for civic technology and democratic transparency'
    ]
  },
  {
    id: '2',
    title: 'Product Designer',
    department: 'Design',
    location: 'Nairobi (Hybrid)',
    type: 'Full-time',
    salary: 'KES 150,000 - 200,000',
    description: 'Design intuitive interfaces that make complex legislative information accessible to all Kenyan citizens.',
    requirements: [
      '4+ years of product design experience',
      'Strong portfolio demonstrating UX/UI skills',
      'Experience with Figma and design systems',
      'Understanding of accessibility standards (WCAG 2.1)'
    ]
  },
  {
    id: '3',
    title: 'Policy Research Analyst',
    department: 'Research',
    location: 'Nairobi',
    type: 'Full-time',
    salary: 'KES 100,000 - 130,000',
    description: 'Analyze Kenyan legislation, create summaries, and ensure our platform provides accurate policy information.',
    requirements: [
      'Degree in Political Science, Public Policy, Law, or related field',
      '2+ years of policy research experience',
      'Strong analytical and writing skills',
      'Familiarity with Kenyan legislative processes'
    ]
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote (Kenya)',
    type: 'Full-time',
    salary: 'KES 170,000 - 220,000',
    description: 'Build and maintain our infrastructure, ensuring reliability and security for our users across Kenya.',
    requirements: [
      '3+ years of DevOps experience',
      'Experience with AWS, Docker, and Kubernetes',
      'Strong understanding of CI/CD pipelines',
      'Security-first mindset'
    ]
  }
];

export default function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const departments = ['all', ...Array.from(new Set(jobListings.map(job => job.department)))];
  
  const filteredJobs = selectedDepartment === 'all' 
    ? jobListings 
    : jobListings.filter(job => job.department === selectedDepartment);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Join Our Mission</h1>
            <p className="text-xl text-blue-100 mb-8">
              Help us build technology that strengthens democracy and empowers citizens.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                <Users className="w-4 h-4" />
                <span>Hybrid & Remote Options</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                <Heart className="w-4 h-4" />
                <span>NHIF & Comprehensive Benefits</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2">
                <Zap className="w-4 h-4" />
                <span>Impactful Work</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Why Work at Chanuka?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Flexible Work Culture</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Hybrid work options in Nairobi with flexible hours. Remote opportunities available for select roles across Kenya.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Health & Wellness</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive health insurance (NHIF), dental, vision, plus mental health support and wellness programs.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Growth & Learning</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Professional development budget, conference attendance, and mentorship.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold mb-2">Work-Life Balance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Unlimited PTO, parental leave, and flexible scheduling for life's needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h2 className="text-3xl font-bold mb-4 md:mb-0">Open Positions</h2>
            <div className="flex items-center space-x-2">
              <label htmlFor="department" className="text-sm font-medium">Filter:</label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                  <div className="mb-4 lg:mb-0">
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{job.department}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{job.type}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{job.salary}</span>
                      </div>
                    </div>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors whitespace-nowrap">
                    Apply Now
                  </button>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4">{job.description}</p>

                <div>
                  <p className="font-semibold mb-2 text-sm">Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No positions available in this department at the moment.
            </div>
          )}
        </div>
      </section>

      {/* Application Process */}
      <section className="bg-gray-100 dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Our Hiring Process</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Apply</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Submit your application and resume
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Screen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Initial call with our team
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">Interview</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Technical and cultural fit interviews
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  4
                </div>
                <h3 className="font-semibold mb-2">Offer</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome to the team!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Don't See a Perfect Fit?</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            We're always interested in hearing from talented people who share our mission.
            Send us your resume and tell us how you'd like to contribute.
          </p>
          <a
            href="/contact"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  );
}
