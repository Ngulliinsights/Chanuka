
            const { createCacheService } = require('@Chanuka/core/cache');
            const { Logger } = require('@Chanuka/core/logging');
            
            // Test cache
            const cache = createCacheService({
              provider: 'memory',
              maxMemoryMB: 10,
              enableMetrics: true
            });
            
            // Test logger
            const logger = new Logger({ level: 'info' });
            
            logger.info('Core utilities test passed', { component: 'Chanuka' });
          