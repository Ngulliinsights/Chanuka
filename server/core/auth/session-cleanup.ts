import { authService } from './auth-service.js';

export class SessionCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the session cleanup service
   * Runs cleanup every hour by default
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.log('Session cleanup service is already running');
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
    console.log('🛑 Session cleanup service stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      console.log('🧹 Running session cleanup...');
      await authService.cleanupExpiredTokens();
      console.log('✅ Session cleanup completed');
    } catch (error) {
      console.error('❌ Session cleanup failed:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; nextCleanup?: Date } {
    return {
      isRunning: this.isRunning,
      nextCleanup: this.cleanupInterval ? new Date(Date.now() + 60 * 60 * 1000) : undefined
    };
  }
}

export const sessionCleanupService = new SessionCleanupService();