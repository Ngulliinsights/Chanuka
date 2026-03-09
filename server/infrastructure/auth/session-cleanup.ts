import { authService } from '@server/infrastructure/auth/auth-service';
import { logger } from '@server/infrastructure/observability';

export class SessionCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the session cleanup service
   * Runs cleanup every hour by default
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      logger.info({ component: 'Chanuka' }, 'Session cleanup service is already running');
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
    logger.info({ component: 'Chanuka' }, '🛑 Session cleanup service stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      logger.info({ component: 'Chanuka' }, '🧹 Running session cleanup...');
      await authService.cleanupExpiredTokens();
      logger.info({ component: 'Chanuka' }, '✅ Session cleanup completed');
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







































