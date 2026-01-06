/**
 * Navigation Slice Demo Component
 *
 * Demonstrates how to use the navigation slice in different scenarios.
 * This component shows the integration patterns and can be used as a reference.
 */

import React from 'react';

import { Button } from '@/shared/design-system';
import {
  useNavigationSlice,
  useSidebar,
  useMobileMenu,
  useNavigationPreferences,
} from '@/shared/hooks/useNavigationSlice';

export function NavigationSliceDemo() {
  const navigation = useNavigationSlice();
  const sidebar = useSidebar();
  const mobileMenu = useMobileMenu();
  const preferences = useNavigationPreferences();

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold">Navigation Slice Integration Demo</h2>

      {/* Current State Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Current State</h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Current Path:</strong> {navigation.currentPath}
            </p>
            <p>
              <strong>Previous Path:</strong> {navigation.previousPath}
            </p>
            <p>
              <strong>Current Section:</strong> {navigation.currentSection}
            </p>
            <p>
              <strong>User Role:</strong> {navigation.userRole}
            </p>
            <p>
              <strong>Is Mobile:</strong> {navigation.isMobile ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Breadcrumbs:</strong> {navigation.breadcrumbs.length} items
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">UI State</h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Sidebar Open:</strong> {sidebar.sidebarOpen ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Sidebar Collapsed:</strong> {sidebar.sidebarCollapsed ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Mobile Menu Open:</strong> {mobileMenu.mobileMenuOpen ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Any Menu Open:</strong> {navigation.isAnyMenuOpen ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Page Favorited:</strong> {preferences.isCurrentPageFavorited ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Sidebar Controls</h3>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={sidebar.toggleSidebar} variant="outline" size="sm">
              Toggle Sidebar
            </Button>
            <Button onClick={() => sidebar.setSidebarOpen(true)} variant="outline" size="sm">
              Open Sidebar
            </Button>
            <Button onClick={() => sidebar.setSidebarOpen(false)} variant="outline" size="sm">
              Close Sidebar
            </Button>
            <Button
              onClick={() => sidebar.setSidebarCollapsed(!sidebar.sidebarCollapsed)}
              variant="outline"
              size="sm"
            >
              {sidebar.sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Mobile Menu Controls</h3>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={mobileMenu.toggleMobileMenu} variant="outline" size="sm">
              Toggle Mobile Menu
            </Button>
            <Button onClick={() => mobileMenu.setMobileMenuOpen(true)} variant="outline" size="sm">
              Open Mobile Menu
            </Button>
            <Button onClick={() => mobileMenu.setMobileMenuOpen(false)} variant="outline" size="sm">
              Close Mobile Menu
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Navigation Actions</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => navigation.setCurrentSection('legislative')}
              variant="outline"
              size="sm"
            >
              Set Legislative Section
            </Button>
            <Button
              onClick={() => navigation.setCurrentSection('admin')}
              variant="outline"
              size="sm"
            >
              Set Admin Section
            </Button>
            <Button onClick={() => navigation.setUserRole('admin')} variant="outline" size="sm">
              Set Admin Role
            </Button>
            <Button onClick={() => navigation.setUserRole('public')} variant="outline" size="sm">
              Set Public Role
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Favorites</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => preferences.addFavoritePage(navigation.currentPath)}
              variant="outline"
              size="sm"
              disabled={preferences.isCurrentPageFavorited}
            >
              Add to Favorites
            </Button>
            <Button
              onClick={() => preferences.removeFavoritePage(navigation.currentPath)}
              variant="outline"
              size="sm"
              disabled={!preferences.isCurrentPageFavorited}
            >
              Remove from Favorites
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Preferences</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() =>
                preferences.updatePreferences({
                  showBreadcrumbs: !preferences.preferences.showBreadcrumbs,
                })
              }
              variant="outline"
              size="sm"
            >
              Toggle Breadcrumbs: {preferences.preferences.showBreadcrumbs ? 'Hide' : 'Show'}
            </Button>
            <Button
              onClick={() =>
                preferences.updatePreferences({
                  compactMode: !preferences.preferences.compactMode,
                })
              }
              variant="outline"
              size="sm"
            >
              Toggle Compact Mode: {preferences.preferences.compactMode ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Pages */}
      {preferences.mostVisitedPages.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Most Visited Pages</h3>
          <div className="space-y-1">
            {preferences.mostVisitedPages.map((page, _index) => (
              <div
                key={page.path}
                className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
              >
                <span>
                  {page.title} ({page.path})
                </span>
                <span className="text-gray-500">{page.visitCount} visits</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      {navigation.breadcrumbs.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Current Breadcrumbs</h3>
          <div className="flex items-center space-x-2 text-sm">
            {navigation.breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <span className="text-gray-400">/</span>}
                <span className={crumb.is_active ? 'font-medium' : 'text-gray-600'}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NavigationSliceDemo;
