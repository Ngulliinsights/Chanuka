/**
 * Dashboard Stack Component
 *
 * Vertical stacked layout for dashboard sections
 */

import React from 'react';
import { cn } from '@client/shared/design-system';
import { DashboardStackProps, DashboardSectionConfig } from '../types';

interface SectionRendererProps {
  section: DashboardSectionConfig;
  onUpdate?: (sectionId: string, updates: Partial<DashboardSectionConfig>) => void;
}

/**
 * Section Renderer Component
 */
const SectionRenderer: React.FC<SectionRendererProps> = ({ section, onUpdate }) => {
  // Handle different content types
  const renderContent = () => {
    switch (section.contentType) {
      case 'widgets':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.widgets?.map((widget) => (
              <div
                key={widget.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <h4 className="font-semibold mb-2">{widget.title}</h4>
                <div className="text-sm text-gray-600">
                  {widget.type} widget content
                </div>
              </div>
            ))}
          </div>
        );

      case 'component':
        // For custom components, we'd typically use dynamic imports
        // For now, render a placeholder
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

  if (!section.visible) return null;

  return (
    <section
      id={`section-${section.id}`}
      className="space-y-4"
      aria-labelledby={`section-title-${section.id}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            id={`section-title-${section.id}`}
            className="text-lg font-semibold flex items-center gap-2"
          >
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
    </section>
  );
};

/**
 * Dashboard Stack Component
 */
export const DashboardStack: React.FC<DashboardStackProps> = ({
  spacing = 'normal',
  sections,
  className,
  onSectionUpdate,
}) => {
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // Spacing classes
  const spacingClasses = {
    tight: 'space-y-4',
    normal: 'space-y-6',
    loose: 'space-y-8',
  };

  return (
    <div
      className={cn(
        'w-full',
        spacingClasses[spacing],
        className
      )}
      role="main"
      aria-label="Dashboard sections"
    >
      {sortedSections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          onUpdate={onSectionUpdate}
        />
      ))}

      {/* Empty state */}
      {sortedSections.length === 0 && (
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
};

DashboardStack.displayName = 'DashboardStack';