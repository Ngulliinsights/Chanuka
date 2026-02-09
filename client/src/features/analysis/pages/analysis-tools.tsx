import { BarChart3, TrendingUp, Search, Users, Download, Filter } from 'lucide-react';

/**
 * Analysis Tools Page
 * 
 * Provides access to various legislative analysis tools
 */
export default function AnalysisToolsPage() {
  const tools = [
    {
      title: 'Bill Impact Analysis',
      description: 'Analyze the potential impact of bills on different sectors and communities',
      icon: TrendingUp,
      link: '/analysis/impact',
      status: 'Available'
    },
    {
      title: 'Legislative Trends',
      description: 'Track trends in legislation across counties and the national assembly',
      icon: BarChart3,
      link: '/analysis/trends',
      status: 'Available'
    },
    {
      title: 'Bill Comparison',
      description: 'Compare multiple bills side-by-side to understand differences',
      icon: Search,
      link: '/analysis/compare',
      status: 'Available'
    },
    {
      title: 'Stakeholder Analysis',
      description: 'Identify and analyze stakeholders affected by legislation',
      icon: Users,
      link: '/analysis/stakeholders',
      status: 'Coming Soon'
    },
    {
      title: 'Data Export',
      description: 'Export legislative data for custom analysis',
      icon: Download,
      link: '/analysis/export',
      status: 'Available'
    },
    {
      title: 'Advanced Filters',
      description: 'Use advanced filtering to find specific legislation',
      icon: Filter,
      link: '/bills?advanced=true',
      status: 'Available'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Analysis Tools</h1>
            <p className="text-xl text-blue-100">
              Powerful tools to analyze Kenyan legislation and understand its impact
            </p>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{tool.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{tool.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      tool.status === 'Available' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {tool.status}
                    </span>
                    {tool.status === 'Available' && (
                      <a
                        href={tool.link}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                      >
                        Launch Tool →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Why Use Our Analysis Tools?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Data-Driven Insights</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Make informed decisions based on comprehensive legislative data
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Track Trends</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Identify patterns and trends across all 47 counties
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Deep Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Understand the full impact of legislation on communities
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
