import React, { useEffect, useState } from 'react';
import { serviceRecovery } from '../../utils/service-recovery';

interface ServiceUnavailableProps {
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export const ServiceUnavailable: React.FC<ServiceUnavailableProps> = ({
  onRetry,
  showRetryButton = true
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceStatus, setServiceStatus] = useState(serviceRecovery.getServiceStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setServiceStatus(serviceRecovery.getServiceStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const isHealthy = await serviceRecovery.performHealthCheck();
      if (isHealthy) {
        serviceRecovery.resetServiceStatus();
        onRetry?.();
        // Reload the page to restore full functionality
        window.location.reload();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg 
              className="w-8 h-8 text-yellow-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Service Temporarily Unavailable
          </h1>
          <p className="text-gray-600 mb-4">
            The Chanuka Legislative Transparency Platform is currently experiencing technical difficulties. 
            We're working to restore service as quickly as possible.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Service Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`font-medium ${serviceStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {serviceStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Failed Requests:</span>
              <span className="font-medium text-gray-900">{serviceStatus.totalFailures}</span>
            </div>
            {serviceStatus.lastFailure && (
              <div className="flex justify-between">
                <span>Last Failure:</span>
                <span className="font-medium text-gray-900">
                  {new Date(serviceStatus.lastFailure).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {showRetryButton && (
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRetrying ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking Service...
                </div>
              ) : (
                `Try Again ${retryCount > 0 ? `(${retryCount})` : ''}`
              )}
            </button>
            
            <p className="text-xs text-gray-500">
              The service will automatically retry in the background. 
              You can also refresh the page manually.
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If the problem persists, please contact support or try again later.
          </p>
        </div>
      </div>
    </div>
  );
};