// Temporary lightweight type declarations for the `web-vitals` library
// This provides just enough typing for the functions we use via dynamic import
// (onCLS, onFCP, onLCP, onTTFB, onINP). If you install `web-vitals` and @types
// become available, you can remove this shim.

export interface WebVitalsMetric {
  name: string;
  value: number;
  delta?: number;
  id?: string;
}

declare module 'web-vitals' {
  export function onCLS(cb: (metric: WebVitalsMetric) => void): void;
  export function onFCP(cb: (metric: WebVitalsMetric) => void): void;
  export function onLCP(cb: (metric: WebVitalsMetric) => void): void;
  export function onTTFB(cb: (metric: WebVitalsMetric) => void): void;
  export function onINP(cb: (metric: WebVitalsMetric) => void): void;

  // Allow importing the module as a namespace/default for flexible usage
  const _default: {
    onCLS: typeof onCLS;
    onFCP: typeof onFCP;
    onLCP: typeof onLCP;
    onTTFB: typeof onTTFB;
    onINP: typeof onINP;
  };

  export default _default;
}
