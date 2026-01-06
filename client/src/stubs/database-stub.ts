/**
 * Database Stub - Client-Safe Placeholder
 *
 * This stub prevents server-only database imports from breaking the client build.
 * Any attempt to use database functionality in the client will throw a clear error.
 */

export const database = {
  query: () => {
    throw new Error(
      'Database operations are not available in the client. Use API endpoints instead.'
    );
  },
  transaction: () => {
    throw new Error(
      'Database transactions are not available in the client. Use API endpoints instead.'
    );
  },
};

export const db = database;

export default database;
