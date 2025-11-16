import { authService } from './auth-service.js';
import { logger  } from '../../../shared/core/src/index.js';

export class SessionCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the session cleanup service
   * Runs cleanup every hour by default
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      logger.info('Session cleanup service is already running', { component: 'Chanuka' });
      return;
    }

    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`🧹 Starting session cleanup service (runs every ${intervalMinutes} minutes)`);

    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule regular cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
  }

  /**
   * Stop the session cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    logger.info('🛑 Session cleanup service stopped', { component: 'Chanuka' });
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      logger.info('🧹 Running session cleanup...', { component: 'Chanuka' });
      await authService.cleanupExpiredTokens();
      logger.info('✅ Session cleanup completed', { component: 'Chanuka' });
    } catch (error) {
      logger.error('❌ Session cleanup failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; nextCleanup?: Date } {
    const status: { isRunning: boolean; nextCleanup?: Date } = {
      isRunning: this.isRunning
    };
    if (this.cleanupInterval) {
      status.nextCleanup = new Date(Date.now() + 60 * 60 * 1000);
    }
    return status;
  }
}

export const sessionCleanupService = new SessionCleanupService();






































