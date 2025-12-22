/**
 * Integration Hook
 */

import { useContext } from 'react';

import { IntegrationContext } from '../context/IntegrationContext';

export function useIntegration() {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegration must be used within IntegrationProvider');
  }
  return context;
}