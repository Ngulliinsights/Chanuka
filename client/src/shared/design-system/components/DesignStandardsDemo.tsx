/**
 * Design Standards Demo Component
 * Demonstrates all component design standards in action
 */

import React, { useState } from 'react';
import './design-standards.css';

interface DesignStandardsDemoProps {
  className?: string;
}

export const DesignStandardsDemo: React.FC<DesignStandardsDemoProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleErrorDemo = () => {
    setShowError(!showError);
  };

  const handleEmptyDemo = () => {
    setShowEmpty(!showEmpty);
  };

  return (
    <div className={`chanuka-design-demo ${className}`}>
      <div className="chanuka-typography">
        <h1 className="chanuka-heading-h1">Design Standards Demo</h1>
        <p className="chanuka-body-large">
          This component demonstrates all the design standards implemented for consistent UI/UX.
        </p>
      </div>

      {/* Interactive States Section */}
      <section className="demo-section">
        <h2 className="chanuka-heading-h2">Interactive States</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Buttons</h3>
            <div className="button-group">
              <button className="chanuka-btn chanuka-btn-primary chanuka-btn-md chanuka-interactive-button">
                Primary Button
              </button>
              <button className="chanuka-btn chanuka-btn-primary chanuka-btn-md chanuka-interactive-button" disabled>
                Disabled Button
              </button>
              <button 
                className="chanuka-btn chanuka-btn-primary chanuka-btn-md chanuka-interactive-button"
                data-loading={isLoading}
                onClick={handleLoadingDemo}
              >
                {isLoading ? (
                  <>
                    <span className="chanuka-spinner chanuka-spinner-small"></span>
                    Loading...
                  </>
                ) : (
                  'Test Loading'
                )}
              </button>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Cards</h3>
            <div className="card-group">
              <div className="chanuka-card chanuka-card-default chanuka-card-md chanuka-interactive-card" tabIndex={0}>
                <div style={{ padding: '1rem' }}>
                  <h4 className="chanuka-heading-h4">Interactive Card</h4>
                  <p className="chanuka-body-default">Hover, focus, and click to see states</p>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Inputs</h3>
            <div className="input-group">
              <input 
                className="chanuka-input chanuka-input-default chanuka-input-md chanuka-interactive-input"
                placeholder="Interactive input field"
              />
              <input 
                className="chanuka-input chanuka-input-default chanuka-input-md chanuka-input-error"
                placeholder="Error state input"
              />
              <input 
                className="chanuka-input chanuka-input-default chanuka-input-md"
                placeholder="Disabled input"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      {/* Loading States Section */}
      <section className="demo-section">
        <h2 className="chanuka-heading-h2">Loading States</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Spinners</h3>
            <div className="spinner-group">
              <span className="chanuka-spinner chanuka-spinner-small"></span>
              <span className="chanuka-spinner chanuka-spinner-medium"></span>
              <span className="chanuka-spinner chanuka-spinner-large"></span>
              <span className="chanuka-spinner chanuka-spinner-xlarge"></span>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Progress Bar</h3>
            <div className="progress-group">
              <div className="chanuka-progress-bar">
                <div className="chanuka-progress-fill" style={{ width: '65%' }}></div>
              </div>
              <div className="chanuka-progress-bar">
                <div className="chanuka-progress-indeterminate"></div>
              </div>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Skeleton Screens</h3>
            <div className="skeleton-group">
              <div className="chanuka-skeleton" style={{ height: '1.5em', width: '60%', marginBottom: '0.5rem' }}></div>
              <div className="chanuka-skeleton" style={{ height: '1em', width: '100%', marginBottom: '0.25rem' }}></div>
              <div className="chanuka-skeleton" style={{ height: '1em', width: '80%', marginBottom: '0.25rem' }}></div>
              <div className="chanuka-skeleton" style={{ height: '40px', width: '120px', borderRadius: '0.5rem' }}></div>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Loading Overlay</h3>
            <div style={{ position: 'relative', height: '200px', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
              <div style={{ padding: '1rem' }}>
                <h4 className="chanuka-heading-h4">Content Area</h4>
                <p className="chanuka-body-default">This content would be covered by loading overlay</p>
              </div>
              {isLoading && (
                <div className="chanuka-loading-overlay">
                  <span className="chanuka-spinner chanuka-spinner-large"></span>
                  <span className="chanuka-body-small">Loading content...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Error States Section */}
      <section className="demo-section">
        <h2 className="chanuka-heading-h2">Error States</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Error Severities</h3>
            <div className="error-group">
              <div className="chanuka-error chanuka-error-info">
                <div className="chanuka-error-content">
                  <div className="chanuka-error-title">Information</div>
                  <div className="chanuka-error-description">This is an informational message.</div>
                </div>
              </div>
              
              <div className="chanuka-error chanuka-error-warning">
                <div className="chanuka-error-content">
                  <div className="chanuka-error-title">Warning</div>
                  <div className="chanuka-error-description">This is a warning message.</div>
                </div>
              </div>
              
              <div className="chanuka-error chanuka-error-error">
                <div className="chanuka-error-content">
                  <div className="chanuka-error-title">Error</div>
                  <div className="chanuka-error-description">This is an error message.</div>
                  <div className="chanuka-error-actions">
                    <button className="chanuka-error-action-primary" onClick={handleErrorDemo}>
                      Retry
                    </button>
                    <button className="chanuka-error-action-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Inline Errors</h3>
            <div className="inline-error-group">
              <input 
                className="chanuka-input chanuka-input-default chanuka-input-md chanuka-input-error"
                placeholder="Invalid input"
              />
              <div className="chanuka-error-inline" role="alert" aria-live="polite">
                <span className="chanuka-error-inline-icon">⚠️</span>
                <span className="chanuka-error-inline-message">This field is required</span>
              </div>
            </div>
          </div>

          {showError && (
            <div className="demo-item">
              <h3 className="chanuka-heading-h3">Error Boundary</h3>
              <div className="chanuka-error-boundary">
                <div className="chanuka-error-boundary-icon">💥</div>
                <div className="chanuka-error-boundary-title">Something went wrong</div>
                <div className="chanuka-error-boundary-description">
                  An unexpected error occurred. Please try again or contact support if the problem persists.
                </div>
                <div className="chanuka-error-actions">
                  <button className="chanuka-error-action-primary" onClick={handleErrorDemo}>
                    Try Again
                  </button>
                  <button className="chanuka-error-action-secondary">
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Empty States Section */}
      <section className="demo-section">
        <h2 className="chanuka-heading-h2">Empty States</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3 className="chanuka-heading-h3">No Data</h3>
            <div className="chanuka-empty-state chanuka-empty-compact chanuka-empty-dashboard">
              <div className="chanuka-empty-icon">📊</div>
              <div className="chanuka-empty-content">
                <div className="chanuka-empty-title">No data available</div>
                <div className="chanuka-empty-description">There is no data to display at the moment.</div>
                <div className="chanuka-empty-suggestion">Try refreshing the page or check back later.</div>
                <div className="chanuka-empty-actions">
                  <button className="chanuka-empty-action-primary">
                    Refresh Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">No Search Results</h3>
            <div className="chanuka-empty-state chanuka-empty-compact chanuka-empty-dashboard">
              <div className="chanuka-empty-icon">🔍</div>
              <div className="chanuka-empty-content">
                <div className="chanuka-empty-title">No results found</div>
                <div className="chanuka-empty-description">We couldn't find anything matching your search.</div>
                <div className="chanuka-empty-suggestion">Try adjusting your search terms or filters.</div>
                <div className="chanuka-empty-actions">
                  <button className="chanuka-empty-action-primary">
                    Clear Filters
                  </button>
                  <button className="chanuka-empty-action-secondary">
                    New Search
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showEmpty && (
            <div className="demo-item">
              <h3 className="chanuka-heading-h3">No Items</h3>
              <div className="chanuka-empty-state chanuka-empty-standard chanuka-empty-page">
                <div className="chanuka-empty-icon">📝</div>
                <div className="chanuka-empty-content">
                  <div className="chanuka-empty-title">No items yet</div>
                  <div className="chanuka-empty-description">You haven't added any items to this collection.</div>
                  <div className="chanuka-empty-suggestion">Get started by adding your first item.</div>
                  <div className="chanuka-empty-actions">
                    <button className="chanuka-empty-action-primary" onClick={handleEmptyDemo}>
                      Add First Item
                    </button>
                    <button className="chanuka-empty-action-secondary">
                      Learn More
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Typography Section */}
      <section className="demo-section">
        <h2 className="chanuka-heading-h2">Typography</h2>
        <div className="demo-grid">
          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Headings</h3>
            <div className="typography-group">
              <h1 className="chanuka-heading-h1">Heading 1</h1>
              <h2 className="chanuka-heading-h2">Heading 2</h2>
              <h3 className="chanuka-heading-h3">Heading 3</h3>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Body Text</h3>
            <div className="typography-group">
              <p className="chanuka-body-large">Large body text for important content</p>
              <p className="chanuka-body-default">Default body text for regular content</p>
              <p className="chanuka-body-small">Small body text for secondary information</p>
            </div>
          </div>

          <div className="demo-item">
            <h3 className="chanuka-heading-h3">Links & Code</h3>
            <div className="typography-group">
              <p className="chanuka-body-default">
                This is a <a href="#" className="chanuka-link-default">default link</a> in text.
              </p>
              <p className="chanuka-body-default">
                Here's some <code className="chanuka-specialized-code">inline code</code> example.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Controls */}
      <section className="demo-section">
        <h2 className="chanuka-heading-h2">Demo Controls</h2>
        <div className="demo-controls">
          <button 
            className="chanuka-btn chanuka-btn-primary chanuka-btn-md chanuka-interactive-button"
            onClick={handleLoadingDemo}
          >
            Toggle Loading Demo
          </button>
          <button 
            className="chanuka-btn chanuka-btn-primary chanuka-btn-md chanuka-interactive-button"
            onClick={handleErrorDemo}
          >
            Toggle Error Demo
          </button>
          <button 
            className="chanuka-btn chanuka-btn-primary chanuka-btn-md chanuka-interactive-button"
            onClick={handleEmptyDemo}
          >
            Toggle Empty Demo
          </button>
        </div>
      </section>
    </div>
  );
};

export default DesignStandardsDemo;

