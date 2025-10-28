/**
 * Navigation Service Abstraction
 *
 * Provides a mockable interface over browser navigation APIs to enable
 * reliable testing of navigation flows without encountering JSDOM limitations.
 */

export interface NavigationService {
  /**
   * Reloads the current page
   */
  reload(): void;

  /**
   * Navigates to a new path
   * @param path - The path to navigate to
   */
  navigate(path: string): void;

  /**
   * Goes back in history
   */
  goBack(): void;

  /**
   * Replaces the current history entry with a new path
   * @param path - The path to replace with
   */
  replace(path: string): void;

  /**
   * Gets the current location information
   * @returns Location object with pathname, href, origin, etc.
   */
  getLocation(): {
    pathname: string;
    href: string;
    origin: string;
    hostname: string;
    port: string;
    protocol: string;
    search: string;
    hash: string;
  };
}

/**
 * Browser implementation of NavigationService
 */
export class BrowserNavigationService implements NavigationService {
  reload(): void {
    window.location.reload();
  }

  navigate(path: string): void {
    window.location.href = path;
  }

  goBack(): void {
    window.history.back();
  }

  replace(path: string): void {
    window.history.replaceState({}, '', path);
  }

  getLocation() {
    return {
      pathname: window.location.pathname,
      href: window.location.href,
      origin: window.location.origin,
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      search: window.location.search,
      hash: window.location.hash,
    };
  }
}

// Default instance for production use
export const navigationService = new BrowserNavigationService();





































