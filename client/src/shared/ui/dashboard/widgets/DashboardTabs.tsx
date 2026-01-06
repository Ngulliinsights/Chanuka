/**
 * Dashboard Tabs Component
 *
 * Tabbed layout for dashboard sections
 */

import React, { useState } from 'react';

import { cn } from '@/shared/design-system/utils/cn';

import { DashboardTabsProps, DashboardSectionConfig } from '../types';

interface SectionRendererProps {
  section: DashboardSectionConfig;
  onUpdate?: (sectionId: string, updates: Partial<DashboardSectionConfig>) => void;
}

/**
 * Section Renderer Component
 */
const SectionRenderer: React.FC<SectionRendererProps> = React.memo(
  ({ section, onUpdate: _onUpdate }) => {
    // Handle different content types
    const renderContent = () => {
      switch (section.contentType) {
        case 'widgets':
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.widgets?.map(widget => (
                <div key={widget.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold mb-2">{widget.title}</h4>
                  <div className="text-sm text-gray-600">{widget.type} widget content</div>
                </div>
              ))}
            </div>
          );

        case 'component':
          // For custom components, we'd typically use dynamic imports
          return (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-gray-600">Component: {section.component}</p>
            </div>
          );

        case 'custom':
          return (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600">Custom content for section: {section.id}</p>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="space-y-4 min-h-[200px]">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {section.icon && <span>{section.icon}</span>}
              {section.title}
            </h3>
            {section.description && (
              <p className="text-sm text-gray-600 mt-1">{section.description}</p>
            )}
          </div>
        </div>

        {/* Section Content */}
        <div className="min-h-[100px]">
          {section.loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : section.error ? (
            <div className="text-red-600 p-4 border border-red-200 rounded-lg">
              Error loading section: {section.error}
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    );
  }
);

SectionRenderer.displayName = 'SectionRenderer';

/**
 * Dashboard Tabs Component
 */
export const DashboardTabs = React.memo<DashboardTabsProps>(
  ({ defaultTab, sections, className, onTabChange, onSectionUpdate }) => {
    // Filter visible sections and sort by order
    const visibleSections = sections
      .filter(section => section.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Set default active tab
    const [activeTab, setActiveTab] = useState<string>(defaultTab || visibleSections[0]?.id || '');

    // Handle tab change
    const handleTabChange = (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    };

    // Get active section
    const activeSection = visibleSections.find(section => section.id === activeTab);

    return (
      <div className={cn('w-full', className)}>
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8" role="tablist" aria-label="Dashboard sections">
            {visibleSections.map(section => (
              <button
                key={section.id}
                onClick={() => handleTabChange(section.id)}
                className={cn(
                  'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  activeTab === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
                aria-selected={activeTab === section.id}
                role="tab"
              >
                <span className="flex items-center gap-2">
                  {section.icon && <span>{section.icon}</span>}
                  {section.title}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeSection ? (
            <SectionRenderer section={activeSection} onUpdate={onSectionUpdate} />
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No section selected</h3>
              <p className="text-gray-600">Select a tab to view its content.</p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {visibleSections.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sections configured</h3>
            <p className="text-gray-600">Add sections to your dashboard to get started.</p>
          </div>
        )}
      </div>
    );
  }
);

DashboardTabs.displayName = 'DashboardTabs';
