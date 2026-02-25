import React, { useState } from 'react';
import { Calendar, User, Tag, ArrowRight, Search } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  image: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Understanding the Legislative Process: A Citizen\'s Guide',
    excerpt: 'Learn how bills become laws and how you can participate in the democratic process at every stage.',
    author: 'Sarah Johnson',
    date: '2024-01-20',
    category: 'Education',
    readTime: '8 min read',
    image: 'legislative-process'
  },
  {
    id: '2',
    title: 'How to Track Bills That Matter to You',
    excerpt: 'Discover effective strategies for monitoring legislation and staying informed about issues you care about.',
    author: 'Michael Chen',
    date: '2024-01-15',
    category: 'How-To',
    readTime: '6 min read',
    image: 'bill-tracking'
  },
  {
    id: '3',
    title: 'The Impact of Civic Technology on Democracy',
    excerpt: 'Exploring how digital tools are transforming citizen engagement and government transparency.',
    author: 'Dr. Emily Rodriguez',
    date: '2024-01-10',
    category: 'Analysis',
    readTime: '10 min read',
    image: 'civic-tech'
  },
  {
    id: '4',
    title: 'Community Spotlight: Expert Verification Success Stories',
    excerpt: 'Meet the verified experts helping citizens understand complex legislation through our platform.',
    author: 'David Park',
    date: '2024-01-05',
    category: 'Community',
    readTime: '7 min read',
    image: 'community'
  },
  {
    id: '5',
    title: 'New Features: Enhanced Search and Analysis Tools',
    excerpt: 'Announcing powerful new capabilities to help you find and analyze legislative information faster.',
    author: 'Product Team',
    date: '2023-12-28',
    category: 'Product Updates',
    readTime: '5 min read',
    image: 'features'
  },
  {
    id: '6',
    title: 'Building Trust Through Transparency: Our Approach',
    excerpt: 'How we ensure accuracy, neutrality, and reliability in presenting legislative information.',
    author: 'Sarah Johnson',
    date: '2023-12-20',
    category: 'Company',
    readTime: '9 min read',
    image: 'transparency'
  }
];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...Array.from(new Set(blogPosts.map(post => post.category)))];

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Chanuka Blog</h1>
            <p className="text-xl text-blue-100 mb-8">
              Insights on civic engagement, legislative transparency, and democratic participation.
            </p>
            
            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-white"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {category === 'all' ? 'All Posts' : category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No articles found matching your criteria.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map(post => (
                <article
                  key={post.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  {/* Image Placeholder */}
                  <div className="h-48 bg-gradient-to-br from-brand-navy to-blue-900 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-white text-6xl font-bold opacity-20">
                      {post.title.charAt(0)}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Category Badge */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                        <Tag className="w-3 h-3" />
                        <span>{post.category}</span>
                      </span>
                      <span className="text-xs text-gray-500">{post.readTime}</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-semibold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(post.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Read More */}
                    <a
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      <span>Read More</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold py-12 border-t border-brand-gold/20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-blue-100 mb-6">
              Subscribe to our newsletter for the latest articles, product updates, and civic engagement insights.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-0 focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
