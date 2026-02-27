/**
 * Asset Loading Infrastructure Module
 *
 * Provides asset loading and management utilities for optimizing resource loading,
 * lazy loading strategies, and asset preloading capabilities.
 *
 * @module infrastructure/asset-loading
 * @example
 * ```typescript
 * import { AssetLoadingProvider } from '@/infrastructure/asset-loading';
 *
 * function App() {
 *   return (
 *     <AssetLoadingProvider
 *       preloadAssets={['/images/logo.png', '/fonts/main.woff2']}
 *       lazyLoadImages={true}
 *     >
 *       <YourApp />
 *     </AssetLoadingProvider>
 *   );
 * }
 * ```
 */

/**
 * Asset loading provider component for managing asset loading strategies.
 * Wraps the application to provide asset loading context, preloading capabilities,
 * and lazy loading optimization.
 *
 * @example
 * ```typescript
 * import { AssetLoadingProvider } from '@/infrastructure/asset-loading';
 *
 * function Root() {
 *   return (
 *     <AssetLoadingProvider
 *       preloadAssets={[
 *         '/images/hero.jpg',
 *         '/fonts/primary.woff2'
 *       ]}
 *       lazyLoadImages={true}
 *       onLoadComplete={() => console.log('Assets loaded')}
 *     >
 *       <App />
 *     </AssetLoadingProvider>
 *   );
 * }
 * ```
 */
export * from './AssetLoadingProvider';
