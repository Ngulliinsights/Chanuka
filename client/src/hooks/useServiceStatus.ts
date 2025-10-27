import { useState, useEffect } from 'react';
import { serviceRecovery } from '../utils/service-recovery';

interface ServiceStatus {
  isOnline: boolean;
  lastFailure: Date | null;
  consecutiveFailures: number;
  failedRequestsCount: number;
  totalFailures: number;
}

export function useServiceStatus() {
  const [status, setStatus] = useState<ServiceStatus>(serviceRecovery.getServiceStatus());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(serviceRecovery.getServiceStatus());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const isHealthy = await serviceRecovery.performHealthCheck();
      if (isHealthy) {
        serviceRecovery.resetServiceStatus();
      }
      setStatus(serviceRecovery.getServiceStatus());
      return isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const resetStatus = () => {
    serviceRecovery.resetServiceStatus();
    setStatus(serviceRecovery.getServiceStatus());
  };

  return {
    status,
    isChecking,
    checkHealth,
    resetStatus,
    isOnline: status.isOnline
  };
}