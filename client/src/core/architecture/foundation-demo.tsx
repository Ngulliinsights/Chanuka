/**
 * Foundation Demo Component
 *
 * Demonstrates the usage of the client architecture foundation components.
 * This component can be used for testing and validation during development.
 */

import React, { useEffect, useState } from 'react';
import {
  isFeatureEnabled,
  isFeatureEnabledForUser,
  getCurrentUserGroup,
  getFeatureRolloutStatus,
  COMPONENT_REUSE_MATRIX,
  getRefactoringPlanSummary,
  useArchitecturePerformance,
  useUserJourney,
  architecturePerformanceMonitor,
  type FeatureFlagKey,
  type UserGroup
} from './index';

interface FoundationDemoProps {
  className?: string;
}

export const FoundationDemo: React.FC<FoundationDemoProps> = ({ className }) => {
  const [userGroup, setUserGroup] = useState<UserGroup>(getCurrentUserGroup());
  const [rolloutStatus, setRolloutStatus] = useState(getFeatureRolloutStatus());
  const [performanceMetrics, setPerformanceMetrics] = useState(architecturePerformanceMonitor.getMetrics());

  // Use architecture performance monitoring
  const {
    recordSearchPerformance,
    recordDashboardPerformance
  } = useArchitecturePerformance({
    componentName: 'FoundationDemo',
    trackLoad: true,
    trackRender: true
  });

  // Use user journey tracking
  const { addStep, completeJourney } = useUserJourney('foundation-demo-journey', 'intermediate');

  useEffect(() => {
    // Add journey step when component mounts
    addStep('foundation-demo-loaded', true);

    // Update metrics every 5 seconds for demo
    const interval = setInterval(() => {
      setPerformanceMetrics(architecturePerformanceMonitor.getMetrics());
    }, 5000);

    return () => {
      clearInterval(interval);
      completeJourney();
    };
  }, [addStep, completeJourney]);

  const handleFeatureToggle = (feature: FeatureFlagKey) => {
    // In a real app, this would call an API to toggle the feature
    console.log(`Toggling feature: ${feature}`);
    addStep(`feature-toggle-${feature}`, true);
  };

  const handleTestSearch = () => {
    const startTime = performance.now();

    // Simulate search
    setTimeout(() => {
      const responseTime = performance.now() - startTime;
      recordSearchPerformance('test query', responseTime, 42, 'unified');
      addStep('test-search-completed', true);
    }, Math.random() * 500 + 100); // Random delay 100-600ms
  };

  const handleTestDashboard = () => {
    const startTime = performance.now();

    // Simulate dashboard load
    setTimeout(() => {
      const loadTime = performance.now() - startTime;
      recordDashboardPerformance('adaptive', loadTime, 6, 'intermediate');
      addStep('test-dashboard-loaded', true);
    }, Math.random() * 2000 + 1000); // Random delay 1-3s
  };

  const refactoringSummary = getRefactoringPlanSummary();
  const performanceSummary = architecturePerformanceMonitor.getPerformanceSummary();

  return (
    <div className={`foundation-demo p-6 space-y-6 ${className || ''}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Client Architecture Foundation Demo</h2>
        <p className="text-gray-600 mb-4">
          This demo showcases the foundation components for client architecture refinement.
        </p>
      </div>

      {/* Feature Flags Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Feature Flags & Rollout</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Current User Group: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{userGroup}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(rolloutStatus).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm font-medium">{feature}</span>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleFeatureToggle(feature as FeatureFlagKey)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Toggle
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Component Reuse Matrix Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Component Reuse Matrix</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-2xl font-bold text-green-600">{refactoringSummary.reuseCount}</div>
            <div className="text-sm text-green-800">Reuse As-Is</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-2xl font-bold text-yellow-600">{refactoringSummary.refactorCount}</div>
            <div className="text-sm text-yellow-800">Refactor</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-600">{refactoringSummary.createNewCount}</div>
            <div className="text-sm text-blue-800">Create New</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <div className="text-2xl font-bold text-purple-600">{refactoringSummary.totalComponents}</div>
            <div className="text-sm text-purple-800">Total</div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>High Quality: {refactoringSummary.highQualityCount} components</p>
          <p>Medium Quality: {refactoringSummary.mediumQualityCount} components</p>
          <p>Low Quality: {refactoringSummary.lowQualityCount} components</p>
        </div>
      </div>

      {/* Performance Monitoring Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Performance Monitoring</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">
              {performanceSummary.averageRouteTransition.toFixed(0)}ms
            </div>
            <div className="text-sm text-blue-800">Avg Route Transition</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">
              {performanceSummary.averageComponentLoad.toFixed(0)}ms
            </div>
            <div className="text-sm text-green-800">Avg Component Load</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-600">
              {performanceSummary.averageSearchResponse.toFixed(0)}ms
            </div>
            <div className="text-sm text-yellow-800">Avg Search Response</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <div className="text-lg font-bold text-purple-600">
              {performanceSummary.averageDashboardLoad.toFixed(0)}ms
            </div>
            <div className="text-sm text-purple-800">Avg Dashboard Load</div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleTestSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Search Performance
          </button>
          <button
            onClick={handleTestDashboard}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Dashboard Performance
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>Total Metrics Collected: {performanceSummary.totalMetrics}</p>
          <p>Slow Operations: Route({performanceSummary.slowRouteTransitions}) | Component({performanceSummary.slowComponentLoads}) | Search({performanceSummary.slowSearches}) | Dashboard({performanceSummary.slowDashboards})</p>
        </div>
      </div>

      {/* Recent Metrics Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Metrics</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Route Transitions ({performanceMetrics.routeTransitions.length})</h4>
            <div className="max-h-32 overflow-y-auto">
              {performanceMetrics.routeTransitions.slice(-5).map((metric, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded mb-1">
                  {metric.fromRoute} → {metric.toRoute} ({metric.duration.toFixed(0)}ms)
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Component Loads ({performanceMetrics.componentLoadTimes.length})</h4>
            <div className="max-h-32 overflow-y-auto">
              {performanceMetrics.componentLoadTimes.slice(-5).map((metric, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded mb-1">
                  {metric.componentName} ({metric.loadTime.toFixed(0)}ms)
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Search Performance ({performanceMetrics.searchPerformance.length})</h4>
            <div className="max-h-32 overflow-y-auto">
              {performanceMetrics.searchPerformance.slice(-5).map((metric, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded mb-1">
                  "{metric.query}&quot; → {metric.resultCount} results ({metric.responseTime.toFixed(0)}ms)
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoundationDemo;
