import { useState, useEffect, useCallback } from 'react';

import { serviceRecovery } from '@client/shared/utils/service-recovery';

// Define local ServiceStatus interface for this hook
interface ServiceStatus {
  isAvailable: boolean;
  lastFailure: Date | null;
  consecutiveFailures: number;
  failedRequestsCount: number;
  totalFailures: number;
}

// Create a default status for when the service hasn't been tracked yet
// This provides a clean initial state before any failures occur
const DEFAULT_STATUS: ServiceStatus = {
  isAvailable: true,
  lastFailure: null,
  consecutiveFailures: 0,
  failedRequestsCount: 0,
  totalFailures: 0,
};

/**
 * Custom hook for monitoring and managing service health status
 *
 * This hook provides real-time tracking of a service's health by polling
 * the service recovery utility every 5 seconds. It gives you both the current
 * status and functions to manually check health or reset tracking.
 *
 * @param serviceName - The unique identifier for the service to monitor
 * @returns Status information and control functions for the service
 */
export function useServiceStatus(serviceName: string) {
  // Initialize state with current status or default if service not tracked yet
  // We use a function initializer to avoid unnecessary calls on re-renders
  const [status, setStatus] = useState<ServiceStatus>(() => {
    const currentStatus = serviceRecovery.getServiceStatus(serviceName);
    if (currentStatus !== null) {
      // Map the service recovery status to our local ServiceStatus
      return {
        isAvailable: currentStatus.isAvailable,
        lastFailure: currentStatus.error ? new Date(currentStatus.lastChecked) : null,
        consecutiveFailures: currentStatus.error ? 1 : 0, // Simplified
        failedRequestsCount: currentStatus.error ? 1 : 0, // Simplified
        totalFailures: currentStatus.error ? 1 : 0, // Simplified
      };
    }
    return DEFAULT_STATUS;
  });

  const [isChecking, setIsChecking] = useState(false);

  // Set up periodic polling to keep the UI in sync with service recovery state
  // This ensures the component reflects the latest status even if it changes
  // due to API calls happening elsewhere in your application
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = serviceRecovery.getServiceStatus(serviceName);
      // Only update if we got a valid status back to avoid unnecessary re-renders
      if (currentStatus !== null) {
        // Map the service recovery status to our local ServiceStatus
        const mappedStatus: ServiceStatus = {
          isAvailable: currentStatus.isAvailable,
          lastFailure: currentStatus.error ? new Date(currentStatus.lastChecked) : null,
          consecutiveFailures: currentStatus.error ? 1 : 0, // Simplified
          failedRequestsCount: currentStatus.error ? 1 : 0, // Simplified
          totalFailures: currentStatus.error ? 1 : 0, // Simplified
        };
        setStatus(mappedStatus);
      }
    }, 5000); // Poll every 5 seconds to keep UI in sync

    return () => clearInterval(interval);
  }, [serviceName]); // Re-run if service name changes

  /**
   * Manually trigger a health check for this service
   *
   * This function calls your backend health endpoint to verify the service
   * is operational. If healthy, it refreshes the status from the recovery utility.
   * The checking state is managed automatically to provide loading feedback.
   */
  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      // Make a request to your health check endpoint
      // Adjust this URL to match your actual API structure
      const response = await fetch(`/api/health/${serviceName}`);
      const isHealthy = response.ok;

      if (isHealthy) {
        // Service is healthy, refresh our local state from the recovery utility
        const updatedStatus = serviceRecovery.getServiceStatus(serviceName);
        if (updatedStatus !== null) {
          // Map the service recovery status to our local ServiceStatus
          const mappedStatus: ServiceStatus = {
            isAvailable: updatedStatus.isAvailable,
            lastFailure: updatedStatus.error ? new Date(updatedStatus.lastChecked) : null,
            consecutiveFailures: updatedStatus.error ? 1 : 0,
            failedRequestsCount: updatedStatus.error ? 1 : 0,
            totalFailures: updatedStatus.error ? 1 : 0,
          };
          setStatus(mappedStatus);
        }
      }

      return isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [serviceName]);

  /**
   * Reset the status tracking for this service
   *
   * This refreshes the local state with the current status from the
   * service recovery utility. Useful after resolving issues or when
   * you want to force a state synchronization.
   */
  const resetStatus = useCallback(() => {
    const currentStatus = serviceRecovery.getServiceStatus(serviceName);
    if (currentStatus !== null) {
      // Map the service recovery status to our local ServiceStatus
      const mappedStatus: ServiceStatus = {
        isAvailable: currentStatus.isAvailable,
        lastFailure: currentStatus.error ? new Date(currentStatus.lastChecked) : null,
        consecutiveFailures: currentStatus.error ? 1 : 0,
        failedRequestsCount: currentStatus.error ? 1 : 0,
        totalFailures: currentStatus.error ? 1 : 0,
      };
      setStatus(mappedStatus);
    } else {
      setStatus(DEFAULT_STATUS);
    }
  }, [serviceName]);

  return {
    status,
    isChecking,
    checkHealth,
    resetStatus,
    // Convenience property for quick online/offline checks in your components
    isOnline: status.isAvailable,
  };
}
