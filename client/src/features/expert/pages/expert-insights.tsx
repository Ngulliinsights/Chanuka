import { Award, BookOpen, MessageSquare, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Expert Insights Page
 * 
 * Hub for expert analysis and verified insights on Kenyan legislation
 */
export default function ExpertInsightsPage() {
  const expertCategories = [
    {
      title: 'Constitutional Law',
      experts: 12,
      insights: 45,
      icon: BookOpen,
      color: 'blue'
    },
    {
      title: 'Public Finance',
      experts: 8,
      insights: 32,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Devolution & Governance',
      experts: 15,
      insights: 58,
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Human Rights',
      experts: 10,
      insights: 38,
      icon: Award,
      color: 'orange'
    }
  ];

  const recentInsights = [
    {
      title: 'Analysis of the Digital Health Bill 2023',
      expert: 'Prof. Githu Muigai',
      category: 'Constitutional Law',
      date: '2024-01-20',
      excerpt: 'The Digital Health Bill presents significant opportunities for healthcare delivery while raising important data protection concerns...'
    },
    {
      title: 'County Revenue Allocation: A Critical Review',
      expert: 'Wanjiru Gikonyo',
      category: 'Public Finance',
      date: '2024-01-18',
      excerpt: 'The proposed changes to county revenue allocation formulas require careful consideration of equity principles...'
    },
    {
      title: 'Public Participation in Legislative Process',
      expert: 'Dr. PLO Lumumba',
      category: 'Devolution & Governance',
      date: '2024-01-15',
      excerpt: 'Effective public participation remains a cornerstone of democratic governance, yet implementation challenges persist...'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Expert Insights</h1>
            <p className="text-xl text-blue-100 mb-8">
              Verified analysis from Kenya's leading legal and policy experts
            </p>
            <Link
              to="/community/expert-verification"
              className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Become a Verified Expert
            </Link>
          </div>
        </div>
      </section>

      {/* Expert Categories */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Expert Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {expertCategories.map((category, index) => {
              const Icon = category.icon;
              const colorClasses = {
                blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
                green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
                purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
                orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
              };
              
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className={`w-12 h-12 ${colorClasses[category.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{category.title}</h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>Experts</span>
                      <span className="font-semibold">{category.experts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Insights</span>
                      <span className="font-semibold">{category.insights}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Insights */}
      <section className="bg-white dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Recent Expert Insights</h2>
            <div className="space-y-6">
              {recentInsights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{insight.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{insight.expert}</span>
                        </div>
                        <span>•</span>
                        <span>{insight.category}</span>
                        <span>•</span>
                        <span>{new Date(insight.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{insight.excerpt}</p>
                  <a
                    href="#"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Read Full Analysis →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Become an Expert CTA */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold rounded-xl p-8 text-white text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Share Your Expertise</h2>
            <p className="text-blue-100 mb-6">
              Are you a legal professional, policy expert, or civic leader? Join our verified expert community
              and help Kenyans understand complex legislation.
            </p>
            <Link
              to="/community/expert-verification"
              className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Apply for Verification
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
