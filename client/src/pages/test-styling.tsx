import React from 'react';

export default function TestStyling() {
  return (
    <div>
      {/* Test with inline styles first */}
      <div style={{ 
        padding: '2rem', 
        backgroundColor: '#f3f4f6', 
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#1f2937'
        }}>
          Styling Test Page
        </h1>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '1rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Inline Styles Test
          </h2>
          <p style={{ color: '#6b7280' }}>
            This should be styled with inline styles and should always work.
          </p>
        </div>

        {/* Test with Tailwind classes */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-4">
          <h2 className="text-xl font-semibold mb-2">Tailwind CSS Test</h2>
          <p className="text-gray-600">
            This should be styled with Tailwind CSS classes. If you see styling here, Tailwind is working.
          </p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            Tailwind Button
          </button>
        </div>

        {/* Test with custom CSS classes */}
        <div className="test-custom-styles">
          <h2>Custom CSS Test</h2>
          <p>This tests if custom CSS classes are working.</p>
        </div>
      </div>

      <style>{`
        .test-custom-styles {
          background-color: #fef3c7;
          padding: 1.5rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        .test-custom-styles h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #92400e;
        }
        .test-custom-styles p {
          color: #a16207;
        }
      `}</style>
    </div>
  );
}