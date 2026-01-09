/**
 * DEPRECATED - This directory has been migrated
 *
 * All files have been moved to: client/src/shared/lib/
 *
 * Update your imports:
 * OLD: import { cn } from '@client/lib/utils';
 * NEW: import { cn } from '@client/shared/lib/utils';
 *  OR:  import { cn } from '@client/shared/lib';
 *
 * This file provides backward compatibility during migration.
 * Remove this after all imports have been updated.
 *
 * Timeline:
 * - Phase 1 (NOW): Both old and new locations work
 * - Phase 2 (1 week): Emit warnings on old imports
 * - Phase 3 (2 weeks): Remove deprecated exports
 *
 * @deprecated Use @client/shared/lib instead
 */

'use strict';

const message = `
DEPRECATED MODULE IMPORT

Your code is importing from the deprecated @client/lib module.
Update your imports to:
  import { ... } from '@client/shared/lib';

This will be removed in 2 weeks. See
DIRECTORY_ALIGNMENT_ANALYSIS.md for migration details.
`;

if (process.env.NODE_ENV === 'development') {
  console.warn(message);
}

// Import from the new FSD structure
import * as fsdLib from '@client/shared/lib/migration/compatibility-layer';

// Re-export everything from the FSD structure
export * from '@client/shared/lib/migration/compatibility-layer';

// Export default for legacy compatibility
export default fsdLib;
