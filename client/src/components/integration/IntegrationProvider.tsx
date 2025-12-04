/**
 * Integration Provider Component
 * 
 * Provides seamless integration context for the entire application,
 * handling initialization, error states, and fallback modes.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { seamlessIntegration } from '../../adapters/seamless-shared-integration';
import { logger } from '../../utils/logger';

interface IntegrationContextValue {
  initialized: boolean;
  loading: boolean;
  error: Error | null;
  sharedAvailable: boolean;
  integrationMode: 'hybrid' | 'client-only' | 'loading';
  retry: () => Promise<void>;
}

const IntegrationContext = createContext<IntegrationContextValue | null>(null);

interface IntegrationProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function IntegrationProvider({ children, fallback }: IntegrationProviderProps) {
  const [state, setState] = useState<Omit<IntegrationContextValue, 'retry'>>({
    initialized: false,
    loading: true,
    error: null,
    sharedAvailable: false,
    integrationMode: 'loading'
  });

  const initialize = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await seamlessIntegration.initialize();
      const status = seamlessIntegration.getStatus();
      
      setState({
        initialized: status.initialized,
        loading: false,
        error: null,
        sharedAvailable: status.sharedModulesAvailable,
        integrationMode: status.integrationMode as 'hybrid' | 'client-only'
      });
      
      logger.info('Integration provider initialized', status);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Integration failed');
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        integrationMode: 'client-only'
      }));
      
      logger.error('Integration provider initialization failed', { error: err });
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  const contextValue: IntegrationContextValue = {
    ...state,
    retry: initialize
  };

  // Show fallback while loading if provided
  if (state.loading && fallback) {
    return <>{fallback}</>;
  }

  return (
    <IntegrationContext.Provider value={contextValue}>
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegrationContext(): IntegrationContextValue {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrationContext must be used within an IntegrationProvider');
  }
  return context;
}

/**
 * Integration Status Component
 * Shows the current integration status in development mode
 */
export function IntegrationStatus() {
  const { initialized, sharedAvailable, integrationMode, error } = useIntegrationContext();
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const statusColor = error ? 'red' : sharedAvailable ? 'green' : 'orange';
  const statusText = error ? 'Error' : sharedAvailable ? 'Enhanced' : 'Basic';

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace'
      }}
    >
      <div style={{ color: statusColor }}>
        ● {statusText} Mode
      </div>
      <div style={{ fontSize: '10px', opacity: 0.7 }}>
        {integrationMode} | {initialized ? 'Ready' : 'Loading'}
      </div>
      {error && (
        <div style={{ fontSize: '10px', color: 'red', marginTop: '4px' }}>
          {error.message}
        </div>
      )}
    </div>
  );
}

export default IntegrationProvider;