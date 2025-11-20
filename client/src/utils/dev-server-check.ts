/**
 * Development Server Connection Check
 * Provides graceful handling when backend services are unavailable
 */

export class DevServerCheck {
  private static readonly SERVER_URL = 'http://localhost:3000';
  private static readonly WEBSOCKET_URL = 'ws://localhost:8080';
  
  static async checkServerConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.SERVER_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async checkWebSocketConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(this.WEBSOCKET_URL);
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  static showConnectionWarning(): void {
    if (import.meta.env.DEV) {
      console.warn(
        '🔧 Development Notice: Backend services are not running.\n' +
        'The app will use mock data. To connect to real services:\n' +
        '1. Start the server: npm run dev:server\n' +
        '2. Start WebSocket service: npm run dev:websocket'
      );
    }
  }
}