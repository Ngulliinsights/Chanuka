import React, { useState, useEffect } from 'react';
import { PageRelationshipUtils } from '@/utils/navigation/page-relationship-utils';
import { RelatedPage, UserRole } from '@/types/navigation';

interface PageRelationshipDemoProps {
  currentPage?: string;
  userRole?: UserRole;
}

export const PageRelationshipDemo: React.FC<PageRelationshipDemoProps> = ({
  currentPage = '/',
  userRole = 'citizen'
}) => {
  const [selectedPage, setSelectedPage] = useState(currentPage);
  const [relatedPages, setRelatedPages] = useState<RelatedPage[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [networkStats, setNetworkStats] = useState<any>(null);

  useEffect(() => {
    // Get related pages for current selection
    const related = PageRelationshipUtils.getSmartSuggestions(selectedPage, userRole);
    setRelatedPages(related);

    // Get page insights
    const pageInsights = PageRelationshipUtils.getPageInsights(selectedPage);
    setInsights(pageInsights);

    // Get network analysis
    const analysis = PageRelationshipUtils.analyzePageNetwork();
    setNetworkStats(analysis);
  }, [selectedPage, userRole]);

  const handlePageChange = (pageId: string) => {
    setSelectedPage(pageId);
  };

  const calculatePathEfficiency = (targetPage: string) => {
    return PageRelationshipUtils.calculateNavigationEfficiency(selectedPage, targetPage);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Page Relationship Mapping Demo</h2>
      
      {/* Page Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Current Page:</label>
        <select 
          value={selectedPage} 
          onChange={(e) => handlePageChange(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
          aria-label="Select current page"
          title="Select the current page to analyze"
        >
          <option value="/">Home</option>
          <option value="/bills">Bills Dashboard</option>
          <option value="/bills/:id">Bill Details</option>
          <option value="/bills/:id/analysis">Bill Analysis</option>
          <option value="/community">Community Input</option>
          <option value="/expert-verification">Expert Verification</option>
          <option value="/dashboard">Dashboard</option>
          <option value="/admin">Admin Panel</option>
        </select>
      </div>

      {/* Page Insights */}
      {insights && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Page Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Metadata</h4>
              <p className="text-sm text-gray-600">
                Title: {insights.metadata?.title || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                Category: {insights.metadata?.category || 'Unknown'}
              </p>
            </div>
            <div>
              <h4 className="font-medium">Accessibility</h4>
              <p className="text-sm text-gray-600">
                Requires Auth: {insights.accessibility.requiresAuth ? 'Yes' : 'No'}
              </p>
              <p className="text-sm text-gray-600">
                Restricted Roles: {insights.accessibility.restrictedRoles.join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Related Pages */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Smart Navigation Suggestions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatedPages.map((page, index) => {
            const efficiency = calculatePathEfficiency(page.pageId || '');
            return (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{page.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    page.type === 'parent' ? 'bg-blue-100 text-blue-800' :
                    page.type === 'child' ? 'bg-green-100 text-green-800' :
                    page.type === 'sibling' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {page.type}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{page.description}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Weight: {(page.weight || 0).toFixed(2)}</span>
                  <span className={`px-2 py-1 rounded ${
                    efficiency.efficiency === 'direct' ? 'bg-green-100 text-green-800' :
                    efficiency.efficiency === 'indirect' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {efficiency.efficiency}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Context: {page.context}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Network Statistics */}
      {networkStats && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Network Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{networkStats.stats.totalPages}</div>
              <div className="text-sm text-gray-600">Total Pages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{networkStats.stats.totalRelationships}</div>
              <div className="text-sm text-gray-600">Relationships</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {networkStats.stats.averageRelationshipsPerPage.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg Relations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(networkStats.stats.categoryCounts).length}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
          
          {networkStats.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {networkStats.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Breadcrumb Preview */}
      {insights && insights.parentChain.length > 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Navigation Breadcrumbs</h3>
          <div className="flex items-center space-x-2 text-sm">
            {insights.parentChain.map((pageId: string, index: number) => (
              <React.Fragment key={pageId}>
                <span 
                  className={`px-2 py-1 rounded ${
                    index === insights.parentChain.length - 1 
                      ? 'bg-blue-100 text-blue-800 font-medium' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                  }`}
                  onClick={() => index < insights.parentChain.length - 1 && handlePageChange(pageId)}
                >
                  {insights.metadata?.title || pageId}
                </span>
                {index < insights.parentChain.length - 1 && (
                  <span className="text-gray-400">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};