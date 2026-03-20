/**
 * useApiDocumentation Hook
 * Integrates API documentation service with React component lifecycle
 */
import { useQuery } from '@tanstack/react-query';
import { apiDocumentationService } from '../services/api-documentation';
import type { ApiDocumentation } from '../types';

export const useApiDocumentation = () => {
  return useQuery({
    queryKey: ['api-documentation'],
    queryFn: () => apiDocumentationService.fetchDocumentation(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useEndpointDetails = (endpoint: string) => {
  return useQuery({
    queryKey: ['api-endpoint', endpoint],
    queryFn: () => apiDocumentationService.getEndpointDetails(endpoint),
    enabled: !!endpoint,
    staleTime: 1000 * 60 * 60,
  });
};
