/**
 * Re-export of the safe query hooks from the core API module
 * This provides a convenient import path for components
 */

import { useSafeQuery } from '@client/infrastructure/api/hooks/use-safe-query';

export * from '@client/infrastructure/api/hooks/use-safe-query';

export default useSafeQuery;
