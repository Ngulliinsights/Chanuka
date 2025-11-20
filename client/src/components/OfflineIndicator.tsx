/**
 * Compatibility wrapper for legacy `OfflineIndicator`.
 *
 * The project consolidates offline logic under `components/offline/offline-manager.tsx`.
 * Keep this file as a thin re-export to avoid mass refactors. Importers can be
 * migrated to `useOffline` / `OfflineStatus` over time and this wrapper removed.
 */

import { OfflineStatus } from './offline/offline-manager';

export { OfflineStatus as OfflineIndicator };

export default OfflineStatus;

