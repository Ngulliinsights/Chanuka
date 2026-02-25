/**
 * USSD Service
 * 
 * Core service for handling USSD sessions and requests
 * Provides universal access to legislative information via feature phones
 */

import { logger } from '@server/infrastructure/observability';
import type { USSDSession, USSDResponse, USSDRequest, USSDLanguage } from './ussd.types';
import { USSD_CONFIG, USSD_MENUS } from './ussd.config';

export class USSDService {
  private sessions: Map<string, USSDSession> = new Map();
  private readonly sessionTimeout = USSD_CONFIG.sessionTimeout * 1000;

  /**
   * Process incoming USSD request
   */
  async processRequest(request: USSDRequest): Promise<USSDResponse> {
    const logContext = { component: 'USSDService', operation: 'processRequest', sessionId: request.sessionId };
    logger.info(logContext, 'Processing USSD request');

    try {
      // Get or create session
      let session = this.getSession(request.sessionId);
      if (!session) {
        session = this.createSession(request);
      } else {
        session = this.updateSession(session, request);
      }

      // Parse user input
      const userInput = this.parseInput(request.text);

      // Handle request based on current menu and input
      const response = await this.handleInput(session, userInput);

      // Save session if continuing
      if (response.continueSession) {
        this.saveSession(session);
      } else {
        this.endSession(request.sessionId);
      }

      logger.info({ ...logContext, continueSession: response.continueSession }, 'USSD request processed');
      return response;
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error processing USSD request');
      return {
        message: 'END Service temporarily unavailable. Please try again later.',
        continueSession: false
      };
    }
  }

  /**
   * Create new USSD session
   */
  private createSession(request: USSDRequest): USSDSession {
    const session: USSDSession = {
      sessionId: request.sessionId,
      phoneNumber: request.phoneNumber,
      serviceCode: request.serviceCode,
      text: request.text,
      language: USSD_CONFIG.defaultLanguage,
      currentMenu: 'main',
      menuHistory: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    logger.debug({ component: 'USSDService', sessionId: request.sessionId }, 'Created new USSD session');
    return session;
  }

  /**
   * Update existing session
   */
  private updateSession(session: USSDSession, request: USSDRequest): USSDSession {
    return {
      ...session,
      text: request.text,
      lastActivity: new Date()
    };
  }

  /**
   * Get session from store
   */
  private getSession(sessionId: string): USSDSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Check if session has expired
      const now = Date.now();
      const lastActivity = session.lastActivity.getTime();
      if (now - lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        return undefined;
      }
    }
    return session;
  }

  /**
   * Save session to store
   */
  private saveSession(session: USSDSession): void {
    this.sessions.set(session.sessionId, session);
  }

  /**
   * End session and cleanup
   */
  private endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.debug({ component: 'USSDService', sessionId }, 'Ended USSD session');
  }

  /**
   * Parse user input from USSD text
   */
  private parseInput(text: string): string {
    if (!text) return '';
    const parts = text.split('*');
    return parts[parts.length - 1] || '';
  }

  /**
   * Handle user input based on current menu
   */
  private async handleInput(session: USSDSession, input: string): Promise<USSDResponse> {
    // First request - show main menu
    if (!input) {
      return this.showMenu(session, 'main');
    }

    // Get current menu
    const currentMenu = USSD_MENUS[session.currentMenu];
    if (!currentMenu) {
      return this.showMenu(session, 'main');
    }

    // Find selected option
    const selectedOption = currentMenu.options.find(opt => opt.key === input);
    if (!selectedOption) {
      return {
        message: `CON Invalid option. Please try again.\n\n${this.renderMenu(currentMenu, session.language)}`,
        continueSession: true
      };
    }

    // Handle option action
    switch (selectedOption.action) {
      case 'navigate':
        if (selectedOption.target) {
          session.menuHistory.push(session.currentMenu);
          session.currentMenu = selectedOption.target;
          return this.showMenu(session, selectedOption.target);
        }
        break;

      case 'execute':
        if (selectedOption.handler) {
          return await this.executeHandler(session, selectedOption.handler);
        }
        break;

      case 'input':
        return {
          message: `CON ${selectedOption.label}:\nEnter your search term:`,
          continueSession: true
        };
    }

    return this.showMenu(session, 'main');
  }

  /**
   * Show menu to user
   */
  private showMenu(session: USSDSession, menuId: string): USSDResponse {
    const menu = USSD_MENUS[menuId];
    if (!menu) {
      return {
        message: 'END Menu not found',
        continueSession: false
      };
    }

    const message = this.renderMenu(menu, session.language);
    return {
      message: `CON ${message}`,
      continueSession: true,
      sessionId: session.sessionId
    };
  }

  /**
   * Render menu as text
   */
  private renderMenu(menu: { title: string; options: Array<{ key: string; label: string }> }, language: USSDLanguage): string {
    const title = this.translate(menu.title, language);
    const options = menu.options
      .map(opt => `${opt.key}. ${this.translate(opt.label, language)}`)
      .join('\n');
    return `${title}\n${options}`;
  }

  /**
   * Execute handler function
   */
  private async executeHandler(session: USSDSession, handler: string): Promise<USSDResponse> {
    const logContext = { component: 'USSDService', operation: 'executeHandler', handler };
    logger.debug(logContext, 'Executing handler');

    try {
      // Parse handler and params
      const [handlerName, ...params] = handler.split(':');

      switch (handlerName) {
        case 'getLatestBills':
          return await this.getLatestBills(session);

        case 'setLanguage':
          return this.setLanguage(session, params[0] as USSDLanguage);

        case 'showHelp':
          return this.showHelp(session);

        case 'showAbout':
          return this.showAbout(session);

        case 'showContact':
          return this.showContact(session);

        case 'subscribeAlerts':
          return this.subscribeAlerts(session);

        case 'unsubscribeAlerts':
          return this.unsubscribeAlerts(session);

        case 'getMyAlerts':
          return this.getMyAlerts(session);

        default:
          logger.warn({ ...logContext, handler }, 'Unknown handler');
          return {
            message: 'END Feature not yet available',
            continueSession: false
          };
      }
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error executing handler');
      return {
        message: 'END An error occurred. Please try again.',
        continueSession: false
      };
    }
  }

  /**
   * Get latest bills
   */
  private async getLatestBills(session: USSDSession): Promise<USSDResponse> {
    // TODO: Integrate with bills service
    const message = this.translate('Latest Bills', session.language) + ':\n' +
      '1. Finance Bill 2024\n' +
      '2. Health Act Amendment\n' +
      '3. Education Reform Bill\n\n' +
      this.translate('Enter bill number for details or 0 to go back', session.language);

    return {
      message: `CON ${message}`,
      continueSession: true
    };
  }

  /**
   * Set user language preference
   */
  private setLanguage(session: USSDSession, language: USSDLanguage): USSDResponse {
    session.language = language;
    const message = this.translate('Language updated successfully', language);
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Show help information
   */
  private showHelp(session: USSDSession): USSDResponse {
    const message = this.translate(
      'Dial *384*96# to access legislative info. Navigate using numbers. Press 0 to go back.',
      session.language
    );
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Show about information
   */
  private showAbout(session: USSDSession): USSDResponse {
    const message = this.translate(
      'Chanuka: Empowering citizens with legislative transparency. Track bills, contact MPs, stay informed.',
      session.language
    );
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Show contact information
   */
  private showContact(session: USSDSession): USSDResponse {
    const message = this.translate(
      'Contact: info@chanuka.ke\nSMS: 0700123456\nWeb: chanuka.ke',
      session.language
    );
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Subscribe to SMS alerts
   */
  private subscribeAlerts(session: USSDSession): USSDResponse {
    // TODO: Integrate with notification service
    const message = this.translate(
      'You have been subscribed to SMS alerts. You will receive updates on bills and legislative activities.',
      session.language
    );
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Unsubscribe from SMS alerts
   */
  private unsubscribeAlerts(session: USSDSession): USSDResponse {
    const message = this.translate(
      'You have been unsubscribed from SMS alerts.',
      session.language
    );
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Get user's alert subscriptions
   */
  private getMyAlerts(session: USSDSession): USSDResponse {
    const message = this.translate(
      'Your Alerts:\n1. Finance Bill updates\n2. Health sector bills\n\nYou will receive SMS when these bills are updated.',
      session.language
    );
    return {
      message: `END ${message}`,
      continueSession: false
    };
  }

  /**
   * Translate text to user's language
   */
  private translate(text: string, _language: USSDLanguage): string {
    // TODO: Implement proper i18n
    // For now, return English text
    return text;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = session.lastActivity.getTime();
      if (now - lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({ component: 'USSDService', cleaned }, 'Cleaned up expired sessions');
    }
  }
}

// Export singleton instance
export const ussdService = new USSDService();

// Start cleanup interval
setInterval(() => {
  ussdService.cleanupExpiredSessions();
}, 60000); // Every minute
