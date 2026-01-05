/**
 * Global shims and polyfills
 */

// Window extensions
declare global {
  interface Window {
    DD_RUM?: {
      setUser: (user: any) => void;
      addAction: (name: string, properties: any) => void;
    };
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// CSS Module declarations
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// Asset declarations
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

export {};
