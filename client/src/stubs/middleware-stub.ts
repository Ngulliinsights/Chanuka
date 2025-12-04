/**
 * Middleware Stub - Client-Safe Placeholder
 * 
 * This stub prevents server-only middleware imports from breaking the client build.
 * Any attempt to use middleware functionality in the client will throw a clear error.
 */

export const middleware = {
  auth: () => {
    throw new Error('Server middleware is not available in the client. Use client-side authentication instead.');
  },
  cors: () => {
    throw new Error('Server middleware is not available in the client.');
  }
};

export default middleware;