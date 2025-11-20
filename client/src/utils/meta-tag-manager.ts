/**
 * Centralized Meta Tag Manager
 * Prevents DOM conflicts by managing meta tag creation/updates centrally
 */

interface MetaTagConfig {
  name?: string;
  httpEquiv?: string;
  content: string;
  property?: string;
}

class MetaTagManager {
  private static instance: MetaTagManager;
  private managedTags = new Map<string, HTMLMetaElement>();

  private constructor() {}

  static getInstance(): MetaTagManager {
    if (!MetaTagManager.instance) {
      MetaTagManager.instance = new MetaTagManager();
    }
    return MetaTagManager.instance;
  }

  /**
   * Set or update a meta tag safely
   */
  setMetaTag(key: string, config: MetaTagConfig): HTMLMetaElement {
    // Check if we already manage this tag
    let metaTag = this.managedTags.get(key);
    
    if (!metaTag) {
      // Look for existing tag in DOM
      if (config.name) {
        metaTag = document.querySelector(`meta[name="${config.name}"]`) as HTMLMetaElement;
      } else if (config.httpEquiv) {
        metaTag = document.querySelector(`meta[http-equiv="${config.httpEquiv}"]`) as HTMLMetaElement;
      } else if (config.property) {
        metaTag = document.querySelector(`meta[property="${config.property}"]`) as HTMLMetaElement;
      }
    }

    if (!metaTag) {
      // Create new meta tag
      metaTag = document.createElement('meta');
      
      if (config.name) {
        metaTag.name = config.name;
      } else if (config.httpEquiv) {
        metaTag.httpEquiv = config.httpEquiv;
      } else if (config.property) {
        metaTag.setAttribute('property', config.property);
      }
      
      document.head.appendChild(metaTag);
    }

    // Update content
    metaTag.content = config.content;
    
    // Track this tag
    this.managedTags.set(key, metaTag);
    
    return metaTag;
  }

  /**
   * Remove a meta tag safely
   */
  removeMetaTag(key: string): boolean {
    const metaTag = this.managedTags.get(key);
    if (metaTag && metaTag.parentNode) {
      try {
        metaTag.parentNode.removeChild(metaTag);
        this.managedTags.delete(key);
        return true;
      } catch (error) {
        // Node might have already been removed, just clean up our tracking
        this.managedTags.delete(key);
        return false;
      }
    }
    return false;
  }

  /**
   * Get a managed meta tag
   */
  getMetaTag(key: string): HTMLMetaElement | undefined {
    return this.managedTags.get(key);
  }

  /**
   * Clear all managed tags
   */
  clearAll(): void {
    for (const [key, metaTag] of this.managedTags) {
      if (metaTag && metaTag.parentNode) {
        try {
          metaTag.parentNode.removeChild(metaTag);
        } catch (error) {
          // Node might have already been removed, continue cleanup
          console.debug('Meta tag already removed:', key);
        }
      }
    }
    this.managedTags.clear();
  }
}

export const metaTagManager = MetaTagManager.getInstance();

// Convenience functions
export function setCSRFToken(token: string): void {
  metaTagManager.setMetaTag('csrf-token', {
    name: 'csrf-token',
    content: token
  });
}

export function setCSPHeader(policy: string, reportOnly = false): void {
  metaTagManager.setMetaTag('csp-header', {
    httpEquiv: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    content: policy
  });
}

export function setViewport(content: string): void {
  metaTagManager.setMetaTag('viewport', {
    name: 'viewport',
    content
  });
}