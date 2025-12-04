/**
 * Service Hook for Dependency Injection
 * 
 * Provides a React hook interface to the service registry
 * for clean dependency injection in components.
 */

import { useEffect, useState } from 'react';

import { globalServiceLocator } from '@client/core/api/registry';
import { ApiService } from '@client/core/api/types';
import { logger } from '@client/utils/logger';

/**
 * Hook to get a service from the registry
 */
export function useService<T extends ApiService>(serviceName: string): T | null {
  const [service, setService] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadService = async () => {
      try {
        const serviceInstance = await globalServiceLocator.getService<T>(serviceName);
        
        if (mounted) {
          setService(serviceInstance);
          setError(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load service');
        
        if (mounted) {
          setError(error);
          setService(null);
        }

        logger.error('Failed to load service', {
          component: 'useService',
          serviceName,
          error: error.message
        });
      }
    };

    loadService();

    return () => {
      mounted = false;
    };
  }, [serviceName]);

  if (error) {
    throw error; // Let error boundary handle this
  }

  return service;
}

/**
 * Hook to get multiple services from the registry
 */
export function useServices<T extends Record<string, ApiService>>(
  serviceNames: Record<keyof T, string>
): T | null {
  const [services, setServices] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadServices = async () => {
      try {
        const servicePromises = Object.entries(serviceNames).map(
          async ([key, serviceName]) => {
            const service = await globalServiceLocator.getService(serviceName as string);
            return [key, service];
          }
        );

        const serviceEntries = await Promise.all(servicePromises);
        const loadedServices = Object.fromEntries(serviceEntries) as T;

        if (mounted) {
          setServices(loadedServices);
          setError(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load services');
        
        if (mounted) {
          setError(error);
          setServices(null);
        }

        logger.error('Failed to load services', {
          component: 'useServices',
          serviceNames: Object.values(serviceNames),
          error: error.message
        });
      }
    };

    loadServices();

    return () => {
      mounted = false;
    };
  }, [serviceNames]);

  if (error) {
    throw error; // Let error boundary handle this
  }

  return services;
}

/**
 * Hook to check if a service is available
 */
export function useServiceAvailable(serviceName: string): boolean {
  return globalServiceLocator.hasService(serviceName);
}

/**
 * Hook to get service health status
 */
export function useServiceHealth() {
  const [health, setHealth] = useState<Record<string, any>>({});

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthStatus = await globalServiceLocator.getRegistry().getServiceHealth();
        setHealth(healthStatus);
      } catch (error) {
        logger.error('Failed to check service health', {
          component: 'useServiceHealth',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    checkHealth();

    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return health;
}