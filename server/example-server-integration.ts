/**
 * Example Server Integration
 * 
 * This file shows how to integrate the new initialization system
 * into your main server file (index.ts)
 */

// Add this to the top of your server/index.ts file, after the diagnostic logging
// but before importing other services

import { initializeServer, setupGracefulShutdown } from './server-startup.js';

// Replace direct service imports with initialization-based access
// Instead of:
// import { validationMetricsCollector } from './core/validation/validation-metrics.js';

// Use:
import { serverValidationServices } from './core/services-init.js';

// Example of how to modify your server startup:
async function startApplication() {
  try {
    console.log('🔍 DIAGNOSTIC: Server startup initiated');
    
    // Setup graceful shutdown handlers first
    setupGracefulShutdown();
    
    // Initialize all services in proper order
    await initializeServer();
    
    // Now services are available through containers
    const validationServices = serverValidationServices.container;
    console.log('✅ Validation services initialized:', {
      metricsCollector: !!validationServices.metricsCollector,
      inputValidation: !!validationServices.inputValidation,
      schemaValidation: !!validationServices.schemaValidation,
      dataIntegrityValidation: !!validationServices.dataIntegrityValidation,
      dataCompleteness: !!validationServices.dataCompleteness
    });
    
    // Continue with Express app setup...
    // Your existing middleware and route setup code goes here
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('✅ All services initialized and ready');
    });
    
    return server;
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Example of accessing services in middleware or routes:
function exampleMiddleware(req: any, res: any, next: any) {
  // Access validation services through the container
  const metricsCollector = serverValidationServices.metricsCollector;
  
  metricsCollector.recordMetric({
    service: 'ExampleMiddleware',
    operation: 'request_processing',
    duration: 0,
    success: true,
    metadata: {
      path: req.path,
      method: req.method
    }
  });
  
  next();
}

// Example of using services in route handlers:
app.get('/api/validation/health', async (req, res) => {
  try {
    const validationServices = serverValidationServices.container;
    
    // Use the services
    const healthStatus = await validationServices.metricsCollector.getHealthStatus();
    
    res.json({
      status: 'success',
      data: healthStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get validation health status'
    });
  }
});

// Start the application
if (require.main === module) {
  startApplication();
}

export { startApplication };